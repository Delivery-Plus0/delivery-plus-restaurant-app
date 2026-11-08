import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'orders', text: t('New paid orders arrive automatically') },
  { icon: 'clock', text: t('Move each order from kitchen to pickup') },
  { icon: 'food', text: t('Keep your menu and availability up to date') },
];

/** The brand panel beside the desktop sign-in (Figma R-01). */
export function RestaurantBrandPanel() {
  return (
    <View style={styles.root} testID="login-brand-panel" nativeID="login-brand-panel">
      <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel={t('Delivery Plus')} />
      <View style={styles.body}>
        <ThemedText type="subtitle" style={styles.ink}>
          {t('Your kitchen order desk')}
        </ThemedText>
        {POINTS.map((point) => (
          <View key={point.text} style={styles.point}>
            <View style={styles.pointIcon}>
              <Icon name={point.icon} size={IconSize.md} color={BrandColors.primary} />
            </View>
            <ThemedText type="default" style={[styles.ink, styles.pointText]}>
              {point.text}
            </ThemedText>
          </View>
        ))}
      </View>
      <ThemedText type="caption" style={styles.footnote}>
        {t('Delivery Plus · Restaurant')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.six,
  },
  logo: {
    width: 220,
    height: 54,
  },
  body: {
    gap: Spacing.four - Spacing.one,
  },
  ink: {
    color: BrandColors.onTan,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: BrandColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    flex: 1,
  },
  footnote: {
    color: BrandColors.tanText,
  },
});
