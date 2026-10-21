import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, TabBar } from '@/constants/theme';
import { t } from '@/i18n';

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BrandColors.primaryText,
        tabBarInactiveTintColor: BrandColors.textSecondary,
        // Shared tab-bar sizes (#53, #45) leave room for the whole label on the web.
        tabBarStyle: [{ backgroundColor: BrandColors.surface, borderTopColor: BrandColors.border }, TabBar.style],
        tabBarLabelStyle: TabBar.labelStyle,
        sceneStyle: { backgroundColor: BrandColors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('Orders'), tabBarIcon: tabIcon('orders'), tabBarButtonTestID: 'tab-orders' }} />
      <Tabs.Screen name="menu" options={{ title: t('Menu'), tabBarIcon: tabIcon('food'), tabBarButtonTestID: 'tab-menu' }} />
    </Tabs>
  );
}
