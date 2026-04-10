export const queryKeys = {
  dashboard: ["dashboard"] as const,
  leads: ["leads"] as const,
  lead: (leadId: string) => ["lead", leadId] as const,
  leadActivities: (leadId: string) => ["lead-activities", leadId] as const,
  leadFollowUps: (leadId: string) => ["lead-follow-ups", leadId] as const,
  followUps: ["follow-ups"] as const,
  users: ["users"] as const,
};
