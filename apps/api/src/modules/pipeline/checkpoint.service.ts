import { Injectable, Logger } from '@nestjs/common';
import { PipelineRepository } from './pipeline.repository';
import type { StepType } from '@prisma/client';

interface CheckpointData {
  lastCompletedStep?: string;
  lastCompletedEpisode?: number;
  stepOutputs?: Record<string, { completedAt: string }>;
  episodeProgress?: {
    S4?: number[];
    S5?: number[];
  };
  savedAt?: string;
}

interface ResumePoint {
  stepType: StepType;
  episodeNumber?: number;
}

@Injectable()
export class CheckpointService {
  private readonly logger = new Logger(CheckpointService.name);

  constructor(private readonly repository: PipelineRepository) {}

  async saveCheckpoint(
    pipelineRunId: string,
    lastCompletedStep: StepType,
    lastCompletedEpisode?: number,
  ): Promise<void> {
    const pipeline = await this.repository.findById(pipelineRunId);
    if (!pipeline) return;

    const existingCheckpoint = (pipeline.checkpointData as CheckpointData) ?? {};
    const nowIso = new Date().toISOString();

    const newCheckpoint: CheckpointData = {
      ...existingCheckpoint,
      lastCompletedStep,
      lastCompletedEpisode: lastCompletedEpisode ?? existingCheckpoint.lastCompletedEpisode,
      stepOutputs: {
        ...existingCheckpoint.stepOutputs,
        [lastCompletedStep]: { completedAt: nowIso },
      },
      savedAt: nowIso,
    };

    await this.repository.update(pipelineRunId, {
      checkpointData: newCheckpoint,
      currentStep: lastCompletedStep,
    });

    this.logger.log(`Checkpoint saved for pipeline ${pipelineRunId}: ${lastCompletedStep}`);
  }

  async getCheckpoint(pipelineRunId: string): Promise<CheckpointData | null> {
    const pipeline = await this.repository.findById(pipelineRunId);
    return (pipeline?.checkpointData as CheckpointData) ?? null;
  }

  async getResumePoint(pipelineRunId: string): Promise<ResumePoint> {
    const checkpoint = await this.getCheckpoint(pipelineRunId);

    if (!checkpoint?.lastCompletedStep) {
      return { stepType: 'S2_IDEA_INSPIRATION', episodeNumber: undefined };
    }

    const stepOrder: StepType[] = [
      'S2_IDEA_INSPIRATION',
      'S3_COURSE_OUTLINE',
      'S4_EPISODE_DRAFT',
      'S5_EPISODE_CONTENT',
      'S6_PRACTICE_CONTENT',
      'S7_FINAL_EVALUATION',
    ];

    const currentIndex = stepOrder.indexOf(checkpoint.lastCompletedStep as StepType);
    const nextStep = stepOrder[currentIndex + 1];

    return {
      stepType: nextStep ?? checkpoint.lastCompletedStep,
      episodeNumber: checkpoint.lastCompletedEpisode,
    };
  }
}


