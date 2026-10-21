import { DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { SessionEndedScreen } from '@/components/session-ended';
import { BrandColors } from '@/constants/theme';
import { loadSavedLocale, useLocale } from '@/i18n';
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
  const locale = useLocale();
  const [localeReady, setLocaleReady] = useState(false);

  useEffect(() => {
    void hydrateSession();
    // #151: the saved language (and its layout direction) before the first screen shows.
    void loadSavedLocale().finally(() => setLocaleReady(true));
  }, []);

  useEffect(() => {
    // Keep the native splash up until we know which stack to show, so there's no flash of the wrong screen.
    if (session.hydrated && localeReady) SplashScreen.hide();
  }, [session.hydrated, localeReady]);

  if (!session.hydrated || !localeReady) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      {/* Keyed by language so every screen re-renders in the new one (#151). */}
      <Slot key={locale} />
      {session.ended ? <SessionEndedScreen reason={session.ended} /> : null}
    </ThemeProvider>
  );
}
