/** Egyptian mobile networks: 010 Vodafone, 011 Etisalat (e&), 012 Orange, 015 WE. */
const NATIONAL_MOBILE = /^1[0125]\d{8}$/;

/**
 * Normalizes an Egyptian mobile number to E.164 (`+201XXXXXXXXX`), or returns null when it isn't one
 * (#152). Same rules as the backend's shared `normalizeEgyptianMobile()`, which has the source case
 * table; `phone.test.ts` copies it so the app and the API agree on every input.
 */
export function normalizeEgyptianMobile(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const compact = input.trim().replace(/[\s\-.()]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;

  let national: string;
  if (compact.startsWith('+20')) national = compact.slice(3);
  else if (compact.startsWith('0020')) national = compact.slice(4);
  else if (compact.startsWith('+')) return null;
  else if (compact.startsWith('20') && compact.length >= 12) national = compact.slice(2);
  else if (compact.startsWith('0')) national = compact.slice(1);
  else return null;

  if (national.startsWith('0')) national = national.slice(1);
  return NATIONAL_MOBILE.test(national) ? `+20${national}` : null;
}

/** The backend's 400 message for an invalid phone, so both say the same thing. */
export const EGYPTIAN_MOBILE_MESSAGE =
  'Enter an Egyptian mobile number, e.g. 01012345678 or +20 101 234 5678 (Vodafone 010, Etisalat 011, Orange 012, WE 015).';

export const PHONE_HINT = 'Egyptian mobile, e.g. 010 1234 5678';

/** Validation for an optional phone field: empty is fine, anything else must be an Egyptian mobile. */
export function phoneError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return normalizeEgyptianMobile(value) ? undefined : EGYPTIAN_MOBILE_MESSAGE;
}

/** "+20 101 234 5678" for display; anything else is shown as stored. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const match = /^\+20(1\d{2})(\d{3})(\d{4})$/.exec(e164);
  return match ? `+20 ${match[1]} ${match[2]} ${match[3]}` : e164;
}
