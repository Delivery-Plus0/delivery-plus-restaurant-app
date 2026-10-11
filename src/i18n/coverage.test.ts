import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' }, I18nManager: { isRTL: false, allowRTL: vi.fn(), forceRTL: vi.fn() } }));

const { arabicFor, interpolate, initialLocale } = await import('@/i18n');

const SRC = resolve(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // The i18n folder only has example calls in its docs.
    if (statSync(path).isDirectory()) return name === 'i18n' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Every literal `t('…')` / `t("…")` / `t(`…`)` first argument in the app's source. */
function translatedTexts(): Map<string, string> {
  const found = new Map<string, string>();
  const pattern = /\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      const literal = match[2].replace(/\\(['"`\\])/g, '$1');
      if (!literal.includes('${')) found.set(literal, file);
    }
  }
  return found;
}

describe('translations (#151)', () => {
  it('has Arabic for every t() text in the code', () => {
    const missing = [...translatedTexts()].filter(([text]) => !arabicFor(text)).map(([text, file]) => `${text}  (${file.slice(SRC.length + 1)})`);
    expect(missing).toEqual([]);
  });

  it('keeps the placeholders of each text in its Arabic', () => {
    const broken = [...translatedTexts().keys()].filter((text) => {
      const names = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
      const arabic = arabicFor(text);
      return arabic !== undefined && names(arabic) !== names(text);
    });
    expect(broken).toEqual([]);
  });

  it('fills placeholders and starts in Arabic unless English is configured or the device is English', () => {
    expect(interpolate('Order {id} is {status}', { id: '1A2B', status: 'ready' })).toBe('Order 1A2B is ready');
    expect(interpolate('{missing} stays', {})).toBe('{missing} stays');
    expect(initialLocale('en', 'ar-EG')).toBe('en');
    expect(initialLocale('', 'en-US')).toBe('en');
    expect(initialLocale('', 'ar-EG')).toBe('ar');
    expect(initialLocale('', '')).toBe('ar');
  });
});
