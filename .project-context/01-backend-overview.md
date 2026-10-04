# Backend overview

## Product purpose

Delivery Plus is a food delivery platform with a customer-facing order flow, restaurant catalog browsing, payment simulation, driver assignment, delivery lifecycle management, tracking, and notifications.

## Core actors

- Customer
- Restaurant owner
- Driver
- Admin

## Core business entities

- user profile
- restaurant
- menu item
- cart
- order
- payment
- delivery
- driver availability and assignment
- tracking location
- notification records

## Role model

The backend uses these role values:

- `CUSTOMER`
- `RESTAURANT_OWNER`
- `DRIVER`
- `ADMIN`

JWTs carry a user identity and role, and downstream services enforce access using shared guards and middleware.

## Runtime composition

The backend is organized as a NestJS microservice system behind a public API Gateway:

- API Gateway: `http://localhost:3000`
- Auth service: `http://localhost:3001`
- User service: `http://localhost:3002`
- Restaurant service: `http://localhost:3003`
- Menu service: `http://localhost:3004`
- Cart service: `http://localhost:3005`
- Order service: `http://localhost:3006`
- Payment service: `http://localhost:3007`
- Delivery service: `http://localhost:3008`
- Driver service: `http://localhost:3009`
- Tracking service: `http://localhost:3010`
- Notification service: `http://localhost:3011`

The mobile app must not call internal service ports. The only public entry point is the Gateway. The app should always use `/api/...` route prefixes and treat the backend as a public API facade.

## Customer app implications

The frontend is expected to model the real product sequence:

1. sign up or log in
2. browse restaurants and menu
3. add items to cart
4. create order
5. review payment flow
6. follow order lifecycle updates
7. inspect delivery status and tracking
8. read notifications and profile details

This is the single product story the app must support and is the source of truth for feature work.
