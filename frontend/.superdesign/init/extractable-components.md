<!-- Superdesign init — generated for `frontend` -->
# Extractable Components — `frontend` (Kankitu POS kasir)

Menu of components that can be extracted as reusable Superdesign `DraftComponent` entities.
Full source lives in `components.md` (primitives) and `layouts.md` (shell).

Design system note: this app has TWO component layers.
- `src/components/ui/*` — stock shadcn/ui primitives (Radix). Rarely redesigned directly.
- `src/components/jokoui/*` — the **Shark UI** layer, the project's real design system. Redesign work happens here.
Prefer extracting from `jokoui`.

## Layout Components (appear on most pages)

## AppLayout
- Source: `src/components/layout/AppLayout.tsx`
- Category: layout
- Description: Root app shell — renders Outlet, bottom nav, FAB, and mounts theme/auth/backup hooks
- Extractable props: none (route-driven; reads `useLocation`)
- Hardcoded: shell padding, safe-area insets, nav visibility rule (`isMainPage`: path depth <= 1)

## BottomNav
- Source: `src/components/layout/BottomNav.tsx`
- Category: layout
- Description: Fixed bottom tab bar driven by `lib/nav-groups.ts`, with active state and notification dot
- Extractable props: activeRoot (string), showDot (boolean, default: false)
- Hardcoded: nav group list, icons, i18n label keys, blur/border CSS

## BottomNav (jokoui primitive)
- Source: `src/components/jokoui/bottom-nav.tsx`
- Category: layout
- Description: Presentational bottom nav — takes items array, no routing knowledge
- Extractable props: activeKey (string), items (array), onItemClick (handler)
- Hardcoded: fixed positioning, backdrop blur, safe-area padding, CTA item styling

## HubTabs
- Source: `src/components/layout/HubTabs.tsx`
- Category: layout
- Description: Secondary tab strip for hub pages (sub-navigation under a section root)
- Extractable props: activeTab (string)
- Hardcoded: tab labels, underline indicator CSS

## FloatingActionButton
- Source: `src/components/layout/FloatingActionButton.tsx`
- Category: layout
- Description: Circular FAB anchored above the bottom nav
- Extractable props: visible (boolean, default: true), href (string)
- Hardcoded: icon, size, shadow, bottom offset

## PageHeader
- Source: `src/components/jokoui/page-header.tsx`
- Category: layout
- Description: Standard page top bar — title, subtitle, optional back button, avatar, inline actions
- Extractable props: title (ReactNode), subtitle (ReactNode), backTo (string), showBack (boolean)
- Hardcoded: spacing, typography scale, back-chevron icon, outline icon-button styling

## Basic Components (used across pages)

## Button
- Source: `src/components/jokoui/button.tsx`
- Category: basic
- Description: Shark UI button — variant and size matrix
- Extractable props: variant, size, disabled (boolean)
- Hardcoded: all variant CSS classes, focus ring, radius

## Card
- Source: `src/components/jokoui/card.tsx`
- Category: basic
- Description: Surface container used for every grouped block
- Extractable props: none meaningful
- Hardcoded: border, radius, background token, padding scale

## StatCard
- Source: `src/components/jokoui/stat-card.tsx`
- Category: basic
- Description: Metric tile — icon, label, value, optional sub-line and semantic color
- Extractable props: label (string), value (ReactNode), sub (ReactNode), size ('default' | 'sm')
- Hardcoded: icon set, color token class names, internal layout

## MoneyDisplay
- Source: `src/components/jokoui/money-display.tsx`
- Category: basic
- Description: Formats and renders IDR currency with emphasis sizing
- Extractable props: value (number), size
- Hardcoded: locale formatting, `Rp` prefix, tabular-nums

## Badge
- Source: `src/components/jokoui/badge.tsx`
- Category: basic
- Description: Status pill with semantic variants (success/warning/destructive/info)
- Extractable props: variant
- Hardcoded: tint token classes, radius, text size

## Input / Textarea / Select / Checkbox / Switch / Toggle
- Source: `src/components/jokoui/{input,textarea,select,checkbox,switch,toggle}.tsx`
- Category: basic
- Description: Form field primitives sharing one border/focus treatment
- Extractable props: disabled (boolean), invalid (boolean)
- Hardcoded: border tokens, focus ring, height scale

## Numpad
- Source: `src/components/jokoui/numpad.tsx`
- Category: basic
- Description: On-screen numeric keypad for cashier amount entry — distinctive to this app
- Extractable props: none (controlled via onPress)
- Hardcoded: key grid, key labels, press feedback

## QtyStepper
- Source: `src/components/jokoui/qty-stepper.tsx`
- Category: basic
- Description: Minus/value/plus quantity control used in cart and stock screens
- Extractable props: value (number), min (number), max (number), disabled (boolean)
- Hardcoded: icons, button size, layout

## TransactionItem / OrderCard / DataList / Item
- Source: `src/components/jokoui/{transaction-item,order-card,data-list,item}.tsx`
- Category: basic
- Description: List-row patterns — the dominant repeating unit across history, products, customers
- Extractable props: active (boolean), showChevron (boolean)
- Hardcoded: row height, divider, chevron icon, press state

## EmptyState
- Source: `src/components/jokoui/empty-state.tsx`
- Category: basic
- Description: Illustration + message + optional CTA for empty lists
- Extractable props: title (string), description (string), ctaLabel (string)
- Hardcoded: illustration, vertical rhythm

## SegmentedBarChart
- Source: `src/components/jokoui/segmented-bar-chart.tsx`
- Category: basic
- Description: Compact chart used on dashboard/report cards
- Extractable props: none (data-driven)
- Hardcoded: chart color tokens, bar radius, axis treatment

## Modal
- Source: `src/components/jokoui/modal.tsx`
- Category: basic
- Description: Sheet/dialog wrapper used for every confirm and form overlay
- Extractable props: open (boolean), title (string)
- Hardcoded: overlay opacity, enter/exit animation, radius, mobile sheet behavior
