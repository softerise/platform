import {
  PromptConfig,
  Environment,
  getModelForEnvironment,
  getCurrentEnvironment,
} from './prompt-config.types';

/**
 * S6 Practice Content Configuration
 * Generates practice sessions for the entire course (9 sessions, 27 questions)
 */
export const S6_PRACTICE_CONTENT_CONFIG: PromptConfig = {
  model: {
    primary: 'claude-sonnet-4-20250514',
    fallback: 'gpt-4o',
    test: 'claude-haiku-4-5',
  },
  parameters: {
    temperature: 0.6,
    maxTokens: 8000,
    extendedThinking: false,
  },
  execution: {
    timeoutMs: 300000, // 5 minutes - large output
    maxRetries: 3,
    retryDelayMs: 2000,
  },
  validation: {
    minItems: 9, // 9 practice sessions
    maxItems: 9,
  },
  meta: {
    name: 'S6 Practice Content',
    version: '1.0.0',
    description: 'Practice content generation for entire course (9 sessions, 27 questions)',
  },
};

/**
 * Get S6 config with environment-aware model selection
 */
export function getS6Config(env?: Environment): PromptConfig {
  const environment = env ?? getCurrentEnvironment();
  const config = { ...S6_PRACTICE_CONTENT_CONFIG };

  if (environment !== 'production') {
    config.model = {
      ...config.model,
      primary: getModelForEnvironment(config, environment),
    };
  }

  return config;
}

