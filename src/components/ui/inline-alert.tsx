import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';

type InlineAlertProps = {
  message: string;
  tone?: 'danger' | 'info' | 'success';
  onDismiss?: () => void;
  testID?: string;
};

const toneStyles = {
  danger: { background: BrandColors.dangerSoft, color: BrandColors.danger, icon: 'error' },
  info: { background: BrandColors.infoSoft, color: BrandColors.info, icon: 'clock' },
  success: { background: BrandColors.successSoft, color: BrandColors.success, icon: 'check' },
} as const;

export function InlineAlert({ message, tone = 'danger', onDismiss, testID }: InlineAlertProps) {
  const colors = toneStyles[tone];

  return (
    <View
      testID={testID} nativeID={testID}
      style={[styles.alert, { backgroundColor: colors.background }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Icon name={colors.icon} size={IconSize.md} color={colors.color} />
      <ThemedText type="small" style={[styles.message, { color: colors.color }]}>
        {message}
      </ThemedText>
      {onDismiss ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8} onPress={onDismiss}>
          <Icon name="close" size={IconSize.sm} color={colors.color} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.sm,
  },
  message: {
    flex: 1,
  },
});
