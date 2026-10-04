import { DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { BrandColors } from '@/constants/theme';
import { hydrateSession, useAuthSession } from '@/services/session';

void SplashScreen.preventAutoHideAsync();

// Light-only for now (see BRANDING.md); keep navigation chrome on the brand canvas.
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: BrandColors.primary,
    background: BrandColors.background,
    card: BrandColors.surface,
    text: BrandColors.text,
    border: BrandColors.border,
  },
};

export default function RootLayout() {
  const session = useAuthSession();

  useEffect(() => {
    void hydrateSession();
  }, []);

  useEffect(() => {
    // Keep the native splash up until we know which stack to show, so there's no flash of the wrong screen.
    if (session.hydrated) SplashScreen.hide();
  }, [session.hydrated]);

  if (!session.hydrated) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      <Slot />
    </ThemeProvider>
  );
}
