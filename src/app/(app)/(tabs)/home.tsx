import { useCallback, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { SIDEBAR_MIN_WIDTH } from '@/components/dashboard-sidebar';
import { OrderDetailSheet } from '@/components/order-detail-sheet';
import { RestaurantOrderCard } from '@/components/restaurant-order-card';
import { RestaurantPicker } from '@/components/restaurant-picker';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Toast } from '@/components/ui/toast';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api';
import type { KitchenStatus, RestaurantOrder } from '@/services/restaurant-orders';
import type { Restaurant } from '@/services/restaurants';
import { useAuthSession } from '@/services/session';
import { openAccountAction } from '@/state/account-ui';
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
  const [lane, setLane] = useState<KitchenLaneStatus>('CONFIRMED');
  const otherLocale = useLocale() === 'ar' ? 'en' : 'ar';
  const sidebar = width >= SIDEBAR_MIN_WIDTH;

  async function refreshAll() {
    await Promise.all([restaurants.refresh(), restaurant ? orders.refresh() : Promise.resolve(), restaurant ? today.refresh() : Promise.resolve()]);
  }

  // Figma R-03: three lanes side by side on wide screens. R-20/R-22: one lane at a time on phones and tablets,
  // picked with a switcher; tablets show its tickets in two columns.
  const sideBySide = width >= WIDE;
  const ticketColumns = sideBySide ? 1 : width >= MEDIUM ? 2 : 1;
  const { lanes, other } = groupOrdersByLane(orders.data?.items ?? []);
  // Read from the latest board data, so the sheet follows the order as it moves.
  const openOrder = orders.data?.items.find((order) => order.id === openOrderId) ?? null;
  const shownLanes = sideBySide ? KITCHEN_LANES : KITCHEN_LANES.filter((item) => item.status === lane);

  return (
    <Screen>
      {sidebar ? null : (
        // Phones and tablets (Figma R-20): the restaurant, then language, password and sign out as icons.
        <View style={styles.compactHeader}>
          <View style={styles.flex}>
            <ThemedText type="defaultBold" numberOfLines={1}>
              {restaurant?.name ?? t('Delivery Plus Restaurant')}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {session?.user.email}
            </ThemedText>
          </View>
          <IconButton testID={`language-${otherLocale}`} icon="language" variant="plain" accessibilityLabel={LOCALE_NAMES[otherLocale]} onPress={() => void setLocale(otherLocale)} />
          <IconButton testID="change-password" icon="lock" variant="plain" accessibilityLabel={t('Change password')} onPress={() => openAccountAction('password')} />
          <IconButton testID="sign-out" icon="logout" variant="plain" accessibilityLabel={t('Sign out')} onPress={() => openAccountAction('sign-out')} />
        </View>
      )}
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
            {sidebar ? null : <RestaurantPicker restaurants={restaurants.data ?? []} selectedId={restaurant.id} onSelect={selectRestaurantId} />}

            <View style={styles.boardHeader}>
              <View style={styles.flex}>
                <ThemedText type={sidebar ? 'title' : 'subtitle'} accessibilityRole="header">
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

            <RestaurantStrip restaurant={restaurant} />

            <View style={styles.kpis} testID="today-summary" nativeID="today-summary">
              {KITCHEN_LANES.map((item) => (
                <Kpi key={item.status} label={item.title} value={String(lanes[item.status].length)} note={item.note} tone={LANE_TONES[item.status]} />
              ))}
              {/* Today in Cairo, from the backend (#154): item revenue only, without delivery fees or cancelled orders. */}
              <Kpi
                label={t('Today')}
                value={today.data ? formatMoney(today.data.revenue) : '…'}
                note={today.data ? todayOrdersLabel(today.data.orders) : ''}
                tone="success"
                valueTestID="today-revenue"
                noteTestID="today-orders"
              />
            </View>

            {orders.isLoading ? (
              <SkeletonList count={3} itemHeight={140} />
            ) : orders.error && orders.data === undefined ? (
              <ErrorState error={orders.error} onRetry={() => void orders.refresh()} />
            ) : (
              <>
                {orders.error ? <InlineAlert message={t("Couldn't refresh the orders. Showing the last ones loaded.")} testID="orders-stale" /> : null}
                {sideBySide ? null : (
                  <View style={styles.laneSwitch} accessibilityRole="tablist">
                    {KITCHEN_LANES.map((item) => {
                      const selected = item.status === lane;
                      return (
                        <Pressable
                          key={item.status}
                          testID={`lane-switch-${item.status}`}
                          nativeID={`lane-switch-${item.status}`}
                          accessibilityRole="tab"
                          accessibilityState={{ selected }}
                          onPress={() => setLane(item.status)}
                          style={[styles.laneTab, selected && styles.laneTabSelected]}
                        >
                          <ThemedText type="caption" themeColor={selected ? 'text' : 'textSecondary'} numberOfLines={1} style={styles.laneTabTitle}>
                            {item.title}
                          </ThemedText>
                          <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'} style={styles.tabular}>
                            {lanes[item.status].length}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <View style={styles.board}>
                  {shownLanes.map((item) => (
                    <View key={item.status} style={[styles.lane, sideBySide ? styles.laneThird : styles.laneFull]}>
                      <LaneHeader title={item.title} note={item.note} count={lanes[item.status].length} testID={`lane-${item.status}`} />
                      {lanes[item.status].length ? (
                        <View style={[styles.tickets, ticketColumns === 2 && styles.ticketsTwo]}>
                          {/* Keyed by status too: a newer server state starts the card fresh, dropping an earlier error. */}
                          {lanes[item.status].map((order) => (
                            <View key={`${order.id}:${order.status}`} style={ticketColumns === 2 ? styles.ticketHalf : null}>
                              <KitchenOrder restaurantId={restaurant.id} order={order} onOpen={() => setOpenOrderId(order.id)} onDone={setNotice} />
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptyLane}>
                          <Icon name="clock" size={IconSize.md} color={BrandColors.textMuted} />
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
                      icon={showOther ? 'close' : 'orders'}
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      onPress={() => setShowOther((value) => !value)}
                    />
                    {showOther ? (
                      <View style={[styles.board, styles.otherList]}>
                        {other.map((order) => (
                          <View key={order.id} style={[styles.lane, sideBySide ? styles.laneThird : ticketColumns === 2 ? styles.ticketHalf : styles.laneFull]}>
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
    </Screen>
  );
}

type KitchenLaneStatus = (typeof KITCHEN_LANES)[number]['status'];
const LANE_TONES: Record<KitchenLaneStatus, BadgeTone> = { CONFIRMED: 'info', PREPARING: 'warning', READY_FOR_PICKUP: 'brand' };
const TONE_DOTS: Record<BadgeTone, string> = {
  info: BrandColors.info,
  warning: BrandColors.warning,
  brand: BrandColors.primary,
  success: BrandColors.success,
  neutral: BrandColors.textMuted,
  danger: BrandColors.danger,
};

/** The restaurant, its status, and how often the board checks (Figma R-03 strip). */
function RestaurantStrip({ restaurant }: { restaurant: Restaurant }) {
  const status = RESTAURANT_STATUS_META[restaurant.status];
  return (
    <Card testID="restaurant-heading" style={styles.strip}>
      <View style={styles.restaurantIcon}>
        <Icon name="store" size={IconSize.md} color={BrandColors.primary} />
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
    </Card>
  );
}

/** A number tile (Figma R-03 KPIs): label with a status dot, the value, and a short note. */
function Kpi({ label, value, note, tone, valueTestID, noteTestID }: { label: string; value: string; note: string; tone: BadgeTone; valueTestID?: string; noteTestID?: string }) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiLabel}>
        <View style={[styles.kpiDot, { backgroundColor: TONE_DOTS[tone] }]} />
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
          {label}
        </ThemedText>
      </View>
      <ThemedText type="subtitle" style={styles.tabular} testID={valueTestID} numberOfLines={1}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} testID={noteTestID}>
        {note}
      </ThemedText>
    </View>
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
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingStart: Spacing.three,
    paddingEnd: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
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
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primarySoft,
  },
  kpis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three - Spacing.one,
  },
  kpi: {
    flexGrow: 1,
    flexBasis: 150,
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BrandColors.divider,
    backgroundColor: BrandColors.surface,
  },
  kpiLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
  },
  kpiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  laneSwitch: {
    flexDirection: 'row',
    padding: Spacing.one,
    gap: Spacing.one,
    borderRadius: Radius.sm,
    backgroundColor: BrandColors.divider,
  },
  laneTab: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm - Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laneTabTitle: {
    textAlign: 'center',
  },
  laneTabSelected: {
    backgroundColor: BrandColors.surface,
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
  laneThird: {
    width: '31.8%',
    padding: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.surfaceMuted,
  },
  laneFull: {
    width: '100%',
  },
  tickets: {
    gap: Spacing.three,
  },
  ticketsTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ticketHalf: {
    width: '48.5%',
  },
  laneHeader: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  emptyLane: {
    minHeight: 120,
    gap: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BrandColors.borderStrong,
  },
  other: {
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  otherList: {
    width: '100%',
  },
});
