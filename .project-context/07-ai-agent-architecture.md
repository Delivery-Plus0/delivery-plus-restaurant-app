# AI agent architecture guide

## Purpose

This file explains how future AI agents should plan and implement work in the customer app without drifting away from the real backend contract or the customer journey.

The goal is simple: keep the app aligned with the Delivery Plus product and maintain a single trusted source of truth for planning and implementation.

## Source of truth hierarchy

1. backend repo contract and route behavior
2. public Gateway API surface
3. this app’s actual feature implementation
4. product-story and architecture docs in this folder

AI contributors should always treat the backend as more authoritative than any local assumption in the app.

## Working rules for agents

- never invent routes, payloads, or response fields
- prefer the public Gateway URL over service internals
- keep screen naming aligned with backend domain language
- keep feature modules separated by domain concern
- use shared API helpers instead of duplicated fetch logic
- add user-friendly error normalization at the service boundary
- whenever a new feature is planned, map it back to one or more backend endpoints before writing UI

## Recommended plan for new features

### Step 1 — verify the backend contract

Before changing UI, inspect the backend Gateway route and confirm:

- route path
- auth requirement
- request body shape
- response shape
- error behavior

### Step 2 — map to app domain module

Add or update the relevant domain module under `src/services` and keep its API contract typed.

Examples:

- auth -> login/register/session
- restaurants -> restaurant list and details
- cart -> add/update/delete item
- orders -> order create/list/detail
- deliveries -> status and tracking

### Step 3 — implement the screen flow

Design the UI to follow the real product story and keep logic in reusable screen-level hooks whenever possible.

### Step 4 — validate the flow

Use TypeScript, lint, and relevant tests to confirm the flow still works after the change.

## Key architectural decisions

### Gateway-first access

The app must use `http://localhost:3000` plus `/api/...` routes. Internal service ports are implementation details of the backend and not part of the client contract.

### Shared session model

Auth state is global and persists in secure storage for native, with browser-safe fallbacks for web.

### Centralized API error handling

The client should convert backend failure payloads into consistent app-level states, not let every screen parse raw error formats.

### Domain separation

Each major product area should have a dedicated service and screen structure so future AI work can evolve the app in safe slices.

## Good future tasks

- improve delivery-tracking UI
- add richer notifications integration
- expand profile and account state
- add order refresh and polling logic
- add loading/skeleton states for large lists
- add owner or driver apps as separate frontends with their own route groups

## Anti-patterns to avoid

- hardcoded mock data where a real API should drive the screen
- direct calls to internal backend ports
- route names that do not match the platform domain model
- duplicate HTTP logic across screens
- mixing auth/session logic into individual components without a shared service

## Implementation mindset

The customer app should be treated as a real product experience with real backend integration and scoped feature delivery. The best future work will follow the backend’s architecture and keep the UI grounded in actual platform behavior rather than synthetic assumptions.
