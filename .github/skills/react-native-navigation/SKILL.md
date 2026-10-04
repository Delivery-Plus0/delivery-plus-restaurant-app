---
name: react-native-navigation
description: Use when adding screens, structuring navigators, gating routes behind authentication, typing route params, or wiring deep links in the Delivery Plus mobile client.
---

# Navigation — Delivery Plus

No navigation library is chosen yet in this repo (no mobile app exists). This skill describes
the required *behavior*, not a specific library's API — adapt the guidance to whichever
navigation library the first real feature implementation picks, and don't re-litigate that
choice per feature afterward.

## Two top-level navigation states

**Unauthenticated** (no valid stored token):
- Splash/loading (while session restore runs)
- Login
- Register

**Authenticated** (valid stored token):
- Home / restaurant browse
- Restaurant detail / menu
- Cart
- Orders (list + detail)
- Order tracking
- Profile

This maps directly to the backend's actual capabilities (`react-native-api-integration/API-CONTRACT.md`)
— don't add nav destinations for backend capabilities that don't exist (e.g. no
"verify email" screen, no driver/dispatch screens unless that's an explicit requirement).

## Rules

- **Auth state drives the navigator, not vice versa.** A single source of truth (the auth
  session state — see `react-native-state-management/SKILL.md`) decides whether the
  unauthenticated or authenticated navigator is mounted. Don't scatter manual
  `navigation.reset()` calls through login/register screens as the primary mechanism —
  the navigator should react to the session state changing.
- **Session restore blocks navigation, not rendering.** Show a splash/loading state while
  restoring the session; don't flash the login screen before redirecting to home for an
  already-authenticated user.
- **Logout resets navigation** back to the unauthenticated stack and clears any
  authenticated-only screen state so a subsequent login doesn't briefly show stale data.
- **Type route params.** Every screen's params should be a named TypeScript type, not `any`
  or untyped objects — e.g. a restaurant detail screen's `{ restaurantId: string }`.
- **Keep navigation calls out of feature components that don't own the flow.** A
  `RestaurantCard` shouldn't call `navigation.navigate(...)` internally with hardcoded route
  names — pass an `onPress` from the screen that does own that decision, so the card stays
  reusable and testable.
- **Prevent navigation loops**: don't let a protected screen's "not authenticated" fallback
  navigate to a route that itself checks auth and redirects back.
- **Deep linking**: only implement if there's an explicit requirement (e.g. opening a
  specific order from a push notification). Type the deep-link → route mapping explicitly;
  don't accept arbitrary paths without validation.

## Verify before relying on this

Whatever the mobile app's actual chosen navigation library and its own docs say about typed
params and auth-flow patterns for that specific library — this skill is library-agnostic by
design and should be read alongside that library's own conventions.
