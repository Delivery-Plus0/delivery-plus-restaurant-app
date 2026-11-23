/**
 * Development builds only: `EXPO_PUBLIC_FIXED_LOCATION="lat,lng"` (as in the customer and driver apps).
 * The location map opens there before the owner drops a pin. Null when unset, malformed or out of range.
 */
export function parseFixedLocation(value: string | undefined): [latitude: number, longitude: number] | null {
  const parts = value?.split(',').map((part) => Number(part.trim()));
  if (parts?.length !== 2 || !parts.every(Number.isFinite)) return null;
  const [latitude, longitude] = parts;
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? [latitude, longitude] : null;
}
