# UI implementation plan from backend to app

## Design principles

- Keep the app API-driven and screen-focused.
- Match the backend Gateway routes exactly.
- Use one shared HTTP layer for all API calls.
- Normalize backend errors into user-safe messages.
- Preserve auth/session state globally.
- Reuse domain names from the backend whenever possible.

## Data layer expectations

The app should expose domain modules like:

- `services/auth.ts`
- `services/restaurants.ts`
- `services/menus.ts`
- `services/cart.ts`
- `services/orders.ts`
- `services/payments.ts`
- `services/deliveries.ts`
- `services/tracking.ts`
- `services/notifications.ts`

Each should wrap the Gateway route and return typed DTOs aligned to the backend.

## Screen-to-domain mapping

- Login/Register screens -> Auth API
- Home screen -> Restaurant API
- Restaurant detail -> Restaurant + Menu API
- Cart screen -> Cart API
- Checkout screen -> Order + Payment API
- Order list/detail -> Order API
- Delivery screen -> Delivery + Tracking API
- Notification screen -> Notification API
- Profile screen -> Auth / User API

## Implementation rules for future AI work

- Before changing a screen, inspect the matching backend route and DTO shape.
- Do not invent endpoints or response fields.
- Keep UI domain names aligned with backend business language.
- Treat roles as permission boundaries, not decorative labels.
- Prefer real backend-driven state over local mock state for the customer journey.

## Minimum success definition

A working customer app should allow a user to:

1. sign up and sign in
2. browse restaurants
3. choose products from a menu
4. add to cart
5. review order and checkout
6. see order status and live delivery information
7. read notifications and manage profile details

That is the true end-to-end product story the app should support.
