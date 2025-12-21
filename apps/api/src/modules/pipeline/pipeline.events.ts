import { PipelineStatus, StepStatus, StepType } from '@prisma/client';

export const PIPELINE_EVENTS = {
  STARTED: 'pipeline.started',
  CANCELLED: 'pipeline.cancelled',
  RESUMED: 'pipeline.resumed',
  PROGRESS: 'pipeline.progress',
  STATUS_CHANGED: 'pipeline.status.changed',
  CHAPTERS_LOCKED: 'chapters.locked',
  STEP_CREATED: 'step.created',
  STEP_STARTED: 'step.started',
  STEP_COMPLETED: 'step.completed',
  STEP_FAILED: 'step.failed',
  COMPLETED: 'pipeline.completed',
  REVIEW_REQUIRED: 'pipeline.review.required',
};

export class PipelineStartedEvent {
  constructor(
    public readonly pipelineRunId: string,
    public readonly bookId: string,
  ) {}
}

export class PipelineCancelledEvent {
  constructor(
    public readonly pipelineRunId: string,
    public readonly bookId: string,
    public readonly reason?: string | null,
  ) {}
}

export class PipelineResumedEvent {
  constructor(
    public readonly pipelineRunId: string,
    public readonly bookId: string,
    public readonly resumeFrom: StepType | null,
  ) {}
}

export class PipelineProgressEvent {
  constructor(
    public readonly pipelineRunId: string,
    public readonly status: PipelineStatus,
    public readonly progress: number,
    public readonly currentStep: StepType | null,
  ) {}
}

export class StepExecutionUpdatedEvent {
  constructor(
    public readonly stepExecutionId: string,
    public readonly stepType: StepType,
    public readonly status: StepStatus,
  ) {}
}

export class PipelineStatusChangedEvent {
  constructor(
    public readonly pipelineRunId: string,
    public readonly previousStatus: PipelineStatus,
    public readonly newStatus: PipelineStatus,
    public readonly timestamp: string,
  ) {}
}

export class ChaptersLockedEvent {
  constructor(
    public readonly bookId: string,
    public readonly pipelineRunId: string,
    public readonly timestamp: string,
  ) {}
}

export class StepCreatedEvent {
  constructor(public readonly executionId: string, public readonly stepType: StepType) {}
}

export class StepStartedEvent {
  constructor(public readonly executionId: string, public readonly stepType: StepType) {}
}

export class StepCompletedEvent {
  constructor(
    public readonly executionId: string,
    public readonly stepType: StepType,
    public readonly success: boolean,
    public readonly durationMs: number | null,
  ) {}
}

export class StepFailedEvent {
  constructor(
    public readonly executionId: string,
    public readonly stepType: StepType,
    public readonly error: string,
    public readonly retriable: boolean,
    public readonly retryCount: number,
  ) {}
}




