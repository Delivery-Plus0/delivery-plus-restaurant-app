# Restaurant Dashboard Plan

## Goal

Replace the restaurant API stand-in with an owner-facing browser client. The MVP is a desktop-first, responsive order desk; native Android and iOS are out of scope.

## MVP status

- [x] Private `delivery-plus-restaurant-app` repository with default branch `dev`.
- [x] TypeScript + Expo Router web app, owner sign-in, and owner-scoped restaurant selector.
- [x] Polling order board with `Start preparing` and `Ready for pickup` actions.
- [x] Unit tests, CI/security workflows, and Maestro web E2E setup.
- [x] Same architecture and design system as the customer and driver apps: `(auth)`/`(app)` route groups with an owner-role guard, shared UI kit (`Screen`/`ScreenHeader`, `Card`, `Badge`, `StateView`/`ErrorState`, `SkeletonList`), `useResource` cache + polling, `formatMoney`/`confirm`.
- [x] Maestro smoke + business suites pass against the real isolated backend (runtime-created orders; web :8085, control :8092).
- [x] Menu tab: restaurant status (Open/Busy/Closed; locked while SUSPENDED) and item availability (sold out / available), with unit tests and a Maestro smoke flow.
- [x] The customer business E2E uses this app instead of the restaurant API stand-in (customer-app #20).

## Backend contract

The app calls the Delivery Plus Gateway only. Payment owns `CONFIRMED`; restaurant owners advance an order from `CONFIRMED` to `PREPARING` and then `READY_FOR_PICKUP`. The backend validates both role and restaurant ownership. `READY_FOR_PICKUP` triggers automatic dispatch.

The owner-scoped order-list response includes the order-item snapshots, so the dashboard renders order details inline; it does not make a separate `GET /api/orders/:id` request. That backend detail route also checks ownership. Cancellation is not offered in this kitchen MVP; `CANCELLED` is displayed read-only when returned. The board requests page 1 with a limit of 50 and does not yet navigate additional pages.

## Verification (2026-10-04)

| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` (0 warnings), `npm test` | Pass; 32 unit tests (order-status rules, restaurant selection, shared cache/format/session/API) |
| Web export | Pass (part of the Maestro `--build`) |
| Fresh isolated stack: backend `dev` + #124 (CORS :8085), `docker compose … down -v && up --build`, `seed:e2e` | Healthy, seeded |
| `node e2e/scripts/run.mjs --suite all --build --headless` | **2/2 passed**: smoke (owner sees a new paid order with total and action) and business (start preparing → ready for pickup → automatic dispatch created the delivery) |
| Menu tab (2026-10-04): typecheck, lint, `npm test`; `run.mjs --suite all --build --headless` on the same stack | Pass; **39** unit tests (new: owner statuses, menu grouping, menu/status API calls). **3/3 flows passed**: orders smoke, availability smoke (QA Fries sold out and back; QA Kitchen Busy and Open, both checked on the public reads), business. Afterwards QA Kitchen OPEN, only QA Soup sold out, QA driver AVAILABLE with no delivery |

The first runs failed and found real problems, all fixed: `_shared/login.yaml` indentation (`Unknown Property: id`); the board opened the owner's first restaurant even when it was closed (now the first OPEN/BUSY one); orders left behind by earlier runs pushed the new order below the fold (fixture now cancels leftover non-seeded kitchen orders before and after the suite).

## Dependency Audit

`npm audit` on 2026-10-04 reported 30 vulnerable package nodes: 19 high, 11 moderate, 0 critical. These are package nodes in four underlying advisories, not 30 distinct advisories. `npm audit --omit=dev` reported the same counts because Expo and React Native are root production dependencies; the static web export does not ship Node's Expo CLI/Metro toolchain.

Underlying advisories and fix assessment:

| Advisory | Current path/version | Disposition |
| --- | --- | --- |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), high: nested-pattern stack exhaustion | `braces@3.0.3` → `micromatch@4.0.8` → Expo/Metro file maps | Metro build tooling; registry latest remains 3.0.3, so no fixed compatible release is available. |
| [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), high: RSA signature verification | `node-forge@1.4.0` → Expo code-signing/config tooling | Build/native configuration path; registry latest remains 1.4.0, so no fixed compatible release is available. |
| [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), moderate: malformed URI decoding DoS | `expo-router@57.0.23` → `query-string@7.1.3` → `decode-uri-component@0.2.2` | Expo Router path parsing imports `query-string`, so this can affect browser URL parsing. Registry `decode-uri-component@0.5.0` is outside the parent's `^0.2.2` range; overriding across that 0.x boundary is unverified. Track for the coordinated Expo SDK/router upgrade. |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), moderate: UUID buffer bounds check | `xcode@3.0.1` → `uuid@7.0.3` → Expo config plugins | Native build/config tooling; fixed UUID starts at 11.1.1, outside xcode's `^7.0.3` range. A major override is not justified. |

Affected package-node counts are high: `@expo/cli`, `@expo/code-signing-certificates`, `@expo/metro`, `@expo/metro-config`, `@expo/metro-file-map`, `@react-native/community-cli-plugin`, `@react-native/metro-config`, `@react-native/virtualized-lists`, `braces`, `expo`, `metro`, `metro-config`, `metro-file-map`, `metro-transform-worker`, `micromatch`, `node-forge`, `react-native`, `react-native-reanimated`, `react-native-worklets`; moderate: `@expo/config`, `@expo/config-plugins`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `@expo/prebuild-config`, `decode-uri-component`, `expo-router`, `expo-splash-screen`, `query-string`, `uuid`, `xcode`.

`npm audit fix --dry-run` offered Expo SDK 57 patch updates but left the 30-node audit count unchanged. Its forced alternatives downgrade Expo to 44 or move Expo Router to 58, so no dependency or override changes were made. The existing CI gate blocks critical advisories and reports high advisories; the toolchain findings remain a documented pre-production dependency-upgrade task, with the router query-decoding advisory the client-relevant exception.

## Next

1. Menu editing (prices, new items, images via the existing S3 upload flow) and opening hours, as separately scoped follow-ups.
2. Push or SSE for new orders instead of the 10 s poll (Phase 6/7, with the backend).
3. Backend #125: owners must not be able to set or lift `SUSPENDED` through the API.
