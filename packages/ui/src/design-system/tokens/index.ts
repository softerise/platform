/**
 * @project/ui Design System - Token Exports
 * 
 * Single source of truth for all design tokens.
 * Import from here, not from individual files.
 */

export * from './colors';
export * from './typography';
export * from './spacing';

// Re-export as unified object
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

export const designTokens = {
  colors,
  typography,
  spacing,
} as const;

export type DesignTokens = typeof designTokens;
