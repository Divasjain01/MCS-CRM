import { appEnv } from "@/config/env";
import { supabase } from "@/lib/supabase";
import { toCsv } from "@/lib/csv";
import {
  leadPriorityLabels,
  leadTypeLabels,
  showroomVisitStatusLabels,
  sourceLabels,
  stageLabels,
} from "@/lib/crm-config";
import {
  mapLeadActivityRowToActivity,
  mapLeadFormValuesToInsert,
  mapLeadFormValuesToUpdate,
  mapLeadRowToLead,
} from "@/lib/crm-mappers";
import type {
  ActivityType,
  Lead,
  LeadActivity,
  LeadFormValues,
  LeadImportResult,
  LeadStage,
  UserRole,
  UserSummary,
} from "@/types/crm";
import type { Database, Json } from "@/types/database";
import type { PostgrestError } from "@supabase/supabase-js";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadActivityRow = Database["public"]["Tables"]["lead_activities"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

const selectLeadColumns =
  "id, full_name, email, phone, alternate_phone, company_name, lead_type, source, source_detail, stage, assigned_to, project_location, city, requirement_summary, product_interest, showroom_visit_status, showroom_visit_date, quotation_required, quotation_value, budget, priority, notes_summary, next_follow_up_at, last_contacted_at, lost_reason, created_by, created_at, updated_at";

const formatSupabaseError = (error: PostgrestError) => {
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return new Error(parts.join(" | "));
};

interface LeadIntakeResponse {
  success: boolean;
  createdCount: number;
  skippedCount: number;
  leads: LeadRow[];
  errors?: Array<{ index: number; error: string }>;
  error?: string;
}

const getLeadIntakeError = (response: LeadIntakeResponse) =>
  response.error || response.errors?.[0]?.error || "Unable to create lead.";

const invokeLeadIntake = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke(appEnv.leadIntakeFunctionName, {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return (data ?? {
    success: false,
    createdCount: 0,
    skippedCount: 0,
    leads: [],
    error: "Lead intake function returned no data.",
  }) as LeadIntakeResponse;
};

export const logLeadActivity = async (
  leadId: string,
  type: ActivityType,
  description: string,
  actorId: string | null,
  metadata?: Json,
) => {
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type,
    description,
    created_by: actorId,
    metadata: metadata ?? null,
  });

  if (error) {
    console.warn("Unable to log lead activity.", error);
  }
};

const buildAssignedLookup = (users: UserSummary[]) =>
  new Map(users.map((user) => [user.id, user] as const));

const assertAssignableUser = (
  assignedTo: string | null | undefined,
  actorRole: UserRole | null,
  users: UserSummary[],
) => {
  if (!assignedTo) {
    return;
  }

  const assignee = users.find((user) => user.id === assignedTo);

  if (!assignee) {
    throw new Error("The selected assignee could not be found.");
  }

  if (!assignee.isActive) {
    throw new Error("The selected assignee is inactive.");
  }

  if (actorRole === "sales" && assignee.role !== "sales") {
    throw new Error("Sales users can only assign leads to active sales profiles.");
  }
};

export const listLeads = async (users: UserSummary[] = []): Promise<Lead[]> => {
  const { data, error } = await supabase
    .from("leads")
    .select(selectLeadColumns)
    .order("created_at", { ascending: false });

  if (error) {
    throw formatSupabaseError(error);
  }

  const assignedLookup = buildAssignedLookup(users);
  return (data as LeadRow[]).map((row) =>
    mapLeadRowToLead(row, row.assigned_to ? assignedLookup.get(row.assigned_to) ?? null : null),
  );
};

export const getLeadById = async (
  leadId: string,
  users: UserSummary[] = [],
): Promise<Lead> => {
  const { data, error } = await supabase
    .from("leads")
    .select(selectLeadColumns)
    .eq("id", leadId)
    .single();

  if (error) {
    throw formatSupabaseError(error);
  }

  const assignedLookup = buildAssignedLookup(users);
  const row = data as LeadRow;
  return mapLeadRowToLead(
    row,
    row.assigned_to ? assignedLookup.get(row.assigned_to) ?? null : null,
  );
};

export const createLead = async (
  values: LeadFormValues,
  actorId: string | null,
  actorRole: UserRole | null,
  users: UserSummary[] = [],
): Promise<Lead> => {
  void actorId;
  const payload = mapLeadFormValuesToInsert(values, null);
  assertAssignableUser(payload.assigned_to, actorRole, users);
  const response = await invokeLeadIntake({ lead: payload });

  if (!response.success || response.leads.length === 0) {
    throw new Error(getLeadIntakeError(response));
  }

  const createdLead = mapLeadRowToLead(
    response.leads[0],
    payload.assigned_to ? users.find((user) => user.id === payload.assigned_to) ?? null : null,
  );

  return createdLead;
};

export const updateLead = async (
  leadId: string,
  values: LeadFormValues,
  actorId: string | null,
  actorRole: UserRole | null,
  users: UserSummary[] = [],
): Promise<Lead> => {
  const previousLead = await getLeadById(leadId, users);
  const payload = {
    ...mapLeadFormValuesToUpdate(values),
    updated_at: new Date().toISOString(),
  };
  assertAssignableUser(payload.assigned_to, actorRole, users);

  const { data, error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", leadId)
    .select(selectLeadColumns)
    .single();

  if (error) {
    throw formatSupabaseError(error);
  }

  const updatedLead = mapLeadRowToLead(
    data as LeadRow,
    payload.assigned_to ? users.find((user) => user.id === payload.assigned_to) ?? null : null,
  );

  await logLeadActivity(
    updatedLead.id,
    "lead_updated",
    `Lead updated for ${updatedLead.fullName}`,
    actorId,
  );

  if (previousLead.assignedTo !== updatedLead.assignedTo) {
    await createLeadAssignmentRecord(
      updatedLead.id,
      updatedLead.assignedTo,
      actorId,
      "Assignment updated from lead edit",
    );
    await logLeadActivity(
      updatedLead.id,
      "assignment_changed",
      updatedLead.assignedTo ? "Lead assignment updated" : "Lead unassigned",
      actorId,
      {
        previous_assigned_to: previousLead.assignedTo,
        assigned_to: updatedLead.assignedTo,
      },
    );
  }

  if (previousLead.stage !== updatedLead.stage) {
    await logLeadActivity(
      updatedLead.id,
      "stage_changed",
      `Lead stage changed to ${updatedLead.stage.replaceAll("_", " ")}`,
      actorId,
      {
        previous_stage: previousLead.stage,
        stage: updatedLead.stage,
      },
    );
  }

  return updatedLead;
};

export const updateLeadStage = async (
  leadId: string,
  nextStage: LeadStage,
  actorId: string | null,
): Promise<void> => {
  const { error } = await supabase
    .from("leads")
    .update({
      stage: nextStage,
      updated_at: new Date().toISOString(),
      last_contacted_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    throw formatSupabaseError(error);
  }

  await logLeadActivity(
    leadId,
    "stage_changed",
    `Lead stage changed to ${nextStage.replaceAll("_", " ")}`,
    actorId,
    { stage: nextStage },
  );
};

export const createLeadAssignmentRecord = async (
  leadId: string,
  assignedTo: string | null,
  actorId: string | null,
  note: string,
) => {
  const { error } = await supabase.from("lead_assignments").insert({
    lead_id: leadId,
    assigned_to: assignedTo,
    assigned_by: actorId,
    note,
  });

  if (error) {
    console.warn("Unable to store lead assignment history.", error);
  }
};

export const updateLeadAssignment = async (
  leadId: string,
  assignedTo: string | null,
  actorId: string | null,
  actorRole: UserRole | null,
  users: UserSummary[] = [],
): Promise<void> => {
  assertAssignableUser(assignedTo, actorRole, users);
  const { error } = await supabase
    .from("leads")
    .update({
      assigned_to: assignedTo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    throw formatSupabaseError(error);
  }

  await createLeadAssignmentRecord(
    leadId,
    assignedTo,
    actorId,
    assignedTo ? "Lead assigned" : "Lead unassigned",
  );

  await logLeadActivity(
    leadId,
    "assignment_changed",
    assignedTo ? "Lead assignment updated" : "Lead unassigned",
    actorId,
    { assigned_to: assignedTo },
  );
};

export const updateLeadNotes = async (
  leadId: string,
  notesSummary: string,
  actorId: string | null,
): Promise<void> => {
  const { error } = await supabase
    .from("leads")
    .update({
      notes_summary: notesSummary.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    throw formatSupabaseError(error);
  }

  await logLeadActivity(leadId, "note_added", "Lead notes updated", actorId);
};

export const clearLeadActivities = async (leadId: string): Promise<void> => {
  const { error } = await supabase.from("lead_activities").delete().eq("lead_id", leadId);

  if (error) {
    throw formatSupabaseError(error);
  }
};

export const importLeadsBatch = async (
  payloads: Database["public"]["Tables"]["leads"]["Insert"][],
  actorId: string | null,
): Promise<LeadImportResult> => {
  if (payloads.length === 0) {
    return {
      insertedCount: 0,
      skippedCount: 0,
    };
  }

  void actorId;

  const response = await invokeLeadIntake({ leads: payloads, mode: "import" });

  if (!response.success && response.createdCount === 0) {
    throw new Error(getLeadIntakeError(response));
  }

  return {
    insertedCount: response.createdCount,
    skippedCount: response.skippedCount,
  };
};

export const exportLeadsToCsv = (leads: Lead[]) =>
  toCsv(
    leads.map((lead) => ({
      "Full Name": lead.fullName,
      Email: lead.email ?? "",
      Phone: lead.phone,
      "Alternate Phone": lead.alternatePhone ?? "",
      "Company Name": lead.companyName ?? "",
      "Lead Type": leadTypeLabels[lead.leadType],
      Source: sourceLabels[lead.source],
      "Source Detail": lead.sourceDetail ?? "",
      Stage: stageLabels[lead.stage],
      "Assigned To": lead.assignedUser?.fullName ?? "",
      "Project Location": lead.projectLocation ?? "",
      City: lead.city ?? "",
      "Requirement Summary": lead.requirementSummary ?? "",
      "Product Interest": lead.productInterest ?? "",
      "Showroom Visit Status": showroomVisitStatusLabels[lead.showroomVisitStatus],
      "Showroom Visit Date": lead.showroomVisitDate ?? "",
      "Quotation Required": lead.quotationRequired ? "Yes" : "No",
      "Quotation Value": lead.quotationValue ?? "",
      Budget: lead.budget ?? "",
      Priority: leadPriorityLabels[lead.priority],
      "Notes Summary": lead.notesSummary ?? "",
      "Next Follow-up": lead.nextFollowUpAt ?? "",
      "Last Contacted": lead.lastContactedAt ?? "",
      "Lost Reason": lead.lostReason ?? "",
      "Created At": lead.createdAt,
      "Updated At": lead.updatedAt,
    })),
  );

export const listLeadActivities = async (
  leadId: string,
  users: UserSummary[] = [],
): Promise<LeadActivity[]> => {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("id, lead_id, type, description, metadata, created_by, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const userLookup = buildAssignedLookup(users);
  return (data as LeadActivityRow[]).map((row) =>
    mapLeadActivityRowToActivity(
      row,
      row.created_by ? userLookup.get(row.created_by) ?? null : null,
    ),
  );
};
