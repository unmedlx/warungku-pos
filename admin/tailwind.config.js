/** @type {import('tailwindcss').Config} */

/**
 * Design token panel admin — Shark UI (https://shark.vini.one).
 *
 * Sengaja kembar dengan `dashboard/tailwind.config.js` dan
 * `frontend/tailwind.config.ts`: nama token, skala radius, dan shadow-nya sama
 * persis, jadi kasir, dashboard pemilik, dan panel admin satu bahasa visual.
 * Nilai HSL-nya ditulis di `src/index.css`. Menggantikan tema SaaSable lama
 * (Sora, radius 4, netral keunguan) yang dipakai panel ini sebelumnya.
 *
 * Dua penyimpangan dari Shark, sama seperti di dua aplikasi lain:
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
