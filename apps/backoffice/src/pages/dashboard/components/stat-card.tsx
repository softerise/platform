import { Card, CardContent, cn } from '@project/ui';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  variant?: 'default' | 'warning' | 'success' | 'error';
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-card',
  warning: 'bg-amber-500/10 border-amber-500/20',
  success: 'bg-emerald-500/10 border-emerald-500/20',
  error: 'bg-red-500/10 border-red-500/20',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'border border-border hover:bg-muted/50 transition-colors',
        variantStyles[variant],
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  'text-xs mt-2',
                  trend.positive ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className="p-3 bg-muted rounded-md">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

