import { z } from 'zod';

export type LlmProvider = 'claude' | 'gpt4';
export type LlmErrorCode = 'LLM-001' | 'LLM-002' | 'LLM-003' | 'LLM-004';

export const LlmCompletionRequestSchema = z.object({
  prompt: z.string().min(1, 'prompt is required'),
  systemPrompt: z.string().min(1).optional(),
  maxTokens: z.number().int().positive().max(32768).optional(),
  temperature: z.number().min(0).max(2).optional(),
  responseFormat: z.enum(['text', 'json']).optional().default('text'),
});

export type LlmCompletionRequest = z.infer<typeof LlmCompletionRequestSchema>;

export const LlmCompletionResponseSchema = z.object({
  content: z.string(),
  provider: z.enum(['claude', 'gpt4']),
  model: z.string(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  durationMs: z.number().int().nonnegative(),
});

export type LlmCompletionResponse = z.infer<typeof LlmCompletionResponseSchema>;

export class LlmError extends Error {
  constructor(
    public readonly code: LlmErrorCode,
    message: string,
    public readonly retriable: boolean,
    public readonly provider: LlmProvider,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

