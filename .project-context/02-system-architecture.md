# System architecture

## Public gateway and API surface

The Gateway is the front door for all customer-facing traffic. The mobile app must call the Gateway only and must never invent direct service endpoints.

Examples of the public route translation used by the app:

- `POST /api/auth/register` -> `POST /auth/register`
- `POST /api/auth/login` -> `POST /auth/login`
- `GET /api/restaurants` -> `GET /restaurants`
- `GET /api/menus/restaurants/:id/menu` -> `GET /restaurants/:id/menu`
- `POST /api/cart/items` -> `POST /cart/items`
- `POST /api/orders` -> `POST /orders`

This means the app should treat the backend as a public API contract, not as a collection of private service URLs.

## Data ownership

- PostgreSQL stores account, catalog, order, and payment data.
- Redis stores the cart and tracking location snapshots.
- Kafka carries asynchronous events between order, payment, delivery, and notification flows.

## Internal trust model

- the Gateway exposes public routes
- auth-service issues JWT access tokens
- JWTs and role checks are enforced downstream
- internal service calls are trusted only after shared auth rules have validated them

## Customer app architecture

This app is a layered Expo application:

1. route shell and navigation (`src/app`)
2. reusable UI (`src/components`)
3. domain services (`src/services`)
4. configuration (`src/config`)
5. theme and design tokens (`src/constants/theme.ts`)

The working pattern is:

- screen receives user interaction
- screen calls a typed service wrapper
- service uses shared HTTP client with bearer token handling
- API response is normalized and mapped to app state
- UI refreshes from that state and renders loading/error/empty states

## App state boundaries

The app should separate state by concern:

- auth/session state
- restaurant catalog state
- menu state for the active restaurant
- cart state from backend
- order list/detail state
- delivery/tracking status state
- notification state
- profile-state from JWT session

This is the correct abstraction layer for future AI work and avoids mixing transport logic into UI components.
