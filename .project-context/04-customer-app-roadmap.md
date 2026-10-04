# Customer app roadmap

## Phase 1 — foundation and auth

Status: complete for the core customer flow.

Goal: let the customer register, sign in, persist a session, and enter the app securely.

Required screens:

- onboarding / welcome
- login
- register
- app shell / redirect gate

State to support:

- session hydration
- JWT decode
- secure token persistence
- redirect rules for signed-in versus signed-out users

## Phase 2 — restaurant discovery

Status: implemented.

Goal: let the customer browse restaurants and read the catalog.

Screens:

- home feed
- restaurant cards and list
- restaurant detail

Backend usage:

- `GET /api/restaurants`
- `GET /api/restaurants/:id`

## Phase 3 — menu and cart

Status: implemented.

Goal: let the customer choose items and prepare an order.

Screens:

- menu item list
- cart summary
- quantity editing
- checkout preview

Backend usage:

- `GET /api/menus/restaurants/:id/menu`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`

## Phase 4 — checkout and order lifecycle

Status: implemented.

Goal: convert cart into a real order and show order status.

Screens:

- checkout review
- order confirmation
- order list
- order detail

Backend usage:

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/payments`
- `POST /api/payments/:id/process`
- `GET /api/payments/:id`

## Phase 5 — delivery and tracking

Status: order-status timeline and a delivery status card are implemented, both polling every 10s
while active and on screen (delivery via `GET /api/deliveries/by-order/:orderId`, ownership-checked).
Live map / WebSocket tracking is Phase 5 in `planning.md`; it needs a driver client to produce
locations and published delivery events first.

Goal: show post-order status in an understandable customer experience.

Screens:

- delivery card on order detail
- status timeline
- tracking panel or map placeholder
- ETA and driver state summary

Backend usage:

- `GET /api/deliveries/:id`
- `GET /api/tracking/delivery/:id`

## Phase 6 — notifications and profile

Status: implemented — notifications inbox (mark read / mark all read / infinite scroll, unread badge
on the tab bar) and an editable profile backed by `GET/PATCH /api/users/me`.

Goal: keep the customer informed and in control of account data.

Screens:

- notifications inbox
- profile summary
- account and preferences area

Backend usage:

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET /api/users/me`
- `PATCH /api/users/me`

## Priority order for future work

See `planning.md` (roadmap v2) for the dependency-ordered plan.

1. ~~backend: expose delivery-by-order lookup~~ (done in Phase 0); live tracking panel is Phase 5
2. avatar upload (`POST /api/users/me/avatar/image-upload-url` + `/confirm`)
3. owner/driver journeys as separate apps
