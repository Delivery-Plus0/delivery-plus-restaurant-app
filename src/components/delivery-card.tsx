import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import type { Delivery, DeliveryStatus } from '@/services/deliveries';

type Stage = DeliveryStatus | 'AWAITING';

export const deliveryStageMeta: Record<Stage, { label: string; description: string; icon: IconName }> = {
  AWAITING: {
    label: 'Finding a driver',
    description: "Your order is ready. We're assigning a driver.",
    icon: 'clock',
  },
  CREATED: {
    label: 'Finding a driver',
    description: "Your order is ready. We're assigning a driver.",
    icon: 'clock',
  },
  DRIVER_ASSIGNED: {
    label: 'Driver assigned',
    description: 'Your driver is heading to the restaurant.',
    icon: 'person',
  },
  PICKED_UP: { label: 'Picked up', description: 'Your driver has your order.', icon: 'bag' },
  IN_TRANSIT: { label: 'On the way', description: 'Your order is on its way to you.', icon: 'delivery' },
  DELIVERED: { label: 'Delivered', description: 'Your order was delivered. Enjoy!', icon: 'check' },
  CANCELLED: {
    label: 'Delivery cancelled',
    description: 'This delivery was cancelled.',
    icon: 'cancel',
  },
};

const STEPS: { status: DeliveryStatus; label: string }[] = [
  { status: 'DRIVER_ASSIGNED', label: 'Assigned' },
  { status: 'PICKED_UP', label: 'Picked up' },
  { status: 'IN_TRANSIT', label: 'On the way' },
  { status: 'DELIVERED', label: 'Delivered' },
];

/** How far along the four customer-visible steps a delivery is (-1 = none reached yet). */
export function deliveryStepIndex(status: DeliveryStatus | undefined): number {
  return status ? STEPS.findIndex((step) => step.status === status) : -1;
}

type DeliveryCardProps = {
  delivery: Delivery | null | undefined;
  isLoading: boolean;
  error: unknown;
  live: boolean;
  onRetry: () => void;
};

/** Delivery progress on order detail. Hidden by the caller until the order can have a delivery. */
export function DeliveryCard({ delivery, isLoading, error, live, onRetry }: DeliveryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <Skeleton width="40%" height={18} />
        <Skeleton width="75%" />
        <Skeleton height={28} />
      </Card>
    );
  }

  if (delivery === undefined) {
    return (
      <Card style={styles.errorRow}>
        <Icon name="error" size={IconSize.md} color={BrandColors.danger} />
        <ThemedText type="small" style={styles.flex}>
          {error instanceof Error ? error.message : "We couldn't load the delivery status."}
        </ThemedText>
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
          <ThemedText type="linkPrimary">Retry</ThemedText>
        </Pressable>
      </Card>
    );
  }

  const stage: Stage = delivery?.status ?? 'AWAITING';
  const meta = deliveryStageMeta[stage];
  const reached = deliveryStepIndex(delivery?.status);
  const cancelled = delivery?.status === 'CANCELLED';

  return (
    <Card testID="delivery-card">
      <View style={styles.header} accessible accessibilityLabel={`Delivery: ${meta.label}. ${meta.description}`}>
        <View style={styles.iconWrap}>
          <Icon name={meta.icon} size={IconSize.md} color={BrandColors.primaryText} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="caption" themeColor="textSecondary">
            DELIVERY
          </ThemedText>
          <ThemedText type="defaultBold" testID="delivery-stage">
            {meta.label}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {meta.description}
      </ThemedText>

      {!cancelled ? (
        <View style={styles.steps} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {STEPS.map((step, index) => {
            const done = index <= reached;
            return (
              <View key={step.status} style={styles.step}>
                <View style={[styles.bar, done && styles.barDone]} />
                <ThemedText type="caption" themeColor={done ? 'text' : 'textSecondary'} numberOfLines={1}>
                  {step.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      ) : null}

      {live ? (
        <ThemedText type="caption" themeColor="textSecondary">
          Checks for updates every few seconds.
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: BrandColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steps: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  step: {
    flex: 1,
    gap: Spacing.one,
  },
  bar: {
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: BrandColors.border,
  },
  barDone: {
    backgroundColor: BrandColors.primary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
