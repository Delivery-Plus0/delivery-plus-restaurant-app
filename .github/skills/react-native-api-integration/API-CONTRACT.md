# Delivery Plus — Public API Contract Summary

**Source of truth**: there is no committed OpenAPI file. This summary was compiled by reading
the actual controller and DTO source in each service under `services/*/src`, at commit
`afee937` on branch `dev`. Treat it as a map for orientation, then re-open the real source
file before implementing — controllers can change without this file being updated.

All paths below are as seen by the **client**, i.e. already behind the gateway's `/api/...`
prefix. Base URL in local development: `http://localhost:3000` (gateway listens on port
3000; see `docker-compose.yml`).

## Auth — `/api/auth` (`services/auth-service`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | none | Body: `{ email, password (min 8 chars), fullName, phone?, role? }`. `role` defaults to `CUSTOMER` if omitted; one of `CUSTOMER`, `RESTAURANT_OWNER`, `DRIVER`, `ADMIN`. Rate-limited: 5 requests / 60s. Returns `{ accessToken, userId, email, role }`. |
| POST | `/api/auth/login` | none | Body: `{ email, password }`. Rate-limited: 5 requests / 60s. Returns same `AuthResponseDto` shape as register. |
| GET | `/api/auth/me` | Bearer JWT | Returns the decoded JWT payload: `{ sub, email, role }`. |

**Not implemented (do not build UI or client logic assuming these exist):** email
verification, resend-verification, refresh tokens, logout/token revocation, password
change/reset, account lockout, MFA. These are explicitly tracked as backend backlog in
`.project-context/07-auth-and-security.md`. A "login persists until the JWT expires, no
logout endpoint to call, no refresh flow" is the current reality — client-side "logout" means
discarding the locally stored token, not calling a backend endpoint.

## Users / profile — `/api/users` (`services/user-service`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/users/me` | Bearer JWT | Current user's profile. |
| PATCH | `/api/users/me` | Bearer JWT | Update current user's profile. |
| GET | `/api/users/me/orders` | Bearer JWT | Order history, proxied server-side from order-service. Query: `page`, `limit` (default 1/20). |
| GET | `/api/users/:id` | Bearer JWT | Self or admin only (enforced server-side). |

`POST /internal/users` exists on user-service but is **blocked at the gateway** (returns 404
for any client) — it's the internal, HMAC-signed call auth-service makes during registration.
Never call it from the mobile app.

## Restaurants — `/api/restaurants` (`services/restaurant-service`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/restaurants` | none (public) | Query: `page`, `limit` (default 1/20), `status?` (`OPEN`/`CLOSED`/`BUSY`/`SUSPENDED`), `search?` (free text), `sortBy?` (`name`/`createdAt`, default `createdAt`), `sortOrder?` (`ASC`/`DESC`, default `DESC`). Returns `PaginatedResult<Restaurant>`. |
| GET | `/api/restaurants/:id` | none (public) | Single restaurant. |
| POST | `/api/restaurants` | Bearer JWT, role `RESTAURANT_OWNER` | Create a restaurant. Not relevant to a customer-facing mobile client unless a restaurant-owner-facing surface is in scope. |
| PATCH | `/api/restaurants/:id` | Bearer JWT, owner only | |
| PATCH | `/api/restaurants/:id/status` | Bearer JWT, owner or `ADMIN` | Update operational status. |

## Menu — `/api/menus` (`services/menu-service`)

Note: this service registers its controllers at the root (no `/menus` prefix internally) —
the gateway special-cases this when proxying, so from the client's point of view the paths
are still under `/api/menus/...` as shown below.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/menus/restaurants/:restaurantId/menu` | none (public) | Full menu (categories + items) for a restaurant. |
| GET | `/api/menus/menu-items/:id` | none (public) | Single menu item. |
| POST | `/api/menus/categories` | Bearer JWT, role `RESTAURANT_OWNER` | |
| POST | `/api/menus/menu-items` | Bearer JWT, role `RESTAURANT_OWNER` | |
| PATCH | `/api/menus/menu-items/:id` | Bearer JWT, owner only | |
| DELETE | `/api/menus/menu-items/:id` | Bearer JWT, owner only | |
| PATCH | `/api/menus/menu-items/:id/availability` | Bearer JWT, owner only | |

## Cart — `/api/cart` (`services/cart-service`, Redis-backed)

All endpoints require a Bearer JWT and are rate-limited (30 requests / 60s).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/cart` | Current user's cart with computed total. |
| POST | `/api/cart/items` | Add an item. |
| PATCH | `/api/cart/items/:menuItemId` | Update quantity; `0` removes the item. |
| DELETE | `/api/cart/items/:menuItemId` | Remove an item. |
| DELETE | `/api/cart` | Clear the cart. |

## Orders — `/api/orders` (`services/order-service`)

All endpoints require a Bearer JWT.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/orders` | Creates an order **from the current cart** (no order body beyond auth + optional `Idempotency-Key` header). Rate-limited: 5/60s. |
| GET | `/api/orders` | Current customer's own order history. Query: `page`, `limit`. |
| GET | `/api/orders/restaurant/:restaurantId` | Restaurant-owner view of orders for their restaurant. Query: `page`, `limit`. |
| GET | `/api/orders/:id` | Single order — accessible to the owning customer, the restaurant owner, or `ADMIN`. |
| PATCH | `/api/orders/:id/status` | Transition order status (role- and ownership-checked). Rate-limited: 10/60s. |

Order status values (`shared/src/types/enums.ts`): `CREATED`, `PAYMENT_PENDING`, `CONFIRMED`,
`PREPARING`, `READY_FOR_PICKUP`, `DRIVER_ASSIGNED`, `PICKED_UP`, `DELIVERED`, `CANCELLED`,
`FAILED`. Not every transition is valid from every state — the backend enforces
`ORDER_TRANSITIONS`; the client should reflect only the actions valid for the order's current
state rather than always offering every action.

## Payments — `/api/payments` (`services/payment-service`)

All endpoints require a Bearer JWT.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/payments` | Create a payment for an order (transitions the order to `PAYMENT_PENDING`). Supports `Idempotency-Key`; reusing a key for a *different* order returns `409`. |
| POST | `/api/payments/:id/process` | Simulates settlement to `COMPLETED` or `FAILED`. Retry-safe. May return `409` if already being processed concurrently. |
| GET | `/api/payments/:id` | Payment status. |
| POST | `/api/payments/:id/refund` | Refund a completed payment. |

This is a simulated payment flow (no real payment provider integration exists in the
backend) — do not build UI implying a real card-capture/PCI flow beyond what these endpoints
actually do.

## Tracking — `/api/tracking` (`services/tracking-service`, Redis-backed)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/tracking/location` | Bearer JWT, role `DRIVER` | Driver reports current location. Not relevant to a customer-facing client. |
| GET | `/api/tracking/driver/:userId` | none (public) | Last known location for a driver. |
| GET | `/api/tracking/delivery/:deliveryId` | Bearer JWT | Combined delivery status + driver location — this is the endpoint an order-tracking screen should use. |

## Deliveries — `/api/deliveries` (`services/delivery-service`)

Driver/dispatch-oriented lifecycle actions (`create`, `assign`, `pickup`, `start`,
`complete`, `cancel`) plus `GET /api/deliveries/:id`. Not customer-facing; a
customer-facing mobile app should use `/api/tracking/delivery/:deliveryId` instead for
order tracking, not call these directly.

## Drivers — `/api/drivers` (`services/driver-service`)

Driver registration/status endpoints. Only relevant if a driver-facing surface is in scope
for this mobile app — not part of the customer ordering flow.

## Notifications — `/api/notifications` (`services/notification-service`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/notifications` | Bearer JWT | Query: `page`, `limit` (default 1/20). |
| PATCH | `/api/notifications/:id/read` | Bearer JWT | Mark one as read. |
| PATCH | `/api/notifications/read-all` | Bearer JWT | Mark all as read. |

## Roles (verified, `shared/src/types/enums.ts`)

`CUSTOMER`, `RESTAURANT_OWNER`, `DRIVER`, `ADMIN`. A default customer-facing mobile app
mainly needs `CUSTOMER`; only build owner/driver-facing screens if that's an explicit product
requirement.

## Health endpoints

Every service (including the gateway) exposes `/health`, `/health/live`, and (for services
with a datastore) `/health/ready` — not relevant to app features, but useful for verifying a
local dev backend is actually reachable before debugging a mobile network issue.
