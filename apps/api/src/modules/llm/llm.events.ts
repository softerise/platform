import type { LlmErrorCode, LlmProvider } from './llm.dto';

export class LlmRequestCompletedEvent {
  constructor(
    public readonly provider: LlmProvider,
    public readonly durationMs: number,
    public readonly model: string,
  ) {}
}

export class LlmRequestFailedEvent {
  constructor(
    public readonly provider: LlmProvider,
    public readonly code: LlmErrorCode,
    public readonly message: string,
  ) {}
}

