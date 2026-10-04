---
name: react-native-testing
description: Use when writing or reviewing tests for the Delivery Plus mobile client at any level — unit, component, integration, or end-to-end. Also use to verify claims about test results before reporting them.
---

# Testing — Delivery Plus (mobile)

## Repository testing convention (verified)

The backend uses per-service Jest configs run independently
(`.project-context/11-testing-strategy.md`), with root scripts
(`npm run lint`, `npm run test`, `npm run build`, all `--workspaces`) rather than one giant
centralized suite. The mobile app should follow the same spirit: its own Jest (or
equivalent) config, run independently, rather than trying to fold into the backend's
workspace test run.

## Test levels

**Unit** — pure logic with no rendering: validation functions, price/total calculations,
order-status-transition helpers mirroring the backend's `ORDER_TRANSITIONS` map (don't
duplicate the transition table by hand without testing it stays in sync — see
`react-native-api-integration/API-CONTRACT.md`), response/error mapping functions.

**Component** — rendering, interaction, and state coverage for shared and feature
components: renders correctly with given props, responds to press/input, shows the right
one of loading/error/empty/content states, exposes correct accessibility properties
(`react-native-accessibility/SKILL.md`).

**Integration** — boundaries between layers: a service module actually calls the expected
`/api/...` path and handles the real `ErrorResponse`/`PaginatedResult` shapes
(`API-CONTRACT.md`) correctly; an auth flow's session-restore logic behaves correctly against
a mocked 401.

**End-to-end** — critical real user journeys, once the app reaches a stage where E2E tooling
is set up. Base E2E coverage on flows the backend can actually support today:

```
Register → Login → Browse Restaurants → Open Menu → Add Item to Cart
  → Create Order → Create Payment → Process Payment → Track Delivery
```

Do not include "Verify Email" in this journey — that endpoint doesn't exist
(`react-native-auth/SKILL.md`). Adjust this list again if the backend's implemented
endpoints change.

## Rules

- Tests should reflect the real backend contract, not a convenient mock that doesn't match
  actual response shapes — when mocking network calls, mock the verified
  `ErrorResponse`/`PaginatedResult`/DTO shapes, not an invented simplification.
- No fake tests — a test that always passes regardless of implementation (e.g. asserting
  `true === true`, or asserting only that a function didn't throw when the point was to check
  its return value) is worse than no test.
- Avoid tests that only assert implementation details (e.g. "component calls `setState` with
  this exact internal value") over tests that assert observable behavior (what the user sees
  or what the function returns).
- **Never claim a test passed without actually running it.** If asked to verify something,
  run the actual command and report the actual output — don't infer a pass from reading the
  code.

## Verify before relying on this

`.project-context/11-testing-strategy.md` for the backend's current testing stance (it
explicitly notes CI does not run full integration/E2E today), and the mobile app's own
`package.json` test scripts once they exist.
