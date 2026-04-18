import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CountryCodeSelect } from "@/components/ui/country-code-select";
import {
  leadPriorityOptions,
  leadSourceOptions,
  leadStageOptions,
  leadTypeOptions,
  showroomVisitStatusOptions,
} from "@/lib/crm-config";
import { DEFAULT_COUNTRY_CODE } from "@/lib/phone";
import { mapLeadToFormValues } from "@/lib/crm-mappers";
import type { Lead, LeadFormValues, UserSummary } from "@/types/crm";

export const LEAD_CREATE_DRAFT_KEY = "mcube:create-lead-draft";
export const LEAD_CREATE_DIALOG_OPEN_KEY = "mcube:create-lead-dialog-open";

const leadFormSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.string().email("Enter a valid email.").or(z.literal("")),
  phoneCountryCode: z.string().trim().min(1, "Country code is required."),
  phone: z.string().trim().min(6, "Phone number is required."),
  alternatePhoneCountryCode: z.string().trim(),
  alternatePhone: z.string(),
  companyName: z.string(),
  leadType: z.enum(["homeowner", "architect", "interior_designer", "contractor", "builder"]),
  source: z.enum([
    "meta",
    "instagram",
    "whatsapp",
    "bni",
    "jbn",
    "indiamart",
    "justdial",
    "referral",
    "walk_in",
    "website",
    "manual",
  ]),
  sourceDetail: z.string(),
  stage: z.enum([
    "new",
    "attempting_contact",
    "connected",
    "qualified",
    "visit_booked",
    "visit_done",
    "quotation_sent",
    "negotiation",
    "won",
    "lost",
    "dormant",
  ]),
  assignedTo: z.string(),
  projectLocation: z.string(),
  city: z.string(),
  requirementSummary: z.string(),
  productInterest: z.string(),
  showroomVisitStatus: z.enum(["not_scheduled", "scheduled", "completed", "no_show"]),
  showroomVisitDate: z.string(),
  quotationRequired: z.boolean(),
  quotationValue: z.string(),
  budget: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  notesSummary: z.string(),
  nextFollowUpAt: z.string(),
  lostReason: z.string(),
});

const defaultValues: LeadFormValues = {
  fullName: "",
  email: "",
  phoneCountryCode: DEFAULT_COUNTRY_CODE,
  phone: "",
  alternatePhoneCountryCode: DEFAULT_COUNTRY_CODE,
  alternatePhone: "",
  companyName: "",
  leadType: "homeowner",
  source: "manual",
  sourceDetail: "",
  stage: "new",
  assignedTo: "",
  projectLocation: "",
  city: "",
  requirementSummary: "",
  productInterest: "",
  showroomVisitStatus: "not_scheduled",
  showroomVisitDate: "",
  quotationRequired: false,
  quotationValue: "",
  budget: "",
  priority: "medium",
  notesSummary: "",
  nextFollowUpAt: "",
  lostReason: "",
};

interface LeadFormDialogProps {
  lead?: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignableUsers: UserSummary[];
  isSubmitting?: boolean;
  onSubmit: (values: LeadFormValues) => Promise<void>;
}

const readCreateLeadDraft = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedDraft = window.sessionStorage.getItem(LEAD_CREATE_DRAFT_KEY);
    if (!storedDraft) {
      return null;
    }

    const parsedDraft = JSON.parse(storedDraft);
    const validation = leadFormSchema.safeParse(parsedDraft);
    return validation.success ? validation.data : null;
  } catch {
    return null;
  }
};

const writeCreateLeadDraft = (values: LeadFormValues) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(LEAD_CREATE_DRAFT_KEY, JSON.stringify(values));
};

const clearCreateLeadDraft = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(LEAD_CREATE_DRAFT_KEY);
};

export function LeadFormDialog({
  lead,
  open,
  onOpenChange,
  assignableUsers,
  isSubmitting = false,
  onSubmit,
}: LeadFormDialogProps) {
  const initialValues = useMemo(() => {
    if (lead) {
      return mapLeadToFormValues(lead);
    }

    return readCreateLeadDraft() ?? defaultValues;
  }, [lead]);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(lead ? mapLeadToFormValues(lead) : readCreateLeadDraft() ?? defaultValues);
  }, [form, lead, open]);

  useEffect(() => {
    if (!open || lead) {
      return;
    }

    const subscription = form.watch((values) => {
      writeCreateLeadDraft({
        ...defaultValues,
        ...values,
      } as LeadFormValues);
    });

    return () => subscription.unsubscribe();
  }, [form, lead, open]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    if (!lead) {
      clearCreateLeadDraft();
      form.reset(defaultValues);
    }
  });

  const quotationRequired = form.watch("quotationRequired");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && lead) {
          form.reset(initialValues);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Create Lead"}</DialogTitle>
          <DialogDescription>
            Capture and update lead information without changing the current UI flow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lead-full-name">Full name</Label>
              <Input id="lead-full-name" {...form.register("fullName")} />
              <p className="text-xs text-destructive">{form.formState.errors.fullName?.message}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <div className="flex gap-2">
                <CountryCodeSelect
                  value={form.watch("phoneCountryCode")}
                  onChange={(value) =>
                    form.setValue("phoneCountryCode", value, {
                      shouldDirty: true,
                    })
                  }
                />
                <Input id="lead-phone" inputMode="tel" {...form.register("phone")} />
              </div>
              <p className="text-xs text-destructive">{form.formState.errors.phone?.message}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" {...form.register("email")} />
              <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-alt-phone">Alternate phone</Label>
              <div className="flex gap-2">
                <CountryCodeSelect
                  value={form.watch("alternatePhoneCountryCode")}
                  onChange={(value) =>
                    form.setValue("alternatePhoneCountryCode", value, {
                      shouldDirty: true,
                    })
                  }
                />
                <Input id="lead-alt-phone" inputMode="tel" {...form.register("alternatePhone")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-company">Company name</Label>
              <Input id="lead-company" {...form.register("companyName")} />
            </div>

            <div className="space-y-2">
              <Label>Lead type</Label>
              <Select
                value={form.watch("leadType")}
                onValueChange={(value) =>
                  form.setValue("leadType", value as LeadFormValues["leadType"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leadTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={form.watch("source")}
                onValueChange={(value) =>
                  form.setValue("source", value as LeadFormValues["source"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leadSourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-source-detail">Source detail</Label>
              <Input id="lead-source-detail" {...form.register("sourceDetail")} />
            </div>

            <div className="space-y-2">
              <Label>Stage</Label>
              <Select
                value={form.watch("stage")}
                onValueChange={(value) =>
                  form.setValue("stage", value as LeadFormValues["stage"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leadStageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned to</Label>
              <Select
                value={form.watch("assignedTo") || "unassigned"}
                onValueChange={(value) =>
                  form.setValue("assignedTo", value === "unassigned" ? "" : value, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-city">City</Label>
              <Input id="lead-city" {...form.register("city")} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="lead-project-location">Project location</Label>
              <Input id="lead-project-location" {...form.register("projectLocation")} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="lead-requirement">Requirement summary</Label>
              <Textarea id="lead-requirement" rows={3} {...form.register("requirementSummary")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product interest</Label>
            <Input
              id="lead-product-interest"
              placeholder="e.g. Modular kitchen, wardrobes, office furniture"
              {...form.register("productInterest")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(value) =>
                  form.setValue("priority", value as LeadFormValues["priority"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leadPriorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Showroom visit status</Label>
              <Select
                value={form.watch("showroomVisitStatus")}
                onValueChange={(value) =>
                  form.setValue(
                    "showroomVisitStatus",
                    value as LeadFormValues["showroomVisitStatus"],
                    { shouldDirty: true },
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {showroomVisitStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-showroom-date">Showroom visit date</Label>
              <Input id="lead-showroom-date" type="date" {...form.register("showroomVisitDate")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-next-follow-up">Next follow-up</Label>
              <Input
                id="lead-next-follow-up"
                type="datetime-local"
                {...form.register("nextFollowUpAt")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-budget">Budget</Label>
              <Input id="lead-budget" type="number" min="0" {...form.register("budget")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-quotation">Quotation value</Label>
              <Input
                id="lead-quotation"
                type="number"
                min="0"
                disabled={!quotationRequired}
                {...form.register("quotationValue")}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={quotationRequired}
              onChange={(event) =>
                form.setValue("quotationRequired", event.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            <span>Quotation required</span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lead-notes">Notes summary</Label>
              <Textarea id="lead-notes" rows={4} {...form.register("notesSummary")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-lost-reason">Lost reason</Label>
              <Textarea id="lead-lost-reason" rows={4} {...form.register("lostReason")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : lead ? "Save Changes" : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
