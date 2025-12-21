import {
  PromptConfig,
  Environment,
  getModelForEnvironment,
  getCurrentEnvironment,
  getValidationWithTolerance,
} from './prompt-config.types';

/**
 * S4 Episode Draft Configuration
 * Transforms S3 architecture into organized draft content per episode
 */
export const S4_EPISODE_DRAFT_CONFIG: PromptConfig = {
  model: {
    primary: 'claude-haiku-4-5',
    fallback: 'gpt-4o',
    test: 'claude-haiku-4-5',
  },
  parameters: {
    temperature: 0.7,
    maxTokens: 6000,
    extendedThinking: false, // Episode draft doesn't need extended thinking
  },
  execution: {
    timeoutMs: 180000, // 3 minutes
    maxRetries: 3,
    retryDelayMs: 1000,
  },
  validation: {
    minWordCount: 725,
    maxWordCount: 1235,
    tolerance: 0.25, // 25% tolerance
  },
  meta: {
    name: 'S4 Episode Draft',
    version: '2.0.0',
    description: 'Episode content draft generation with structured sections',
  },
};

/**
 * Get S4 config with environment-aware model selection
 */
export function getS4Config(env?: Environment): PromptConfig {
  const environment = env ?? getCurrentEnvironment();
  const config = { ...S4_EPISODE_DRAFT_CONFIG };

  if (environment !== 'production') {
    config.model = {
      ...config.model,
      primary: getModelForEnvironment(config, environment),
    };
  }

  return config;
}

/**
 * Get S4 validation thresholds with tolerance applied
 */
export function getS4ValidationThresholds(): {
  actualMin: number;
  actualMax: number;
  targetMin: number;
  targetMax: number;
} {
  return getValidationWithTolerance(S4_EPISODE_DRAFT_CONFIG.validation);
}

