---
name: react-native-design-system
description: Use whenever choosing or applying colors, spacing, typography, radii, shadows, icon sizing, or component dimensions in the Delivery Plus mobile client, or when centralizing these into a theme/token system. Read BRANDING.md in this same directory first for the verified brand colors and logo usage rules before picking any color value.
---

# Delivery Plus Design System — React Native

## Source of truth for branding

Read `BRANDING.md` in this folder before choosing any color. It records the exact colors
measured from the real Delivery Plus logo assets (`assets/logo.png`, `assets/icon.png` in
this repo). Do not invent brand colors that aren't in that document.

## Visual direction

Red + white, clean, modern, food-delivery oriented, high contrast, friendly but
production-grade — matching the existing repository README's own badge styling (red accent
badges on white) and the logo itself (solid red circular mark, off-white/cream package
detail, red wordmark).

## Token categories to centralize

Don't scatter hex values or magic numbers through components. Centralize:

- **Brand**: primary (brand red), primary-on / primary-foreground (text/icon color on top of
  primary), secondary/accent if a second color is introduced later
- **Surface**: background, elevated surface (cards), overlay
- **Text**: primary text, secondary/muted text, text-on-primary, disabled text
- **Semantic**: success, warning, error, info — pick colors with sufficient contrast against
  both surface colors; error should be distinguishable from the brand red at a glance (don't
  reuse brand red as the error color even though both are "red" conceptually)
- **Border/divider**
- **Elevation/shadow** — a small scale (e.g. none/low/medium/high), platform-appropriate
  (iOS shadow props vs. Android `elevation`)
- **Spacing scale** — a consistent step scale (e.g. 4/8/12/16/24/32/48), not arbitrary
  per-component values
- **Typography scale** — a small set of named sizes/weights (e.g. display, title, body,
  caption), not ad-hoc `fontSize` per component
- **Radii** — a small scale (e.g. sm/md/lg/pill), consistent with the logo's own rounded,
  friendly circular mark
- **Icon sizing** — a small fixed scale (e.g. 16/20/24/32)
- **Component dimensions** — minimum touch target, standard button height, input height

## Suggested file layout

```
theme/
  colors.ts
  spacing.ts
  typography.ts
  radii.ts
  shadows.ts
  index.ts
```

Adapt filenames to whatever the eventual React Native/styling stack expects (e.g. a single
`theme.ts` if using a library with its own theming convention) — the point is one source of
truth per token category, not these exact filenames.

## Dark mode

No dark mode exists today (the backend has no user preference for it, and no product
requirement was given for this task). Structure tokens as named semantic values (e.g.
`colors.background`, not raw `#FFF` inline) so a dark palette could be added later without
restructuring every component, but do not build a dark theme now — that would be scope this
task explicitly excludes.

## Rules

- Components consume theme tokens, never raw hex/pixel values, except inside the theme files
  themselves.
- Don't hardcode the brand red inline in a component — import `colors.primary`.
- If a new color is needed that isn't in `BRANDING.md`, derive it as a tint/shade of an
  existing token (e.g. a lighter tint of primary for a pressed state) rather than picking an
  arbitrary new hex value.

## Verify before relying on this

`BRANDING.md` in this folder, and the actual logo files at `assets/logo.png` /
`assets/icon.png` in the repository root, if either is ever redesigned.
