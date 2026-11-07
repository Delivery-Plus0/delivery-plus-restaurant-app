import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, IconSize, Layout, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/services/session';
import { openAccountAction } from '@/state/account-ui';
import { selectRestaurantId, useSelectedRestaurant } from '@/state/restaurant';
import { RESTAURANT_STATUS_META } from '@/utils/order-status';
import { LOCALE_NAMES, setLocale, t, useLocale } from '@/i18n';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** From this width the dashboard shows the sidebar instead of the bottom tabs (Figma R-03, R-11). */
export const SIDEBAR_MIN_WIDTH = 1024;

const ROUTE_ICONS: Record<string, IconName> = { home: 'orders', menu: 'food' };

/** The desktop navigation: logo, the restaurant, the two sections, then language, password and sign out. */
export function DashboardSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { session } = useAuthSession();
  const { restaurants, restaurant } = useSelectedRestaurant();
  const locale = useLocale();
  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const others = (restaurants.data ?? []).filter((r) => r.id !== restaurant?.id);

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.root} testID="sidebar" nativeID="sidebar">
      <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel={t('Delivery Plus')} />

      {restaurant ? (
        <View style={styles.restaurant}>
          <View style={styles.restaurantIcon}>
            <Icon name="store" size={IconSize.md} color={BrandColors.primary} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {restaurant.name}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {RESTAURANT_STATUS_META[restaurant.status].label} · {session?.user.email}
            </ThemedText>
          </View>
        </View>
      ) : null}
      {others.map((r) => (
        <Pressable
          key={r.id}
          testID={`sidebar-restaurant-${r.id}`}
          nativeID={`sidebar-restaurant-${r.id}`}
          accessibilityRole="button"
          onPress={() => selectRestaurantId(r.id)}
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        >
          <Icon name="store" size={IconSize.sm} color={BrandColors.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
            {r.name}
          </ThemedText>
        </Pressable>
      ))}

      <View style={styles.nav} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          return (
            <Pressable
              key={route.key}
              testID={options.tabBarButtonTestID}
              nativeID={options.tabBarButtonTestID}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              style={({ pressed }) => [styles.item, focused && styles.itemActive, pressed && !focused && styles.itemPressed]}
            >
              <Icon name={ROUTE_ICONS[route.name] ?? 'home'} size={IconSize.md} color={focused ? BrandColors.primary : BrandColors.textSecondary} />
              <ThemedText type="smallBold" style={{ color: focused ? BrandColors.primaryText : BrandColors.text }}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <SidebarAction testID={`language-${otherLocale}`} icon="language" label={LOCALE_NAMES[otherLocale]} onPress={() => void setLocale(otherLocale)} />
        <SidebarAction testID="change-password" icon="lock" label={t('Change password')} onPress={() => openAccountAction('password')} />
        <SidebarAction testID="sign-out" icon="logout" label={t('Sign out')} onPress={() => openAccountAction('sign-out')} />
      </View>
    </SafeAreaView>
  );
}

function SidebarAction({ testID, icon, label, onPress }: { testID: string; icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      testID={testID}
      nativeID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <Icon name={icon} size={IconSize.md} color={BrandColors.textSecondary} />
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 264,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.two,
    backgroundColor: BrandColors.surface,
    borderEndWidth: 1,
    borderEndColor: BrandColors.border,
  },
  flex: {
    flex: 1,
  },
  logo: {
    width: 170,
    height: 42,
    marginBottom: Spacing.three,
    marginHorizontal: Spacing.two,
  },
  restaurant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
    padding: Spacing.two + Spacing.half,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.surfaceMuted,
    marginBottom: Spacing.two,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: BrandColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    gap: Spacing.one,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    minHeight: Layout.minTouch,
    paddingHorizontal: Spacing.three - Spacing.one,
    borderRadius: Radius.sm,
  },
  itemActive: {
    backgroundColor: BrandColors.primarySoft,
  },
  itemPressed: {
    backgroundColor: BrandColors.surfaceMuted,
  },
  footer: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.border,
  },
});
