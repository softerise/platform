/**
 * @project/ui Design System - Spacing & Layout Tokens
 * 
 * BASE UNIT: 4px
 * GRID: 4px grid system
 * 
 * @rules
 * - Bol whitespace kullan
 * - Component içi: 8-16px
 * - Component arası: 16-24px
 * - Section arası: 32-48px
 */

export const spacing = {
  // ============================================
  // SPACING SCALE (4px base)
  // ============================================
  space: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
  },

  // ============================================
  // BORDER RADIUS (Sharp - Corporate)
  // ============================================
  borderRadius: {
    none: '0',
    sm: '2px',        // Subtle rounding
    DEFAULT: '4px',   // Standard
    md: '6px',        // Medium
    lg: '8px',        // Larger elements
    full: '9999px',   // Pills, avatars
  },

  // ============================================
  // BORDER WIDTH
  // ============================================
  borderWidth: {
    0: '0',
    DEFAULT: '1px',
    2: '2px',
  },

  // ============================================
  // SHADOWS (Minimal - Border focused)
  // ============================================
  boxShadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    // Focus rings
    ring: '0 0 0 2px rgb(37 99 235 / 0.2)',      // Accent focus
    'ring-error': '0 0 0 2px rgb(220 38 38 / 0.2)', // Error focus
  },

  // ============================================
  // Z-INDEX SCALE
  // ============================================
  zIndex: {
    0: '0',
    10: '10',       // Dropdowns
    20: '20',       // Sticky elements
    30: '30',       // Fixed elements
    40: '40',       // Modals backdrop
    50: '50',       // Modals
    60: '60',       // Popovers
    70: '70',       // Tooltips
    100: '100',     // Maximum
  },

  // ============================================
  // COMPONENT SIZING
  // ============================================
  componentSize: {
    // Button heights
    buttonSm: '32px',
    buttonMd: '40px',
    buttonLg: '48px',
    // Input heights
    inputSm: '32px',
    inputMd: '40px',
    inputLg: '48px',
    // Icon sizes
    iconSm: '16px',
    iconMd: '20px',
    iconLg: '24px',
  },

  // ============================================
  // LAYOUT CONTAINERS
  // ============================================
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1400px',
  },
} as const;

export type SpacingToken = typeof spacing;
