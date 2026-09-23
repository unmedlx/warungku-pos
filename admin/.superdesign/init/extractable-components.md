<!-- Superdesign init — generated for `admin` -->
# Extractable Components — `admin` (internal console)

Note: this app has no router. `App.tsx` switches views by state, so the "pages"
(`Overview`, `Users`, `UserDetail`, `Plans`, `Payments`, `Releases`, `Audit`) live in
`src/components/` alongside real components. See `routes.md`.

## Layout Components

## Sidebar
- Source: `src/components/Sidebar.tsx`
- Category: layout
- Description: Left nav; each item takes active state, an inline SVG icon, and a label
- Extractable props: aktif (string — the active view key)
- Hardcoded: nav item list, inline `Ikon` SVG paths (18px, stroke currentColor), widths

## Topbar
- Source: `src/components/Topbar.tsx`
- Category: layout
- Description: Top bar — breadcrumb trail, optional search slot, theme toggle, admin identity, logout
- Extractable props: jejak (string[] — breadcrumb), theme ('light' | 'dark'), admin (object)
- Hardcoded: separator glyph, toggle icons, height, border

## Login
- Source: `src/components/Login.tsx`
- Category: layout
- Description: Auth screen gating the console
- Extractable props: error (string), loading (boolean)
- Hardcoded: logo, copy, card width

## Basic Components

## Common (primitive set)
- Source: `src/components/Common.tsx`
- Category: basic
- Description: The console's shared primitives — cards, tables, badges, buttons, empty states
- Extractable props: variant, size (per exported primitive)
- Hardcoded: all Tailwind class strings, status color mapping

## Logo
- Source: `src/components/Logo.tsx`
- Category: basic
- Description: Kankitu mark
- Extractable props: none
- Hardcoded: SVG

## GrowthChart
- Source: `src/components/GrowthChart.tsx`
- Category: basic
- Description: Growth/usage chart on Overview
- Extractable props: none (data-driven)
- Hardcoded: series colors, grid, axis styling

## GrantDialog
- Source: `src/components/GrantDialog.tsx`
- Category: basic
- Description: Modal for granting a plan/entitlement to a user
- Extractable props: open (boolean), title (string)
- Hardcoded: field set, overlay, dialog width
