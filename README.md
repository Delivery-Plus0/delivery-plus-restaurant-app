# Delivery Plus — Customer App

The customer-facing client of **Delivery Plus**, a food-delivery platform. Customers browse restaurants, build a cart, check out, pay and follow their order until it's delivered.

Built with **Expo 57 / React Native 0.86 / Expo Router / TypeScript**, and runs on Android, iOS and the web. The app talks only to the Delivery Plus API gateway. The backend (12 NestJS services, PostgreSQL, Redis, Kafka) lives in [Yousefa7medmaher/delivery-plus](https://github.com/Yousefa7medmaher/delivery-plus).

## Features

| Area | What works |
| --- | --- |
| Account | Sign up, sign in (one request per submit, actionable errors), profile with avatar and delivery address |
| Browse | Restaurant list and search, restaurant page with menu |
| Cart and checkout | One-restaurant cart, quantity changes, checkout with order + payment (idempotency keys, so retries never double-charge) |
| Orders | Order history and detail, live status and delivery stages (polling every 10 s while active), cancel while allowed |
| Notifications | In-app notifications with an unread badge |

The drop-off address comes from the customer's profile at checkout (the backend copies it onto the order). Dispatch is automatic on the backend, so the delivery card goes from "Finding a driver" to "Driver assigned" by itself.

## Getting started

Requirements: Node.js 22, and the backend dev stack running locally (see the backend README; the gateway listens on `http://localhost:3000`).

```bash
cp .env.example .env.local     # EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
npm ci
npm run web                    # or: npm start  (Expo Go / emulator)
```

On an Android emulator use `http://10.0.2.2:3000`; on a physical device use your machine's LAN IP. Development builds show the API URL on the sign-in screen.

Demo account (after `npm run seed:demo` in the backend): `demo.customer@example.com` / `password123`.

## Project structure

```text
src/
├── app/            Expo Router screens: (auth) welcome·sign-in·sign-up, (app)/(tabs) home·orders·notifications·profile, checkout, order/[id], restaurant/[id]
├── components/     UI building blocks (cards, delivery card, form inputs, alerts)
├── services/       API client (api.ts: timeouts, auth header, error mapping) and one module per backend resource
├── state/          Data hooks on top of useResource (cart, orders, deliveries, notifications, catalog, profile)
├── hooks/          useResource (cache, polling, in-flight dedupe), theme and debounce hooks
├── config/         API base URL
├── utils/          Formatting and small pure helpers (unit-tested)
└── test/           Test setup
e2e/                Maestro flows (smoke, regression, business) and the runner
.project-context/   Architecture and contract notes for contributors and AI agents
planning.md         Status, current sprint and roadmap for the app and the backend it depends on
```

## Testing

| Level | Command |
| --- | --- |
| Typecheck | `npm run typecheck` |
| Lint (zero warnings) | `npm run lint` |
| Unit tests (vitest) | `npm test` |
| UI / E2E (Maestro, web) | `node e2e/scripts/run.mjs --suite smoke --build --headless` against the backend's isolated E2E stack (`npm run e2e:env:reset` in the backend repo) |

The E2E suites cover the customer journey (smoke), failure paths, authorization and offline recovery (regression), and the full order → delivery cycle (business). See [e2e/README.md](e2e/README.md).

## CI

| Workflow | What it proves |
| --- | --- |
| CI | `npm ci`, typecheck, lint, unit tests, web export (catches broken imports and render-time errors) |
| E2E (Maestro) | Pull requests: smoke suite against the backend E2E stack. Nightly and manual: every suite |
| Security | `npm audit` (blocks on critical) and a Trivy filesystem/secret scan |

## Branches and contributing

`dev` is the default branch; `testing` is protected; `main` holds releases. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

See [LICENSE](LICENSE).
