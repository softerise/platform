import { Badge, cn } from '@project/ui';
import { CheckCircle2, Rocket, Archive } from 'lucide-react';

export type CourseStatus = 'APPROVED' | 'DEPLOYED' | 'ARCHIVED';

const statusConfig: Record<
  CourseStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  APPROVED: {
    label: 'Approved',
    className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    icon: CheckCircle2,
  },
  DEPLOYED: {
    label: 'Deployed',
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    icon: Rocket,
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-slate-400/15 text-slate-600 border-slate-400/30',
    icon: Archive,
  },
};

interface CourseStatusBadgeProps {
  status: CourseStatus | string | null | undefined;
  size?: 'sm' | 'default';
}

export function CourseStatusBadge({
  status,
  size = 'default',
}: CourseStatusBadgeProps) {
  if (!status) return null;

  const normalizedStatus = (status?.toUpperCase() ?? 'APPROVED') as CourseStatus;
  const config = statusConfig[normalizedStatus] ?? statusConfig.APPROVED;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        config.className,
        size === 'sm' && 'text-xs px-1.5 py-0',
      )}
    >
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}

