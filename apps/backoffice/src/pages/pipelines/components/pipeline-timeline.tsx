import { useCustom } from '@refinedev/core';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  cn,
} from '@project/ui';
import {
  CheckCircle2,
  Circle,
  XCircle,
  UserCheck,
  Play,
  Pause,
  Flag,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function safeFormatDistance(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '-';
  }
}

interface TimelineEvent {
  timestamp: string;
  event: string;
  stepType: string | null;
  episodeNumber: number | null;
  details: {
    status?: string;
    duration?: number;
    retryCount?: number;
    decision?: string;
    error?: string;
  };
}

interface TimelineResponse {
  timeline: TimelineEvent[];
}

const eventIcons: Record<string, React.ElementType> = {
  CREATED: Play,
  STEP_STARTED: Circle,
  STEP_COMPLETED: CheckCircle2,
  STEP_FAILED: XCircle,
  REVIEW_SUBMITTED: UserCheck,
  PAUSED: Pause,
  RESUMED: Play,
  COMPLETED: Flag,
  CANCELLED: XCircle,
  RESTARTED: RotateCcw,
};

const eventColors: Record<string, string> = {
  CREATED: 'text-blue-500',
  STEP_STARTED: 'text-blue-500',
  STEP_COMPLETED: 'text-emerald-500',
  STEP_FAILED: 'text-red-500',
  REVIEW_SUBMITTED: 'text-emerald-500',
  PAUSED: 'text-amber-500',
  RESUMED: 'text-blue-500',
  COMPLETED: 'text-emerald-500',
  CANCELLED: 'text-slate-500',
  RESTARTED: 'text-blue-500',
};

const stepLabels: Record<string, string> = {
  S2_IDEA_INSPIRATION: 'S2 Idea',
  S3_COURSE_OUTLINE: 'S3 Outline',
  S4_EPISODE_DRAFT: 'S4 Draft',
  S5_EPISODE_CONTENT: 'S5 Content',
  S6_PRACTICE_CONTENT: 'S6 Practice',
  S7_FINAL_EVALUATION: 'S7 Final',
};

function formatEventName(event: string): string {
  return event
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStepType(stepType: string): string {
  return stepLabels[stepType] ?? stepType;
}

interface PipelineTimelineProps {
  pipelineId: string;
}

export function PipelineTimeline({ pipelineId }: PipelineTimelineProps) {
  const { data, isLoading } = useCustom<TimelineResponse>({
    url: `/pipelines/${pipelineId}/timeline`,
    method: 'get',
  });

  const timeline = data?.data?.timeline ?? [];

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading timeline...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (timeline.length === 0) {
    return (
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No timeline events yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {timeline.map((event, index) => {
                const Icon = eventIcons[event.event] ?? Circle;
                const colorClass =
                  eventColors[event.event] ?? 'text-slate-500';

                return (
                  <div key={index} className="relative flex gap-4 pl-8">
                    {/* Icon */}
                    <div
                      className={cn(
                        'absolute left-0 p-1 bg-card rounded-full border border-border',
                        colorClass,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {formatEventName(event.event)}
                          {event.stepType && (
                            <span className="text-muted-foreground ml-1">
                              - {formatStepType(event.stepType)}
                            </span>
                          )}
                          {event.episodeNumber && (
                            <span className="text-muted-foreground ml-1">
                              (Ep {event.episodeNumber})
                            </span>
                          )}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {safeFormatDistance(event.timestamp)}
                        </span>
                      </div>

                      {/* Details */}
                      {event.details && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {event.details.duration !== undefined && (
                            <span>Duration: {event.details.duration}s</span>
                          )}
                          {event.details.decision && (
                            <span
                              className={cn(
                                'ml-2',
                                event.details.decision === 'APPROVED' &&
                                  'text-emerald-600',
                                event.details.decision === 'REJECTED' &&
                                  'text-red-600',
                              )}
                            >
                              Decision: {event.details.decision}
                            </span>
                          )}
                          {event.details.retryCount !== undefined &&
                            event.details.retryCount > 0 && (
                              <span className="ml-2 text-amber-600">
                                Retry #{event.details.retryCount}
                              </span>
                            )}
                          {event.details.error && (
                            <p className="text-red-500 mt-1">
                              {event.details.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

