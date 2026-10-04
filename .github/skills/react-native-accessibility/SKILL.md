---
name: react-native-accessibility
description: Use during implementation of any interactive or informational UI component in the Delivery Plus mobile client — apply alongside react-native-components, not as a separate pass afterward.
---

# Accessibility — Delivery Plus

Accessibility is part of building the component, not a follow-up task. When
`react-native-components/SKILL.md` says to consider a component's states (loading, error,
disabled, etc.), each of those states needs an accessible representation too, not just a
visual one.

## Required for every interactive element

- `accessibilityLabel` describing the action/content in plain language (e.g. "Add Margherita
  Pizza to cart", not "Button")
- `accessibilityRole` matching the actual semantic role (`button`, `link`, `header`,
  `search`, etc.)
- `accessibilityState` reflecting real state (`disabled`, `selected`, `busy` for
  loading/in-flight actions)
- Minimum touch target size (~44×44pt), even when the visible glyph/icon is smaller — pad the
  hit area rather than shrinking the target
- Sufficient color contrast — check any red-on-white or white-on-red combination from the
  brand palette (`react-native-design-system/BRANDING.md`) against actual contrast
  guidelines rather than assuming brand colors are automatically accessible
- Support for the OS's dynamic text size setting — avoid fixed-height containers that clip
  text when the user increases font size
- Screen-reader-friendly ordering — verify that visually-adjacent elements are also logically
  adjacent for a screen reader, especially in card/list layouts with overlaid elements (e.g.
  a restaurant card's rating badge shouldn't be announced before the restaurant name)
- Focus handling — after a modal/sheet opens, focus should move into it for screen-reader
  users, and back to the trigger on close

## Forms specifically

- Every input has an associated, visible or accessible label — not a placeholder used as the
  only label (placeholders disappear on input and aren't a reliable accessible name)
- Validation errors are announced (e.g. associated with the field via accessible error text,
  not color alone) — never rely on color alone to indicate an error state
- Error messages are specific and actionable ("Password must be at least 8 characters", not
  "Invalid input")

## Content and status

- Loading states should be announced to screen readers (e.g. an accessible "loading" live
  region), not just a visual spinner
- Empty states (e.g. "No restaurants match your filters") should be readable content, not an
  image-only illustration with no text equivalent
- Order-status changes on the tracking screen should be perceivable without relying solely on
  a moving map/icon — include a text status alongside any visual indicator

## Verify before relying on this

Platform accessibility APIs evolve; check the current React Native accessibility props
documentation for the exact prop names/values supported by the RN version the mobile app
ends up using.
