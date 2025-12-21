import {
  PromptConfig,
  Environment,
  getModelForEnvironment,
  getCurrentEnvironment,
} from './prompt-config.types';

/**
 * S2 Idea Inspiration Configuration
 * Generates Diamond/Gold ideas from verified source books
 */
export const S2_IDEA_INSPIRATION_CONFIG: PromptConfig = {
  model: {
    primary: 'claude-haiku-4-5',
    fallback: 'gpt-4o',
    test: 'claude-haiku-4-5',
  },
  parameters: {
    temperature: 0.7,
    maxTokens: 8000,
    extendedThinking: true,
    thinkingBudget: 5000,
  },
  execution: {
    timeoutMs: 300000, // 5 minutes
    maxRetries: 3,
    retryDelayMs: 1000,
  },
  validation: {
    minItems: 1, // At least 1 idea
    maxItems: 5, // Maximum 5 ideas
  },
  meta: {
    name: 'S2 Idea Inspiration',
    version: '1.0.0',
    description: 'Diamond idea generation from verified DIAMOND/GOLD source books',
  },
};

/**
 * Get S2 config with environment-aware model selection
 */
export function getS2Config(env?: Environment): PromptConfig {
  const environment = env ?? getCurrentEnvironment();
  const config = { ...S2_IDEA_INSPIRATION_CONFIG };

  // Override model for non-production environments
  if (environment !== 'production') {
    config.model = {
      ...config.model,
      primary: getModelForEnvironment(config, environment),
    };
  }

  return config;
}

