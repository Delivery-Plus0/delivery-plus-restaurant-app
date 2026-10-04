---
name: react-native-performance
description: Use when implementing or reviewing lists, images, network-heavy screens, or anything with a measurable re-render/startup-time concern in the Delivery Plus mobile client. Measure before optimizing — don't apply these as blanket rules to every component.
---

# Performance — Delivery Plus

## Where this actually matters in this app

- **Restaurant list / search** (`GET /api/restaurants`, paginated) and **menu list**
  (`GET /api/menus/restaurants/:id/menu`) — these are the highest-traffic, most data-heavy
  screens. Use `FlatList`/`SectionList` (or equivalent virtualized list) rather than mapping
  a large array into a `ScrollView`.
- **Pagination**: the backend already paginates restaurants, orders, and notifications
  (`page`/`limit`) — fetch incrementally as the user scrolls rather than requesting a huge
  `limit` up front.
- **Images**: restaurant/menu-item images (if the backend serves image URLs — check the
  actual entity/DTO fields before assuming a field name) should use an image component with
  built-in caching/downsampling rather than the bare platform `Image` component with no size
  hints, to avoid decoding full-resolution images for small thumbnails.
- **Cart/order screens**: totals are computed from item lists — recompute only when the
  underlying items change, not on every render, and avoid redundant network refetches when
  local optimistic state already reflects the change.
- **Startup**: session restore (`react-native-auth/SKILL.md`) is the first network-adjacent
  work on cold start — keep it minimal (read stored token, don't block on a network round
  trip before rendering the first screen).

## General rules

- Don't memoize everything by default — memoize when a component is provably re-rendering
  unnecessarily with the same props/output, not as a reflex.
- Keep callbacks passed to list item components stable (e.g. don't create a new inline
  closure per render for a `FlatList`'s `renderItem` if it causes item re-renders) —
  but only chase this once it's an observed problem in a large list.
- Avoid large synchronous work on the JS thread during interaction (e.g. sorting/filtering a
  large restaurant list) — debounce search input rather than filtering on every keystroke
  against a large dataset, and prefer letting the backend's own `search`/`sortBy` query
  params do the filtering (`API-CONTRACT.md`) over client-side filtering of a large list.
- Avoid network waterfalls: a restaurant detail screen needing both restaurant info
  (`GET /api/restaurants/:id`) and its menu (`GET /api/menus/restaurants/:id/menu`) should
  fire both requests concurrently, not sequentially, since neither depends on the other's
  result.
- Cache read-mostly data (restaurant list, menu) for a short, sensible duration instead of
  refetching on every screen focus — but always refetch cart and order status, which change
  frequently and where staleness is user-visible and consequential.

## Avoid premature optimization

Don't add caching layers, memoization, or virtualization to small, static lists/screens where
there is no actual performance problem — added complexity without benefit is itself a cost.
Profile or reason about actual data volume (e.g. "a restaurant menu realistically has 10s of
items, not 10,000") before deciding a screen needs list virtualization at all versus a simple
`ScrollView`.
