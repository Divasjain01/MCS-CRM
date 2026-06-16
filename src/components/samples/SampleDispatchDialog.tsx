import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Link2, UserRoundX } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSampleCustomerSuggestionsQuery } from "@/hooks/use-sample-tracking";
import {
  sampleDispatchMethodOptions,
  sampleReturnStatusLabels,
  sampleReturnStatusOptions,
} from "@/lib/crm-config";
import { mapSampleDispatchToFormValues } from "@/lib/crm-mappers";
import { isValidLeadPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { buildSampleEnquiryReference } from "@/services/sample-tracking";
import type {
  CustomerSuggestion,
  SampleDispatch,
  SampleDispatchFormValues,
  UserSummary,
} from "@/types/crm";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const sampleDispatchSchema = z.object({
  leadId: z.string(),
  enquiryReference: z.string(),
  customerName: z.string().trim().min(2, "Customer name is required."),
  customerPhone: z
    .string()
    .trim()
    .min(8, "Customer phone is required.")
    .refine((value) => isValidLeadPhone(value), {
      message: "Enter a valid phone number. Indian numbers can be entered without +91.",
    }),
  companyName: z.string(),
  issuedAt: z.string().min(1, "Issue date and time is required."),
  expectedReturnAt: z.string(),
  actualReturnedAt: z.string(),
  materialName: z.string().trim().min(2, "Sample or catalogue name is required."),
  quantity: z
    .string()
    .trim()
    .min(1, "Quantity is required.")
    .refine((value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0;
    }, "Quantity must be at least 1."),
  category: z.string(),
  remarks: z.string(),
  assignedTo: z.string(),
  dispatchMethod: z.enum(["handed_over", "courier", "pickup", "showroom_visit", "other"]),
  returnStatus: z.enum([
    "with_customer",
    "awaiting_return",
    "returned",
    "consumed",
    "lost",
    "completed",
  ]),
});

const createDefaultValues = (forcedAssignedTo?: string | null): SampleDispatchFormValues => ({
  leadId: "",
  enquiryReference: "",
  customerName: "",
  customerPhone: "",
  companyName: "",
  issuedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16),
  expectedReturnAt: "",
  actualReturnedAt: "",
  materialName: "",
  quantity: "1",
  category: "",
  remarks: "",
  assignedTo: forcedAssignedTo ?? "",
  dispatchMethod: "handed_over",
  returnStatus: "with_customer",
});

interface SampleDispatchDialogProps {
  dispatch?: SampleDispatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignableUsers: UserSummary[];
  assignmentLocked?: boolean;
  forcedAssignedTo?: string | null;
  isSubmitting?: boolean;
  onSubmit: (values: SampleDispatchFormValues) => Promise<void>;
}

export function SampleDispatchDialog({
  dispatch,
  open,
  onOpenChange,
  assignableUsers,
  assignmentLocked = false,
  forcedAssignedTo,
  isSubmitting = false,
  onSubmit,
}: SampleDispatchDialogProps) {
  const initialValues = useMemo(() => {
    const baseValues = dispatch
      ? mapSampleDispatchToFormValues(dispatch)
      : createDefaultValues(forcedAssignedTo);

    if (assignmentLocked && forcedAssignedTo) {
      return {
        ...baseValues,
        assignedTo: forcedAssignedTo,
      };
    }

    return baseValues;
  }, [assignmentLocked, dispatch, forcedAssignedTo]);

  const form = useForm<SampleDispatchFormValues>({
    resolver: zodResolver(sampleDispatchSchema),
    defaultValues: initialValues,
  });

  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const deferredSearchText = useDeferredValue(customerSearchText);
  const suggestionsQuery = useSampleCustomerSuggestionsQuery(deferredSearchText);
  const selectedLeadId = form.watch("leadId");

  const selectedSuggestion = useMemo(() => {
    const matchedSuggestion =
      (suggestionsQuery.data ?? []).find((item) => item.leadId === selectedLeadId) ?? null;

    if (matchedSuggestion) {
      return matchedSuggestion;
    }

    if (!selectedLeadId) {
      return null;
    }

    const customerName = form.getValues("customerName");
    const customerPhone = form.getValues("customerPhone");

    if (!customerName || !customerPhone) {
      return null;
    }

    return {
      leadId: selectedLeadId,
      enquiryReference:
        form.getValues("enquiryReference") || buildSampleEnquiryReference(selectedLeadId),
      customerName,
      customerPhone,
      companyName: form.getValues("companyName") || null,
      assignedTo: form.getValues("assignedTo") || null,
    };
  }, [form, selectedLeadId, suggestionsQuery.data]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const baseValues = dispatch
      ? mapSampleDispatchToFormValues(dispatch)
      : createDefaultValues(forcedAssignedTo);

    form.reset(
      assignmentLocked && forcedAssignedTo
        ? {
            ...baseValues,
            assignedTo: forcedAssignedTo,
          }
        : baseValues,
    );
    setCustomerSearchText("");
    setCustomerSearchOpen(false);
  }, [assignmentLocked, dispatch, forcedAssignedTo, form, open]);

  const applySuggestion = (suggestion: CustomerSuggestion) => {
    form.setValue("leadId", suggestion.leadId, { shouldDirty: true });
    form.setValue("enquiryReference", suggestion.enquiryReference, { shouldDirty: true });
    form.setValue("customerName", suggestion.customerName, { shouldDirty: true });
    form.setValue("customerPhone", suggestion.customerPhone, { shouldDirty: true });
    form.setValue("companyName", suggestion.companyName ?? "", { shouldDirty: true });

    if (!assignmentLocked && suggestion.assignedTo) {
      form.setValue("assignedTo", suggestion.assignedTo, { shouldDirty: true });
    }

    setCustomerSearchText(suggestion.customerName);
    setCustomerSearchOpen(false);
  };

  const clearLinkedCustomer = () => {
    form.setValue("leadId", "", { shouldDirty: true });
    form.setValue("enquiryReference", "", { shouldDirty: true });
    setCustomerSearchText("");
  };

  const submit = form.handleSubmit(async (values) => {
    const nextValues =
      assignmentLocked && forcedAssignedTo
        ? {
            ...values,
            assignedTo: forcedAssignedTo,
          }
        : values;

    await onSubmit(nextValues);
  });

  const searchButtonLabel =
    selectedSuggestion?.customerName ||
    customerSearchText ||
    "Search existing customer, phone, or company";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{dispatch ? "Edit Sample Dispatch" : "New Sample Dispatch"}</DialogTitle>
          <DialogDescription>
            Track physical samples, catalogues, swatches, and brochures issued from the CRM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Link Existing Customer or Enquiry</h3>
                <p className="text-xs text-muted-foreground">
                  Search the current CRM first to reuse customer and lead details.
                </p>
              </div>
              {selectedLeadId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={clearLinkedCustomer}
                >
                  <UserRoundX className="h-4 w-4" />
                  Clear Link
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="justify-between overflow-hidden"
                  >
                    <span className="truncate text-left">{searchButtonLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      value={customerSearchText}
                      onValueChange={setCustomerSearchText}
                      placeholder="Search by name, phone, company..."
                    />
                    <CommandList>
                      <CommandEmpty>
                        {deferredSearchText.trim().length < 2
                          ? "Type at least 2 characters to search."
                          : suggestionsQuery.isLoading
                            ? "Searching CRM..."
                            : "No matching customer found. You can continue as a new record."}
                      </CommandEmpty>
                      <CommandGroup heading="Existing CRM Matches">
                        {(suggestionsQuery.data ?? []).map((suggestion) => (
                          <CommandItem
                            key={suggestion.leadId}
                            value={suggestion.leadId}
                            onSelect={() => applySuggestion(suggestion)}
                            className="items-start gap-3 py-3"
                          >
                            <Check
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                selectedLeadId === suggestion.leadId
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{suggestion.customerName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {suggestion.customerPhone}
                                {suggestion.companyName ? ` - ${suggestion.companyName}` : ""}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                {suggestion.enquiryReference}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Enquiry Reference
                </p>
                <p className="mt-1 text-sm font-medium">
                  {form.watch("enquiryReference") ||
                    buildSampleEnquiryReference(form.watch("leadId")) ||
                    "Manual entry"}
                </p>
              </div>
            </div>

            {selectedSuggestion ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                <Link2 className="h-3.5 w-3.5" />
                Linked to existing CRM lead for {selectedSuggestion.customerName}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sample-enquiry-reference">Enquiry reference number</Label>
              <Input id="sample-enquiry-reference" {...form.register("enquiryReference")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample-issued-at">Date issued</Label>
              <Input id="sample-issued-at" type="datetime-local" {...form.register("issuedAt")} />
              <p className="text-xs text-destructive">
                {form.formState.errors.issuedAt?.message}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample-customer-name">Customer name</Label>
              <Input id="sample-customer-name" {...form.register("customerName")} />
              <p className="text-xs text-destructive">
                {form.formState.errors.customerName?.message}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample-customer-phone">Customer phone number</Label>
              <Input id="sample-customer-phone" {...form.register("customerPhone")} />
              <p className="text-xs text-destructive">
                {form.formState.errors.customerPhone?.message}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample-company-name">Company / firm name</Label>
              <Input id="sample-company-name" {...form.register("companyName")} />
            </div>
            <div className="space-y-2">
              <Label>Assigned staff member</Label>
              <Select
                disabled={assignmentLocked}
                value={form.watch("assignedTo") || "unassigned"}
                onValueChange={(value) =>
                  form.setValue("assignedTo", value === "unassigned" ? "" : value, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {!assignmentLocked ? <SelectItem value="unassigned">Unassigned</SelectItem> : null}
                  {assignableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample-material-name">Sample / catalogue name</Label>
              <Input id="sample-material-name" {...form.register("materialName")} />
              <p className="text-xs text-destructive">
                {form.formState.errors.materialName?.message}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample-quantity">Quantity issued</Label>
              <Input id="sample-quantity" type="number" min="1" {...form.register("quantity")} />
              <p className="text-xs text-destructive">
                {form.formState.errors.quantity?.message}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample-category">Category or type</Label>
              <Input
                id="sample-category"
                placeholder="e.g. Swatch, brochure, finish board"
                {...form.register("category")}
              />
            </div>
            <div className="space-y-2">
              <Label>Dispatch method</Label>
              <Select
                value={form.watch("dispatchMethod")}
                onValueChange={(value) =>
                  form.setValue("dispatchMethod", value as SampleDispatchFormValues["dispatchMethod"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sampleDispatchMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Return status</Label>
              <Select
                value={form.watch("returnStatus")}
                onValueChange={(value) =>
                  form.setValue("returnStatus", value as SampleDispatchFormValues["returnStatus"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sampleReturnStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample-expected-return">Expected return date</Label>
              <Input
                id="sample-expected-return"
                type="datetime-local"
                {...form.register("expectedReturnAt")}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sample-actual-return">Actual returned date</Label>
              <Input
                id="sample-actual-return"
                type="datetime-local"
                {...form.register("actualReturnedAt")}
              />
              <p className="text-xs text-muted-foreground">
                Use this when the material is returned, consumed, or fully closed out.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sample-remarks">Remarks or notes</Label>
              <Textarea
                id="sample-remarks"
                rows={4}
                placeholder={`Examples: ${sampleReturnStatusLabels[form.watch("returnStatus")].toLowerCase()} status notes, courier details, finish comments`}
                {...form.register("remarks")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : dispatch ? "Save Changes" : "Create Dispatch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
