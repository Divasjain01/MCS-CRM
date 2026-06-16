import type {
  ActivityMetadata,
  CustomerSuggestion,
  FollowUp,
  FollowUpFormValues,
  Lead,
  LeadActivity,
  LeadFormValues,
  SampleDispatch,
  SampleDispatchActivity,
  SampleDispatchItemFormValues,
  SampleDispatchFormValues,
  UserSummary,
} from "@/types/crm";
import type { Database } from "@/types/database";
import { normalizeLeadPhone } from "@/lib/phone";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
type LeadActivityRow = Database["public"]["Tables"]["lead_activities"]["Row"];
type FollowUpRow = Database["public"]["Tables"]["follow_ups"]["Row"];
type SampleDispatchRow = Database["public"]["Tables"]["sample_dispatches"]["Row"];
type SampleDispatchInsert = Database["public"]["Tables"]["sample_dispatches"]["Insert"];
type SampleDispatchUpdate = Database["public"]["Tables"]["sample_dispatches"]["Update"];
type SampleDispatchActivityRow =
  Database["public"]["Tables"]["sample_dispatch_activities"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const nullableText = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const nullableDate = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  // Normalize browser date inputs into full ISO strings for timestamptz columns.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }

  return trimmed;
};

const nullableNumber = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const integerValue = (value: string, fallback = 1) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return fallback;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toDateTimeLocal = (value: string | null) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const offset = parsed.getTimezoneOffset();
  const localDate = new Date(parsed.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

export const mapProfileRowToUserSummary = (profile: ProfileRow): UserSummary => ({
  id: profile.id,
  fullName: profile.full_name ?? profile.email ?? profile.phone ?? "M Cube User",
  email: profile.email ?? "",
  loginUid: profile.login_uid,
  phone: profile.phone,
  role: profile.role,
  isActive: profile.is_active,
  avatarUrl: profile.avatar_url,
});

export const mapLeadRowToLead = (
  row: LeadRow,
  assignedUser?: UserSummary | null,
): Lead => ({
  id: row.id,
  enquiryReference: row.enquiry_reference,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  alternatePhone: row.alternate_phone,
  companyName: row.company_name,
  leadType: row.lead_type,
  source: row.source,
  sourceDetail: row.source_detail,
  stage: row.stage === "connected" ? "qualified" : row.stage,
  assignedTo: row.assigned_to,
  assignedUser: assignedUser ?? null,
  projectLocation: row.project_location,
  city: row.city,
  requirementSummary: row.requirement_summary,
  productInterest: row.product_interest,
  showroomVisitStatus: row.showroom_visit_status,
  showroomVisitDate: row.showroom_visit_date,
  quotationRequired: row.quotation_required,
  quotationValue: row.quotation_value,
  budget: row.budget,
  priority: row.priority,
  notesSummary: row.notes_summary,
  nextFollowUpAt: row.next_follow_up_at,
  lastContactedAt: row.last_contacted_at,
  lostReason: row.lost_reason,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapLeadActivityRowToActivity = (
  row: LeadActivityRow,
  createdByUser?: UserSummary | null,
): LeadActivity => ({
  id: row.id,
  leadId: row.lead_id,
  type: row.type,
  description: row.description,
  metadata:
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as ActivityMetadata)
      : null,
  createdAt: row.created_at,
  createdBy: row.created_by,
  createdByUser: createdByUser ?? null,
});

export const mapFollowUpRowToFollowUp = (
  row: FollowUpRow,
  assignedUser?: UserSummary | null,
  createdByUser?: UserSummary | null,
): FollowUp => ({
  id: row.id,
  leadId: row.lead_id,
  assignedTo: row.assigned_to,
  assignedUser: assignedUser ?? null,
  dueAt: row.due_at,
  completedAt: row.completed_at,
  status: row.status,
  note: row.note,
  createdBy: row.created_by,
  createdByUser: createdByUser ?? null,
  createdAt: row.created_at,
});

export const mapCustomerSuggestionRowToSuggestion = (
  row: Pick<LeadRow, "id" | "enquiry_reference" | "full_name" | "phone" | "company_name" | "assigned_to">,
): CustomerSuggestion => ({
  leadId: row.id,
  enquiryReference: row.enquiry_reference,
  customerName: row.full_name,
  customerPhone: row.phone,
  companyName: row.company_name,
  assignedTo: row.assigned_to,
});

export const mapSampleDispatchRowToSampleDispatch = (
  row: SampleDispatchRow,
  assignedUser?: UserSummary | null,
  createdByUser?: UserSummary | null,
): SampleDispatch => ({
  id: row.id,
  leadId: row.lead_id,
  enquiryReference: row.enquiry_reference,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  companyName: row.company_name,
  issuedAt: row.issued_at,
  expectedReturnAt: row.expected_return_at,
  actualReturnedAt: row.actual_returned_at,
  materialName: row.material_name,
  quantity: row.quantity,
  amountCollected: row.amount_collected,
  remarks: row.remarks,
  assignedTo: row.assigned_to,
  assignedUser: assignedUser ?? null,
  dispatchMethod: row.dispatch_method,
  returnStatus: row.return_status,
  createdBy: row.created_by,
  createdByUser: createdByUser ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapSampleDispatchActivityRowToActivity = (
  row: SampleDispatchActivityRow,
  createdByUser?: UserSummary | null,
): SampleDispatchActivity => ({
  id: row.id,
  sampleDispatchId: row.sample_dispatch_id,
  type: row.type,
  description: row.description,
  metadata:
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as ActivityMetadata)
      : null,
  createdAt: row.created_at,
  createdBy: row.created_by,
  createdByUser: createdByUser ?? null,
});

export const mapLeadFormValuesToInsert = (
  values: LeadFormValues,
  actorId: string | null,
): LeadInsert => ({
  enquiry_reference: nullableText(values.enquiryReference),
  full_name: values.fullName.trim(),
  email: nullableText(values.email),
  phone: normalizeLeadPhone(values.phone) ?? values.phone.trim(),
  alternate_phone: nullableText(values.alternatePhone)
    ? normalizeLeadPhone(values.alternatePhone) ?? values.alternatePhone.trim()
    : null,
  company_name: nullableText(values.companyName),
  lead_type: values.leadType,
  source: values.source,
  source_detail: nullableText(values.sourceDetail),
  stage: values.stage,
  assigned_to: values.assignedTo || null,
  project_location: nullableText(values.projectLocation),
  city: nullableText(values.city),
  requirement_summary: nullableText(values.requirementSummary),
  product_interest: nullableText(values.productInterest),
  showroom_visit_status: values.showroomVisitStatus,
  showroom_visit_date: nullableDate(values.showroomVisitDate),
  quotation_required: values.quotationRequired,
  quotation_value: nullableNumber(values.quotationValue),
  budget: nullableNumber(values.budget),
  priority: values.priority,
  notes_summary: nullableText(values.notesSummary),
  next_follow_up_at: nullableDate(values.nextFollowUpAt),
  lost_reason: nullableText(values.lostReason),
  created_by: actorId,
});

export const mapLeadFormValuesToUpdate = (
  values: LeadFormValues,
): LeadUpdate => ({
  enquiry_reference: nullableText(values.enquiryReference),
  full_name: values.fullName.trim(),
  email: nullableText(values.email),
  phone: normalizeLeadPhone(values.phone) ?? values.phone.trim(),
  alternate_phone: nullableText(values.alternatePhone)
    ? normalizeLeadPhone(values.alternatePhone) ?? values.alternatePhone.trim()
    : null,
  company_name: nullableText(values.companyName),
  lead_type: values.leadType,
  source: values.source,
  source_detail: nullableText(values.sourceDetail),
  stage: values.stage,
  assigned_to: values.assignedTo || null,
  project_location: nullableText(values.projectLocation),
  city: nullableText(values.city),
  requirement_summary: nullableText(values.requirementSummary),
  product_interest: nullableText(values.productInterest),
  showroom_visit_status: values.showroomVisitStatus,
  showroom_visit_date: nullableDate(values.showroomVisitDate),
  quotation_required: values.quotationRequired,
  quotation_value: nullableNumber(values.quotationValue),
  budget: nullableNumber(values.budget),
  priority: values.priority,
  notes_summary: nullableText(values.notesSummary),
  next_follow_up_at: nullableDate(values.nextFollowUpAt),
  lost_reason: nullableText(values.lostReason),
});

export const mapLeadToFormValues = (lead: Lead): LeadFormValues => ({
  enquiryReference: lead.enquiryReference ?? "",
  fullName: lead.fullName,
  email: lead.email ?? "",
  phone: lead.phone,
  alternatePhone: lead.alternatePhone ?? "",
  companyName: lead.companyName ?? "",
  leadType: lead.leadType,
  source: lead.source,
  sourceDetail: lead.sourceDetail ?? "",
  stage: lead.stage,
  assignedTo: lead.assignedTo ?? "",
  projectLocation: lead.projectLocation ?? "",
  city: lead.city ?? "",
  requirementSummary: lead.requirementSummary ?? "",
  productInterest: lead.productInterest ?? "",
  showroomVisitStatus: lead.showroomVisitStatus,
  showroomVisitDate: lead.showroomVisitDate ?? "",
  quotationRequired: lead.quotationRequired,
  quotationValue: lead.quotationValue?.toString() ?? "",
  budget: lead.budget?.toString() ?? "",
  priority: lead.priority,
  notesSummary: lead.notesSummary ?? "",
  nextFollowUpAt: lead.nextFollowUpAt ?? "",
  lostReason: lead.lostReason ?? "",
});

export const mapSampleDispatchFormValuesToInsert = (
  values: SampleDispatchFormValues,
  actorId: string | null,
  item?: SampleDispatchItemFormValues,
): SampleDispatchInsert => ({
  lead_id: nullableText(values.leadId),
  enquiry_reference: nullableText(values.enquiryReference),
  customer_name: values.customerName.trim(),
  customer_phone: normalizeLeadPhone(values.customerPhone) ?? values.customerPhone.trim(),
  company_name: nullableText(values.companyName),
  issued_at: nullableDate(values.issuedAt) ?? new Date().toISOString(),
  expected_return_at: nullableDate(values.expectedReturnAt),
  actual_returned_at: nullableDate(values.actualReturnedAt),
  material_name: item?.materialName.trim() ?? "",
  quantity: integerValue(item?.quantity ?? "", 1),
  amount_collected: nullableNumber(values.amountCollected),
  remarks: nullableText(values.remarks),
  assigned_to: nullableText(values.assignedTo),
  dispatch_method: values.dispatchMethod,
  return_status: values.returnStatus,
  created_by: actorId,
});

export const mapSampleDispatchFormValuesToUpdate = (
  values: SampleDispatchFormValues,
): SampleDispatchUpdate => {
  const primaryItem = values.sampleItems[0];

  return {
    lead_id: nullableText(values.leadId),
    enquiry_reference: nullableText(values.enquiryReference),
    customer_name: values.customerName.trim(),
    customer_phone: normalizeLeadPhone(values.customerPhone) ?? values.customerPhone.trim(),
    company_name: nullableText(values.companyName),
    issued_at: nullableDate(values.issuedAt) ?? new Date().toISOString(),
    expected_return_at: nullableDate(values.expectedReturnAt),
    actual_returned_at: nullableDate(values.actualReturnedAt),
    material_name: primaryItem?.materialName.trim() ?? "",
    quantity: integerValue(primaryItem?.quantity ?? "", 1),
    amount_collected: nullableNumber(values.amountCollected),
    remarks: nullableText(values.remarks),
    assigned_to: nullableText(values.assignedTo),
    dispatch_method: values.dispatchMethod,
    return_status: values.returnStatus,
  };
};

export const mapSampleDispatchToFormValues = (
  dispatch: SampleDispatch,
): SampleDispatchFormValues => ({
  leadId: dispatch.leadId ?? "",
  enquiryReference: dispatch.enquiryReference ?? "",
  customerName: dispatch.customerName,
  customerPhone: dispatch.customerPhone,
  companyName: dispatch.companyName ?? "",
  issuedAt: toDateTimeLocal(dispatch.issuedAt),
  expectedReturnAt: toDateTimeLocal(dispatch.expectedReturnAt),
  actualReturnedAt: toDateTimeLocal(dispatch.actualReturnedAt),
  amountCollected: dispatch.amountCollected?.toString() ?? "",
  remarks: dispatch.remarks ?? "",
  assignedTo: dispatch.assignedTo ?? "",
  dispatchMethod: dispatch.dispatchMethod,
  returnStatus: dispatch.returnStatus,
  sampleItems: [
    {
      materialName: dispatch.materialName,
      quantity: dispatch.quantity.toString(),
    },
  ],
});

export const mapFollowUpFormValuesToInsert = (
  values: FollowUpFormValues,
  leadId: string,
  actorId: string | null,
) => ({
  lead_id: leadId,
  assigned_to: values.assignedTo || null,
  due_at: nullableDate(values.dueAt),
  note: nullableText(values.note),
  created_by: actorId,
});
