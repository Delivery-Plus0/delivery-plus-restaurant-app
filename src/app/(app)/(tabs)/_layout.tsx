import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors } from '@/constants/theme';
import { unreadCount, useNotifications } from '@/state/notifications';

const NOTIFICATION_POLL_MS = 60_000;

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  const { data } = useNotifications({ pollIntervalMs: NOTIFICATION_POLL_MS });
  const unread = unreadCount(data);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BrandColors.primaryText,
        tabBarInactiveTintColor: BrandColors.textSecondary,
        tabBarStyle: { backgroundColor: BrandColors.surface, borderTopColor: BrandColors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: BrandColors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('home'), tabBarButtonTestID: 'tab-home' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: tabIcon('orders'), tabBarButtonTestID: 'tab-orders' }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: tabIcon('bell'),
          tabBarButtonTestID: 'tab-alerts',
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: BrandColors.primary, color: BrandColors.onPrimary },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person'), tabBarButtonTestID: 'tab-profile' }} />
    </Tabs>
  );
}
