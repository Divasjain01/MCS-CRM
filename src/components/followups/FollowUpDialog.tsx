import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FollowUpFormValues, UserSummary } from "@/types/crm";

const followUpSchema = z.object({
  dueAt: z.string().min(1, "Select a due date and time."),
  note: z.string(),
  assignedTo: z.string(),
});

const defaultValues: FollowUpFormValues = {
  dueAt: "",
  note: "",
  assignedTo: "",
};

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignableUsers: UserSummary[];
  defaultAssignedTo?: string | null;
  isSubmitting?: boolean;
  onSubmit: (values: FollowUpFormValues) => Promise<void>;
}

export function FollowUpDialog({
  open,
  onOpenChange,
  assignableUsers,
  defaultAssignedTo,
  isSubmitting = false,
  onSubmit,
}: FollowUpDialogProps) {
  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...defaultValues,
        assignedTo: defaultAssignedTo ?? "",
      });
    }
  }, [defaultAssignedTo, form, open]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset(defaultValues);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Follow-up</DialogTitle>
          <DialogDescription>
            Add a real follow-up entry that appears in the dashboard and activity timeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="follow-up-due-at">Due date & time</Label>
            <Input id="follow-up-due-at" type="datetime-local" {...form.register("dueAt")} />
            <p className="text-xs text-destructive">{form.formState.errors.dueAt?.message}</p>
          </div>

          <div className="space-y-2">
            <Label>Assign to</Label>
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
            <Label htmlFor="follow-up-note">Note</Label>
            <Textarea id="follow-up-note" rows={4} {...form.register("note")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
