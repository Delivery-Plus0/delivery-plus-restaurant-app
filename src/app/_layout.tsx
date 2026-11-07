import {
  ReadexPro_300Light,
  ReadexPro_400Regular,
  ReadexPro_500Medium,
  ReadexPro_600SemiBold,
  ReadexPro_700Bold,
  useFonts,
} from '@expo-google-fonts/readex-pro';
import { DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { SessionEndedScreen } from '@/components/session-ended';
import { BrandColors, FontFamily } from '@/constants/theme';
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
  fonts: {
    regular: { fontFamily: FontFamily.regular, fontWeight: '400' as const },
    medium: { fontFamily: FontFamily.medium, fontWeight: '500' as const },
    bold: { fontFamily: FontFamily.bold, fontWeight: '700' as const },
    heavy: { fontFamily: FontFamily.bold, fontWeight: '700' as const },
  },
};

export default function RootLayout() {
  const session = useAuthSession();
  const locale = useLocale();
  const [localeReady, setLocaleReady] = useState(false);
  // Readex Pro (Redesign 2026). A font that fails to load falls back to the system font rather than blocking.
  const [fontsLoaded, fontError] = useFonts({
    ReadexPro_300Light,
    ReadexPro_400Regular,
    ReadexPro_500Medium,
    ReadexPro_600SemiBold,
    ReadexPro_700Bold,
  });
  const fontsReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    void hydrateSession();
    // #151: the saved language (and its layout direction) before the first screen shows.
    void loadSavedLocale().finally(() => setLocaleReady(true));
  }, []);

  useEffect(() => {
    // Keep the native splash up until we know which stack to show, so there's no flash of the wrong screen.
    if (session.hydrated && localeReady && fontsReady) SplashScreen.hide();
  }, [session.hydrated, localeReady, fontsReady]);

  if (!session.hydrated || !localeReady || !fontsReady) {
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
