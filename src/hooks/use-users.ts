import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { listUsers } from "@/services/users";

export const useUsersQuery = () =>
  useQuery({
    queryKey: queryKeys.users,
    queryFn: listUsers,
  });
