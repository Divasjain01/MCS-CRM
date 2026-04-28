import type {
  FollowUpStatus,
  LeadPriority,
  LeadSource,
  LeadStage,
  LeadType,
  ProductInterest,
  ShowroomVisitStatus,
} from "@/types/crm";

export const stageLabels: Record<LeadStage, string> = {
  new: "New",
  attempting_contact: "Attempting Contact",
  connected: "Connected",
  qualified: "Qualified",
  visit_booked: "Visit Booked",
  visit_done: "Visit Done",
  quotation_sent: "Quotation Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  dormant: "Closed",
};

export const sourceLabels: Record<LeadSource, string> = {
  shopify: "Shopify",
  meta: "Meta Ads",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  bni: "BNI",
  jbn: "JBN",
  indiamart: "IndiaMart",
  justdial: "JustDial",
  referral: "Referral",
  walk_in: "Walk-in",
  website: "Website",
  manual: "Manual Entry",
};

export const inactiveLeadSources = new Set<LeadSource>(["shopify"]);

export const sourceChartColors: Record<LeadSource, string> = {
  shopify: "#2F855A",
  meta: "#2563EB",
  instagram: "#DB2777",
  whatsapp: "#059669",
  bni: "#7C3AED",
  jbn: "#4F46E5",
  indiamart: "#0284C7",
  justdial: "#EA580C",
  referral: "#D97706",
  walk_in: "#475569",
  website: "#0891B2",
  manual: "#78716C",
};

export const leadTypeLabels: Record<LeadType, string> = {
  homeowner: "Homeowner",
  architect: "Architect",
  interior_designer: "Interior Designer",
  contractor: "Contractor",
  builder: "Builder",
};

export const productInterestLabels: Record<ProductInterest, string> = {
  living_room: "Living Room",
  bedroom: "Bedroom",
  dining: "Dining",
  office: "Office",
  outdoor: "Outdoor",
  storage: "Storage",
  lighting: "Lighting",
  decor: "Decor",
  modular_kitchen: "Modular Kitchen",
  wardrobes: "Wardrobes",
  loose_furniture: "Loose Furniture",
};

export const categoryLabels = productInterestLabels;

export const showroomVisitStatusLabels: Record<ShowroomVisitStatus, string> = {
  not_scheduled: "Not Scheduled",
  scheduled: "Scheduled",
  completed: "Completed",
  no_show: "No Show",
};

export const leadPriorityLabels: Record<LeadPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const followUpStatusLabels: Record<FollowUpStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
};

export const leadStageOptions = Object.entries(stageLabels)
  .filter(([value]) => value !== "connected")
  .map(([value, label]) => ({
    value: value as LeadStage,
    label,
  }));

export const leadSourceOptions = Object.entries(sourceLabels).map(([value, label]) => ({
  value: value as LeadSource,
  label,
})).filter((option) => !inactiveLeadSources.has(option.value));

export const leadTypeOptions = Object.entries(leadTypeLabels).map(([value, label]) => ({
  value: value as LeadType,
  label,
}));

export const productInterestOptions = Object.entries(productInterestLabels).map(
  ([value, label]) => ({
    value: value as ProductInterest,
    label,
  }),
);

export const showroomVisitStatusOptions = Object.entries(
  showroomVisitStatusLabels,
).map(([value, label]) => ({
  value: value as ShowroomVisitStatus,
  label,
}));

export const leadPriorityOptions = Object.entries(leadPriorityLabels).map(
  ([value, label]) => ({
    value: value as LeadPriority,
    label,
  }),
);
