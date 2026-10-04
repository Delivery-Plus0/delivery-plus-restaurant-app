import { StyleSheet, Text, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/constants/theme';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const toneColors: Record<BadgeTone, { background: string; text: string }> = {
  neutral: { background: BrandColors.surfaceMuted, text: BrandColors.textSecondary },
  brand: { background: BrandColors.primarySoft, text: BrandColors.primaryText },
  success: { background: BrandColors.successSoft, text: BrandColors.success },
  warning: { background: BrandColors.warningSoft, text: BrandColors.warning },
  danger: { background: BrandColors.dangerSoft, text: BrandColors.danger },
  info: { background: BrandColors.infoSoft, text: BrandColors.info },
};

export function Badge({ label, tone = 'neutral', testID }: { label: string; tone?: BadgeTone; testID?: string }) {
  const colors = toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      {/* The id sits on the text node so UI tests can match id + label together. */}
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1} testID={testID} nativeID={testID}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.half,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
