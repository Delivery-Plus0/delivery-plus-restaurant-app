---
name: react-native-architecture
description: Use when deciding where new mobile code should live, how to structure a new feature folder, what belongs in shared vs. feature-local code, or when reviewing whether a change respects module boundaries in the Delivery Plus React Native client. Not for backend/service code — this only covers the mobile app under (e.g.) apps/mobile or a top-level mobile/ package.
---

# React Native Architecture — Delivery Plus

## Context this skill assumes

Delivery Plus's backend is a NestJS microservice monorepo (`services/*`) behind a single
API Gateway (`services/api-gateway`) that proxies `/api/<service>` to internal services. The
mobile app is a **separate client** that only talks to the Gateway's public `/api/...`
surface — see `react-native-api-integration/SKILL.md` for the boundary rules. This skill is
about the mobile app's *own* internal structure, which has no existing precedent in this
repo yet, so treat the structure below as a strong default, not a constraint that overrides
better judgment once real features exist.

## Preferred structure

Organize by feature/domain, mirroring the backend's own domain boundaries so a mobile
engineer can map a screen to the service it talks to:

```
src/
  app/            # app entry, providers, root config
  navigation/      # navigators, route types, linking config
  features/
    auth/          # register, login, session restore
    restaurants/    # browse/search, restaurant detail
    menu/           # menu browsing for a restaurant
    cart/           # cart screen + cart mutations
    orders/         # order creation, order history, order detail
    tracking/        # delivery tracking
    profile/         # user profile (user-service)
  components/      # shared, reusable UI primitives and composites
  hooks/           # shared, cross-feature hooks
  services/        # typed API clients, one module per backend service
  store/           # global client state (auth session, app prefs)
  theme/           # design tokens (see react-native-design-system)
  utils/
  types/
  assets/
  config/          # env, base URLs, feature flags
```

Each `features/<name>/` folder should be free to have its own local `components/`, `hooks/`,
and `screens/` — don't force feature-local UI into the shared `components/` folder just to
fit the tree above.

Do not force this exact tree if the actual chosen navigation/state libraries need a
different shape (e.g. Expo Router's file-based routing implies routes live under `app/`
directly). The **boundaries** below matter more than the folder names.

## Rules

- **Feature folders own their business logic.** A restaurant list screen's filtering/sorting
  logic belongs next to that feature, not in a shared utility unless a second feature needs
  it too.
- **Keep API/network code out of components.** Components call hooks; hooks call typed
  service functions; service functions call the HTTP client. No `fetch`/axios calls inside a
  `.tsx` component body.
- **Side effects are isolated.** Network calls, storage reads/writes, and analytics/logging
  live in hooks or services, not scattered through render logic.
- **No premature abstraction.** Don't build a generic "resource" abstraction over
  restaurants/menu/cart/orders before at least two of them need the same shape — the backend
  itself doesn't do this (each service owns its own DTOs), and the mobile client
  shouldn't invent a unification the backend doesn't have.
- **Minimize global state.** Most state is either local UI state or server state (see
  `react-native-state-management/SKILL.md`). Global state is for session/auth and small,
  genuinely app-wide preferences only.
- **Explicit dependencies.** A feature that needs another feature's data should import a
  typed hook/service from that feature, not reach into its internals.
- **No circular dependencies** between `features/*` — if two features need to share
  something, it belongs in `components/`, `hooks/`, `services/`, or `types/`.
- **Strong TypeScript.** Model API responses as types generated or hand-written from the
  real backend DTOs (see `react-native-api-integration/SKILL.md`) — never `any` for network
  data.

## Backend-boundary reminder

Route groups the mobile app should plan feature folders around (from
`services/api-gateway/src/main.ts`, all under `/api/...`): `auth`, `users`, `restaurants`,
`menus`, `cart`, `orders`, `payments`, `deliveries`, `drivers`, `tracking`, `notifications`.
`drivers` and `notifications` exist on the backend but no current product requirement in this
task calls for driver-facing or notification-center mobile screens — don't build features
against them speculatively.

## Verify before relying on this

`services/api-gateway/src/main.ts` for the current route-group list, and whatever the mobile
app's own `package.json`/`app.json` says once the first real feature exists (that's when
navigation/state library choices become fixed).
