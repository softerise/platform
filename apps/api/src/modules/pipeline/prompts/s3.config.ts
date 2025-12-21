import {
  PromptConfig,
  Environment,
  getModelForEnvironment,
  getCurrentEnvironment,
} from './prompt-config.types';

/**
 * S3 Course Outline Configuration
 * Creates pedagogically sound episode architecture from selected idea
 */
export const S3_COURSE_OUTLINE_CONFIG: PromptConfig = {
  model: {
    primary: 'claude-haiku-4-5',
    fallback: 'gpt-4o',
    test: 'claude-haiku-4-5',
  },
  parameters: {
    temperature: 0.6,
    maxTokens: 12000,
    extendedThinking: true,
    thinkingBudget: 8000,
  },
  execution: {
    timeoutMs: 300000, // 5 minutes
    maxRetries: 3,
    retryDelayMs: 1000,
  },
  validation: {
    minItems: 5, // Minimum 5 episodes
    maxItems: 10, // Maximum 10 episodes
  },
  meta: {
    name: 'S3 Course Outline',
    version: '1.0.0',
    description: 'Course structure and episode planning with pedagogical architecture',
  },
};

/**
 * Get S3 config with environment-aware model selection
 */
export function getS3Config(env?: Environment): PromptConfig {
  const environment = env ?? getCurrentEnvironment();
  const config = { ...S3_COURSE_OUTLINE_CONFIG };

  if (environment !== 'production') {
    config.model = {
      ...config.model,
      primary: getModelForEnvironment(config, environment),
    };
  }

  return config;
}

