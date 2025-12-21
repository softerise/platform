export interface DashboardMetrics {
  overview: {
    totalBooks: number;
    totalPipelines: number;
    totalCourses: number;
    pendingReviews: number;
    runningPipelines: number;
    failedPipelines: number;
    deployedCourses: number;
    approvedCourses: number;
    successRate: number;
  };
  trends: {
    pipelineSuccessRate: { week: string; rate: number }[];
    qualityDistribution: { range: string; count: number; color: string }[];
    pipelineStatus: { name: string; value: number; color: string }[];
  };
  recentActivity: Activity[];
  actionRequired: ActionRequiredData;
}

export interface Activity {
  id: string;
  type: 'PIPELINE_COMPLETED' | 'PIPELINE_FAILED' | 'REVIEW_SUBMITTED' | 'COURSE_DEPLOYED';
  title: string;
  description: string;
  timestamp: string;
}

export interface ActionRequiredData {
  pendingS2Reviews: { id: string; bookTitle: string; createdAt: string }[];
  pendingS7Reviews: { id: string; bookTitle: string; createdAt: string }[];
  failedPipelines: { id: string; bookTitle: string; error: string }[];
  readyToDeploy: { id: string; title: string; qualityScore: number }[];
}

export interface ChartData {
  successRateTrend: { week: string; rate: number }[];
  qualityDistribution: { range: string; count: number; color: string }[];
  pipelineStatus: { name: string; value: number; color: string }[];
}

