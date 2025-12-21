import { Badge, cn } from '@project/ui';

export type EpisodeType = 'FOUNDATIONAL' | 'CORE' | 'APPLICATION' | 'INTEGRATION';

const typeConfig: Record<EpisodeType, { label: string; className: string }> = {
  FOUNDATIONAL: {
    label: 'Foundational',
    className: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  },
  CORE: {
    label: 'Core',
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  },
  APPLICATION: {
    label: 'Application',
    className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  },
  INTEGRATION: {
    label: 'Integration',
    className: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  },
};

interface EpisodeTypeBadgeProps {
  type: EpisodeType | string | null | undefined;
  size?: 'sm' | 'default';
}

export function EpisodeTypeBadge({ type, size = 'default' }: EpisodeTypeBadgeProps) {
  if (!type) return null;

  const normalizedType = (type?.toUpperCase() ?? 'CORE') as EpisodeType;
  const config = typeConfig[normalizedType] ?? typeConfig.CORE;

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

