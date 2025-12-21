import { cn } from '@project/ui';

interface QualityScoreProps {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

export function QualityScore({ score, size = 'md' }: QualityScoreProps) {
  const displayScore = score ?? 0;

  const getColorClass = (s: number) => {
    if (s >= 85) return 'text-emerald-600';
    if (s >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className="flex items-baseline gap-1">
      <span
        className={cn('font-bold tabular-nums', sizeClasses[size], getColorClass(displayScore))}
      >
        {displayScore}
      </span>
      <span className="text-muted-foreground text-sm">/100</span>
    </div>
  );
}

