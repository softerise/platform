/**
 * Centralized Prompt Configuration Exports
 * Provides unified access to all pipeline prompt configs and utilities
 */

// Type definitions
export * from './prompt-config.types';

// Individual configs
export { S2_IDEA_INSPIRATION_CONFIG, getS2Config } from './s2.config';
export { S3_COURSE_OUTLINE_CONFIG, getS3Config } from './s3.config';
export {
  S4_EPISODE_DRAFT_CONFIG,
  getS4Config,
  getS4ValidationThresholds,
} from './s4.config';
export {
  S5_EPISODE_CONTENT_CONFIG,
  getS5Config,
  getS5ValidationThresholds,
} from './s5.config';
export { S6_PRACTICE_CONTENT_CONFIG, getS6Config } from './s6.config';
export {
  S7_FINAL_EVALUATION_CONFIG,
  getS7Config,
  S7_SCORE_THRESHOLDS,
} from './s7.config';

// Prompt templates
export { S2_PROMPT } from './s2-idea-inspiration.prompt';
export type { S2PromptParams } from './s2-idea-inspiration.prompt';
export { S3_PROMPT } from './s3-course-outline.prompt';
export type { S3PromptParams } from './s3-course-outline.prompt';
export { S4_PROMPT } from './s4-episode-draft.prompt';
export type { S4PromptParams } from './s4-episode-draft.prompt';
export { S5_PROMPT } from './s5-episode-content.prompt';
export type { S5PromptParams } from './s5-episode-content.prompt';
export { S6_PROMPT } from './s6-practice-content.prompt';
export type { S6PromptParams, PracticeLevel } from './s6-practice-content.prompt';
export { S7_PROMPT } from './s7-final-evaluation.prompt';
export type { S7PromptParams } from './s7-final-evaluation.prompt';

// Import configs for registry
import { S2_IDEA_INSPIRATION_CONFIG } from './s2.config';
import { S3_COURSE_OUTLINE_CONFIG } from './s3.config';
import { S4_EPISODE_DRAFT_CONFIG } from './s4.config';
import { S5_EPISODE_CONTENT_CONFIG } from './s5.config';
import { S6_PRACTICE_CONTENT_CONFIG } from './s6.config';
import { S7_FINAL_EVALUATION_CONFIG } from './s7.config';
import { PromptConfig } from './prompt-config.types';

/**
 * Central registry of all prompt configurations
 * Useful for debugging, admin panels, and runtime inspection
 */
export const PROMPT_CONFIGS = {
  S2_IDEA_INSPIRATION: S2_IDEA_INSPIRATION_CONFIG,
  S3_COURSE_OUTLINE: S3_COURSE_OUTLINE_CONFIG,
  S4_EPISODE_DRAFT: S4_EPISODE_DRAFT_CONFIG,
  S5_EPISODE_CONTENT: S5_EPISODE_CONTENT_CONFIG,
  S6_PRACTICE_CONTENT: S6_PRACTICE_CONTENT_CONFIG,
  S7_FINAL_EVALUATION: S7_FINAL_EVALUATION_CONFIG,
} as const;

export type PromptConfigKey = keyof typeof PROMPT_CONFIGS;

/**
 * Get config by step name
 */
export function getPromptConfig(step: PromptConfigKey): PromptConfig {
  return PROMPT_CONFIGS[step];
}

