import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { BrandColors, Spacing } from '@/constants/theme';
import { ORDER_PROGRESS, type OrderStatus } from '@/services/orders';

export const orderStatusMeta: Record<OrderStatus, { label: string; description: string; tone: BadgeTone }> = {
  CREATED: { label: 'Order placed', description: 'We received your order.', tone: 'info' },
  PAYMENT_PENDING: { label: 'Awaiting payment', description: 'Confirming your payment.', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', description: 'Payment received — sent to the restaurant.', tone: 'info' },
  PREPARING: { label: 'Preparing', description: 'The kitchen is making your food.', tone: 'brand' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', description: 'Waiting for a driver to collect it.', tone: 'brand' },
  DRIVER_ASSIGNED: { label: 'Driver assigned', description: 'A driver is heading to the restaurant.', tone: 'brand' },
  PICKED_UP: { label: 'On the way', description: 'Your order is heading to you.', tone: 'brand' },
  DELIVERED: { label: 'Delivered', description: 'Enjoy your meal!', tone: 'success' },
  FAILED: { label: 'Failed', description: 'This order could not be completed.', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', description: 'This order was cancelled.', tone: 'neutral' },
};

export function OrderStatusBadge({ status, testID }: { status: OrderStatus; testID?: string }) {
  const meta = orderStatusMeta[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge label={meta.label} tone={meta.tone} testID={testID} />;
}

/** Vertical progress through the happy-path lifecycle; collapses to a single row for failed/cancelled orders. */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = ORDER_PROGRESS.indexOf(status);

  if (currentIndex === -1) {
    const meta = orderStatusMeta[status];
    return (
      <View style={styles.row}>
        <View style={[styles.dot, styles.dotFailed]}>
          <Icon name="cancel" size={14} color={BrandColors.onPrimary} />
        </View>
        <View style={styles.text}>
          <ThemedText type="defaultBold">{meta?.label ?? status}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {meta?.description}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View accessibilityRole="list" accessibilityLabel={`Order progress: ${orderStatusMeta[status].label}`}>
      {ORDER_PROGRESS.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const meta = orderStatusMeta[step];
        const last = index === ORDER_PROGRESS.length - 1;

        return (
          <View key={step} style={styles.row} accessibilityState={{ selected: current }}>
            <View style={styles.rail}>
              <View style={[styles.dot, (done || current) && styles.dotDone, current && styles.dotCurrent]}>
                {done ? <Icon name="check" size={12} color={BrandColors.onPrimary} /> : null}
              </View>
              {!last ? <View style={[styles.line, done && styles.lineDone]} /> : null}
            </View>
            <View style={[styles.text, !last && styles.textSpacing]}>
              <ThemedText
                type={current ? 'defaultBold' : 'small'}
                themeColor={done || current ? 'text' : 'textSecondary'}
              >
                {meta.label}
              </ThemedText>
              {current ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {meta.description}
                </ThemedText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 20;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rail: {
    alignItems: 'center',
    width: DOT,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.primary,
  },
  dotCurrent: {
    borderColor: BrandColors.primarySoft,
    borderWidth: 5,
  },
  dotFailed: {
    borderColor: BrandColors.danger,
    backgroundColor: BrandColors.danger,
  },
  line: {
    flex: 1,
    width: 2,
    minHeight: Spacing.three,
    backgroundColor: BrandColors.border,
  },
  lineDone: {
    backgroundColor: BrandColors.primary,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  textSpacing: {
    paddingBottom: Spacing.three,
  },
});
