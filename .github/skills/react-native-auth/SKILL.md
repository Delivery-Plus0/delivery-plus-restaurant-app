---
name: react-native-auth
description: Use for anything touching login, registration, session/token storage, session restore on app startup, protected API calls, or logout in the Delivery Plus mobile client. Grounded in the real (currently minimal) auth-service implementation — read this before assuming any auth capability exists.
---

# Authentication — Delivery Plus

## What the backend actually implements (verified from `services/auth-service/src`)

- `POST /api/auth/register` — `{ email, password, fullName, phone?, role? }` → `{ accessToken, userId, email, role }`
- `POST /api/auth/login` — `{ email, password }` → same response shape
- `GET /api/auth/me` — Bearer JWT → `{ sub, email, role }`

The token is a JWT signed by auth-service; the payload is `{ sub: userId, email, role }`
(`shared/src/nest/auth/jwt-payload.interface.ts`). No expiry value is returned in the
response body — the client cannot know the exact expiry without decoding the JWT itself if
that's needed for proactive UX (e.g. warning before expiry).

## What does NOT exist yet — do not build against these

Per `.project-context/07-auth-and-security.md`, these are explicitly backlog, not implemented:

- Email verification / resend verification
- Refresh tokens / token rotation
- Logout endpoint / server-side token revocation
- Password change or password reset
- Account lockout after failed attempts
- MFA/2FA

Practical consequences for the mobile client:

- **"Logout" is client-only**: clear the locally stored token and any cached session state.
  There is no backend call to make.
- **Session length = JWT lifetime** (`JWT_EXPIRES_IN`, default `1h` per
  `docs/services/auth-service.md`). When it expires, the next authenticated request will
  fail with 401 — handle that centrally (see below), not per-screen.
- **No "resend verification email" UI** — don't build a screen for a flow the backend can't
  serve.
- If a future task asks to add any of the above, treat it as a backend-and-frontend change,
  not something the mobile client can fake independently.

## Required flows

1. **Register** → store token → navigate into the authenticated area. Registration can fail
   with `409 Conflict` ("Email already registered") — surface that specific message, not a
   generic error.
2. **Login** → store token → navigate into the authenticated area. Failure is always a
   generic `401 Unauthorized` with message "Invalid email or password" for both wrong-email
   and wrong-password cases (the backend deliberately doesn't distinguish which — see
   "Avoid leaking account existence" below). Mirror that generality in the UI; don't imply
   which field was wrong.
3. **Session restore on startup**: read the stored token; if present, treat the user as
   authenticated optimistically and let the first authenticated request's 401 (if the token
   expired) trigger the centralized "session expired" handling below, rather than calling
   `/api/auth/me` speculatively on every cold start purely to validate the token (that's an
   extra round trip for the common case where the token is still valid). Calling `/me` once
   to warm the user profile is fine — it's the validation-for-its-own-sake pattern to avoid.
4. **Logout**: clear stored token + any cached user/session data, reset navigation to the
   unauthenticated stack.
5. **Centralized 401 handling**: any API call that returns 401 should trigger the same
   "session expired, please log in again" path — clear the stored token and redirect — rather
   than each screen handling it ad hoc.

## Security requirements

- **Storage**: use the platform's secure storage mechanism (e.g. an encrypted keychain/keystore-backed
  storage library), not plain `AsyncStorage`, for the access token.
- **Never log the token or password** — not in console logs, not in crash-reporting breadcrumbs,
  not in analytics events. See `react-native-security/SKILL.md`.
- **Never put secrets in source** — no hardcoded JWT secret, no hardcoded API keys, even for
  local development convenience.
- Attach the token via a centralized HTTP client interceptor (`react-native-api-integration/SKILL.md`),
  not by manually adding the header at each call site.
- **Avoid leaking account existence or auth details through UI errors** — the backend already
  returns a generic message for login failures; don't "improve" it client-side by guessing
  whether the email exists.
- Don't implement custom cryptography or a custom JWT parser beyond what's needed to read the
  payload for display purposes — use an established, maintained library if decoding is
  needed.
- Registration's `role` field defaults to `CUSTOMER` server-side if omitted — the mobile
  app's registration screen should default to (or hide entirely and implicitly use) the
  `CUSTOMER` role unless there's an explicit product requirement for restaurant-owner or
  driver self-registration through this app.

## Verify before relying on this

`services/auth-service/src/controllers/auth.controller.ts`,
`services/auth-service/src/services/auth.service.ts`, and
`.project-context/07-auth-and-security.md` for the current backlog list — re-check this list
before assuming any "not implemented" item is still missing.
