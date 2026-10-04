import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import { submitCheckout } from '@/services/checkout';
import { reloadCart, useCart } from '@/state/cart';
import { useRestaurant } from '@/state/catalog';
import { invalidateResources } from '@/state/resource-cache';
import { formatMoney } from '@/utils/format';

function createIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export default function CheckoutScreen() {
  const cart = useCart();
  const restaurant = useRestaurant(cart.data?.restaurantId ?? undefined);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedOrderId, setFailedOrderId] = useState<string | null>(null);
  // Stable for this checkout attempt so a retry can never create a duplicate order or charge.
  const orderIdempotencyKey = useRef(createIdempotencyKey('order'));
  const paymentIdempotencyKey = useRef(createIdempotencyKey('payment'));

  const handlePlaceOrder = async () => {
    try {
      setPlacingOrder(true);
      setErrorMessage(null);
      setFailedOrderId(null);
      const { order, payment } = await submitCheckout(orderIdempotencyKey.current, paymentIdempotencyKey.current);

      // The order-service empties the cart once the order exists, whatever happens to payment.
      void reloadCart();
      invalidateResources('orders');

      if (payment.status === 'FAILED') {
        setFailedOrderId(order.id);
        setErrorMessage(payment.failureReason || 'Payment could not be completed.');
        return;
      }

      if (payment.status !== 'COMPLETED') {
        setFailedOrderId(order.id);
        setErrorMessage('Payment is still processing. Check the order status before trying again.');
        return;
      }

      router.replace({ pathname: '/order/[id]', params: { id: order.id, placed: '1' } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'We could not place your order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const header = <ScreenHeader title="Checkout" showBack />;

  if (cart.isLoading) {
    return (
      <Screen>
        {header}
        <SkeletonList count={2} />
      </Screen>
    );
  }

  if (!cart.data && !failedOrderId) {
    return (
      <Screen>
        {header}
        <ErrorState error={cart.error} onRetry={() => void cart.refresh()} />
      </Screen>
    );
  }

  const items = cart.data?.items ?? [];

  if (items.length === 0 && !failedOrderId) {
    return (
      <Screen>
        {header}
        <StateView
          icon="bag"
          title="Your cart is empty"
          message="Add items before checking out."
          actionLabel="Browse restaurants"
          onAction={() => router.navigate('/home')}
        />
      </Screen>
    );
  }

  const footer = failedOrderId ? (
    <AppButton
      testID="checkout-view-order"
      title="View order status"
      variant="secondary"
      onPress={() => router.replace({ pathname: '/order/[id]', params: { id: failedOrderId } })}
    />
  ) : (
    <AppButton
      testID="checkout-place-order"
      title={`Place order · ${formatMoney(cart.data?.total)}`}
      onPress={() => void handlePlaceOrder()}
      loading={placingOrder}
      accessibilityHint="Creates your order and charges the total shown"
    />
  );

  return (
    <Screen footer={footer}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage ? <InlineAlert message={errorMessage} testID="checkout-error" /> : null}

        {restaurant.data ? (
          <Card style={styles.row}>
            <View style={styles.iconWrap}>
              <Icon name="store" size={IconSize.md} color={BrandColors.primaryText} />
            </View>
            <View style={styles.flex}>
              <ThemedText type="caption" themeColor="textSecondary">
                ORDERING FROM
              </ThemedText>
              <ThemedText type="defaultBold">{restaurant.data.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {restaurant.data.address}
              </ThemedText>
            </View>
          </Card>
        ) : null}

        {items.length > 0 ? (
          <Card>
            <ThemedText type="heading">Order summary</ThemedText>
            {items.map((item) => (
              <View key={item.menuItemId} style={styles.itemRow}>
                <ThemedText type="small" style={styles.flex}>
                  <ThemedText type="smallBold">{item.quantity}×</ThemedText> {item.name}
                </ThemedText>
                <ThemedText type="small">{formatMoney(item.price * item.quantity)}</ThemedText>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.itemRow}>
              <ThemedText type="heading">Total</ThemedText>
              <ThemedText type="heading">{formatMoney(cart.data?.total)}</ThemedText>
            </View>
          </Card>
        ) : null}

        <Card style={styles.row}>
          <View style={styles.iconWrap}>
            <Icon name="check" size={IconSize.md} color={BrandColors.primaryText} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="defaultBold">Payment</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Processed securely by Delivery Plus when you place the order.
            </ThemedText>
          </View>
        </Card>
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
  row: {
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BrandColors.border,
    marginVertical: Spacing.one,
  },
});
