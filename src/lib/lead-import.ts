import {
  leadPriorityLabels,
  leadTypeLabels,
  showroomVisitStatusLabels,
  sourceLabels,
  stageLabels,
} from "@/lib/crm-config";
import { normalizeLeadPhone } from "@/lib/phone";
import type {
  Lead,
  LeadImportField,
  LeadImportPreviewRow,
  LeadImportSummary,
  LeadPriority,
  LeadSource,
  LeadStage,
  LeadType,
  ShowroomVisitStatus,
  UserSummary,
} from "@/types/crm";
import type { Database } from "@/types/database";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

const fieldAliases: Record<LeadImportField, string[]> = {
  full_name: ["full name", "name", "customer name", "lead name"],
  email: ["email", "email address"],
  phone: ["phone", "mobile", "phone number", "mobile number"],
  alternate_phone: ["alternate phone", "secondary phone", "alt phone"],
  company_name: ["company", "company name", "firm"],
  lead_type: ["lead type", "customer type"],
  source: ["source", "lead source"],
  source_detail: ["source detail", "campaign", "source details"],
  stage: ["stage", "lead stage", "status"],
  assigned_to: ["assigned to", "owner", "lead owner"],
  project_location: ["project location", "site location"],
  city: ["city", "location city"],
  requirement_summary: ["requirement", "requirement summary", "requirements"],
  product_interest: ["product interest", "product interests", "interest", "interests", "product"],
  showroom_visit_status: ["showroom visit status", "visit status"],
  showroom_visit_date: ["showroom visit date", "visit date"],
  quotation_required: ["quotation required", "quotation needed"],
  quotation_value: ["quotation value", "quote value"],
  budget: ["budget", "project budget"],
  priority: ["priority"],
  notes_summary: ["notes", "notes summary", "remarks"],
  next_follow_up_at: ["next follow up", "next follow-up", "follow up at"],
  lost_reason: ["lost reason", "reason lost"],
};

const requiredFields: LeadImportField[] = ["full_name", "phone"];

const leadTypeLookup = new Map(
  Object.entries(leadTypeLabels).flatMap(([value, label]) => [
    [value.replaceAll("_", " "), value as LeadType],
    [label.toLowerCase(), value as LeadType],
  ]),
);

const sourceLookup = new Map(
  Object.entries(sourceLabels).flatMap(([value, label]) => [
    [value.replaceAll("_", " "), value as LeadSource],
    [label.toLowerCase(), value as LeadSource],
  ]),
);

const stageLookup = new Map(
  Object.entries(stageLabels).flatMap(([value, label]) => [
    [value.replaceAll("_", " "), value as LeadStage],
    [label.toLowerCase(), value as LeadStage],
  ]),
);

const priorityLookup = new Map(
  Object.entries(leadPriorityLabels).flatMap(([value, label]) => [
    [value.replaceAll("_", " "), value as LeadPriority],
    [label.toLowerCase(), value as LeadPriority],
  ]),
);

const showroomLookup = new Map(
  Object.entries(showroomVisitStatusLabels).flatMap(([value, label]) => [
    [value.replaceAll("_", " "), value as ShowroomVisitStatus],
    [label.toLowerCase(), value as ShowroomVisitStatus],
  ]),
);

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const nullableText = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
};

const parseNumber = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBoolean = (value: string | undefined) => {
  const normalized = normalize(value ?? "");

  if (!normalized) {
    return false;
  }

  return ["true", "yes", "y", "1"].includes(normalized);
};

const parseDate = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const parseEnum = <T extends string>(value: string | undefined, lookup: Map<string, T>) => {
  const normalized = normalize(value ?? "");

  if (!normalized) {
    return null;
  }

  return lookup.get(normalized) ?? null;
};

const parseProductInterest = (value: string | undefined) => {
  return nullableText(value);
};

const resolveAssignedUser = (value: string | undefined, users: UserSummary[]) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const normalized = normalize(trimmed);
  const match = users.find(
    (user) =>
      user.id === trimmed ||
      normalize(user.email) === normalized ||
      normalize(user.fullName) === normalized,
  );

  return match?.id ?? null;
};

const normalizePhone = (value: string | null | undefined) => normalizeLeadPhone(value) ?? "";

export const leadImportFields: { value: LeadImportField; label: string; required?: boolean }[] = [
  { value: "full_name", label: "Full Name", required: true },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone", required: true },
  { value: "alternate_phone", label: "Alternate Phone" },
  { value: "company_name", label: "Company Name" },
  { value: "lead_type", label: "Lead Type" },
  { value: "source", label: "Source" },
  { value: "source_detail", label: "Source Detail" },
  { value: "stage", label: "Stage" },
  { value: "assigned_to", label: "Assigned To" },
  { value: "project_location", label: "Project Location" },
  { value: "city", label: "City" },
  { value: "requirement_summary", label: "Requirement Summary" },
  { value: "product_interest", label: "Product Interest" },
  { value: "showroom_visit_status", label: "Showroom Visit Status" },
  { value: "showroom_visit_date", label: "Showroom Visit Date" },
  { value: "quotation_required", label: "Quotation Required" },
  { value: "quotation_value", label: "Quotation Value" },
  { value: "budget", label: "Budget" },
  { value: "priority", label: "Priority" },
  { value: "notes_summary", label: "Notes Summary" },
  { value: "next_follow_up_at", label: "Next Follow-up" },
  { value: "lost_reason", label: "Lost Reason" },
];

export const suggestImportMappings = (headers: string[]) =>
  headers.reduce<Record<string, LeadImportField | "skip">>((mappings, header) => {
    const normalizedHeader = normalize(header);
    const matchedField = leadImportFields.find(({ value }) =>
      fieldAliases[value].some((alias) => normalize(alias) === normalizedHeader),
    );

    mappings[header] = matchedField?.value ?? "skip";
    return mappings;
  }, {});

const buildLeadInsert = (
  rawValues: Record<string, string>,
  mappings: Record<string, LeadImportField | "skip">,
  users: UserSummary[],
  errors: string[],
): LeadInsert => {
  const getValue = (field: LeadImportField) => {
    const entry = Object.entries(mappings).find(([, value]) => value === field);
    return entry ? rawValues[entry[0]] : "";
  };

  const fullName = getValue("full_name").trim();
  const rawPhone = getValue("phone").trim();
  const phone = normalizeLeadPhone(rawPhone);
  const rawAlternatePhone = getValue("alternate_phone");
  const alternatePhone = nullableText(rawAlternatePhone);
  const normalizedAlternatePhone = alternatePhone ? normalizeLeadPhone(alternatePhone) : null;
  const email = nullableText(getValue("email"));
  const showroomVisitDate = parseDate(getValue("showroom_visit_date"));
  const nextFollowUpAt = parseDate(getValue("next_follow_up_at"));
  const leadType = parseEnum(getValue("lead_type"), leadTypeLookup) ?? "homeowner";
  const source = parseEnum(getValue("source"), sourceLookup) ?? "manual";
  const stage = parseEnum(getValue("stage"), stageLookup) ?? "new";
  const priority = parseEnum(getValue("priority"), priorityLookup) ?? "medium";
  const showroomVisitStatus =
    parseEnum(getValue("showroom_visit_status"), showroomLookup) ?? "not_scheduled";
  const quotationValue = parseNumber(getValue("quotation_value"));
  const budget = parseNumber(getValue("budget"));

  if (!fullName) {
    errors.push("Full Name is required.");
  }

  if (!rawPhone) {
    errors.push("Phone is required.");
  } else if (!phone) {
    errors.push("Phone must be a valid mobile number with country code when needed.");
  }

  if (alternatePhone && !normalizedAlternatePhone) {
    errors.push("Alternate Phone must be a valid mobile number.");
  }

  if (getValue("lead_type") && !parseEnum(getValue("lead_type"), leadTypeLookup)) {
    errors.push("Lead Type is not recognized.");
  }

  if (getValue("source") && !parseEnum(getValue("source"), sourceLookup)) {
    errors.push("Source is not recognized.");
  }

  if (getValue("stage") && !parseEnum(getValue("stage"), stageLookup)) {
    errors.push("Stage is not recognized.");
  }

  if (getValue("priority") && !parseEnum(getValue("priority"), priorityLookup)) {
    errors.push("Priority is not recognized.");
  }

  if (getValue("showroom_visit_status") && !parseEnum(getValue("showroom_visit_status"), showroomLookup)) {
    errors.push("Showroom Visit Status is not recognized.");
  }

  if (getValue("showroom_visit_date") && !showroomVisitDate) {
    errors.push("Showroom Visit Date is invalid.");
  }

  if (getValue("next_follow_up_at") && !nextFollowUpAt) {
    errors.push("Next Follow-up is invalid.");
  }

  if (getValue("quotation_value") && quotationValue == null) {
    errors.push("Quotation Value must be numeric.");
  }

  if (getValue("budget") && budget == null) {
    errors.push("Budget must be numeric.");
  }

  return {
    full_name: fullName,
    email,
    phone: phone ?? rawPhone,
    alternate_phone: normalizedAlternatePhone,
    company_name: nullableText(getValue("company_name")),
    lead_type: leadType,
    source,
    source_detail: nullableText(getValue("source_detail")),
    stage,
    assigned_to: resolveAssignedUser(getValue("assigned_to"), users),
    project_location: nullableText(getValue("project_location")),
    city: nullableText(getValue("city")),
    requirement_summary: nullableText(getValue("requirement_summary")),
    product_interest: parseProductInterest(getValue("product_interest")),
    showroom_visit_status: showroomVisitStatus,
    showroom_visit_date: showroomVisitDate,
    quotation_required: parseBoolean(getValue("quotation_required")),
    quotation_value: quotationValue,
    budget,
    priority,
    notes_summary: nullableText(getValue("notes_summary")),
    next_follow_up_at: nextFollowUpAt,
    lost_reason: nullableText(getValue("lost_reason")),
  };
};

export const buildLeadImportPreview = ({
  rows,
  mappings,
  existingLeads,
  users,
}: {
  rows: Record<string, string>[];
  mappings: Record<string, LeadImportField | "skip">;
  existingLeads: Lead[];
  users: UserSummary[];
}) => {
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const existingPhones = new Set(existingLeads.map((lead) => normalizePhone(lead.phone)));
  const existingEmails = new Set(
    existingLeads.map((lead) => normalize(lead.email ?? "")).filter(Boolean),
  );

  const previewRows = rows.map<LeadImportPreviewRow>((row, index) => {
    const errors: string[] = [];
    const insert = buildLeadInsert(row, mappings, users, errors);
    const phoneKey = normalizePhone(insert.phone);
    const emailKey = normalize(insert.email ?? "");
    let duplicateReason: string | null = null;

    if (phoneKey && existingPhones.has(phoneKey)) {
      duplicateReason = "Phone already exists in the CRM.";
    } else if (phoneKey && seenPhones.has(phoneKey)) {
      duplicateReason = "Phone is duplicated within this file.";
    } else if (emailKey && existingEmails.has(emailKey)) {
      duplicateReason = "Email already exists in the CRM.";
    } else if (emailKey && seenEmails.has(emailKey)) {
      duplicateReason = "Email is duplicated within this file.";
    }

    if (phoneKey) {
      seenPhones.add(phoneKey);
    }

    if (emailKey) {
      seenEmails.add(emailKey);
    }

    const status =
      errors.length > 0 ? "invalid" : duplicateReason ? "duplicate" : "ready";

    return {
      rowNumber: index + 2,
      status,
      rawValues: row,
      errors,
      duplicateReason,
      lead: {
        id: `import-row-${index}`,
        fullName: insert.full_name ?? "",
        email: insert.email ?? null,
        phone: insert.phone ?? "",
        alternatePhone: insert.alternate_phone ?? null,
        companyName: insert.company_name ?? null,
        leadType: insert.lead_type ?? "homeowner",
        source: insert.source ?? "manual",
        sourceDetail: insert.source_detail ?? null,
        stage: insert.stage ?? "new",
        assignedTo: insert.assigned_to ?? null,
        projectLocation: insert.project_location ?? null,
        city: insert.city ?? null,
        requirementSummary: insert.requirement_summary ?? null,
        productInterest: insert.product_interest ?? null,
        showroomVisitStatus: insert.showroom_visit_status ?? "not_scheduled",
        showroomVisitDate: insert.showroom_visit_date ?? null,
        quotationRequired: insert.quotation_required ?? false,
        quotationValue: insert.quotation_value ?? null,
        budget: insert.budget ?? null,
        priority: insert.priority ?? "medium",
        notesSummary: insert.notes_summary ?? null,
        nextFollowUpAt: insert.next_follow_up_at ?? null,
        lastContactedAt: null,
        lostReason: insert.lost_reason ?? null,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  });

  const summary: LeadImportSummary = {
    totalRows: previewRows.length,
    readyRows: previewRows.filter((row) => row.status === "ready").length,
    invalidRows: previewRows.filter((row) => row.status === "invalid").length,
    duplicateRows: previewRows.filter((row) => row.status === "duplicate").length,
  };

  const readyRows = previewRows
    .filter((row) => row.status === "ready")
    .map((row) => buildLeadInsert(row.rawValues, mappings, users, []));

  return { previewRows, summary, readyRows };
};

export const getMissingRequiredMappings = (mappings: Record<string, LeadImportField | "skip">) =>
  requiredFields.filter((field) => !Object.values(mappings).includes(field));
