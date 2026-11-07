import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { BrandColors, Fonts, fontFamilyFor, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  const family = textFontFamily(type, style);

  return (
    <Text
      style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style, family ? { fontFamily: family } : null]}
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

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 700,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
    letterSpacing: -0.2,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 500,
  },
  defaultBold: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 700,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 700,
    color: BrandColors.primaryText,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
