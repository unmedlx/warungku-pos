<!-- Superdesign init — generated for `dashboard` -->
# Extractable Components — `dashboard` (owner multi-store dashboard)

## Layout Components

## Sidebar
- Source: `src/components/Sidebar.tsx`
- Category: layout
- Description: Left nav with grouped items (Laporan / Akun), store health indicator, and user avatar
- Extractable props: activeTo (string), health (object), collapsed (boolean, default: false)
- Hardcoded: `NavItem` list, Lucide icons, group labels, `initials()` avatar logic, widths

## Login
- Source: `src/components/Login.tsx`
- Category: layout
- Description: Full-screen auth gate shown before the dashboard shell
- Extractable props: error (string), loading (boolean)
- Hardcoded: logo, copy, field labels, card width

## ReportHeader
- Source: `src/components/ReportHeader.tsx`
- Category: layout
- Description: Page header for report screens — title plus date-range context
- Extractable props: title (string), subtitle (string)
- Hardcoded: typography scale, spacing

## Basic Components

## Common (primitive set)
- Source: `src/components/Common.tsx`
- Category: basic
- Description: This app's shared primitives live in one file — cards, pills, buttons, section wrappers
- Extractable props: variant, size (per exported primitive)
- Hardcoded: all Tailwind class strings and color tokens

## Logo
- Source: `src/components/Logo.tsx`
- Category: basic
- Description: Kankitu mark
- Extractable props: none
- Hardcoded: SVG paths, viewBox

## RangeControls
- Source: `src/components/RangeControls.tsx`
- Category: basic
- Description: Date-range selector driving every report on the page
- Extractable props: activeRange (string, default: "7d")
- Hardcoded: preset range options and labels

## AttentionChips
- Source: `src/components/AttentionChips.tsx`
- Category: basic
- Description: Row of alert chips surfacing stores needing attention
- Extractable props: none (data-driven)
- Hardcoded: severity color tokens, chip radius, icons

## ProfitHero
- Source: `src/components/ProfitHero.tsx`
- Category: basic
- Description: Large headline metric block at the top of Ringkasan
- Extractable props: none (data-driven)
- Hardcoded: value typography, delta arrow icons, background treatment

## TrendChart
- Source: `src/components/TrendChart.tsx`
- Category: basic
- Description: Line/area trend chart
- Extractable props: none (data-driven)
- Hardcoded: series colors, grid, tooltip styling

## HealthPanel
- Source: `src/components/HealthPanel.tsx`
- Category: basic
- Description: Data-freshness / sync health summary panel
- Extractable props: none (data-driven)
- Hardcoded: status color mapping, icon set

## StoreRanking
- Source: `src/components/StoreRanking.tsx`
- Category: basic
- Description: Ranked store list with metric bars
- Extractable props: none (data-driven)
- Hardcoded: rank badge, bar fill colors, row height

## Comparison
- Source: `src/components/Comparison.tsx`
- Category: basic
- Description: Side-by-side store comparison table/blocks
- Extractable props: none (data-driven)
- Hardcoded: column layout, delta coloring
