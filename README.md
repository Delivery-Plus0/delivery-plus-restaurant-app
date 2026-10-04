# Delivery Plus Restaurant

The web-first operations dashboard for Delivery Plus restaurant owners. It provides an owner-scoped order queue and the kitchen actions to start preparation and mark orders ready for pickup.

Built with TypeScript, Expo Router 57, React 19, and React Native Web. This repository is separate from the backend monorepo and talks only to its API Gateway.

## Orders MVP

- Sign in with an existing `RESTAURANT_OWNER` account.
- Select one of the restaurants returned for that owner.
- Review confirmed, preparing, and ready-for-pickup orders with item snapshots and totals.
- Start preparing a confirmed order; mark a preparing order ready for pickup.
- Refresh manually or receive a quiet refresh every 20 seconds.

The backend owns authorization and order transitions. Payment moves an order to `CONFIRMED`; restaurant owners may move it through `PREPARING` and `READY_FOR_PICKUP`. Marking an order ready triggers the backend's automatic dispatch flow.

## Development

Requirements: Node.js 22 and the Delivery Plus backend gateway (`http://localhost:3000`). Restaurant owner accounts are provisioned by the backend; this app has no self-registration flow.

```bash
cp .env.example .env.local
npm ci
npm run web
```

Set `EXPO_PUBLIC_API_BASE_URL` in `.env.local` if the gateway is not at `http://localhost:3000`.

## Verification

| Check | Command |
| --- | --- |
| TypeScript | `npm run typecheck` |
| ESLint | `npm run lint` |
| Unit tests | `npm test` |
| Web export | `npm run export:web` |
| Maestro browser E2E | `npm run e2e:all -- --build --headless` |

E2E uses the backend's isolated Compose stack and deterministic seed. See [e2e/README.md](e2e/README.md).

## Repository

`dev` is the default integration branch. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Repository governance and CI match the other private Delivery Plus client apps.