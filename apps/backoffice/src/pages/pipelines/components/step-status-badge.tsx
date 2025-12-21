import { cn } from '@project/ui';
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

const stepStatusConfig: Record<
  StepStatus,
  {
    label: string;
    icon: React.ElementType;
    className: string;
  }
> = {
  PENDING: {
    label: 'Pending',
    icon: Circle,
    className: 'text-slate-400',
  },
  RUNNING: {
    label: 'Running',
    icon: Loader2,
    className: 'text-blue-500',
  },
  SUCCESS: {
    label: 'Success',
    icon: CheckCircle2,
    className: 'text-emerald-500',
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    className: 'text-red-500',
  },
  SKIPPED: {
    label: 'Skipped',
    icon: AlertCircle,
    className: 'text-slate-400',
  },
};

interface StepStatusBadgeProps {
  status: StepStatus | string | null | undefined;
  showLabel?: boolean;
}

export function StepStatusBadge({
  status,
  showLabel = true,
}: StepStatusBadgeProps) {
  const normalizedStatus = (status?.toUpperCase() ?? 'PENDING') as StepStatus;
  const config = stepStatusConfig[normalizedStatus] ?? stepStatusConfig.PENDING;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1.5">
      <Icon
        className={cn(
          'h-4 w-4',
          config.className,
          normalizedStatus === 'RUNNING' && 'animate-spin',
        )}
      />
      {showLabel && <span className="text-sm">{config.label}</span>}
    </div>
  );
}

