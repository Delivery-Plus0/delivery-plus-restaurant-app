/**
 * Delivery Plus design tokens (Redesign 2026). Values mirror the Figma variables in "Delivery Plus — Product
 * Redesign 2026" (00 System → Primitives / Color). Components consume these tokens only.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const BrandColors = {
  // Brand (Redesign 2026: red sampled from the logo, parcel gold accent)
  primary: '#D81A14',
  packageTan: '#F2C97E',
  background: '#FBF8F5',

  // Brand derivatives
  primaryPressed: '#B3140F',
  /** Red for text/icons on light surfaces (6.9:1 on white). */
  primaryText: '#B3140F',
  primarySoft: '#FDEDEC',
  onPrimary: '#FFFFFF',
  tanSoft: '#FCF3E3',
  /** Text on the gold accent. */
  onTan: '#4A300A',

  // Surfaces (warm neutrals)
  surface: '#FFFFFF',
  surfaceMuted: '#F6F1EC',
  overlay: 'rgba(31, 26, 23, 0.5)',

  // Text
  text: '#1F1A17',
  textSecondary: '#645A53',
  /** Darkened from the ramp's 500 so it still passes 4.5:1 on the canvas. */
  textMuted: '#74695F',

  // Lines
  border: '#E6DDD5',
  divider: '#EFE8E1',
  disabled: '#D3C8BE',

  // Semantic — error is a deep crimson so it reads differently from the brand red
  danger: '#9B1222',
  dangerSoft: '#FDF0F1',
  success: '#126B34',
  successSoft: '#E8F6EC',
  warning: '#8F5200',
  warningSoft: '#FFF4E0',
  info: '#174CA8',
  infoSoft: '#EAF1FD',
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

/**
 * Readex Pro (Arabic + Latin), loaded in the root layout from @expo-google-fonts/readex-pro. Custom fonts
 * ignore `fontWeight` on Android, so each weight is its own family: use `fontFamilyFor(weight)`.
 */
export const FontFamily = {
  light: 'ReadexPro_300Light',
  regular: 'ReadexPro_400Regular',
  medium: 'ReadexPro_500Medium',
  semibold: 'ReadexPro_600SemiBold',
  bold: 'ReadexPro_700Bold',
} as const;

type FontWeightValue = number | string | undefined;

/** The Readex Pro family for a numeric or named weight (defaults to regular). */
export function fontFamilyFor(weight: FontWeightValue): string {
  const value = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : Number(weight);
  if (value >= 700) return FontFamily.bold;
  if (value >= 600) return FontFamily.semibold;
  if (value >= 500) return FontFamily.medium;
  if (value <= 300) return FontFamily.light;
  return FontFamily.regular;
}

export const Fonts = Platform.select({
  ios: {
    sans: FontFamily.regular,
    serif: 'ui-serif',
    rounded: FontFamily.regular,
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: FontFamily.regular,
    serif: 'serif',
    rounded: FontFamily.regular,
    mono: 'monospace',
  },
  web: {
    sans: FontFamily.regular,
    serif: 'var(--font-serif)',
    rounded: FontFamily.regular,
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
  xl: 24,
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
    web: { boxShadow: '0px 1px 3px rgba(31, 26, 23, 0.08)' },
    default: {
      shadowColor: '#1F1A17',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
  }),
  medium: Platform.select({
    web: { boxShadow: '0px 6px 20px rgba(31, 26, 23, 0.12)' },
    default: {
      shadowColor: '#1F1A17',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/**
 * Bottom tab bar (#53, #45): room for the icon and a full line of label text in both languages. On the web
 * React Navigation's 49 px tab item shrank the label (the last flex child) to about 11 px, cutting its
 * lower half. The label no longer shrinks, and the web bar is tall enough for icon + label.
 */
export const TabBar = {
  style: Platform.select({ web: { height: 64, paddingTop: 4, paddingBottom: 4 }, default: {} }),
  labelStyle: { fontSize: 12, lineHeight: 18, fontWeight: '600' as const, fontFamily: FontFamily.semibold, flexShrink: 0 },
} as const;
export const MaxContentWidth = 800;
