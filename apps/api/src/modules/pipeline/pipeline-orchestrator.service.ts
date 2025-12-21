import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PipelineRun, PipelineStatus, ReviewDecision, ReviewType, StepType } from '@prisma/client';
import { PipelineRepository } from './pipeline.repository';
import { QueueService } from '../queue/queue.service';
import { PIPELINE_EVENTS, PipelineStartedEvent, ChaptersLockedEvent } from './pipeline.events';
import { CheckpointService } from './checkpoint.service';
import { PipelineStateMachine } from './pipeline-state-machine';
import type { StepJobData } from '../queue/queue.types';
import { CourseService } from '../course/course.service';

@Injectable()
export class PipelineOrchestratorService {
  private readonly logger = new Logger(PipelineOrchestratorService.name);

  constructor(
    private readonly pipelineRepository: PipelineRepository,
    private readonly queueService: QueueService,
    private readonly checkpointService: CheckpointService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => CourseService))
    private readonly courseService: CourseService,
  ) {}

  /**
   * Start a pipeline and queue first step (S2)
   */
  async startPipeline(bookId: string, initiatedBy: string) {
    const book = await this.pipelineRepository.getBookForPipeline(bookId);
    if (!book) {
      throw new NotFoundException({ code: 'BOOK-002', message: 'Book not found' });
    }
    if (!book.isPipelineEligible) {
      throw new BadRequestException({ code: 'BOOK-003', message: 'Book not eligible for pipeline' });
    }
    if (book._count.chapters === 0) {
      throw new BadRequestException({ code: 'CHAP-004', message: 'Book has no chapters' });
    }

    const hasCourse = await this.pipelineRepository.hasCompletedCourse(bookId);
    if (hasCourse) {
      throw new ConflictException({ code: 'PIP-002', message: 'Book already has a completed course' });
    }

    const existing = await this.pipelineRepository.findByBookId(bookId);
    if (existing && PipelineStateMachine.isTerminal(existing.status) === false) {
      throw new ConflictException({ code: 'PIP-001', message: 'Book already has an active pipeline' });
    }

    const now = new Date();
    let pipelineRunId: string;
    if (existing) {
      const reset = await this.pipelineRepository.update(existing.id, {
        status: 'RUNNING',
        currentStep: 'S2_IDEA_INSPIRATION',
        currentStepNumber: 2,
        progress: 0,
        revisionCount: existing.revisionCount ?? 0,
        startedAt: now,
        completedAt: null,
        errorMessage: null,
        checkpointData: null,
        initiatedBy,
      });
      pipelineRunId = reset.id;
    } else {
      const created = await this.pipelineRepository.create({
        bookId,
        status: 'RUNNING',
        currentStep: 'S2_IDEA_INSPIRATION',
        currentStepNumber: 2,
        progress: 0,
        initiatedBy,
        startedAt: now,
      });
      pipelineRunId = created.id;
    }

    const pipeline = await this.pipelineRepository.findById(pipelineRunId);
    if (!pipeline) {
      throw new NotFoundException({ code: 'PIP-003', message: 'Pipeline not found after creation' });
    }

    await this.pipelineRepository.setChaptersLocked(bookId, true);
    this.eventEmitter.emit(
      PIPELINE_EVENTS.CHAPTERS_LOCKED,
      new ChaptersLockedEvent(bookId, pipeline.id, now.toISOString()),
    );
    this.eventEmitter.emit(PIPELINE_EVENTS.STARTED, new PipelineStartedEvent(pipeline.id, pipeline.bookId));

    await this.queueStep({
      pipelineRunId: pipeline.id,
      bookId: pipeline.bookId,
      stepType: 'S2_IDEA_INSPIRATION',
      stepNumber: 2,
      attempt: 1,
    });

    this.logger.log(`Pipeline ${pipeline.id} started and S2 queued`);
    return pipeline;
  }

  async queueStep(data: StepJobData) {
    if (data.stepType === 'S4_EPISODE_DRAFT' || data.stepType === 'S5_EPISODE_CONTENT') {
      await this.queueService.addEpisodeJob(data);
    } else {
      await this.queueService.addStepJob(data);
    }
  }

  async onStepCompleted(pipelineRunId: string, stepType: StepType, episodeNumber?: number) {
    const pipeline = await this.pipelineRepository.findById(pipelineRunId);
    if (!pipeline) return;

    await this.pipelineRepository.update(pipelineRunId, {
      progress: this.calculateProgress(stepType),
      currentStep: stepType,
      currentStepNumber: this.getStepNumber(stepType),
    });

    switch (stepType) {
      case 'S2_IDEA_INSPIRATION':
        await this.pauseForReview(pipelineRunId, stepType, 'IDEA_APPROVAL');
        break;
      case 'S3_COURSE_OUTLINE':
        await this.queueEpisodeBatch(pipelineRunId, pipeline.bookId, 'S4_EPISODE_DRAFT');
        break;
      case 'S4_EPISODE_DRAFT':
        if (await this.allEpisodesComplete(pipelineRunId, 'S4_EPISODE_DRAFT')) {
          await this.queueEpisodeBatch(pipelineRunId, pipeline.bookId, 'S5_EPISODE_CONTENT');
        }
        break;
      case 'S5_EPISODE_CONTENT':
        if (await this.allEpisodesComplete(pipelineRunId, 'S5_EPISODE_CONTENT')) {
          // Queue S6 for all 3 levels (BASIC, INTERMEDIATE, ADVANCED)
          await this.queuePracticeLevelBatch(pipelineRunId, pipeline.bookId);
        }
        break;
      case 'S6_PRACTICE_CONTENT':
        // Check if all 3 practice levels are complete
        if (await this.allPracticeLevelsComplete(pipelineRunId)) {
          await this.queueStep({
            pipelineRunId,
            bookId: pipeline.bookId,
            stepType: 'S7_FINAL_EVALUATION',
            stepNumber: 7,
            attempt: 1,
          });
        }
        break;
      case 'S7_FINAL_EVALUATION':
        await this.pauseForReview(pipelineRunId, stepType, 'FINAL_APPROVAL');
        break;
      default:
        break;
    }
  }

  private async pauseForReview(pipelineRunId: string, stepType: StepType, reviewType: ReviewType) {
    await this.pipelineRepository.update(pipelineRunId, { status: 'WAITING_REVIEW' });
    this.eventEmitter.emit('pipeline.review.required', {
      pipelineRunId,
      stepType,
      reviewType,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Pipeline ${pipelineRunId} paused for ${reviewType}`);
  }

  async submitHumanReview(
    pipelineRunId: string,
    stepType: StepType,
    decision: ReviewDecision,
    reviewedBy: string,
    comments?: string,
    selectedIdeaId?: string,
  ) {
    const pipeline = await this.pipelineRepository.findById(pipelineRunId);
    if (!pipeline) {
      throw new NotFoundException({ code: 'PIP-003', message: 'Pipeline not found' });
    }
    if (pipeline.status !== 'WAITING_REVIEW') {
      throw new BadRequestException({ code: 'PIP-004', message: 'Pipeline is not waiting for review' });
    }

    await this.pipelineRepository.createHumanReview({
      pipelineRunId,
      stepType,
      reviewType: stepType === 'S2_IDEA_INSPIRATION' ? 'IDEA_APPROVAL' : 'FINAL_APPROVAL',
      decision,
      reviewedBy,
      reviewedAt: new Date(),
      comments,
      selectedIdeaId,
    });

    if (decision === 'APPROVED') {
      await this.pipelineRepository.update(pipelineRunId, { status: 'RUNNING' });
      if (stepType === 'S2_IDEA_INSPIRATION') {
        await this.queueStep({
          pipelineRunId,
          bookId: pipeline.bookId,
          stepType: 'S3_COURSE_OUTLINE',
          stepNumber: 3,
          attempt: 1,
        });
        return { success: true, nextAction: 'Queued S3 course outline' };
      }
      if (stepType === 'S7_FINAL_EVALUATION') {
        await this.completePipeline(pipelineRunId);
        return { success: true, nextAction: 'Pipeline approved and completed' };
      }
    } else {
      await this.pipelineRepository.update(pipelineRunId, {
        status: 'CANCELLED',
        completedAt: new Date(),
        errorMessage: comments ?? 'Cancelled via review',
      });
      return { success: true, nextAction: 'Pipeline cancelled' };
    }

    return { success: true, nextAction: 'Review recorded' };
  }

  async resumePipeline(pipelineRunId: string) {
    const pipeline = await this.pipelineRepository.findById(pipelineRunId);
    if (!pipeline) throw new NotFoundException({ code: 'PIP-003', message: 'Pipeline not found' });
    if (pipeline.status !== 'PAUSED') {
      throw new BadRequestException({ code: 'PIP-004', message: 'Only PAUSED pipelines can be resumed' });
    }

    const resumePoint = await this.checkpointService.getResumePoint(pipelineRunId);
    await this.pipelineRepository.update(pipelineRunId, {
      status: 'RUNNING',
      currentStep: resumePoint.stepType,
      currentStepNumber: this.getStepNumber(resumePoint.stepType),
    });

    await this.queueStep({
      pipelineRunId,
      bookId: pipeline.bookId,
      stepType: resumePoint.stepType,
      stepNumber: this.getStepNumber(resumePoint.stepType),
      episodeNumber: resumePoint.episodeNumber,
      attempt: 1,
    });

    return { success: true, resumeFrom: resumePoint.stepType };
  }

  async restartPipeline(pipelineRunId: string) {
    const pipeline = await this.pipelineRepository.findById(pipelineRunId);
    if (!pipeline) throw new NotFoundException({ code: 'PIP-003', message: 'Pipeline not found' });

    if (!['FAILED', 'STUCK', 'PAUSED'].includes(pipeline.status)) {
      throw new BadRequestException({ code: 'PIP-004', message: 'Cannot restart pipeline in current state' });
    }

    await this.pipelineRepository.deleteStepExecutions(pipelineRunId);
    const now = new Date();
    await this.pipelineRepository.update(pipelineRunId, {
      status: 'RUNNING',
      currentStep: 'S2_IDEA_INSPIRATION',
      currentStepNumber: 2,
      progress: 0,
      revisionCount: 0,
      checkpointData: null,
      errorMessage: null,
      startedAt: now,
      completedAt: null,
    });

    await this.queueStep({
      pipelineRunId,
      bookId: pipeline.bookId,
      stepType: 'S2_IDEA_INSPIRATION',
      stepNumber: 2,
      attempt: 1,
    });

    return { success: true };
  }

  private async queueEpisodeBatch(pipelineRunId: string, bookId: string, stepType: StepType) {
    const s3Output = await this.pipelineRepository.findStepByType(pipelineRunId, 'S3_COURSE_OUTLINE');
    const episodeCount = (s3Output?.outputData as any)?.parsed?.course_outline?.total_episodes ?? 6;
    const stepNumber = this.getStepNumber(stepType);

    const jobs: StepJobData[] = [];
    for (let i = 1; i <= episodeCount; i++) {
      jobs.push({
        pipelineRunId,
        bookId,
        stepType,
        stepNumber,
        episodeNumber: i,
        attempt: 1,
      });
    }

    await this.queueService.addEpisodeJobsBulk(jobs);
    await this.pipelineRepository.update(pipelineRunId, {
      currentStep: stepType,
      currentStepNumber: stepNumber,
    });
  }

  private async allEpisodesComplete(pipelineRunId: string, stepType: StepType) {
    const s3Output = await this.pipelineRepository.findStepByType(pipelineRunId, 'S3_COURSE_OUTLINE');
    const episodeCount = (s3Output?.outputData as any)?.parsed?.course_outline?.total_episodes ?? 6;
    const completed = await this.pipelineRepository.countCompletedEpisodes(pipelineRunId, stepType);
    return completed >= episodeCount;
  }

  /**
   * Queue S6 practice content jobs for all 3 levels (BASIC, INTERMEDIATE, ADVANCED)
   */
  private async queuePracticeLevelBatch(pipelineRunId: string, bookId: string) {
    const jobs: StepJobData[] = [];
    
    // Create jobs for each practice level (1=BASIC, 2=INTERMEDIATE, 3=ADVANCED)
    for (let level = 1; level <= 3; level++) {
      jobs.push({
        pipelineRunId,
        bookId,
        stepType: 'S6_PRACTICE_CONTENT',
        stepNumber: 6,
        episodeNumber: level, // Reuse episodeNumber for practice level
        attempt: 1,
      });
    }

    this.logger.log(`S5 complete, queueing 3 S6 practice level jobs for pipeline ${pipelineRunId}`);
    await this.queueService.addEpisodeJobsBulk(jobs);
    
    await this.pipelineRepository.update(pipelineRunId, {
      currentStep: 'S6_PRACTICE_CONTENT',
      currentStepNumber: 6,
    });
  }

  /**
   * Check if all 3 practice levels (BASIC, INTERMEDIATE, ADVANCED) are complete
   */
  private async allPracticeLevelsComplete(pipelineRunId: string): Promise<boolean> {
    const completed = await this.pipelineRepository.countCompletedEpisodes(pipelineRunId, 'S6_PRACTICE_CONTENT');
    return completed >= 3; // 3 levels: BASIC, INTERMEDIATE, ADVANCED
  }

  private async completePipeline(pipelineRunId: string) {
    const pipeline = await this.pipelineRepository.findById(pipelineRunId);
    if (!pipeline) return;
    const now = new Date();

    // Check if course already exists (in case of re-run)
    const existingCourse = await this.pipelineRepository.hasCompletedCourse(pipeline.bookId);
    
    if (!existingCourse) {
      // Create minimal course stub first
      await this.pipelineRepository.createCourse({
        pipelineRunId,
        bookId: pipeline.bookId,
        title: pipeline.book?.title ?? 'Course',
        language: pipeline.book?.language ?? 'en',
        totalEpisodes: 0,
        status: 'APPROVED',
        approvedAt: now,
      });
    }

    // Fully populate course from pipeline outputs (S3, S5, S6, S7)
    try {
      await this.courseService.populateFromPipeline(pipelineRunId);
      this.logger.log(`Course fully populated for pipeline ${pipelineRunId}`);
    } catch (error) {
      this.logger.error(`Failed to populate course for pipeline ${pipelineRunId}`, error);
      // Continue with pipeline completion even if course population fails
    }

    await this.pipelineRepository.update(pipelineRunId, {
      status: 'APPROVED',
      completedAt: now,
      progress: 100,
    });

    this.eventEmitter.emit('pipeline.completed', { pipelineRunId, status: 'APPROVED' });
    this.logger.log(`Pipeline ${pipelineRunId} completed and course fully populated`);
  }

  private calculateProgress(stepType: StepType): number {
    const weights: Record<StepType, number> = {
      S1_BOOK_VERIFICATION: 0,
      S2_IDEA_INSPIRATION: 10,
      S3_COURSE_OUTLINE: 25,
      S4_EPISODE_DRAFT: 45,
      S5_EPISODE_CONTENT: 65,
      S6_PRACTICE_CONTENT: 85,
      S7_FINAL_EVALUATION: 95,
    };
    return weights[stepType] ?? 0;
  }

  private getStepNumber(stepType: StepType): number {
    const stepNumbers: Record<StepType, number> = {
      S1_BOOK_VERIFICATION: 1,
      S2_IDEA_INSPIRATION: 2,
      S3_COURSE_OUTLINE: 3,
      S4_EPISODE_DRAFT: 4,
      S5_EPISODE_CONTENT: 5,
      S6_PRACTICE_CONTENT: 6,
      S7_FINAL_EVALUATION: 7,
    };
    return stepNumbers[stepType] ?? 0;
  }
}


