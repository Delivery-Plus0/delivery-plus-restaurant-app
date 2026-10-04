import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { DeliveryCard } from '@/components/delivery-card';
import { OrderStatusBadge, OrderTimeline } from '@/components/order-status';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { CUSTOMER_CANCELLABLE_STATUSES, isActiveOrder } from '@/services/orders';
import { useRestaurant } from '@/state/catalog';
import { canHaveDelivery, isDeliveryActive, useOrderDelivery } from '@/state/deliveries';
import { cancelMyOrder, useOrder } from '@/state/orders';
import { confirm } from '@/utils/confirm';
import { formatDateTime, formatMoney, shortId } from '@/utils/format';

export default function OrderDetailScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const order = useOrder(id);
  const restaurant = useRestaurant(order.data?.restaurantId);
  const delivery = useOrderDelivery(order.data);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const goToOrders = () => router.navigate('/orders');
  const header = <ScreenHeader title={order.data ? `Order #${shortId(order.data.id)}` : 'Order'} showBack />;

  if (order.isLoading) {
    return (
      <Screen>
        {header}
        <SkeletonList count={3} />
      </Screen>
    );
  }

  if (!order.data) {
    return (
      <Screen>
        {header}
        <ErrorState error={order.error} onRetry={() => void order.refresh()} />
      </Screen>
    );
  }

  const current = order.data;
  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(current.status);
  const live = isActiveOrder(current);

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Cancel this order?',
      message: 'The restaurant will be notified and your order will stop.',
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
      destructive: true,
    });
    if (!ok) return;

    setActionError(null);
    setCancelling(true);
    try {
      await cancelMyOrder(current.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not cancel this order.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Screen
      footer={
        canCancel ? (
          <AppButton testID="order-cancel" title="Cancel order" variant="danger" loading={cancelling} onPress={() => void handleCancel()} />
        ) : placed ? (
          <AppButton title="View all orders" variant="secondary" onPress={goToOrders} />
        ) : undefined
      }
    >
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={order.refreshing}
            onRefresh={() => {
              void order.refresh();
              void delivery.refresh();
            }}
            tintColor={BrandColors.primary}
            colors={[BrandColors.primary]}
          />
        }
      >
        {placed && live ? <InlineAlert testID="order-placed" tone="success" message="Order placed! We'll keep this page updated." /> : null}
        {actionError ? <InlineAlert message={actionError} onDismiss={() => setActionError(null)} /> : null}

        <Card>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <ThemedText type="heading" numberOfLines={1}>
                {restaurant.data?.name ?? 'Your order'}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {formatDateTime(current.createdAt)}
              </ThemedText>
            </View>
            <OrderStatusBadge status={current.status} testID="order-status" />
          </View>
          <View style={styles.timeline}>
            <OrderTimeline status={current.status} />
          </View>
          {live ? (
            <ThemedText type="caption" themeColor="textSecondary">
              Updates automatically while this screen is open.
            </ThemedText>
          ) : null}
        </Card>

        {canHaveDelivery(current) && !(delivery.data === null && !live) ? (
          <DeliveryCard
            delivery={delivery.data}
            isLoading={delivery.isLoading}
            error={delivery.error}
            live={live && isDeliveryActive(delivery.data)}
            onRetry={() => void delivery.refresh()}
          />
        ) : null}

        <Card>
          <ThemedText type="heading">Items</ThemedText>
          {current.items.map((item) => (
            <View key={item.id ?? item.menuItemId} style={styles.rowBetween}>
              <ThemedText type="small" style={styles.flex}>
                <ThemedText type="smallBold">{item.quantity}×</ThemedText> {item.name}
              </ThemedText>
              <ThemedText type="small">{formatMoney(Number(item.price) * item.quantity)}</ThemedText>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <ThemedText type="heading">Total</ThemedText>
            <ThemedText type="heading">{formatMoney(current.totalAmount)}</ThemedText>
          </View>
        </Card>

        {restaurant.data ? (
          <Card>
            <ThemedText type="caption" themeColor="textSecondary">
              RESTAURANT
            </ThemedText>
            <ThemedText type="defaultBold">{restaurant.data.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {restaurant.data.address}
            </ThemedText>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  timeline: {
    marginTop: Spacing.two,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BrandColors.border,
    marginVertical: Spacing.one,
  },
});
