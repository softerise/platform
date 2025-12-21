/**
 * Centralized Prompt Configuration Types
 * Provides type-safe configuration for all pipeline prompts
 */

export type Environment = 'development' | 'test' | 'production';

export interface ModelConfig {
  /** Primary model for production use */
  primary: string;
  /** Fallback model if primary fails */
  fallback: string;
  /** Optional test model for lower cost testing */
  test?: string;
}

export interface ParametersConfig {
  /** Temperature for response variability (0-1) */
  temperature: number;
  /** Maximum tokens in response */
  maxTokens: number;
  /** Top P for nucleus sampling (optional) */
  topP?: number;
  /** Enable extended thinking/chain-of-thought (Claude specific) */
  extendedThinking?: boolean;
  /** Budget for extended thinking tokens (Claude specific) */
  thinkingBudget?: number;
}

export interface ExecutionConfig {
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelayMs: number;
}

export interface ValidationConfig {
  /** Minimum word count */
  minWordCount?: number;
  /** Maximum word count */
  maxWordCount?: number;
  /** Tolerance percentage (e.g., 0.25 for 25%) */
  tolerance?: number;
  /** Minimum required items in arrays (e.g., episodes, ideas) */
  minItems?: number;
  /** Maximum allowed items */
  maxItems?: number;
}

export interface MetaConfig {
  /** Human-readable name */
  name: string;
  /** Semantic version */
  version: string;
  /** Description of the prompt's purpose */
  description: string;
}

export interface PromptConfig {
  model: ModelConfig;
  parameters: ParametersConfig;
  execution: ExecutionConfig;
  validation?: ValidationConfig;
  meta: MetaConfig;
}

/**
 * Get the appropriate model based on environment
 */
export function getModelForEnvironment(
  config: PromptConfig,
  env: Environment = 'production',
): string {
  if (env === 'test' || env === 'development') {
    return config.model.test || config.model.fallback;
  }
  return config.model.primary;
}

/**
 * Get validation thresholds with tolerance applied
 */
export function getValidationWithTolerance(
  validation: ValidationConfig | undefined,
): {
  actualMin: number;
  actualMax: number;
  targetMin: number;
  targetMax: number;
} {
  const targetMin = validation?.minWordCount ?? 0;
  const targetMax = validation?.maxWordCount ?? Infinity;
  const tolerance = validation?.tolerance ?? 0;

  return {
    targetMin,
    targetMax,
    actualMin: Math.floor(targetMin * (1 - tolerance)),
    actualMax: Math.ceil(targetMax * (1 + tolerance)),
  };
}

/**
 * Get current environment from NODE_ENV
 */
export function getCurrentEnvironment(): Environment {
  const env = process.env.NODE_ENV;
  if (env === 'test' || env === 'development') {
    return env;
  }
  return 'production';
}

