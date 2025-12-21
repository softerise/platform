import { Injectable } from '@nestjs/common';
// Prisma used both as runtime namespace (Decimal) and for types.
import {
  Prisma,
  type Course,
  type HumanReview,
  type PipelineRun,
  type PipelineStep,
  type PipelineStatus,
  type ReviewDecision,
  type ReviewType,
  type StepExecution,
  type StepStatus,
  type StepType,
} from '@prisma/client';
import { PrismaService } from '../_core';

export interface PipelineFilters {
  status?: PipelineStatus[];
  bookId?: string;
  page: number;
  pageSize: number;
}

export interface CreatePipelineData {
  bookId: string;
  status?: PipelineStatus;
  currentStep?: PipelineStep | null;
  currentStepNumber?: number | null;
  totalSteps?: number;
  progress?: number;
  initiatedBy?: string | null;
  revisionCount?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  checkpointData?: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
  configuration?: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
}

export interface UpdatePipelineData {
  status?: PipelineStatus;
  currentStep?: PipelineStep | null;
  currentStepNumber?: number | null;
  totalSteps?: number;
  progress?: number;
  revisionCount?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  checkpointData?: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
  configuration?: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
  initiatedBy?: string | null;
}

export interface CreateStepData {
  pipelineRunId: string;
  bookId: string;
  stepType: StepType;
  stepNumber: number;
  episodeNumber?: number | null;
  status?: StepStatus;
  retryCount?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMs?: number | null;
  promptVersion?: string | null;
  llmProvider?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  errorMessage?: string | null;
  inputSnapshot?: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
  outputData?: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
}

export interface UpdateStepData {
  status?: StepStatus;
  retryCount?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMs?: number | null;
  promptVersion?: string | null;
  llmProvider?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  errorMessage?: string | null;
  inputSnapshot?: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
  outputData?: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
}

export type PipelineRunWithRelations = Prisma.PipelineRunGetPayload<{
  include: {
    book: { select: { id: true; title: true } };
    initiatedByAdmin: { select: { id: true; displayName: true } };
  };
}>;

type BookForPipeline = Prisma.BookGetPayload<{
  select: {
    id: true;
    title: true;
    language: true;
    isPipelineEligible: true;
    chaptersLocked: true;
    pipelineRun: { select: { id: true; status: true } };
    _count: { select: { chapters: true } };
  };
}>;

interface CreateHumanReviewData {
  pipelineRunId: string;
  stepType: StepType;
  reviewType: ReviewType;
  decision: ReviewDecision;
  reviewedBy: string;
  reviewedAt: Date;
  comments?: string | null;
  selectedIdeaId?: string | null;
}

interface CreateCourseData {
  pipelineRunId: string;
  bookId: string;
  title: string;
  language: string;
  totalEpisodes: number;
  status: Course['status'];
  approvedAt?: Date;
}

@Injectable()
export class PipelineRepository {
  constructor(private readonly prisma: PrismaService) { }

  // PipelineRun methods
  async create(data: CreatePipelineData): Promise<PipelineRun> {
    return this.prisma.pipelineRun.create({
      data: {
        bookId: data.bookId,
        status: data.status ?? 'CREATED',
        currentStep: data.currentStep ?? null,
        currentStepNumber: data.currentStepNumber ?? null,
        totalSteps: data.totalSteps ?? 7,
        progress: new Prisma.Decimal(data.progress ?? 0),
        initiatedBy: data.initiatedBy ?? null,
        revisionCount: data.revisionCount ?? 0,
        startedAt: data.startedAt ?? null,
        completedAt: data.completedAt ?? null,
        errorMessage: data.errorMessage ?? null,
        checkpointData: data.checkpointData ?? Prisma.JsonNull,
        configuration: data.configuration ?? Prisma.JsonNull,
      },
    });
  }

  async findById(id: string): Promise<PipelineRunWithRelations | null> {
    return this.prisma.pipelineRun.findUnique({
      where: { id },
      include: {
        book: { select: { id: true, title: true } },
        initiatedByAdmin: { select: { id: true, displayName: true } },
      },
    });
  }

  async findByBookId(bookId: string): Promise<PipelineRunWithRelations | null> {
    return this.prisma.pipelineRun.findFirst({
      where: { bookId },
      include: {
        book: { select: { id: true, title: true } },
        initiatedByAdmin: { select: { id: true, displayName: true } },
      },
    });
  }

  async findMany(filters: PipelineFilters): Promise<{ pipelines: PipelineRunWithRelations[]; total: number }> {
    const where: Prisma.PipelineRunWhereInput = {};

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }
    if (filters.bookId) {
      where.bookId = filters.bookId;
    }

    const [pipelines, total] = await this.prisma.$transaction([
      this.prisma.pipelineRun.findMany({
        where,
        include: {
          book: { select: { id: true, title: true } },
          initiatedByAdmin: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.pipelineRun.count({ where }),
    ]);

    return { pipelines, total };
  }

  async update(id: string, data: UpdatePipelineData): Promise<PipelineRun> {
    const { progress, checkpointData, configuration, ...rest } = data;
    const payload: Prisma.PipelineRunUpdateInput = {
      ...rest,
    };

    if (progress !== undefined) {
      payload.progress = new Prisma.Decimal(progress);
    }
    if (checkpointData !== undefined) {
      payload.checkpointData = checkpointData ?? Prisma.JsonNull;
    }
    if (configuration !== undefined) {
      payload.configuration = configuration ?? Prisma.JsonNull;
    }

    return this.prisma.pipelineRun.update({
      where: { id },
      data: payload,
    });
  }

  // Check methods
  async hasActivePipeline(bookId: string): Promise<boolean> {
    const activeStatuses: PipelineStatus[] = [
      'CREATED',
      'RUNNING',
      'PAUSED',
      'WAITING_REVIEW',
      'STUCK',
      'APPROVED',
    ];

    const existing = await this.prisma.pipelineRun.findFirst({
      where: { bookId, status: { in: activeStatuses } },
      select: { id: true },
    });

    return !!existing;
  }

  async hasCompletedCourse(bookId: string): Promise<boolean> {
    const course = await this.prisma.course.findFirst({
      where: { bookId },
      select: { id: true },
    });

    return !!course;
  }

  // StepExecution methods
  async createStep(data: CreateStepData): Promise<StepExecution> {
    return this.prisma.stepExecution.create({
      data: {
        pipelineRunId: data.pipelineRunId,
        bookId: data.bookId,
        stepType: data.stepType,
        stepNumber: data.stepNumber,
        episodeNumber: data.episodeNumber ?? null,
        status: data.status ?? 'PENDING',
        retryCount: data.retryCount ?? 0,
        startedAt: data.startedAt ?? null,
        completedAt: data.completedAt ?? null,
        durationMs: data.durationMs ?? null,
        promptVersion: data.promptVersion ?? null,
        llmProvider: data.llmProvider ?? null,
        inputTokens: data.inputTokens ?? null,
        outputTokens: data.outputTokens ?? null,
        errorMessage: data.errorMessage ?? null,
        inputSnapshot: data.inputSnapshot ?? Prisma.JsonNull,
        outputData: data.outputData ?? Prisma.JsonNull,
      },
    });
  }

  async findStepsByPipelineId(pipelineRunId: string): Promise<StepExecution[]> {
    return this.prisma.stepExecution.findMany({
      where: { pipelineRunId },
      orderBy: [{ stepNumber: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findStepById(id: string): Promise<StepExecution | null> {
    return this.prisma.stepExecution.findUnique({ where: { id } });
  }

  async findStepByType(pipelineRunId: string, stepType: StepType): Promise<StepExecution | null> {
    return this.prisma.stepExecution.findFirst({
      where: { pipelineRunId, stepType },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findStepByTypeAndEpisode(
    pipelineRunId: string,
    stepType: StepType,
    episodeNumber?: number,
  ): Promise<StepExecution | null> {
    return this.prisma.stepExecution.findFirst({
      where: {
        pipelineRunId,
        stepType,
        ...(episodeNumber !== undefined ? { episodeNumber } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStep(id: string, data: UpdateStepData): Promise<StepExecution> {
    const { inputSnapshot, outputData, ...rest } = data;
    const payload: Prisma.StepExecutionUpdateInput = { ...rest };
    if (inputSnapshot !== undefined) {
      payload.inputSnapshot = inputSnapshot ?? Prisma.JsonNull;
    }
    if (outputData !== undefined) {
      payload.outputData = outputData ?? Prisma.JsonNull;
    }

    return this.prisma.stepExecution.update({
      where: { id },
      data: payload,
    });
  }

  // Book helpers
  async getBookForPipeline(bookId: string): Promise<BookForPipeline | null> {
    return this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        language: true,
        isPipelineEligible: true,
        chaptersLocked: true,
        pipelineRun: { select: { id: true, status: true } },
        _count: { select: { chapters: true } },
      },
    });
  }

  async setChaptersLocked(bookId: string, locked: boolean) {
    return this.prisma.book.update({
      where: { id: bookId },
      data: { chaptersLocked: locked },
    });
  }

  async getBookWithChapters(bookId: string) {
    return this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        description: true,
        language: true,
        s1Verdict: true,
        s1VerdictConfidence: true,
        s1PrimarySpiId: true,
        s1PrimarySpiName: true,
        s1Output: true,
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          select: {
            chapterNumber: true,
            chapterTitle: true,
            content: true,
          },
        },
      },
    });
  }

  // Human reviews
  async createHumanReview(data: CreateHumanReviewData): Promise<HumanReview> {
    return this.prisma.humanReview.create({ data });
  }

  // Course creation (minimal fields)
  async createCourse(data: CreateCourseData): Promise<Course> {
    return this.prisma.course.create({
      data: {
        pipelineRunId: data.pipelineRunId,
        bookId: data.bookId,
        title: data.title,
        language: data.language,
        totalEpisodes: data.totalEpisodes,
        status: data.status,
        approvedAt: data.approvedAt,
      },
    });
  }

  async deleteStepExecutions(pipelineRunId: string): Promise<void> {
    await this.prisma.stepExecution.deleteMany({ where: { pipelineRunId } });
  }

  async countCompletedEpisodes(pipelineRunId: string, stepType: StepType): Promise<number> {
    return this.prisma.stepExecution.count({
      where: { pipelineRunId, stepType, status: 'SUCCESS' },
    });
  }

  async findByStatus(status: PipelineStatus): Promise<PipelineRunWithRelations[]> {
    return this.prisma.pipelineRun.findMany({
      where: { status },
      include: {
        book: { select: { id: true, title: true } },
        initiatedByAdmin: { select: { id: true, displayName: true } },
      },
    });
  }

  // ============================================================================
  // Metrics & Analytics
  // ============================================================================

  async getStatusCounts(): Promise<{ status: PipelineStatus; count: number }[]> {
    const counts = await this.prisma.pipelineRun.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return counts.map((c) => ({ status: c.status, count: c._count.id }));
  }

  async getDurationStats(): Promise<{ avg: number; min: number; max: number }> {
    const result = await this.prisma.$queryRaw<
      { avg_minutes: number; min_minutes: number; max_minutes: number }[]
    >`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as avg_minutes,
        MIN(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as min_minutes,
        MAX(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as max_minutes
      FROM pipeline_runs
      WHERE status = 'APPROVED' AND completed_at IS NOT NULL AND started_at IS NOT NULL
    `;
    return {
      avg: result[0]?.avg_minutes ?? 0,
      min: result[0]?.min_minutes ?? 0,
      max: result[0]?.max_minutes ?? 0,
    };
  }

  async getStepStats(): Promise<
    {
      stepType: StepType;
      total: number;
      success: number;
      fail: number;
      avgDuration: number;
      avgRetries: number;
    }[]
  > {
    const stats = await this.prisma.$queryRaw<
      {
        step_type: StepType;
        total: bigint;
        success: bigint;
        fail: bigint;
        avg_duration: number;
        avg_retries: number;
      }[]
    >`
      SELECT 
        step_type,
        COUNT(*)::bigint as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END)::bigint as success,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END)::bigint as fail,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration,
        AVG(retry_count) as avg_retries
      FROM step_executions
      GROUP BY step_type
    `;
    return stats.map((s) => ({
      stepType: s.step_type,
      total: Number(s.total),
      success: Number(s.success),
      fail: Number(s.fail),
      avgDuration: s.avg_duration ?? 0,
      avgRetries: s.avg_retries ?? 0,
    }));
  }

  async getRecentActivityCounts(): Promise<{
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [last24Hours, last7Days, last30Days] = await Promise.all([
      this.prisma.pipelineRun.count({ where: { createdAt: { gte: oneDayAgo } } }),
      this.prisma.pipelineRun.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.pipelineRun.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    return { last24Hours, last7Days, last30Days };
  }

  async getWeeklyComparison(): Promise<{ thisWeek: number; lastWeek: number }> {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const [thisWeek, lastWeek] = await Promise.all([
      this.prisma.pipelineRun.count({
        where: { createdAt: { gte: startOfThisWeek } },
      }),
      this.prisma.pipelineRun.count({
        where: {
          createdAt: { gte: startOfLastWeek, lt: startOfThisWeek },
        },
      }),
    ]);

    return { thisWeek, lastWeek };
  }

  // ============================================================================
  // Timeline
  // ============================================================================

  async findHumanReviewsByPipelineId(
    pipelineRunId: string,
  ): Promise<
    Prisma.HumanReviewGetPayload<{
      include: { reviewedByAdmin: { select: { displayName: true } } };
    }>[]
  > {
    return this.prisma.humanReview.findMany({
      where: { pipelineRunId },
      include: { reviewedByAdmin: { select: { displayName: true } } },
      orderBy: { reviewedAt: 'asc' },
    });
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  async findManyByIds(ids: string[]): Promise<PipelineRunWithRelations[]> {
    return this.prisma.pipelineRun.findMany({
      where: { id: { in: ids } },
      include: {
        book: { select: { id: true, title: true } },
        initiatedByAdmin: { select: { id: true, displayName: true } },
      },
    });
  }
}


