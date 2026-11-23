import { describe, expect, it } from 'vitest';

import { parseFixedLocation } from './fixed-location';

describe('parseFixedLocation', () => {
  it('reads "lat,lng", with or without spaces', () => {
    expect(parseFixedLocation('31.2001,29.9187')).toEqual([31.2001, 29.9187]);
    expect(parseFixedLocation(' 30.0444 , 31.2357 ')).toEqual([30.0444, 31.2357]);
  });

  it('is null when unset, malformed or out of range, so the map keeps its default', () => {
    expect(parseFixedLocation(undefined)).toBeNull();
    expect(parseFixedLocation('')).toBeNull();
    expect(parseFixedLocation('30.04')).toBeNull();
    expect(parseFixedLocation('30.04,31.23,5')).toBeNull();
    expect(parseFixedLocation('north,east')).toBeNull();
    expect(parseFixedLocation('91,31')).toBeNull();
    expect(parseFixedLocation('30,181')).toBeNull();
  });
});
