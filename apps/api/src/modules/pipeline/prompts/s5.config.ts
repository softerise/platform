import {
  PromptConfig,
  Environment,
  getModelForEnvironment,
  getCurrentEnvironment,
  getValidationWithTolerance,
} from './prompt-config.types';

/**
 * S5 Episode Content Configuration
 * Transforms S4 draft into production-ready audio script
 */
export const S5_EPISODE_CONTENT_CONFIG: PromptConfig = {
  model: {
    primary: 'claude-haiku-4-5',
    fallback: 'gpt-4o',
    test: 'claude-haiku-4-5',
  },
  parameters: {
    temperature: 0.7,
    maxTokens: 8000,
    extendedThinking: false, // Audio script transformation doesn't need extended thinking
  },
  execution: {
    timeoutMs: 180000, // 3 minutes
    maxRetries: 3,
    retryDelayMs: 1000,
  },
  validation: {
    minWordCount: 745,
    maxWordCount: 1295,
    tolerance: 0.20, // 20% tolerance
  },
  meta: {
    name: 'S5 Episode Content',
    version: '2.0.0',
    description: 'Final episode audio script with production-ready content',
  },
};

/**
 * Get S5 config with environment-aware model selection
 */
export function getS5Config(env?: Environment): PromptConfig {
  const environment = env ?? getCurrentEnvironment();
  const config = { ...S5_EPISODE_CONTENT_CONFIG };

  if (environment !== 'production') {
    config.model = {
      ...config.model,
      primary: getModelForEnvironment(config, environment),
    };
  }

  return config;
}

/**
 * Get S5 validation thresholds with tolerance applied
 */
export function getS5ValidationThresholds(): {
  actualMin: number;
  actualMax: number;
  targetMin: number;
  targetMax: number;
} {
  return getValidationWithTolerance(S5_EPISODE_CONTENT_CONFIG.validation);
}

