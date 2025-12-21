import { StepType } from '@prisma/client';
import type { StepJobData, StepJobResult } from './queue.types';

export class StepJobAddedEvent {
  constructor(public readonly queueName: string, public readonly payload: StepJobData) {}
}

export class StepJobCompletedEvent {
  constructor(public readonly queueName: string, public readonly result: StepJobResult) {}
}

export class StepJobFailedEvent {
  constructor(
    public readonly queueName: string,
    public readonly jobId: string | number | undefined,
    public readonly stepType: StepType,
    public readonly attempt: number,
    public readonly error: Error,
  ) {}
}

export class StepJobStalledEvent {
  constructor(public readonly queueName: string, public readonly jobId: string | number | undefined) {}
}


