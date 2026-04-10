import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Tag,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FollowUpDialog } from "@/components/followups/FollowUpDialog";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SourceBadge } from "@/components/ui/source-badge";
import { StageBadge } from "@/components/ui/stage-badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import {
  useCompleteFollowUpMutation,
  useCreateFollowUpMutation,
  useLeadActivitiesQuery,
  useLeadDetailQuery,
  useLeadFollowUpsQuery,
  useUpdateLeadAssignmentMutation,
  useUpdateLeadMutation,
  useUpdateLeadNotesMutation,
  useUpdateLeadStageMutation,
} from "@/hooks/use-leads";
import { useUsersQuery } from "@/hooks/use-users";
import {
  followUpStatusLabels,
  leadTypeLabels,
  showroomVisitStatusLabels,
  stageLabels,
} from "@/lib/crm-config";
import type { ActivityType, FollowUpFormValues, LeadFormValues, LeadStage } from "@/types/crm";

const activityIcons: Record<ActivityType, ElementType> = {
  lead_created: User,
  lead_updated: Edit,
  stage_changed: Tag,
  assignment_changed: User,
  note_added: Edit,
  follow_up_added: Calendar,
  follow_up_completed: CheckCircle2,
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  meeting: Calendar,
};

export default function LeadDetailPage() {
  const { id } = useParams();
  const { authUser } = useAuth();
  const usersQuery = useUsersQuery();
  const users = usersQuery.data ?? [];
  const leadQuery = useLeadDetailQuery(id, users);
  const activitiesQuery = useLeadActivitiesQuery(id, users);
  const followUpsQuery = useLeadFollowUpsQuery(id, users);
  const updateLeadMutation = useUpdateLeadMutation();
  const updateStageMutation = useUpdateLeadStageMutation();
  const updateAssignmentMutation = useUpdateLeadAssignmentMutation();
  const updateNotesMutation = useUpdateLeadNotesMutation();
  const createFollowUpMutation = useCreateFollowUpMutation();
  const completeFollowUpMutation = useCompleteFollowUpMutation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const lead = leadQuery.data;
  const leadNotesSummary = lead?.notesSummary ?? "";

  useEffect(() => {
    setNotesDraft(leadNotesSummary);
  }, [leadNotesSummary]);

  const now = Date.now();
  const overdueFollowUps = useMemo(
    () =>
      (followUpsQuery.data ?? []).filter(
        (followUp) =>
          followUp.status === "scheduled" && new Date(followUp.dueAt).getTime() < now,
      ),
    [followUpsQuery.data, now],
  );
  const upcomingFollowUps = useMemo(
    () =>
      (followUpsQuery.data ?? []).filter(
        (followUp) =>
          followUp.status === "scheduled" && new Date(followUp.dueAt).getTime() >= now,
      ),
    [followUpsQuery.data, now],
  );

  const handleEditSubmit = async (values: LeadFormValues) => {
    if (!lead) {
      return;
    }

    try {
      await updateLeadMutation.mutateAsync({
        leadId: lead.id,
        values,
        actorId: authUser?.id ?? null,
        users,
      });
      toast("Lead updated", {
        description: `${values.fullName} has been updated.`,
      });
      setEditDialogOpen(false);
    } catch (error) {
      toast("Unable to update lead", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleStageChange = async (stage: string) => {
    if (!lead) {
      return;
    }

    try {
      await updateStageMutation.mutateAsync({
        leadId: lead.id,
        stage: stage as LeadStage,
        actorId: authUser?.id ?? null,
      });
      toast("Stage updated", {
        description: `${lead.fullName} moved to ${stageLabels[stage as LeadStage]}.`,
      });
    } catch (error) {
      toast("Unable to update stage", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleAssignmentChange = async (assignedTo: string) => {
    if (!lead) {
      return;
    }

    try {
      await updateAssignmentMutation.mutateAsync({
        leadId: lead.id,
        assignedTo: assignedTo === "unassigned" ? null : assignedTo,
        actorId: authUser?.id ?? null,
      });
      toast("Assignment updated", {
        description: "Lead ownership has been updated.",
      });
    } catch (error) {
      toast("Unable to update assignment", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleNotesSave = async () => {
    if (!lead) {
      return;
    }

    try {
      await updateNotesMutation.mutateAsync({
        leadId: lead.id,
        notesSummary: notesDraft,
        actorId: authUser?.id ?? null,
      });
      toast("Notes updated", {
        description: "Lead notes were saved successfully.",
      });
    } catch (error) {
      toast("Unable to save notes", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleCreateFollowUp = async (values: FollowUpFormValues) => {
    if (!lead) {
      return;
    }

    try {
      await createFollowUpMutation.mutateAsync({
        leadId: lead.id,
        values,
        actorId: authUser?.id ?? null,
        users,
      });
      toast("Follow-up scheduled", {
        description: `Follow-up added for ${new Date(values.dueAt).toLocaleString()}.`,
      });
      setFollowUpDialogOpen(false);
    } catch (error) {
      toast("Unable to schedule follow-up", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    if (!lead) {
      return;
    }

    try {
      await completeFollowUpMutation.mutateAsync({
        followUpId,
        leadId: lead.id,
        actorId: authUser?.id ?? null,
      });
      toast("Follow-up completed", {
        description: "The follow-up has been marked complete.",
      });
    } catch (error) {
      toast("Unable to complete follow-up", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  if (leadQuery.isLoading) {
    return <div className="min-h-[400px] py-16 text-center text-muted-foreground">Loading lead...</div>;
  }

  if (leadQuery.isError || !lead) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">Lead not found</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            The lead could not be loaded from Supabase.
          </p>
          <Button asChild>
            <Link to="/leads">Back to Leads</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/leads">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                {lead.fullName
                  .split(" ")
                  .map((segment) => segment[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{lead.fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StageBadge stage={lead.stage} />
                <SourceBadge source={lead.source} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="text-green-600">
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{lead.email || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{lead.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lead Type</p>
                    <p className="text-sm font-medium">{leadTypeLabels[lead.leadType]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="text-sm font-medium">{lead.companyName || "Not specified"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-sm font-medium">
                      {lead.budget ? `Rs. ${lead.budget.toLocaleString()}` : "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {new Date(lead.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Product Interest</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {lead.productInterest ? (
                        <Badge variant="secondary" className="text-xs">
                          {lead.productInterest}
                        </Badge>
                      ) : (
                        <span className="text-sm font-medium">No product selected</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Showroom Visit</p>
                    <p className="text-sm font-medium">
                      {showroomVisitStatusLabels[lead.showroomVisitStatus]}
                      {lead.showroomVisitDate
                        ? ` - ${new Date(lead.showroomVisitDate).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
              <CardDescription>Recent interactions stored in Supabase</CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesQuery.isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Loading activity history...
                </p>
              ) : activitiesQuery.data && activitiesQuery.data.length > 0 ? (
                <div className="space-y-4">
                  {activitiesQuery.data.map((activity, index) => {
                    const Icon = activityIcons[activity.type] ?? Edit;

                    return (
                      <div key={activity.id} className="flex gap-4">
                        <div className="relative">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          {index < activitiesQuery.data.length - 1 && (
                            <div className="absolute left-1/2 top-8 h-8 w-px -translate-x-1/2 bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm">{activity.description}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {activity.createdByUser?.fullName ?? "System"} -{" "}
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No activities recorded yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lead.notesSummary && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm">{lead.notesSummary}</p>
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Textarea
                    placeholder="Add or update the lead summary..."
                    className="min-h-[100px]"
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                  />
                  <Button
                    size="icon"
                    className="shrink-0 self-end sm:self-auto"
                    onClick={handleNotesSave}
                    disabled={updateNotesMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Stage</label>
                <Select value={lead.stage} onValueChange={handleStageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(stageLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Assigned To</label>
                <Select
                  value={lead.assignedTo ?? "unassigned"}
                  onValueChange={handleAssignmentChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users
                      .filter((user) => user.isActive)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <Button className="w-full gap-2" onClick={() => setFollowUpDialogOpen(true)}>
                <Calendar className="h-4 w-4" />
                Schedule Follow-up
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Follow-ups</CardTitle>
                <CardDescription>
                  {overdueFollowUps.length} overdue - {upcomingFollowUps.length} upcoming
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setFollowUpDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {followUpsQuery.isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Loading follow-ups...
                </p>
              ) : (followUpsQuery.data ?? []).length > 0 ? (
                (followUpsQuery.data ?? []).map((followUp) => {
                  const isOverdue =
                    followUp.status === "scheduled" &&
                    new Date(followUp.dueAt).getTime() < Date.now();

                  return (
                    <div key={followUp.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={isOverdue ? "destructive" : "secondary"}>
                              {followUpStatusLabels[followUp.status]}
                            </Badge>
                            {followUp.assignedUser && (
                              <span className="text-xs text-muted-foreground">
                                {followUp.assignedUser.fullName}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium">
                            {new Date(followUp.dueAt).toLocaleString()}
                          </p>
                          {followUp.note && (
                            <p className="mt-1 text-sm text-muted-foreground">{followUp.note}</p>
                          )}
                        </div>
                        {followUp.status === "scheduled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => void handleCompleteFollowUp(followUp.id)}
                            disabled={completeFollowUpMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No follow-ups scheduled yet.
                </p>
              )}
            </CardContent>
          </Card>

          {lead.assignedUser && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Representative</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {lead.assignedUser.fullName
                        .split(" ")
                        .map((segment) => segment[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{lead.assignedUser.fullName}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {lead.assignedUser.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Project Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Project location</p>
                <p className="text-sm font-medium">{lead.projectLocation || "Not specified"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">City</p>
                <p className="text-sm font-medium">{lead.city || "Not specified"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Requirement summary</p>
                <p className="text-sm font-medium">
                  {lead.requirementSummary || "No requirement summary added yet."}
                </p>
              </div>
              {lead.quotationRequired && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Quotation value</p>
                  <p className="text-sm font-medium">
                    {lead.quotationValue
                      ? `Rs. ${lead.quotationValue.toLocaleString()}`
                      : "Quotation requested"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <LeadFormDialog
        lead={lead}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        users={users}
        isSubmitting={updateLeadMutation.isPending}
        onSubmit={handleEditSubmit}
      />

      <FollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        users={users}
        defaultAssignedTo={lead.assignedTo}
        isSubmitting={createFollowUpMutation.isPending}
        onSubmit={handleCreateFollowUp}
      />
    </motion.div>
  );
}
