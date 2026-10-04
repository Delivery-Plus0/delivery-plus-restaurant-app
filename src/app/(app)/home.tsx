import { useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { RestaurantOrderCard } from '@/components/restaurant-order-card';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, IconSize, Layout, Radius, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api';
import type { KitchenStatus, RestaurantOrder } from '@/services/restaurant-orders';
import type { Restaurant } from '@/services/restaurants';
import { clearSession, useAuthSession } from '@/services/session';
import { advanceOrder, ORDERS_POLL_MS, useMyRestaurants, useRestaurantOrders } from '@/state/restaurant';
import { confirm } from '@/utils/confirm';
import { groupOrdersByLane, KITCHEN_LANES, RESTAURANT_STATUS_META, selectRestaurant } from '@/utils/order-status';

/** Three lanes side by side from here; two below it; one on phones. */
const WIDE = 1024;
const MEDIUM = 680;
/** Keeps lines readable on very wide kitchen screens. */
const MAX_BOARD_WIDTH = 1440;

export default function HomeScreen() {
  const { session } = useAuthSession();
  const { width } = useWindowDimensions();
  const restaurants = useMyRestaurants();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const restaurant = selectRestaurant(restaurants.data, selectedId);
  const orders = useRestaurantOrders(restaurant?.id ?? null);
  const [showOther, setShowOther] = useState(false);

  async function signOut() {
    const ok = await confirm({ title: 'Sign out?', message: 'You can sign back in at any time.', confirmLabel: 'Sign out' });
    if (ok) await clearSession();
  }

  async function refreshAll() {
    await Promise.all([restaurants.refresh(), restaurant ? orders.refresh() : Promise.resolve()]);
  }

  const columns = width >= WIDE ? 3 : width >= MEDIUM ? 2 : 1;
  const { lanes, other } = groupOrdersByLane(orders.data?.items ?? []);

  return (
    <Screen>
      <ScreenHeader
        title={restaurant?.name ?? 'Delivery Plus Restaurant'}
        subtitle={session?.user.email}
        right={<AppButton testID="sign-out" title="Sign out" icon="logout" variant="ghost" size="sm" onPress={() => void signOut()} />}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={restaurants.refreshing || orders.refreshing} onRefresh={() => void refreshAll()} />}>
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
            {restaurants.data && restaurants.data.length > 1 ? (
              <RestaurantPicker restaurants={restaurants.data} selectedId={restaurant.id} onSelect={setSelectedId} />
            ) : null}

            <RestaurantCard
              restaurant={restaurant}
              counts={KITCHEN_LANES.map((lane) => ({ label: lane.title, value: lanes[lane.status].length }))}
            />

            <View style={styles.boardHeader}>
              <View style={styles.flex}>
                <ThemedText type="subtitle" accessibilityRole="header">
                  Kitchen orders
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  New paid orders appear here automatically. This screen checks every {ORDERS_POLL_MS / 1000} seconds.
                </ThemedText>
              </View>
              <AppButton
                testID="orders-refresh"
                title="Refresh"
                icon="refresh"
                variant="secondary"
                size="sm"
                fullWidth={false}
                loading={orders.refreshing}
                onPress={() => void orders.refresh()}
              />
            </View>

            {orders.isLoading ? (
              <SkeletonList count={3} itemHeight={140} />
            ) : orders.error && orders.data === undefined ? (
              <ErrorState error={orders.error} onRetry={() => void orders.refresh()} />
            ) : (
              <>
                {orders.error ? <InlineAlert message="Couldn't refresh the orders. Showing the last ones loaded." testID="orders-stale" /> : null}
                <View style={styles.board}>
                  {KITCHEN_LANES.map((lane) => (
                    <View key={lane.status} style={[styles.lane, { width: columns === 1 ? '100%' : columns === 2 ? '48.5%' : '31.8%' }]}>
                      <LaneHeader title={lane.title} note={lane.note} count={lanes[lane.status].length} testID={`lane-${lane.status}`} />
                      {lanes[lane.status].length ? (
                        // Keyed by status too: a newer server state starts the card fresh, dropping an earlier error.
                        lanes[lane.status].map((order) => <KitchenOrder key={`${order.id}:${order.status}`} restaurantId={restaurant.id} order={order} />)
                      ) : (
                        <View style={styles.emptyLane}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Nothing here
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {other.length ? (
                  <View style={styles.other}>
                    <AppButton
                      testID="orders-toggle-other"
                      title={showOther ? 'Hide other orders' : `Show other orders (${other.length})`}
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      onPress={() => setShowOther((value) => !value)}
                    />
                    {showOther ? (
                      <View style={[styles.board, styles.otherList]}>
                        {other.map((order) => (
                          <View key={order.id} style={[styles.lane, { width: columns === 1 ? '100%' : columns === 2 ? '48.5%' : '31.8%' }]}>
                            <RestaurantOrderCard order={order} />
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function RestaurantPicker({ restaurants, selectedId, onSelect }: { restaurants: Restaurant[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <View style={styles.picker} accessibilityLabel="Choose restaurant">
      {restaurants.map((r) => {
        const selected = r.id === selectedId;
        return (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(r.id)}
            style={[styles.chip, selected && styles.chipSelected]}
            testID={`restaurant-select-${r.id}`}
            nativeID={`restaurant-select-${r.id}`}>
            <ThemedText type="smallBold" style={{ color: selected ? BrandColors.primaryText : BrandColors.textSecondary }}>
              {r.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function RestaurantCard({ restaurant, counts }: { restaurant: Restaurant; counts: { label: string; value: number }[] }) {
  const status = RESTAURANT_STATUS_META[restaurant.status];
  return (
    <Card testID="restaurant-heading">
      <View style={styles.row}>
        <View style={styles.restaurantIcon}>
          <Icon name="store" size={IconSize.md} color={BrandColors.primaryText} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="defaultBold" numberOfLines={1}>
            {restaurant.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {restaurant.address}
          </ThemedText>
        </View>
        <Badge label={status.label} tone={status.tone} testID="restaurant-status" />
      </View>
      <View style={styles.counts}>
        {counts.map((count) => (
          <View key={count.label} style={styles.count}>
            <ThemedText type="subtitle" style={styles.countValue}>
              {count.value}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {count.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </Card>
  );
}

function LaneHeader({ title, note, count, testID }: { title: string; note: string; count: number; testID: string }) {
  return (
    <View style={styles.laneHeader} testID={testID} nativeID={testID}>
      <View style={styles.row}>
        <ThemedText type="smallBold" style={styles.flex}>
          {title}
        </ThemedText>
        <Badge label={String(count)} tone={count ? 'brand' : 'neutral'} testID={`${testID}-count`} />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {note}
      </ThemedText>
    </View>
  );
}

/** An order card with its one kitchen action; the board refreshes from the server after each step. */
function KitchenOrder({ restaurantId, order }: { restaurantId: string; order: RestaurantOrder }) {
  const [error, setError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const inFlight = useRef(false);

  async function act(status: KitchenStatus) {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsActing(true);
    setError(null);
    try {
      await advanceOrder(restaurantId, order.id, status);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That did not go through. Check your connection and try again.');
    } finally {
      inFlight.current = false;
      setIsActing(false);
    }
  }

  return <RestaurantOrderCard order={order} busy={isActing} error={error} onAction={(status) => void act(status)} />;
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MAX_BOARD_WIDTH,
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
  picker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: Layout.buttonHeightSm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
  },
  chipSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.primarySoft,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primarySoft,
  },
  counts: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.divider,
  },
  count: {
    flex: 1,
  },
  countValue: {
    fontVariant: ['tabular-nums'],
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  lane: {
    gap: Spacing.three,
    minWidth: 0,
  },
  laneHeader: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.border,
  },
  emptyLane: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surfaceMuted,
  },
  other: {
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  otherList: {
    width: '100%',
  },
});
