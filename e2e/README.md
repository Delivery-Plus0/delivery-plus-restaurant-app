# Restaurant app — UI / E2E tests (Maestro)

Real UI automation: Maestro drives the app's own screens in Chromium; nothing is mocked. The backend
is the isolated E2E stack from the `delivery-plus` repo with deterministic seed data, shared with the
customer and driver app suites.

```text
seed:e2e (deterministic data) → E2E stack (gateway :3100, own DB/Redis/Kafka/S3 volumes)
  → app web build (EXPO_PUBLIC_API_BASE_URL=http://localhost:3100) served on :8085
  → Maestro (Chromium, 1280×1400) → UI actions + assertions → JUnit + screenshots in e2e/.artifacts/
```

Ports differ from the customer (web 8083, control 8090) and driver (8084, 8091) runners so all three
suites can run on one machine. The gateway allows browser requests from 8085 in development
(delivery-plus #124).

## Run locally

Prerequisites: Docker, Node 22, Java 17+, and the Maestro CLI (`maestro --version`, 2.11+).

```bash
# 1. Backend E2E environment (in ../delivery-plus)
npm run e2e:env:reset     # down → up (fresh volumes) → seed:e2e

# 2. UI tests (in this repo)
npm run e2e:smoke -- --build --headless
npm run e2e:all -- --headless
```

`--build` always exports with `--clear`: a warm Metro cache can keep a previously inlined
`EXPO_PUBLIC_API_BASE_URL`. The suites can be re-run without a reset: every flow creates its own order.

## Suites

| Suite | Flows | Runs in CI |
| --- | --- | --- |
| `smoke` | owner signs in → QA Kitchen (open) is shown → a new paid order is in "New orders" with its total and the *Start preparing* action · Menu tab: QA Fries → *Sold out* (checked on the public menu) → back; restaurant → *Busy* (checked on the public restaurant) → *Open* | every PR |
| `business` | no driver free → a new paid order → *Start preparing* → "In kitchen" → *Ready for pickup* → "Ready for pickup" (no further action) → automatic dispatch created the delivery | nightly / manual |

## Test data (from `npm run seed:e2e`)

| Account | Role | Use |
| --- | --- | --- |
| `qa.restaurant@delivery-plus.test` | RESTAURANT_OWNER | signs in to the app; owns QA Kitchen (OPEN) and QA Night Cafe (CLOSED) |
| `qa.customer@delivery-plus.test` | CUSTOMER | places the orders (stand-in) |
| `qa.driver@delivery-plus.test` | DRIVER | taken offline by the business-flow fixture, restored afterwards |

Seeded orders (S1–S4) are never modified: the customer app's flows rely on them.

## How flows interact with things the app can't do

`e2e/scripts/run.mjs` hosts a small control server on `:8092`. Flows call it with
`runScript: ../../scripts/control.js` to:

- `scenario/order-confirmed`: act as the **customer** (cart → order → payment) through the real
  gateway, so a fresh CONFIRMED order reaches the board. The customer app covers this in its own suite.
- `driver/offline` (fixture): no driver is free, so a ready order stays "Ready for pickup" while the
  flow checks the board instead of moving on within a second.
- `order/assert-dispatched` (verification, read-only as the customer): the order is ready and
  delivery-service created its delivery. Nothing creates or assigns a delivery.

- `verify/fries-sold-out`, `verify/kitchen-busy` (read-only, public reads): the owner's availability changes reached the server.

After the suite the runner puts QA Kitchen back to OPEN with the seed's availability (QA Soup sold out, all else available), and the QA driver back as the seed left it (online, free); a delivery that
was waiting for them is assigned on the next sweep and finished. Between flows it clears
`ratelimit:*` keys in the E2E Redis only.

## Selectors

Controls carry `testID` and `nativeID` with the same value (see the shared UI components). Maestro's
`id:` matches the HTML `id` on web. Text selectors are regular expressions: escape `$`, `.`, `?`.

Main ids: `restaurant-heading`, `restaurant-status`, `restaurant-select-<restaurantId>`,
`lane-<STATUS>`, `order-<id>`, `order-<id>-status`, `order-<id>-total`,
`order-<id>-start-preparing`, `order-<id>-ready-for-pickup`, `orders-refresh`, `sign-out`, `tab-orders`, `tab-menu`,
`restaurant-availability`, `restaurant-status-<OPEN|BUSY|CLOSED>`, `item-<id>-availability`, `item-<id>-toggle`.
