import { Injectable, Logger } from '@nestjs/common';
import type { StepExecution, StepType } from '@prisma/client';
import type { Job } from 'bullmq';
import { PipelineRepository } from './pipeline.repository';
import { StepExecutionService } from './step-execution.service';
import { CheckpointService } from './checkpoint.service';
import { LlmService } from '../llm/llm.service';
import type { StepJobData, StepJobResult } from '../queue/queue.types';
import type {
  IStepHandler,
  StepContext,
  StepOutput,
} from './step-handlers/step-handler.interface';

const RETRIABLE_CODES = ['LLM-001', 'LLM-002', 'LLM-003', 'LLM-004', 'VAL-001', 'VAL-002', 'VAL-003'];

@Injectable()
export class StepExecutor {
  private readonly logger = new Logger(StepExecutor.name);
  private readonly handlers = new Map<StepType, IStepHandler>();

  constructor(
    private readonly stepExecutionService: StepExecutionService,
    private readonly llmService: LlmService,
    private readonly checkpointService: CheckpointService,
    private readonly pipelineRepository: PipelineRepository,
  ) {}

  registerHandler(handler: IStepHandler): void {
    this.handlers.set(handler.stepType, handler);
    this.logger.log(`Registered handler for ${handler.stepType}`);
  }

  async executeStep(job: Job<StepJobData>): Promise<StepJobResult> {
    const data = job.data;
    const { pipelineRunId, stepType, episodeNumber } = data;

    let execution = await this.getOrCreateExecution(data);

    const handler = this.handlers.get(stepType);
    if (!handler) {
      throw new Error(`No handler registered for step type: ${stepType}`);
    }

    execution = await this.stepExecutionService.markRunning(execution.id);

    try {
      const context = await this.buildContext(data, execution.id);
      const prompt = await handler.buildPrompt(context);

      const llmResponse = await this.llmService.complete({
        prompt: prompt.userPrompt,
        systemPrompt: prompt.systemPrompt,
        responseFormat: prompt.responseFormat,
        maxTokens: prompt.maxTokens,
        temperature: prompt.temperature,
      });

      const validation = await handler.validateResponse(llmResponse.content);
      if (!validation.valid) {
        throw new StepValidationError(
          'VAL-003',
          `Validation failed: ${validation.errors?.join(', ') ?? 'unknown'}`,
          true,
        );
      }

      const output = await handler.parseResponse(llmResponse.content);

      await this.stepExecutionService.markSuccess(execution.id, output, {
        provider: llmResponse.provider,
        inputTokens: llmResponse.inputTokens,
        outputTokens: llmResponse.outputTokens,
      });

      await this.checkpointService.saveCheckpoint(pipelineRunId, stepType, episodeNumber);

      if (handler.onSuccess) {
        await handler.onSuccess(context, output as StepOutput);
      }

      return {
        success: true,
        stepExecutionId: execution.id,
        outputSummary: (output as StepOutput).summary,
      };
    } catch (error) {
      return this.handleError(execution.id, error);
    }
  }

  private async buildContext(jobData: StepJobData, executionId: string): Promise<StepContext> {
    const { pipelineRunId, bookId, episodeNumber } = jobData;

    const book = await this.pipelineRepository.getBookWithChapters(bookId);
    if (!book) {
      throw new Error(`Book ${bookId} not found for step execution`);
    }

    const previousOutputs = await this.loadPreviousOutputs(pipelineRunId, episodeNumber);

    return {
      pipelineRunId,
      bookId,
      stepExecutionId: executionId,
      book: {
        id: book.id,
        title: book.title,
        description: book.description,
        language: book.language,
        s1Verdict: book.s1Verdict,
        s1VerdictConfidence: book.s1VerdictConfidence,
        s1PrimarySpiId: book.s1PrimarySpiId,
        s1PrimarySpiName: book.s1PrimarySpiName,
        s1Output: book.s1Output,
        chapters: book.chapters.map((c) => ({
          chapterNumber: c.chapterNumber,
          chapterTitle: c.chapterTitle,
          content: c.content,
        })),
      },
      previousStepOutputs: previousOutputs,
      episodeNumber,
    };
  }

  private async loadPreviousOutputs(
    pipelineRunId: string,
    currentEpisodeNumber?: number,
  ): Promise<Record<StepType, unknown>> {
    const steps = await this.pipelineRepository.findStepsByPipelineId(pipelineRunId);
    const outputs: Record<string, unknown> = {};

    this.logger.debug(
      `loadPreviousOutputs: pipelineRunId=${pipelineRunId}, currentEpisodeNumber=${currentEpisodeNumber}, ` +
        `total steps=${steps.length}, success steps=${steps.filter((s) => s.status === 'SUCCESS').length}`,
    );

    for (const step of steps) {
      if (step.status === 'SUCCESS' && step.outputData) {
        const stepType = step.stepType;

        // For episode-based steps (S4, S5), handle per-episode outputs
        if (stepType === 'S4_EPISODE_DRAFT' || stepType === 'S5_EPISODE_CONTENT') {
          // ALWAYS collect as array for consistency
          if (!outputs[stepType]) {
            outputs[stepType] = [];
          }

          // Add episode output to array
          (outputs[stepType] as unknown[]).push({
            episodeNumber: step.episodeNumber,
            ...(step.outputData as object),
          });

          this.logger.debug(
            `loadPreviousOutputs: Added ${stepType} ep${step.episodeNumber} to outputs array`,
          );
        } else {
          // Non-episode steps: store directly
          outputs[stepType] = step.outputData;
        }
      }
    }

    // Debug log for episode-based outputs
    const s4Outputs = outputs['S4_EPISODE_DRAFT'] as unknown[] | undefined;
    if (s4Outputs) {
      this.logger.debug(
        `loadPreviousOutputs: S4_EPISODE_DRAFT has ${s4Outputs.length} episode outputs`,
      );
    }

    return outputs as Record<StepType, unknown>;
  }

  private async handleError(executionId: string, error: any): Promise<StepJobResult> {
    const isRetriable = this.isRetriableError(error);

    await this.stepExecutionService.markFailed(
      executionId,
      {
        code: error.code ?? 'UNKNOWN',
        message: error.message ?? 'Unknown error',
        retriable: isRetriable,
      },
      isRetriable,
    );

    if (isRetriable) {
      throw error;
    }

    return {
      success: false,
      stepExecutionId: executionId,
      error: {
        code: error.code ?? 'UNKNOWN',
        message: error.message ?? 'Unknown error',
        retriable: false,
      },
    };
  }

  private isRetriableError(error: any): boolean {
    if (error?.retriable === true) return true;
    if (typeof error?.code === 'string' && RETRIABLE_CODES.includes(error.code)) return true;
    return false;
  }

  private async getOrCreateExecution(jobData: StepJobData): Promise<StepExecution> {
    const existing = await this.pipelineRepository.findStepByTypeAndEpisode(
      jobData.pipelineRunId,
      jobData.stepType,
      jobData.episodeNumber,
    );

    if (existing) {
      return existing;
    }

    return this.stepExecutionService.createExecution({
      pipelineRunId: jobData.pipelineRunId,
      bookId: jobData.bookId,
      stepType: jobData.stepType,
      stepNumber: jobData.stepNumber,
      episodeNumber: jobData.episodeNumber,
    });
  }
}

class StepValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retriable: boolean,
  ) {
    super(message);
    this.name = 'StepValidationError';
  }
}


