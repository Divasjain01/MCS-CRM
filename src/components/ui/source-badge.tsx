import { cn } from '@/lib/utils';
import { LeadSource } from '@/types/crm';
import { sourceLabels } from '@/lib/crm-config';
import {
  Building2,
  Facebook,
  Footprints,
  Globe,
  Instagram,
  MessageCircle,
  PencilLine,
  PhoneCall,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

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
  bni: { icon: Users, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' },
  jbn: { icon: Building2, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' },
  indiamart: { icon: Globe, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300' },
  justdial: { icon: PhoneCall, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
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
