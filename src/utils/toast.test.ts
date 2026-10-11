import { describe, expect, it } from 'vitest';

import { toastDurationMs } from './toast';

describe('toastDurationMs', () => {
  it('keeps short messages up for 4 s', () => {
    expect(toastDurationMs('Saved.')).toBe(4_000);
  });

  it('gives longer messages more reading time, up to 8 s', () => {
    expect(toastDurationMs('x'.repeat(100))).toBe(6_000);
    expect(toastDurationMs('x'.repeat(500))).toBe(8_000);
  });

  it('ignores surrounding whitespace', () => {
    expect(toastDurationMs(`   ${'x'.repeat(100)}   `)).toBe(6_000);
  });
});
