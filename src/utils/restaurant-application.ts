import type { BadgeTone } from '@/components/ui/badge';
import { ApiError } from '@/services/api';
import type { MenuResponse } from '@/services/menus';
import type { ApprovalStatus, Restaurant } from '@/services/restaurants';
import { normalizeEgyptianMobile } from '@/utils/phone';
import { t } from '@/i18n/core';

/** The steps of the onboarding wizard (#28), in order. */
export const APPLICATION_STEPS = ['details', 'location', 'photos', 'menu', 'review'] as const;
export type ApplicationStep = (typeof APPLICATION_STEPS)[number];

export const STEP_TITLES: Record<ApplicationStep, string> = {
  get details() { return t('Business details'); },
  get location() { return t('Location'); },
  get photos() { return t('Logo and cover'); },
  get menu() { return t('Menu'); },
  get review() { return t('Review and submit'); },
};

/** The application's state; a backend older than #208 had no applications, so its restaurants count as approved. */
export function approvalStatusOf(restaurant: Pick<Restaurant, 'approvalStatus'>): ApprovalStatus {
  return restaurant.approvalStatus ?? 'APPROVED';
}

/** Only an approved restaurant can open, pause or take orders (backend #208). */
export function isApproved(restaurant: Pick<Restaurant, 'approvalStatus'>): boolean {
  return approvalStatusOf(restaurant) === 'APPROVED';
}

/** The owner can change the application and submit it: a draft, or a rejected one to resubmit. */
export function canEditApplication(restaurant: Pick<Restaurant, 'approvalStatus'>): boolean {
  const status = approvalStatusOf(restaurant);
  return status === 'DRAFT' || status === 'REJECTED';
}

export const APPROVAL_META: Record<ApprovalStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { get label() { return t('Draft'); }, tone: 'neutral' },
  SUBMITTED: { get label() { return t('Under review'); }, tone: 'warning' },
  APPROVED: { get label() { return t('Approved'); }, tone: 'success' },
  REJECTED: { get label() { return t('Changes needed'); }, tone: 'danger' },
};

export type Requirement = 'legalName' | 'contactPhone' | 'location' | 'menuCategory' | 'availableMenuItem';

/** Where each requirement is filled in, and how the review step names it. Mirrors the backend's submit check. */
export const REQUIREMENTS: Record<Requirement, { step: ApplicationStep; label: string }> = {
  legalName: { step: 'details', get label() { return t('The legal name of the business'); } },
  contactPhone: { step: 'details', get label() { return t('A contact phone'); } },
  location: { step: 'location', get label() { return t('The location on the map'); } },
  menuCategory: { step: 'menu', get label() { return t('At least one menu category'); } },
  availableMenuItem: { step: 'menu', get label() { return t('At least one available menu item'); } },
};

/** What still stops a submit, in wizard order. The backend checks the same again. */
export function missingRequirements(
  restaurant: Pick<Restaurant, 'legalName' | 'contactPhone' | 'latitude' | 'longitude'>,
  menu: Pick<MenuResponse, 'categories' | 'items'> | undefined,
): Requirement[] {
  const missing: Requirement[] = [];
  if (!restaurant.legalName?.trim()) missing.push('legalName');
  if (!restaurant.contactPhone) missing.push('contactPhone');
  if (!hasLocation(restaurant)) missing.push('location');
  if (!menu?.categories.length) missing.push('menuCategory');
  if (!menu?.items.some((item) => item.available)) missing.push('availableMenuItem');
  return missing;
}

export function hasLocation(restaurant: Pick<Restaurant, 'latitude' | 'longitude'>): boolean {
  return typeof restaurant.latitude === 'number' && typeof restaurant.longitude === 'number';
}

/** A coordinate typed by hand: a finite number within range, or null. Accepts a comma as decimal separator. */
export function parseCoordinate(value: string, kind: 'latitude' | 'longitude'): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!/^-?\d{1,3}(\.\d+)?$/.test(trimmed)) return null;
  const number = Number(trimmed);
  const limit = kind === 'latitude' ? 90 : 180;
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

/** "Burgers, Fries" → ["Burgers", "Fries"]: trimmed, duplicates dropped, at most 5 (the backend's limit). */
export function cuisineTagsFromText(text: string): string[] {
  const tags: string[] = [];
  for (const raw of text.split(/[,،]/)) {
    const tag = raw.trim();
    if (tag && !tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  return tags.slice(0, 5);
}

export type DetailsForm = {
  name: string;
  legalName: string;
  commercialRegistrationNumber: string;
  taxCardNumber: string;
  contactPhone: string;
  cuisineTags: string;
  description: string;
};

export type DetailsErrors = Partial<Record<keyof DetailsForm, string>>;

const REGISTRATION_NUMBER = /^[0-9A-Za-z][0-9A-Za-z/ -]{0,49}$/;

/** Field checks for the details step, the same rules as restaurant-service's DTO. */
export function detailsErrors(form: DetailsForm): DetailsErrors {
  const errors: DetailsErrors = {};
  if (form.name.trim().length < 2) errors.name = t('Enter the restaurant name customers will see');
  if (form.legalName.trim() && form.legalName.trim().length < 2) errors.legalName = t('Enter the full legal name');
  for (const field of ['commercialRegistrationNumber', 'taxCardNumber'] as const) {
    if (form[field].trim() && !REGISTRATION_NUMBER.test(form[field].trim())) errors[field] = t('Use only letters, digits, spaces, "-" and "/"');
  }
  if (form.contactPhone.trim() && !normalizeEgyptianMobile(form.contactPhone)) errors.contactPhone = t('Enter an Egyptian mobile number, e.g. 010 1234 5678');
  const tags = form.cuisineTags.split(/[,،]/).map((tag) => tag.trim()).filter(Boolean);
  if (tags.some((tag) => tag.length < 2 || tag.length > 30)) errors.cuisineTags = t('Each cuisine label needs 2 to 30 characters');
  return errors;
}

export function detailsFormOf(restaurant: Restaurant | null): DetailsForm {
  return {
    name: restaurant?.name ?? '',
    legalName: restaurant?.legalName ?? '',
    commercialRegistrationNumber: restaurant?.commercialRegistrationNumber ?? '',
    taxCardNumber: restaurant?.taxCardNumber ?? '',
    contactPhone: restaurant?.contactPhone ?? '',
    cuisineTags: (restaurant?.cuisineTags ?? []).join(', '),
    description: restaurant?.description ?? '',
  };
}

/** The details step as the API wants it: trimmed, the phone in E.164, blank optional fields cleared. */
export function detailsPayload(form: DetailsForm) {
  const optional = (value: string) => (value.trim() ? value.trim() : null);
  return {
    name: form.name.trim(),
    legalName: optional(form.legalName),
    commercialRegistrationNumber: optional(form.commercialRegistrationNumber),
    taxCardNumber: optional(form.taxCardNumber),
    contactPhone: form.contactPhone.trim() ? normalizeEgyptianMobile(form.contactPhone) : null,
    cuisineTags: cuisineTagsFromText(form.cuisineTags),
    description: form.description.trim() ? form.description.trim() : null,
  };
}

/** A readable message for the backend's application errors; anything else keeps its own message. */
export function describeApplicationError(caught: unknown, fallback: string): string {
  if (!(caught instanceof ApiError)) return caught instanceof Error && caught.message ? caught.message : fallback;
  switch (caught.error) {
    case 'RestaurantNotApproved':
      return t('Your restaurant can open once it is approved. Finish and submit your application first.');
    case 'RestaurantLimitReached':
      return t('This account already has a restaurant. Contact support to add another branch.');
    case 'ApplicationNotEditable':
      return t('These details are locked while your application is under review. Contact support to change them after approval.');
    case 'ApplicationIncomplete':
      return t('Some required details are still missing. Check the list below.');
    default:
      return caught.message || fallback;
  }
}
