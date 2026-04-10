import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  countAssignedLeadsByUser,
  reassignLeadsForUser,
  updateUserActiveStatus,
  updateUserRole,
} from "@/services/users";
import type { UserRole } from "@/types/crm";

export const useAssignedLeadCountsQuery = () =>
  useQuery({
    queryKey: ["user-lead-counts"],
    queryFn: countAssignedLeadsByUser,
  });

export const useUpdateUserRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
};

export const useUpdateUserActiveStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateUserActiveStatus(userId, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
};

export const useReassignLeadsForUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fromUserId,
      toUserId,
      actorId,
    }: {
      fromUserId: string;
      toUserId: string | null;
      actorId: string | null;
    }) => reassignLeadsForUser({ fromUserId, toUserId, actorId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      void queryClient.invalidateQueries({ queryKey: ["user-lead-counts"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.followUps });
    },
  });
};
