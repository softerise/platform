import * as React from 'react';
import { useShow, useCustomMutation } from '@refinedev/core';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  LoadingSkeleton,
  ConfirmDialog,
  toast,
  Button,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@project/ui';
import {
  ArrowLeft,
  Pencil,
  Play,
  BookOpen,
  FileText,
  Calendar,
  Globe,
  User,
  Sparkles,
  Target,
  AlertCircle,
} from 'lucide-react';
import { VerdictBadge } from './components/verdict-badge';
import { EligibilityBadge } from './components/eligibility-badge';
import { PipelineStatusBadge } from './components/pipeline-status-badge';
import { ChaptersList } from './components/chapters-list';

interface Book {
  id: string;
  title: string;
  description: string;
  author?: string;
  language: string;
  s1Verdict?: string;
  s1Output?: {
    score: number;
    confidence: string;
    reasons?: string[];
  };
  isPipelineEligible: boolean;
  totalWordCount?: number;
  activePipelineId?: string;
  activePipelineStatus?: string;
  _count?: {
    chapters: number;
  };
  createdAt: string;
  updatedAt: string;
}

export function BookShowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bookId = id ?? '';

  const { queryResult } = useShow<Book>({
    resource: 'books',
    id: bookId,
    queryOptions: { enabled: !!bookId, queryKey: ['books', bookId] },
  });

  const { data, isLoading, isError, refetch } = queryResult;
  const book = data?.data;

  const [startPipelineDialogOpen, setStartPipelineDialogOpen] =
    React.useState(false);

  const { mutate: startPipeline, isLoading: startingPipeline } =
    useCustomMutation();

  const handleStartPipeline = () => {
    if (!book) return;

    startPipeline(
      {
        url: '/pipelines',
        method: 'post',
        values: { bookId: book.id },
      },
      {
        onSuccess: () => {
          toast.success('Pipeline started successfully');
          setStartPipelineDialogOpen(false);
          refetch();
        },
        onError: () => {
          toast.error('Failed to start pipeline');
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load book</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canStartPipeline =
    book.isPipelineEligible && !book.activePipelineId;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/books')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Books
      </Button>

      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{book.title}</h1>
                {book.author && (
                  <p className="text-muted-foreground">by {book.author}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <VerdictBadge verdict={book.s1Verdict} />
                  <EligibilityBadge eligible={book.isPipelineEligible} />
                  {book.activePipelineStatus && (
                    <PipelineStatusBadge status={book.activePipelineStatus} />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/books/${book.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              {canStartPipeline && (
                <Button onClick={() => setStartPipelineDialogOpen(true)}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Pipeline
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* S1 Evaluation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            S1 Evaluation
          </CardTitle>
          <CardDescription>
            AI assessment of book quality and pipeline eligibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          {book.s1Output ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Verdict</p>
                <div className="mt-1">
                  <VerdictBadge verdict={book.s1Verdict} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {book.s1Output.score}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="mt-1 text-lg font-semibold capitalize">
                  {book.s1Output.confidence?.toLowerCase() ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Pipeline Eligibility
                </p>
                <div className="mt-1">
                  <EligibilityBadge eligible={book.isPipelineEligible} />
                </div>
              </div>

              {!book.isPipelineEligible && book.s1Output.reasons && (
                <div className="col-span-full">
                  <Separator className="my-4" />
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-700">
                        Reasons for Ineligibility
                      </p>
                      <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                        {book.s1Output.reasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <Target className="mx-auto h-8 w-8 opacity-50" />
                <p className="mt-2">Evaluation pending...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Details & Chapters */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">
            <BookOpen className="mr-2 h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="chapters">
            <FileText className="mr-2 h-4 w-4" />
            Chapters ({book._count?.chapters ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{book.description}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  <InfoItem
                    icon={Globe}
                    label="Language"
                    value={book.language?.toUpperCase() ?? '—'}
                  />
                  <InfoItem
                    icon={FileText}
                    label="Total Word Count"
                    value={book.totalWordCount?.toLocaleString() ?? '0'}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Created"
                    value={new Date(book.createdAt).toLocaleDateString()}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Updated"
                    value={new Date(book.updatedAt).toLocaleDateString()}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chapters">
          <ChaptersList bookId={book.id} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={startPipelineDialogOpen}
        onOpenChange={setStartPipelineDialogOpen}
        title="Start Pipeline"
        description={`Are you sure you want to start the content pipeline for "${book.title}"? This will process the book through all AI stages.`}
        confirmLabel="Start Pipeline"
        onConfirm={handleStartPipeline}
        loading={startingPipeline}
      />
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export default BookShowPage;

