import * as React from 'react';
import { useShow, useCustomMutation } from '@refinedev/core';
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
  BookOpen,
  GitBranch,
  Rocket,
  Clock,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { format } from 'date-fns';

import {
  CourseStatusBadge,
  QualityScore,
  SkillsSummaryCard,
  EpisodeList,
  PracticeSessions,
} from './components';

function safeFormat(
  dateStr: string | null | undefined,
  formatStr: string,
): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return format(date, formatStr);
  } catch {
    return '-';
  }
}

interface SkillsSummary {
  foundational_skills?: string[];
  combined_skills?: string[];
  integrated_skills?: string[];
  total_skills_count?: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  status: string;
  qualityScore: number | null;
  totalEpisodes: number;
  totalDuration: number | null;
  totalPracticeSessions?: number;
  language: string;
  bookId: string;
  pipelineRunId: string | null;
  skillsSummary: SkillsSummary | null;
  book?: {
    title: string;
  };
  createdAt: string;
  approvedAt: string | null;
  deployedAt: string | null;
}

export function CourseShowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const courseId = id ?? '';

  // Fetch course
  const { queryResult, refetch } = useShow<Course>({
    resource: 'courses',
    id: courseId,
    queryOptions: { enabled: !!courseId },
  });

  const { data, isLoading, isError } = queryResult;
  const course = data?.data;

  // Deploy mutation
  const { mutate: deployCourse, isLoading: deploying } = useCustomMutation();

  const handleDeploy = () => {
    deployCourse(
      {
        url: `/courses/${courseId}/deploy`,
        method: 'post',
        values: {},
      },
      {
        onSuccess: () => {
          toast.success('Course deployed successfully');
          refetch();
        },
        onError: () => {
          toast.error('Failed to deploy course');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <LoadingSkeleton variant="card" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load course</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/admin/courses')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Courses
      </Button>

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{course.title}</h1>
              <CourseStatusBadge status={course.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              {course.description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* View Book */}
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/books/${course.bookId}`)}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            View Book
          </Button>

          {/* View Pipeline */}
          {course.pipelineRunId && (
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/pipelines/${course.pipelineRunId}`)}
            >
              <GitBranch className="mr-2 h-4 w-4" />
              View Pipeline
            </Button>
          )}

          {/* Deploy */}
          {course.status === 'APPROVED' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deploy Course?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will make the course available to users. This action can
                    be reversed by archiving the course later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeploy} disabled={deploying}>
                    {deploying ? 'Deploying...' : 'Deploy Course'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Quality Score</p>
            <QualityScore score={course.qualityScore} size="md" />
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Episodes</p>
            <div className="flex items-center gap-2 mt-1">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-semibold tabular-nums">
                {course.totalEpisodes}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Duration</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-semibold tabular-nums">
                {course.totalDuration ? `${course.totalDuration} min` : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Practice Sessions</p>
            <div className="flex items-center gap-2 mt-1">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-semibold tabular-nums">
                {course.totalPracticeSessions ?? 9}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="episodes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="practice">Practice Sessions</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="episodes">
          <Card className="border border-border">
            <CardContent className="p-0">
              <EpisodeList courseId={courseId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="practice">
          <PracticeSessions courseId={courseId} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsSummaryCard skills={course.skillsSummary} />
        </TabsContent>

        <TabsContent value="details">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Course Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Course ID</dt>
                  <dd className="font-mono text-xs mt-1">{course.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Book ID</dt>
                  <dd className="font-mono text-xs mt-1">{course.bookId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Pipeline ID</dt>
                  <dd className="font-mono text-xs mt-1">
                    {course.pipelineRunId ?? '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Language</dt>
                  <dd className="mt-1">{course.language}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created At</dt>
                  <dd className="mt-1">{safeFormat(course.createdAt, 'PPpp')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Approved At</dt>
                  <dd className="mt-1">
                    {safeFormat(course.approvedAt, 'PPpp')}
                  </dd>
                </div>
                {course.deployedAt && (
                  <div>
                    <dt className="text-muted-foreground">Deployed At</dt>
                    <dd className="mt-1">
                      {safeFormat(course.deployedAt, 'PPpp')}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CourseShowPage;

