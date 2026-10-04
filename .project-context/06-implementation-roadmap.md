# Implementation roadmap for the customer app

## Goal

Build a production-quality customer mobile experience that mirrors the Delivery Plus backend product model and uses the public Gateway API contract as the single source of truth.

The app must feel polished, consistent, and fast while staying aligned with the backend domain model, permissions, and API sequencing.

## High-level architecture

### 1. App structure

- App shell: Expo Router with grouped route segments
- Global auth/session state: secure token storage + session hydration
- Shared API layer: Gateway-based typed client
- Shared theme system: centralized colors, spacing, radii, typography
- Feature modules: auth, restaurants, menu, cart, checkout, orders, tracking, notifications, profile

### 2. Data flow

- Screen -> feature hook -> typed service -> API client -> Gateway -> backend service
- All API responses mapped to typed domain models
- Errors normalized centrally and surfaced as user-friendly states
- Session and JWT logic handled globally, not per screen

## Quality standards

### Design system

- One visual language across all screens
- Brand colors same as backend identity and assets
- Consistent spacing, radius, typography, shadows
- Reusable components for Card, Button, Input, EmptyState, Badge, SectionHeader
- Avoid hardcoded colors and ad-hoc styling per screen

### Performance

- Keep screens shallow and focused
- Use `FlatList`/`SectionList` with stable keys
- Memoize expensive derived values and callbacks
- Avoid re-render storms from unstable object references
- Use skeleton/loading placeholders for network-heavy screens
- Prefer server-driven data refresh and cache invalidation instead of local over-engineering
- Keep images optimized and load only when needed

### React Native best practices

- Keep business logic out of UI components
- Use hooks for data loading and form state
- Avoid large inline object literals in render paths
- Use `useMemo`/`useCallback` only where it adds value
- Use list virtualization and pagination for long lists
- Use route-level loading states rather than broad global spinners
- Keep screen components small and composable

## Phase-by-phase plan

### Phase 0 — foundation and standards

**Objective:** establish app architecture, visual system, and backend integration pattern.

**Deliverables:**

- finalized app shell and route structure
- theme tokens and shared components
- API client abstraction with base URL handling
- session/auth utilities and hydration flow
- project-context documentation for AI and contributors

**Acceptance criteria:**

- all screens use the same theme tokens
- auth hydration works before rendering private routes
- all API calls go through the Gateway only
- dev environment works on the correct host (`localhost`, emulator IP, or LAN IP)

---

### Phase 1 — authentication and onboarding

**Objective:** create the secure entry point for the app.

**Screens:**

- splash/loading
- login
- register
- password recovery placeholder if needed later

**Backend integration:**

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

**Implementation notes:**

- validate email and password inputs locally
- secure token storage with expo-secure-store
- decode JWT payload to user session model
- redirect authenticated users away from auth screens
- normalize backend 401/400/409 errors into friendly messages

**Acceptance criteria:**

- user can create a customer account
- user can sign in with valid credentials
- invalid auth attempts show clear error states
- session persists across app restarts

---

### Phase 2 — restaurant discovery and home feed

**Objective:** make the customer feel the product instantly with a usable home experience.

**Screens:**

- home summary feed
- restaurant list
- restaurant detail
- search/filter cards
- category/featured sections

**Backend integration:**

- `GET /api/restaurants`
- `GET /api/restaurants/:id`

**Implementation notes:**

- create a typed restaurant model from backend DTOs
- show cards with image, rating, cuisine, ETA, and delivery fee
- add list placeholders and error states
- optimize list rendering with memoized card components

**Acceptance criteria:**

- restaurant list loads from backend
- restaurant detail shows core product data
- empty and error states are explicit and polished

---

### Phase 3 — menu browsing and cart

**Objective:** transform browsing into a purchase flow.

**Screens:**

- menu item list
- category tabs
- item detail modal or screen
- cart screen
- cart quantity controls

**Backend integration:**

- `GET /api/menus/restaurants/:id/menu`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`

**Implementation notes:**

- keep cart state loaded and synced with backend
- show item quantity adjustments with optimistic UI patterns
- support small checkout totals in a clean summary card
- ensure the cart is always consistent with the selected menu state

**Acceptance criteria:**

- customer can browse restaurant menu
- cart updates cleanly and reflects server state
- empty cart, invalid item, and server error states are handled

---

### Phase 4 — checkout and order creation

**Objective:** turn the cart into a real order.

**Screens:**

- checkout review
- payment summary panel
- order confirmation screen

**Backend integration:**

- `POST /api/orders`
- `GET /api/payments/:id`

**Implementation notes:**

- capture order summary, delivery address, and payment confirmation state
- keep order creation as a single action with guarded button states
- show confirmation and order reference immediately after success
- use next-screen navigation with real order response payload

**Acceptance criteria:**

- order can be created from cart state
- success screen contains generated order details
- failed checkout states are handled gracefully

---

### Phase 5 — order lifecycle and delivery tracking

**Objective:** let the customer see the outcome and progress of their purchase.

**Screens:**

- active orders list
- order detail
- delivery status card
- tracking status panel

**Backend integration:**

- `GET /api/orders`
- `GET /api/orders/:id`
- `GET /api/deliveries/:id`
- `GET /api/tracking/delivery/:id`

**Implementation notes:**

- provide status-based visuals: preparing, en route, delivered
- create small, readable timeline or status badge components
- fetch latest order state on refresh and when screen regains focus

**Acceptance criteria:**

- customer can view current and past order states
- delivery progress is understandable without backend knowledge
- refresh and retry flows are available

---

### Phase 6 — notifications and profile

**Objective:** add communication and account management.

**Screens:**

- notifications inbox
- notification detail
- profile summary
- account and settings area

**Backend integration:**

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read` and `PATCH /api/notifications/read-all`
- `GET /api/auth/me`

**Implementation notes:**

- keep unread counters and list states lightweight
- use a clear notification card design with status icons
- profile screen should be read-only unless the backend exposes update routes

**Acceptance criteria:**

- user can view notifications and account identity
- unread states are clear and consistent
- account info matches JWT payload and backend identity

---

### Phase 7 — polish, accessibility, and quality gates

**Objective:** bring the product to production-quality UX and stability.

**Tasks:**

- accessibility review for focus, labels, contrast, button sizes
- empty/error/loading states pass audit
- route and session stability review
- image and list performance audit
- no dead code or duplicated feature logic
- final type-check and lint validation

**Acceptance criteria:**

- application behaves consistently across screens
- all major flows are covered by tests or smoke checks
- UI remains responsive under network delay and failure states

## Recommended feature delivery order

1. foundation + theme + API client + auth
2. home + restaurant discovery
3. menu + cart
4. checkout + order creation
5. orders + delivery tracking
6. notifications + profile
7. polish and optimization

## App-level implementation rules

- Treat the Gateway as the only public API surface
- Match backend business names and response shapes
- Keep route names aligned with the product flow
- Keep the UI simple, grounded, and fast
- Prefer single-responsibility modules for each domain slice
- Build with asynchronous state and loading states from the start

## Summary

The app should not be built as isolated screens with fake data. It should be built as a real customer journey that mirrors the backend platform: auth, discover, add to cart, checkout, track order, and receive updates.

If we follow this roadmap, the app will remain consistent, fast, and aligned with the backend contract while allowing future AI or team contributors to continue safely.
