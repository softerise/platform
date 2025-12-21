import { PipelineStatus } from '@prisma/client';

export class PipelineStateMachine {
  private static readonly VALID_TRANSITIONS: Record<PipelineStatus, PipelineStatus[]> = {
    CREATED: ['RUNNING', 'CANCELLED'],
    RUNNING: ['PAUSED', 'WAITING_REVIEW', 'FAILED', 'STUCK', 'APPROVED'],
    PAUSED: ['RUNNING', 'CANCELLED', 'FAILED'],
    WAITING_REVIEW: ['RUNNING', 'CANCELLED', 'FAILED', 'APPROVED'],
    FAILED: ['RUNNING', 'CANCELLED'],
    STUCK: ['RUNNING', 'CANCELLED', 'APPROVED'],
    APPROVED: ['DEPLOYED'],
    DEPLOYED: [],
    CANCELLED: [],
  };

  static canTransition(from: PipelineStatus, to: PipelineStatus): boolean {
    return this.VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  static getValidTransitions(from: PipelineStatus): PipelineStatus[] {
    return this.VALID_TRANSITIONS[from] ?? [];
  }

  static isTerminal(status: PipelineStatus): boolean {
    return ['DEPLOYED', 'CANCELLED'].includes(status);
  }

  static canCancel(status: PipelineStatus): boolean {
    return this.canTransition(status, 'CANCELLED');
  }

  static canResume(status: PipelineStatus): boolean {
    return status === 'PAUSED';
  }

  static canRestart(status: PipelineStatus): boolean {
    return ['FAILED', 'STUCK', 'PAUSED'].includes(status);
  }
}


