import {
  PromptConfig,
  Environment,
  getModelForEnvironment,
  getCurrentEnvironment,
} from '../../pipeline/prompts/prompt-config.types';

/**
 * S1 Book Evaluation Configuration
 * Evaluates book suitability using Multi-Layer Gated Evaluation (MLGE) system
 */
export const S1_EVALUATION_CONFIG: PromptConfig = {
  model: {
    primary: 'claude-haiku-4-5',
    fallback: 'gpt-4o',
    test: 'claude-haiku-4-5',
  },
  parameters: {
    temperature: 0.5, // Lower temperature for consistent evaluation
    maxTokens: 4000,
    extendedThinking: false,
  },
  execution: {
    timeoutMs: 120000, // 2 minutes
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  meta: {
    name: 'S1 Book Evaluation',
    version: '1.0.0',
    description: 'Book suitability evaluation using Multi-Layer Gated Evaluation (MLGE) system',
  },
};

/**
 * Get S1 config with environment-aware model selection
 */
export function getS1Config(env?: Environment): PromptConfig {
  const environment = env ?? getCurrentEnvironment();
  const config = { ...S1_EVALUATION_CONFIG };

  if (environment !== 'production') {
    config.model = {
      ...config.model,
      primary: getModelForEnvironment(config, environment),
    };
  }

  return config;
}

