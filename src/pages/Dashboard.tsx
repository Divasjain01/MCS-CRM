import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarCheck,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  UserCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { SourceBadge } from "@/components/ui/source-badge";
import { StageBadge } from "@/components/ui/stage-badge";
import { useAuth } from "@/context/AuthContext";
import { downloadCsv } from "@/lib/csv";
import {
  buildDashboardSnapshot,
  countOverdueFollowUps,
  formatMetricChange,
  getMetricChangeType,
} from "@/lib/dashboard";
import { useLeadsQuery, useOpenFollowUpsQuery } from "@/hooks/use-leads";
import { useUsersQuery } from "@/hooks/use-users";
import { exportLeadsToCsv } from "@/services/leads";
import type { DashboardSourcePoint, FollowUp, Lead, UserSummary } from "@/types/crm";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const EMPTY_USERS: UserSummary[] = [];
const EMPTY_LEADS: Lead[] = [];
const EMPTY_FOLLOW_UPS: FollowUp[] = [];

const renderSourceTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: DashboardSourcePoint }>;
}) => {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="min-w-[180px] rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: point.fill }}
        />
        <p className="text-sm font-semibold text-foreground">{point.label}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-6 text-sm">
        <span className="text-muted-foreground">Leads</span>
        <span className="font-medium text-foreground">{point.count}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-6 text-sm">
        <span className="text-muted-foreground">Share</span>
        <span className="font-medium text-foreground">{point.percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const usersQuery = useUsersQuery();
  const users = usersQuery.data ?? EMPTY_USERS;
  const leadsQuery = useLeadsQuery(users);
  const followUpsQuery = useOpenFollowUpsQuery(users);

  const leads = leadsQuery.data ?? EMPTY_LEADS;
  const followUps = followUpsQuery.data ?? EMPTY_FOLLOW_UPS;
  const now = Date.now();
  const today = new Date().toDateString();

  const dashboardSnapshot = useMemo(
    () => buildDashboardSnapshot(leads),
    [leads],
  );

  const todayFollowUps = followUps
    .filter((followUp) => new Date(followUp.dueAt).toDateString() === today)
    .slice(0, 4);
  const overdueFollowUps = followUps
    .filter((followUp) => new Date(followUp.dueAt).getTime() < now)
    .slice(0, 4);
  const upcomingFollowUps = followUps
    .filter((followUp) => new Date(followUp.dueAt).getTime() >= now)
    .slice(0, 4);
  const recentLeads = leads.slice(0, 5);
  const overdueCount = countOverdueFollowUps(followUps);

  const leadLookup = new Map(leads.map((lead) => [lead.id, lead] as const));

  const handleExport = () => {
    const content = exportLeadsToCsv(leads);
    downloadCsv(`mcube-dashboard-leads-${new Date().toISOString().slice(0, 10)}.csv`, content);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.fullName.split(" ")[0] ?? "team"}. Here&apos;s your overview.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} disabled={leads.length === 0}>
            Export Report
          </Button>
          <Button asChild>
            <Link to="/leads">View All Leads</Link>
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="New Leads"
          value={dashboardSnapshot.metrics.newLeads}
          change={formatMetricChange(
            dashboardSnapshot.metrics.newLeads,
            dashboardSnapshot.previousMetrics.newLeads,
          )}
          changeType={getMetricChangeType(
            dashboardSnapshot.metrics.newLeads,
            dashboardSnapshot.previousMetrics.newLeads,
          )}
          icon={Users}
          description="vs previous 30 days"
        />
        <MetricCard
          title="Connected"
          value={dashboardSnapshot.metrics.connected}
          change={formatMetricChange(
            dashboardSnapshot.metrics.connected,
            dashboardSnapshot.previousMetrics.connected,
          )}
          changeType={getMetricChangeType(
            dashboardSnapshot.metrics.connected,
            dashboardSnapshot.previousMetrics.connected,
          )}
          icon={UserCheck}
          description="active connected pipeline"
        />
        <MetricCard
          title="Store Visits"
          value={dashboardSnapshot.metrics.storeVisits}
          change={formatMetricChange(
            dashboardSnapshot.metrics.storeVisits,
            dashboardSnapshot.previousMetrics.storeVisits,
          )}
          changeType={getMetricChangeType(
            dashboardSnapshot.metrics.storeVisits,
            dashboardSnapshot.previousMetrics.storeVisits,
          )}
          icon={CalendarCheck}
          description="scheduled or completed"
        />
        <MetricCard
          title="Overdue Follow-ups"
          value={overdueCount}
          change={`${upcomingFollowUps.length} upcoming`}
          changeType={overdueCount > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
          description="open follow-up queue"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Leads Over Time</CardTitle>
            <CardDescription>New leads acquired in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardSnapshot.leadsOverTime}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads by Source</CardTitle>
            <CardDescription>Distribution for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardSnapshot.leadsBySource}
                    cx="46%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="count"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {dashboardSnapshot.leadsBySource.map((entry) => (
                      <Cell key={entry.source} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    content={renderSourceTooltip}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {dashboardSnapshot.leadsBySource.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No source data is available for the current 30-day window.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {dashboardSnapshot.leadsBySource.map((item) => (
                  <div
                    key={item.source}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm"
                  >
                    <div
                      className="h-3 w-3 rounded-full ring-2 ring-background"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                    <span className="font-semibold text-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Today&apos;s Follow-ups</CardTitle>
              <CardDescription>Scheduled calls and meetings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary" asChild>
              <Link to="/leads">
                View Leads <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {followUpsQuery.isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading follow-ups...</div>
            ) : todayFollowUps.length > 0 ? (
              todayFollowUps.map((followUp) => {
                const lead = leadLookup.get(followUp.leadId);
                if (!lead) {
                  return null;
                }

                return (
                  <div
                    key={followUp.id}
                    className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-sm text-primary">
                          {lead.fullName
                            .split(" ")
                            .map((segment) => segment[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{lead.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(followUp.dueAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          - {lead.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StageBadge stage={lead.stage} size="sm" />
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Clock className="mx-auto mb-2 h-10 w-10 opacity-50" />
                <p>No follow-ups scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Follow-up Health</CardTitle>
            <CardDescription>Overdue and upcoming commitments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-destructive">Overdue</p>
                <span className="text-lg font-semibold text-destructive">
                  {overdueFollowUps.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {overdueFollowUps.length > 0 ? (
                  overdueFollowUps.map((followUp) => {
                    const lead = leadLookup.get(followUp.leadId);
                    return (
                      <div key={followUp.id} className="text-sm">
                        <p className="font-medium">{lead?.fullName ?? "Lead"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(followUp.dueAt).toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No overdue follow-ups.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Upcoming</p>
                <span className="text-lg font-semibold">{upcomingFollowUps.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {upcomingFollowUps.length > 0 ? (
                  upcomingFollowUps.slice(0, 3).map((followUp) => {
                    const lead = leadLookup.get(followUp.leadId);
                    return (
                      <div key={followUp.id} className="text-sm">
                        <p className="font-medium">{lead?.fullName ?? "Lead"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(followUp.dueAt).toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming follow-ups.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Leads</CardTitle>
              <CardDescription>Latest additions to pipeline</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary" asChild>
              <Link to="/leads">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {leadsQuery.isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading recent leads...</div>
            ) : recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-sm text-primary">
                        {lead.fullName
                          .split(" ")
                          .map((segment) => segment[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{lead.fullName}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <SourceBadge
                          source={lead.source}
                          showIcon={false}
                          className="px-2 py-0.5 text-[10px]"
                        />
                        <span className="text-xs text-muted-foreground">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No leads available yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Queue</CardTitle>
            <CardDescription>Next scheduled follow-ups across the team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {followUpsQuery.isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading queue...</div>
            ) : upcomingFollowUps.length > 0 ? (
              upcomingFollowUps.map((followUp) => {
                const lead = leadLookup.get(followUp.leadId);
                return (
                  <div key={followUp.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{lead?.fullName ?? "Lead"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(followUp.dueAt).toLocaleString()}
                        </p>
                      </div>
                      {lead && <StageBadge stage={lead.stage} size="sm" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No upcoming follow-ups.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
