import type { UserRole, UserSummary } from "@/types/crm";

export const getAssignableUsers = (
  users: UserSummary[],
  actorRole: UserRole | undefined,
) =>
  users.filter((user) => {
    if (!user.isActive) {
      return false;
    }

    if (actorRole === "sales") {
      return user.role === "sales";
    }

    return true;
  });

