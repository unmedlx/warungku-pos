---
name: KanPOS
description: Two grammars, one system — a dipped brand field for money screens, a colored service grid for choosing screens.
colors:
  brand: "hsl(227 57% 48%)"
  brand-on: "hsl(0 0% 100%)"
  brand-text: "hsl(227 57% 48%)"
  brand-dim: "hsl(225 73% 90%)"
  brand-press: "hsl(227 59% 40%)"
  brand-deep: "hsl(227 60% 26%)"
  ground: "hsl(220 43% 97%)"
  ink: "hsl(224 39% 10%)"
  surface: "hsl(0 0% 100%)"
  sunken: "hsl(220 36% 95%)"
  ink-muted: "hsl(222 16% 41%)"
  ink-faint: "hsl(221 12% 46%)"
  hairline: "hsl(219 33% 92%)"
  field-stroke: "hsl(219 32% 86%)"
  danger: "hsl(4 74% 49%)"
  danger-text: "hsl(4 76% 40%)"
  ok: "hsl(152 82% 39%)"
  ok-text: "hsl(155 90% 24%)"
  warn: "hsl(34 94% 50%)"
  warn-text: "hsl(22 92% 37%)"
  info: "hsl(191 94% 43%)"
  info-text: "hsl(195 82% 31%)"
  cat-1: "hsl(227 57% 48%)"
  cat-1-bg: "hsl(224 70% 95%)"
  cat-1-on: "hsl(227 59% 40%)"
  cat-2: "hsl(152 82% 39%)"
  cat-2-bg: "hsl(150 56% 93%)"
  cat-2-on: "hsl(155 90% 24%)"
  cat-3: "hsl(34 94% 50%)"
  cat-3-bg: "hsl(36 89% 93%)"
  cat-3-on: "hsl(22 92% 37%)"
  cat-4: "hsl(4 86% 58%)"
  cat-4-bg: "hsl(5 86% 95%)"
  cat-4-on: "hsl(4 76% 40%)"
  cat-5: "hsl(252 92% 66%)"
  cat-5-bg: "hsl(252 91% 96%)"
  cat-5-on: "hsl(257 72% 50%)"
  cat-6: "hsl(191 94% 43%)"
  cat-6-bg: "hsl(191 69% 92%)"
  cat-6-on: "hsl(195 82% 31%)"
  dark-ground: "hsl(223 41% 7%)"
  dark-ink: "hsl(218 44% 95%)"
  dark-surface: "hsl(223 34% 12%)"
  dark-sunken: "hsl(222 31% 15%)"
  dark-ink-muted: "hsl(221 18% 66%)"
  dark-ink-faint: "hsl(222 15% 60%)"
  dark-hairline: "hsl(223 28% 20%)"
  dark-field-stroke: "hsl(223 26% 26%)"
  dark-brand-text: "hsl(227 85% 79%)"
typography:
  display:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
  headline:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "1.84rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
  title:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "1.44rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "1.12rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  body-sm:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  amount:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "0.95rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  label:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  label-micro:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "0.65rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  2xl: "18px"
  3xl: "24px"
  4xl: "32px"
  pill: "9999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  page-x: "16px"
  page-bottom: "112px"
  nav-h: "56px"
components:
  money-panel-screen:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-on}"
    rounded: "{rounded.3xl}"
    padding: "12px 16px 20px"
  money-panel-card:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-on}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  money-panel-label:
    textColor: "{colors.brand-dim}"
    typography: "{typography.body-sm}"
  money-panel-amount:
    textColor: "{colors.brand-on}"
    typography: "{typography.display}"
  action-bar:
    backgroundColor: "{colors.surface}"
    rounded: "0px"
    padding: "10px 16px"
  action-button:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-on}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "54px"
  action-button-active:
    backgroundColor: "{colors.brand-press}"
  action-button-disabled:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-faint}"
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-on}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-primary-active:
    backgroundColor: "{colors.brand-press}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-on-brand:
    backgroundColor: "rgb(255 255 255 / 0.15)"
    textColor: "{colors.brand-on}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    size: "36px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  service-tile:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "12px 4px"
  service-tile-icon:
    backgroundColor: "{colors.cat-1-bg}"
    textColor: "{colors.cat-1-on}"
    rounded: "{rounded.2xl}"
    size: "48px"
  category-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  category-chip-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-on}"
  segment-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  segment-item-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-on}"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-faint}"
    rounded: "0px"
    height: "56px"
  bottom-nav-active:
    textColor: "{colors.brand-text}"
  bottom-nav-cashier:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-on}"
    rounded: "{rounded.2xl}"
    size: "50px"
---

# Design System: KanPOS

## Overview

**Creative North Star: "Dibagi Per Peran" (Divided By Role)**

Two grammars, one system. Screens whose job is *money* — kasir, pembayaran, laporan, kasbon, pengeluaran — speak the **wallet grammar**: the brand color arrives as a fully dipped field at the top of the screen, the amount is the screen's object rather than a caption beside a label, and a thick full-width action row waits at the thumb line above the nav. Screens whose job is *choosing* — beranda, menu, stok, pengaturan — speak the **tile grammar**: a grid of colored service tiles where the color is not decoration but an identifier system, one concern holding one color everywhere it appears.

What binds them into one app rather than two is deliberately small: one radius scale, one typeface, and **one** elevation level. Density is consumer-app density, not desktop-dashboard density: 44–54px touch targets, 16px page gutters, 8px as the default gap. The craft bar is the Indonesian consumer super-app (Gojek/GoPay) — their grammar was taken, never their brand colors. Brand blue `hsl(227 57% 48%)` (#3554C1) is a locked user constraint.

The build serves a warung owner on a low-end Android phone, one-handed, often in direct sunlight, often offline. That is why the display face is self-hosted rather than fetched, why there is exactly one authored motion beat, and why nothing in app chrome pays a per-frame cost. Confirmed rejection: the uniform neutral shadcn card grid where every screen looks the same and no single object leads.

**Key Characteristics:**
- Brand color as a dipped *field*, not an accent stroke
- Money set tabular, extra-bold (800), with negative tracking
- Six-color category identifier system, reused across tiles, chips, thumbnails, and lists
- One elevation level; one separation mechanism per theme
- Drawn (Lucide) icons only, never emoji, never glyph characters
- Flat fields: no gradients, no glass, no stacked shadows

## Colors

A cool blue-grey world with one saturated brand blue and a six-hue identifier set that carries all the color variety the app needs.

### Primary
- **Kan Blue** (`{colors.brand}`): the dipped field. It fills whole panels, the active category chip, the active segment, the action-row button, and the raised cashier button in the nav. It is never reduced to a thin stroke on money screens.
- **Kan Blue as Ink** (`{colors.brand-text}` / `{colors.dark-brand-text}`): the brand when it is *text or icon on ground* rather than a field — active nav labels, link buttons. In dark mode this is raised to a light tint because the field-strength blue is unreadable as text on a dark surface.
- **Brand Haze** (`{colors.brand-dim}`): secondary text *on* the dipped field — panel labels, footer meta, the "Rp" prefix. Tinted from the brand's own hue, never grey.
- **Brand Press** (`{colors.brand-press}`) and **Brand Deep** (`{colors.brand-deep}`): the pressed state and the shadow color of brand-filled elements.

All five brand derivations are **computed at runtime**, not literal: the accent is user-selectable across nine hues (`use-theme-color.ts`), and `applyThemeColor` recomputes `--primary-text`, `--primary-dim`, `--primary-press`, and `--primary-deep` from whatever hue is chosen. Any new brand derivation must be added to that function, not hard-coded in CSS.

### Secondary — the category identifier set
Six tones, each with **three roles**: `cat-N` is the solid fill (dots, bars, badges), `cat-N-bg` is the tint surface, `cat-N-on` is the ink *on that tint* — darkened specifically so icons and text inside a tile clear 3:1.

- **Tone 1 Blue** (`{colors.cat-1}`), **Tone 2 Green** (`{colors.cat-2}`), **Tone 3 Amber** (`{colors.cat-3}`), **Tone 4 Red** (`{colors.cat-4}`), **Tone 5 Violet** (`{colors.cat-5}`), **Tone 6 Cyan** (`{colors.cat-6}`).

### Tertiary — status
- **Danger / OK / Warn / Info** (`{colors.danger}`, `{colors.ok}`, `{colors.warn}`, `{colors.info}`): solid fills that carry white text. Each has a `-text` sibling (`{colors.danger-text}` etc.) that is the only version allowed as ink on a light surface, and a `-tint` surface for strips and badges.

### Neutral
- **Ground** (`{colors.ground}` / `{colors.dark-ground}`): the page behind everything.
- **Surface** (`{colors.surface}` / `{colors.dark-surface}`): cards, the action bar, the bottom nav.
- **Sunken** (`{colors.sunken}` / `{colors.dark-sunken}`): pressed/secondary fills, card footers, tracks.
- **Ink** (`{colors.ink}`), **Ink Muted** (`{colors.ink-muted}`, 4.9:1 on surface), **Ink Faint** (`{colors.ink-faint}`, 4.60:1 on *ground* — the third tier exists for genuinely secondary meta and is set one step darker than convention because this meta appears on both card and page background, and the lighter value failed on ground).
- **Hairline** (`{colors.hairline}`) for dividers; **Field Stroke** (`{colors.field-stroke}`) for input borders.

### Named Rules

**The Dipped Field Rule.** On money screens the brand is a field, not an accent. One dipped panel per screen — never two. Secondary text on that field uses Brand Haze, tinted from the brand's own hue; grey on blue reads dirty and drops below 4.5:1 at every accent option.

**The Unlit Dark Field Rule.** The brand field is *not* lightened in dark mode. Lightening it drops white-on-brand from 6.6:1 to 4.9:1. The locked blue is used as-is; only its *text* derivation is raised.

**The Three Roles Rule.** A category tone is never used as a single value. Solid fill, tint surface, and ink-on-tint are three separate tokens, and ink on a tint is always the `-on` value — never the solid.

**The Row-ID Tone Rule.** A category's tone comes from its row id (`toneForId`), not from hashing its name. Name hashing collapsed the real product grid to one hue — "Makanan" and "Minuman" landed on the same color and the identifier system died exactly where it was needed. `toneForName` is a documented fallback for records that have nothing but a name. Fixed destinations (routes, note types) are listed in `ROUTE_TONE`, never guessed at the call site.

**The Six-Tone Ceiling.** Six tones means a seventh category repeats a color. That limit is deliberate and recorded: repeating beats adding hues until nothing is recognizable.

## Typography

**Display / Body Font:** Hanken Grotesk (self-hosted variable, weight axis 400–800), falling back to the platform UI stack.
**Mono:** JetBrains Mono, used only where a monospace is genuinely needed.

**Character:** One grotesk for everything, carrying the whole hierarchy on weight and size rather than on a second face. Money is set at the top of the weight axis (800) with negative tracking so an amount reads at arm's length, standing up, in sunlight.

The face is self-hosted at `/fonts/hanken-grotesk-var-latin.woff2` — one variable file, `font-weight: 400 800`, latin subset — because the app is offline-first and its money objects are set at 800. A remote font makes the app's voice depend on the network its own scenario lacks, and an undeclared 800 gets browser-synthesized into a bloated fake bold that reads cheap.

The root size is fluid: `clamp(0.9375rem, 0.25rem + 3vw, 1.125rem)`, ~15.25px on a phone and 18px on a tablet. Every scale step below is expressed in rem against that root, so the whole ramp — icons included — grows together.

### Hierarchy
- **Display** (800, 2.6rem, 1.02, −0.035em, tabular): the hero amount on a dipped screen panel. One per screen.
- **Headline** (800, 1.84rem, 1.05, −0.035em, tabular): the screen's single lead metric — a dipped card amount, a report total.
- **Title** (600, 1.44rem, −0.02em): screen-entry titles on standalone surfaces (login, auth, onboarding).
- **Heading** (700, 1.12rem, −0.02em): the page header title and dialog/section titles.
- **Body** (400, 1rem) and **Body Small** (500, 0.85rem): running text, list rows, chip and segment labels.
- **Amount** (700, 0.95rem, −0.02em, tabular): the running total inside an action button and inline money in lists.
- **Label** (600, 0.72rem, −0.01em): nav labels, tile labels, subtitles.
- **Micro Label** (600, 0.65rem, +0.04em): column labels for a stat row (MASUK / KELUAR / KASBON) and small counters. Uppercase only in this role.

### Named Rules

**The Tabular Money Rule.** Every number that represents money is `tabular-nums` and never lighter than 600. `MoneyDisplay` and `MoneyPanelAmount` own the ramp; `th`/`td` inherit tabular figures globally so columns of numbers line up.

**The Rp Rule.** The currency prefix is dimmed by *size and weight* (0.8em, 600), never by opacity — opacity mixes it with whatever is behind it, and these amounts stand on a dipped brand field.

**The Micro Label Rule.** The uppercase tracked micro label is a *column label for numbers*. It is not a kicker or an eyebrow: never place it above a heading to announce a category.

## Layout

A single-column phone app inside a page container of 16px side gutters (`px-4`, 32px from `md`), 8px top padding, and 112px of bottom padding so content clears the sticky action bar and the fixed nav.

The vertical rhythm is tight and consumer-app dense: **8px is the default gap** (by far the most used), with 6px for icon-to-label pairs, 12px between list rows, and 16px between major sections. Card padding is 16px (`p-4`) for standalone cards and 12px (`p-3`) for dense rows.

Chrome heights are declared once on `html` so pages that compute their own height do not guess: `--app-nav-h: 3.5rem` for the bottom nav, plus `--app-safe-top` / `--app-safe-bottom` from the safe-area insets. **Safe-area padding is applied once, at the root** — components must not add it again or notched phones get a double gap.

Grids: the tile grid is 4 columns on a phone (6 at `md`, 8 at `lg`) — the width at which a two-word label still fits one line in all three languages. The product grid is 3 columns on a phone (4 at `md`, 5 at `lg`). Horizontal strips (category chips, segments) bleed to the screen edge with `-mx-4 px-4` and hide their scrollbar.

Screens carrying the wallet grammar are a fixed three-part column: dipped panel at the top, scrolling content in the middle, sticky action bar at the bottom.

## Elevation & Depth

**One level.** There is exactly one shadow value in the system, and every legacy alias (`xs`, `sm`, `md`, `lg`, `xl`, `card`, `soft*`, `elevated`) is deliberately mapped to that same value so scattered old classes render identically. The only real alternatives are `none` and the brand variant.

Separation is theme-dependent and singular: **light separates with a shadow and no border; dark separates with a border and no shadow.** Never both. A 1px border plus a 24px shadow is the clearest sign a card was assembled rather than designed, and in dark mode the shadow is not readable anyway. This is implemented identically in `Card`, in `.surface`, and on every floating surface.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)`): the one elevation. Cards, floating surfaces. Light theme only.
- **Lift Brand** (`box-shadow: 0 2px 4px hsl(var(--primary-deep) / 0.18), 0 14px 28px -16px hsl(var(--primary-deep) / 0.55)`): depth under brand-filled elements — the action button, the primary button, the dipped money card, the raised cashier nav button. Built from `--primary-deep`, so it stays correct at any accent.
- **Destructive** (`box-shadow: 0 2px 4px hsl(var(--destructive) / 0.18), 0 14px 28px -16px hsl(var(--destructive) / 0.5)`): the same treatment under a destructive fill.

### Named Rules

**The One Mechanism Rule.** One separation mechanism per theme. Light: shadow, `border-transparent`. Dark: `border-border`, `shadow-none`. A surface that ships both is a defect, not a variant.

**The No-Chrome-Blur Rule.** No `backdrop-blur` in app chrome. The page header and the bottom nav sit on solid surfaces because blur costs a frame on every scroll in a low-end Android WebView and cuts contrast in sunlight. (Modal, dialog, and sheet *scrims* do use a 2px blur — that is a one-shot overlay, not scrolling chrome, and it is part of the shipped world.)

## Shapes

One radius scale for the whole app, written as multiples of `--radius` (12px) so changing one number moves the system proportionally:

- **4px / 6px** (`xs` / `sm`): the smallest inline marks — tiny tags, tick marks.
- **10px** (`md`): small icon buttons.
- **12px** (`lg`): the control radius — buttons, inputs, segments, the action button.
- **14px** (`xl`): cards, list rows, product thumbnails.
- **18px** (`2xl`): service tiles, tile icon plates, sheets, dialogs, the raised cashier nav button.
- **24px** (`3xl`): the dipped brand panel — applied to its *bottom* corners only when it is anchored to the top of the screen.
- **Pill** (`9999px`): category chips and count badges only.

Everything is soft-cornered; nothing in the system is square. Borders are hairlines (1px) and exist as *separation*, not as decoration — on the dipped field the only rule is `border-white/20`, drawn from transparent white so it follows any accent.

## Components

### Buttons
- **Shape:** control radius (12px); `pill` is an explicit opt-in.
- **Primary:** brand fill, white ink, brand-deep shadow, weight 600 at 44px default height — one step larger than desktop habit, because this is a thumb in sunlight, not a cursor.
- **Active / Focus:** press scales to 0.98 and swaps to Brand Press; focus-visible draws a 3px ring at `ring/30`. Every interactive element in the system uses that same 3px ring.
- **Outline / Secondary / Ghost:** transparent or sunken fill with a field stroke, focus shifting the border to brand.
- **On-Brand:** for actions sitting *on* the dipped field — `white/15` fill, white ink. The only correct button inside a brand panel.
- **Sizes:** 28 / 36 / 44 / 48 / 54px, plus square icon variants. 54px (`xl`) is reserved for the action row.

### Chips
- **Category chip:** 36px pill, surface fill, hairline border, muted ink, with a 6px tone dot on the left that is the same color as that category's product thumbnails and menu tile.
- **Selected:** fully dipped in brand with white ink and a `white/75` dot — not a thicker border. On a screen used hundreds of times a day, the selected state has to read from the corner of the eye.
- **Segment:** same 36px height, control radius instead of a pill, active segment dipped in brand. A grey pill on a grey track is exactly the neutral treatment this world rejects.

### Cards / Containers
- **Corner:** 14px. **Background:** surface. **Padding:** 16px (12px for dense rows).
- **Shadow / Border:** the One Mechanism Rule — shadow in light, border in dark.
- **Footer:** a sunken strip (`muted/50`) separated by a hairline, with bottom corners matched to the card.

### Inputs / Fields
- **Style:** 36px, control radius, transparent fill with a field-stroke border (`input/30` fill in dark), `text-base` on small screens so iOS does not zoom on focus.
- **Focus:** border shifts to brand plus the 3px `ring/30` ring.
- **Invalid:** destructive border, destructive-text ink, 3px `destructive/20` ring. **Disabled:** 60% opacity, no pointer events.

### Navigation
- **Bottom nav:** fixed, 56px, solid surface with a top hairline, five slots. Icons are drawn and already solid-styled, so the active state is carried by brand-as-ink on icon *and* label — no separate pill or indicator, which would only restate a state already visible.
- **Cashier slot:** a 50px brand-dipped square (18px radius) lifted above the bar with a 3px surface-colored border so its silhouette holds in both themes. Its *label* follows the same active rule as every other item — the button is always dipped because it is the primary action, not a state.

### Money Panel (signature)
The wallet grammar's object. A fully dipped brand field carrying a small Brand Haze label, the hero amount, and an optional footer (meta left, one link right, divided by a `white/20` hairline). `variant="screen"` anchors to the top of the screen with only its bottom corners rounded; `variant="card"` stands as a card mid-page with the brand shadow. Flat field: no gradient, no glass — depth comes from the brand shadow.

### Action Bar (signature)
The wallet grammar's other half: a sticky, surface-filled bar with a top hairline holding one 54px brand button, action label left, running amount right — the reading order of a receipt. **At most one per screen**; two action rows means no primary action. It adds no safe-area padding of its own.

### Service Tile (signature)
The tile grammar's object. A 48px rounded-square icon plate filled with the category's tint and drawn in that tint's `-on` ink, a two-line-safe label beneath, inside a 4-column grid. Counts render as a pill badge positioned **inside** the plate's bounds.

### Named Rules

**The Inside Badge Rule.** Badges sit inside their container, never hung outside it. Outer badges get clipped by scroll containers and by the page's own padding edge.

**The One Beat Rule.** The app has exactly one authored motion beat: `amount-land` (`translateY(0.22em) scale(0.97)` → rest, 420ms, `cubic-bezier(0.16, 1, 0.3, 1)`), fired when a money value changes. It starts from a state that is already visible — opacity is never animated — so the number cannot disappear if the animation does not run, and it touches transform only. Everything else is a state transition (colors, a 0.98 press scale), and `prefers-reduced-motion` flattens all of it globally.

## Do's and Don'ts

### Do:
- **Do** pick the grammar by the screen's job: money screens get a dipped panel plus an action bar; choosing screens get the tile grid.
- **Do** derive a category's tone from its row id via `toneForId`, and register fixed destinations in `ROUTE_TONE`.
- **Do** use all three tone roles correctly: solid for marks, `-bg` for the surface, `-on` for anything drawn on that surface.
- **Do** use Brand Haze (`{colors.brand-dim}`) for secondary text on a dipped field, never a grey.
- **Do** separate a surface one way only: shadow in light, border in dark.
- **Do** set every money number tabular, at 600 or heavier.
- **Do** add any new brand derivation to `applyThemeColor`, so it survives all nine user-selectable accents.
- **Do** keep badges and counters inside their container's bounds.
- **Do** give interactive elements the standard 3px focus ring and a 44px minimum touch target.

### Don't:
- **Don't** lighten the brand field in dark mode — it lowers white-on-brand contrast from 6.6:1 to 4.9:1. Raise the text derivation instead.
- **Don't** put a border and a shadow on the same surface.
- **Don't** ship more than one dipped money panel or more than one action bar per screen.
- **Don't** use `backdrop-blur` on scrolling app chrome (headers, nav, bars).
- **Don't** use gradients, glass fills, or stacked/multi-level shadows — there is one elevation.
- **Don't** hard-code a brand derivative as a literal HSL in CSS.
- **Don't** hash a category name for its color when a row id exists.
- **Don't** add a seventh category hue; repeating a tone is the recorded trade.
- **Don't** use emoji or text glyphs as icons — icons are drawn (Lucide) at 18px or 22px.
- **Don't** animate anything beyond the one `amount-land` beat and ordinary state transitions.
- **Don't** hang a badge outside its container, and don't add safe-area padding in a component — the root already applied it.
- **Don't** use the uppercase micro label as a kicker or eyebrow above a heading.

## Provenance

**Approved comp.** `frontend/docs/redesign-superapp-mockup.html` is the approved comp for this world; the user approved it before implementation, and it is the spec a future run should read alongside this file.

**Suppression caveat.** `.impeccable/config.json` carries four detector suppressions (`low-contrast`, `clipped-overflow-container`, `cramped-padding`, `dark-glow`) scoped to that same mockup file. Because that file is also the design spec, those suppressions remove the only mechanical guard over the spec artifact — a future run must not read those four rules as verified clean on it.

**Shipped evidence.** Seven real-app captures at 390×844 @2x in `frontend/.impeccable/review/` (beranda, kasir, kasir-kosong, kasir-gelap, laporan, kasbon, produk), plus `mockup.png`.

**Known drift, not repaired and not canonized.** (1) On a fresh store, Beranda's first viewport is taken by the "Siapkan toko" checklist, pushing the dipped profit/loss panel below the fold — the first viewport contract is not met in that state. (2) The native date input on Laporan renders unthemed, in US month-first order. Neither is a design-system rule.
