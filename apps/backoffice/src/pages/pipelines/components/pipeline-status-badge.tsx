import { Badge, cn } from '@project/ui';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Eye,
} from 'lucide-react';

export type PipelineStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING_REVIEW'
  | 'PAUSED'
  | 'APPROVED'
  | 'FAILED'
  | 'CANCELLED';

const statusConfig: Record<
  PipelineStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-slate-400/15 text-slate-600 border-slate-400/30',
    icon: Clock,
  },
  RUNNING: {
    label: 'Running',
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    icon: Loader2,
  },
  WAITING_REVIEW: {
    label: 'Waiting Review',
    className: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    icon: Eye,
  },
  PAUSED: {
    label: 'Paused',
    className: 'bg-slate-400/15 text-slate-600 border-slate-400/30',
    icon: Pause,
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-500/15 text-red-700 border-red-500/30',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-slate-400/15 text-slate-600 border-slate-400/30',
    icon: XCircle,
  },
};

interface PipelineStatusBadgeProps {
  status: PipelineStatus | string | null | undefined;
  size?: 'sm' | 'default';
}

export function PipelineStatusBadge({
  status,
  size = 'default',
}: PipelineStatusBadgeProps) {
  if (!status) return null;

  const normalizedStatus = (status?.toUpperCase() ?? 'PENDING') as PipelineStatus;
  const config = statusConfig[normalizedStatus] ?? statusConfig.PENDING;
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
      <Icon
        className={cn(
          'mr-1 h-3 w-3',
          normalizedStatus === 'RUNNING' && 'animate-spin',
        )}
      />
      {config.label}
    </Badge>
  );
}

