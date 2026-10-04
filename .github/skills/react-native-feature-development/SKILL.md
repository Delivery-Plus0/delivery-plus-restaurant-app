---
name: react-native-feature-development
description: Use as the default workflow whenever asked to implement, build, or add a mobile feature or screen for the Delivery Plus React Native client (e.g. "implement feature X", "add a screen for Y", "build the Z flow"). This is the entry point that sequences the other react-native-* skills — read this first, then follow it into the specific skills it references.
---

# Feature Development Workflow — Delivery Plus (mobile)

## Before writing any code

1. Inspect the existing mobile codebase (if any exists yet) for conventions already
   established — folder placement, naming, existing hooks/services that might already cover
   part of the request.
2. Inspect the relevant backend endpoint(s) directly in `services/<name>-service/src`
   (controllers + DTOs), cross-checked against
   `react-native-api-integration/API-CONTRACT.md`. If the feature needs something the backend
   doesn't expose, say so explicitly — do not invent an endpoint or a response shape.
3. Inspect auth/role requirements for the endpoint(s) involved (`react-native-auth/SKILL.md`,
   `API-CONTRACT.md`'s per-endpoint auth column).
4. Inspect existing shared components (`react-native-components/SKILL.md`) that might already
   cover part of the UI — don't rebuild a `Button`/`Card`/`EmptyState` that already exists.
5. Inspect existing theme tokens (`react-native-design-system/SKILL.md`) rather than
   introducing new hardcoded values.
6. Inspect existing state-management patterns (`react-native-state-management/SKILL.md`) to
   place new state consistently with how similar data is already handled.
7. Identify whether a genuinely new abstraction is needed, or whether the feature fits
   existing hooks/services/components with minor extension.
8. Plan the minimal set of files this actually requires — resist scaffolding unrelated
   screens, services, or types "while you're in there."

## Implementation order

```
Requirement
  → Backend contract (verify against real controller/DTO source)
  → Types (mirror the verified DTO shape)
  → API service function (react-native-api-integration/SKILL.md)
  → State/data layer (react-native-state-management/SKILL.md)
  → Hooks (wrap the service call with loading/error/empty semantics)
  → Reusable components (react-native-components/SKILL.md, react-native-design-system/SKILL.md)
  → Screen (composes components + hook)
  → Navigation wiring (react-native-navigation/SKILL.md)
  → Loading/error/empty states (explicit for this feature, not assumed)
  → Accessibility (react-native-accessibility/SKILL.md — during, not after)
  → Tests (react-native-testing/SKILL.md)
```

Never implement a step against a guessed version of the previous step — e.g. don't write a
screen against a hook signature you haven't actually defined yet, and don't define a service
function against an endpoint shape you haven't actually verified.

## After implementation

Run, and report the **actual** results of:

- Lint for the mobile package
- TypeScript type-check
- Unit/component tests for the touched code
- Any integration tests relevant to the touched boundary

Report exactly what passed and what failed, with real command output — never state that
checks passed without having run them (`react-native-testing/SKILL.md`).

## Guardrails specific to this repository

- The mobile app talks only to `/api/...` Gateway paths — never an internal service host/port
  (`react-native-api-integration/SKILL.md`).
- Don't build UI for backend capabilities that don't exist yet (email verification, logout
  endpoint, refresh tokens — see `react-native-auth/SKILL.md`).
- Don't modify backend service code to "make a feature easier" — if a mobile feature genuinely
  needs a backend change, that's a separate, explicit task, not something to fold into a
  frontend feature request.
- Don't modify the committed brand assets or invent new brand colors
  (`react-native-design-system/BRANDING.md`).
