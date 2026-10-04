---
name: react-native-api-integration
description: Use before implementing, modifying, or reviewing any network call from the Delivery Plus mobile client — new API calls, DTO/type definitions, HTTP client setup, interceptors, or error handling. Read API-CONTRACT.md in this same directory first. Do not use this skill to justify calling internal microservices directly; the mobile app only talks to the public Gateway.
---

# API Integration — Delivery Plus

## The boundary

```
Mobile client → API Gateway (services/api-gateway) → backend microservices
```

The gateway (`services/api-gateway/src/main.ts`) proxies these path prefixes to internal
services: `/api/auth`, `/api/users`, `/api/restaurants`, `/api/menus`, `/api/cart`,
`/api/orders`, `/api/payments`, `/api/deliveries`, `/api/drivers`, `/api/tracking`,
`/api/notifications`. The mobile app calls **only** these `/api/...` paths. It never
constructs a URL that points at an internal service's own port/host directly, and it never
calls a route the gateway explicitly blocks (currently `/api/users/internal/*` — see
`isBlockedInternalRoute` in `services/api-gateway/src/route-policy.ts` — that route exists
for `auth-service` to call `user-service` synchronously during registration and is not a
public endpoint under any framing).

## There is no committed OpenAPI JSON file

Earlier guidance for this task assumed a file at `docs/openapi/delivery-plus-public.json`.
**That file does not exist in this repository.** Instead, the gateway aggregates each
service's live Swagger UI at runtime (`SwaggerModule.setup('docs', ...)` in
`services/api-gateway/src/main.ts`, pulling each service's `/docs-json`). To inspect the real
contract:

1. Prefer reading the actual controller + DTO source in `services/<name>-service/src/controllers`
   and `services/<name>-service/src/dto` — this is unambiguous and versioned in Git.
2. If the stack is running locally (`docker compose up`), the live aggregated contract is
   browsable at `http://localhost:3000/docs`.
3. `API-CONTRACT.md` in this folder summarizes the endpoint families that exist **today**,
   verified from source, as a starting map — but it is a summary, not the source of truth.
   Re-read the actual controller before implementing a call against it, especially for
   anything not covered there.

Never guess an endpoint path, request shape, or response shape. If a needed endpoint doesn't
appear to exist in the backend, say so explicitly rather than inventing one.

## Rules

1. Inspect the real controller/DTO source (or the live `/docs`) before writing or changing
   any API call.
2. Never call an internal microservice's own host/port; always go through `/api/...`.
3. Keep request/response TypeScript types aligned with the actual DTOs — mirror field names
   and optionality exactly (e.g. `RegisterDto.phone?` is optional; `RegisterDto.email` is
   required).
4. Centralize the HTTP client (base URL, headers, timeout) in one module — don't construct a
   new client instance per feature.
5. Centralize the `Authorization: Bearer <token>` header attachment in an interceptor, not
   per-call.
6. Centralize error handling: every backend error response has the same shape (see "Error
   response shape" below) — parse it once, in one place.
7. Don't duplicate request logic across screens — one typed function per endpoint, reused by
   whichever hooks need it.
8. Don't scatter the base URL as a literal string — one config value, environment-driven.
9. Support request cancellation for calls that can be superseded (e.g. a restaurant search
   as the user types).
10. Never log full request/response bodies for endpoints carrying credentials (`/auth/*`) —
    see `react-native-security/SKILL.md`.
11. Respect the backend's rate limits instead of retrying aggressively — several endpoints are
    explicitly rate-limited (see `API-CONTRACT.md`); surface a clear "please wait" state
    rather than silently hammering a 429.

## Suggested service module layout

```
services/api/
  client.ts        # base HTTP client, interceptors, error normalization
  auth.ts
  users.ts
  restaurants.ts
  menu.ts
  cart.ts
  orders.ts
  payments.ts
  tracking.ts
```

Only create a module for a service the mobile app actually calls. Don't scaffold
`drivers.ts` or `notifications.ts` speculatively (see `react-native-architecture/SKILL.md`).

## Pagination convention (verified)

List endpoints that paginate use `page` (1-based) and `limit` query params — e.g.
`GET /api/restaurants?page=1&limit=20`, `GET /api/orders?page=1&limit=20`,
`GET /api/notifications?page=1&limit=20`. The response shape for paginated lists, from
`shared/src/types/error-response.ts`:

```ts
interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

Model this generically once in the mobile app's types and reuse it — don't redefine a
per-feature pagination shape.

## Error response shape (verified)

Every backend error, from any service, follows this shape (from
`shared/src/nest/filters/http-exception.filter.ts` and
`shared/src/types/error-response.ts`):

```ts
interface ErrorResponse {
  statusCode: number;
  error: string;       // stable error code, e.g. "Unauthorized", "Conflict", "NotFound"
  message: string;
  timestamp: string;
  path: string;
  correlationId?: string;
}
```

Parse this shape centrally in the HTTP client's error interceptor and surface `message` (or a
friendlier mapping of `error`) to the UI — don't show raw stack traces or unparsed JSON.

## Correlation IDs

Requests can carry an `x-correlation-id` header; the gateway/services will echo/generate one
either way (`shared/src/nest/middleware/correlation-id.middleware.ts`). Consider generating
and attaching one client-side per request so a bug report can be traced through backend logs.

## Idempotency

`POST /api/orders` and `POST /api/payments` accept an optional `Idempotency-Key` header.
Sending the same key for the same customer/order returns the original result instead of
creating a duplicate. The mobile app should generate a UUID once per checkout/payment attempt
and reuse it across retries of that same attempt (not a new UUID per retry) — this is exactly
the case idempotency keys exist to solve (e.g. a flaky connection during checkout).

## Verify before relying on this

Always re-read the actual controller/DTO files under `services/<name>-service/src` (or the
running `/docs` UI) before implementing against them — `API-CONTRACT.md` is a snapshot, not a
live contract.
