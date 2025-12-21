import { Card, CardContent, CardHeader, CardTitle, ScrollArea, cn } from '@project/ui';
import { CheckCircle2, XCircle, UserCheck, Rocket, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Activity } from '../types';

const activityConfig: Record<
  Activity['type'],
  { icon: typeof CheckCircle2; color: string; bgColor: string }
> = {
  PIPELINE_COMPLETED: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
  PIPELINE_FAILED: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
  },
  REVIEW_SUBMITTED: {
    icon: UserCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  COURSE_DEPLOYED: {
    icon: Rocket,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
};

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {activities.map((activity) => {
                const config = activityConfig[activity.type] ?? {
                  icon: Circle,
                  color: 'text-muted-foreground',
                  bgColor: 'bg-muted',
                };
                const Icon = config.icon;

                return (
                  <div key={activity.id} className="relative flex gap-4 pl-8">
                    <div
                      className={cn(
                        'absolute left-0 p-1.5 rounded-full',
                        config.bgColor,
                      )}
                    >
                      <Icon className={cn('h-3 w-3', config.color)} />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
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

