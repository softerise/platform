import * as React from 'react';
import { useShow, useCustom, useCustomMutation } from '@refinedev/core';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  LoadingSkeleton,
  toast,
} from '@project/ui';
import {
  ArrowLeft,
  XCircle,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Clock,
  FileText,
  GitBranch,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import {
  PipelineStatusBadge,
  PipelineProgress,
  PipelineTimeline,
  StepOutputViewer,
  HumanReviewDialog,
} from './components';

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

function safeFormat(dateStr: string | null | undefined, formatStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return format(date, formatStr);
  } catch {
    return '-';
  }
}

interface Pipeline {
  id: string;
  bookId: string;
  status: string;
  progress: number;
  currentStep: string | null;
  courseId: string | null;
  book?: {
    title: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface StepExecution {
  id: string;
  stepType: string;
  status: string;
  episodeNumber: number | null;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  retryCount: number;
  outputData?: Record<string, unknown>;
}

interface StepsResponse {
  steps: StepExecution[];
}

export function PipelineShowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pipelineId = id ?? '';

  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [reviewStepType, setReviewStepType] = React.useState<
    'S2_IDEA_INSPIRATION' | 'S7_FINAL_EVALUATION'
  >('S2_IDEA_INSPIRATION');

  // Fetch pipeline
  const { queryResult, refetch } = useShow<Pipeline>({
    resource: 'pipelines',
    id: pipelineId,
    queryOptions: { enabled: !!pipelineId },
  });

  const { data, isLoading, isError } = queryResult;
  const pipeline = data?.data;

  // Fetch steps
  const {
    data: stepsData,
    refetch: refetchSteps,
    isLoading: stepsLoading,
  } = useCustom<StepsResponse>({
    url: `/pipelines/${pipelineId}/steps`,
    method: 'get',
    queryOptions: { enabled: !!pipelineId },
  });

  const steps = stepsData?.data?.steps ?? [];

  // Polling for running pipelines
  React.useEffect(() => {
    if (pipeline?.status === 'RUNNING') {
      const interval = setInterval(() => {
        refetch();
        refetchSteps();
      }, 5000); // 5 seconds

      return () => clearInterval(interval);
    }
  }, [pipeline?.status, refetch, refetchSteps]);

  // Mutations
  const { mutate: cancelPipeline, isLoading: cancelling } = useCustomMutation();
  const { mutate: restartPipeline, isLoading: restarting } = useCustomMutation();

  const handleCancel = () => {
    cancelPipeline(
      {
        url: `/pipelines/${pipelineId}/cancel`,
        method: 'post',
        values: {},
      },
      {
        onSuccess: () => {
          toast.success('Pipeline cancelled');
          refetch();
        },
        onError: () => {
          toast.error('Failed to cancel pipeline');
        },
      },
    );
  };

  const handleRestart = () => {
    restartPipeline(
      {
        url: `/pipelines/${pipelineId}/restart`,
        method: 'post',
        values: {},
      },
      {
        onSuccess: () => {
          toast.success('Pipeline restarted');
          refetch();
          refetchSteps();
        },
        onError: () => {
          toast.error('Failed to restart pipeline');
        },
      },
    );
  };

  const handleReview = (
    stepType: 'S2_IDEA_INSPIRATION' | 'S7_FINAL_EVALUATION',
  ) => {
    setReviewStepType(stepType);
    setReviewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <LoadingSkeleton variant="card" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    );
  }

  if (isError || !pipeline) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load pipeline</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine which review is pending
  const pendingS2Review =
    pipeline.status === 'WAITING_REVIEW' &&
    steps.some(
      (s) => s.stepType === 'S2_IDEA_INSPIRATION' && s.status === 'SUCCESS',
    ) &&
    !steps.some((s) => s.stepType === 'S3_COURSE_OUTLINE');

  const pendingS7Review =
    pipeline.status === 'WAITING_REVIEW' &&
    steps.some(
      (s) => s.stepType === 'S7_FINAL_EVALUATION' && s.status === 'SUCCESS',
    );

  // Get step output for review dialog
  const reviewStep = steps.find(
    (s) => s.stepType === reviewStepType && s.status === 'SUCCESS',
  );

  const completedStepsCount = steps.filter((s) => s.status === 'SUCCESS').length;
  const totalStepsCount = steps.length || 6; // Fallback to 6 steps

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/admin/pipelines')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Pipelines
      </Button>

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <GitBranch className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                {pipeline.book?.title ?? 'Pipeline'}
              </h1>
              <PipelineStatusBadge status={pipeline.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Started {safeFormatDistance(pipeline.createdAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* View Book */}
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/books/${pipeline.bookId}`)}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            View Book
          </Button>

          {/* Cancel (for running/waiting) */}
          {['RUNNING', 'WAITING_REVIEW', 'PAUSED'].includes(pipeline.status) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Pipeline?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will stop the pipeline. You can restart it later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Running</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? 'Cancelling...' : 'Cancel Pipeline'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Restart (for failed/cancelled) */}
          {['FAILED', 'CANCELLED'].includes(pipeline.status) && (
            <Button onClick={handleRestart} disabled={restarting}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {restarting ? 'Restarting...' : 'Restart'}
            </Button>
          )}

          {/* Review Button */}
          {pendingS2Review && (
            <Button onClick={() => handleReview('S2_IDEA_INSPIRATION')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Review Ideas
            </Button>
          )}
          {pendingS7Review && (
            <Button onClick={() => handleReview('S7_FINAL_EVALUATION')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Final Approval
            </Button>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <Card className="border border-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-semibold tabular-nums">
                {pipeline.progress ?? 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Step</p>
              <p className="text-lg font-medium">
                {pipeline.currentStep ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-lg font-medium">
                {pipeline.completedAt
                  ? safeFormatDistance(pipeline.createdAt)
                  : 'In progress'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Steps Completed</p>
              <p className="text-lg font-medium tabular-nums">
                {completedStepsCount} / {totalStepsCount}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <PipelineProgress
              progress={pipeline.progress ?? 0}
              currentStep={pipeline.currentStep}
              status={pipeline.status}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">
            <Clock className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="outputs">
            <FileText className="mr-2 h-4 w-4" />
            Step Outputs
          </TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <PipelineTimeline pipelineId={pipelineId} />
        </TabsContent>

        <TabsContent value="outputs">
          {stepsLoading ? (
            <LoadingSkeleton variant="card" />
          ) : (
            <StepOutputViewer pipelineId={pipelineId} steps={steps} />
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Pipeline Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Pipeline ID</dt>
                  <dd className="font-mono text-xs mt-1">{pipeline.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Book ID</dt>
                  <dd className="font-mono text-xs mt-1">{pipeline.bookId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created At</dt>
                  <dd className="mt-1">
                    {safeFormat(pipeline.createdAt, 'PPpp')}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Updated At</dt>
                  <dd className="mt-1">
                    {safeFormat(pipeline.updatedAt, 'PPpp')}
                  </dd>
                </div>
                {pipeline.completedAt && (
                  <div>
                    <dt className="text-muted-foreground">Completed At</dt>
                    <dd className="mt-1">
                      {safeFormat(pipeline.completedAt, 'PPpp')}
                    </dd>
                  </div>
                )}
                {pipeline.courseId && (
                  <div>
                    <dt className="text-muted-foreground">Course ID</dt>
                    <dd className="mt-1">
                      <Button
                        variant="link"
                        className="p-0 h-auto font-mono text-xs"
                        onClick={() =>
                          navigate(`/admin/courses/${pipeline.courseId}`)
                        }
                      >
                        {pipeline.courseId}
                      </Button>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Human Review Dialog */}
      <HumanReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        pipelineId={pipelineId}
        stepType={reviewStepType}
        stepOutput={reviewStep?.outputData as any}
        onSuccess={() => {
          refetch();
          refetchSteps();
        }}
      />
    </div>
  );
}

export default PipelineShowPage;

