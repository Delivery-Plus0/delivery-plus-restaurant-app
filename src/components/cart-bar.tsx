import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { BrandColors, Elevation, IconSize, Radius, Spacing } from '@/constants/theme';
import { cartItemCount, useCart } from '@/state/cart';
import { formatMoney } from '@/utils/format';

/** Floating "View cart" bar shown while the cart has items. Renders nothing otherwise. */
export function CartBar({ bottomInset = 0 }: { bottomInset?: number }) {
  const { data: cart } = useCart();
  const count = cartItemCount(cart);

  if (!cart || count === 0) return null;

  return (
    <View style={[styles.wrap, { bottom: Spacing.three + bottomInset }]} pointerEvents="box-none">
      <Pressable
        testID="cart-bar"
        nativeID="cart-bar"
        accessibilityRole="button"
        accessibilityLabel={`View cart, ${count} ${count === 1 ? 'item' : 'items'}, ${formatMoney(cart.total)}`}
        onPress={() => router.push('/cart')}
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
      >
        <View style={styles.count}>
          <Text style={styles.countText}>{count}</Text>
        </View>
        <Text style={styles.label}>View cart</Text>
        <Text style={styles.total}>{formatMoney(cart.total)}</Text>
        <Icon name="chevronRight" size={IconSize.sm} color={BrandColors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    height: 56,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: BrandColors.primary,
    ...Elevation.medium,
  },
  pressed: {
    backgroundColor: BrandColors.primaryPressed,
  },
  count: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: BrandColors.onPrimary,
    fontWeight: '700',
  },
  label: {
    flex: 1,
    color: BrandColors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  total: {
    color: BrandColors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
