---
name: react-native-forms
description: Use for any input form in the Delivery Plus mobile client — registration, login, profile edit, restaurant/menu management (owner-facing), address or checkout inputs. Covers validation, server-error mapping, and submission safety.
---

# Forms and Validation — Delivery Plus

## Typed form models

Every form has an explicit TypeScript type for its values, matching the shape the backend
DTO actually expects (see `react-native-api-integration/API-CONTRACT.md`) — e.g. a
registration form's values type should mirror `RegisterDto`
(`email`, `password`, `fullName`, `phone?`, `role?`), not an ad-hoc shape that gets
transformed at the last second.

## Client-side validation should mirror backend constraints, not invent stricter ones

Verified backend constraints (`services/auth-service/src/dto`):
- `email`: must be a valid email (`@IsEmail`)
- `password`: string, minimum 8 characters
- `fullName`: required string
- `phone`: optional string, no verified format constraint — don't invent a stricter phone
  regex than the backend enforces
- `role`: one of `CUSTOMER`, `RESTAURANT_OWNER`, `DRIVER`, `ADMIN`

Validate these client-side for fast feedback, but always handle the server's own validation
error as the actual source of truth — a client-side check passing doesn't guarantee the
server accepts it (e.g. `409` on a duplicate email can only be known server-side).

## Required behavior

- **Field-level errors**, not just a single form-level error banner, for validation failures
  the client can attribute to a specific field.
- **Server error mapping**: map the backend's `ErrorResponse.message` to the form (e.g. show
  the 409 "Email already registered" message near the email field on registration; show the
  generic 401 message as a form-level error on login, since the backend deliberately doesn't
  say which field was wrong — don't attribute it to one field yourself).
- **Disable submit while a request is in flight**, and **prevent duplicate submissions**
  (e.g. disable the button after first tap, don't just rely on a loading spinner that a fast
  double-tap can race).
- **Loading indicator** on the submit action itself, not just a full-screen spinner, so the
  rest of the form stays visible.
- **Accessible labels** for every input (see `react-native-accessibility/SKILL.md`).
- **Keyboard handling**: appropriate `keyboardType` (email, numeric for phone/quantity),
  `returnKeyType`/focus-chaining between fields, and screen scrolling/avoiding so the active
  field isn't hidden behind the keyboard.
- **Correct input types**: email keyboard for email fields, secure text entry for password,
  numeric input for quantities/phone where appropriate.
- **Password fields**: secure entry by default; a show/hide toggle is fine but must not log
  or persist the plaintext value anywhere.
- **Consistent error presentation** across all forms in the app — one shared error-message
  component/style, not a different pattern per screen.

## Avoid

- Duplicating the same validation rule (e.g. "password min 8 chars") independently in
  multiple components — centralize per-field validators and reuse them across every form that
  needs that field.
- Silently swallowing a submission failure — every failure path must reach the user in some
  form (field error, form error, or toast), never a request that just fails with no visible
  feedback.

## Verify before relying on this

The actual DTO files under `services/*/src/dto` for the form in question — validation rules
above are current as of this task but could change if the backend DTOs change.
