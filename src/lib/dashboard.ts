import { inactiveLeadSources, sourceChartColors, sourceLabels } from "@/lib/crm-config";
import type {
  DashboardMetrics,
  DashboardSnapshot,
  DashboardSourcePoint,
  DashboardTrendPoint,
  Lead,
  LeadStage,
  LeadSource,
} from "@/types/crm";

const CONNECTED_STAGES = new Set<LeadStage>([
  "connected",
  "qualified",
  "visit_booked",
  "visit_done",
  "quotation_sent",
  "negotiation",
  "won",
]);

const CONVERSION_STAGES = new Set<LeadStage>(["won"]);

const DAYS_IN_WINDOW = 30;

const isWithinRange = (dateValue: string | null, start: Date, end: Date) => {
  if (!dateValue) {
    return false;
  }

  const timestamp = new Date(dateValue).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
};

const calculateMetrics = (leads: Lead[], start: Date, end: Date): DashboardMetrics => {
  const newLeads = leads.filter((lead) => isWithinRange(lead.createdAt, start, end)).length;
  const connected = leads.filter(
    (lead) => CONNECTED_STAGES.has(lead.stage) && isWithinRange(lead.updatedAt, start, end),
  ).length;
  const storeVisits = leads.filter((lead) => {
    if (isWithinRange(lead.showroomVisitDate, start, end)) {
      return true;
    }

    return (
      (lead.stage === "visit_booked" || lead.stage === "visit_done") &&
      isWithinRange(lead.updatedAt, start, end)
    );
  }).length;
  const conversions = leads.filter(
    (lead) => CONVERSION_STAGES.has(lead.stage) && isWithinRange(lead.updatedAt, start, end),
  ).length;
  const totalRevenue = leads.reduce((sum, lead) => {
    if (lead.stage !== "won") {
      return sum;
    }

    return sum + (lead.quotationValue ?? lead.budget ?? 0);
  }, 0);

  return {
    newLeads,
    connected,
    storeVisits,
    conversions,
    conversionRate: newLeads > 0 ? Number(((conversions / newLeads) * 100).toFixed(1)) : 0,
    totalRevenue,
  };
};

const buildLeadsOverTime = (leads: Lead[], now: Date): DashboardTrendPoint[] => {
  const points: DashboardTrendPoint[] = [];

  for (let daysAgo = DAYS_IN_WINDOW - 1; daysAgo >= 0; daysAgo -= 1) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - daysAgo);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    points.push({
      date: start.toLocaleDateString([], { month: "short", day: "numeric" }),
      leads: leads.filter((lead) => isWithinRange(lead.createdAt, start, end)).length,
    });
  }

  return points;
};

const buildLeadsBySource = (leads: Lead[], start: Date, end: Date): DashboardSourcePoint[] => {
  const counts = new Map<LeadSource, number>();

  leads.forEach((lead) => {
    if (!isWithinRange(lead.createdAt, start, end)) {
      return;
    }

    if (inactiveLeadSources.has(lead.source)) {
      return;
    }

    counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1);
  });

  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([source, count]) => ({
      source,
      label: sourceLabels[source],
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      fill: sourceChartColors[source],
    }));
};

export const buildDashboardSnapshot = (
  leads: Lead[],
  now = new Date(),
): DashboardSnapshot => {
  const currentWindowEnd = new Date(now);
  const currentWindowStart = new Date(now);
  currentWindowStart.setDate(currentWindowStart.getDate() - DAYS_IN_WINDOW);

  const previousWindowEnd = new Date(currentWindowStart);
  const previousWindowStart = new Date(previousWindowEnd);
  previousWindowStart.setDate(previousWindowStart.getDate() - DAYS_IN_WINDOW);

  return {
    metrics: calculateMetrics(leads, currentWindowStart, currentWindowEnd),
    previousMetrics: calculateMetrics(leads, previousWindowStart, previousWindowEnd),
    leadsOverTime: buildLeadsOverTime(leads, now),
    leadsBySource: buildLeadsBySource(leads, currentWindowStart, currentWindowEnd),
  };
};

export const formatMetricChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? "0%" : "+100%";
  }

  const delta = ((current - previous) / previous) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)}%`;
};

export const getMetricChangeType = (current: number, previous: number) => {
  if (current === previous) {
    return "neutral" as const;
  }

  return current > previous ? "positive" : "negative";
};

export const countOverdueFollowUps = (followUps: FollowUp[], now = new Date()) =>
  followUps.filter((followUp) => new Date(followUp.dueAt).getTime() < now.getTime()).length;
