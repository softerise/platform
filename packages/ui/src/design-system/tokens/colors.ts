/**
 * @project/ui Design System - Color Tokens
 * 
 * KURUMSAL MİNİMAL PALET
 * - Monochrome base (siyah/beyaz/gri)
 * - Tek accent renk (Royal Blue)
 * - Semantic renkler (success/warning/error/info)
 * 
 * @usage
 * - Tailwind config'de extend edilir
 * - CSS Variables olarak export edilir
 * - Component'larda doğrudan kullanılmaz, Tailwind class'ları tercih edilir
 */

export const colors = {
  // ============================================
  // PRIMARY - Brand & Text Colors
  // ============================================
  primary: {
    DEFAULT: '#0A0A0A',      // Ink Black - Başlıklar, primary buttons
    foreground: '#FFFFFF',   // White - Primary button text
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',          // Medium Gray - Muted text
    600: '#525252',
    700: '#404040',          // Dark Gray - Secondary text
    800: '#262626',
    900: '#171717',          // Charcoal - Body text
    950: '#0A0A0A',          // Ink Black
  },

  // ============================================
  // NEUTRAL - Backgrounds & Borders
  // ============================================
  neutral: {
    white: '#FFFFFF',
    background: '#FAFAFA',   // Snow - Page background
    card: '#FFFFFF',         // White - Card background
    border: '#E5E5E5',       // Light border
    input: '#D4D4D4',        // Input border
    muted: '#F5F5F5',        // Muted background
  },

  // ============================================
  // ACCENT - CTA & Interactive Elements
  // ============================================
  accent: {
    DEFAULT: '#2563EB',      // Royal Blue
    foreground: '#FFFFFF',
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',          // Primary accent
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },

  // ============================================
  // SEMANTIC - Status Colors
  // ============================================
  semantic: {
    success: {
      DEFAULT: '#16A34A',
      light: '#DCFCE7',
      dark: '#15803D',
    },
    warning: {
      DEFAULT: '#CA8A04',
      light: '#FEF9C3',
      dark: '#A16207',
    },
    error: {
      DEFAULT: '#DC2626',
      light: '#FEE2E2',
      dark: '#B91C1C',
    },
    info: {
      DEFAULT: '#2563EB',
      light: '#DBEAFE',
      dark: '#1D4ED8',
    },
  },
} as const;

// Type exports
export type ColorToken = typeof colors;
export type PrimaryColor = keyof typeof colors.primary;
export type AccentColor = keyof typeof colors.accent;
export type SemanticColor = keyof typeof colors.semantic;
