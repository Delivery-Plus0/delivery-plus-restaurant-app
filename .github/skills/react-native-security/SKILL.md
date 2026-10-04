---
name: react-native-security
description: Use for anything involving token/credential storage, secrets, logging, environment configuration, deep links, or WebViews in the Delivery Plus mobile client. Cross-cutting — apply alongside react-native-auth and react-native-api-integration whenever those touch security-relevant code.
---

# Mobile Security — Delivery Plus

## Token and credential storage

- Store the access token in the platform's secure storage (encrypted, keychain/keystore-backed),
  not plain `AsyncStorage` and not in-memory-only (session wouldn't survive app restart, which
  is also a bad UX trade for a minor security gain here — use secure persistent storage
  instead).
- Never store the user's password client-side, even temporarily beyond the in-memory form
  field needed to submit login/register.
- Clear the token from secure storage on logout, immediately, not lazily.

## Secrets and environment configuration

- No API keys, JWT secrets, or backend credentials belong in the mobile app's source or
  bundled config — the mobile app only ever holds the user's own access token, obtained
  through login/register, nothing else secret.
- The backend's own `.env.example` files (e.g. `services/auth-service/.env.example`) show
  what the *backend* needs (`JWT_SECRET`, `INTERNAL_AUTH_SECRET`, etc.) — none of that
  belongs anywhere in the mobile client. If a task ever seems to require putting a backend
  secret in the mobile app, that's a sign the design is wrong, not a reason to proceed.
- The gateway base URL is the one piece of "configuration" the mobile app needs, and it's not
  secret — but still centralize it in one config module per environment (dev/staging/prod),
  not hardcoded per call site (`react-native-api-integration/SKILL.md`).

## Logging

- Never log the access token, in full or in part.
- Never log request/response bodies for `/api/auth/*` calls (they carry passwords/tokens).
- If broader request/response logging is added for debugging other endpoints, redact
  `Authorization` headers and any password/token fields before logging.
- Crash-reporting/analytics breadcrumbs must not include credentials or the raw token.

## Network

- All API calls go over TLS in any non-local environment — don't disable certificate
  validation to work around a dev-environment issue; use a proper local dev certificate or
  HTTP-only-for-localhost setup instead, and never ship a build with certificate validation
  disabled.
- Handle authentication failures (401) centrally and consistently
  (`react-native-auth/SKILL.md`) rather than leaking raw error bodies to the UI.

## Deep links

- Validate and type any deep-link route before navigating — don't navigate to an
  attacker-controllable arbitrary path/param without validation.
- Don't use deep links to bypass authentication gating (e.g. a deep link into an order-detail
  screen should still require a valid session).

## WebViews

- Avoid embedding a WebView unless there's a concrete requirement (e.g. a third-party payment
  redirect, if one is ever introduced) — the current payment flow is fully API-driven
  (`react-native-api-integration/API-CONTRACT.md`) and needs no WebView.
- If a WebView is ever required, restrict navigation to known origins and disable
  arbitrary JavaScript injection from untrusted content.

## Dependencies and native modules

- Prefer established, actively maintained libraries for security-relevant functionality
  (secure storage, JWT decoding) over hand-rolled implementations.
- Avoid adding native modules that request broad device permissions not justified by an
  actual feature — this app's confirmed feature set (browsing, ordering, tracking) does not
  need, for example, contacts or SMS access.
- Don't implement custom cryptographic primitives; use the platform/library-provided
  mechanisms for anything security-sensitive.

## Verify before relying on this

`.project-context/07-auth-and-security.md` for the backend's current security posture and
known gaps, and `docs/adr/001-internal-service-authentication.md` for the internal
service-to-service auth pattern (not directly relevant to the mobile client, but useful
context for why certain routes are blocked at the gateway).
