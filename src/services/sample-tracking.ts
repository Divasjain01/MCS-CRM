import { supabase } from "@/lib/supabase";
import {
  mapCustomerSuggestionRowToSuggestion,
  mapSampleDispatchActivityRowToActivity,
  mapSampleDispatchFormValuesToInsert,
  mapSampleDispatchFormValuesToUpdate,
  mapSampleDispatchRowToSampleDispatch,
} from "@/lib/crm-mappers";
import { normalizeLeadPhone } from "@/lib/phone";
import type {
  CustomerSuggestion,
  SampleDispatch,
  SampleDispatchActivity,
  SampleDispatchFormValues,
  SampleReturnStatus,
  UserRole,
  UserSummary,
} from "@/types/crm";
import type { Database, Json } from "@/types/database";
import type { PostgrestError } from "@supabase/supabase-js";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type SampleDispatchRow = Database["public"]["Tables"]["sample_dispatches"]["Row"];
type SampleDispatchActivityRow =
  Database["public"]["Tables"]["sample_dispatch_activities"]["Row"];

const selectSampleDispatchColumns =
  "id, lead_id, enquiry_reference, customer_name, customer_phone, company_name, issued_at, expected_return_at, actual_returned_at, material_name, quantity, category, remarks, assigned_to, dispatch_method, return_status, created_by, created_at, updated_at";

const formatSupabaseError = (error: PostgrestError) => {
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return new Error(parts.join(" | "));
};

const buildUserLookup = (users: UserSummary[]) =>
  new Map(users.map((user) => [user.id, user] as const));

export const buildSampleEnquiryReference = (leadId: string | null | undefined) =>
  leadId ? `ENQ-${leadId.slice(0, 8).toUpperCase()}` : "";

const escapeIlikeValue = (value: string) => value.replace(/[%_,]/g, " ").trim();

const assertAssignableStaff = (
  assignedTo: string | null | undefined,
  actorId: string | null,
  actorRole: UserRole | null,
  users: UserSummary[],
) => {
  if (!assignedTo) {
    return;
  }

  const assignee = users.find((user) => user.id === assignedTo);

  if (!assignee) {
    throw new Error("The selected staff member could not be found.");
  }

  if (!assignee.isActive) {
    throw new Error("The selected staff member is inactive.");
  }

  if (actorRole === "sales" && assignedTo !== actorId) {
    throw new Error("Sales users can only assign sample records to themselves.");
  }
};

export const logSampleDispatchActivity = async (
  sampleDispatchId: string,
  type: SampleDispatchActivity["type"],
  description: string,
  actorId: string | null,
  metadata?: Json,
) => {
  const { error } = await supabase.from("sample_dispatch_activities").insert({
    sample_dispatch_id: sampleDispatchId,
    type,
    description,
    created_by: actorId,
    metadata: metadata ?? null,
  });

  if (error) {
    console.warn("Unable to log sample activity.", error);
  }
};

export const listSampleDispatches = async (
  users: UserSummary[] = [],
): Promise<SampleDispatch[]> => {
  const { data, error } = await supabase
    .from("sample_dispatches")
    .select(selectSampleDispatchColumns)
    .order("issued_at", { ascending: false });

  if (error) {
    throw formatSupabaseError(error);
  }

  const userLookup = buildUserLookup(users);

  return (data as SampleDispatchRow[]).map((row) =>
    mapSampleDispatchRowToSampleDispatch(
      row,
      row.assigned_to ? userLookup.get(row.assigned_to) ?? null : null,
      row.created_by ? userLookup.get(row.created_by) ?? null : null,
    ),
  );
};

export const getSampleDispatchById = async (
  dispatchId: string,
  users: UserSummary[] = [],
): Promise<SampleDispatch> => {
  const { data, error } = await supabase
    .from("sample_dispatches")
    .select(selectSampleDispatchColumns)
    .eq("id", dispatchId)
    .single();

  if (error) {
    throw formatSupabaseError(error);
  }

  const row = data as SampleDispatchRow;
  const userLookup = buildUserLookup(users);

  return mapSampleDispatchRowToSampleDispatch(
    row,
    row.assigned_to ? userLookup.get(row.assigned_to) ?? null : null,
    row.created_by ? userLookup.get(row.created_by) ?? null : null,
  );
};

export const listSampleDispatchActivities = async (
  dispatchId: string,
  users: UserSummary[] = [],
): Promise<SampleDispatchActivity[]> => {
  const { data, error } = await supabase
    .from("sample_dispatch_activities")
    .select("id, sample_dispatch_id, type, description, metadata, created_by, created_at")
    .eq("sample_dispatch_id", dispatchId)
    .order("created_at", { ascending: false });

  if (error) {
    throw formatSupabaseError(error);
  }

  const userLookup = buildUserLookup(users);

  return (data as SampleDispatchActivityRow[]).map((row) =>
    mapSampleDispatchActivityRowToActivity(
      row,
      row.created_by ? userLookup.get(row.created_by) ?? null : null,
    ),
  );
};

export const searchSampleCustomerSuggestions = async (
  query: string,
): Promise<CustomerSuggestion[]> => {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return [];
  }

  const safeQuery = escapeIlikeValue(trimmed);
  const normalizedPhone = normalizeLeadPhone(trimmed);
  const filters = [
    `full_name.ilike.%${safeQuery}%`,
    `company_name.ilike.%${safeQuery}%`,
    `phone.ilike.%${safeQuery}%`,
  ];

  if (normalizedPhone) {
    filters.push(`phone.eq.${normalizedPhone}`);
  }

  const { data, error } = await supabase
    .from("leads")
    .select("id, full_name, phone, company_name, assigned_to")
    .or(filters.join(","))
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error) {
    throw formatSupabaseError(error);
  }

  return (data as Pick<
    LeadRow,
    "id" | "full_name" | "phone" | "company_name" | "assigned_to"
  >[]).map(mapCustomerSuggestionRowToSuggestion);
};

export const createSampleDispatch = async (
  values: SampleDispatchFormValues,
  actorId: string | null,
  actorRole: UserRole | null,
  users: UserSummary[] = [],
): Promise<SampleDispatch> => {
  const payload = mapSampleDispatchFormValuesToInsert(values, actorId);
  assertAssignableStaff(payload.assigned_to, actorId, actorRole, users);

  const { data, error } = await supabase
    .from("sample_dispatches")
    .insert(payload)
    .select(selectSampleDispatchColumns)
    .single();

  if (error) {
    throw formatSupabaseError(error);
  }

  const created = data as SampleDispatchRow;
  const userLookup = buildUserLookup(users);

  await logSampleDispatchActivity(
    created.id,
    "dispatch_created",
    `Issued ${created.material_name} to ${created.customer_name}`,
    actorId,
    {
      quantity: created.quantity,
      return_status: created.return_status,
      assigned_to: created.assigned_to,
    },
  );

  return mapSampleDispatchRowToSampleDispatch(
    created,
    created.assigned_to ? userLookup.get(created.assigned_to) ?? null : null,
    created.created_by ? userLookup.get(created.created_by) ?? null : null,
  );
};

export const updateSampleDispatch = async (
  dispatchId: string,
  values: SampleDispatchFormValues,
  actorId: string | null,
  actorRole: UserRole | null,
  users: UserSummary[] = [],
): Promise<SampleDispatch> => {
  const previous = await getSampleDispatchById(dispatchId, users);
  const payload = {
    ...mapSampleDispatchFormValuesToUpdate(values),
    updated_at: new Date().toISOString(),
  };

  assertAssignableStaff(payload.assigned_to, actorId, actorRole, users);

  const { data, error } = await supabase
    .from("sample_dispatches")
    .update(payload)
    .eq("id", dispatchId)
    .select(selectSampleDispatchColumns)
    .single();

  if (error) {
    throw formatSupabaseError(error);
  }

  const updated = data as SampleDispatchRow;
  const userLookup = buildUserLookup(users);

  await logSampleDispatchActivity(
    updated.id,
    "dispatch_updated",
    `Updated ${updated.material_name} dispatch for ${updated.customer_name}`,
    actorId,
    {
      quantity: updated.quantity,
      assigned_to: updated.assigned_to,
    },
  );

  if (previous.returnStatus !== updated.return_status) {
    await logSampleDispatchActivity(
      updated.id,
      "status_changed",
      `Status changed to ${updated.return_status.replaceAll("_", " ")}`,
      actorId,
      {
        previous_status: previous.returnStatus,
        return_status: updated.return_status,
      },
    );
  }

  return mapSampleDispatchRowToSampleDispatch(
    updated,
    updated.assigned_to ? userLookup.get(updated.assigned_to) ?? null : null,
    updated.created_by ? userLookup.get(updated.created_by) ?? null : null,
  );
};

export const isSampleDispatchOverdue = (
  dispatch: Pick<SampleDispatch, "expectedReturnAt" | "returnStatus">,
) => {
  if (!dispatch.expectedReturnAt) {
    return false;
  }

  const closedStatuses: SampleReturnStatus[] = ["returned", "consumed", "lost", "completed"];
  if (closedStatuses.includes(dispatch.returnStatus)) {
    return false;
  }

  return new Date(dispatch.expectedReturnAt).getTime() < Date.now();
};
