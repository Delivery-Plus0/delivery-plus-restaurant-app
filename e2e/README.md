# Customer app — UI / E2E tests (Maestro)

Real UI automation: Maestro drives the app's own screens; nothing is mocked. The backend is the
isolated E2E stack from the `delivery-plus` repo with deterministic seed data. The cross-app flows
also drive the real **driver app** (`delivery-plus-driver-app`) in the same browser.

```text
seed:e2e (deterministic data) → E2E stack (gateway :3100, own DB/Redis/Kafka/S3 volumes)
  → customer app web build (EXPO_PUBLIC_API_BASE_URL=http://localhost:3100) served on :8083
  → driver app web build (same API, fixed position) served on :8084   [cross-app flows only]
  → Maestro (Chromium) → UI actions + assertions → JUnit + screenshots in e2e/.artifacts/
```

## Run locally

Prerequisites: Docker, Node 20.19+/22, Java 17+, and the Maestro CLI (`maestro --version`, 2.11+).
For the cross-app flows, the driver app cloned next to this repo with its dependencies installed
(`../delivery-plus-driver-app`, `npm ci`), or `DRIVER_APP_DIR` pointing at it.

```bash
# 1. Backend E2E environment (in ../delivery-plus)
npm run e2e:env:up        # docker compose -p delivery-plus-e2e … (fresh, isolated volumes)
npm run seed:e2e          # writes ../delivery-plus/e2e-seed-manifest.json
# or all three steps from scratch: npm run e2e:env:reset

# 2. UI tests (in this repo)
npm run e2e:smoke -- --build            # --build re-exports the web app against :3100
npm run e2e:all -- --headless           # smoke + regression + business
```

`--build` re-exports both web apps (the driver app only when a cross-app flow is in the suite).
It always exports with `--clear`: a warm Metro cache can keep a previously inlined
`EXPO_PUBLIC_API_BASE_URL` and silently point the build at the dev gateway.

Tear down with `npm run e2e:env:down` (in `delivery-plus`; removes the E2E volumes).

## Suites

| Suite | Flows | Runs in CI |
| --- | --- | --- |
| `smoke` | login → Home · search → restaurant → menu · add → change quantity → total · cart → checkout → order | every PR |
| `regression` | **cross-app:** the driver goes offline in the driver app, a ready order waits ("Finding a driver"), the driver goes online in the driver app and the customer sees "Driver assigned" · declined payment shows Failed · another customer's order is refused · gateway outage shows offline state and recovers without losing the session | nightly / manual |
| `business` | **cross-app** full cycle: customer orders in the customer app → restaurant prepares/readies (stand-in) → automatic dispatch waits until the driver goes online **in the driver app** → driver app shows the job (pickup, drop-off, items) and shares its location → customer sees "Driver assigned" and the location is in the customer's tracking view → driver app: picked up, start, delivered, each seen in the customer app → Delivered → integrity check (one delivery, no new dead letters) → confirmation notification | nightly / manual |

## Test data (from `npm run seed:e2e`)

| Account | Role | Use |
| --- | --- | --- |
| `qa.customer@delivery-plus.test` | CUSTOMER | signs in to the app in every flow |
| `qa.customer2@delivery-plus.test` | CUSTOMER | owns the order the QA customer must not see |
| `qa.restaurant@delivery-plus.test` | RESTAURANT_OWNER | owns QA Kitchen (OPEN) and QA Night Cafe (CLOSED) |
| `qa.driver@delivery-plus.test` | DRIVER | signs in to the **driver app** in the cross-app flows |

Password: `E2E_PASSWORD` (test-only default `Qa-Only-Passw0rd!`; the seed refuses non-localhost
targets unless `E2E_ALLOW_REMOTE=1`). Menu (QA Kitchen): QA Burger $10.00, QA Pasta $12.50, QA Fries
$4.00, QA Soup (sold out), QA Lemonade $3.00. Seeded orders: S1 delivered, S2 payment declined,
S4 confirmed for the other customer. There is no seeded "waiting for a driver" order: with automatic
dispatch it would be assigned as soon as the driver is free, so the regression flow creates it at runtime
(driver app: go offline → `scenario/order-ready` → driver app: go online). Payments always succeed
in the E2E stack (`PAYMENT_SUCCESS_RATE=1`) so UI checkout is deterministic.

## How flows interact with things the app can't do

### The driver: the real driver app

The cross-app flows switch between the two apps with `openLink` (`${APP_URL}` ↔ `${DRIVER_APP_URL}`);
each origin keeps its own session. Shared steps: `_shared/driver-app-sign-in.yaml`,
`driver-app-go-offline.yaml`, `driver-app-deliver.yaml`. The driver goes offline/online, finds the
job (`GET /api/deliveries/me/current`, polled by the app), shares its location and picks up, starts
and completes **only through the driver app's buttons**. Nothing creates or assigns a delivery:
delivery-service dispatches on `order.ready_for_pickup`.

The driver app's web build reports a fixed position (`EXPO_PUBLIC_FIXED_LOCATION=30.0444,31.2357`)
because Maestro's web driver can't grant or fake geolocation.

### Control server

`e2e/scripts/run.mjs` hosts a small control server on `:8090`. Flows call it with
`runScript: ../../scripts/control.js` to:

- act as the **restaurant** (`restaurant/prepare`, `restaurant/ready`) through the real gateway. This
  is the last stand-in: no restaurant client exists yet (#100).
- set up a ready order through the API as customer + restaurant (`scenario/order-ready`).
- **verify** server-side state, read-only: `tracking/assert-location` (the customer's
  `GET /api/tracking/delivery/:id` returns the driver app's position; the customer app has no map
  yet) and `verify/order-integrity` (order and delivery DELIVERED, exactly one delivery row for the
  order, no new messages in any `*.dlq` topic since the suite started).
- stop/start the E2E gateway container (offline-recovery flow).

Fixtures (runner, not flow steps): before and after a suite with cross-app flows, the runner puts
the QA driver back in the seed's state (finishes a delivery a failed run left behind, then online),
so one failed run doesn't break the next. Between flows it clears `ratelimit:*` keys in the E2E
Redis only, so repeated sign-ins don't hit the 5/min login limit.

### CI

The driver app is a private repo, which `GITHUB_TOKEN` can't read. The workflow checks it out with
the secret `DRIVER_APP_READ_TOKEN` (fine-grained, Contents: read on `delivery-plus-driver-app`).
Without the secret, the cross-app flows are **skipped with a warning** (`E2E_SKIP_CROSS_APP=1`); PR
smoke doesn't need it.

## Selectors

Controls carry `testID` and `nativeID` with the same value (see the shared UI components). Maestro's
`id:` matches `testID` on Android/iOS and the HTML `id` on web (react-native-web renders
`nativeID` as `id`; `testID` becomes `data-testid`, which Maestro's web driver ranks below
`aria-label`). Text selectors are regular expressions: escape `$`, `.`, `?`.

## Adding a flow

1. Put it under `flows/<suite>/`, start with `runFlow: ../_shared/login.yaml`.
2. Prefer `id:` selectors; add a `testID` (+ `nativeID`) to the component if needed.
3. Scroll with `scrollUntilVisible` before asserting on anything below the fold (the test viewport is
   ~1000×616), especially before `assertNotVisible`.
4. Register it in `SUITES` in `scripts/run.mjs`.

## Not covered yet

- Android emulator / iOS simulator runs: the flows use platform-neutral `id:` selectors, but the
  runner, CI job and deep-link handling (`openLink` to `customermobile://…`) are web-only today.
- Restaurant UI: no client yet (#100), so prepare/ready stay API stand-ins.
- Driver location in the customer UI: the customer app has no map yet (Phase 7); the location is
  checked through the customer's tracking endpoint.
