---
name: react-native-state-management
description: Use when deciding where a piece of state should live (local component state, server/cache state, or global app state) in the Delivery Plus mobile client, or when reviewing whether a new global store or state library is actually justified.
---

# State Management — Delivery Plus

## Three kinds of state, and only three

**Local UI state** — lives in the component/screen that owns it, via basic component state:
- Modal/sheet open-closed
- Selected tab or filter chip
- Text input value before submit
- Local "is this specific button loading" flags for one-off actions

**Server state** — data that originates from the backend and can go stale: restaurants, menu,
cart, orders, notifications, profile. This should go through whatever data-fetching solution
the app adopts (a query/cache library or hand-rolled hooks) that gives you loading/error
states, caching, and refetching for free — not raw `useEffect` + manual state duplicated in
every screen that needs the same data.

**Global client state** — small, and only for things that are genuinely needed across
unrelated parts of the app:
- Auth session (current user id/role, presence of a valid token) — see
  `react-native-auth/SKILL.md`
- A handful of app-wide preferences, if any exist (none are required by the current backend
  contract)

Cart is a good example of the boundary: the cart's *contents* are server state (they live in
Redis via `cart-service` and are fetched with `GET /api/cart`) — the mobile app should not
duplicate cart contents into a separate global client store as if it were local truth. A
purely local "cart badge is animating" flag, on the other hand, is local UI state.

## Rules

- Don't put everything in one global store. If a piece of state is server data, model it as
  server state (with its own cache/loading/error semantics), not as global client state that
  the app manually keeps in sync.
- Don't introduce a heavy state-management dependency without a concrete need it solves that
  local/server state handling doesn't already cover. Justify the addition in terms of an
  actual problem (e.g. "N screens need the same in-flight cart mutation status") rather than
  by default.
- Prefer the simplest solution that solves the actual problem: local state for local
  concerns, a small number of purpose-built hooks around `services/api/*` for server state,
  one small global store for session.
- Server-state hooks should expose the same loading/error/empty shape everywhere (see
  `react-native-components/SKILL.md`) so screens can render consistently regardless of which
  endpoint backs them.
- Avoid deriving state that could instead be computed on render from existing state/props —
  duplicated derived state is a common source of bugs (stale cart totals, stale order status
  after a background refetch).

## Verify before relying on this

Whatever concrete data-fetching/state library the first real feature adopts — this skill
describes the boundaries the library should be used to express, not a specific library's API.
