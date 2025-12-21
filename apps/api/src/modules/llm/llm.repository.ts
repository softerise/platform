import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { LlmCompletionRequest, LlmCompletionResponse, LlmProvider } from './llm.dto';
import { LlmError } from './llm.dto';

export type ProviderResult = Omit<LlmCompletionResponse, 'durationMs'>;

export interface LlmProviderAdapter {
  readonly name: LlmProvider;
  complete(
    request: LlmCompletionRequest,
    options?: { timeoutMs?: number },
  ): Promise<ProviderResult>;
}

const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_OPENAI_MODEL = 'gpt-4';
const MIN_TIMEOUT_MS = 300_000; // enforce at least 5 minutes for large prompts

function toLlmErrorFromStatus(
  provider: LlmProvider,
  status: number | undefined,
  message: string,
  originalError?: unknown,
): LlmError {
  if (status === 408) {
    return new LlmError('LLM-001', message, true, provider, originalError);
  }
  if (status === 429) {
    return new LlmError('LLM-002', message, true, provider, originalError);
  }
  if (status && status >= 500) {
    return new LlmError('LLM-003', message, true, provider, originalError);
  }
  if (status && status >= 400) {
    return new LlmError('LLM-003', message, false, provider, originalError);
  }
  return new LlmError('LLM-003', message, true, provider, originalError);
}

function createAbortSignal(timeoutMs?: number): { signal?: AbortSignal; cleanup: () => void } {
  if (!timeoutMs || timeoutMs <= 0) {
    return { signal: undefined, cleanup: () => undefined };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

@Injectable()
export class ClaudeAdapter implements LlmProviderAdapter {
  readonly name = 'claude';
  private readonly logger = new Logger(ClaudeAdapter.name);
  private readonly model: string;
  private readonly client: Anthropic;
  private readonly defaultTimeout: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY') ?? '';
    this.model = this.configService.get<string>('ANTHROPIC_MODEL') ?? DEFAULT_CLAUDE_MODEL;
    const configuredTimeout = Number(this.configService.get<number>('LLM_TIMEOUT_MS'));
    this.defaultTimeout = Math.max(Number.isFinite(configuredTimeout) ? configuredTimeout : MIN_TIMEOUT_MS, MIN_TIMEOUT_MS);
    this.client = new Anthropic({ apiKey });
  }

  async complete(request: LlmCompletionRequest, options?: { timeoutMs?: number }): Promise<ProviderResult> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new LlmError('LLM-003', 'Anthropic API key missing', false, this.name);
    }

    const timeoutMs = Math.max(options?.timeoutMs ?? this.defaultTimeout, MIN_TIMEOUT_MS);
    const { signal, cleanup } = createAbortSignal(timeoutMs);
    this.logger.debug?.(
      `Claude call start (timeoutMs=${timeoutMs}, configuredDefault=${this.defaultTimeout})`,
    );
    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: request.maxTokens ?? 1024,
          temperature: request.temperature ?? 0.7,
          system: request.systemPrompt,
          messages: [{ role: 'user', content: request.prompt }],
        },
        { signal, timeout: timeoutMs },
      );

      const textBlock = (response.content ?? []).find(
        (block: { type?: string }) => block.type === 'text',
      ) as { text?: string } | undefined;

      const content = textBlock?.text ?? '';
      if (!content) {
        throw new LlmError('LLM-004', 'Claude returned empty content', true, this.name);
      }

      // Debug logging for raw response analysis
      this.logger.debug(`Claude raw response length: ${content.length}`);
      this.logger.debug(`Claude response preview: ${content.substring(0, 300)}...`);

      return {
        content,
        provider: this.name,
        model: this.model,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      };
    } catch (error) {
      const mapped = this.toLlmError(error);
      this.logger.warn(`Claude call failed (${mapped.code}): ${mapped.message}`);
      throw mapped;
    } finally {
      cleanup();
    }
  }

  private toLlmError(error: unknown): LlmError {
    if (error instanceof LlmError) return error;
    if (error instanceof Error && error.name === 'AbortError') {
      return new LlmError('LLM-001', 'Claude request timed out', true, this.name, error);
    }

    const status =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any)?.status ?? (error as { response?: { status?: number } })?.response?.status;

    const code =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any)?.error?.type ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any)?.code;

    if (code === 'rate_limit_error' || status === 429) {
      return new LlmError('LLM-002', 'Claude rate limited', true, this.name, error);
    }

    const message =
      error instanceof Error ? error.message : 'Claude invocation failed without details';
    return toLlmErrorFromStatus(this.name, status, message, error);
  }
}

@Injectable()
export class OpenAIAdapter implements LlmProviderAdapter {
  readonly name = 'gpt4';
  private readonly logger = new Logger(OpenAIAdapter.name);
  private readonly model: string;
  private readonly client: OpenAI;
  private readonly defaultTimeout: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') ?? '';
    this.model = this.configService.get<string>('OPENAI_MODEL') ?? DEFAULT_OPENAI_MODEL;
    const configuredTimeout = Number(this.configService.get<number>('LLM_TIMEOUT_MS'));
    this.defaultTimeout = Math.max(Number.isFinite(configuredTimeout) ? configuredTimeout : MIN_TIMEOUT_MS, MIN_TIMEOUT_MS);
    this.client = new OpenAI({ apiKey });
  }

  async complete(request: LlmCompletionRequest, options?: { timeoutMs?: number }): Promise<ProviderResult> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new LlmError('LLM-003', 'OpenAI API key missing', false, this.name);
    }

    const timeoutMs = Math.max(options?.timeoutMs ?? this.defaultTimeout, MIN_TIMEOUT_MS);
    const { signal, cleanup } = createAbortSignal(timeoutMs);
    this.logger.debug?.(
      `OpenAI call start (timeoutMs=${timeoutMs}, configuredDefault=${this.defaultTimeout})`,
    );
    try {
      const wantsJson = request.responseFormat === 'json';
      const supportsJsonFormat =
        this.model.includes('gpt-4o') ||
        this.model.includes('gpt-4.1') ||
        this.model.includes('gpt-4o-mini') ||
        this.model.includes('gpt-4o-mini-') ||
        this.model.includes('gpt-4.1-mini') ||
        this.model.includes('gpt-4-turbo');

      const messages: ChatCompletionMessageParam[] = [
        ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
        { role: 'user' as const, content: request.prompt },
      ];

      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          response_format: wantsJson && supportsJsonFormat ? { type: 'json_object' } : undefined,
          messages,
        },
        { signal, timeout: timeoutMs },
      );

      const choice = response.choices?.[0]?.message?.content;
      const content = typeof choice === 'string' ? choice : JSON.stringify(choice);

      if (!content) {
        throw new LlmError('LLM-004', 'OpenAI returned empty content', true, this.name);
      }

      // Debug logging for raw response analysis
      this.logger.debug(`OpenAI raw response length: ${content.length}`);
      this.logger.debug(`OpenAI response preview: ${content.substring(0, 300)}...`);

      return {
        content,
        provider: this.name,
        model: this.model,
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
      };
    } catch (error) {
      const mapped = this.toLlmError(error);
      this.logger.warn(`OpenAI call failed (${mapped.code}): ${mapped.message}`);
      throw mapped;
    } finally {
      cleanup();
    }
  }

  private toLlmError(error: unknown): LlmError {
    if (error instanceof LlmError) return error;
    if (error instanceof Error && error.name === 'AbortError') {
      return new LlmError('LLM-001', 'OpenAI request timed out', true, this.name, error);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status ?? (error as { response?: { status?: number } })?.response?.status;
    if (status === 429) {
      return new LlmError('LLM-002', 'OpenAI rate limited', true, this.name, error);
    }

    const message =
      error instanceof Error ? error.message : 'OpenAI invocation failed without details';

    return toLlmErrorFromStatus(this.name, status, message, error);
  }
}

