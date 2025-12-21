import { useNavigate } from 'react-router-dom';
import { Button, cn, LoadingSkeleton } from '@project/ui';
import {
  BookOpen,
  GitBranch,
  GraduationCap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import {
  StatCard,
  SuccessRateChart,
  QualityDistributionChart,
  PipelineStatusChart,
  ActionRequired,
  RecentActivity,
} from './components';
import { useDashboardData } from './hooks/use-dashboard-data';

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    isLoading,
    isRefreshing,
    overview,
    charts,
    actionRequired,
    recentActivity,
    refetch,
  } = useDashboardData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Overview of your content pipeline
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LoadingSkeleton variant="card" />
          </div>
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your content pipeline
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')}
          />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Books"
          value={overview.totalBooks}
          icon={BookOpen}
          onClick={() => navigate('/admin/books')}
        />
        <StatCard
          title="Pipelines"
          value={overview.totalPipelines}
          subtitle={`${overview.runningPipelines} running`}
          icon={GitBranch}
          onClick={() => navigate('/admin/pipelines')}
        />
        <StatCard
          title="Courses"
          value={overview.totalCourses}
          subtitle={`${overview.deployedCourses} deployed`}
          icon={GraduationCap}
          onClick={() => navigate('/admin/courses')}
        />
        <StatCard
          title="Pending Reviews"
          value={overview.pendingReviews}
          icon={AlertCircle}
          variant={overview.pendingReviews > 0 ? 'warning' : 'default'}
          onClick={() => navigate('/admin/pipelines?status=WAITING_REVIEW')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SuccessRateChart data={charts.successRateTrend} />
        </div>
        <div>
          <PipelineStatusChart data={charts.pipelineStatus} />
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <QualityDistributionChart data={charts.qualityDistribution} />
        </div>
        <div className="lg:col-span-2">
          <ActionRequired
            pendingS2Reviews={actionRequired.pendingS2Reviews}
            pendingS7Reviews={actionRequired.pendingS7Reviews}
            failedPipelines={actionRequired.failedPipelines}
            readyToDeploy={actionRequired.readyToDeploy}
          />
        </div>
      </div>

      {/* Recent Activity (Only show if there are activities) */}
      {recentActivity.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity activities={recentActivity} />
        </div>
      )}
    </div>
  );
}

export default DashboardPage;

