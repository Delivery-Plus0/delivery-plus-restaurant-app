# Delivery Plus — React Native Copilot Skills

This directory is the AI engineering foundation for building the **Delivery Plus mobile
client**. It does not contain the mobile app itself — no `ios/`, `android/`, screens, or
navigation code exist yet. It contains the guardrails Copilot should apply once that work
starts.

Everything here is grounded in the real backend at the time of writing (repo
`Yousefa7medmaher/delivery-plus`, branch `dev`, commit `afee937`). When the backend changes,
re-inspect it — do not assume these documents stay accurate forever. See each skill's
"Verify before relying on this" note for what to re-check.

## Why skills instead of one big instructions file

`.github/copilot-instructions.md` (if the repo adds one) should stay short and only point
here. Each skill below is scoped to one concern, so Copilot loads only what's relevant to
the task at hand instead of one huge prompt for every request.

## Skills and when Copilot should use each one

| Skill | Use it when |
|---|---|
| `react-native-feature-development` | Any "implement feature X" request. This is the entry point — it tells Copilot to inspect first, then walks the requirement → contract → types → service → hooks → UI → screen → tests pipeline. Start here for anything non-trivial. |
| `react-native-architecture` | Deciding folder placement, module boundaries, where a new piece of code should live. |
| `react-native-components` | Building or reviewing any UI component. |
| `react-native-design-system` | Choosing colors, spacing, typography, or touch-target sizing; anything visual. Pairs with `BRANDING.md`. |
| `react-native-api-integration` | Adding or changing any network call. Pairs with `API-CONTRACT.md`. |
| `react-native-auth` | Login, register, session restore, token storage, protected requests. |
| `react-native-navigation` | Adding screens, auth-gated routes, deep links, route params. |
| `react-native-state-management` | Deciding whether something is local UI state, server state, or global state. |
| `react-native-forms` | Any input form: registration, login, checkout, profile edit. |
| `react-native-performance` | Lists, images, re-render issues, startup time. |
| `react-native-accessibility` | Any interactive component — should be applied alongside `react-native-components`, not after it. |
| `react-native-security` | Token storage, secrets, logging, deep links, WebViews. |
| `react-native-testing` | Writing or reviewing tests at any level. |
| `react-native-code-review` | Reviewing a diff or PR for mobile code. |

## How the skills relate to each other

`react-native-feature-development` is the orchestrator: it references the other skills at
the point in the workflow where they apply (contract → `react-native-api-integration`,
UI → `react-native-components` + `react-native-design-system`, etc.) rather than duplicating
their content. If you're extending these skills, keep that pattern — put a concern in exactly
one skill and cross-reference it from others.

## Where things live

- **Branding assets**: `assets/logo.png` (combined logomark + wordmark, used in the
  repository README) and `assets/icon.png` (126×126 mark-only icon). See
  `react-native-design-system/BRANDING.md` for verified colors and usage.
- **Backend API contract**: there is no committed OpenAPI JSON file in this repo. The
  gateway aggregates each service's live Swagger at `/docs` (see
  `services/api-gateway/src/main.ts`). See
  `react-native-api-integration/API-CONTRACT.md` for how to inspect the real contract and
  a summary of the endpoint families that exist today.
- **Backend architecture reference**: `.project-context/` (in particular `02-system-architecture.md`,
  `06-api-gateway.md`, `07-auth-and-security.md`, `10-conventions-and-patterns.md`,
  `11-testing-strategy.md`) and `docs/services/*.md`.

## How the mobile architecture should evolve

No mobile stack decisions (navigation library, state library, HTTP client) are made yet.
`react-native-architecture`, `react-native-navigation`, and `react-native-state-management`
describe *shapes*, not mandated dependencies — the first real feature implementation should
pick concrete libraries, document the choice once, and every skill assumes that choice from
then on rather than re-deciding it each time.
