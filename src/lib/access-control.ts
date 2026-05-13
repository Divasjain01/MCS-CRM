import type { UserRole, UserSummary } from "@/types/crm";

export const getAssignableUsers = (
  users: UserSummary[],
  actorRole: UserRole | undefined,
  actorId?: string | null,
) =>
  users.filter((user) => {
    if (!user.isActive) {
      return false;
    }

    if (actorRole === "sales") {
      return user.id === actorId;
    }

    return true;
  });
