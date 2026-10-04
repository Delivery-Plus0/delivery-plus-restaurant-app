import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { RestaurantOrderCard } from '@/components/restaurant-order-card';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { fetchRestaurantOrders, updateRestaurantOrderStatus, type KitchenStatus, type RestaurantOrder, type RestaurantOrderPage } from '@/services/restaurant-orders';
import { fetchMyRestaurants, type Restaurant } from '@/services/restaurants';
import { clearSession, useAuthSession } from '@/services/session';

const REFRESH_INTERVAL_MS = 20_000;

const columns = [
  { status: 'CONFIRMED', title: 'New orders', note: 'Ready to begin' },
  { status: 'PREPARING', title: 'In the kitchen', note: 'Being prepared' },
  { status: 'READY_FOR_PICKUP', title: 'Ready for pickup', note: 'Waiting for a driver' },
] as const;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function RestaurantDashboard() {
  const { width } = useWindowDimensions();
  const { session } = useAuthSession();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantLoading, setRestaurantLoading] = useState(true);
  const [restaurantError, setRestaurantError] = useState<string | null>(null);
  const [restaurantRefreshVersion, setRestaurantRefreshVersion] = useState(0);
  const [orders, setOrders] = useState<RestaurantOrderPage | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const isWide = width >= 1120;
  const isTablet = width >= 740;
  const activeRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantId) ?? null;

  useEffect(() => {
    let mounted = true;
    if (session?.user.role !== 'RESTAURANT_OWNER') {
      return () => { mounted = false; };
    }

    void fetchMyRestaurants()
      .then((result) => {
        if (!mounted) return;
        setRestaurants(result);
        setRestaurantId((current) => current && result.some((restaurant) => restaurant.id === current)
          ? current
          : result[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (mounted) setRestaurantError(errorMessage(error));
      })
      .finally(() => {
        if (mounted) setRestaurantLoading(false);
      });

    return () => { mounted = false; };
  }, [session, restaurantRefreshVersion]);

  useEffect(() => {
    if (!restaurantId) return;

    let mounted = true;
    const load = () => {
      void fetchRestaurantOrders(restaurantId)
        .then((result) => {
          if (mounted) {
            setOrders(result);
            setOrdersError(null);
            setUpdatedAt(new Date());
          }
        })
        .catch((error: unknown) => {
          if (mounted) setOrdersError(errorMessage(error));
        })
        .finally(() => {
          if (mounted) {
            setOrdersLoading(false);
            setRefreshing(false);
          }
        });
    };
    load();
    const interval = setInterval(() => setRefreshVersion((version) => version + 1), REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId, refreshVersion]);

  async function signOut() {
    await clearSession();
    router.replace('/login');
  }

  function retryRestaurants() {
    setRestaurantError(null);
    setRestaurantLoading(true);
    setRestaurantRefreshVersion((version) => version + 1);
  }

  function refreshOrders() {
    setOrdersError(null);
    if (orders) setRefreshing(true);
    else setOrdersLoading(true);
    setRefreshVersion((version) => version + 1);
  }

  async function changeStatus(order: RestaurantOrder, status: KitchenStatus) {
    setBusyOrderId(order.id);
    setActionError(null);
    try {
      await updateRestaurantOrderStatus(order.id, status);
      refreshOrders();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusyOrderId(null);
    }
  }

  const orderItems = orders?.items ?? [];
  const activeOrders = orderItems.filter((order) => ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status));
  const otherOrders = orderItems.filter((order) => !['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status));
  const visibleColumns = showAll
    ? [...columns, { status: 'OTHER', title: 'Other orders', note: 'Awaiting payment or complete' }]
    : columns;

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (session.user.role !== 'RESTAURANT_OWNER') {
    return (
      <View style={styles.accessState}>
        <ThemedText type="caption" style={styles.brandEyebrow}>DELIVERY PLUS · RESTAURANTS</ThemedText>
        <ThemedText type="title" style={styles.accessTitle}>Owner access required</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.accessCopy}>This workspace is for restaurant owner accounts.</ThemedText>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOutButton} testID="dashboard-sign-out" nativeID="dashboard-sign-out">
          <ThemedText type="defaultBold" style={styles.signOutText}>Sign out</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.appShell}>
      {isWide ? (
        <View style={styles.sidebar}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}><ThemedText type="subtitle" style={styles.brandMarkText}>D</ThemedText></View>
            <View>
              <ThemedText type="subtitle" style={styles.brandName}>Delivery Plus</ThemedText>
              <ThemedText type="caption" style={styles.sidebarCaption}>RESTAURANT DESK</ThemedText>
            </View>
          </View>
          <View style={styles.navItem}>
            <Icon name="orders" size={19} color="#E9F0E7" />
            <ThemedText type="default" style={styles.navText}>Orders</ThemedText>
            <View style={styles.navCount}><ThemedText type="caption" style={styles.navCountText}>{activeOrders.length}</ThemedText></View>
          </View>
          <View style={styles.sidebarBottom}>
            <ThemedText type="small" style={styles.sidebarEmail} numberOfLines={1}>{session.user.email}</ThemedText>
            <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.sidebarSignOut} testID="dashboard-sign-out" nativeID="dashboard-sign-out">
              <Icon name="logout" size={17} color="#C9D3CA" />
              <ThemedText type="small" style={styles.sidebarSignOutText}>Sign out</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.workspace}>
        {!isWide ? (
          <View style={styles.mobileBrand}>
            <View style={styles.mobileBrandMark}><ThemedText type="subtitle" style={styles.brandMarkText}>D</ThemedText></View>
            <ThemedText type="subtitle" style={styles.mobileBrandName}>Delivery Plus</ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={() => void signOut()} style={styles.mobileSignOut} testID="dashboard-sign-out" nativeID="dashboard-sign-out">
              <Icon name="logout" size={18} color="#30453A" />
            </Pressable>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={[styles.page, isTablet && styles.pageTablet]}>
          <View style={styles.pageHeader}>
            <View style={styles.headingBlock}>
              <ThemedText type="caption" style={styles.eyebrow}>KITCHEN CONTROL</ThemedText>
              <ThemedText type="title" style={styles.pageTitle}>Orders</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">Your live order desk.</ThemedText>
            </View>
            <View style={styles.headerActions}>
              {activeRestaurant ? (
                <View style={styles.openBadge} testID="restaurant-status">
                  <View style={[styles.statusDot, activeRestaurant.status === 'OPEN' ? styles.statusDotOpen : styles.statusDotClosed]} />
                  <ThemedText type="small" style={styles.openBadgeText}>{activeRestaurant.status.replaceAll('_', ' ')}</ThemedText>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh orders"
                disabled={refreshing}
                onPress={refreshOrders}
                style={styles.refreshButton}
                testID="orders-refresh"
                nativeID="orders-refresh"
              >
                <Icon name="refresh" size={17} color="#30453A" />
                <ThemedText type="small" style={styles.refreshText}>{refreshing ? 'Refreshing' : 'Refresh'}</ThemedText>
              </Pressable>
            </View>
          </View>

          {restaurants.length > 1 ? (
            <View style={styles.restaurantPicker} accessibilityLabel="Choose restaurant">
              {restaurants.map((restaurant) => {
                const selected = restaurant.id === restaurantId;
                return (
                  <Pressable
                    key={restaurant.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setOrders(null);
                      setOrdersLoading(true);
                      setOrdersError(null);
                      setRestaurantId(restaurant.id);
                    }}
                    style={[styles.restaurantOption, selected && styles.restaurantOptionSelected]}
                    testID={`restaurant-select-${restaurant.id}`}
                    nativeID={`restaurant-select-${restaurant.id}`}
                  >
                    <ThemedText type="small" style={[styles.restaurantOptionText, selected && styles.restaurantOptionTextSelected]}>{restaurant.name}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {restaurantLoading ? (
            <View style={styles.statePanel}><ThemedText type="default" themeColor="textSecondary">Loading your restaurants…</ThemedText></View>
          ) : restaurantError ? (
            <View style={styles.statePanel}>
              <ThemedText type="subtitle">Couldn’t load your restaurants</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{restaurantError}</ThemedText>
              <Pressable accessibilityRole="button" onPress={retryRestaurants} style={styles.retryButton} testID="restaurants-retry" nativeID="restaurants-retry">
                <ThemedText type="defaultBold" style={styles.retryTextButton}>Try again</ThemedText>
              </Pressable>
            </View>
          ) : restaurants.length === 0 ? (
            <View style={styles.statePanel} testID="restaurants-empty">
              <ThemedText type="subtitle">No restaurant linked to this account</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Ask an administrator to connect your owner account to a restaurant.</ThemedText>
            </View>
          ) : (
            <>
              {activeRestaurant ? (
                <View style={styles.restaurantHeading} testID="restaurant-heading" nativeID="restaurant-heading">
                  <View style={styles.restaurantIcon}><Icon name="store" size={20} color="#315D45" /></View>
                  <View style={styles.restaurantNameBlock}>
                    <ThemedText type="subtitle" style={styles.restaurantName}>{activeRestaurant.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{activeRestaurant.address}</ThemedText>
                  </View>
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.lastUpdated}>
                    {updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Connecting'}
                  </ThemedText>
                </View>
              ) : null}

              <View style={[styles.metrics, !isTablet && styles.metricsNarrow]}>
                <Metric label="New" value={orderItems.filter((order) => order.status === 'CONFIRMED').length} accent="#A44836" />
                <Metric label="In kitchen" value={orderItems.filter((order) => order.status === 'PREPARING').length} accent="#315D45" />
                <Metric label="Ready" value={orderItems.filter((order) => order.status === 'READY_FOR_PICKUP').length} accent="#426B91" />
                <Metric label="Total orders" value={orders?.total ?? 0} accent="#5E695F" />
              </View>

              <View style={styles.boardTitleRow}>
                <View>
                  <ThemedText type="subtitle" style={styles.sectionHeading}>Kitchen queue</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{showAll ? 'All recent order stages' : `${activeOrders.length} orders need kitchen attention`}</ThemedText>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setShowAll((value) => !value)} style={styles.viewToggle} testID="orders-toggle-all" nativeID="orders-toggle-all">
                  <ThemedText type="small" style={styles.viewToggleText}>{showAll ? 'Active only' : 'All orders'}</ThemedText>
                </Pressable>
              </View>

              {ordersError && orders ? (
                <View style={styles.inlineError}>
                  <ThemedText type="small" style={styles.errorText}>{ordersError}</ThemedText>
                  <Pressable accessibilityRole="button" onPress={refreshOrders} testID="orders-retry" nativeID="orders-retry">
                    <ThemedText type="small" style={styles.retryText}>Retry</ThemedText>
                  </Pressable>
                </View>
              ) : null}
              {actionError ? <ThemedText type="small" style={styles.errorText}>{actionError}</ThemedText> : null}

              {ordersLoading ? (
                <View style={styles.statePanel}><ThemedText type="default" themeColor="textSecondary">Loading kitchen orders…</ThemedText></View>
              ) : ordersError && !orders ? (
                <View style={styles.statePanel} testID="orders-error">
                  <ThemedText type="subtitle">Couldn’t load kitchen orders</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{ordersError}</ThemedText>
                  <Pressable accessibilityRole="button" onPress={refreshOrders} style={styles.retryButton} testID="orders-retry" nativeID="orders-retry">
                    <ThemedText type="defaultBold" style={styles.retryTextButton}>Try again</ThemedText>
                  </Pressable>
                </View>
              ) : orderItems.length === 0 ? (
                <View style={styles.statePanel} testID="orders-empty">
                  <View style={styles.emptyIcon}><Icon name="orders" size={23} color="#315D45" /></View>
                  <ThemedText type="subtitle">No orders yet</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">New paid orders will appear here automatically.</ThemedText>
                </View>
              ) : (
                <View style={styles.board}>
                  {visibleColumns.map((column) => {
                    const laneOrders = column.status === 'OTHER'
                      ? otherOrders
                      : orderItems.filter((order) => order.status === column.status);
                    if (!showAll && column.status === 'OTHER') return null;
                    return (
                      <View key={column.status} style={[styles.lane, { width: isWide ? '31.8%' : isTablet ? '48.5%' : '100%' }]}>
                        <View style={styles.laneHeader}>
                          <View style={styles.laneTitleGroup}>
                            <ThemedText type="small" style={styles.laneTitle}>{column.title}</ThemedText>
                            <View style={styles.laneCount}><ThemedText type="caption" style={styles.laneCountText}>{laneOrders.length}</ThemedText></View>
                          </View>
                          <ThemedText type="caption" themeColor="textSecondary" style={styles.laneNote}>{column.note}</ThemedText>
                        </View>
                        {laneOrders.length ? laneOrders.map((order) => (
                          <RestaurantOrderCard
                            key={order.id}
                            order={order}
                            busy={busyOrderId === order.id}
                            onStatusChange={(selectedOrder, status) => void changeStatus(selectedOrder, status)}
                          />
                        )) : (
                          <View style={styles.emptyLane}><ThemedText type="small" themeColor="textSecondary">Nothing here</ThemedText></View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <ThemedText type="caption" themeColor="textSecondary" style={styles.pollingNote}>Updates automatically every 20 seconds.</ThemedText>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText type="subtitle" style={[styles.metricValue, { color: accent }]}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: { backgroundColor: '#F4F5EF', flex: 1, flexDirection: 'row', minHeight: '100%' },
  sidebar: { backgroundColor: '#20382C', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 27, width: 232 },
  brandLockup: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  brandMark: { alignItems: 'center', backgroundColor: '#D7E7C6', borderRadius: 7, height: 34, justifyContent: 'center', width: 34 },
  brandMarkText: { color: '#20382C', fontFamily: 'Georgia', fontSize: 20 },
  brandName: { color: '#F5F7F1', fontSize: 15 },
  sidebarCaption: { color: '#9EB1A1', fontSize: 9, marginTop: 2 },
  navItem: { alignItems: 'center', backgroundColor: '#315441', borderRadius: 6, flexDirection: 'row', gap: 12, marginTop: 49, minHeight: 44, paddingHorizontal: 12 },
  navText: { color: '#F4F7F2', flex: 1 },
  navCount: { alignItems: 'center', backgroundColor: '#496A55', borderRadius: 4, minWidth: 24, paddingHorizontal: 5, paddingVertical: 2 },
  navCountText: { color: '#E8F1E7', fontVariant: ['tabular-nums'] },
  sidebarBottom: { borderTopColor: '#3A5141', borderTopWidth: 1, paddingTop: 16 },
  sidebarEmail: { color: '#C4D0C5', marginBottom: 15 },
  sidebarSignOut: { alignItems: 'center', flexDirection: 'row', gap: 9, minHeight: 38 },
  sidebarSignOutText: { color: '#C9D3CA' },
  workspace: { flex: 1, minWidth: 0 },
  mobileBrand: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: '#E3E6DE', borderBottomWidth: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 16, paddingVertical: 12 },
  mobileBrandMark: { alignItems: 'center', backgroundColor: '#D7E7C6', borderRadius: 6, height: 30, justifyContent: 'center', width: 30 },
  mobileBrandName: { color: '#20382C', flex: 1, fontSize: 14 },
  mobileSignOut: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  page: { alignSelf: 'center', maxWidth: 1500, paddingBottom: 64, paddingHorizontal: 20, paddingTop: 27, width: '100%' },
  pageTablet: { paddingHorizontal: 34, paddingTop: 39 },
  pageHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', gap: 18, marginBottom: 26 },
  headingBlock: { flex: 1 },
  eyebrow: { color: '#9A543F', fontSize: 10 },
  pageTitle: { color: '#23362B', fontFamily: 'Georgia', fontSize: 38, marginBottom: 3, marginTop: 5 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  openBadge: { alignItems: 'center', backgroundColor: '#E7F0E3', borderRadius: 5, flexDirection: 'row', gap: 7, minHeight: 36, paddingHorizontal: 11 },
  statusDot: { borderRadius: 50, height: 7, width: 7 },
  statusDotOpen: { backgroundColor: '#3D8155' },
  statusDotClosed: { backgroundColor: '#A44836' },
  openBadgeText: { color: '#34513B', fontWeight: '600' },
  refreshButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DDE2D8', borderRadius: 5, borderWidth: 1, flexDirection: 'row', gap: 7, minHeight: 38, paddingHorizontal: 11 },
  refreshText: { color: '#30453A', fontWeight: '600' },
  restaurantPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  restaurantOption: { backgroundColor: '#FFFFFF', borderColor: '#DDE2D8', borderRadius: 5, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  restaurantOptionSelected: { backgroundColor: '#20382C', borderColor: '#20382C' },
  restaurantOptionText: { color: '#45554A' },
  restaurantOptionTextSelected: { color: '#FFFFFF' },
  restaurantHeading: { alignItems: 'center', backgroundColor: '#E8ECE3', borderRadius: 6, flexDirection: 'row', gap: 12, marginBottom: 13, padding: 13 },
  restaurantIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 5, height: 38, justifyContent: 'center', width: 38 },
  restaurantNameBlock: { flex: 1, minWidth: 0 },
  restaurantName: { color: '#25372D', fontSize: 16 },
  lastUpdated: { textAlign: 'right' },
  metrics: { backgroundColor: '#FFFFFF', borderColor: '#E3E6DE', borderRadius: 6, borderWidth: 1, flexDirection: 'row', marginBottom: 29, paddingVertical: 17 },
  metricsNarrow: { flexWrap: 'wrap' },
  metric: { borderRightColor: '#E7E9E3', borderRightWidth: 1, flex: 1, minWidth: '24%', paddingHorizontal: 18 },
  metricValue: { color: '#315D45', fontFamily: 'Georgia', fontSize: 28, lineHeight: 32 },
  boardTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  sectionHeading: { color: '#24362B', fontSize: 19, marginBottom: 2 },
  viewToggle: { backgroundColor: '#E8ECE3', borderRadius: 5, minHeight: 37, justifyContent: 'center', paddingHorizontal: 12 },
  viewToggleText: { color: '#30453A', fontWeight: '600' },
  board: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  lane: { minWidth: 0 },
  laneHeader: { borderBottomColor: '#DDE2D8', borderBottomWidth: 1, marginBottom: 12, paddingBottom: 10 },
  laneTitleGroup: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  laneTitle: { color: '#26382E', fontWeight: '700' },
  laneCount: { alignItems: 'center', backgroundColor: '#E2E7DF', borderRadius: 4, minWidth: 22, paddingHorizontal: 5, paddingVertical: 1 },
  laneCountText: { color: '#4A5E50', fontVariant: ['tabular-nums'] },
  laneNote: { marginTop: 4 },
  emptyLane: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.55)', borderColor: '#E0E4DC', borderRadius: 6, borderStyle: 'dashed', borderWidth: 1, minHeight: 82, justifyContent: 'center' },
  statePanel: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E3E6DE', borderRadius: 7, borderWidth: 1, gap: 9, marginTop: 13, paddingHorizontal: 20, paddingVertical: 28 },
  centerState: { alignItems: 'center', backgroundColor: '#F4F5EF', flex: 1, justifyContent: 'center' },
  accessState: { alignItems: 'center', backgroundColor: '#F4F5EF', flex: 1, justifyContent: 'center', padding: 24 },
  brandEyebrow: { color: '#9A543F', marginBottom: 10 },
  accessTitle: { color: '#23362B', fontFamily: 'Georgia', marginBottom: 6 },
  accessCopy: { marginBottom: 18, textAlign: 'center' },
  signOutButton: { alignItems: 'center', backgroundColor: '#20382C', borderRadius: 5, justifyContent: 'center', minHeight: 44, minWidth: 130 },
  signOutText: { color: '#FFFFFF' },
  retryButton: { alignItems: 'center', backgroundColor: '#20382C', borderRadius: 5, justifyContent: 'center', marginTop: 7, minHeight: 40, minWidth: 108 },
  retryText: { color: '#315D45', fontWeight: '700' },
  retryTextButton: { color: '#FFFFFF' },
  emptyIcon: { alignItems: 'center', backgroundColor: '#E7F0E3', borderRadius: 22, height: 44, justifyContent: 'center', marginBottom: 4, width: 44 },
  inlineError: { alignItems: 'center', backgroundColor: '#FCEBE7', borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10 },
  errorText: { color: '#A44836', marginBottom: 7 },
  pollingNote: { marginTop: 22, textAlign: 'center' },
});
