import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Download,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SourceBadge } from "@/components/ui/source-badge";
import { StageBadge } from "@/components/ui/stage-badge";
import {
  LEAD_CREATE_DIALOG_OPEN_KEY,
  LeadFormDialog,
} from "@/components/leads/LeadFormDialog";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import {
  useCreateLeadMutation,
  useLeadsQuery,
  useUpdateLeadMutation,
} from "@/hooks/use-leads";
import { useUsersQuery } from "@/hooks/use-users";
import { downloadCsv } from "@/lib/csv";
import { getAssignableUsers } from "@/lib/access-control";
import {
  leadSourceOptions,
  leadStageOptions,
  leadTypeLabels,
  leadTypeOptions,
  stageLabels,
} from "@/lib/crm-config";
import { exportLeadsToCsv } from "@/services/leads";
import type { Lead, LeadFormValues, UserRole } from "@/types/crm";

const formatLeadValue = (lead: Lead) => {
  const value = lead.quotationValue ?? lead.budget;

  if (value == null) {
    return "—";
  }

  return `Rs. ${value.toLocaleString("en-IN")}`;
};

export default function LeadsPage() {
  const { authUser, profile } = useAuth();
  const usersQuery = useUsersQuery();
  const users = usersQuery.data ?? [];
  const actorRole = (profile?.role as UserRole | undefined) ?? null;
  const assignableUsers = useMemo(
    () => getAssignableUsers(users, actorRole ?? undefined),
    [actorRole, users],
  );
  const leadsQuery = useLeadsQuery(users);
  const createLeadMutation = useCreateLeadMutation();
  const updateLeadMutation = useUpdateLeadMutation();
  const assigneeFilterUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.isActive &&
          (user.role === "sales" || user.role === "furniture_specialist"),
      ),
    [users],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string>("all");
  const [selectedLeadType, setSelectedLeadType] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Lead>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dialogOpen, setDialogOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(LEAD_CREATE_DIALOG_OPEN_KEY) === "true";
  });
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (dialogOpen && !editingLead) {
      window.sessionStorage.setItem(LEAD_CREATE_DIALOG_OPEN_KEY, "true");
      return;
    }

    window.sessionStorage.removeItem(LEAD_CREATE_DIALOG_OPEN_KEY);
  }, [dialogOpen, editingLead]);

  const filteredLeads = useMemo(
    () =>
      (leadsQuery.data ?? []).filter((lead) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          lead.fullName.toLowerCase().includes(query) ||
          (lead.email ?? "").toLowerCase().includes(query) ||
          lead.phone.includes(searchQuery) ||
          (lead.companyName ?? "").toLowerCase().includes(query);
        const matchesStage = selectedStage === "all" || lead.stage === selectedStage;
        const matchesSource = selectedSource === "all" || lead.source === selectedSource;
        const matchesAssignedTo =
          selectedAssignedTo === "all" || lead.assignedTo === selectedAssignedTo;
        const matchesLeadType =
          selectedLeadType === "all" || lead.leadType === selectedLeadType;
        return (
          matchesSearch &&
          matchesStage &&
          matchesSource &&
          matchesAssignedTo &&
          matchesLeadType
        );
      }),
    [
      leadsQuery.data,
      searchQuery,
      selectedAssignedTo,
      selectedLeadType,
      selectedSource,
      selectedStage,
    ],
  );

  const sortedLeads = useMemo(() => {
    const nextLeads = [...filteredLeads];

    nextLeads.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        const maybeDateA = Date.parse(aValue);
        const maybeDateB = Date.parse(bValue);

        if (!Number.isNaN(maybeDateA) && !Number.isNaN(maybeDateB)) {
          return sortDirection === "asc" ? maybeDateA - maybeDateB : maybeDateB - maybeDateA;
        }

        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return nextLeads;
  }, [filteredLeads, sortDirection, sortField]);

  const toggleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === sortedLeads.length) {
      setSelectedLeads([]);
      return;
    }

    setSelectedLeads(sortedLeads.map((lead) => lead.id));
  };

  const toggleSelectLead = (leadId: string) => {
    setSelectedLeads((previous) =>
      previous.includes(leadId)
        ? previous.filter((value) => value !== leadId)
        : [...previous, leadId],
    );
  };

  const openCreateDialog = () => {
    setEditingLead(null);
    setDialogOpen(true);
  };

  const openEditDialog = (lead: Lead) => {
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: LeadFormValues) => {
    try {
      if (editingLead) {
        await updateLeadMutation.mutateAsync({
          leadId: editingLead.id,
          values,
          actorId: authUser?.id ?? null,
          actorRole,
          users,
        });
        toast("Lead updated", {
          description: `${values.fullName} has been updated successfully.`,
        });
      } else {
        await createLeadMutation.mutateAsync({
          values,
          actorId: authUser?.id ?? null,
          actorRole,
          users,
        });
        toast("Lead created", {
          description: `${values.fullName} has been added to the CRM.`,
        });
      }

      setDialogOpen(false);
      setEditingLead(null);
    } catch (error) {
      toast("Unable to save lead", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleExport = () => {
    const content = exportLeadsToCsv(sortedLeads);
    downloadCsv(`mcube-leads-${new Date().toISOString().slice(0, 10)}.csv`, content);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">{filteredLeads.length} total leads</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExport}
            disabled={sortedLeads.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full min-w-[240px] lg:w-[320px] xl:w-[360px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company, or phone..."
            className="pl-10"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <Select value={selectedAssignedTo} onValueChange={setSelectedAssignedTo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {assigneeFilterUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedLeadType} onValueChange={setSelectedLeadType}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All Lead Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lead Types</SelectItem>
            {leadTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStage} onValueChange={setSelectedStage}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {leadStageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSource} onValueChange={setSelectedSource}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {leadSourceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedLeads.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5">
            <span className="text-sm font-medium text-primary">{selectedLeads.length} selected</span>
            <Button variant="ghost" size="sm" className="h-7 text-primary">
              Assign
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-primary">
              Move Stage
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <Checkbox
                    checked={selectedLeads.length === sortedLeads.length && sortedLeads.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="min-w-[220px]">
                  <button
                    onClick={() => toggleSort("fullName")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Lead
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="min-w-[120px]">Type</th>
                <th className="min-w-[130px]">Source</th>
                <th className="min-w-[140px]">Stage</th>
                <th className="min-w-[150px]">Assigned To</th>
                <th className="min-w-[130px]">Value</th>
                <th className="min-w-[120px]">
                  <button
                    onClick={() => toggleSort("createdAt")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Created
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="min-w-[120px]">
                  <button
                    onClick={() => toggleSort("updatedAt")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Updated
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {leadsQuery.isLoading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground">
                    Loading leads...
                  </td>
                </tr>
              ) : leadsQuery.isError ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-destructive">
                    Unable to load leads. Check the Supabase schema and permissions.
                  </td>
                </tr>
              ) : sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground">
                    No leads match the current filters.
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => (
                  <tr key={lead.id} className="group">
                    <td>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => toggleSelectLead(lead.id)}
                      />
                    </td>
                    <td>
                      <Link to={`/leads/${lead.id}`} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {lead.fullName
                              .split(" ")
                              .map((segment) => segment[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium transition-colors hover:text-primary">
                            {lead.fullName}
                          </p>
                          {lead.source === "referral" && lead.sourceDetail ? (
                            <p className="text-xs text-muted-foreground">
                              Referral: {lead.sourceDetail}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            {lead.companyName || lead.phone}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className="text-sm">{leadTypeLabels[lead.leadType]}</span>
                    </td>
                    <td>
                      <SourceBadge source={lead.source} />
                    </td>
                    <td>
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td>
                      {lead.assignedUser ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-muted text-[10px]">
                              {lead.assignedUser.fullName
                                .split(" ")
                                .map((segment) => segment[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{lead.assignedUser.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm text-foreground">{formatLeadValue(lead)}</span>
                    </td>
                    <td>
                      <span className="text-sm text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-muted-foreground">
                        {new Date(lead.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Phone className="mr-2 h-4 w-4" />
                            Call
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to={`/leads/${lead.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(lead)}>
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadFormDialog
        lead={editingLead}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingLead(null);
          }
        }}
        assignableUsers={assignableUsers}
        isSubmitting={createLeadMutation.isPending || updateLeadMutation.isPending}
        onSubmit={handleSubmit}
      />
    </motion.div>
  );
}
