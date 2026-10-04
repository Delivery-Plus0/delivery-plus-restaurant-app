# Delivery Plus customer app story

Ahmed is a customer who wants to order food with the least friction possible. He opens the Delivery Plus app, signs up or signs in, and lands in a secure authenticated flow backed by the same JWT contract used by the backend.

The app first hydrates the session, then routes him into the app shell. From there he browses available restaurants, reads their menu, selects items, and submits a cart. The cart is not local-only state; it is kept in sync with the backend’s cart service. He reviews a subtotal, proceeds to checkout, and creates a real order through the Gateway API.

The backend then orchestrates the rest of the customer journey: order creation, payment simulation, restaurant preparation, delivery assignment, and tracking. The app surfaces that progress in a clean order-detail experience and shows status updates as the order moves from created to confirmed to delivered.

This is the real product path the app must support:

- secure registration and login
- restaurant discovery and menu reading
- cart creation and item updates
- order creation from the active cart
- payment summary and order confirmation
- order history and status detail
- tracking and delivery updates
- notifications and profile access

## Actual backend contract this app must match

The customer app is not free-form. It should only use the public Gateway API:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/restaurants`
- `GET /api/restaurants/:id`
- `GET /api/menus/restaurants/:id/menu`
- `GET /api/menus/menu-items/:id`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/payments`
- `POST /api/payments/:id/process`
- `GET /api/payments/:id`
- `GET /api/deliveries/:id`
- `GET /api/tracking/delivery/:id`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `PATCH /api/orders/:id/status` (customer cancellation)

## Why this matters

The mobile app should reflect the platform’s real domain model and backend behavior, not a detached mock UI. Every screen should either be directly mapped to a Gateway endpoint or intentionally modeled as a UI concept built on that contract.

The goal is simple: from first launch to final delivery update, the customer experience should feel like a real Delivery Plus product and remain consistent with the backend API contract.
