import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Layout, Radius, Spacing } from '@/constants/theme';
import type { Restaurant } from '@/services/restaurants';

/** Chips to switch between the owner's restaurants; shown only when there is more than one. */
export function RestaurantPicker({ restaurants, selectedId, onSelect }: { restaurants: Restaurant[]; selectedId: string; onSelect: (id: string) => void }) {
  if (restaurants.length < 2) return null;
  return (
    <View style={styles.picker} accessibilityLabel="Choose restaurant">
      {restaurants.map((r) => {
        const selected = r.id === selectedId;
        return (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(r.id)}
            style={[styles.chip, selected && styles.chipSelected]}
            testID={`restaurant-select-${r.id}`}
            nativeID={`restaurant-select-${r.id}`}>
            <ThemedText type="smallBold" style={{ color: selected ? BrandColors.primaryText : BrandColors.textSecondary }}>
              {r.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: Layout.buttonHeightSm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
  },
  chipSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.primarySoft,
  },
});
