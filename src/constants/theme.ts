/**
 * Delivery Plus design tokens. Brand values come from `.github/skills/react-native-design-system/BRANDING.md`;
 * every other color is a tint/shade or semantic value recorded there. Components consume these tokens only.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const BrandColors = {
  // Brand (verified from the logo assets)
  primary: '#FF0000',
  packageTan: '#E4C98C',
  background: '#FFFCFC',

  // Brand derivatives
  primaryPressed: '#D90000',
  /** Red for text/icons on light surfaces — #FF0000 is below 4.5:1 contrast on white. */
  primaryText: '#D70000',
  primarySoft: '#FFEDED',
  onPrimary: '#FFFFFF',
  tanSoft: '#FAF3E3',

  // Surfaces
  surface: '#FFFFFF',
  surfaceMuted: '#F6F3F3',
  overlay: 'rgba(26, 26, 26, 0.45)',

  // Text
  text: '#1A1A1A',
  textSecondary: '#60646C',
  textMuted: '#8A8F98',

  // Lines
  border: '#E0E1E6',
  divider: '#EFEFF2',
  disabled: '#C7CED8',

  // Semantic — error is a deep crimson so it reads differently from the brand red
  danger: '#B42318',
  dangerSoft: '#FEF3F2',
  success: '#067647',
  successSoft: '#ECFDF3',
  warning: '#B54708',
  warningSoft: '#FFFAEB',
  info: '#175CD3',
  infoSoft: '#EFF8FF',
} as const;

/**
 * The app ships light-only for now (see BRANDING.md: no dark variant of the wordmark exists).
 * `Colors.dark` mirrors light so themed primitives never render white text on the light brand canvas.
 */
const lightPalette = {
  text: BrandColors.text,
  background: BrandColors.background,
  backgroundElement: BrandColors.surfaceMuted,
  backgroundSelected: BrandColors.border,
  textSecondary: BrandColors.textSecondary,
} as const;

export const Colors = {
  light: lightPalette,
  dark: lightPalette,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const IconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export const Layout = {
  /** Minimum touch target (Apple HIG / Material). */
  minTouch: 44,
  buttonHeight: 52,
  buttonHeightSm: 40,
  inputHeight: 52,
} as const;

export const Elevation = {
  low: Platform.select({
    web: { boxShadow: '0px 1px 3px rgba(26, 26, 26, 0.08)' },
    default: {
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
  }),
  medium: Platform.select({
    web: { boxShadow: '0px 6px 20px rgba(26, 26, 26, 0.12)' },
    default: {
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
