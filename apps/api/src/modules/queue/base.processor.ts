import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { StepJobData, StepJobResult } from './queue.types';

export abstract class BaseStepProcessor extends WorkerHost {
  protected abstract readonly logger: Logger;

  abstract processStep(job: Job<StepJobData>): Promise<StepJobResult>;

  async process(job: Job<StepJobData>): Promise<StepJobResult> {
    this.logger.log(
      `Processing job ${job.id} - Step: ${job.data.stepType}, Attempt: ${job.attemptsMade + 1}`,
    );

    const startTime = Date.now();

    try {
      const result = await this.processStep(job);
      this.logger.log(`Job ${job.id} completed in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<StepJobData>, result: StepJobResult) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<StepJobData>, error: Error) {
    this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job ${jobId} stalled`);
  }
}


