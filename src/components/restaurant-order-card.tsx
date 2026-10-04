import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { BrandColors, Spacing } from '@/constants/theme';
import type { KitchenStatus, RestaurantOrder } from '@/services/restaurant-orders';
import { formatMoney, formatRelativeTime, shortId } from '@/utils/format';
import { KITCHEN_ACTIONS, nextKitchenStatus, ORDER_STATUS_META } from '@/utils/order-status';

type RestaurantOrderCardProps = {
  order: RestaurantOrder;
  /** Without it the card is read-only (orders outside the kitchen lanes). */
  onAction?: (status: KitchenStatus) => void;
  busy?: boolean;
  error?: string | null;
};

export function RestaurantOrderCard({ order, onAction, busy = false, error }: RestaurantOrderCardProps) {
  const next = onAction ? nextKitchenStatus(order.status) : null;
  const status = ORDER_STATUS_META[order.status];

  return (
    <Card testID={`order-${order.id}`}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="defaultBold">Order {shortId(order.id)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatRelativeTime(order.createdAt)}
          </ThemedText>
        </View>
        <Badge label={status.label} tone={status.tone} testID={`order-${order.id}-status`} />
      </View>

      <View style={styles.items} testID={`order-${order.id}-items`} nativeID={`order-${order.id}-items`}>
        {order.items.map((item, index) => (
          <View key={`${item.menuItemId}-${index}`} style={styles.itemRow}>
            <ThemedText type="small" style={styles.quantity}>
              {item.quantity}×
            </ThemedText>
            <ThemedText type="small" style={styles.itemName} numberOfLines={2}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.price}>
              {formatMoney(Number(item.price) * item.quantity)}
            </ThemedText>
          </View>
        ))}
        <View style={styles.itemRow}>
          <ThemedText type="smallBold" style={styles.itemName}>
            Total
          </ThemedText>
          <ThemedText type="smallBold" style={styles.price} testID={`order-${order.id}-total`}>
            {formatMoney(order.totalAmount)}
          </ThemedText>
        </View>
      </View>

      {error ? <InlineAlert message={error} testID={`order-${order.id}-error`} /> : null}
      {next && onAction ? (
        <AppButton
          testID={`order-${order.id}-${KITCHEN_ACTIONS[next].id}`}
          title={KITCHEN_ACTIONS[next].label}
          size="sm"
          loading={busy}
          onPress={() => onAction(next)}
          accessibilityHint={`Moves this order to ${ORDER_STATUS_META[next].label}.`}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
  },
  items: {
    gap: Spacing.one,
    marginVertical: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.divider,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  quantity: {
    width: 28,
    fontVariant: ['tabular-nums'],
  },
  itemName: {
    flex: 1,
  },
  price: {
    fontVariant: ['tabular-nums'],
  },
});
