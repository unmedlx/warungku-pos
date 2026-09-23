# Design System — Kankitu (KanPOS) Landing

## Product context

Kankitu / KanPOS is an Indonesian point-of-sale app for small businesses (warung, toko,
kedai, UMKM). The landing page's job is to get the visitor to **download the app** or
**contact via WhatsApp** — not to read an essay.

- **Audience**: Indonesian small-business owners, mostly on Android phones, not technical.
- **Language**: Bahasa Indonesia, informal-but-respectful, second person "kamu".
- **Tone**: practical and concrete, never editorial or corporate. Claims must be
  provable — testimonials stay hidden (`TAMPILKAN_TESTIMONI = false`) until real ones exist.
- **Primary CTA**: Download (free). **Secondary CTA**: WhatsApp.
- **Platform reality**: distributed outside the Play Store — the app is downloaded from
  `/download` (Android APK + Windows), so the download path is the conversion funnel.

### Key pages
- `/` — single-page marketing site, sections stacked in `src/App.tsx`
- `/download` — download page (`src/download/HalamanDownload.tsx`), no router; `App.tsx`
  branches on `window.location.pathname`

### Section order on `/` (the real render branch)
`Header` → `Hero` → `Strip` → `Masalah` → `Manfaat` → `Ai` → `Langkah` → `Usaha` →
`Harga` → `Jujur` → *(Testimoni hidden)* → `Faq alt={false}` → `Penutup alt={false}` →
`Footer` → `BottomBar`

## Branding & styling

This is **Shark UI** (https://shark.vini.one), deliberately token-identical to the three
sibling apps (`frontend` kasir, `dashboard`, `admin`) so a visitor moving from landing to
the product does not feel like they changed products. Tokens live in `src/index.css`,
mapped in `tailwind.config.js`.

**Light mode only.** There is no `.dark` block and no theme switcher. Do not add one.

### Color tokens (HSL triplets, consumed as `hsl(var(--x))`)

| token | value | note |
|---|---|---|
| `--background` | `0 0% 98%` | #fafafa — alternating section background |
| `--foreground` | `0 0% 15%` | #262626 |
| `--card` | `0 0% 100%` | white — page default background |
| `--primary` | `227 57% 48%` | **#3554C1 — the brand blue** |
| `--primary-foreground` | `220 100% 97%` | #eff4ff |
| `--primary-dark` | `227 71% 19%` | #0E1A52 — dark end of gradient panels |
| `--muted` | `0 0% 94%` | |
| `--muted-foreground` | `0 0% 37%` | #5e5e5e |
| `--destructive` / `-text` | `0 84% 60%` / `0 74% 42%` | |
| `--success` / `-text` | `160 84% 39%` / `163 94% 24%` | |
| `--warning` / `-text` | `38 92% 50%` / `26 90% 37%` | |
| `--info` / `-text` | `217 91% 60%` / `224 76% 48%` | |
| `--wa` / `-text` | `142 70% 49%` / `154 76% 31%` | WhatsApp green — channel color, NOT part of the Shark palette |
| `--border` | `0 0% 89%` | |
| `--input` | `0 0% 86%` | |
| `--ring` | `227 57% 48%` | |
| `--radius` | `0.5rem` | base of the radius scale |

**Semantic pairs rule**: the `DEFAULT` token is for fills, the `-text` token is for text on
white (dark enough to pass contrast). Never use `--success` as a text color.

### Typography
- **Sans**: `"Hanken Grotesk"` → system fallbacks. This is the only display/body face.
- **Mono**: `"JetBrains Mono"` → system mono fallbacks.
- Base body: **15px / 1.5**, antialiased.
- No serif. No decorative faces. No second display font.

### Radius scale
`xs` 2px · `sm` 4px · `md` 6px · **`lg` 8px (buttons, inputs)** · **`xl` 12px (cards)** ·
**`2xl` 16px (panels)** — all computed from `--radius`.

### Shadows (deliberately restrained)
- `xs` `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- `sm` `0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)`
- `lg` `0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.05)`
- `primary` `0 1px 3px 0 hsl(var(--primary) / 0.24), 0 1px 2px -1px hsl(var(--primary) / 0.24)`
- `hp` `0 30px 60px -12px rgb(14 26 82 / 0.22), 0 4px 12px rgb(14 26 82 / 0.08)` — the phone
  frame in the hero; **the only large shadow on the page**
- `bar` `0 -4px 20px rgb(0 0 0 / 0.06)` — mobile bottom bar

### Layout
- **Breakpoint**: a single custom breakpoint `desktop: 900px`. Mobile-first; everything below
  900px is the phone layout. There is no `sm`/`md`/`lg` ladder in use.
- **Container**: `.bungkus` = `max-width 1200px`, padding `20px` (mobile) / `24px` (desktop).
  `.bungkus-lg` = `max-width 1024px` for reading-width sections.
- **Section rhythm**: `.seksi` = `py-12` mobile / `py-16` desktop.
- **Alternating backgrounds**: sections alternate white (`bg-card`) and grey
  (`.seksi-alt` = `bg-background` + `border-y border-border`). This alternation is
  load-bearing — two adjacent grey sections must never touch. That is why `Faq` and
  `Penutup` take an `alt` prop that flips with `TAMPILKAN_TESTIMONI`.
- **Mobile bottom bar**: fixed CTA bar, so the page carries `pb-[68px] desktop:pb-0`.
- `scroll-behavior: smooth`, `scroll-padding-top: 80px` (header is 64px).

## Component vocabulary (`src/components/ui.tsx`)

Only these primitives exist. Do not invent new button or badge styles.

**`Tombol`** — the base element is `<a>` (almost every button is a link; `href` is required).
- variants: `primary` (brand fill + `shadow-primary`) · `outline` (default — border + white
  + `shadow-xs`) · `wa` (outline with green text; secondary to the main CTA) · `terang`
  (white on dark gradient panels) · `hantu` (white/10 ghost on dark panels)
- sizes: `default` h-40px · `sm` h-36px · `xl` h-44px
- `blok` = full width (mobile, and inside pricing cards)

**`Badge`** — Shark pattern: 10% tint + ~20–25% border + 700-shade text.
- variants: `primary` · `success` · `warning` · `outline` · `terang` (on dark panels)
- sizes: `default` h-24px / 12px text · `sm` h-20px / 11px text

**`Kartu`** · **`IkonKotak`** · **`DaftarCek`** · **`JudulSeksi`** — card surface, icon tile,
checklist, section heading.

**Icons**: inline SVG set in `src/components/icons.tsx`. Reproduce 1:1; do not swap in an
icon library.

**Logo**: `src/components/Logo.tsx`. Brand marks also live in `../brand/` (`kanpos-glyph.svg`,
`kanpos-icon.svg`, `kanpos-maskable.svg`).

**Presentational**: `PhoneMockup` (phone frame for app screenshots), `MiniLayar` (small fake
app screen inside feature blocks), `Strip` (full-width accent band).

## Gradient panels
Two sections use a brand gradient (`primary` → `primary-dark`): **Harga** and **Penutup**.
On these, buttons switch to `terang` / `hantu` and badges to `terang`.

## Motion
Minimal and functional. `transition` on interactive elements, smooth anchor scrolling,
`hover:brightness-110` on the primary button, `hover:bg-muted` on outline. No scroll-linked
animation, no parallax, no entrance choreography.

## Accessibility
Focus is visible everywhere: `:focus-visible` → `ring-2 ring-ring/40 ring-offset-2`.
Keep it.

## Hard constraints for any generated design
1. Light mode only.
2. Fonts: Hanken Grotesk (sans) and JetBrains Mono only.
3. Colors: only the tokens above. `#3554C1` is the brand blue; WhatsApp green is only for
   the WhatsApp channel.
4. Single breakpoint at 900px (`desktop:`).
5. Buttons and badges come from the `Tombol` / `Badge` variant sets — no new variants.
6. Keep the white/grey section alternation intact.
7. Copy stays Bahasa Indonesia, "kamu", practical. No invented testimonials or metrics.
8. Every CTA points to a real destination (`src/tautan.ts` → `TAUTAN`), primarily
   download and WhatsApp.
