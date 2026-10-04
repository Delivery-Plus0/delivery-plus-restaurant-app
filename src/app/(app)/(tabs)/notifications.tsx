import { memo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import type { AppNotification, NotificationType } from '@/services/notifications';
import { loadMoreNotifications, markAllRead, markRead, unreadCount, useNotifications } from '@/state/notifications';
import { formatRelativeTime } from '@/utils/format';

const typeIcon: Record<NotificationType, IconName> = {
  ORDER_CONFIRMED: 'orders',
  PAYMENT_COMPLETED: 'check',
  DRIVER_ASSIGNED: 'person',
  PICKED_UP: 'delivery',
  DELIVERED: 'bag',
};

export default function NotificationsScreen() {
  const notifications = useNotifications();
  const [actionError, setActionError] = useState<string | null>(null);
  const unread = unreadCount(notifications.data);

  const onError = (error: unknown) =>
    setActionError(error instanceof Error ? error.message : 'Could not update notifications.');

  const header = (
    <ScreenHeader
      title="Notifications"
      subtitle={unread > 0 ? `${unread} unread` : undefined}
      right={
        unread > 0 ? (
          <AppButton
            title="Mark all read"
            icon="checkAll"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => markAllRead().catch(onError)}
          />
        ) : null
      }
    />
  );

  if (notifications.isLoading) {
    return (
      <Screen>
        {header}
        <SkeletonList count={5} itemHeight={72} />
      </Screen>
    );
  }

  if (!notifications.data) {
    return (
      <Screen>
        {header}
        <ErrorState error={notifications.error} onRetry={() => void notifications.refresh()} />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <FlatList
        data={notifications.data.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={(id) => markRead(id).catch(onError)} />
        )}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.list}
        onEndReached={() => void loadMoreNotifications().catch(onError)}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          actionError ? (
            <View style={styles.alert}>
              <InlineAlert message={actionError} onDismiss={() => setActionError(null)} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={notifications.refreshing}
            onRefresh={() => void notifications.refresh()}
            tintColor={BrandColors.primary}
            colors={[BrandColors.primary]}
          />
        }
        ListEmptyComponent={
          <StateView
            icon="bell"
            title="You're all caught up"
            message="Order and delivery updates will show up here."
          />
        }
      />
    </Screen>
  );
}

const NotificationRow = memo(function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable
      testID={`notification-${item.id}`} nativeID={`notification-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.isRead ? '' : 'Unread. '}${item.title}. ${item.message}`}
      accessibilityHint={item.isRead ? undefined : 'Marks this notification as read'}
      onPress={() => {
        if (!item.isRead) onPress(item.id);
      }}
      style={({ pressed }) => [styles.row, !item.isRead && styles.rowUnread, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconWrap, !item.isRead && styles.iconWrapUnread]}>
        <Icon
          name={typeIcon[item.type] ?? 'bell'}
          size={IconSize.md}
          color={item.isRead ? BrandColors.textSecondary : BrandColors.primaryText}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText type={item.isRead ? 'small' : 'smallBold'} style={styles.flex} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {formatRelativeTime(item.createdAt)}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {item.message}
        </ThemedText>
      </View>
      {!item.isRead ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
});

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  alert: {
    marginBottom: Spacing.three,
  },
  separator: {
    height: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: BrandColors.divider,
  },
  rowUnread: {
    borderColor: BrandColors.primarySoft,
  },
  rowPressed: {
    backgroundColor: BrandColors.surfaceMuted,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: BrandColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: BrandColors.primarySoft,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.primary,
  },
});
