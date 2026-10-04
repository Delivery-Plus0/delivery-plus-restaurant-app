import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, IconSize, Layout, Radius } from '@/constants/theme';

type IconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  badgeCount?: number;
  color?: string;
  disabled?: boolean;
  variant?: 'plain' | 'filled';
  testID?: string;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  badgeCount = 0,
  color = BrandColors.text,
  disabled = false,
  variant = 'filled',
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      testID={testID} nativeID={testID}
      accessibilityRole="button"
      accessibilityLabel={badgeCount > 0 ? `${accessibilityLabel}, ${badgeCount}` : accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'filled' && styles.filled,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={IconSize.md} color={color} />
      {badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: Layout.minTouch,
    height: Layout.minTouch,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  pressed: {
    backgroundColor: BrandColors.surfaceMuted,
  },
  disabled: {
    opacity: 0.4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BrandColors.surface,
  },
  badgeText: {
    color: BrandColors.onPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
});
