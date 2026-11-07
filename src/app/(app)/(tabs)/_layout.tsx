import { Tabs } from 'expo-router';
import { useWindowDimensions, type ColorValue } from 'react-native';

import { AccountActions } from '@/components/account-actions';
import { DashboardSidebar, SIDEBAR_MIN_WIDTH } from '@/components/dashboard-sidebar';

import { TabBarIcon, type IconName } from '@/components/ui/icon';
import { BrandColors, TabBar } from '@/constants/theme';
import { t } from '@/i18n';

function tabIcon(name: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <TabBarIcon name={name} color={color} focused={focused} />;
  };
}

export default function TabsLayout() {
  // Figma R-03/R-11: a sidebar on desktop widths, the bottom tabs on tablets and phones.
  const sidebar = useWindowDimensions().width >= SIDEBAR_MIN_WIDTH;
  return (
    <>
    <Tabs
      tabBar={sidebar ? (props) => <DashboardSidebar {...props} /> : undefined}
      screenOptions={{
        tabBarPosition: sidebar ? 'left' : 'bottom',
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
    <AccountActions />
    </>
  );
}
