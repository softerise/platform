/**
 * @project/ui Design System - Typography Tokens
 * 
 * FONT: Inter
 * SCALE: Modular scale based on 16px base
 * WEIGHTS: Normal (400), Medium (500), Semibold (600)
 * 
 * @rules
 * - Max 2 font weights per page section
 * - Headings: Semibold
 * - Body: Normal
 * - Labels/Buttons: Medium
 */

export const typography = {
  // ============================================
  // FONT FAMILY
  // ============================================
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
  },

  // ============================================
  // FONT SIZE SCALE
  // ============================================
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],        // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],       // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],     // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
  },

  // ============================================
  // FONT WEIGHT
  // ============================================
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
  },

  // ============================================
  // LETTER SPACING
  // ============================================
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },

  // ============================================
  // PREDEFINED TEXT STYLES
  // ============================================
  textStyles: {
    // Headings
    h1: {
      fontSize: '2.25rem',    // 36px
      lineHeight: '2.5rem',
      fontWeight: '600',
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '1.875rem',   // 30px
      lineHeight: '2.25rem',
      fontWeight: '600',
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.5rem',     // 24px
      lineHeight: '2rem',
      fontWeight: '600',
    },
    h4: {
      fontSize: '1.25rem',    // 20px
      lineHeight: '1.75rem',
      fontWeight: '600',
    },
    // Body
    body: {
      fontSize: '1rem',       // 16px
      lineHeight: '1.5rem',
      fontWeight: '400',
    },
    bodySmall: {
      fontSize: '0.875rem',   // 14px
      lineHeight: '1.25rem',
      fontWeight: '400',
    },
    // UI Elements
    label: {
      fontSize: '0.875rem',   // 14px
      lineHeight: '1.25rem',
      fontWeight: '500',
    },
    caption: {
      fontSize: '0.75rem',    // 12px
      lineHeight: '1rem',
      fontWeight: '400',
    },
    button: {
      fontSize: '0.875rem',   // 14px
      lineHeight: '1.25rem',
      fontWeight: '500',
    },
  },
} as const;

export type TypographyToken = typeof typography;
export type TextStyle = keyof typeof typography.textStyles;
