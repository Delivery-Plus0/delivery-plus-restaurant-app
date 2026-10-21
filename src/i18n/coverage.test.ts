import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' }, I18nManager: { isRTL: false, allowRTL: vi.fn(), forceRTL: vi.fn() } }));

const { ARABIC_PLURAL_CATEGORIES, arabicFor, arabicPluralCategory, arabicPluralsFor, interpolate, initialLocale, setCurrentLocale, tn } = await import('@/i18n');

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

/** Every literal `tn(count, '…one…', '…other…')` in the app's source: the English plural (`other`) and where. */
function pluralTexts(): Map<string, string> {
  const found = new Map<string, string>();
  const pattern = /\btn\(\s*[^,()]+(?:\([^()]*\))?\s*,\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,\s*(['"`])((?:\\.|(?!\3).)*)\3/g;
  for (const file of sourceFiles(SRC)) {
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) found.set(match[4].replace(/\\(['"`\\])/g, '$1'), file);
  }
  return found;
}

/**
 * A counted noun built from pieces (#27): a count compared with 1 choosing between two texts, as in
 * `n === 1 ? 'order' : 'orders'` or `n === 1 ? t('1 star') : t('{n} stars')`. Arabic has six forms; use tn().
 * Also the statement form, `if (count === 1) return t('1 delivery')`. Only texts are matched (a branch
 * with a letter), so `columns === 1 ? '100%' : …` is fine.
 */
function countedNounPieces(): string[] {
  const pattern =
    /(?:===|!==)\s*1\s*(?:\?\s*(?:t\(\s*)?|[^\n;?]*\)\s*return\s+t\(\s*)(['"`])[^'"`]*[A-Za-z\u0600-\u06FF][^'"`]*\1/g;
  return sourceFiles(SRC).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return [...text.matchAll(pattern)].map((match) => `${file.slice(SRC.length + 1)}:${text.slice(0, match.index).split('\n').length}  ${match[0]}`);
  });
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

  it('has all six Arabic forms for every tn() plural, using only its placeholders (#27)', () => {
    const names = (value: string) => new Set([...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
    const problems = [...pluralTexts()].flatMap(([other, file]) => {
      const forms = arabicPluralsFor(other);
      if (!forms) return [`${other}  (${file.slice(SRC.length + 1)}): no Arabic plural forms`];
      const allowed = names(other);
      return ARABIC_PLURAL_CATEGORIES.flatMap((category) => {
        const form = forms[category];
        if (!form) return [`${other}: missing Arabic "${category}"`];
        const stray = [...names(form)].filter((name) => !allowed.has(name));
        return stray.length ? [`${other}: Arabic "${category}" uses {${stray.join('}, {')}}`] : [];
      });
    });
    expect(problems).toEqual([]);
  });

  it('never builds a counted noun from pieces; tn() handles Arabic plurals (#27)', () => {
    expect(countedNounPieces()).toEqual([]);
  });

  it('picks the Arabic plural form for 0, 1, 2, 3, 11, 100 and 102, and English one/other (#27)', () => {
    expect([0, 1, 2, 3, 10, 11, 99, 100, 102, 103, 111].map(arabicPluralCategory)).toEqual(['zero', 'one', 'two', 'few', 'few', 'many', 'many', 'other', 'other', 'few', 'many']);
    try {
      setCurrentLocale('en');
      expect(tn(1, '{count} thing', '{count} things')).toBe('1 thing');
      expect(tn(0, '{count} thing', '{count} things')).toBe('0 things');
      expect(tn(2, '{count} thing', '{count} things', { count: '٢' })).toBe('٢ things');
      setCurrentLocale('ar');
      // Without Arabic forms the English plural is used, never a broken sentence.
      expect(tn(5, '{count} thing', '{count} things')).toBe('5 things');
    } finally {
      setCurrentLocale(initialLocale());
    }
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
