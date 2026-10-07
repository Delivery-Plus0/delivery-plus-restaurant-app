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
