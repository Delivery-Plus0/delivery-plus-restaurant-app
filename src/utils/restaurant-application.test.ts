import { describe, expect, it } from 'vitest';

import { ApiError } from '@/services/api';
import type { Restaurant } from '@/services/restaurants';

import {
  approvalStatusOf,
  canEditApplication,
  cuisineTagsFromText,
  describeApplicationError,
  detailsErrors,
  detailsFormOf,
  detailsPayload,
  isApproved,
  missingRequirements,
  parseCoordinate,
} from './restaurant-application';

const restaurant = (overrides: Partial<Restaurant> = {}): Restaurant => ({
  id: 'r1',
  name: 'Cairo Kitchen',
  address: '9 Nile Corniche',
  status: 'CLOSED',
  approvalStatus: 'DRAFT',
  ...overrides,
});

const menu = (categories: number, available: boolean[]) => ({
  categories: Array.from({ length: categories }, (_, index) => ({ id: `c${index}`, restaurantId: 'r1', name: `C${index}` })),
  items: available.map((isAvailable, index) => ({ id: `i${index}`, restaurantId: 'r1', name: `I${index}`, price: '1.00', available: isAvailable })),
});

describe('approval state (#208)', () => {
  it('treats a restaurant from before applications as approved', () => {
    expect(approvalStatusOf({})).toBe('APPROVED');
    expect(isApproved({})).toBe(true);
  });

  it('lets only an approved restaurant open', () => {
    for (const approvalStatus of ['DRAFT', 'SUBMITTED', 'REJECTED'] as const) expect(isApproved({ approvalStatus })).toBe(false);
    expect(isApproved({ approvalStatus: 'APPROVED' })).toBe(true);
  });

  it('lets the owner edit a draft or a rejected application, not one under review or approved', () => {
    expect(canEditApplication({ approvalStatus: 'DRAFT' })).toBe(true);
    expect(canEditApplication({ approvalStatus: 'REJECTED' })).toBe(true);
    expect(canEditApplication({ approvalStatus: 'SUBMITTED' })).toBe(false);
    expect(canEditApplication({ approvalStatus: 'APPROVED' })).toBe(false);
  });
});

describe('missingRequirements', () => {
  it('lists everything the backend asks for, in wizard order', () => {
    expect(missingRequirements(restaurant(), menu(0, []))).toEqual(['legalName', 'contactPhone', 'location', 'menuCategory', 'availableMenuItem']);
  });

  it('asks only for the legal name among the legal details (owner decision)', () => {
    const ready = restaurant({ legalName: 'Cairo Kitchen LLC', contactPhone: '+201012345678', latitude: 30.04, longitude: 31.23 });
    expect(missingRequirements(ready, menu(1, [true]))).toEqual([]);
  });

  it('needs an item customers can order, not just a category or a sold-out item', () => {
    const ready = restaurant({ legalName: 'X LLC', contactPhone: '+201012345678', latitude: 30, longitude: 31 });
    expect(missingRequirements(ready, menu(2, [false]))).toEqual(['availableMenuItem']);
    expect(missingRequirements(ready, undefined)).toEqual(['menuCategory', 'availableMenuItem']);
  });

  it('accepts a location at 0,0 but not a missing one', () => {
    expect(missingRequirements(restaurant({ legalName: 'X', contactPhone: '+201012345678', latitude: 0, longitude: 0 }), menu(1, [true]))).toEqual([]);
    expect(missingRequirements(restaurant({ legalName: 'X', contactPhone: '+201012345678', latitude: 30, longitude: null }), menu(1, [true]))).toEqual(['location']);
  });
});

describe('form helpers', () => {
  it('parses typed coordinates within range, with a dot or a comma', () => {
    expect(parseCoordinate('30.0444', 'latitude')).toBe(30.0444);
    expect(parseCoordinate(' 31,2357 ', 'longitude')).toBe(31.2357);
    expect(parseCoordinate('-91', 'latitude')).toBeNull();
    expect(parseCoordinate('181', 'longitude')).toBeNull();
    expect(parseCoordinate('abc', 'latitude')).toBeNull();
    expect(parseCoordinate('', 'latitude')).toBeNull();
  });

  it('splits cuisine labels on Latin and Arabic commas, drops duplicates and keeps five', () => {
    expect(cuisineTagsFromText('Burgers, fries ،Burgers, , Shakes')).toEqual(['Burgers', 'fries', 'Shakes']);
    expect(cuisineTagsFromText('a1,b2,c3,d4,e5,f6')).toHaveLength(5);
  });

  it('checks the details like the backend does', () => {
    const form = { ...detailsFormOf(null), name: 'K' , contactPhone: '0223456789', taxCardNumber: '12#3', cuisineTags: 'x' };
    expect(Object.keys(detailsErrors(form)).sort()).toEqual(['contactPhone', 'cuisineTags', 'name', 'taxCardNumber']);
    expect(detailsErrors({ ...detailsFormOf(null), name: 'Cairo Kitchen' })).toEqual({});
  });

  it('sends the phone in E.164 and clears blank optional details', () => {
    const payload = detailsPayload({ ...detailsFormOf(null), name: ' Cairo Kitchen ', legalName: ' ', contactPhone: '010 1234 5678', cuisineTags: 'Grill' });
    expect(payload).toEqual({
      name: 'Cairo Kitchen',
      legalName: null,
      commercialRegistrationNumber: null,
      taxCardNumber: null,
      contactPhone: '+201012345678',
      cuisineTags: ['Grill'],
      description: null,
    });
  });

  it('fills the form from the saved application', () => {
    const form = detailsFormOf(restaurant({ legalName: 'Cairo Kitchen LLC', cuisineTags: ['Grill', 'Koshari'], contactPhone: '+201012345678' }));
    expect(form).toMatchObject({ name: 'Cairo Kitchen', legalName: 'Cairo Kitchen LLC', cuisineTags: 'Grill, Koshari', contactPhone: '+201012345678' });
  });
});

describe('describeApplicationError', () => {
  it('explains the application errors and keeps other messages', () => {
    expect(describeApplicationError(new ApiError(409, 'RestaurantNotApproved', 'raw'), 'fallback')).toMatch(/once it is approved/);
    expect(describeApplicationError(new ApiError(409, 'RestaurantLimitReached', 'raw'), 'fallback')).toMatch(/already has a restaurant/);
    expect(describeApplicationError(new ApiError(400, 'BadRequest', 'Server says no'), 'fallback')).toBe('Server says no');
    expect(describeApplicationError(new Error(''), 'fallback')).toBe('fallback');
  });
});
