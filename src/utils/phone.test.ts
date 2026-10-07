import { describe, expect, it } from 'vitest';

import { EGYPTIAN_MOBILE_MESSAGE, formatPhone, normalizeEgyptianMobile, phoneError } from './phone';

/**
 * Copied from the backend's shared `EGYPTIAN_MOBILE_CASES` (shared/src/utils/egyptian-mobile.spec.ts,
 * #152): keep the two tables identical so the app and the API accept and reject the same inputs.
 */
const EGYPTIAN_MOBILE_CASES: [input: string, expected: string | null][] = [
  ['01092784342', '+201092784342'],
  ['+20 1092784342', '+201092784342'],
  ['+201092784342', '+201092784342'],
  ['0020-109-278-4342', '+201092784342'],
  ['201092784342', '+201092784342'],
  ['+20 01092784342', '+201092784342'],
  [' 010 9278 4342 ', '+201092784342'],
  ['(010) 9278-4342', '+201092784342'],
  ['01112345678', '+201112345678'],
  ['01212345678', '+201212345678'],
  ['01512345678', '+201512345678'],
  ['0192784342', null],
  ['01912345678', null],
  ['01312345678', null],
  ['0101', null],
  ['010927843421', null],
  ['0223456789', null],
  ['+1 555 010 2030', null],
  ['+44 7700 900123', null],
  ['1092784342', null],
  ['01O92784342', null],
  ['', null],
];

describe('normalizeEgyptianMobile', () => {
  it.each(EGYPTIAN_MOBILE_CASES)('%j → %j', (input, expected) => {
    expect(normalizeEgyptianMobile(input)).toBe(expected);
  });
});

describe('phoneError', () => {
  it('allows an empty optional field and valid numbers', () => {
    expect(phoneError('')).toBeUndefined();
    expect(phoneError('  ')).toBeUndefined();
    expect(phoneError('0020-109-278-4342')).toBeUndefined();
  });

  it("uses the backend's message for anything else", () => {
    expect(phoneError('0223456789')).toBe(EGYPTIAN_MOBILE_MESSAGE);
  });
});

describe('formatPhone', () => {
  it('groups a stored E.164 mobile for reading', () => {
    expect(formatPhone('+201012345678')).toBe('+20 101 234 5678');
  });

  it('shows anything else as stored, and nothing for no phone', () => {
    expect(formatPhone('+1 555 010 2030')).toBe('+1 555 010 2030');
    expect(formatPhone(null)).toBe('');
  });
});
