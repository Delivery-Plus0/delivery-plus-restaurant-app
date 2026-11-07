import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { BrandColors, Fonts, fontFamilyFor, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, useLocale } from '@/i18n';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'defaultBold'
    | 'title'
    | 'subtitle'
    | 'heading'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const arabic = isRTL(useLocale());
  const family = textFontFamily(type, style);

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        styles[type],
        arabic ? arabicStyles[type] : null,
        style,
        family ? { fontFamily: family } : null,
      ]}
      nativeID={rest.nativeID ?? rest.testID}
      {...rest}
    />
  );
}

/**
 * Readex Pro has one family per weight (Android ignores `fontWeight` on custom fonts), so the family follows
 * the final weight, including a weight set by the caller's style. An explicit non-Readex family (mono) wins.
 */
export function textFontFamily(type: NonNullable<ThemedTextProps['type']>, style: TextProps['style']): string | null {
  if (type === 'code') return null;
  const flat: TextStyle = StyleSheet.flatten([styles[type], style]) ?? {};
  if (flat.fontFamily && !flat.fontFamily.startsWith('ReadexPro')) return null;
  return fontFamilyFor(flat.fontWeight);
}

/**
 * The Figma type ramp (Redesign 2026). `title` = Display, `subtitle` = Title L, `heading` = Title M,
 * `defaultBold` = Title S, `default` = Body L, `small` = Body M, `smallBold` = Body M Strong, `caption` = Caption.
 */
const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 700,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
    letterSpacing: -0.1,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 400,
  },
  defaultBold: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 600,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 400,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 500,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 600,
    color: BrandColors.primaryText,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});

/** Arabic needs taller lines (and a slightly larger small size) for its marks to breathe. No letter spacing. */
const arabicStyles = StyleSheet.create({
  title: { lineHeight: 42, letterSpacing: 0 },
  subtitle: { lineHeight: 34, letterSpacing: 0 },
  heading: { lineHeight: 28 },
  default: { lineHeight: 26 },
  defaultBold: { lineHeight: 26 },
  small: { fontSize: 15, lineHeight: 24 },
  smallBold: { fontSize: 15, lineHeight: 24 },
  caption: { lineHeight: 18 },
  link: {},
  linkPrimary: {},
  code: {},
});
