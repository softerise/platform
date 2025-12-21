import { StepType } from '@prisma/client';

export const QUEUE_NAMES = {
  PIPELINE_STEPS: 'pipeline-steps',
  PIPELINE_EPISODES: 'pipeline-episodes',
} as const;

export interface StepJobData {
  pipelineRunId: string;
  bookId: string;
  stepType: StepType;
  stepNumber: number;
  episodeNumber?: number;
  attempt: number;
  metadata?: Record<string, unknown>;
}

export interface StepJobResult {
  success: boolean;
  stepExecutionId: string;
  outputSummary?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3, // 1 initial + 2 retries
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // 1s, 2s, 4s
  },
  timeout: 5 * 60 * 1000, // 5 minutes
  removeOnComplete: 100,
  removeOnFail: 500,
};

export const EPISODE_JOB_OPTIONS = {
  ...DEFAULT_JOB_OPTIONS,
  timeout: 3 * 60 * 1000, // 3 minutes
};


