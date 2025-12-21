import { Badge, cn } from '@project/ui';

export type PracticeLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';

const levelConfig: Record<PracticeLevel, { label: string; className: string }> = {
  BASIC: {
    label: 'Basic',
    className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  },
  INTERMEDIATE: {
    label: 'Intermediate',
    className: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  },
  ADVANCED: {
    label: 'Advanced',
    className: 'bg-red-500/15 text-red-700 border-red-500/30',
  },
};

interface PracticeLevelBadgeProps {
  level: PracticeLevel | string | null | undefined;
  size?: 'sm' | 'default';
}

export function PracticeLevelBadge({ level, size = 'default' }: PracticeLevelBadgeProps) {
  if (!level) return null;

  const normalizedLevel = (level?.toUpperCase() ?? 'BASIC') as PracticeLevel;
  const config = levelConfig[normalizedLevel] ?? levelConfig.BASIC;

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

