export const queryKeys = {
  dashboard: ["dashboard"] as const,
  leads: ["leads"] as const,
  lead: (leadId: string) => ["lead", leadId] as const,
  leadActivities: (leadId: string) => ["lead-activities", leadId] as const,
  leadFollowUps: (leadId: string) => ["lead-follow-ups", leadId] as const,
  followUps: ["follow-ups"] as const,
  sampleDispatches: ["sample-dispatches"] as const,
  sampleDispatch: (dispatchId: string) => ["sample-dispatch", dispatchId] as const,
  sampleDispatchActivities: (dispatchId: string) =>
    ["sample-dispatch-activities", dispatchId] as const,
  sampleCustomerSuggestions: (query: string) =>
    ["sample-customer-suggestions", query] as const,
  users: ["users"] as const,
};
