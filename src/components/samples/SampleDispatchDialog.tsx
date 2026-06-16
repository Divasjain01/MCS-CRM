import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Link2, Plus, Trash2, UserRoundX } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
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

const SAMPLE_DISPATCH_DRAFT_KEY = "sample-dispatch-draft-v2";

const sampleItemSchema = z.object({
  materialName: z.string().trim().min(2, "Sample or catalogue name is required."),
  quantity: z
    .string()
    .trim()
    .min(1, "Quantity is required.")
    .refine((value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0;
    }, "Quantity must be at least 1."),
});

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
  amountCollected: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) {
        return true;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0;
    }, "Amount collected must be a valid number."),
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
  sampleItems: z.array(sampleItemSchema).min(1, "Add at least one sample item."),
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
  amountCollected: "",
  remarks: "",
  assignedTo: forcedAssignedTo ?? "",
  dispatchMethod: "handed_over",
  returnStatus: "with_customer",
  sampleItems: [{ materialName: "", quantity: "1" }],
});

const normalizeDraftValues = (
  values: Partial<SampleDispatchFormValues>,
  forcedAssignedTo?: string | null,
): SampleDispatchFormValues => {
  const defaults = createDefaultValues(forcedAssignedTo);
  const sampleItems =
    values.sampleItems && values.sampleItems.length > 0
      ? values.sampleItems.map((item) => ({
          materialName: item.materialName ?? "",
          quantity: item.quantity ?? "1",
        }))
      : defaults.sampleItems;

  return {
    ...defaults,
    ...values,
    assignedTo: forcedAssignedTo ?? values.assignedTo ?? defaults.assignedTo,
    sampleItems,
  };
};

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
  const form = useForm<SampleDispatchFormValues>({
    resolver: zodResolver(sampleDispatchSchema),
    defaultValues: createDefaultValues(forcedAssignedTo),
  });

  const {
    fields: sampleItemFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "sampleItems",
  });

  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const deferredSearchText = useDeferredValue(customerSearchText);
  const suggestionsQuery = useSampleCustomerSuggestionsQuery(deferredSearchText);
  const selectedLeadId = form.watch("leadId");

  const selectedSuggestion = useMemo(
    () => (suggestionsQuery.data ?? []).find((item) => item.leadId === selectedLeadId) ?? null,
    [selectedLeadId, suggestionsQuery.data],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextValues = (() => {
      if (dispatch) {
        const baseValues = mapSampleDispatchToFormValues(dispatch);
        if (assignmentLocked && forcedAssignedTo) {
          return {
            ...baseValues,
            assignedTo: forcedAssignedTo,
          };
        }

        return baseValues;
      }

      if (typeof window !== "undefined") {
        const storedDraft = window.localStorage.getItem(SAMPLE_DISPATCH_DRAFT_KEY);
        if (storedDraft) {
          try {
            return normalizeDraftValues(
              JSON.parse(storedDraft) as Partial<SampleDispatchFormValues>,
              forcedAssignedTo,
            );
          } catch {
            window.localStorage.removeItem(SAMPLE_DISPATCH_DRAFT_KEY);
          }
        }
      }

      return createDefaultValues(forcedAssignedTo);
    })();

    form.reset(nextValues);
    setCustomerSearchText(nextValues.customerName);
    setCustomerSearchOpen(false);
  }, [assignmentLocked, dispatch, forcedAssignedTo, form, open]);

  useEffect(() => {
    if (!open || dispatch) {
      return;
    }

    const subscription = form.watch((value) => {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(
        SAMPLE_DISPATCH_DRAFT_KEY,
        JSON.stringify(normalizeDraftValues(value as Partial<SampleDispatchFormValues>, forcedAssignedTo)),
      );
    });

    return () => subscription.unsubscribe();
  }, [dispatch, forcedAssignedTo, form, open]);

  const applySuggestion = (suggestion: CustomerSuggestion) => {
    form.setValue("leadId", suggestion.leadId, { shouldDirty: true });
    form.setValue("enquiryReference", suggestion.enquiryReference ?? "", { shouldDirty: true });
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
    setCustomerSearchText(form.getValues("customerName"));
  };

  const clearDraft = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SAMPLE_DISPATCH_DRAFT_KEY);
    }

    const defaults = createDefaultValues(forcedAssignedTo);
    form.reset(defaults);
    setCustomerSearchText("");
    setCustomerSearchOpen(false);
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

    if (!dispatch && typeof window !== "undefined") {
      window.localStorage.removeItem(SAMPLE_DISPATCH_DRAFT_KEY);
    }
  });

  const searchButtonLabel =
    selectedSuggestion?.customerName ||
    customerSearchText ||
    "Search existing customer, phone, or company";

  const enquiryReferenceValue = form.watch("enquiryReference");

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
                  Search the current CRM first to reuse customer details. If no enquiry reference
                  exists, you can type it manually below. Even when a reference is found, you can
                  still change it for this sample dispatch.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!dispatch ? (
                  <Button type="button" variant="ghost" size="sm" onClick={clearDraft}>
                    Clear Draft
                  </Button>
                ) : null}
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
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
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
                              {suggestion.enquiryReference ? (
                                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                  {suggestion.enquiryReference}
                                </p>
                              ) : (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  No saved enquiry reference
                                </p>
                              )}
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
                  Enquiry Reference Status
                </p>
                <p className="mt-1 text-sm font-medium">
                  {enquiryReferenceValue ? enquiryReferenceValue : "No linked reference, add manually"}
                </p>
              </div>
            </div>

            {selectedSuggestion ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                <Link2 className="h-3.5 w-3.5" />
                Linked to existing CRM customer record for {selectedSuggestion.customerName}. The
                enquiry reference below stays editable for this dispatch.
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sample-enquiry-reference">Enquiry reference number</Label>
              <Input
                id="sample-enquiry-reference"
                placeholder="Enter manually if applicable"
                {...form.register("enquiryReference")}
              />
              <p className="text-xs text-muted-foreground">
                This can be different from the linked customer&apos;s enquiry reference for this
                particular sample issue.
              </p>
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
              <Label htmlFor="sample-amount-collected">Amount collected</Label>
              <Input
                id="sample-amount-collected"
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                {...form.register("amountCollected")}
              />
              <p className="text-xs text-destructive">
                {form.formState.errors.amountCollected?.message}
              </p>
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
          </div>

          <div className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Samples / Catalogues</h3>
                <p className="text-xs text-muted-foreground">
                  Add one or more issued items with their respective quantities.
                </p>
              </div>
              {!dispatch ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => append({ materialName: "", quantity: "1" })}
                >
                  <Plus className="h-4 w-4" />
                  Add Sample
                </Button>
              ) : null}
            </div>

            <div className="space-y-3">
              {sampleItemFields.map((field, index) => (
                <div key={field.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
                  <div className="space-y-2">
                    <Label htmlFor={`sample-item-name-${field.id}`}>
                      Sample / catalogue name {sampleItemFields.length > 1 ? index + 1 : ""}
                    </Label>
                    <Input
                      id={`sample-item-name-${field.id}`}
                      {...form.register(`sampleItems.${index}.materialName`)}
                    />
                    <p className="text-xs text-destructive">
                      {form.formState.errors.sampleItems?.[index]?.materialName?.message}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`sample-item-quantity-${field.id}`}>Quantity issued</Label>
                    <Input
                      id={`sample-item-quantity-${field.id}`}
                      type="number"
                      min="1"
                      {...form.register(`sampleItems.${index}.quantity`)}
                    />
                    <p className="text-xs text-destructive">
                      {form.formState.errors.sampleItems?.[index]?.quantity?.message}
                    </p>
                  </div>

                  <div className="flex items-end">
                    {!dispatch && sampleItemFields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        aria-label={`Remove sample item ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample-remarks">Remarks or notes</Label>
            <Textarea
              id="sample-remarks"
              rows={4}
              placeholder={`Examples: ${sampleReturnStatusLabels[form.watch("returnStatus")].toLowerCase()} status notes, courier details, finish comments`}
              {...form.register("remarks")}
            />
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
