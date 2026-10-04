import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { BrandColors, Elevation, IconSize, Radius, Spacing } from '@/constants/theme';
import type { Restaurant, RestaurantStatus } from '@/services/restaurants';

export const restaurantStatusMeta: Record<RestaurantStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { label: 'Open', tone: 'success' },
  BUSY: { label: 'Busy', tone: 'warning' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
  SUSPENDED: { label: 'Unavailable', tone: 'danger' },
};

type RestaurantCardProps = {
  restaurant: Restaurant;
  onPress: (restaurant: Restaurant) => void;
};

/** Memoized so list re-renders (search typing, refresh) don't repaint unchanged cards. */
export const RestaurantCard = memo(function RestaurantCard({ restaurant, onPress }: RestaurantCardProps) {
  const status = restaurantStatusMeta[restaurant.status] ?? restaurantStatusMeta.CLOSED;
  const unavailable = restaurant.status === 'CLOSED' || restaurant.status === 'SUSPENDED';

  return (
    <Pressable
      testID={`restaurant-${restaurant.name}`} nativeID={`restaurant-${restaurant.name}`}
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}, ${status.label}, ${restaurant.address}`}
      onPress={() => onPress(restaurant)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cover}>
        {restaurant.coverImageUrl ? (
          <Image
            source={restaurant.coverImageUrl}
            style={[StyleSheet.absoluteFill, unavailable && styles.dimmed]}
            contentFit="cover"
            transition={200}
            recyclingKey={restaurant.id}
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.coverFallback}>
            <Icon name="food" size={IconSize.xl} color={BrandColors.packageTan} />
          </View>
        )}
        <View style={styles.statusPill}>
          <Badge label={status.label} tone={status.tone} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.logo}>
          {restaurant.logoUrl ? (
            <Image source={restaurant.logoUrl} style={styles.logoImage} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <ThemedText type="defaultBold" style={styles.logoInitial}>
              {restaurant.name.charAt(0).toUpperCase()}
            </ThemedText>
          )}
        </View>
        <View style={styles.info}>
          <ThemedText type="heading" numberOfLines={1}>
            {restaurant.name}
          </ThemedText>
          {restaurant.description ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {restaurant.description}
            </ThemedText>
          ) : null}
          <View style={styles.addressRow}>
            <Icon name="location" size={14} color={BrandColors.textMuted} />
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.address}>
              {restaurant.address}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BrandColors.divider,
    ...Elevation.low,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cover: {
    height: 140,
    backgroundColor: BrandColors.tanSoft,
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.55,
  },
  statusPill: {
    position: 'absolute',
    top: Spacing.three - Spacing.one,
    left: Spacing.three - Spacing.one,
  },
  body: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: BrandColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoInitial: {
    color: BrandColors.primaryText,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  address: {
    flex: 1,
  },
});
