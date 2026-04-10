import { appEnv } from "@/config/env";
import { normalizeLoginId } from "@/lib/auth-identifiers";
import { supabase } from "@/lib/supabase";
import { mapProfileRowToUserSummary } from "@/lib/crm-mappers";
import { logLeadActivity } from "@/services/leads";
import type { CreateUserFormValues, UserRole, UserSummary } from "@/types/crm";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export const listUsers = async (): Promise<UserSummary[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, login_uid, role, is_active, avatar_url, phone, created_at, updated_at")
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as ProfileRow[]).map(mapProfileRowToUserSummary);
};

export const updateUserRole = async (
  userId: string,
  role: UserRole,
): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
};

export const updateUserActiveStatus = async (
  userId: string,
  isActive: boolean,
): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
};

export const countAssignedLeadsByUser = async (): Promise<Record<string, number>> => {
  const { data, error } = await supabase
    .from("leads")
    .select("id, assigned_to")
    .not("assigned_to", "is", null);

  if (error) {
    throw error;
  }

  return (data as Pick<LeadRow, "id" | "assigned_to">[]).reduce<Record<string, number>>(
    (accumulator, row) => {
      if (!row.assigned_to) {
        return accumulator;
      }

      accumulator[row.assigned_to] = (accumulator[row.assigned_to] ?? 0) + 1;
      return accumulator;
    },
    {},
  );
};

export const reassignLeadsForUser = async ({
  fromUserId,
  toUserId,
  actorId,
}: {
  fromUserId: string;
  toUserId: string | null;
  actorId: string | null;
}): Promise<number> => {
  const { data, error } = await supabase
    .from("leads")
    .select("id, full_name")
    .eq("assigned_to", fromUserId);

  if (error) {
    throw error;
  }

  const leads = data as Pick<LeadRow, "id" | "full_name">[];

  if (leads.length === 0) {
    return 0;
  }

  const leadIds = leads.map((lead) => lead.id);
  const timestamp = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      assigned_to: toUserId,
      updated_at: timestamp,
    })
    .in("id", leadIds);

  if (updateError) {
    throw updateError;
  }

  const assignmentRows = leadIds.map((leadId) => ({
    lead_id: leadId,
    assigned_to: toUserId,
    assigned_by: actorId,
    note: toUserId ? "Bulk reassignment from admin users page" : "Bulk unassignment from admin users page",
  }));

  const { error: historyError } = await supabase
    .from("lead_assignments")
    .insert(assignmentRows);

  if (historyError) {
    console.warn("Unable to store reassignment history.", historyError);
  }

  await Promise.all(
    leads.map((lead) =>
      logLeadActivity(
        lead.id,
        "assignment_changed",
        toUserId
          ? `Lead reassigned from admin users page for ${lead.full_name}`
          : `Lead unassigned from admin users page for ${lead.full_name}`,
        actorId,
        {
          previous_assigned_to: fromUserId,
          assigned_to: toUserId,
        },
      ),
    ),
  );

  return leads.length;
};

export const createUserFromAdmin = async (
  values: CreateUserFormValues,
): Promise<void> => {
  const payload = {
    full_name: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    role: values.role,
  };

  const { data, error } = await supabase.functions.invoke(appEnv.createUserFunctionName, {
    body: payload,
  });

  if (error) {
    throw error;
  }

  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    throw new Error(data.error);
  }

  if (
    data &&
    typeof data === "object" &&
    "user" in data &&
    data.user &&
    typeof data.user === "object" &&
    "id" in data.user &&
    typeof data.user.id === "string"
  ) {
    const updates: Database["public"]["Tables"]["profiles"]["Update"] = {
      login_uid: normalizeLoginId(values.loginUid || values.fullName),
      updated_at: new Date().toISOString(),
    };

    if (values.phone.trim()) {
      updates.phone = values.phone.trim().replace(/[\s()-]/g, "");
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", data.user.id);

    if (profileError) {
      throw profileError;
    }
  }
};
