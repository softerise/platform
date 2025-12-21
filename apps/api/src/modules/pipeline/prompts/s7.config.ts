import {
  PromptConfig,
  Environment,
  getModelForEnvironment,
  getCurrentEnvironment,
} from './prompt-config.types';

/**
 * S7 Final Evaluation Configuration
 * Final quality evaluation before human review
 */
export const S7_FINAL_EVALUATION_CONFIG: PromptConfig = {
  model: {
    primary: 'claude-sonnet-4-20250514',
    fallback: 'gpt-4o',
    test: 'claude-haiku-4-5',
  },
  parameters: {
    temperature: 0.3, // Lower temperature for consistent evaluation
    maxTokens: 10000, // Large context for aggregating all outputs
    extendedThinking: false,
  },
  execution: {
    timeoutMs: 360000, // 6 minutes - evaluates entire course
    maxRetries: 2,
    retryDelayMs: 2000,
  },
  meta: {
    name: 'S7 Final Evaluation',
    version: '1.0.0',
    description: 'Final course quality evaluation with critical gates and scoring',
  },
};

/**
 * Get S7 config with environment-aware model selection
 */
export function getS7Config(env?: Environment): PromptConfig {
  const environment = env ?? getCurrentEnvironment();
  const config = { ...S7_FINAL_EVALUATION_CONFIG };

  if (environment !== 'production') {
    config.model = {
      ...config.model,
      primary: getModelForEnvironment(config, environment),
    };
  }

  return config;
}

/**
 * S7 quality score thresholds based on S1 confidence
 */
export const S7_SCORE_THRESHOLDS = {
  standard: 80, // For MEDIUM/HIGH confidence books
  strict: 85, // For LOW confidence books
  borderlineRange: 2, // Score within this range of threshold requires notes
};

