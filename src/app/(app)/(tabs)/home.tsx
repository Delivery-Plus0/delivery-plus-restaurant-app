import { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { OrderDetailSheet } from '@/components/order-detail-sheet';
import { RestaurantOrderCard } from '@/components/restaurant-order-card';
import { RestaurantPicker } from '@/components/restaurant-picker';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Toast } from '@/components/ui/toast';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import { ApiError, signOut as endSession } from '@/services/api';
import type { KitchenStatus, RestaurantOrder, TodaySummary } from '@/services/restaurant-orders';
import type { Restaurant } from '@/services/restaurants';
import { useAuthSession } from '@/services/session';
import { advanceOrder, ORDERS_POLL_MS, selectRestaurantId, useRestaurantOrders, useSelectedRestaurant, useTodaySummary } from '@/state/restaurant';
import { formatMoney, shortId } from '@/utils/format';
import { groupOrdersByLane, KITCHEN_LANES, ORDER_STATUS_META, RESTAURANT_STATUS_META } from '@/utils/order-status';
import { LOCALE_NAMES, setLocale, t, useLocale } from '@/i18n';
import { todayOrdersLabel } from '@/utils/today-summary';

/** Three lanes side by side from here; two below it; one on phones. */
const WIDE = 1024;
const MEDIUM = 680;
/** Keeps lines readable on very wide kitchen screens. */
const MAX_BOARD_WIDTH = 1440;

export default function HomeScreen() {
  const { session } = useAuthSession();
  const { width } = useWindowDimensions();
  const { restaurants, restaurant } = useSelectedRestaurant();
  const orders = useRestaurantOrders(restaurant?.id ?? null);
  const today = useTodaySummary(restaurant?.id ?? null);
  const [showOther, setShowOther] = useState(false);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const otherLocale = useLocale() === 'ar' ? 'en' : 'ar';

  async function signOut() {
    setConfirmingSignOut(false);
    await endSession();
  }

  async function refreshAll() {
    await Promise.all([restaurants.refresh(), restaurant ? orders.refresh() : Promise.resolve(), restaurant ? today.refresh() : Promise.resolve()]);
  }

  const columns = width >= WIDE ? 3 : width >= MEDIUM ? 2 : 1;
  const { lanes, other } = groupOrdersByLane(orders.data?.items ?? []);
  // Read from the latest board data, so the sheet follows the order as it moves.
  const openOrder = orders.data?.items.find((order) => order.id === openOrderId) ?? null;

  return (
    <Screen>
      <ScreenHeader
        title={restaurant?.name ?? t('Delivery Plus Restaurant')}
        subtitle={session?.user.email}
        right={
          <View style={styles.headerActions}>
            {/* #151: switches to the other language; always in view, unlike a control below the board. */}
            <AppButton
              testID={`language-${otherLocale}`}
              title={LOCALE_NAMES[otherLocale]}
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => void setLocale(otherLocale)}
            />
            <AppButton testID="sign-out" title={t('Sign out')} icon="logout" variant="ghost" size="sm" fullWidth={false} onPress={() => setConfirmingSignOut(true)} />
          </View>
        }
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
            title={t('No restaurant linked to this account')}
            message={t('Ask an administrator to connect your owner account to a restaurant.')}
            testID="restaurants-empty"
          />
        ) : (
          <>
            <RestaurantPicker restaurants={restaurants.data ?? []} selectedId={restaurant.id} onSelect={selectRestaurantId} />

            <RestaurantCard
              restaurant={restaurant}
              counts={KITCHEN_LANES.map((lane) => ({ label: lane.title, value: lanes[lane.status].length }))}
              today={today.data}
            />

            <View style={styles.boardHeader}>
              <View style={styles.flex}>
                <ThemedText type="subtitle" accessibilityRole="header">
                  {t('Kitchen orders')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('New paid orders appear here automatically. This screen checks every {seconds} seconds.', { seconds: ORDERS_POLL_MS / 1000 })}
                </ThemedText>
              </View>
              <AppButton
                testID="orders-refresh"
                title={t('Refresh')}
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
                {orders.error ? <InlineAlert message={t("Couldn't refresh the orders. Showing the last ones loaded.")} testID="orders-stale" /> : null}
                <View style={styles.board}>
                  {KITCHEN_LANES.map((lane) => (
                    <View key={lane.status} style={[styles.lane, { width: columns === 1 ? '100%' : columns === 2 ? '48.5%' : '31.8%' }]}>
                      <LaneHeader title={lane.title} note={lane.note} count={lanes[lane.status].length} testID={`lane-${lane.status}`} />
                      {lanes[lane.status].length ? (
                        // Keyed by status too: a newer server state starts the card fresh, dropping an earlier error.
                        lanes[lane.status].map((order) => (
                          <KitchenOrder
                            key={`${order.id}:${order.status}`}
                            restaurantId={restaurant.id}
                            order={order}
                            onOpen={() => setOpenOrderId(order.id)}
                            onDone={setNotice}
                          />
                        ))
                      ) : (
                        <View style={styles.emptyLane}>
                          <ThemedText type="small" themeColor="textSecondary">
                            {t('Nothing here')}
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
                      title={showOther ? t('Hide other orders') : t('Show other orders ({count})', { count: other.length })}
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      onPress={() => setShowOther((value) => !value)}
                    />
                    {showOther ? (
                      <View style={[styles.board, styles.otherList]}>
                        {other.map((order) => (
                          <View key={order.id} style={[styles.lane, { width: columns === 1 ? '100%' : columns === 2 ? '48.5%' : '31.8%' }]}>
                            <RestaurantOrderCard order={order} onOpen={() => setOpenOrderId(order.id)} />
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
      {restaurant ? (
        <OrderDetailSheet
          restaurantId={restaurant.id}
          order={openOrder}
          onClose={() => setOpenOrderId(null)}
          onRejected={(message) => {
            setOpenOrderId(null);
            setNotice(message);
          }}
        />
      ) : null}
      <Toast message={notice} onHide={hideNotice} testID="board-notice" />
      <Dialog
        visible={confirmingSignOut}
        title={t('Sign out?')}
        message={t('You can sign back in at any time.')}
        confirmLabel={t('Sign out')}
        onConfirm={() => void signOut()}
        onCancel={() => setConfirmingSignOut(false)}
        testID="sign-out-dialog"
      />
    </Screen>
  );
}

function RestaurantCard({ restaurant, counts, today }: { restaurant: Restaurant; counts: { label: string; value: number }[]; today?: TodaySummary }) {
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
      {/* Today in Cairo, from the backend (#154): item revenue only, without delivery fees or cancelled orders. */}
      <View style={styles.today} testID="today-summary" nativeID="today-summary">
        <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
          {t('Today')}
        </ThemedText>
        <ThemedText type="smallBold" testID="today-orders">
          {today ? todayOrdersLabel(today.orders) : '…'}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.countValue} testID="today-revenue">
          {today ? formatMoney(today.revenue) : ''}
        </ThemedText>
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
function KitchenOrder({
  restaurantId,
  order,
  onOpen,
  onDone,
}: {
  restaurantId: string;
  order: RestaurantOrder;
  onOpen: () => void;
  onDone: (message: string) => void;
}) {
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
      onDone(t('Order {id} is now {status}.', { id: shortId(order.id), status: ORDER_STATUS_META[status].label }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('That did not go through. Check your connection and try again.'));
    } finally {
      inFlight.current = false;
      setIsActing(false);
    }
  }

  return <RestaurantOrderCard order={order} busy={isActing} error={error} onAction={(status) => void act(status)} onOpen={onOpen} />;
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
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
  today: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.divider,
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
