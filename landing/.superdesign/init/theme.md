<!-- Superdesign init — generated for `landing` -->

# Theme — `landing`

## Part 1 — Compact token summary

### CSS custom properties

**`:root`**

| token | value |
|---|---|
| `--background` | `0 0% 98%` |
| `--foreground` | `0 0% 15%` |
| `--card` | `0 0% 100%` |
| `--card-foreground` | `0 0% 15%` |
| `--primary` | `227 57% 48%` |
| `--primary-foreground` | `220 100% 97%` |
| `--primary-dark` | `227 71% 19%` |
| `--muted` | `0 0% 94%` |
| `--muted-foreground` | `0 0% 37%` |
| `--destructive` | `0 84% 60%` |
| `--destructive-text` | `0 74% 42%` |
| `--success` | `160 84% 39%` |
| `--success-text` | `163 94% 24%` |
| `--warning` | `38 92% 50%` |
| `--warning-text` | `26 90% 37%` |
| `--info` | `217 91% 60%` |
| `--info-text` | `224 76% 48%` |
| `--wa` | `142 70% 49%` |
| `--wa-text` | `154 76% 31%` |
| `--border` | `0 0% 89%` |
| `--input` | `0 0% 86%` |
| `--ring` | `227 57% 48%` |
| `--radius` | `0.5rem` |

### fontFamily (tailwind)
```js
sans: [
          '"Hanken Grotesk"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
```

### borderRadius (tailwind)
```js
xs: "calc(var(--radius) * 0.25)",
        sm: "calc(var(--radius) * 0.5)",
        md: "calc(var(--radius) * 0.75)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) * 1.5)",
        "2xl": "calc(var(--radius) * 2)",
```

### boxShadow (tailwind)
```js
xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        sm: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
        primary:
          "0 1px 3px 0 hsl(var(--primary) / 0.24), 0 1px 2px -1px hsl(var(--primary) / 0.24)",
        /** Bayangan bingkai HP di hero — satu-satunya bayangan besar di halaman. */
        hp: "0 30px 60px -12px rgb(14 26 82 / 0.22), 0 4px 12px rgb(14 26 82 / 0.08)",
        bar: "0 -4px 20px rgb(0 0 0 / 0.06)",
```

### screens (tailwind)
```js
desktop: "900px",
```


## Part 2 — Raw source dumps

### `tailwind.config.js`

```
/** @type {import('tailwindcss').Config} */

/**
 * Design token landing KanPOS — Shark UI (https://shark.vini.one).
 *
 * Sengaja kembar dengan `frontend/tailwind.config.ts` (kasir),
 * `dashboard/tailwind.config.js`, dan `admin/tailwind.config.js`: nama token,
 * skala radius, dan shadow-nya sama persis, jadi orang yang datang dari landing
 * ke aplikasi tidak merasa pindah produk. Nilai HSL-nya di `src/index.css`.
 *
 * Beda landing dari tiga aplikasi itu:
 *   1. Hanya mode terang. Halaman pemasaran memilih satu tampilan; tidak ada
 *      sakelar tema dan tidak ada blok `.dark`.
 *   2. Ada dua token yang cuma dipakai di sini: `primary-dark` untuk panel
 *      gradien (harga & penutup) dan `wa` untuk tombol WhatsApp.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          text: "hsl(var(--destructive-text))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          text: "hsl(var(--success-text))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          text: "hsl(var(--warning-text))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          text: "hsl(var(--info-text))",
        },
        /** Hijau WhatsApp — warna milik kanalnya, bukan bagian palet Shark. */
        wa: {
          DEFAULT: "hsl(var(--wa))",
          text: "hsl(var(--wa-text))",
        },
      },
      fontFamily: {
        sans: [
          '"Hanken Grotesk"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      /** Skala radius Shark: tombol/input lg 8px, kartu xl 12px, panel 2xl 16px. */
      borderRadius: {
        xs: "calc(var(--radius) * 0.25)",
        sm: "calc(var(--radius) * 0.5)",
        md: "calc(var(--radius) * 0.75)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) * 1.5)",
        "2xl": "calc(var(--radius) * 2)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        sm: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
        primary:
          "0 1px 3px 0 hsl(var(--primary) / 0.24), 0 1px 2px -1px hsl(var(--primary) / 0.24)",
        /** Bayangan bingkai HP di hero — satu-satunya bayangan besar di halaman. */
        hp: "0 30px 60px -12px rgb(14 26 82 / 0.22), 0 4px 12px rgb(14 26 82 / 0.08)",
        bar: "0 -4px 20px rgb(0 0 0 / 0.06)",
      },
      maxWidth: {
        bungkus: "1200px",
        "bungkus-lg": "1024px",
      },
      screens: {
        desktop: "900px",
      },
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
 * Nilainya identik dengan `frontend/src/index.css` (kasir) dan
 * `dashboard/src/index.css`, kecuali `--card` yang di sini putih: seksi
 * berselang antara putih dan #fafafa, jadi kartu perlu beda dari keduanya.
 *
 * Tidak ada blok `.dark` — landing hanya mode terang. Lihat catatan di config.
 */
@layer base {
  :root {
    --background: 0 0% 98%; /* neutral-50  #fafafa */
    --foreground: 0 0% 15%; /* neutral-800 #262626 */

    --card: 0 0% 100%;
    --card-foreground: 0 0% 15%;

    --primary: 227 57% 48%; /* #3554C1 brand KanPOS */
    --primary-foreground: 220 100% 97%; /* #eff4ff */
    --primary-dark: 227 71% 19%; /* #0E1A52 — ujung gelap gradien */

    --muted: 0 0% 94%;
    --muted-foreground: 0 0% 37%; /* #5e5e5e */

    --destructive: 0 84% 60%; /* red-500 */
    --destructive-text: 0 74% 42%; /* red-700 — untuk TEKS */

    --success: 160 84% 39%; /* emerald-500 */
    --success-text: 163 94% 24%; /* emerald-700 */

    --warning: 38 92% 50%; /* amber-500 */
    --warning-text: 26 90% 37%; /* amber-700 */

    --info: 217 91% 60%; /* blue-500 */
    --info-text: 224 76% 48%; /* blue-700 */

    --wa: 142 70% 49%; /* #25D366 */
    --wa-text: 154 76% 31%; /* cukup gelap untuk teks di atas putih */

    --border: 0 0% 89%;
    --input: 0 0% 86%;
    --ring: 227 57% 48%;

    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  html {
    scroll-behavior: smooth;
    /* Header 64px + sedikit ruang, supaya judul seksi tidak tertutup. */
    scroll-padding-top: 80px;
  }

  body {
    @apply bg-card text-foreground font-sans antialiased;
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    overflow-x: hidden;
  }

  :where(a, button, summary, [tabindex]):focus-visible {
    @apply outline-none ring-2 ring-ring/40 ring-offset-2 ring-offset-background;
  }
}

/**
 * Kelas komponen sengaja terbatas pada kerangka halaman (pembungkus, jarak
 * seksi, kepala seksi). Tombol, badge, kartu, dan kotak ikon ada sebagai
 * komponen React di `src/components/ui.tsx` supaya variannya tidak perlu
 * dihafal lewat nama kelas.
 */
@layer components {
  .bungkus {
    @apply mx-auto w-full max-w-bungkus px-5 desktop:px-6;
  }
  .bungkus-lg {
    @apply mx-auto w-full max-w-bungkus-lg px-5 desktop:px-6;
  }

  .seksi {
    @apply py-12 desktop:py-16;
  }
  /* Seksi berlatar abu dengan garis pemisah di atas dan bawah. */
  .seksi-alt {
    @apply border-y border-border bg-background;
  }
}
```

