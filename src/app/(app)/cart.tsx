import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { cartItemCount, emptyCart, setCartQuantity, useCart } from '@/state/cart';
import { useRestaurant } from '@/state/catalog';
import { confirm } from '@/utils/confirm';
import { formatMoney } from '@/utils/format';

export default function CartScreen() {
  const cart = useCart();
  const restaurant = useRestaurant(cart.data?.restaurantId ?? undefined);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = cart.data?.items ?? [];
  const count = cartItemCount(cart.data);

  const changeQuantity = (menuItemId: string, quantity: number) => {
    setActionError(null);
    setCartQuantity(menuItemId, quantity).catch((error: unknown) =>
      setActionError(error instanceof Error ? error.message : 'Could not update your cart.'),
    );
  };

  const handleClear = async () => {
    const ok = await confirm({
      title: 'Clear cart?',
      message: 'This removes every item from your cart.',
      confirmLabel: 'Clear cart',
      destructive: true,
    });
    if (!ok) return;

    setActionError(null);
    emptyCart().catch((error: unknown) =>
      setActionError(error instanceof Error ? error.message : 'Could not clear your cart.'),
    );
  };

  const header = (
    <ScreenHeader
      title="Your cart"
      subtitle={restaurant.data ? `From ${restaurant.data.name}` : undefined}
      showBack
      right={
        items.length > 0 ? (
          <AppButton title="Clear" onPress={() => void handleClear()} variant="ghost" size="sm" fullWidth={false} />
        ) : null
      }
    />
  );

  if (cart.isLoading) {
    return (
      <Screen>
        {header}
        <SkeletonList count={3} itemHeight={80} />
      </Screen>
    );
  }

  if (!cart.data) {
    return (
      <Screen>
        {header}
        <ErrorState error={cart.error} onRetry={() => void cart.refresh()} />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen>
        {header}
        <StateView
          icon="bag"
          title="Your cart is empty"
          message="Add dishes from a restaurant to start an order."
          actionLabel="Browse restaurants"
          onAction={() => router.navigate('/home')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <ThemedText type="default" themeColor="textSecondary">
              Subtotal · {count} {count === 1 ? 'item' : 'items'}
            </ThemedText>
            <ThemedText type="heading" testID="cart-subtotal">
              {formatMoney(cart.data.total)}
            </ThemedText>
          </View>
          <AppButton testID="cart-checkout" title="Go to checkout" onPress={() => router.push('/checkout')} />
        </View>
      }
    >
      {header}
      <FlatList
        data={items}
        keyExtractor={(item) => item.menuItemId}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          actionError ? (
            <View style={styles.alert}>
              <InlineAlert message={actionError} onDismiss={() => setActionError(null)} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={cart.refreshing}
            onRefresh={() => void cart.refresh()}
            tintColor={BrandColors.primary}
            colors={[BrandColors.primary]}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <ThemedText type="defaultBold" numberOfLines={2}>
                {item.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatMoney(item.price)} each
              </ThemedText>
              <ThemedText type="smallBold">{formatMoney(item.price * item.quantity)}</ThemedText>
            </View>
            <QuantityStepper
              testID={`cart-qty-${item.name}`}
              quantity={item.quantity}
              itemName={item.name}
              onChange={(next) => changeQuantity(item.menuItemId, next)}
            />
          </Card>
        )}
        ListFooterComponent={
          <ThemedText type="caption" themeColor="textSecondary" style={styles.note}>
            Your final total is confirmed when the order is placed.
          </ThemedText>
        }
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  alert: {
    marginBottom: Spacing.three,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  separator: {
    height: Spacing.three,
  },
  note: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.three,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
