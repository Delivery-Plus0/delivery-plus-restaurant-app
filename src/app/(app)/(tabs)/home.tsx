import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { CartBar } from '@/components/cart-bar';
import { RestaurantCard } from '@/components/restaurant-card';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, IconSize, Layout, Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { Restaurant, RestaurantStatus } from '@/services/restaurants';
import { useAuthSession } from '@/services/session';
import { cartItemCount, useCart } from '@/state/cart';
import { useRestaurants } from '@/state/catalog';
import { useProfile } from '@/state/profile';
import { firstName, greetingFor } from '@/utils/format';

type Filter = { label: string; status?: RestaurantStatus };

const FILTERS: Filter[] = [{ label: 'All' }, { label: 'Open now', status: 'OPEN' }];

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(FILTERS[0]);
  const debouncedSearch = useDebouncedValue(search);

  const restaurants = useRestaurants({ search: debouncedSearch, status: filter.status, limit: 50 });
  const { data: cart } = useCart();
  const { data: profile } = useProfile();
  const { session } = useAuthSession();

  const name = firstName(profile?.fullName) ?? session?.user.email.split('@')[0];
  const items = restaurants.data?.items ?? [];
  const isSearching = debouncedSearch.trim().length > 0 || Boolean(filter.status);

  const openRestaurant = (restaurant: Restaurant) => {
    router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } });
  };

  const renderBody = () => {
    if (restaurants.isLoading) return <SkeletonList count={3} itemHeight={120} />;
    if (restaurants.error && !restaurants.data) {
      return <ErrorState error={restaurants.error} onRetry={() => void restaurants.refresh()} />;
    }
    return null;
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="small" themeColor="textSecondary">
            {greetingFor()}
            {name ? `, ${name}` : ''}
          </ThemedText>
          <ThemedText type="subtitle" accessibilityRole="header" testID="home-title">
            What are you craving?
          </ThemedText>
        </View>
        <IconButton
          testID="home-cart"
          icon="bag"
          accessibilityLabel="Cart"
          badgeCount={cartItemCount(cart)}
          onPress={() => router.push('/cart')}
        />
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Icon name="search" size={IconSize.md} color={BrandColors.textMuted} />
          <TextInput
            testID="home-search"
            nativeID="home-search"
            value={search}
            onChangeText={setSearch}
            placeholder="Search restaurants"
            placeholderTextColor={BrandColors.textMuted}
            accessibilityLabel="Search restaurants"
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {search ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setSearch('')}>
              <Icon name="close" size={IconSize.sm} color={BrandColors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.filters}>
          {FILTERS.map((option) => {
            const selected = option.label === filter.label;
            return (
              <Pressable
                testID={`filter-${option.label}`}
                nativeID={`filter-${option.label}`}
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(option)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <ThemedText type="smallBold" style={selected ? styles.chipTextSelected : styles.chipText}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {renderBody() ?? (
        <FlatList
          data={items}
          keyExtractor={(restaurant) => restaurant.id}
          renderItem={({ item }) => <RestaurantCard restaurant={item} onPress={openRestaurant} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={4}
          windowSize={7}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={restaurants.refreshing}
              onRefresh={() => void restaurants.refresh()}
              tintColor={BrandColors.primary}
              colors={[BrandColors.primary]}
            />
          }
          ListEmptyComponent={
            <StateView
              icon={isSearching ? 'search' : 'store'}
              title={isSearching ? 'No matches' : 'No restaurants yet'}
              message={
                isSearching
                  ? 'Try a different name or clear the filters.'
                  : 'Restaurants will show up here as soon as they join Delivery Plus.'
              }
            />
          }
        />
      )}

      <CartBar />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  headerText: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: Layout.inputHeight - 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: BrandColors.text,
  },
  filters: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
  },
  chipSelected: {
    backgroundColor: BrandColors.text,
    borderColor: BrandColors.text,
  },
  chipText: {
    color: BrandColors.text,
  },
  chipTextSelected: {
    color: BrandColors.surface,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 96,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.three,
  },
});
