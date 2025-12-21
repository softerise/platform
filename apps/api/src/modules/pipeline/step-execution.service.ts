import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { StepExecution, StepType } from '@prisma/client';
import { PipelineRepository } from './pipeline.repository';
import type { StepOutput } from './step-handlers/step-handler.interface';
import { PIPELINE_EVENTS, StepCompletedEvent, StepCreatedEvent, StepFailedEvent, StepStartedEvent } from './pipeline.events';

interface LlmMetadata {
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
}

interface StepError {
  code: string;
  message: string;
  retriable: boolean;
}

interface CreateStepExecutionDto {
  pipelineRunId: string;
  bookId: string;
  stepType: StepType;
  stepNumber: number;
  episodeNumber?: number;
}

@Injectable()
export class StepExecutionService {
  constructor(
    private readonly repository: PipelineRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createExecution(data: CreateStepExecutionDto): Promise<StepExecution> {
    const execution = await this.repository.createStep({
      pipelineRunId: data.pipelineRunId,
      bookId: data.bookId,
      stepType: data.stepType,
      stepNumber: data.stepNumber,
      episodeNumber: data.episodeNumber,
      status: 'PENDING',
      retryCount: 0,
    });

    this.eventEmitter.emit(PIPELINE_EVENTS.STEP_CREATED, new StepCreatedEvent(execution.id, execution.stepType));
    return execution;
  }

  async markRunning(executionId: string, promptVersion?: string): Promise<StepExecution> {
    const execution = await this.repository.updateStep(executionId, {
      status: 'RUNNING',
      startedAt: new Date(),
      promptVersion,
    });

    this.eventEmitter.emit(PIPELINE_EVENTS.STEP_STARTED, new StepStartedEvent(executionId, execution.stepType));
    return execution;
  }

  async markSuccess(
    executionId: string,
    output: StepOutput,
    llmMetadata: LlmMetadata,
  ): Promise<StepExecution> {
    const now = new Date();
    const execution = await this.repository.findStepById(executionId);
    const durationMs =
      execution?.startedAt && now
        ? now.getTime() - execution.startedAt.getTime()
        : null;

    const updated = await this.repository.updateStep(executionId, {
      status: 'SUCCESS',
      completedAt: now,
      durationMs,
      outputData: output,
      llmProvider: llmMetadata.provider,
      inputTokens: llmMetadata.inputTokens ?? null,
      outputTokens: llmMetadata.outputTokens ?? null,
    });

    this.eventEmitter.emit(
      PIPELINE_EVENTS.STEP_COMPLETED,
      new StepCompletedEvent(executionId, updated.stepType, true, durationMs ?? null),
    );

    return updated;
  }

  async markFailed(
    executionId: string,
    error: StepError,
    shouldRetry: boolean,
  ): Promise<StepExecution> {
    const execution = await this.repository.findStepById(executionId);
    const newRetryCount = (execution?.retryCount ?? 0) + 1;

    const status = shouldRetry && newRetryCount < 3 ? 'FAILED' : 'EXHAUSTED';
    const completedAt = status === 'EXHAUSTED' ? new Date() : undefined;

    const updated = await this.repository.updateStep(executionId, {
      status,
      retryCount: newRetryCount,
      errorMessage: error.message,
      completedAt,
    });

    this.eventEmitter.emit(
      PIPELINE_EVENTS.STEP_FAILED,
      new StepFailedEvent(
        executionId,
        updated.stepType,
        error.message,
        shouldRetry && status !== 'EXHAUSTED',
        newRetryCount,
      ),
    );

    return updated;
  }

  async getStepOutput(pipelineRunId: string, stepType: StepType): Promise<unknown | null> {
    const step = await this.repository.findStepByType(pipelineRunId, stepType);
    return step?.outputData ?? null;
  }
}


