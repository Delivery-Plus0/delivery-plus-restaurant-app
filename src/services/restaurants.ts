import { apiGet, apiPatch, apiPost } from '@/services/api';
import type { PresignedUpload } from '@/utils/image-upload';

export type RestaurantStatus = 'OPEN' | 'CLOSED' | 'BUSY' | 'SUSPENDED';

/** The application's review state (backend #208), separate from the operating status. */
export type ApprovalStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type RestaurantReviewSummary = {
  decision: 'APPROVED' | 'REJECTED';
  note: string | null;
  reviewedAt: string;
};

/** The owner's view of their restaurant (`GET /api/restaurants/me`): the public card plus the application. */
export type Restaurant = {
  id: string;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  address: string;
  status: RestaurantStatus;
  latitude?: number | null;
  longitude?: number | null;
  cuisineTags?: string[];
  /** Absent only from a backend older than #208, which had no applications: treat it as approved. */
  approvalStatus?: ApprovalStatus;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvalNote?: string | null;
  legalName?: string | null;
  commercialRegistrationNumber?: string | null;
  taxCardNumber?: string | null;
  contactPhone?: string | null;
  lastReview?: RestaurantReviewSummary | null;
  createdAt?: string;
  updatedAt?: string;
};

/** What the owner fills in on the application (#208). Optional legal details are sent as null to clear them. */
export type RestaurantDetails = {
  name: string;
  description?: string | null;
  address: string;
  latitude?: number;
  longitude?: number;
  legalName?: string | null;
  commercialRegistrationNumber?: string | null;
  taxCardNumber?: string | null;
  contactPhone?: string | null;
  cuisineTags?: string[];
};

export async function fetchMyRestaurants(): Promise<Restaurant[]> {
  return apiGet<Restaurant[]>('/api/restaurants/me', true);
}

/** Creates the owner's restaurant as a draft application (one per owner: 409 RestaurantLimitReached). */
export async function createRestaurant(details: RestaurantDetails): Promise<Restaurant> {
  return apiPost<Restaurant>('/api/restaurants', details, true);
}

/** Saves application details (409 ApplicationNotEditable for fields locked in the current state). */
export async function updateRestaurant(restaurantId: string, details: Partial<RestaurantDetails>): Promise<Restaurant> {
  return apiPatch<Restaurant>(`/api/restaurants/${encodeURIComponent(restaurantId)}`, details, true);
}

/** Sends the application for review, or resubmits a rejected one (422 ApplicationIncomplete with what is missing). */
export async function submitApplication(restaurantId: string): Promise<Restaurant> {
  return apiPost<Restaurant>(`/api/restaurants/${encodeURIComponent(restaurantId)}/submit`, {}, true);
}

export type RestaurantImageType = 'logo' | 'cover';

export async function createRestaurantImageUpload(restaurantId: string, imageType: RestaurantImageType, contentType: string): Promise<PresignedUpload> {
  return apiPost<PresignedUpload>(`/api/restaurants/${encodeURIComponent(restaurantId)}/image-upload-url`, { imageType, contentType }, true);
}

export async function confirmRestaurantImage(restaurantId: string, imageType: RestaurantImageType, objectKey: string): Promise<Restaurant> {
  return apiPost<Restaurant>(`/api/restaurants/${encodeURIComponent(restaurantId)}/image-confirm`, { imageType, objectKey }, true);
}

/** Owner-settable statuses only; SUSPENDED is an admin decision (see OWNER_STATUSES). */
export type OwnerRestaurantStatus = Exclude<RestaurantStatus, 'SUSPENDED'>;

/** Opens, pauses (BUSY) or closes the restaurant. Ownership and approval are checked by restaurant-service. */
export async function updateRestaurantStatus(restaurantId: string, status: OwnerRestaurantStatus): Promise<Restaurant> {
  return apiPatch<Restaurant>(`/api/restaurants/${encodeURIComponent(restaurantId)}/status`, { status }, true);
}
