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
