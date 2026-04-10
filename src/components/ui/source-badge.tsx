import { cn } from '@/lib/utils';
import { LeadSource } from '@/types/crm';
import { sourceLabels } from '@/lib/crm-config';
import { ShoppingBag, Facebook, Instagram, MessageCircle, Users, Footprints } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Globe, PencilLine } from 'lucide-react';

interface SourceBadgeProps {
  source: LeadSource;
  showIcon?: boolean;
  className?: string;
}

const sourceConfig: Record<LeadSource, { icon: LucideIcon; color: string }> = {
  shopify: { icon: ShoppingBag, color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  meta: { icon: Facebook, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  instagram: { icon: Instagram, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400' },
  whatsapp: { icon: MessageCircle, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  referral: { icon: Users, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  walk_in: { icon: Footprints, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  website: { icon: Globe, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400' },
  manual: { icon: PencilLine, color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
};

export function SourceBadge({ source, showIcon = true, className }: SourceBadgeProps) {
  const config = sourceConfig[source];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.color,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {sourceLabels[source]}
    </span>
  );
}
