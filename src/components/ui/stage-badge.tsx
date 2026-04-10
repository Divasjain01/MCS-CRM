import { cn } from '@/lib/utils';
import { LeadStage } from '@/types/crm';
import { stageLabels } from '@/lib/crm-config';

interface StageBadgeProps {
  stage: LeadStage;
  size?: 'sm' | 'md';
  className?: string;
}

const stageColors: Record<LeadStage, string> = {
  new: 'bg-info/10 text-info border-info/20',
  attempting_contact: 'bg-warning/10 text-warning border-warning/20',
  connected: 'bg-success/10 text-success border-success/20',
  qualified: 'bg-primary/10 text-primary border-primary/20',
  visit_booked: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  visit_done: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
  quotation_sent: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  negotiation: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
  won: 'bg-success/10 text-success border-success/20',
  lost: 'bg-destructive/10 text-destructive border-destructive/20',
  dormant: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
};

export function StageBadge({ stage, size = 'md', className }: StageBadgeProps) {
  return (
    <span
      className={cn(
        'stage-pill border',
        stageColors[stage],
        size === 'sm' && 'text-[10px] px-2 py-0.5',
        size === 'md' && 'text-xs px-2.5 py-1',
        className
      )}
    >
      {stageLabels[stage]}
    </span>
  );
}
