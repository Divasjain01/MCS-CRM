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
import { normalizeLeadPhone } from "@/lib/phone";
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
type ExistingLeadLookup = Pick<LeadRow, "id" | "full_name" | "phone">;

const selectLeadColumns =
  "id, full_name, email, phone, alternate_phone, company_name, lead_type, source, source_detail, stage, assigned_to, project_location, city, requirement_summary, product_interest, showroom_visit_status, showroom_visit_date, quotation_required, quotation_value, budget, priority, notes_summary, next_follow_up_at, last_contacted_at, lost_reason, created_by, created_at, updated_at";

const formatSupabaseError = (error: PostgrestError) => {
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return new Error(parts.join(" | "));
};

const isDuplicateLeadPhoneError = (error: PostgrestError) =>
  error.code === "23505" &&
  ((error.message ?? "").includes("idx_leads_phone_normalized_unique") ||
    (error.details ?? "").includes("phone_normalized") ||
    (error.message ?? "").includes("phone_normalized"));

const formatLeadMutationError = (error: PostgrestError) => {
  if (isDuplicateLeadPhoneError(error)) {
    return new Error("A lead with this phone number already exists.");
  }

  return formatSupabaseError(error);
};

const findExistingLeadByPhone = async (
  rawPhone: string,
  excludeLeadId?: string,
): Promise<ExistingLeadLookup | null> => {
  const normalizedPhone = normalizeLeadPhone(rawPhone);

  if (!normalizedPhone) {
    return null;
  }

  let query = supabase
    .from("leads")
    .select("id, full_name, phone")
    .eq("phone_normalized", normalizedPhone)
    .limit(1);

  if (excludeLeadId) {
    query = query.neq("id", excludeLeadId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw formatSupabaseError(error);
  }

  return (data as ExistingLeadLookup | null) ?? null;
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
  const payload = mapLeadFormValuesToInsert(values, actorId);
  assertAssignableUser(payload.assigned_to, actorRole, users);
  payload.phone = normalizeLeadPhone(payload.phone) ?? payload.phone;
  if (payload.alternate_phone) {
    payload.alternate_phone =
      normalizeLeadPhone(payload.alternate_phone) ?? payload.alternate_phone;
  }

  const existingLead = await findExistingLeadByPhone(payload.phone);
  if (existingLead) {
    throw new Error(`This number already exists for ${existingLead.full_name}.`);
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select(selectLeadColumns)
    .single();

  if (error) {
    throw formatLeadMutationError(error);
  }

  const createdLead = mapLeadRowToLead(
    data as LeadRow,
    payload.assigned_to ? users.find((user) => user.id === payload.assigned_to) ?? null : null,
  );

  await logLeadActivity(
    createdLead.id,
    "lead_created",
    `Lead created for ${createdLead.fullName}`,
    actorId,
  );

  if (createdLead.assignedTo) {
    await createLeadAssignmentRecord(
      createdLead.id,
      createdLead.assignedTo,
      actorId,
      "Initial assignment",
    );
    await logLeadActivity(
      createdLead.id,
      "assignment_changed",
      "Lead assigned during creation",
      actorId,
      { assigned_to: createdLead.assignedTo },
    );
  }

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
  if (payload.phone) {
    payload.phone = normalizeLeadPhone(payload.phone) ?? payload.phone;
  }
  if (payload.alternate_phone) {
    payload.alternate_phone =
      normalizeLeadPhone(payload.alternate_phone) ?? payload.alternate_phone;
  }
  assertAssignableUser(payload.assigned_to, actorRole, users);

  if (payload.phone) {
    const existingLead = await findExistingLeadByPhone(payload.phone, leadId);
    if (existingLead) {
      throw new Error(`This number already exists for ${existingLead.full_name}.`);
    }
  }

  const { data, error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", leadId)
    .select(selectLeadColumns)
    .single();

  if (error) {
    throw formatLeadMutationError(error);
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

  const rowsToInsert = payloads.map((payload) => ({
    ...payload,
    phone: normalizeLeadPhone(payload.phone) ?? payload.phone,
    alternate_phone: payload.alternate_phone
      ? normalizeLeadPhone(payload.alternate_phone) ?? payload.alternate_phone
      : null,
    created_by: actorId,
  }));

  const { data, error } = await supabase
    .from("leads")
    .insert(rowsToInsert)
    .select(selectLeadColumns);

  if (error) {
    throw formatLeadMutationError(error);
  }

  const insertedRows = (data as LeadRow[]) ?? [];

  await Promise.all(
    insertedRows.map(async (row) => {
      await logLeadActivity(
        row.id,
        "lead_created",
        `Lead imported for ${row.full_name}`,
        actorId,
        { import: true },
      );

      if (row.assigned_to) {
        await createLeadAssignmentRecord(row.id, row.assigned_to, actorId, "Imported assignment");
        await logLeadActivity(
          row.id,
          "assignment_changed",
          "Lead assigned during import",
          actorId,
          { assigned_to: row.assigned_to, import: true },
        );
      }
    }),
  );

  return {
    insertedCount: insertedRows.length,
    skippedCount: Math.max(payloads.length - insertedRows.length, 0),
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
