# Delivery Plus — Branding Reference

This document records only what was verified directly from the repository's actual asset
files and the additional high-resolution asset provided alongside this task. Nothing here is
invented.

## Verified logo assets

| File | Location | Dimensions | Notes |
|---|---|---|---|
| `logo.png` | `assets/logo.png` (repo root) | 578×141 PNG, RGBA | Combined logomark + "Delivery Plus" wordmark, transparent background. This is the exact file used in the repository's own `README.md` (`<img src="./assets/logo.png" ...>`). **Byte-identical** to the `logo.png` file provided with this task (same MD5 checksum) — confirmed as the same asset, not a redraw. |
| `icon.png` | `assets/icon.png` (repo root) | 126×127 PNG, RGBA | Icon-mark only (the red circular badge with the parcel graphic), no wordmark. Used as a small inline icon in the repo's own README/docs styling. |
| `high-resolution-color-logo.png` | provided with this task, **not currently committed to the repository** | 800×800 PNG, RGBA, off-white (`#FFFCFC`) background (not transparent) | Same combined logomark + wordmark composition as `assets/logo.png`, at much higher resolution and centered on a square canvas with an off-white fill instead of transparency. Not byte-identical to any existing repo file — treat as a supplementary high-res export of the same design, suitable as a source for app-icon/splash-screen generation, not as a replacement for the repo's own `logo.png`. |

No SVG source files exist in the repository or were provided; both official assets are PNG
raster images. If a future task needs vector source, it should be requested/created from a
designer rather than approximated by tracing the raster — do not fabricate an SVG "recreation"
and present it as official.

## What the logo depicts

A solid red circular badge containing a hand-drawn, slightly rotated parcel/package icon
(cream/tan fill with dark outline and motion lines), followed by the wordmark "Delivery Plus"
in a red, hand-lettered-style display typeface.

## Verified colors (sampled directly from the pixel data of both official PNGs)

| Token | Hex | Where it appears |
|---|---|---|
| Brand red (primary) | `#FF0000` | Circular badge fill and wordmark |
| Package tan | `#E4C98C` | Parcel icon fill inside the badge |
| Canvas / light background | `#FFFCFC` (near-white, warm) | Background of the high-res export; the small `logo.png` uses a transparent background instead |

These are the only colors with meaningful pixel coverage in the source files; everything else
sampled was anti-aliasing (intermediate red/pink shades blending the red mark into the
transparent/white background) and is not a distinct brand color.

No other brand colors (secondary accent, specific success/warning/error hex values) are
verifiable from the repository. **Do not invent them.** When the design system needs a
secondary or semantic color, choose one deliberately (see `SKILL.md` in this folder for
guidance) and record the decision here once made, so it becomes verifiable for future work
instead of re-guessed each time.

## Derived and semantic colors (decided 2026-09-30)

Not from the logo — chosen deliberately and implemented in `src/constants/theme.ts` (`BrandColors`).
Change them there and here together.

| Token | Hex | Why |
|---|---|---|
| `primaryPressed` | `#D90000` | Pressed state for brand-red fills (shade of primary). |
| `primaryText` | `#D70000` | Red **text/icons** on light surfaces. `#FF0000` on white is ~4.0:1, below WCAG AA 4.5:1 for body text; this shade is ~5.4:1. Brand `#FF0000` stays the fill color for buttons and badges. |
| `primarySoft` | `#FFEDED` | Tinted backgrounds (selected chips, icon wells, unread rows). |
| `tanSoft` | `#FAF3E3` | Image placeholders — tint of package tan. |
| `surface` / `surfaceMuted` | `#FFFFFF` / `#F6F3F3` | Cards / pressed and muted fills on the `#FFFCFC` canvas. |
| `text` / `textSecondary` / `textMuted` | `#1A1A1A` / `#60646C` / `#8A8F98` | Text hierarchy. `textMuted` is for icons and placeholders only, not body text. |
| `border` / `divider` | `#E0E1E6` / `#EFEFF2` | Hairlines. |
| `danger` / `dangerSoft` | `#B42318` / `#FEF3F2` | Errors. A deep crimson so it reads differently from brand red, and always paired with an icon. |
| `success` / `successSoft` | `#067647` / `#ECFDF3` | Delivered, open, confirmations. |
| `warning` / `warningSoft` | `#B54708` / `#FFFAEB` | Busy restaurant, awaiting payment. |
| `info` / `infoSoft` | `#175CD3` / `#EFF8FF` | Neutral progress states. |

The app is **light-only**: `app.json` sets `userInterfaceStyle: "light"` and `Colors.dark` mirrors light,
because no dark-surface variant of the wordmark exists (see below).

## Usage guidance

- **Primary lockup** (`logo.png` / the high-res export): app splash screen, onboarding,
  about/settings screen, marketing surfaces. Requires enough width to render the wordmark
  legibly — don't scale below roughly 160px wide.
- **Icon mark only** (`icon.png` or a crop of the badge from the high-res export): app icon,
  favicon-equivalent, compact navigation header space, push-notification icon.
- **Light backgrounds**: both assets are designed for light/white backgrounds (the wordmark
  is red-on-transparent/white). This is the only verified usage — no dark-background variant
  exists.
- **Dark backgrounds**: not verified. Do not place the current wordmark asset directly on a
  dark surface without checking contrast — the current asset was not tested against dark
  backgrounds, and no alternate (white/light) version of the wordmark exists in the repo.
  If a dark-mode surface is ever built, request or generate a light-colored wordmark variant
  rather than guessing one.
- **Clear space**: no official clear-space spec exists. Use a conservative default — pad the
  logo by at least the height of the circular badge on all sides — until a real spec is
  provided.
- **Do not** redraw, recolor, or reproportion either asset. Do not generate a new logo for
  the mobile app "in the style of" this one.

## Where these should live in the mobile app

Copy `assets/logo.png` and `assets/icon.png` from the repository root into the mobile app's
own asset folder (e.g. `src/assets/brand/`) rather than referencing the backend repo's path
directly, once the mobile app exists as its own package. Use the 800×800 high-res export as
the source when generating platform app-icon sizes (iOS/Android icon generation tooling
generally wants a large square source).
