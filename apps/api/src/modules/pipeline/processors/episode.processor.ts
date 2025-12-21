import { Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { BaseStepProcessor } from '../../queue/base.processor';
import type { StepJobData, StepJobResult } from '../../queue/queue.types';
import { QUEUE_NAMES } from '../../queue/queue.types';
import { StepExecutor } from '../step-executor';
import { PipelineOrchestratorService } from '../pipeline-orchestrator.service';

@Processor(QUEUE_NAMES.PIPELINE_EPISODES)
export class EpisodeProcessor extends BaseStepProcessor {
  protected readonly logger = new Logger(EpisodeProcessor.name);

  constructor(
    private readonly stepExecutor: StepExecutor,
    private readonly orchestrator: PipelineOrchestratorService,
  ) {
    super();
  }

  async processStep(job: Job<StepJobData>): Promise<StepJobResult> {
    const result = await this.stepExecutor.executeStep(job);
    if (result.success) {
      await this.orchestrator.onStepCompleted(job.data.pipelineRunId, job.data.stepType, job.data.episodeNumber);
    }
    return result;
  }
}


