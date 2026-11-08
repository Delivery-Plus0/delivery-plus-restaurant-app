import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import type { Restaurant } from '@/services/restaurants';
import { APPROVAL_META, approvalStatusOf } from '@/utils/restaurant-application';

/**
 * Where the restaurant's application stands (#28), in place of the kitchen board until it is approved:
 * no restaurant yet → start; draft → continue; under review → menu editing is still open; changes
 * needed → the reviewer's note and a way back into the wizard.
 */
export function ApplicationStatusCard({ restaurant, onMenuScreen = false }: { restaurant: Restaurant | null; onMenuScreen?: boolean }) {
  const status = restaurant ? approvalStatusOf(restaurant) : null;
  const content: { icon: IconName; title: string; message: string; action: { title: string; testID: string; href: '/onboarding' | '/menu' } } =
    status === null
      ? {
          icon: 'store',
          title: t('Set up your restaurant'),
          message: t('Add your details, location and menu, then send it for review. Customers see it once it is approved.'),
          action: { title: t('Start'), testID: 'onboarding-start', href: '/onboarding' },
        }
      : status === 'SUBMITTED'
        ? {
            icon: 'clock',
            title: t('Your application is under review'),
            message: t('We check every new restaurant before customers can see it. You can keep editing your menu meanwhile.'),
            action: { title: t('Edit the menu'), testID: 'application-edit-menu', href: '/menu' },
          }
        : status === 'REJECTED'
          ? {
              icon: 'error',
              title: t('Your application needs changes'),
              message: restaurant?.approvalNote ?? restaurant?.lastReview?.note ?? t('The reviewer did not leave a note.'),
              action: { title: t('Fix and submit again'), testID: 'onboarding-continue', href: '/onboarding' },
            }
          : {
              icon: 'edit',
              title: t('Finish your application'),
              message: t('Your restaurant is saved as a draft. Complete the remaining steps and submit it for review.'),
              action: { title: t('Continue'), testID: 'onboarding-continue', href: '/onboarding' },
            };

  return (
    <Card testID="application-status">
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon name={content.icon} size={22} color={status === 'REJECTED' ? BrandColors.danger : BrandColors.primary} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="defaultBold" accessibilityRole="header">
            {content.title}
          </ThemedText>
          {restaurant ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {restaurant.name}
            </ThemedText>
          ) : null}
        </View>
        {status ? <Badge label={APPROVAL_META[status].label} tone={APPROVAL_META[status].tone} testID="application-status-badge" /> : null}
      </View>
      <ThemedText type="small" testID={status === 'REJECTED' ? 'application-review-note' : undefined}>
        {content.message}
      </ThemedText>
      {/* On the Menu screen, "edit the menu" would point at the screen itself. */}
      {onMenuScreen && content.action.href === '/menu' ? null : (
        <View style={styles.actions}>
          <AppButton testID={content.action.testID} title={content.action.title} fullWidth={false} onPress={() => router.push(content.action.href)} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primarySoft,
  },
  actions: { flexDirection: 'row', marginTop: Spacing.two },
});
