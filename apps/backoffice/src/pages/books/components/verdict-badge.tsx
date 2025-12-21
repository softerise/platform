import { Badge } from '@project/ui';
import { cn } from '@project/ui';

export type VerdictType =
  | 'DIAMOND'
  | 'GOLD'
  | 'SILVER'
  | 'BRONZE'
  | 'REJECTED'
  | 'PENDING';

const verdictConfig: Record<
  VerdictType,
  { label: string; className: string }
> = {
  DIAMOND: {
    label: 'Diamond',
    className: 'bg-violet-500/15 text-violet-700 border-violet-500/30',
  },
  GOLD: {
    label: 'Gold',
    className: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  },
  SILVER: {
    label: 'Silver',
    className: 'bg-slate-400/15 text-slate-600 border-slate-400/30',
  },
  BRONZE: {
    label: 'Bronze',
    className: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-500/15 text-red-700 border-red-500/30',
  },
  PENDING: {
    label: 'Pending',
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  },
};

interface VerdictBadgeProps {
  verdict: VerdictType | string | null | undefined;
  size?: 'sm' | 'default';
}

export function VerdictBadge({ verdict, size = 'default' }: VerdictBadgeProps) {
  const normalizedVerdict = (verdict?.toUpperCase() ?? 'PENDING') as VerdictType;
  const config = verdictConfig[normalizedVerdict] ?? verdictConfig.PENDING;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        config.className,
        size === 'sm' && 'text-xs px-1.5 py-0',
      )}
    >
      {config.label}
    </Badge>
  );
}

