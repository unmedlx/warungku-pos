<!-- Superdesign init — generated for `landing` -->
# Extractable Components — `landing` (marketing site)

Single-page marketing site: `App.tsx` stacks section components in order, plus a separate
`/download` page. Sections are the real unit of design here, not atoms.

## Layout Components

## Header
- Source: `src/components/Header.tsx`
- Category: layout
- Description: Sticky top nav — logo, anchor links, download CTA; blurred card background
- Extractable props: activeAnchor (string), showCta (boolean, default: true)
- Hardcoded: logo, nav anchor labels and hrefs, height (h-16), backdrop blur

## Footer
- Source: `src/components/Footer.tsx`
- Category: layout
- Description: Dark footer with logo, link columns, legal line
- Extractable props: none
- Hardcoded: `#111111` background, `#c7c7c7` text, link groups, copy

## BottomBar
- Source: `src/components/BottomBar.tsx`
- Category: layout
- Description: Mobile-only fixed CTA bar (Download + WhatsApp), hidden on desktop
- Extractable props: none
- Hardcoded: CTA labels, `TAUTAN.download`, WhatsApp link, `desktop:hidden`

## Basic Components

## ui (primitive set)
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Shared primitives for the whole site — `Tombol`, section wrappers, headings
- Extractable props: variant ('primary' | others), href (string)
- Hardcoded: class strings, radius, shadow-bar

## icons
- Source: `src/components/icons.tsx`
- Category: basic
- Description: Inline SVG icon set
- Extractable props: none
- Hardcoded: all paths

## Logo
- Source: `src/components/Logo.tsx`
- Category: basic
- Description: Kankitu mark
- Extractable props: none
- Hardcoded: SVG

## PhoneMockup
- Source: `src/components/PhoneMockup.tsx`
- Category: basic
- Description: Phone frame wrapper used to present app screenshots in hero and feature sections
- Extractable props: none (children are the screen)
- Hardcoded: bezel, radius, shadow, aspect ratio

## MiniLayar
- Source: `src/components/MiniLayar.tsx`
- Category: basic
- Description: Small in-page fake app screen used inside feature blocks
- Extractable props: none
- Hardcoded: mock content, chrome

## Strip
- Source: `src/components/Strip.tsx`
- Category: basic
- Description: Full-width accent band separating sections
- Extractable props: none
- Hardcoded: background, padding

## Page Sections (extract as whole blocks)

Each is a top-level section in `src/App.tsx`, no props, all copy hardcoded:
`Hero`, `Masalah`, `Manfaat`, `Ai`, `Langkah`, `Usaha`, `MiniLayar`, `Jujur`,
`Testimoni`, `Harga`, `Faq`, `Penutup`.
