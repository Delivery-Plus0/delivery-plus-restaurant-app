import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { KitchenStatus, RestaurantOrder } from '@/services/restaurant-orders';

type RestaurantOrderCardProps = {
  order: RestaurantOrder;
  busy: boolean;
  onStatusChange: (order: RestaurantOrder, status: KitchenStatus) => void;
};

const statusLabels: Record<RestaurantOrder['status'], string> = {
  CREATED: 'New order',
  PAYMENT_PENDING: 'Payment pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'In kitchen',
  READY_FOR_PICKUP: 'Ready for pickup',
  DRIVER_ASSIGNED: 'Driver assigned',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered',
  FAILED: 'Payment failed',
  CANCELLED: 'Cancelled',
};

function formatPrice(value: string | number): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    : '$0.00';
}

function formatOrderTime(value?: string): string {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function RestaurantOrderCard({ order, busy, onStatusChange }: RestaurantOrderCardProps) {
  const nextStatus: KitchenStatus | null = order.status === 'CONFIRMED'
    ? 'PREPARING'
    : order.status === 'PREPARING'
      ? 'READY_FOR_PICKUP'
      : null;
  const actionTitle = nextStatus === 'PREPARING' ? 'Start preparing' : 'Ready for pickup';
  const actionId = nextStatus === 'PREPARING' ? 'start-preparing' : 'ready-for-pickup';

  return (
    <View style={styles.card} testID={`order-${order.id}`} nativeID={`order-${order.id}`}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText type="caption" themeColor="textSecondary">ORDER</ThemedText>
          <ThemedText type="subtitle" style={styles.orderNumber}>#{order.id.slice(0, 8).toUpperCase()}</ThemedText>
        </View>
        <View style={[styles.statusPill, { backgroundColor: order.status === 'CONFIRMED' ? '#E4F4E8' : '#F0F2ED' }]}>
          <ThemedText type="caption" style={styles.statusText} testID={`order-${order.id}-status`} nativeID={`order-${order.id}-status`}>{statusLabels[order.status]}</ThemedText>
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.time}>{formatOrderTime(order.createdAt)}</ThemedText>

      <View style={styles.items}>
        {order.items.map((item, index) => (
          <View key={`${item.menuItemId}-${index}`} style={styles.itemRow}>
            <ThemedText type="default" style={styles.quantity}>{item.quantity}×</ThemedText>
            <ThemedText type="default" style={styles.itemName} numberOfLines={2}>{item.name}</ThemedText>
            <ThemedText type="default" style={styles.itemPrice}>{formatPrice(Number(item.price) * item.quantity)}</ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <ThemedText type="small" themeColor="textSecondary">Order total</ThemedText>
        <ThemedText type="subtitle">{formatPrice(order.totalAmount)}</ThemedText>
      </View>

      {nextStatus ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${actionTitle} order ${order.id.slice(0, 8)}`}
          disabled={busy}
          onPress={() => onStatusChange(order, nextStatus)}
          testID={`order-${order.id}-${actionId}`}
          nativeID={`order-${order.id}-${actionId}`}
          style={({ pressed }) => [styles.action, pressed && !busy && styles.actionPressed, busy && styles.actionDisabled]}
        >
          <ThemedText type="defaultBold" style={styles.actionText}>{busy ? 'Updating…' : actionTitle}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E6DE',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.three,
    padding: Spacing.three,
  },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  orderNumber: { marginTop: 2 },
  statusPill: { borderRadius: 4, maxWidth: '58%', paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { color: '#385B41', fontWeight: '600' },
  time: { marginTop: Spacing.two },
  items: { borderBottomColor: '#E8EAE4', borderBottomWidth: 1, borderTopColor: '#E8EAE4', borderTopWidth: 1, marginTop: Spacing.three, paddingVertical: Spacing.two },
  itemRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.two, paddingVertical: 5 },
  quantity: { color: '#536057', fontVariant: ['tabular-nums'], width: 30 },
  itemName: { flex: 1 },
  itemPrice: { fontVariant: ['tabular-nums'] },
  totalRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.three },
  action: { alignItems: 'center', backgroundColor: '#315D45', borderRadius: 6, justifyContent: 'center', minHeight: 44, marginTop: Spacing.three, paddingHorizontal: Spacing.three },
  actionPressed: { backgroundColor: '#244A35' },
  actionDisabled: { opacity: 0.55 },
  actionText: { color: '#FFFFFF' },
});
