export type UserRole =
  | "admin"
  | "sales"
  | "store_manager"
  | "furniture_specialist";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  loginUid?: string | null;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
}

export interface CreateUserFormValues {
  fullName: string;
  loginUid: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

export interface ActivityMetadata {
  note?: string | null;
  due_at?: string | null;
  assigned_to?: string | null;
  previous_assigned_to?: string | null;
  stage?: string | null;
  previous_stage?: string | null;
  follow_up_id?: string | null;
  completed_at?: string | null;
  import?: boolean | null;
  [key: string]: string | number | boolean | null | undefined;
}

export type LeadStage =
  | "new"
  | "attempting_contact"
  | "connected"
  | "qualified"
  | "visit_booked"
  | "visit_done"
  | "quotation_sent"
  | "negotiation"
  | "won"
  | "lost"
  | "dormant";

export type LeadSource =
  | "shopify"
  | "meta"
  | "instagram"
  | "whatsapp"
  | "bni"
  | "jbn"
  | "indiamart"
  | "justdial"
  | "referral"
  | "walk_in"
  | "website"
  | "manual";

export type LeadType =
  | "homeowner"
  | "architect"
  | "interior_designer"
  | "contractor"
  | "builder";

export type ProductInterest =
  | "living_room"
  | "bedroom"
  | "dining"
  | "office"
  | "outdoor"
  | "storage"
  | "lighting"
  | "decor"
  | "modular_kitchen"
  | "wardrobes"
  | "loose_furniture";

export type ProductCategory = ProductInterest;

export type ShowroomVisitStatus =
  | "not_scheduled"
  | "scheduled"
  | "completed"
  | "no_show";

export type LeadPriority = "low" | "medium" | "high";

export type ActivityType =
  | "lead_created"
  | "lead_updated"
  | "stage_changed"
  | "assignment_changed"
  | "note_added"
  | "follow_up_added"
  | "follow_up_completed"
  | "call"
  | "email"
  | "whatsapp"
  | "meeting";

export type FollowUpStatus =
  | "scheduled"
  | "completed"
  | "missed"
  | "cancelled";

export interface Lead {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  companyName: string | null;
  leadType: LeadType;
  source: LeadSource;
  sourceDetail: string | null;
  stage: LeadStage;
  assignedTo: string | null;
  assignedUser?: UserSummary | null;
  projectLocation: string | null;
  city: string | null;
  requirementSummary: string | null;
  productInterest: string | null;
  showroomVisitStatus: ShowroomVisitStatus;
  showroomVisitDate: string | null;
  quotationRequired: boolean;
  quotationValue: number | null;
  budget: number | null;
  priority: LeadPriority;
  notesSummary: string | null;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  lostReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  metadata?: ActivityMetadata | null;
  createdAt: string;
  createdBy: string | null;
  createdByUser?: UserSummary | null;
}

export interface FollowUp {
  id: string;
  leadId: string;
  assignedTo: string | null;
  assignedUser?: UserSummary | null;
  dueAt: string;
  completedAt: string | null;
  status: FollowUpStatus;
  note: string | null;
  createdBy: string | null;
  createdByUser?: UserSummary | null;
  createdAt: string;
}

export interface LeadFormValues {
  fullName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  companyName: string;
  leadType: LeadType;
  source: LeadSource;
  sourceDetail: string;
  stage: LeadStage;
  assignedTo: string;
  projectLocation: string;
  city: string;
  requirementSummary: string;
  productInterest: string;
  showroomVisitStatus: ShowroomVisitStatus;
  showroomVisitDate: string;
  quotationRequired: boolean;
  quotationValue: string;
  budget: string;
  priority: LeadPriority;
  notesSummary: string;
  nextFollowUpAt: string;
  lostReason: string;
}

export interface FollowUpFormValues {
  dueAt: string;
  note: string;
  assignedTo: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  price: number;
  image?: string;
  description?: string;
  inStock: boolean;
}

export interface DashboardMetrics {
  newLeads: number;
  connected: number;
  storeVisits: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
}

export interface DashboardTrendPoint {
  date: string;
  leads: number;
}

export interface DashboardSourcePoint {
  source: LeadSource;
  label: string;
  count: number;
  fill: string;
}

export interface DashboardSnapshot {
  metrics: DashboardMetrics;
  previousMetrics: DashboardMetrics;
  leadsOverTime: DashboardTrendPoint[];
  leadsBySource: DashboardSourcePoint[];
}

export type LeadImportField =
  | "full_name"
  | "email"
  | "phone"
  | "alternate_phone"
  | "company_name"
  | "lead_type"
  | "source"
  | "source_detail"
  | "stage"
  | "assigned_to"
  | "project_location"
  | "city"
  | "requirement_summary"
  | "product_interest"
  | "showroom_visit_status"
  | "showroom_visit_date"
  | "quotation_required"
  | "quotation_value"
  | "budget"
  | "priority"
  | "notes_summary"
  | "next_follow_up_at"
  | "lost_reason";

export interface LeadImportPreviewRow {
  rowNumber: number;
  status: "ready" | "invalid" | "duplicate";
  rawValues: Record<string, string>;
  errors: string[];
  duplicateReason: string | null;
  lead: Partial<Lead>;
}

export interface LeadImportSummary {
  totalRows: number;
  readyRows: number;
  invalidRows: number;
  duplicateRows: number;
}

export interface LeadImportResult {
  insertedCount: number;
  skippedCount: number;
}
