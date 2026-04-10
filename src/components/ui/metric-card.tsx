import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor,
  description,
  className,
}: MetricCardProps) {
  return (
    <div className={cn('metric-card', className)}>
      <div className="metric-card-glow" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            iconColor || 'bg-primary/10'
          )}>
            <Icon className={cn(
              'h-5 w-5',
              iconColor ? 'text-primary-foreground' : 'text-primary'
            )} />
          </div>
        </div>
        
        {(change || description) && (
          <div className="mt-3 flex items-center gap-2">
            {change && (
              <span className={cn(
                'text-sm font-medium',
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground'
              )}>
                {change}
              </span>
            )}
            {description && (
              <span className="text-sm text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
