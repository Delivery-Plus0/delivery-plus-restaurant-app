import { useSyncExternalStore } from 'react';

/**
 * Arabic and English (#151), shared by the three apps. Strings are written in English and looked up as
 * keys: `t('Place order')`. Arabic lives in each app's `src/i18n/ar.ts` (plus the kit's own strings in
 * `kit-ar.ts`); anything missing falls back to the English text. `{name}` placeholders are filled from
 * `params`. A unit test keeps every `t('…')` in the code covered by an Arabic entry.
 *
 * Pure on purpose (no React Native, no storage): utils can translate in node tests. Saving the choice and
 * the layout direction live in `device.ts`.
 */
export type Locale = 'ar' | 'en';
export const LOCALES: readonly Locale[] = ['ar', 'en'];
export const LOCALE_NAMES: Record<Locale, string> = { ar: 'العربية', en: 'English' };

export type TranslationParams = Record<string, string | number>;

const arabic: Record<string, string> = {};
let current: Locale = initialLocale();
const listeners = new Set<() => void>();

/** Registers Arabic translations (English text → Arabic). Later registrations win. */
export function addArabic(dictionary: Readonly<Record<string, string>>): void {
  Object.assign(arabic, dictionary);
}

/**
 * The starting language: `EXPO_PUBLIC_DEFAULT_LOCALE` when set (E2E builds and tests pin English), otherwise
 * English only for an English device and Arabic for everyone else: Delivery Plus serves Egypt.
 */
export function initialLocale(configured = process.env.EXPO_PUBLIC_DEFAULT_LOCALE, device = deviceLanguage()): Locale {
  if (configured === 'ar' || configured === 'en') return configured;
  return device.toLowerCase().startsWith('en') ? 'en' : 'ar';
}

function deviceLanguage(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? '';
  } catch {
    return '';
  }
}

/** `{name}` placeholders filled from params; unknown ones are left as written. */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** The text in the current language. */
export function t(text: string, params?: TranslationParams): string {
  return interpolate(current === 'ar' ? (arabic[text] ?? text) : text, params);
}

/** For tests and tooling: the Arabic for an English text, or undefined when missing. */
export function arabicFor(text: string): string | undefined {
  return arabic[text];
}

export function getLocale(): Locale {
  return current;
}

/** Changes the language in memory and re-renders subscribers; `setLocale` in device.ts also saves it. */
export function setCurrentLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  listeners.forEach((listener) => listener());
}

export function isRTL(locale: Locale = current): boolean {
  return locale === 'ar';
}

/** BCP 47 tag for Intl formatting (dates, numbers). */
export function intlLocale(locale: Locale = current): string {
  return locale === 'ar' ? 'ar-EG' : 'en-US';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders the caller when the language changes. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, getLocale);
}
