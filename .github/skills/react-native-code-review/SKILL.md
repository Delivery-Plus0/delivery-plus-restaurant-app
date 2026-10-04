---
name: react-native-code-review
description: Use when reviewing a diff, PR, or set of changes to the Delivery Plus mobile client. Prioritizes concrete defects and risks over subjective style preferences.
---

# Code Review — Delivery Plus (mobile)

Review mobile changes against the other `react-native-*` skills, prioritized roughly in this
order (concrete defects first):

1. **API contract correctness** — does the change call a real, verified endpoint with the
   correct method/path/auth, matching `react-native-api-integration/API-CONTRACT.md` and the
   actual backend source? Flag any call to an internal-service host, any endpoint that
   doesn't exist (e.g. anything implying email verification/refresh-token/logout endpoints —
   see `react-native-auth/SKILL.md`), or any guessed request/response shape.
2. **Security** — token storage mechanism, absence of logged credentials/tokens, no hardcoded
   secrets, no disabled TLS validation (`react-native-security/SKILL.md`).
3. **Authentication/authorization correctness** — does the change respect the role
   requirements verified in `API-CONTRACT.md` (e.g. not exposing owner-only actions to a
   `CUSTOMER`-role UI)?
4. **Architecture** — correct feature/shared/component-tier placement
   (`react-native-architecture/SKILL.md`, `react-native-components/SKILL.md`); no new
   circular dependencies; no business logic inside JSX.
5. **State-management mistakes** — server data duplicated into ad-hoc global state, or global
   state used for what's really local UI state (`react-native-state-management/SKILL.md`).
6. **Error handling** — every request path has a handled failure case; no silently swallowed
   async errors; error messages come from the real `ErrorResponse.message`, not invented text
   that might drift from what the backend actually returns.
7. **Navigation issues** — untyped route params, possible navigation loops, auth state not
   correctly gating a screen (`react-native-navigation/SKILL.md`).
8. **Design-system violations** — hardcoded hex colors, spacing, or font sizes instead of
   theme tokens; unverified "brand" colors not present in
   `react-native-design-system/BRANDING.md`.
9. **Accessibility** — missing labels/roles/states on new interactive elements
   (`react-native-accessibility/SKILL.md`).
10. **Performance** — obviously unbounded list rendering, unnecessary network waterfalls, or
    premature/unjustified memoization (`react-native-performance/SKILL.md`).
11. **Duplication** — repeated validation logic, repeated API call construction, repeated
    styling that should be a shared component/token.
12. **Test coverage and honesty** — are the meaningfully risky paths tested, and are the
    described test results the actual output of running them, not an inferred claim
    (`react-native-testing/SKILL.md`)?
13. **Unnecessary dependencies** — a new dependency added without a stated reason, or one that
    duplicates something already in use.
14. **Hardcoded API URLs / dead code / secret leakage** — grep-able red flags: literal
    `http://` or service hostnames outside the centralized config, commented-out or unreachable
    code left in, anything resembling a credential in a diff.

## Style vs. substance

Don't block a change on subjective style preferences (naming taste, minor formatting) that
the project's own lint/prettier config (`.eslintrc.json`, `.prettierrc` at the repo root, if
the mobile package adopts compatible ones) would or wouldn't already flag. Reserve review
comments for the concrete defects above.
