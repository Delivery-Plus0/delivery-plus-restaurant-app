# Shared UI kit

The customer, driver and restaurant apps share one UI kit (#155): theme, buttons, cards, inputs, alerts, state views, sheet, dialog, toast, and the API, cache, money, phone and image-upload helpers. The files listed in `scripts/kit.mjs` are **byte-identical in all three apps**. Line endings are ignored, so Windows and CI checkouts agree.

## Keeping it identical

- `npm run kit:check` checks that the kit files match `kit-manifest.json`. CI runs `npm run kit:check -- --remote`, which also compares the manifest with the canonical one in the public backend repo (`clients/kit-manifest.json` on `dev`). That way a change in one app can't silently drift from the other two.
- To change a kit file:
  1. Edit it in one app.
  2. Run `npm run kit:update` there.
  3. Copy the kit to the other two apps with `npm run kit:sync -- ../delivery-plus-<app>-app`.
  4. Update `clients/kit-manifest.json` in the backend repo first, then open the three app PRs.
- App-specific UI belongs in `src/components/`, outside `ui/`. Don't add one-app files to the kit.

## Which component to use

| Situation | Use | Example |
| --- | --- | --- |
| A quick confirmation that something worked; nothing to do next | **Toast** (`ui/toast.tsx`). It hides after 4 to 8 s, depending on the message length, and can be tapped away | "Order 1A2B is now In kitchen." |
| A problem or state the user should see while staying on the screen | **InlineAlert** next to what it is about | a failed save, a stale list, "Payment declined" |
| A yes/no decision, especially a destructive one | **Dialog** (`ui/dialog.tsx`). Every button has an id, and the backdrop or the back button cancels | "Cancel this order?", "Sign out?" |
| A short task with a few inputs or choices, keeping the screen behind it | **Sheet** (`ui/sheet.tsx`) | edit a menu item, reject with a reason, verify a phone |
| A long or multi-step task, or something worth a link | a **screen** (route) | checkout, order detail |
| Loading, empty or failed content | **SkeletonList**, **StateView** / **ErrorState** | the first load of a list, "No orders yet", a retryable error |

Don't use the native `Alert` or `window.confirm` for decisions. They look different on each platform, and screen readers and E2E flows can't reach their buttons.

## Accessibility and RTL

- Dialogs and sheets are modal (`accessibilityViewIsModal`) and close with the system back button. Toasts are announced (live region, plus `announceForAccessibility` on native).
- Give every interactive element a `testID`. The kit mirrors it to `nativeID`, so web flows find it as well.
- Lay out with `start`/`end` (and `paddingHorizontal`/`gap`), never `left`/`right`, so the kit works right-to-left for Arabic (#151).
- Directional icons (`back`, `chevronRight`) mirror themselves in Arabic: `Icon` flips them when the layout is right to left. Don't flip them yourself. A new icon that points along the reading direction belongs in `DIRECTIONAL` in `ui/icon.tsx`.
- Tab bars use `TabBar.style` and `TabBar.labelStyle` from `constants/theme.ts`, which leave room for the whole label on the web.

## Counted nouns

Use `tn(count, '{count} order', '{count} orders')`, never `count === 1 ? 'order' : 'orders'` or two `t()` texts chosen by the count. Arabic has six plural forms, including a dual ("طلبان").

- Add the six Arabic forms to `appArabicPlurals` in `src/i18n/ar.ts`, keyed by the English plural: `zero` (0), `one` (1), `two` (2), `few` (3–10), `many` (11–99), `other` (100+).
- The coverage test fails when a `tn()` text is missing a form, or when the code builds a counted noun from pieces.
- To show a formatted number, pass it as `count`: `tn(n, '{count} order', '{count} orders', { count: formatted })`.

## Sessions

Signing in returns an access token (a JWT that lasts 15 minutes) and a single-use refresh token (backend #34). `services/session.ts` keeps both: in `expo-secure-store` on native, and in `localStorage` on the web, where the backend sends no cookie.

- **Signing in:** call `setSession(accessToken, refreshToken)` with what login (or register) returned.
- **An expired access token:** the API client handles it, so screens don't. A `401` on an authenticated call runs `refreshSession()` and replays the call once with the new token.
  - Concurrent `401`s share one refresh. The refresh token works only once, and sending it twice would end the session as stolen.
  - Offline, a `429` or a `5xx` keeps the session; the call fails as usual and the next one tries again.
  - A refused refresh, or a second `401` after the replay, ends the session with `ended: 'expired'`.
- **A suspended account:** a `403 AccountSuspended` (sign-in, refresh or any call, backend #202) ends the session with `ended: 'suspended'`.
- **Why it ended:** while `ended` is set, the root layout covers the app with `SessionEndedScreen` ("You have been signed out" or "Your account is suspended"). Its button calls `acknowledgeSessionEnded()`, and the signed-out screens show. A new sign-in clears `ended`.
- **Signing out:** call `signOut()` from `services/api.ts`, not `clearSession()`. It ends the session on the server (`POST /api/auth/logout`), then forgets both tokens, even when offline.
- **Long-lived connections** (Server-Sent Events) don't go through the API client. On a `401` they call `refreshSession()` themselves and connect again with the new token.
