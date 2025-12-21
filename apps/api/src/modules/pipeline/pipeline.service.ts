import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PipelineStatus, StepExecution, StepType } from '@prisma/client';
import type { CurrentUserData } from '../_core';
import { QueueService } from '../queue/queue.service';
import {
  CancelPipelineDto,
  CancelPipelineSchema,
  CreatePipelineDto,
  CreatePipelineSchema,
  ListPipelinesQueryDto,
  ListPipelinesQuerySchema,
  SubmitReviewDto,
  SubmitReviewSchema,
  type PipelineListResponse,
  type PipelineProgressDto,
  type PipelineResponseDto,
  type PipelineSummaryDto,
  type StepSummaryDto,
} from './pipeline.dto';
import type {
  PipelineMetricsDto,
  PipelineTimelineDto,
  TimelineEventDto,
  StepOutputDto,
  BulkCancelResultDto,
  RetryStepResultDto,
} from './dto/pipeline-metrics.dto';
import {
  PipelineRepository,
  type UpdatePipelineData,
  type PipelineRunWithRelations,
} from './pipeline.repository';
import {
  ChaptersLockedEvent,
  PIPELINE_EVENTS,
  PipelineCancelledEvent,
  PipelineResumedEvent,
  PipelineStartedEvent,
  PipelineStatusChangedEvent,
} from './pipeline.events';
import { PipelineStateMachine } from './pipeline-state-machine';
import { PipelineOrchestratorService } from './pipeline-orchestrator.service';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly repository: PipelineRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly orchestrator: PipelineOrchestratorService,
    private readonly queueService: QueueService,
  ) {}

  async startPipeline(
    dto: CreatePipelineDto,
    user: CurrentUserData | null,
  ): Promise<PipelineResponseDto> {
    const payload = CreatePipelineSchema.parse(dto);
    const userId = this.ensureUser(user);
    const pipeline = await this.orchestrator.startPipeline(payload.bookId, userId);
    return this.mapPipelineResponse(pipeline);
  }

  async getPipeline(id: string): Promise<PipelineResponseDto> {
    const pipeline = await this.ensurePipeline(id);
    return this.mapPipelineResponse(pipeline);
  }

  async listPipelines(query: ListPipelinesQueryDto): Promise<PipelineListResponse> {
    const params = ListPipelinesQuerySchema.parse(query);
    const { pipelines, total } = await this.repository.findMany(params);

    return {
      pipelines: pipelines.map((p) => this.mapPipelineSummary(p)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async getPipelineSteps(id: string): Promise<{ pipelineRunId: string; steps: StepSummaryDto[] }> {
    const pipeline = await this.ensurePipeline(id);
    const steps = await this.repository.findStepsByPipelineId(pipeline.id);

    return {
      pipelineRunId: pipeline.id,
      steps: steps.map((step) => this.mapStepSummary(step)),
    };
  }

  async getPipelineProgress(id: string): Promise<PipelineProgressDto> {
    const pipeline = await this.ensurePipeline(id);

    const currentStepProgress =
      pipeline.currentStepNumber && pipeline.totalSteps
        ? `Step ${pipeline.currentStepNumber}/${pipeline.totalSteps}`
        : 'Not started';

    return {
      pipelineRunId: pipeline.id,
      status: pipeline.status,
      progress: Number(pipeline.progress ?? 0),
      currentStep: (pipeline.currentStep as unknown as StepType | null) ?? null,
      currentStepProgress,
      estimatedRemainingMinutes: null,
    };
  }

  async cancelPipeline(id: string, dto: CancelPipelineDto): Promise<{ success: boolean; message: string }> {
    const payload = CancelPipelineSchema.parse(dto ?? {});
    const pipeline = await this.ensurePipeline(id);

    if (!PipelineStateMachine.canCancel(pipeline.status)) {
      throw new BadRequestException({
        code: 'PIP-004',
        message: `Cannot cancel pipeline from status ${pipeline.status}`,
      });
    }

    await this.transitionTo(pipeline, 'CANCELLED', {
      errorMessage: payload.reason ?? pipeline.errorMessage ?? null,
    });

    this.eventEmitter.emit(
      PIPELINE_EVENTS.CANCELLED,
      new PipelineCancelledEvent(pipeline.id, pipeline.bookId, payload.reason ?? null),
    );

    return { success: true, message: 'Pipeline cancelled' };
  }

  async resumePipeline(id: string): Promise<{ success: boolean; resumeFrom: string }> {
    return this.orchestrator.resumePipeline(id);
  }

  async submitReview(id: string, dto: SubmitReviewDto, user: CurrentUserData | null) {
    const payload = SubmitReviewSchema.parse(dto);
    if (!user?.uid) {
      throw new BadRequestException({ code: 'AUTH-001', message: 'Authentication required' });
    }
    return this.orchestrator.submitHumanReview(
      id,
      payload.stepType,
      payload.decision as any,
      user.uid,
      payload.comments,
      payload.selectedIdeaId,
    );
  }

  async getPendingReviews() {
    return this.repository.findByStatus('WAITING_REVIEW');
  }

  /**
   * Debug endpoint to check step output_data status
   */
  async getStepOutputDebug(pipelineRunId: string): Promise<any[]> {
    const pipeline = await this.ensurePipeline(pipelineRunId);
    const steps = await this.repository.findStepsByPipelineId(pipeline.id);
    
    return steps.map(step => {
      const outputData = step.outputData as any;
      const parsed = outputData?.parsed;
      
      // S5-specific debug info
      let s5Debug = null;
      if (step.stepType === 'S5_EPISODE_CONTENT' && parsed?.episode_content) {
        const episodeContent = parsed.episode_content;
        const productionOutput = episodeContent?.production_output;
        s5Debug = {
          hasEpisodeContent: !!episodeContent,
          hasProductionOutput: !!productionOutput,
          productionOutputKeys: productionOutput ? Object.keys(productionOutput) : null,
          textContentType: typeof productionOutput?.text_content,
          textContentLength: typeof productionOutput?.text_content === 'string' 
            ? productionOutput.text_content.length 
            : null,
          textContentPreview: typeof productionOutput?.text_content === 'string'
            ? productionOutput.text_content.substring(0, 100) + '...'
            : null,
          totalWordCount: productionOutput?.total_word_count,
        };
      }

      return {
        id: step.id,
        stepType: step.stepType,
        stepNumber: step.stepNumber,
        status: step.status,
        episodeNumber: step.episodeNumber,
        outputDataType: typeof step.outputData,
        outputDataIsNull: step.outputData === null,
        outputDataIsJsonNull: step.outputData === 'null' || JSON.stringify(step.outputData) === 'null',
        outputDataKeys: step.outputData && typeof step.outputData === 'object' 
          ? Object.keys(step.outputData as object) 
          : null,
        hasParsed: step.outputData && typeof step.outputData === 'object' 
          ? 'parsed' in (step.outputData as object)
          : false,
        hasRaw: step.outputData && typeof step.outputData === 'object' 
          ? 'raw' in (step.outputData as object)
          : false,
        hasSummary: step.outputData && typeof step.outputData === 'object' 
          ? 'summary' in (step.outputData as object)
          : false,
        s5Debug,
      };
    });
  }

  private async ensurePipeline(id: string): Promise<PipelineRunWithRelations> {
    const pipeline = await this.repository.findById(id);
    if (!pipeline) {
      throw new NotFoundException({ code: 'PIP-003', message: 'Pipeline not found' });
    }
    return pipeline;
  }

  private ensureUser(user: CurrentUserData | null): string {
    if (!user?.uid) {
      throw new BadRequestException({ code: 'AUTH-001', message: 'Authentication required' });
    }
    return user.uid;
  }

  private isActiveStatus(status: PipelineStatus): boolean {
    return ['CREATED', 'RUNNING', 'PAUSED', 'WAITING_REVIEW', 'STUCK', 'APPROVED'].includes(status);
  }

  private mapPipelineResponse(pipeline: PipelineRunWithRelations): PipelineResponseDto {
    return {
      id: pipeline.id,
      bookId: pipeline.bookId,
      bookTitle: pipeline.book?.title ?? '',
      status: pipeline.status,
      currentStep: (pipeline.currentStep as unknown as StepType | null) ?? null,
      currentStepNumber: pipeline.currentStepNumber,
      progress: Number(pipeline.progress ?? 0),
      revisionCount: pipeline.revisionCount ?? 0,
      startedAt: pipeline.startedAt ? pipeline.startedAt.toISOString() : null,
      completedAt: pipeline.completedAt ? pipeline.completedAt.toISOString() : null,
      initiatedBy: {
        id: pipeline.initiatedBy ?? '',
        displayName: pipeline.initiatedByAdmin?.displayName ?? 'System',
      },
      errorMessage: pipeline.errorMessage ?? null,
    };
  }

  private mapPipelineSummary(pipeline: PipelineRunWithRelations): PipelineSummaryDto {
    return {
      id: pipeline.id,
      bookId: pipeline.bookId,
      bookTitle: pipeline.book?.title ?? '',
      status: pipeline.status,
      progress: Number(pipeline.progress ?? 0),
      currentStep: (pipeline.currentStep as unknown as StepType | null) ?? null,
      startedAt: pipeline.startedAt ? pipeline.startedAt.toISOString() : null,
    };
  }

  private mapStepSummary(step: StepExecution): StepSummaryDto {
    const inferredDuration =
      step.durationMs ??
      (step.startedAt && step.completedAt ? step.completedAt.getTime() - step.startedAt.getTime() : null);

    return {
      id: step.id,
      stepType: step.stepType,
      stepNumber: step.stepNumber,
      status: step.status,
      episodeNumber: step.episodeNumber ?? null,
      startedAt: step.startedAt ? step.startedAt.toISOString() : null,
      completedAt: step.completedAt ? step.completedAt.toISOString() : null,
      durationMs: inferredDuration,
      retryCount: step.retryCount ?? 0,
    };
  }

  private async transitionTo(
    pipeline: PipelineRunWithRelations,
    newStatus: PipelineStatus,
    extra?: UpdatePipelineData,
  ): Promise<PipelineRunWithRelations> {
    if (!PipelineStateMachine.canTransition(pipeline.status, newStatus)) {
      throw new BadRequestException({
        code: 'PIP-004',
        message: `Cannot transition from ${pipeline.status} to ${newStatus}`,
      });
    }

    const now = new Date();
    const updatePayload: UpdatePipelineData = {
      status: newStatus,
      ...extra,
    };

    if (newStatus === 'RUNNING' && !pipeline.startedAt) {
      updatePayload.startedAt = now;
    }

    if (PipelineStateMachine.isTerminal(newStatus)) {
      updatePayload.completedAt = now;
    }

    await this.repository.update(pipeline.id, updatePayload);
    const refreshed = await this.repository.findById(pipeline.id);
    if (!refreshed) {
      throw new NotFoundException({ code: 'PIP-003', message: 'Pipeline not found after transition' });
    }

    this.logger.log(`Pipeline ${pipeline.id} transitioned ${pipeline.status} -> ${newStatus}`);
    this.eventEmitter.emit(
      PIPELINE_EVENTS.STATUS_CHANGED,
      new PipelineStatusChangedEvent(pipeline.id, pipeline.status, newStatus, now.toISOString()),
    );

    return refreshed;
  }

  // ============================================================================
  // Operations Endpoints
  // ============================================================================

  async getMetrics(): Promise<PipelineMetricsDto> {
    const [statusCounts, durationStats, stepStats, recentActivity, weeklyComparison] =
      await Promise.all([
        this.repository.getStatusCounts(),
        this.repository.getDurationStats(),
        this.repository.getStepStats(),
        this.repository.getRecentActivityCounts(),
        this.repository.getWeeklyComparison(),
      ]);

    const total = statusCounts.reduce((sum, c) => sum + c.count, 0);
    const running = statusCounts.find((c) => c.status === 'RUNNING')?.count ?? 0;
    const completed = statusCounts.find((c) => c.status === 'APPROVED')?.count ?? 0;
    const failed = statusCounts.find((c) => c.status === 'FAILED')?.count ?? 0;
    const cancelled = statusCounts.find((c) => c.status === 'CANCELLED')?.count ?? 0;

    const successRate = total > 0 ? (completed / total) * 100 : 0;
    const changePercent =
      weeklyComparison.lastWeek > 0
        ? ((weeklyComparison.thisWeek - weeklyComparison.lastWeek) / weeklyComparison.lastWeek) * 100
        : 0;

    return {
      overview: {
        total,
        running,
        completed,
        failed,
        cancelled,
        successRate: Math.round(successRate * 100) / 100,
      },
      timing: {
        avgDurationMinutes: Math.round(durationStats.avg * 100) / 100,
        fastestMinutes: Math.round(durationStats.min * 100) / 100,
        slowestMinutes: Math.round(durationStats.max * 100) / 100,
      },
      stepStats: stepStats.map((s) => ({
        stepType: s.stepType,
        totalExecutions: s.total,
        successCount: s.success,
        failCount: s.fail,
        avgDurationSeconds: Math.round(s.avgDuration * 100) / 100,
        avgRetries: Math.round(s.avgRetries * 100) / 100,
      })),
      recentActivity,
      periodComparison: {
        thisWeek: weeklyComparison.thisWeek,
        lastWeek: weeklyComparison.lastWeek,
        changePercent: Math.round(changePercent * 100) / 100,
      },
    };
  }

  async getTimeline(id: string): Promise<PipelineTimelineDto> {
    const pipeline = await this.ensurePipeline(id);
    const [steps, reviews] = await Promise.all([
      this.repository.findStepsByPipelineId(id),
      this.repository.findHumanReviewsByPipelineId(id),
    ]);

    const timeline: TimelineEventDto[] = [];

    // Add pipeline creation event
    timeline.push({
      timestamp: pipeline.createdAt.toISOString(),
      event: 'CREATED',
      stepType: null,
      episodeNumber: null,
      details: {},
    });

    // Add step events
    for (const step of steps) {
      if (step.startedAt) {
        timeline.push({
          timestamp: step.startedAt.toISOString(),
          event: 'STEP_STARTED',
          stepType: step.stepType,
          episodeNumber: step.episodeNumber,
          details: { retryCount: step.retryCount },
        });
      }
      if (step.completedAt) {
        const durationMs = step.durationMs ?? (step.startedAt ? step.completedAt.getTime() - step.startedAt.getTime() : null);
        timeline.push({
          timestamp: step.completedAt.toISOString(),
          event: step.status === 'SUCCESS' ? 'STEP_COMPLETED' : 'STEP_FAILED',
          stepType: step.stepType,
          episodeNumber: step.episodeNumber,
          details: {
            status: step.status,
            duration: durationMs ? Math.round(durationMs / 1000) : undefined,
            retryCount: step.retryCount,
            error: step.errorMessage ?? undefined,
          },
        });
      }
    }

    // Add review events
    for (const review of reviews) {
      timeline.push({
        timestamp: review.reviewedAt.toISOString(),
        event: 'REVIEW_SUBMITTED',
        stepType: review.stepType,
        episodeNumber: null,
        details: { decision: review.decision },
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Determine current step
    const activeStep = steps.find((s) => s.status === 'RUNNING');
    let currentStep = null;
    if (activeStep) {
      currentStep = {
        stepType: activeStep.stepType,
        status: activeStep.status,
        startedAt: activeStep.startedAt?.toISOString() ?? '',
        progress: activeStep.episodeNumber
          ? `Episode ${activeStep.episodeNumber}`
          : 'Processing...',
      };
    }

    return {
      pipelineId: pipeline.id,
      bookTitle: pipeline.book?.title ?? 'Unknown',
      status: pipeline.status,
      timeline,
      currentStep,
    };
  }

  async getStepOutput(
    pipelineId: string,
    stepType: string,
    episodeNumber?: number,
  ): Promise<StepOutputDto> {
    await this.ensurePipeline(pipelineId);

    const step = await this.repository.findStepByTypeAndEpisode(
      pipelineId,
      stepType as StepType,
      episodeNumber,
    );

    if (!step) {
      throw new NotFoundException({
        code: 'STEP-001',
        message: `Step ${stepType} not found${episodeNumber ? ` for episode ${episodeNumber}` : ''}`,
      });
    }

    let output = null;
    if (step.outputData && typeof step.outputData === 'object') {
      const data = step.outputData as { raw?: string; parsed?: object; summary?: object };
      output = {
        raw: typeof data.raw === 'string' ? data.raw : JSON.stringify(step.outputData),
        parsed: data.parsed ?? null,
        summary: data.summary ?? null,
      };
    }

    const durationMs = step.durationMs ?? (step.startedAt && step.completedAt
      ? step.completedAt.getTime() - step.startedAt.getTime()
      : null);

    return {
      stepExecution: {
        id: step.id,
        stepType: step.stepType,
        status: step.status,
        startedAt: step.startedAt?.toISOString() ?? null,
        completedAt: step.completedAt?.toISOString() ?? null,
        durationSeconds: durationMs ? Math.round(durationMs / 1000) : null,
        retryCount: step.retryCount ?? 0,
        episodeNumber: step.episodeNumber,
      },
      output,
      prompt: null, // Only in debug mode
    };
  }

  async bulkCancel(pipelineIds: string[], reason?: string): Promise<BulkCancelResultDto> {
    const results: BulkCancelResultDto = {
      successful: [],
      failed: [],
      summary: { total: pipelineIds.length, successCount: 0, failCount: 0 },
    };

    const pipelines = await this.repository.findManyByIds(pipelineIds);
    const pipelineMap = new Map(pipelines.map((p) => [p.id, p]));

    for (const id of pipelineIds) {
      try {
        const pipeline = pipelineMap.get(id);
        if (!pipeline) {
          results.failed.push({ id, error: 'Pipeline not found' });
          continue;
        }

        if (!['RUNNING', 'WAITING_REVIEW', 'PAUSED'].includes(pipeline.status)) {
          results.failed.push({ id, error: `Cannot cancel ${pipeline.status} pipeline` });
          continue;
        }

        await this.transitionTo(pipeline, 'CANCELLED', {
          errorMessage: reason ?? null,
        });

        this.eventEmitter.emit(
          PIPELINE_EVENTS.CANCELLED,
          new PipelineCancelledEvent(pipeline.id, pipeline.bookId, reason ?? null),
        );

        results.successful.push(id);
      } catch (error) {
        results.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    results.summary.successCount = results.successful.length;
    results.summary.failCount = results.failed.length;

    return results;
  }

  async retryStep(pipelineId: string, stepExecutionId: string): Promise<RetryStepResultDto> {
    const pipeline = await this.ensurePipeline(pipelineId);
    const step = await this.repository.findStepById(stepExecutionId);

    if (!step) {
      throw new NotFoundException({ code: 'STEP-001', message: 'Step execution not found' });
    }

    if (step.pipelineRunId !== pipelineId) {
      throw new BadRequestException({
        code: 'STEP-002',
        message: 'Step does not belong to this pipeline',
      });
    }

    if (step.status !== 'FAILED') {
      throw new BadRequestException({
        code: 'STEP-003',
        message: `Only FAILED steps can be retried, current status: ${step.status}`,
      });
    }

    // Reset step status
    await this.repository.updateStep(stepExecutionId, {
      status: 'PENDING',
      errorMessage: null,
    });

    // Re-queue the step
    const isEpisodeStep = ['S4_EPISODE_DRAFT', 'S5_EPISODE_CONTENT', 'S6_PRACTICE_CONTENT'].includes(
      step.stepType,
    );

    if (isEpisodeStep && step.episodeNumber) {
      await this.queueService.addEpisodeJob({
        pipelineRunId: pipelineId,
        bookId: step.bookId,
        stepType: step.stepType,
        episodeNumber: step.episodeNumber,
      });
    } else {
      await this.queueService.addStepJob({
        pipelineRunId: pipelineId,
        bookId: step.bookId,
        stepType: step.stepType,
      });
    }

    // Update pipeline status if needed
    if (pipeline.status === 'FAILED') {
      await this.repository.update(pipelineId, { status: 'RUNNING' });
    }

    return {
      stepExecutionId,
      stepType: step.stepType,
      message: 'Step queued for retry',
      queuedAt: new Date().toISOString(),
    };
  }
}


