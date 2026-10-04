---
name: react-native-components
description: Use when creating, modifying, or reviewing any React Native UI component (screens, shared primitives, feature-specific components) in the Delivery Plus mobile client. Covers component states, props design, composition, and file-size/responsibility limits. Pair with react-native-design-system for visual tokens and react-native-accessibility for a11y requirements.
---

# Component Engineering — Delivery Plus

## Three tiers of components

- **Shared UI primitives** (`components/`): Button, TextField, Card, Badge, Spinner, EmptyState,
  ErrorState. No knowledge of any feature/domain. Take data via props only.
- **Shared composite components** (`components/`): built from primitives but still
  domain-agnostic — e.g. a generic `ListScreen` shell with loading/error/empty slots.
- **Feature components** (`features/<name>/components/`): domain-aware — e.g.
  `RestaurantCard`, `MenuItemRow`, `CartLineItem`. These may know about `Restaurant`,
  `MenuItem`, etc. types but still shouldn't contain screen-level layout/navigation.
- **Screen-level components** (`features/<name>/screens/`): compose feature components,
  own the screen's data-fetching hook call and navigation params.

A component belongs one tier lower than you think: if you're about to add a
domain-agnostic component that only ever calls one specific service, it's actually a
feature component.

## Every interactive/data-driven component must consider

- Loading state
- Error state (with a retry action where the operation is retryable)
- Empty state (distinct from error — "no restaurants match your filters" is not an error)
- Disabled state
- Pressed/active state
- Accessibility state (see `react-native-accessibility/SKILL.md`)
- Platform-specific behavior where iOS/Android conventions genuinely differ (don't
  special-case platforms for cosmetic reasons alone)
- Safe area handling for any screen-level or full-bleed component
- Keyboard-aware behavior for anything near a text input
- Touch target sizing — minimum ~44×44pt hit area even if the visual element is smaller
- Responsive behavior across phone sizes; don't hardcode pixel widths for layout

## Avoid

- Components that fetch their own data using an ad-hoc call instead of a shared hook
  (breaks loading/error consistency and duplicates network logic — see
  `react-native-api-integration/SKILL.md`)
- Giant JSX files mixing multiple unrelated responsibilities — split when a component does
  more than one distinct job
- Hardcoded colors, spacing, or font sizes — use theme tokens
  (`react-native-design-system/SKILL.md`)
- Duplicated UI that's really the same component needing a variant prop
- Deeply nested conditional rendering — prefer early returns or small sub-components per
  state (loading/error/empty/content)
- Magic numbers for dimensions — name them or pull from theme spacing/radii scales
- Business logic inside JSX (e.g. computing order totals inline in render) — compute in a
  hook or plain function and pass the result down

## Props design

- Controlled components over uncontrolled where the parent needs the value (forms, toggles)
- Predictable, minimal prop surfaces — prefer a `variant` prop over a pile of boolean flags
  that combine in confusing ways
- Provide sensible defaults; don't require every consumer to pass every prop
- Avoid components that take a `renderX` prop for everything — composition (children) is
  usually clearer than a render-prop explosion

## Verify before relying on this

There's no existing component library in this repo to reconcile with — this skill sets the
starting convention. Once the first feature ships, keep this skill in sync with actual
naming/prop patterns the team settles on rather than letting code and skill drift apart.
