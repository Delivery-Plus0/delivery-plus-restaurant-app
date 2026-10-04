import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { MenuItemRow } from '@/components/menu-item-row';
import { restaurantStatusMeta } from '@/components/restaurant-card';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonList } from '@/components/ui/skeleton';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, IconSize, Spacing } from '@/constants/theme';
import type { MenuItem } from '@/services/menus';
import { addToCart, isCartRestaurantConflict, replaceCartWith, setCartQuantity, useCart } from '@/state/cart';
import { groupMenu, useMenu, useRestaurant } from '@/state/catalog';
import { confirm } from '@/utils/confirm';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const restaurant = useRestaurant(id);
  const menu = useMenu(id);
  const { data: cart } = useCart();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sections = groupMenu(menu.data);
  const quantities = new Map(
    cart?.restaurantId === id ? cart.items.map((item) => [item.menuItemId, item.quantity] as const) : [],
  );

  const handleAdd = async (item: MenuItem) => {
    setActionError(null);
    setPendingId(item.id);
    try {
      await addToCart(item.id);
    } catch (error) {
      if (isCartRestaurantConflict(error)) {
        const startNew = await confirm({
          title: 'Start a new cart?',
          message: `Your cart has items from another restaurant. Clear it and add ${item.name}?`,
          confirmLabel: 'Start new cart',
          destructive: true,
        });
        if (startNew) {
          await replaceCartWith(item.id).catch((replaceError: unknown) => setActionError(messageOf(replaceError)));
        }
      } else {
        setActionError(messageOf(error));
      }
    } finally {
      setPendingId(null);
    }
  };

  const handleQuantity = (item: MenuItem, quantity: number) => {
    setActionError(null);
    setCartQuantity(item.id, quantity).catch((error: unknown) => setActionError(messageOf(error)));
  };

  const refresh = () => {
    void restaurant.refresh();
    void menu.refresh();
  };

  const backButton = (
    <View style={[styles.floatingBack, { top: insets.top + Spacing.two }]}>
      <IconButton icon="back" accessibilityLabel="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
    </View>
  );

  if (restaurant.isLoading) {
    return (
      <Screen edges={[]}>
        <Skeleton height={220 + insets.top} radius={0} />
        <View style={styles.loadingBody}>
          <Skeleton width="60%" height={24} />
          <Skeleton width="40%" />
        </View>
        <SkeletonList count={3} />
        {backButton}
      </Screen>
    );
  }

  if (!restaurant.data) {
    return (
      <Screen>
        <ErrorState error={restaurant.error} onRetry={refresh} />
        {backButton}
      </Screen>
    );
  }

  const info = restaurant.data;
  const status = restaurantStatusMeta[info.status] ?? restaurantStatusMeta.CLOSED;
  const closed = info.status !== 'OPEN' && info.status !== 'BUSY';

  const header = (
    <View>
      <View style={[styles.hero, { height: 200 + insets.top }]}>
        {info.coverImageUrl ? (
          <Image source={info.coverImageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        ) : (
          <View style={styles.heroFallback}>
            <Icon name="food" size={48} color={BrandColors.packageTan} />
          </View>
        )}
      </View>
      <View style={styles.intro}>
        <View style={styles.titleRow}>
          <ThemedText type="subtitle" style={styles.flex} accessibilityRole="header">
            {info.name}
          </ThemedText>
          <Badge label={status.label} tone={status.tone} />
        </View>
        {info.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {info.description}
          </ThemedText>
        ) : null}
        <View style={styles.addressRow}>
          <Icon name="location" size={IconSize.sm} color={BrandColors.textMuted} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
            {info.address}
          </ThemedText>
        </View>
        {closed ? (
          <InlineAlert tone="info" message="This restaurant isn't taking orders right now. You can still browse the menu." />
        ) : null}
        {actionError ? <InlineAlert message={actionError} onDismiss={() => setActionError(null)} /> : null}
      </View>
    </View>
  );

  return (
    <Screen edges={[]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <ThemedText type="heading">{section.title}</ThemedText>
          </View>
        )}
        renderItem={({ item }) => (
          <MenuItemRow
            item={item}
            quantityInCart={quantities.get(item.id) ?? 0}
            pending={pendingId === item.id}
            onAdd={handleAdd}
            onChangeQuantity={handleQuantity}
          />
        )}
        ItemSeparatorComponent={Divider}
        stickySectionHeadersEnabled
        initialNumToRender={10}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={menu.refreshing} onRefresh={refresh} tintColor={BrandColors.primary} colors={[BrandColors.primary]} />
        }
        ListEmptyComponent={
          menu.isLoading ? (
            <SkeletonList count={4} />
          ) : menu.error ? (
            <ErrorState error={menu.error} onRetry={() => void menu.refresh()} />
          ) : (
            <StateView icon="food" title="No menu yet" message="This restaurant hasn't published any dishes." />
          )
        }
      />
      {backButton}
      <CartBar bottomInset={insets.bottom} />
    </Screen>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  floatingBack: {
    position: 'absolute',
    left: Spacing.three,
  },
  loadingBody: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  hero: {
    backgroundColor: BrandColors.tanSoft,
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    backgroundColor: BrandColors.background,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BrandColors.border,
    marginHorizontal: Spacing.four,
  },
  listContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
});
