<!-- Superdesign init — generated for `dashboard` -->

# Theme — `dashboard`

## Part 1 — Compact token summary

### CSS custom properties

**`:root`**

| token | value |
|---|---|
| `--background` | `0 0% 98%` |
| `--foreground` | `0 0% 15%` |
| `--card` | `0 0% 100%` |
| `--card-foreground` | `0 0% 15%` |
| `--popover` | `0 0% 100%` |
| `--popover-foreground` | `0 0% 15%` |
| `--primary` | `227 57% 48%` |
| `--primary-foreground` | `220 100% 97%` |
| `--secondary` | `0 0% 92%` |
| `--secondary-foreground` | `0 0% 15%` |
| `--muted` | `0 0% 94%` |
| `--muted-foreground` | `0 0% 37%` |
| `--accent` | `0 0% 92%` |
| `--accent-foreground` | `0 0% 15%` |
| `--destructive` | `0 84% 60%` |
| `--destructive-foreground` | `0 0% 100%` |
| `--destructive-text` | `0 74% 42%` |
| `--success` | `160 84% 39%` |
| `--success-foreground` | `0 0% 100%` |
| `--success-text` | `163 94% 24%` |
| `--warning` | `38 92% 50%` |
| `--warning-foreground` | `0 0% 100%` |
| `--warning-text` | `26 90% 37%` |
| `--info` | `217 91% 60%` |
| `--info-foreground` | `0 0% 100%` |
| `--info-text` | `224 76% 48%` |
| `--border` | `0 0% 89%` |
| `--input` | `0 0% 86%` |
| `--ring` | `227 57% 48%` |
| `--chart-1` | `227 57% 48%` |
| `--chart-2` | `160 84% 39%` |
| `--chart-3` | `38 92% 50%` |
| `--chart-4` | `0 0% 64%` |
| `--chart-5` | `217 91% 60%` |
| `--radius` | `0.5rem` |

**dark**

| token | value |
|---|---|
| `--background` | `0 0% 4%` |
| `--foreground` | `0 0% 96%` |
| `--card` | `0 0% 7%` |
| `--card-foreground` | `0 0% 96%` |
| `--popover` | `0 0% 8%` |
| `--popover-foreground` | `0 0% 96%` |
| `--primary` | `227 57% 48%` |
| `--primary-foreground` | `220 100% 97%` |
| `--secondary` | `0 0% 11%` |
| `--secondary-foreground` | `0 0% 96%` |
| `--muted` | `0 0% 10%` |
| `--muted-foreground` | `0 0% 62%` |
| `--accent` | `0 0% 11%` |
| `--accent-foreground` | `0 0% 96%` |
| `--destructive` | `2 72% 57%` |
| `--destructive-foreground` | `0 0% 100%` |
| `--destructive-text` | `0 91% 71%` |
| `--success` | `160 84% 39%` |
| `--success-foreground` | `0 0% 100%` |
| `--success-text` | `158 64% 52%` |
| `--warning` | `38 92% 50%` |
| `--warning-foreground` | `0 0% 100%` |
| `--warning-text` | `43 96% 56%` |
| `--info` | `217 91% 60%` |
| `--info-foreground` | `0 0% 100%` |
| `--info-text` | `213 94% 68%` |
| `--border` | `0 0% 15%` |
| `--input` | `0 0% 17%` |
| `--ring` | `227 57% 48%` |
| `--chart-4` | `0 0% 45%` |

### fontFamily (tailwind)
```js
sans: [
          '"Hanken Grotesk"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
```

### borderRadius (tailwind)
```js
xs: 'calc(var(--radius) * 0.25)',
        sm: 'calc(var(--radius) * 0.5)',
        md: 'calc(var(--radius) * 0.75)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) * 1.5)',
        '2xl': 'calc(var(--radius) * 2)',
```

### boxShadow (tailwind)
```js
xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        primary:
          '0 1px 3px 0 hsl(var(--primary) / 0.24), 0 1px 2px -1px hsl(var(--primary) / 0.24)',
```


## Part 2 — Raw source dumps

### `tailwind.config.js`

```
/** @type {import('tailwindcss').Config} */

/**
 * Design token dashboard pemilik — Shark UI (https://shark.vini.one).
 *
 * Sengaja kembar dengan `frontend/tailwind.config.ts` (aplikasi kasir) supaya
 * kasir dan dashboard berbagi satu bahasa visual: nama token, skala radius,
 * dan shadow-nya sama persis. Nilai HSL-nya ditulis di `src/index.css`.
 *
 * Dua penyimpangan dari Shark, sama seperti di frontend:
 *   1. `--primary` = biru brand KanPOS #3554C1, bukan neutral-900 Shark.
 *   2. `--card` di mode terang = putih, bukan sama dengan background. Layar ini
 *      padat tabel; kartu putih di atas #fafafa memberi pemisahan yang tidak
 *      bisa dicapai border saja.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          text: 'hsl(var(--destructive-text))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          text: 'hsl(var(--success-text))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          text: 'hsl(var(--warning-text))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          text: 'hsl(var(--info-text))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        sans: [
          '"Hanken Grotesk"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      /**
       * Skala radius Shark: base 0.5rem dikalikan
       * xs .25 · sm .5 · md .75 · lg 1 · xl 1.5 · 2xl 2.
       * Tombol/input = lg (8px), card/item = xl (12px), dialog = 2xl (16px).
       */
      borderRadius: {
        xs: 'calc(var(--radius) * 0.25)',
        sm: 'calc(var(--radius) * 0.5)',
        md: 'calc(var(--radius) * 0.75)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) * 1.5)',
        '2xl': 'calc(var(--radius) * 2)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        primary:
          '0 1px 3px 0 hsl(var(--primary) / 0.24), 0 1px 2px -1px hsl(var(--primary) / 0.24)',
      },
      spacing: { sidebar: '248px', topbar: '56px' },
    },
  },
  plugins: [],
};
```


### `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/**
 * Token Shark UI — port dari `sharkui-inc/shark-ui/styles/globals.css`, ditulis
 * sebagai HSL triplet supaya cocok dengan `hsl(var(--x))` di tailwind.config.
 * Nilainya sengaja identik dengan `frontend/src/index.css` (aplikasi kasir),
 * kecuali `--card` mode terang yang di sini putih; lihat catatan di config.
 */
@layer base {
  :root {
    --background: 0 0% 98%;              /* neutral-50  #fafafa */
    --foreground: 0 0% 15%;              /* neutral-800 #262626 */

    --card: 0 0% 100%;                   /* putih — kartu data di atas #fafafa */
    --card-foreground: 0 0% 15%;

    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 15%;

    --primary: 227 57% 48%;              /* #3554C1 brand KanPOS */
    --primary-foreground: 220 100% 97%;  /* #eff4ff */

    --secondary: 0 0% 92%;
    --secondary-foreground: 0 0% 15%;

    --muted: 0 0% 94%;
    --muted-foreground: 0 0% 37%;        /* #5e5e5e */

    --accent: 0 0% 92%;
    --accent-foreground: 0 0% 15%;

    --destructive: 0 84% 60%;            /* red-500 */
    --destructive-foreground: 0 0% 100%;
    --destructive-text: 0 74% 42%;       /* red-700 — untuk TEKS status */

    --success: 160 84% 39%;              /* emerald-500 */
    --success-foreground: 0 0% 100%;
    --success-text: 163 94% 24%;         /* emerald-700 */

    --warning: 38 92% 50%;               /* amber-500 */
    --warning-foreground: 0 0% 100%;
    --warning-text: 26 90% 37%;          /* amber-700 */

    --info: 217 91% 60%;                 /* blue-500 */
    --info-foreground: 0 0% 100%;
    --info-text: 224 76% 48%;            /* blue-700 */

    --border: 0 0% 89%;
    --input: 0 0% 86%;
    --ring: 227 57% 48%;

    --chart-1: 227 57% 48%;
    --chart-2: 160 84% 39%;
    --chart-3: 38 92% 50%;
    --chart-4: 0 0% 64%;
    --chart-5: 217 91% 60%;

    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 4%;
    --foreground: 0 0% 96%;

    --card: 0 0% 7%;
    --card-foreground: 0 0% 96%;

    --popover: 0 0% 8%;
    --popover-foreground: 0 0% 96%;

    --primary: 227 57% 48%;
    --primary-foreground: 220 100% 97%;

    --secondary: 0 0% 11%;
    --secondary-foreground: 0 0% 96%;

    --muted: 0 0% 10%;
    --muted-foreground: 0 0% 62%;

    --accent: 0 0% 11%;
    --accent-foreground: 0 0% 96%;

    --destructive: 2 72% 57%;
    --destructive-foreground: 0 0% 100%;
    --destructive-text: 0 91% 71%;       /* red-400 */

    --success: 160 84% 39%;
    --success-foreground: 0 0% 100%;
    --success-text: 158 64% 52%;         /* emerald-400 */

    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --warning-text: 43 96% 56%;          /* amber-400 */

    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;
    --info-text: 213 94% 68%;            /* blue-400 */

    --border: 0 0% 15%;
    --input: 0 0% 17%;
    --ring: 227 57% 48%;

    --chart-4: 0 0% 45%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
  }

  /* Fokus keyboard seragam untuk semua kontrol. */
  :where(a, button, input, select, [tabindex]):focus-visible {
    @apply outline-none ring-2 ring-ring/40 ring-offset-2 ring-offset-background;
  }
}

/**
 * Kelas komponen. Sengaja sedikit: hanya pola yang berulang di banyak file
 * (tabel, bilah progres, kontrol form). Kartu, tombol, badge, dan item daftar
 * ada sebagai komponen React di `src/components/Common.tsx` supaya varian dan
 * ukurannya tidak perlu dihafal lewat nama kelas.
 */
@layer components {
  /* ── Tabel data ── */
  .tabel {
    @apply w-full border-collapse text-sm;
  }
  /* Rata kiri dipasang di `tr`, bukan di `th`: sebagai sifat warisan ia kalah
     dari `text-right` yang ditulis per kolom, sedangkan aturan di `th` sendiri
     (spesifisitas 0,1,1) justru mengalahkan utility itu. */
  .tabel thead tr,
  .tabel tfoot tr {
    text-align: left;
  }
  .tabel th {
    @apply whitespace-nowrap border-b border-border px-4 py-2.5 text-xs
           font-medium text-muted-foreground;
  }
  .tabel td {
    @apply border-b border-border px-4 py-3 align-middle;
  }
  .tabel tbody tr:last-child td {
    @apply border-b-0;
  }
  .tabel tbody tr:hover td {
    @apply bg-muted/55;
  }
  .tabel tfoot td {
    @apply border-b-0 border-t border-border bg-background font-semibold;
  }
  /* Baris kedua di dalam sel (jumlah nota, margin) — meta, bukan angka utama. */
  .tabel .sel-sub {
    @apply mt-0.5 text-xs font-normal text-muted-foreground;
  }

  /* ── Bilah progres (kontribusi omzet, kuota penyimpanan) ── */
  .bilah {
    @apply block h-1.5 overflow-hidden rounded-full bg-muted;
  }
  .bilah > i {
    @apply block h-full rounded-full bg-primary;
  }

  /* ── Input & label ── */
  .isian {
    @apply h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground
           shadow-xs outline-none transition placeholder:text-muted-foreground
           focus:border-ring focus:ring-2 focus:ring-ring/30
           disabled:cursor-not-allowed disabled:bg-muted;
  }
  .label {
    @apply mb-1.5 block text-sm font-medium text-foreground;
  }

  /* ── Segmented control / tab pil (preset rentang, metrik grafik) ── */
  .seg {
    @apply inline-flex gap-0.5 rounded-lg bg-muted p-[3px];
  }
  .seg-item {
    @apply h-7 rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors
           hover:text-foreground;
  }
  .seg-item-on {
    @apply bg-card text-foreground shadow-sm hover:text-foreground;
  }
}
```

