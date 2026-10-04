# Restaurant Orders API Contract

All requests go through the API Gateway. The app sends the signed-in access token as a Bearer token and never supplies a user or owner id in request paths.

| Route | Use | Access |
| --- | --- | --- |
| `POST /api/auth/login` | Obtain a session | Public |
| `GET /api/restaurants/me` | List restaurants owned by the current user | `RESTAURANT_OWNER` |
| `GET /api/orders/restaurant/:restaurantId?page=1&limit=50` | Read the restaurant's paginated orders | Owning `RESTAURANT_OWNER` |
| `PATCH /api/orders/:orderId/status` | Update an order status | Role and restaurant ownership checked by order-service |

The restaurant service's public DTO omits `ownerId`; ownership is determined from the JWT and backend data, not client-side fields.

## Restaurant actions

Payment moves successful orders to `CONFIRMED`. The owner may request only:

```text
CONFIRMED → PREPARING → READY_FOR_PICKUP
```

The UI labels these actions “Start preparing” and “Ready for pickup”. `READY_FOR_PICKUP` publishes the lifecycle event used by automatic delivery dispatch. Do not add a separate accept state, manual dispatch action, or client-side ownership assertion as a substitute for backend checks.