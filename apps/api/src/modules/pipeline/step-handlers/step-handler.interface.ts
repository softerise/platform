import {
  S1Verdict,
  S1VerdictConfidence,
  StepType,
} from '@prisma/client';

export interface IStepHandler {
  readonly stepType: StepType;

  buildPrompt(context: StepContext): Promise<StepPrompt>;

  validateResponse(response: string): Promise<ValidationResult>;

  parseResponse(response: string): Promise<StepOutput>;

  onSuccess?(context: StepContext, output: StepOutput): Promise<void>;
}

export interface StepContext {
  pipelineRunId: string;
  bookId: string;
  stepExecutionId: string;
  book: {
    id: string;
    title: string;
    description: string | null;
    language?: string;
    s1Verdict?: S1Verdict | null;
    s1VerdictConfidence?: S1VerdictConfidence | null;
    s1PrimarySpiId?: string | null;
    s1PrimarySpiName?: string | null;
    s1Output?: unknown;
    chapters: Array<{
      chapterNumber: number;
      chapterTitle: string | null;
      content: string;
    }>;
  };
  previousStepOutputs: Record<StepType, unknown>;
  episodeNumber?: number;
  practiceLevel?: number; // 1=BASIC, 2=INTERMEDIATE, 3=ADVANCED for S6
}

export interface StepPrompt {
  systemPrompt: string;
  userPrompt: string;
  responseFormat: 'json' | 'text';
  maxTokens?: number;
  temperature?: number;
}

export interface StepOutput {
  raw: string;
  parsed: unknown;
  summary: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}


