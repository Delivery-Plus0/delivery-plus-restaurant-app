import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { RestaurantPicker } from '@/components/restaurant-picker';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api';
import type { MenuItem } from '@/services/menus';
import type { OwnerRestaurantStatus, Restaurant } from '@/services/restaurants';
import { useAuthSession } from '@/services/session';
import { selectRestaurantId, setItemAvailability, setRestaurantStatus, useRestaurantMenu, useSelectedRestaurant } from '@/state/restaurant';
import { canOwnerChangeStatus, groupMenu, OWNER_STATUSES } from '@/utils/availability';
import { formatMoney } from '@/utils/format';
import { RESTAURANT_STATUS_META } from '@/utils/order-status';

/** Keeps the menu list readable on wide screens. */
const MAX_MENU_WIDTH = 760;

const errorMessage = (caught: unknown, fallback: string) => (caught instanceof ApiError ? caught.message : fallback);

export default function MenuScreen() {
  const { session } = useAuthSession();
  const { restaurants, restaurant } = useSelectedRestaurant();
  const menu = useRestaurantMenu(restaurant?.id ?? null);

  async function refreshAll() {
    await Promise.all([restaurants.refresh(), restaurant ? menu.refresh() : Promise.resolve()]);
  }

  return (
    <Screen>
      <ScreenHeader title="Menu & availability" subtitle={restaurant?.name ?? session?.user.email} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={restaurants.refreshing || menu.refreshing} onRefresh={() => void refreshAll()} />}>
        {restaurants.isLoading ? (
          <SkeletonList count={2} itemHeight={72} />
        ) : restaurants.error && restaurants.data === undefined ? (
          <ErrorState error={restaurants.error} onRetry={() => void restaurants.refresh()} />
        ) : !restaurant ? (
          <StateView
            icon="store"
            title="No restaurant linked to this account"
            message="Ask an administrator to connect your owner account to a restaurant."
            testID="restaurants-empty"
          />
        ) : (
          <>
            <RestaurantPicker restaurants={restaurants.data ?? []} selectedId={restaurant.id} onSelect={selectRestaurantId} />
            <StatusCard key={`${restaurant.id}:${restaurant.status}`} restaurant={restaurant} />

            {menu.isLoading ? (
              <SkeletonList count={4} itemHeight={64} />
            ) : menu.error && menu.data === undefined ? (
              <ErrorState error={menu.error} onRetry={() => void menu.refresh()} />
            ) : !menu.data?.items.length ? (
              <StateView icon="food" title="No menu items yet" message="Items added to this restaurant's menu appear here." testID="menu-empty" />
            ) : (
              groupMenu(menu.data.categories, menu.data.items).map((section) => (
                <Card key={section.id} testID={`menu-section-${section.id}`}>
                  <ThemedText type="smallBold" accessibilityRole="header" style={styles.sectionTitle}>
                    {section.title}
                  </ThemedText>
                  {section.items.map((item, index) => (
                    <ItemRow key={`${item.id}:${item.available}`} restaurantId={restaurant.id} item={item} first={index === 0} />
                  ))}
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/** Whether the restaurant takes orders. Keyed by status, so a newer server state starts it fresh. */
function StatusCard({ restaurant }: { restaurant: Restaurant }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<OwnerRestaurantStatus | null>(null);
  const inFlight = useRef(false);
  const current = RESTAURANT_STATUS_META[restaurant.status];
  const editable = canOwnerChangeStatus(restaurant.status);

  async function change(status: OwnerRestaurantStatus) {
    if (inFlight.current || status === restaurant.status) return;
    inFlight.current = true;
    setPending(status);
    setError(null);
    try {
      await setRestaurantStatus(restaurant.id, status);
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to change the status right now.'));
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  return (
    <Card testID="restaurant-availability">
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText type="defaultBold">Taking orders</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {editable ? OWNER_STATUSES.find((s) => s.status === restaurant.status)?.hint : 'Suspended by an administrator. Contact support to be reinstated.'}
          </ThemedText>
        </View>
        <Badge label={current.label} tone={current.tone} testID="restaurant-status" />
      </View>
      {editable ? (
        <View style={styles.segments}>
          {OWNER_STATUSES.map((option) => {
            const selected = option.status === restaurant.status;
            return (
              <View key={option.status} style={styles.flex}>
                <AppButton
                  testID={`restaurant-status-${option.status}`}
                  title={option.label}
                  size="sm"
                  variant={selected ? 'primary' : 'secondary'}
                  loading={pending === option.status}
                  disabled={pending !== null}
                  accessibilityHint={selected ? 'Current status.' : `Sets the restaurant to ${option.label}.`}
                  onPress={() => void change(option.status)}
                />
              </View>
            );
          })}
        </View>
      ) : null}
      {error ? <InlineAlert message={error} testID="restaurant-status-error" /> : null}
    </Card>
  );
}

/** One menu item with its availability toggle. Keyed by availability, so a newer state drops a stale error. */
function ItemRow({ restaurantId, item, first }: { restaurantId: string; item: MenuItem; first: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inFlight = useRef(false);

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await setItemAvailability(restaurantId, item.id, !item.available);
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to update this item right now.'));
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.item, !first && styles.itemDivider]} testID={`item-${item.id}`} nativeID={`item-${item.id}`}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText type="default" numberOfLines={1} style={!item.available && styles.soldOutName}>
            {item.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatMoney(item.price)}
          </ThemedText>
        </View>
        <Badge label={item.available ? 'Available' : 'Sold out'} tone={item.available ? 'success' : 'neutral'} testID={`item-${item.id}-availability`} />
        <AppButton
          testID={`item-${item.id}-toggle`}
          title={item.available ? 'Mark sold out' : 'Mark available'}
          variant="ghost"
          size="sm"
          fullWidth={false}
          loading={isSaving}
          onPress={() => void toggle()}
        />
      </View>
      {error ? <InlineAlert message={error} testID={`item-${item.id}-error`} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MAX_MENU_WIDTH,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  segments: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  sectionTitle: {
    marginBottom: Spacing.one,
  },
  item: {
    paddingVertical: Spacing.two,
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.divider,
  },
  soldOutName: {
    color: BrandColors.textSecondary,
  },
});
