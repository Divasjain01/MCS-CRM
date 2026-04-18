import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const selectLeadColumns =
  "id, full_name, email, phone, alternate_phone, company_name, lead_type, source, source_detail, stage, assigned_to, project_location, city, requirement_summary, product_interest, showroom_visit_status, showroom_visit_date, quotation_required, quotation_value, budget, priority, notes_summary, next_follow_up_at, last_contacted_at, lost_reason, created_by, created_at, updated_at";

const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(-10);

const trimText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const nullableText = (value: unknown) => {
  const trimmed = trimText(value);
  return trimmed.length > 0 ? trimmed : null;
};

const nullableNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const trimmed = trimText(value);
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const nullableDate = (value: unknown) => {
  const trimmed = trimText(value);
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeLeadPayload = (input: Record<string, unknown>, actorId: string) => ({
  full_name: trimText(input.full_name),
  email: nullableText(input.email)?.toLowerCase() ?? null,
  phone: trimText(input.phone),
  alternate_phone: nullableText(input.alternate_phone),
  company_name: nullableText(input.company_name),
  lead_type: trimText(input.lead_type) || "homeowner",
  source: trimText(input.source) || "manual",
  source_detail: nullableText(input.source_detail),
  stage: trimText(input.stage) || "new",
  assigned_to: nullableText(input.assigned_to),
  project_location: nullableText(input.project_location),
  city: nullableText(input.city),
  requirement_summary: nullableText(input.requirement_summary),
  product_interest: nullableText(input.product_interest),
  showroom_visit_status: trimText(input.showroom_visit_status) || "not_scheduled",
  showroom_visit_date: nullableDate(input.showroom_visit_date),
  quotation_required: Boolean(input.quotation_required),
  quotation_value: nullableNumber(input.quotation_value),
  budget: nullableNumber(input.budget),
  priority: trimText(input.priority) || "medium",
  notes_summary: nullableText(input.notes_summary),
  next_follow_up_at: nullableDate(input.next_follow_up_at),
  lost_reason: nullableText(input.lost_reason),
  created_by: actorId,
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        {
          status: 401,
          headers: corsHeaders,
        },
      );
    }

    const supabaseUrl = Deno.env.get("URL");
    const supabaseAnonKey = Deno.env.get("ANON_KEY");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required function secrets" }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", caller.id)
      .single();

    if (profileError || !callerProfile || callerProfile.is_active !== true) {
      return new Response(
        JSON.stringify({ success: false, error: "Active user profile required" }),
        {
          status: 403,
          headers: corsHeaders,
        },
      );
    }

    const requestBody = await req.json();
    const isImport = requestBody?.mode === "import";
    const leadInputs = Array.isArray(requestBody?.leads)
      ? requestBody.leads
      : requestBody?.lead && typeof requestBody.lead === "object"
        ? [requestBody.lead]
        : [];

    if (leadInputs.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "At least one lead payload is required" }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const sanitizedLeads = leadInputs.map((leadInput) =>
      sanitizeLeadPayload(leadInput as Record<string, unknown>, caller.id),
    );

    const inputErrors: Array<{ index: number; error: string }> = [];
    const incomingPhoneMap = new Map<string, number>();

    sanitizedLeads.forEach((lead, index) => {
      if (!lead.full_name) {
        inputErrors.push({ index, error: "Full name is required" });
      }

      if (!lead.phone) {
        inputErrors.push({ index, error: "Phone is required" });
        return;
      }

      const normalizedPhone = normalizePhone(lead.phone);
      if (!normalizedPhone) {
        inputErrors.push({ index, error: "Phone number is invalid" });
        return;
      }

      if (incomingPhoneMap.has(normalizedPhone)) {
        inputErrors.push({
          index,
          error: `Duplicate phone in request for row ${incomingPhoneMap.get(normalizedPhone)! + 1}`,
        });
        return;
      }

      incomingPhoneMap.set(normalizedPhone, index);
    });

    const assignedIds = [...new Set(sanitizedLeads.map((lead) => lead.assigned_to).filter(Boolean))];

    if (assignedIds.length > 0) {
      const { data: assignees, error: assigneeError } = await adminClient
        .from("profiles")
        .select("id, role, is_active")
        .in("id", assignedIds as string[]);

      if (assigneeError) {
        return new Response(
          JSON.stringify({ success: false, error: "Unable to validate assignees" }),
          {
            status: 500,
            headers: corsHeaders,
          },
        );
      }

      const assigneeMap = new Map(
        (assignees ?? []).map((assignee) => [assignee.id, assignee] as const),
      );

      sanitizedLeads.forEach((lead, index) => {
        if (!lead.assigned_to) {
          return;
        }

        const assignee = assigneeMap.get(lead.assigned_to);
        if (!assignee) {
          inputErrors.push({ index, error: "Assigned user not found" });
          return;
        }

        if (assignee.is_active !== true) {
          inputErrors.push({ index, error: "Assigned user is inactive" });
          return;
        }

        if (callerProfile.role === "sales" && assignee.role !== "sales") {
          inputErrors.push({
            index,
            error: "Sales users can only assign leads to active sales profiles",
          });
        }
      });
    }

    const { data: existingLeadRows, error: existingLeadError } = await adminClient
      .from("leads")
      .select("id, phone, full_name")
      .not("phone", "is", null);

    if (existingLeadError) {
      return new Response(
        JSON.stringify({ success: false, error: "Unable to inspect existing leads" }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const existingLeadByPhone = new Map<string, { id: string; full_name: string | null }>();
    (existingLeadRows ?? []).forEach((lead) => {
      const normalizedPhone = normalizePhone(lead.phone ?? "");
      if (normalizedPhone && !existingLeadByPhone.has(normalizedPhone)) {
        existingLeadByPhone.set(normalizedPhone, {
          id: lead.id,
          full_name: lead.full_name ?? null,
        });
      }
    });

    const validLeads: typeof sanitizedLeads = [];
    const resultErrors = [...inputErrors];

    sanitizedLeads.forEach((lead, index) => {
      if (resultErrors.some((error) => error.index === index)) {
        return;
      }

      const normalizedPhone = normalizePhone(lead.phone);
      const existingLead = existingLeadByPhone.get(normalizedPhone);

      if (existingLead) {
        resultErrors.push({
          index,
          error: existingLead.full_name
            ? `Phone already exists for ${existingLead.full_name}`
            : "Phone already exists in the CRM",
        });
        return;
      }

      validLeads.push(lead);
    });

    let insertedRows:
      | Array<Record<string, unknown> & { id: string; full_name: string; assigned_to: string | null }>
      | null = null;

    if (validLeads.length > 0) {
      const { data: insertedData, error: insertError } = await adminClient
        .from("leads")
        .insert(validLeads)
        .select(selectLeadColumns);

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: insertError.message, details: insertError }),
          {
            status: 400,
            headers: corsHeaders,
          },
        );
      }

      insertedRows = (insertedData ?? []) as Array<
        Record<string, unknown> & { id: string; full_name: string; assigned_to: string | null }
      >;

      const activityRows = insertedRows.map((lead) => ({
        lead_id: lead.id,
        type: "lead_created",
        description: isImport ? `Lead imported for ${lead.full_name}` : `Lead created for ${lead.full_name}`,
        created_by: caller.id,
        metadata: isImport ? { import: true } : null,
      }));

      const assignedLeads = insertedRows.filter((lead) => lead.assigned_to);

      if (activityRows.length > 0) {
        const { error: activityError } = await adminClient
          .from("lead_activities")
          .insert(activityRows);

        if (activityError) {
          console.warn("Unable to write lead creation activity", activityError);
        }
      }

      if (assignedLeads.length > 0) {
        const assignmentRows = assignedLeads.map((lead) => ({
          lead_id: lead.id,
          assigned_to: lead.assigned_to,
          assigned_by: caller.id,
          note: "Initial assignment",
        }));

        const assignmentActivities = assignedLeads.map((lead) => ({
          lead_id: lead.id,
          type: "assignment_changed",
          description: isImport ? "Lead assigned during import" : "Lead assigned during creation",
          created_by: caller.id,
          metadata: isImport ? { assigned_to: lead.assigned_to, import: true } : { assigned_to: lead.assigned_to },
        }));

        const { error: assignmentError } = await adminClient
          .from("lead_assignments")
          .insert(assignmentRows);

        if (assignmentError) {
          console.warn("Unable to write assignment history", assignmentError);
        }

        const { error: assignmentActivityError } = await adminClient
          .from("lead_activities")
          .insert(assignmentActivities);

        if (assignmentActivityError) {
          console.warn("Unable to write assignment activity", assignmentActivityError);
        }
      }
    }

    const responsePayload = {
      success: resultErrors.length === 0,
      createdCount: insertedRows?.length ?? 0,
      skippedCount: resultErrors.length,
      leads: insertedRows ?? [],
      errors: resultErrors,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});
