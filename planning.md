# Restaurant Dashboard Plan

## Goal

Replace the restaurant API stand-in with an owner-facing browser client. The MVP is a desktop-first, responsive order desk; native Android and iOS are out of scope.

## MVP status

- [x] Private `delivery-plus-restaurant-app` repository with default branch `dev`.
- [x] TypeScript + Expo Router web app, owner sign-in, and owner-scoped restaurant selector.
- [x] Polling order board with `Start preparing` and `Ready for pickup` actions.
- [x] Unit tests, CI/security workflows, and Maestro web E2E setup.
- [ ] Replace the restaurant API actions in the customer business E2E with this client.

## Backend contract

The app calls the Delivery Plus Gateway only. Payment owns `CONFIRMED`; restaurant owners advance an order from `CONFIRMED` to `PREPARING` and then `READY_FOR_PICKUP`. The backend validates both role and restaurant ownership. `READY_FOR_PICKUP` triggers automatic dispatch.

The owner-scoped order-list response includes the order-item snapshots, so the dashboard renders order details inline; it does not make a separate `GET /api/orders/:id` request. That backend detail route also checks ownership. Cancellation is not offered in this kitchen MVP; `CANCELLED` is displayed read-only when returned. The board requests page 1 with a limit of 50 and does not yet navigate additional pages.

## Pre-commit Verification

The local web export, typecheck, lint, unit tests, and browser layout/transition checks passed on 2026-10-04. A browser-only intercepted fixture was used for visual and interaction checks; it is not a real-backend test.

The real-backend Maestro suite was **not run**: WSL reports `docker` unavailable because Docker Desktop integration is not enabled, and the Windows Docker CLI cannot connect to `npipe:////./pipe/dockerDesktopLinuxEngine` because that pipe is absent. No backend E2E volumes were reset or substituted with mocks.

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

1. Run the app against the isolated backend E2E stack and verify the seeded order lifecycle in Maestro.
2. Integrate this client into the cross-app business flow, removing the restaurant API stand-in.
3. Consider item availability and restaurant availability as a separately scoped follow-up.