import { Image } from 'expo-image';
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import type { MenuItem } from '@/services/menus';
import { formatMoney } from '@/utils/format';

type MenuItemRowProps = {
  item: MenuItem;
  quantityInCart: number;
  pending: boolean;
  onAdd: (item: MenuItem) => void;
  onChangeQuantity: (item: MenuItem, quantity: number) => void;
};

export const MenuItemRow = memo(function MenuItemRow({
  item,
  quantityInCart,
  pending,
  onAdd,
  onChangeQuantity,
}: MenuItemRowProps) {
  return (
    <View style={[styles.row, !item.available && styles.unavailable]}>
      <View style={styles.info}>
        <ThemedText type="defaultBold" numberOfLines={2}>
          {item.name}
        </ThemedText>
        {item.description ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {item.description}
          </ThemedText>
        ) : null}
        <View style={styles.priceRow}>
          <ThemedText type="smallBold">{formatMoney(item.price)}</ThemedText>
          {!item.available ? (
            <ThemedText type="caption" themeColor="textSecondary">
              · Sold out
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.side}>
        {item.imageUrl ? (
          <Image
            source={item.imageUrl}
            style={styles.image}
            contentFit="cover"
            transition={150}
            recyclingKey={item.id}
            cachePolicy="memory-disk"
          />
        ) : null}
        {!item.available ? null : quantityInCart > 0 ? (
          <QuantityStepper
            testID={`qty-${item.name}`}
            quantity={quantityInCart}
            itemName={item.name}
            onChange={(next) => onChangeQuantity(item, next)}
          />
        ) : (
          <Pressable
            testID={`add-${item.name}`} nativeID={`add-${item.name}`}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.name} to cart`}
            accessibilityState={{ busy: pending, disabled: pending }}
            disabled={pending}
            onPress={() => onAdd(item)}
            style={({ pressed }) => [styles.addButton, item.imageUrl ? styles.addOverlay : null, pressed && styles.addPressed]}
          >
            {pending ? (
              <ActivityIndicator size="small" color={BrandColors.primaryText} />
            ) : (
              <Icon name="plus" size={IconSize.md} color={BrandColors.primaryText} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    backgroundColor: BrandColors.background,
  },
  unavailable: {
    opacity: 0.55,
  },
  info: {
    flex: 1,
    gap: Spacing.one,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  side: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: Radius.sm,
    backgroundColor: BrandColors.tanSoft,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: BrandColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOverlay: {
    position: 'absolute',
    right: -Spacing.one,
    bottom: -Spacing.one,
  },
  addPressed: {
    backgroundColor: BrandColors.primarySoft,
  },
});
