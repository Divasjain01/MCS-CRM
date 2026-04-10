import { mapFollowUpFormValuesToInsert, mapFollowUpRowToFollowUp } from "@/lib/crm-mappers";
import { logLeadActivity } from "@/services/leads";
import { supabase } from "@/lib/supabase";
import type { FollowUp, FollowUpFormValues, UserSummary } from "@/types/crm";
import type { Database } from "@/types/database";

type FollowUpRow = Database["public"]["Tables"]["follow_ups"]["Row"];

const buildUserLookup = (users: UserSummary[]) =>
  new Map(users.map((user) => [user.id, user] as const));

const syncLeadNextFollowUpAt = async (leadId: string) => {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("due_at")
    .eq("lead_id", leadId)
    .eq("status", "scheduled")
    .order("due_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const nextFollowUpAt = data?.due_at ?? null;

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      next_follow_up_at: nextFollowUpAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    throw updateError;
  }
};

export const listLeadFollowUps = async (
  leadId: string,
  users: UserSummary[] = [],
): Promise<FollowUp[]> => {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("id, lead_id, assigned_to, due_at, completed_at, status, note, created_by, created_at, updated_at")
    .eq("lead_id", leadId)
    .order("due_at", { ascending: true });

  if (error) {
    throw error;
  }

  const userLookup = buildUserLookup(users);
  return (data as FollowUpRow[]).map((row) =>
    mapFollowUpRowToFollowUp(
      row,
      row.assigned_to ? userLookup.get(row.assigned_to) ?? null : null,
      row.created_by ? userLookup.get(row.created_by) ?? null : null,
    ),
  );
};

export const listOpenFollowUps = async (users: UserSummary[] = []): Promise<FollowUp[]> => {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("id, lead_id, assigned_to, due_at, completed_at, status, note, created_by, created_at, updated_at")
    .eq("status", "scheduled")
    .order("due_at", { ascending: true });

  if (error) {
    throw error;
  }

  const userLookup = buildUserLookup(users);
  return (data as FollowUpRow[]).map((row) =>
    mapFollowUpRowToFollowUp(
      row,
      row.assigned_to ? userLookup.get(row.assigned_to) ?? null : null,
      row.created_by ? userLookup.get(row.created_by) ?? null : null,
    ),
  );
};

export const createFollowUp = async (
  leadId: string,
  values: FollowUpFormValues,
  actorId: string | null,
  users: UserSummary[] = [],
): Promise<FollowUp> => {
  const payload = mapFollowUpFormValuesToInsert(values, leadId, actorId);
  const { data, error } = await supabase
    .from("follow_ups")
    .insert(payload)
    .select("id, lead_id, assigned_to, due_at, completed_at, status, note, created_by, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  await syncLeadNextFollowUpAt(leadId);
  await logLeadActivity(
    leadId,
    "follow_up_added",
    `Follow-up scheduled for ${new Date(values.dueAt).toLocaleString()}`,
    actorId,
    {
      due_at: values.dueAt,
      assigned_to: values.assignedTo || null,
      note: values.note || null,
    },
  );

  const userLookup = buildUserLookup(users);
  const row = data as FollowUpRow;
  return mapFollowUpRowToFollowUp(
    row,
    row.assigned_to ? userLookup.get(row.assigned_to) ?? null : null,
    row.created_by ? userLookup.get(row.created_by) ?? null : null,
  );
};

export const completeFollowUp = async (
  followUpId: string,
  leadId: string,
  actorId: string | null,
): Promise<void> => {
  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("follow_ups")
    .update({
      status: "completed",
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq("id", followUpId);

  if (error) {
    throw error;
  }

  await syncLeadNextFollowUpAt(leadId);
  await logLeadActivity(
    leadId,
    "follow_up_completed",
    "Follow-up marked as completed",
    actorId,
    { follow_up_id: followUpId, completed_at: completedAt },
  );
};
