import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createSampleDispatch,
  getSampleDispatchById,
  listSampleDispatchActivities,
  listSampleDispatches,
  searchSampleCustomerSuggestions,
  updateSampleDispatch,
} from "@/services/sample-tracking";
import type {
  SampleDispatchFormValues,
  UserRole,
  UserSummary,
} from "@/types/crm";

export const useSampleDispatchesQuery = (users: UserSummary[] = []) =>
  useQuery({
    queryKey: [...queryKeys.sampleDispatches, users.map((user) => user.id).join(",")],
    queryFn: () => listSampleDispatches(users),
  });

export const useSampleDispatchDetailQuery = (
  dispatchId: string | undefined,
  users: UserSummary[] = [],
) =>
  useQuery({
    queryKey: dispatchId
      ? [...queryKeys.sampleDispatch(dispatchId), users.map((user) => user.id).join(",")]
      : ["sample-dispatch-empty"],
    queryFn: () => getSampleDispatchById(dispatchId ?? "", users),
    enabled: Boolean(dispatchId),
  });

export const useSampleDispatchActivitiesQuery = (
  dispatchId: string | undefined,
  users: UserSummary[] = [],
) =>
  useQuery({
    queryKey: dispatchId
      ? [
          ...queryKeys.sampleDispatchActivities(dispatchId),
          users.map((user) => user.id).join(","),
        ]
      : ["sample-dispatch-activities-empty"],
    queryFn: () => listSampleDispatchActivities(dispatchId ?? "", users),
    enabled: Boolean(dispatchId),
  });

export const useSampleCustomerSuggestionsQuery = (query: string) =>
  useQuery({
    queryKey: queryKeys.sampleCustomerSuggestions(query.trim()),
    queryFn: () => searchSampleCustomerSuggestions(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });

export const useCreateSampleDispatchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      values,
      actorId,
      actorRole,
      users,
    }: {
      values: SampleDispatchFormValues;
      actorId: string | null;
      actorRole: UserRole | null;
      users: UserSummary[];
    }) => createSampleDispatch(values, actorId, actorRole, users),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sampleDispatches });
    },
  });
};

export const useUpdateSampleDispatchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dispatchId,
      values,
      actorId,
      actorRole,
      users,
    }: {
      dispatchId: string;
      values: SampleDispatchFormValues;
      actorId: string | null;
      actorRole: UserRole | null;
      users: UserSummary[];
    }) => updateSampleDispatch(dispatchId, values, actorId, actorRole, users),
    onSuccess: (_dispatch, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sampleDispatches });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sampleDispatch(variables.dispatchId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sampleDispatchActivities(variables.dispatchId),
      });
    },
  });
};
