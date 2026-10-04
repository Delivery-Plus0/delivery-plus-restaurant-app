import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { OrderStatusBadge } from '@/components/order-status';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { Order } from '@/services/orders';
import { useRestaurant } from '@/state/catalog';
import { formatDateTime, formatMoney, shortId } from '@/utils/format';

function summarizeItems(order: Order): string {
  const [first, ...rest] = order.items;
  if (!first) return 'No items';
  const lead = `${first.quantity}× ${first.name}`;
  return rest.length ? `${lead} +${rest.length} more` : lead;
}

export const OrderCard = memo(function OrderCard({ order }: { order: Order }) {
  const { data: restaurant } = useRestaurant(order.restaurantId);
  const restaurantName = restaurant?.name ?? 'Restaurant';

  return (
    <Card
      testID={`order-card-${order.id}`}
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
      accessibilityLabel={`Order from ${restaurantName}, ${formatMoney(order.totalAmount)}`}
    >
      <View style={styles.topRow}>
        <View style={styles.flex}>
          <ThemedText type="defaultBold" numberOfLines={1}>
            {restaurantName}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            #{shortId(order.id)} · {formatDateTime(order.createdAt)}
          </ThemedText>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>
      <View style={styles.bottomRow}>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
          {summarizeItems(order)}
        </ThemedText>
        <ThemedText type="smallBold">{formatMoney(order.totalAmount)}</ThemedText>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
