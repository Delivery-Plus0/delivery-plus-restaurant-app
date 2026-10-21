import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';

import { BrandColors } from '@/constants/theme';
import { signOut } from '@/services/api';
import { useAuthSession } from '@/services/session';
import { OWNER_ROLE } from '@/utils/order-status';

export default function AppLayout() {
  const { hydrated, session } = useAuthSession();
  const notAnOwner = Boolean(session && session.user.role !== OWNER_ROLE);

  useEffect(() => {
    // Sign-in already refuses other roles; this covers a session stored by an older build or another app.
    if (notAnOwner) void signOut();
  }, [notAnOwner]);

  if (!hydrated) {
    return null;
  }

  if (!session || notAnOwner) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BrandColors.background } }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
