import { Redirect, Stack } from 'expo-router';

import { BrandColors } from '@/constants/theme';
import { useAuthSession } from '@/services/session';

export default function AppLayout() {
  const { hydrated, session } = useAuthSession();

  if (!hydrated) {
    return null;
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BrandColors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="restaurant/[id]" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="order/[id]" />
    </Stack>
  );
}
