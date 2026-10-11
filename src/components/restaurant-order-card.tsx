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
import { t } from '@/i18n';

type RestaurantOrderCardProps = {
  order: RestaurantOrder;
  /** Without it the card is read-only (orders outside the kitchen lanes). */
  onAction?: (status: KitchenStatus) => void;
  busy?: boolean;
  error?: string | null;
  /** Opens the order detail sheet (#154). */
  onOpen?: () => void;
};

export function RestaurantOrderCard({ order, onAction, busy = false, error, onOpen }: RestaurantOrderCardProps) {
  const next = onAction ? nextKitchenStatus(order.status) : null;
  const status = ORDER_STATUS_META[order.status];

  return (
    <Card testID={`order-${order.id}`}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="defaultBold">Order {shortId(order.id)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" testID={`order-${order.id}-meta`}>
            {[order.customerFirstName, formatRelativeTime(order.createdAt)].filter(Boolean).join(' · ')}
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
            {t('Items total')}
          </ThemedText>
          {/* The restaurant's amount is the items; the delivery fee in totalAmount isn't theirs (#145). */}
          <ThemedText type="smallBold" style={styles.price} testID={`order-${order.id}-total`}>
            {formatMoney(order.subtotalAmount ?? order.totalAmount)}
          </ThemedText>
        </View>
      </View>

      {error ? <InlineAlert message={error} testID={`order-${order.id}-error`} /> : null}
      <View style={styles.actions}>
        {onOpen ? (
          <AppButton testID={`order-${order.id}-details`} title={t('Details')} variant="secondary" size="sm" fullWidth={false} onPress={onOpen} />
        ) : null}
        {next && onAction ? (
          <View style={styles.primaryAction}>
            <AppButton
              testID={`order-${order.id}-${KITCHEN_ACTIONS[next].id}`}
              title={KITCHEN_ACTIONS[next].label}
              size="sm"
              loading={busy}
              onPress={() => onAction(next)}
              accessibilityHint={t('Moves this order to {status}.', { status: ORDER_STATUS_META[next].label })}
            />
          </View>
        ) : null}
      </View>
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  primaryAction: {
    flex: 1,
  },
});
