import { router } from 'expo-router';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { OrderCard } from '@/components/order-card';
import { ThemedText } from '@/components/themed-text';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { isActiveOrder, type Order } from '@/services/orders';
import { useOrders } from '@/state/orders';

function buildSections(orders: Order[]) {
  const sorted = [...orders].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const active = sorted.filter(isActiveOrder);
  const past = sorted.filter((order) => !isActiveOrder(order));

  return [
    ...(active.length ? [{ title: 'In progress', data: active }] : []),
    ...(past.length ? [{ title: 'Past orders', data: past }] : []),
  ];
}

export default function OrdersScreen() {
  const orders = useOrders();
  const header = <ScreenHeader title="Orders" />;

  if (orders.isLoading) {
    return (
      <Screen>
        {header}
        <SkeletonList count={4} itemHeight={80} />
      </Screen>
    );
  }

  if (!orders.data) {
    return (
      <Screen>
        {header}
        <ErrorState error={orders.error} onRetry={() => void orders.refresh()} />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <SectionList
        sections={buildSections(orders.data)}
        keyExtractor={(order) => order.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        renderSectionHeader={({ section }) => (
          <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionTitle}>
            {section.title.toUpperCase()}
          </ThemedText>
        )}
        ItemSeparatorComponent={Separator}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={orders.refreshing}
            onRefresh={() => void orders.refresh()}
            tintColor={BrandColors.primary}
            colors={[BrandColors.primary]}
          />
        }
        ListEmptyComponent={
          <StateView
            icon="orders"
            title="No orders yet"
            message="When you place an order, you can follow it here."
            actionLabel="Find something to eat"
            onAction={() => router.navigate('/home')}
          />
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
    flexGrow: 1,
  },
  sectionTitle: {
    letterSpacing: 0.6,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  separator: {
    height: Spacing.three,
  },
});
