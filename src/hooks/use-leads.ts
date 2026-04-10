import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  clearLeadActivities,
  createLead,
  importLeadsBatch,
  getLeadById,
  listLeadActivities,
  listLeads,
  updateLead,
  updateLeadAssignment,
  updateLeadNotes,
  updateLeadStage,
} from "@/services/leads";
import {
  completeFollowUp,
  createFollowUp,
  listLeadFollowUps,
  listOpenFollowUps,
} from "@/services/followups";
import type {
  FollowUpFormValues,
  LeadFormValues,
  LeadStage,
  UserRole,
  UserSummary,
} from "@/types/crm";
import type { Database } from "@/types/database";

export const useLeadsQuery = (users: UserSummary[] = []) =>
  useQuery({
    queryKey: [...queryKeys.leads, users.map((user) => user.id).join(",")],
    queryFn: () => listLeads(users),
  });

export const useLeadDetailQuery = (leadId: string | undefined, users: UserSummary[] = []) =>
  useQuery({
    queryKey: leadId
      ? [...queryKeys.lead(leadId), users.map((user) => user.id).join(",")]
      : ["lead-empty"],
    queryFn: () => getLeadById(leadId ?? "", users),
    enabled: Boolean(leadId),
  });

export const useLeadActivitiesQuery = (
  leadId: string | undefined,
  users: UserSummary[] = [],
) =>
  useQuery({
    queryKey: leadId
      ? [...queryKeys.leadActivities(leadId), users.map((user) => user.id).join(",")]
      : ["lead-activities-empty"],
    queryFn: () => listLeadActivities(leadId ?? "", users),
    enabled: Boolean(leadId),
  });

export const useLeadFollowUpsQuery = (
  leadId: string | undefined,
  users: UserSummary[] = [],
) =>
  useQuery({
    queryKey: leadId
      ? [...queryKeys.leadFollowUps(leadId), users.map((user) => user.id).join(",")]
      : ["lead-follow-ups-empty"],
    queryFn: () => listLeadFollowUps(leadId ?? "", users),
    enabled: Boolean(leadId),
  });

export const useOpenFollowUpsQuery = (users: UserSummary[] = []) =>
  useQuery({
    queryKey: [...queryKeys.followUps, users.map((user) => user.id).join(",")],
    queryFn: () => listOpenFollowUps(users),
  });

export const useCreateLeadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      values,
      actorId,
      actorRole,
      users,
    }: {
      values: LeadFormValues;
      actorId: string | null;
      actorRole: UserRole | null;
      users: UserSummary[];
    }) => createLead(values, actorId, actorRole, users),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.followUps });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useImportLeadsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payloads,
      actorId,
    }: {
      payloads: Database["public"]["Tables"]["leads"]["Insert"][];
      actorId: string | null;
    }) => importLeadsBatch(payloads, actorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.followUps });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useUpdateLeadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      values,
      actorId,
      actorRole,
      users,
    }: {
      leadId: string;
      values: LeadFormValues;
      actorId: string | null;
      actorRole: UserRole | null;
      users: UserSummary[];
    }) => updateLead(leadId, values, actorId, actorRole, users),
    onSuccess: (_lead, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.lead(variables.leadId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadActivities(variables.leadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadFollowUps(variables.leadId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.followUps });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useUpdateLeadStageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      stage,
      actorId,
    }: {
      leadId: string;
      stage: LeadStage;
      actorId: string | null;
    }) => updateLeadStage(leadId, stage, actorId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.lead(variables.leadId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadActivities(variables.leadId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useUpdateLeadAssignmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      assignedTo,
      actorId,
      actorRole,
      users,
    }: {
      leadId: string;
      assignedTo: string | null;
      actorId: string | null;
      actorRole: UserRole | null;
      users: UserSummary[];
    }) => updateLeadAssignment(leadId, assignedTo, actorId, actorRole, users),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.lead(variables.leadId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadActivities(variables.leadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadFollowUps(variables.leadId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.followUps });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useUpdateLeadNotesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      notesSummary,
      actorId,
    }: {
      leadId: string;
      notesSummary: string;
      actorId: string | null;
    }) => updateLeadNotes(leadId, notesSummary, actorId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.lead(variables.leadId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadActivities(variables.leadId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useCreateFollowUpMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      values,
      actorId,
      actorRole,
      users,
    }: {
      leadId: string;
      values: FollowUpFormValues;
      actorId: string | null;
      actorRole: UserRole | null;
      users: UserSummary[];
    }) => createFollowUp(leadId, values, actorId, actorRole, users),
    onSuccess: (_followUp, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.lead(variables.leadId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadActivities(variables.leadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadFollowUps(variables.leadId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.followUps });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useClearLeadActivitiesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId }: { leadId: string }) => clearLeadActivities(leadId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadActivities(variables.leadId),
      });
    },
  });
};

export const useCompleteFollowUpMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      followUpId,
      leadId,
      actorId,
    }: {
      followUpId: string;
      leadId: string;
      actorId: string | null;
    }) => completeFollowUp(followUpId, leadId, actorId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.lead(variables.leadId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadActivities(variables.leadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.leadFollowUps(variables.leadId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.followUps });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};
