import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  PackageOpen,
  Plus,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";
import { SampleDispatchDialog } from "@/components/samples/SampleDispatchDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import {
  useCreateSampleDispatchMutation,
  useSampleDispatchActivitiesQuery,
  useSampleDispatchesQuery,
  useUpdateSampleDispatchMutation,
} from "@/hooks/use-sample-tracking";
import { useUsersQuery } from "@/hooks/use-users";
import { getAssignableUsers } from "@/lib/access-control";
import {
  sampleDispatchMethodLabels,
  sampleDispatchMethodOptions,
  sampleReturnStatusLabels,
  sampleReturnStatusOptions,
} from "@/lib/crm-config";
import { isSampleDispatchOverdue } from "@/services/sample-tracking";
import type {
  SampleDispatch,
  SampleDispatchFormValues,
  SampleReturnStatus,
  UserRole,
  UserSummary,
} from "@/types/crm";

const quickFilterOptions = [
  { value: "all", label: "All Records" },
  { value: "with_customer", label: "Currently With Customer" },
  { value: "awaiting_return", label: "Awaiting Return" },
  { value: "returned", label: "Returned" },
  { value: "lost", label: "Lost" },
  { value: "overdue", label: "Overdue" },
  { value: "recent", label: "Recently Issued" },
] as const;

type QuickFilter = (typeof quickFilterOptions)[number]["value"];

const EMPTY_USERS: UserSummary[] = [];
const EMPTY_DISPATCHES: SampleDispatch[] = [];

const returnStatusBadgeClasses: Record<SampleReturnStatus, string> = {
  with_customer: "border-amber-200 bg-amber-50 text-amber-700",
  awaiting_return: "border-sky-200 bg-sky-50 text-sky-700",
  returned: "border-emerald-200 bg-emerald-50 text-emerald-700",
  consumed: "border-violet-200 bg-violet-50 text-violet-700",
  lost: "border-rose-200 bg-rose-50 text-rose-700",
  completed: "border-slate-200 bg-slate-100 text-slate-700",
};

const isRecentDispatch = (issuedAt: string) =>
  Date.now() - new Date(issuedAt).getTime() <= 7 * 24 * 60 * 60 * 1000;

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelativeDate = (value: string | null) => {
  if (!value) {
    return "No due date";
  }

  const diff = new Date(value).getTime() - Date.now();
  const days = Math.round(diff / (24 * 60 * 60 * 1000));

  if (days === 0) {
    return "Due today";
  }

  if (days > 0) {
    return `Due in ${days} day${days === 1 ? "" : "s"}`;
  }

  const overdueDays = Math.abs(days);
  return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
};

export default function SampleTrackingPage() {
  const { authUser, profile } = useAuth();
  const usersQuery = useUsersQuery();
  const users = usersQuery.data ?? EMPTY_USERS;
  const actorRole = (profile?.role as UserRole | undefined) ?? null;
  const assignableUsers = useMemo(
    () => getAssignableUsers(users, actorRole ?? undefined, authUser?.id ?? null),
    [actorRole, authUser?.id, users],
  );

  const dispatchesQuery = useSampleDispatchesQuery(users);
  const createDispatchMutation = useCreateSampleDispatchMutation();
  const updateDispatchMutation = useUpdateSampleDispatchMutation();
  const dispatches = dispatchesQuery.data ?? EMPTY_DISPATCHES;

  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedMethod, setSelectedMethod] = useState<string>("all");
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<"issuedAt" | "updatedAt">("issuedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState<SampleDispatch | null>(null);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);

  const filteredDispatches = useMemo(
    () =>
      dispatches.filter((dispatch) => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !normalizedQuery ||
          dispatch.enquiryReference?.toLowerCase().includes(normalizedQuery) ||
          dispatch.customerName.toLowerCase().includes(normalizedQuery) ||
          dispatch.customerPhone.includes(searchQuery.trim()) ||
          dispatch.companyName?.toLowerCase().includes(normalizedQuery) ||
          dispatch.materialName.toLowerCase().includes(normalizedQuery);

        const matchesStatus =
          selectedStatus === "all" || dispatch.returnStatus === selectedStatus;
        const matchesMethod =
          selectedMethod === "all" || dispatch.dispatchMethod === selectedMethod;
        const matchesAssignedTo =
          selectedAssignedTo === "all" || dispatch.assignedTo === selectedAssignedTo;

        const issuedAtDate = new Date(dispatch.issuedAt);
        const matchesDateFrom = !dateFrom || issuedAtDate >= new Date(`${dateFrom}T00:00:00`);
        const matchesDateTo = !dateTo || issuedAtDate <= new Date(`${dateTo}T23:59:59`);

        let matchesQuickFilter = true;
        switch (quickFilter) {
          case "with_customer":
            matchesQuickFilter = dispatch.returnStatus === "with_customer";
            break;
          case "awaiting_return":
            matchesQuickFilter = dispatch.returnStatus === "awaiting_return";
            break;
          case "returned":
            matchesQuickFilter = dispatch.returnStatus === "returned";
            break;
          case "lost":
            matchesQuickFilter = dispatch.returnStatus === "lost";
            break;
          case "overdue":
            matchesQuickFilter = isSampleDispatchOverdue(dispatch);
            break;
          case "recent":
            matchesQuickFilter = isRecentDispatch(dispatch.issuedAt);
            break;
          default:
            matchesQuickFilter = true;
        }

        return (
          matchesSearch &&
          matchesStatus &&
          matchesMethod &&
          matchesAssignedTo &&
          matchesDateFrom &&
          matchesDateTo &&
          matchesQuickFilter
        );
      }),
    [
      dateFrom,
      dateTo,
      dispatches,
      quickFilter,
      searchQuery,
      selectedAssignedTo,
      selectedMethod,
      selectedStatus,
    ],
  );

  const sortedDispatches = useMemo(() => {
    const nextDispatches = [...filteredDispatches];

    nextDispatches.sort((a, b) => {
      const aValue = new Date(sortField === "issuedAt" ? a.issuedAt : a.updatedAt).getTime();
      const bValue = new Date(sortField === "issuedAt" ? b.issuedAt : b.updatedAt).getTime();
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return nextDispatches;
  }, [filteredDispatches, sortDirection, sortField]);

  useEffect(() => {
    if (sortedDispatches.length === 0) {
      setSelectedDispatchId(null);
      return;
    }

    if (!selectedDispatchId || !sortedDispatches.some((dispatch) => dispatch.id === selectedDispatchId)) {
      setSelectedDispatchId(sortedDispatches[0].id);
    }
  }, [selectedDispatchId, sortedDispatches]);

  const selectedDispatch =
    sortedDispatches.find((dispatch) => dispatch.id === selectedDispatchId) ??
    dispatches.find((dispatch) => dispatch.id === selectedDispatchId) ??
    null;

  const activitiesQuery = useSampleDispatchActivitiesQuery(selectedDispatchId ?? undefined, users);

  const metrics = useMemo(() => {
    const totalIssued = dispatches.reduce((sum, dispatch) => sum + dispatch.quantity, 0);
    const activeWithCustomers = dispatches.filter((dispatch) =>
      ["with_customer", "awaiting_return"].includes(dispatch.returnStatus),
    ).length;
    const returned = dispatches.filter((dispatch) => dispatch.returnStatus === "returned").length;
    const overdueReturns = dispatches.filter((dispatch) => isSampleDispatchOverdue(dispatch)).length;

    const materialCounts = new Map<string, number>();
    const customerCounts = new Map<string, number>();

    dispatches.forEach((dispatch) => {
      materialCounts.set(
        dispatch.materialName,
        (materialCounts.get(dispatch.materialName) ?? 0) + dispatch.quantity,
      );
      customerCounts.set(
        dispatch.customerName,
        (customerCounts.get(dispatch.customerName) ?? 0) + dispatch.quantity,
      );
    });

    const topMaterials = [...materialCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topCustomers = [...customerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([customerName, count]) => ({ customerName, count }));

    return {
      totalIssued,
      activeWithCustomers,
      returned,
      overdueReturns,
      mostIssuedSample: topMaterials[0]?.name ?? "-",
      topMaterials,
      topCustomers,
    };
  }, [dispatches]);

  const relatedCustomerMaterials = useMemo(() => {
    if (!selectedDispatch) {
      return [];
    }

    return dispatches.filter(
      (dispatch) =>
        dispatch.id !== selectedDispatch.id &&
        dispatch.customerPhone === selectedDispatch.customerPhone &&
        ["with_customer", "awaiting_return"].includes(dispatch.returnStatus),
    );
  }, [dispatches, selectedDispatch]);

  const relatedMaterialHolders = useMemo(() => {
    if (!selectedDispatch) {
      return [];
    }

    return dispatches.filter(
      (dispatch) =>
        dispatch.id !== selectedDispatch.id &&
        dispatch.materialName.toLowerCase() === selectedDispatch.materialName.toLowerCase() &&
        ["with_customer", "awaiting_return"].includes(dispatch.returnStatus),
    );
  }, [dispatches, selectedDispatch]);

  const handleToggleSort = (field: "issuedAt" | "updatedAt") => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("desc");
  };

  const handleSubmit = async (values: SampleDispatchFormValues) => {
    try {
      if (editingDispatch) {
        const updated = await updateDispatchMutation.mutateAsync({
          dispatchId: editingDispatch.id,
          values,
          actorId: authUser?.id ?? null,
          actorRole,
          users,
        });
        toast("Dispatch updated", {
          description: `${updated.materialName} for ${updated.customerName} has been updated.`,
        });
        setSelectedDispatchId(updated.id);
      } else {
        const createdDispatches = await createDispatchMutation.mutateAsync({
          values,
          actorId: authUser?.id ?? null,
          actorRole,
          users,
        });
        const firstCreated = createdDispatches[0];
        toast("Dispatch created", {
          description:
            createdDispatches.length === 1
              ? `${firstCreated.materialName} has been issued to ${firstCreated.customerName}.`
              : `${createdDispatches.length} sample records have been issued to ${firstCreated.customerName}.`,
        });
        setSelectedDispatchId(firstCreated?.id ?? null);
      }

      setDialogOpen(false);
      setEditingDispatch(null);
    } catch (error) {
      toast("Unable to save sample dispatch", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingDispatch(null);
    setDialogOpen(true);
  };

  const openEditDialog = (dispatch: SampleDispatch) => {
    setEditingDispatch(dispatch);
    setDialogOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sample & Catalogue Tracking</h1>
          <p className="text-muted-foreground">
            Track issued materials, returns, current holders, and complete movement history.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          New Dispatch
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total Samples Issued"
          value={metrics.totalIssued}
          icon={PackageOpen}
          description="Total quantity across all dispatches"
        />
        <MetricCard
          title="Active With Customers"
          value={metrics.activeWithCustomers}
          icon={Clock3}
          description="Currently out with customers"
        />
        <MetricCard
          title="Returned Samples"
          value={metrics.returned}
          icon={RotateCcw}
          description="Completed returns"
        />
        <MetricCard
          title="Overdue Returns"
          value={metrics.overdueReturns}
          icon={AlertTriangle}
          changeType={metrics.overdueReturns > 0 ? "negative" : "positive"}
          description="Past expected return date"
        />
        <MetricCard
          title="Most Issued Sample"
          value={metrics.mostIssuedSample}
          icon={CheckCircle2}
          description="Highest quantity material"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filters</CardTitle>
          <CardDescription>
            Search by enquiry number, customer, phone, company, sample, catalogue, or staff.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickFilterOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={quickFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search customer, phone, company, enquiry, or material..."
                className="pl-10"
              />
            </div>

            <Select value={selectedAssignedTo} onValueChange={setSelectedAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {users
                  .filter((user) => user.isActive)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {sampleReturnStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger>
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {sampleDispatchMethodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Dispatch Register</CardTitle>
            <CardDescription>
              {sortedDispatches.length} records match the current filter set
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="min-w-[130px]">Enquiry Ref</th>
                    <th className="min-w-[220px]">Customer</th>
                    <th className="min-w-[200px]">Material</th>
                    <th className="min-w-[110px]">Status</th>
                    <th className="min-w-[120px]">Staff</th>
                    <th className="min-w-[130px]">
                      <button
                        onClick={() => handleToggleSort("issuedAt")}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Issued
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="min-w-[130px]">Expected Return</th>
                    <th className="min-w-[130px]">
                      <button
                        onClick={() => handleToggleSort("updatedAt")}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Updated
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchesQuery.isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted-foreground">
                        Loading sample dispatches...
                      </td>
                    </tr>
                  ) : dispatchesQuery.isError ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-destructive">
                        Unable to load sample dispatches. Check the new Supabase migration first.
                      </td>
                    </tr>
                  ) : sortedDispatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted-foreground">
                        No dispatch records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    sortedDispatches.map((dispatch) => {
                      const isSelected = dispatch.id === selectedDispatchId;
                      const isOverdue = isSampleDispatchOverdue(dispatch);

                      return (
                        <tr
                          key={dispatch.id}
                          className={isSelected ? "bg-primary/5" : ""}
                          onClick={() => setSelectedDispatchId(dispatch.id)}
                        >
                          <td>
                            <div className="text-sm font-medium">
                              {dispatch.enquiryReference || "Manual"}
                            </div>
                          </td>
                          <td>
                            <div>
                              <p className="text-sm font-medium">{dispatch.customerName}</p>
                              <p className="text-xs text-muted-foreground">
                                {dispatch.customerPhone}
                                {dispatch.companyName ? ` - ${dispatch.companyName}` : ""}
                              </p>
                            </div>
                          </td>
                          <td>
                            <div>
                              <p className="text-sm font-medium">{dispatch.materialName}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty {dispatch.quantity}
                                {dispatch.amountCollected !== null
                                  ? ` - Collected Rs ${dispatch.amountCollected.toLocaleString("en-IN")}`
                                  : ""}
                              </p>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col gap-2">
                              <Badge
                                variant="outline"
                                className={returnStatusBadgeClasses[dispatch.returnStatus]}
                              >
                                {sampleReturnStatusLabels[dispatch.returnStatus]}
                              </Badge>
                              {isOverdue ? (
                                <span className="text-xs font-medium text-destructive">
                                  {formatRelativeDate(dispatch.expectedReturnAt)}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <span className="text-sm">
                              {dispatch.assignedUser?.fullName || "Unassigned"}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(dispatch.issuedAt)}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(dispatch.expectedReturnAt)}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(dispatch.updatedAt)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Dispatch Detail</CardTitle>
                <CardDescription>
                  Review customer context, dispatch data, and active linked records.
                </CardDescription>
              </div>
              {selectedDispatch ? (
                <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedDispatch)}>
                  Edit
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {!selectedDispatch ? (
                <div className="py-8 text-center text-muted-foreground">
                  Select a dispatch record to view details.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{selectedDispatch.materialName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDispatch.customerName} - {selectedDispatch.customerPhone}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={returnStatusBadgeClasses[selectedDispatch.returnStatus]}
                    >
                      {sampleReturnStatusLabels[selectedDispatch.returnStatus]}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Enquiry Reference
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedDispatch.enquiryReference || "Manual entry"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Assigned Staff
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedDispatch.assignedUser?.fullName || "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Dispatch Method
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {sampleDispatchMethodLabels[selectedDispatch.dispatchMethod]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Quantity
                      </p>
                      <p className="mt-1 text-sm font-medium">{selectedDispatch.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Amount Collected
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedDispatch.amountCollected !== null
                          ? `Rs ${selectedDispatch.amountCollected.toLocaleString("en-IN")}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Issued
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDateTime(selectedDispatch.issuedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Expected Return
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDateTime(selectedDispatch.expectedReturnAt)}
                      </p>
                    </div>
                  </div>

                  {selectedDispatch.remarks ? (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Remarks
                        </p>
                        <p className="mt-2 text-sm leading-6">{selectedDispatch.remarks}</p>
                      </div>
                    </>
                  ) : null}

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold">Other Materials With This Customer</h4>
                    </div>
                    {relatedCustomerMaterials.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No other active materials are currently tagged to this customer.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {relatedCustomerMaterials.map((dispatch) => (
                          <div key={dispatch.id} className="rounded-lg border p-3 text-sm">
                            <p className="font-medium">{dispatch.materialName}</p>
                            <p className="text-muted-foreground">
                              Qty {dispatch.quantity} - {sampleReturnStatusLabels[dispatch.returnStatus]}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <PackageOpen className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold">Other Customers Holding This Material</h4>
                    </div>
                    {relatedMaterialHolders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No other active customer currently holds this material.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {relatedMaterialHolders.map((dispatch) => (
                          <div key={dispatch.id} className="rounded-lg border p-3 text-sm">
                            <p className="font-medium">{dispatch.customerName}</p>
                            <p className="text-muted-foreground">
                              {dispatch.customerPhone}
                              {dispatch.companyName ? ` - ${dispatch.companyName}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Movement Timeline</CardTitle>
              <CardDescription>
                Every create, update, and status change for this dispatch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedDispatchId ? (
                <p className="text-sm text-muted-foreground">Select a dispatch to view history.</p>
              ) : activitiesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading activity timeline...</p>
              ) : (activitiesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No timeline activity recorded yet.</p>
              ) : (
                (activitiesQuery.data ?? []).map((activity) => (
                  <div key={activity.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activity.createdByUser?.fullName || "CRM User"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Frequently Issued Samples</CardTitle>
                <CardDescription>Top materials by quantity issued</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics.topMaterials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sample activity yet.</p>
                ) : (
                  metrics.topMaterials.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm font-medium">{item.name}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer-wise Sample History</CardTitle>
                <CardDescription>
                  Customers with the highest issued material volume
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics.topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No customer history yet.</p>
                ) : (
                  metrics.topCustomers.map((item) => (
                    <div
                      key={item.customerName}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm font-medium">{item.customerName}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <SampleDispatchDialog
        dispatch={editingDispatch}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingDispatch(null);
          }
        }}
        assignableUsers={assignableUsers}
        assignmentLocked={actorRole === "sales"}
        forcedAssignedTo={actorRole === "sales" ? authUser?.id ?? null : null}
        isSubmitting={createDispatchMutation.isPending || updateDispatchMutation.isPending}
        onSubmit={handleSubmit}
      />
    </motion.div>
  );
}
