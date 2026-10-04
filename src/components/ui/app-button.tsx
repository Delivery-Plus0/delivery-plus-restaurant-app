import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, IconSize, Layout, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: IconName;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

const labelColor: Record<Variant, string> = {
  primary: BrandColors.onPrimary,
  secondary: BrandColors.primaryText,
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
  const color = labelColor[variant];

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
        fullWidth && styles.fullWidth,
        styles[variant],
        pressed && pressedStyles[variant],
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={IconSize.sm} color={color} /> : null}
          <Text style={[styles.label, size === 'sm' && styles.labelSmall, { color }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: Layout.buttonHeight,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  small: {
    height: Layout.buttonHeightSm,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
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
    borderColor: BrandColors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: BrandColors.dangerSoft,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  labelSmall: {
    fontSize: 14,
  },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: BrandColors.primaryPressed },
  secondary: { backgroundColor: BrandColors.surfaceMuted },
  ghost: { backgroundColor: BrandColors.primarySoft },
  danger: { opacity: 0.8 },
});
