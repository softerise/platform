import { Badge } from '@project/ui';
import { cn } from '@project/ui';
import { CheckCircle2, XCircle } from 'lucide-react';

interface EligibilityBadgeProps {
  eligible: boolean;
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

export function EligibilityBadge({
  eligible,
  size = 'default',
  showIcon = true,
}: EligibilityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        eligible
          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
          : 'bg-slate-400/15 text-slate-600 border-slate-400/30',
        size === 'sm' && 'text-xs px-1.5 py-0',
      )}
    >
      {showIcon && (
        eligible ? (
          <CheckCircle2 className="mr-1 h-3 w-3" />
        ) : (
          <XCircle className="mr-1 h-3 w-3" />
        )
      )}
      {eligible ? 'Pipeline Ready' : 'Not Eligible'}
    </Badge>
  );
}

