import * as SecureStore from 'expo-secure-store';
import { I18nManager, Platform } from 'react-native';

import { getLocale, isRTL, setCurrentLocale, type Locale } from './core';

const STORAGE_KEY = 'delivery-plus.locale';

/**
 * Switches the language (#151), remembers it and sets the layout direction. On the web the direction
 * applies at once; native apps flip right-to-left on the next start (React Native's I18nManager).
 * Resolves to whether a restart is needed for the direction to change.
 */
export async function setLocale(locale: Locale): Promise<boolean> {
  setCurrentLocale(locale);
  await saveLocale(locale);
  return applyDirection(locale);
}

/** Restores the saved language at startup (the root layout calls it once). */
export async function loadSavedLocale(): Promise<Locale> {
  const saved = await readSaved();
  if (saved) setCurrentLocale(saved);
  applyDirection(getLocale());
  return getLocale();
}

function applyDirection(locale: Locale): boolean {
  const rtl = isRTL(locale);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
    return false;
  }
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.forceRTL(rtl);
  return true;
}

async function readSaved(): Promise<Locale | null> {
  try {
    const value = Platform.OS === 'web' ? globalThis.localStorage?.getItem(STORAGE_KEY) : await SecureStore.getItemAsync(STORAGE_KEY);
    return value === 'ar' || value === 'en' ? value : null;
  } catch {
    return null;
  }
}

async function saveLocale(locale: Locale): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(STORAGE_KEY, locale);
    else await SecureStore.setItemAsync(STORAGE_KEY, locale);
  } catch {
    // Not remembered (private mode, storage blocked): the app still switches for this session.
  }
}
