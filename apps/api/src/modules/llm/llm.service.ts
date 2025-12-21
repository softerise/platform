import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmCompletionRequest,
  LlmCompletionRequestSchema,
  LlmCompletionResponse,
  LlmError,
  type LlmProvider,
} from './llm.dto';
import type { LlmProviderAdapter, ProviderResult } from './llm.repository';
import { ClaudeAdapter, OpenAIAdapter } from './llm.repository';
import { JsonRepairUtil } from './utils/json-repair.util';

type AttemptResult =
  | { ok: true; value: LlmCompletionResponse }
  | { ok: false; error: LlmError };

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly validationRetryLimit = 2;
  private readonly minTimeoutMs = 300_000; // enforce 5 minutes minimum

  constructor(
    private readonly claudeAdapter: ClaudeAdapter,
    private readonly openAIAdapter: OpenAIAdapter,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries = this.parseNumber(this.configService.get('LLM_MAX_RETRIES'), 2);
    const configuredTimeout = this.parseNumber(this.configService.get('LLM_TIMEOUT_MS'), this.minTimeoutMs);
    this.timeoutMs = Math.max(configuredTimeout, this.minTimeoutMs);
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const payload = LlmCompletionRequestSchema.parse(request);
    const providers = this.getProviderOrder();
    let lastError: LlmError | null = null;

    for (const provider of providers) {
      const result = await this.tryProvider(provider, payload);
      if (result.ok) {
        return result.value;
      }
      lastError = result.error;
      this.logger.warn(
        `Provider ${provider.name} failed with ${result.error.code}: ${result.error.message}`,
      );
    }

    throw lastError ?? new LlmError('LLM-003', 'LLM invocation failed', false, providers[0].name);
  }

  private async tryProvider(
    provider: LlmProviderAdapter,
    request: LlmCompletionRequest,
  ): Promise<AttemptResult> {
    let attempts = 0;
    let validationAttempts = 0;

    while (attempts <= this.maxRetries) {
      attempts += 1;

      try {
        const startedAt = Date.now();
        const providerResult = await provider.complete(request, { timeoutMs: this.timeoutMs });
        const durationMs = Date.now() - startedAt;

        const validationResult = this.validateResponse(providerResult, request.responseFormat);
        if (!validationResult.ok) {
          validationAttempts += 1;
          if (this.shouldRetry(validationResult.error, attempts, validationAttempts)) {
            await this.backoff(validationAttempts);
            continue;
          }
          return validationResult;
        }

        // IMPORTANT: Use validationResult.value which contains the REPAIRED content
        // Do NOT spread providerResult as it contains the original unrepaired content
        return {
          ok: true,
          value: {
            ...validationResult.value,
            durationMs,
          },
        };
      } catch (error) {
        const llmError = this.normalizeError(error, provider.name);
        if (this.shouldRetry(llmError, attempts, validationAttempts)) {
          await this.backoff(attempts);
          continue;
        }
        return { ok: false, error: llmError };
      }
    }

    return {
      ok: false,
      error: new LlmError('LLM-003', 'Max retries exceeded', false, provider.name),
    };
  }

  private validateResponse(
    result: ProviderResult,
    responseFormat: LlmCompletionRequest['responseFormat'],
  ): AttemptResult {
    if (responseFormat !== 'json') {
      return { ok: true, value: { ...result, durationMs: 0 } as LlmCompletionResponse };
    }

    // Use JsonRepairUtil for robust JSON parsing with multiple repair strategies
    const repairResult = JsonRepairUtil.repair(result.content);

    if (!repairResult.success) {
      return {
        ok: false,
        error: new LlmError(
          'LLM-004',
          `LLM response invalid JSON after all repair attempts. Original length: ${repairResult.originalLength}`,
          true,
          result.provider,
        ),
      };
    }

    // Log if repair was needed (not direct parse)
    if (repairResult.method !== 'direct_parse') {
      this.logger.warn(
        `JSON required repair. Method: ${repairResult.method}, ` +
          `Original: ${repairResult.originalLength} chars, ` +
          `Repaired: ${repairResult.repairedLength} chars`,
      );
    }

    // Return response with repaired content
    const repairedContent = JSON.stringify(repairResult.data);
    return {
      ok: true,
      value: {
        ...result,
        content: repairedContent,
        durationMs: 0,
      } as LlmCompletionResponse,
    };
  }

  private shouldRetry(error: LlmError, attempts: number, validationAttempts: number): boolean {
    if (error.code === 'LLM-004') {
      return error.retriable && validationAttempts <= this.validationRetryLimit;
    }
    return error.retriable && attempts <= this.maxRetries;
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(4000, 1000 * 2 ** (attempt - 1));
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private getProviderOrder(): LlmProviderAdapter[] {
    const primary = this.configService.get<string>('LLM_PRIMARY_PROVIDER') ?? 'claude';
    const normalized = primary.toLowerCase() === 'gpt4' ? 'gpt4' : 'claude';
    return normalized === 'claude'
      ? [this.claudeAdapter, this.openAIAdapter]
      : [this.openAIAdapter, this.claudeAdapter];
  }

  private normalizeError(error: unknown, provider: LlmProvider): LlmError {
    if (error instanceof LlmError) return error;
    if (error instanceof Error && error.name === 'AbortError') {
      return new LlmError('LLM-001', 'LLM request timed out', true, provider, error);
    }

    const message = error instanceof Error ? error.message : 'LLM invocation failed';
    return new LlmError('LLM-003', message, true, provider, error);
  }

  private parseNumber(value: unknown, defaultValue: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }
}

