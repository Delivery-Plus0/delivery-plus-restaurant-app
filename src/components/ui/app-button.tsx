import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, FontFamily, IconSize, Layout, Radius, Spacing } from '@/constants/theme';

/**
 * Figma "Button" (Redesign 2026): Primary (one per screen), Secondary (outline), Tonal (brand-subtle, e.g. Add),
 * Ghost (text only), Danger (destructive entry points: crimson on crimson-subtle).
 */
type Variant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  /** md = 52 (main actions), sm = 44 (touch minimum), xs = 36 (dense rows and dashboards). */
  size?: 'md' | 'sm' | 'xs';
  icon?: IconName;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

const labelColor: Record<Variant, string> = {
  primary: BrandColors.onPrimary,
  secondary: BrandColors.text,
  tonal: BrandColors.primaryText,
  ghost: BrandColors.primaryText,
  danger: BrandColors.danger,
};

export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = true,
  accessibilityHint,
  testID,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  // Disabled is a style of its own (muted fill and text), so it never relies on opacity alone.
  const color = isDisabled && !loading ? BrandColors.textDisabled : labelColor[variant];

  return (
    <Pressable
      testID={testID} nativeID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.small,
        size === 'xs' && styles.xsmall,
        fullWidth && styles.fullWidth,
        styles[variant],
        pressed && pressedStyles[variant],
        isDisabled && !loading && variant !== 'ghost' && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={IconSize.sm} color={color} /> : null}
          <Text style={[styles.label, size !== 'md' && styles.labelSmall, { color }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: Layout.buttonHeight,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four - Spacing.one,
  },
  small: {
    height: Layout.buttonHeightSm,
    paddingHorizontal: Spacing.three,
  },
  xsmall: {
    height: Layout.buttonHeightXs,
    paddingHorizontal: Spacing.two + Spacing.one,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  primary: {
    backgroundColor: BrandColors.primary,
  },
  secondary: {
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: BrandColors.borderStrong,
  },
  tonal: {
    backgroundColor: BrandColors.primarySoft,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: BrandColors.dangerSoft,
  },
  disabled: {
    backgroundColor: BrandColors.disabledSurface,
    borderColor: BrandColors.disabledSurface,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    fontFamily: FontFamily.semibold,
  },
  labelSmall: {
    fontSize: 13,
    lineHeight: 18,
  },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: BrandColors.primaryPressed },
  secondary: { backgroundColor: BrandColors.surfaceMuted },
  tonal: { backgroundColor: BrandColors.primarySoftStrong },
  ghost: { backgroundColor: BrandColors.primarySoft },
  danger: { opacity: 0.8 },
});
