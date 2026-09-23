import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* === Skala tipografi ===
         Root di index.css fluid: `clamp(0.9375rem, 0.25rem + 3vw, 1.125rem)`,
         yang di layar 375px menghasilkan ~15.25px dan di tablet 18px. Semua
         nilai di bawah dikalibrasi ke root itu (rem = px ÷ 15.25) supaya di HP
         ukurannya persis seperti nilai px yang digantikannya, lalu ikut
         membesar di tablet — hal yang tidak bisa dilakukan nilai px.

         Sengaja tanpa line-height, sama seperti `text-[Npx]` yang digantikan,
         jadi penggantiannya murni 1:1 dan tidak menggeser layout.

         Nama peran (`title`/`metric`/`heading`/`amount`) dipakai untuk empat
         ukuran yang masing-masing hanya punya satu arti di app ini; sisanya
         meneruskan konvensi t-shirt yang sudah ada. */
      fontSize: {
        '3xs': '0.65rem', // ~9.9px @root 15.25 → ~11.7px @root 18 · label mikro uppercase
        '2xs': '0.72rem', // ~11px  → ~13px · meta sekunder
        xsm: '0.85rem',   // ~13px  → ~15px · body kecil
        amount: '0.95rem', // ~14.5px → ~17px · total berjalan (tabular, bold)
        heading: '1.12rem', // ~17px → ~20px · judul dialog/seksi
        title: '1.44rem',  // ~22px → ~26px · judul layar
        metric: '1.84rem', // ~28px → ~33px · angka utama satu layar
      },
      /* 4.5 = 18px dan 5.5 = 22px pada root HP: dua ukuran ikon yang dulu
         ditulis `h-[18px] w-[18px]` / `h-[22px]` di 55 tempat. Sebagai rem,
         ikon ikut membesar bersama teks di sebelahnya. */
      spacing: {
        '4.5': '1.18rem',
        '5.5': '1.44rem',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          /* Brand saat ia jadi teks/ikon di atas ground, bukan bidang isian.
             Di mode gelap nilainya diangkat oleh `applyThemeColor`. */
          text: "hsl(var(--primary-text))",
          /* Teks sekunder DI ATAS bidang brand — ditint dari hue brand. */
          dim: "hsl(var(--primary-dim))",
          press: "hsl(var(--primary-press))",
          deep: "hsl(var(--primary-deep))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          text: "hsl(var(--destructive-text))",
          tint: "hsl(var(--destructive-tint))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          text: "hsl(var(--info-text))",
          tint: "hsl(var(--info-tint))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        /* Tingkat ketiga untuk meta yang benar-benar sekunder; tetap 4.6:1. */
        faint: {
          foreground: "hsl(var(--faint-foreground))",
        },
        /* Sistem pengenal kategori. `cat-N` isian solid, `cat-N-bg` tint
           permukaannya, `cat-N-on` tinta di atas tint itu (lolos 3:1). */
        cat: {
          1: "hsl(var(--cat-1))", "1-bg": "hsl(var(--cat-1-bg))", "1-on": "hsl(var(--cat-1-on))",
          2: "hsl(var(--cat-2))", "2-bg": "hsl(var(--cat-2-bg))", "2-on": "hsl(var(--cat-2-on))",
          3: "hsl(var(--cat-3))", "3-bg": "hsl(var(--cat-3-bg))", "3-on": "hsl(var(--cat-3-on))",
          4: "hsl(var(--cat-4))", "4-bg": "hsl(var(--cat-4-bg))", "4-on": "hsl(var(--cat-4-on))",
          5: "hsl(var(--cat-5))", "5-bg": "hsl(var(--cat-5-bg))", "5-on": "hsl(var(--cat-5-on))",
          6: "hsl(var(--cat-6))", "6-bg": "hsl(var(--cat-6-bg))", "6-on": "hsl(var(--cat-6-on))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          strong: "hsl(var(--accent-strong))",
        },
        surface: {
          alt: "hsl(var(--surface-alt))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          text: "hsl(var(--success-text))",
          tint: "hsl(var(--success-tint))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          text: "hsl(var(--warning-text))",
          tint: "hsl(var(--warning-tint))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderColor: {
        tab: "hsl(var(--border-tab))",
        soft: "hsl(var(--border-soft))",
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        display: ['"Hanken Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      /**
       * SATU tingkat elevasi, dan hanya satu cara memisahkan permukaan.
       *
       * Terang memisah dengan bayangan (offset + blur lembut, bukan halo);
       * gelap memisah dengan garis, karena bayangan tidak terbaca di sana.
       * Keduanya tidak pernah dipakai bersamaan — garis 1px plus bayangan
       * 24px adalah tanda paling jelas bahwa kartunya dirakit, bukan
       * dirancang.
       *
       * Semua nama lama (`xs`, `sm`, `md`, `lg`, `xl`, `card`, `soft*`,
       * `glow*`, `elevated`) sengaja dipetakan ke nilai yang sama supaya
       * kelas yang masih tersebar di 17 halaman ikut rata tanpa disentuh
       * satu per satu. Yang berbeda cuma dua: `none` dan varian brand.
       */
      boxShadow: {
        lift: '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        'lift-brand': '0 2px 4px hsl(var(--primary-deep) / 0.18), 0 14px 28px -16px hsl(var(--primary-deep) / 0.55)',
        xs: '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        sm: '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        md: '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        lg: '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        xl: '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        card: '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        'card-lg': '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        soft: '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        'soft-lg': '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        'soft-xl': '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        elevated: '0 1px 2px rgb(15 20 34 / 0.05), 0 10px 24px -14px rgb(15 20 34 / 0.22)',
        primary: '0 2px 4px hsl(var(--primary-deep) / 0.18), 0 14px 28px -16px hsl(var(--primary-deep) / 0.55)',
        glow: '0 2px 4px hsl(var(--primary-deep) / 0.18), 0 14px 28px -16px hsl(var(--primary-deep) / 0.55)',
        'glow-lg': '0 2px 4px hsl(var(--primary-deep) / 0.18), 0 14px 28px -16px hsl(var(--primary-deep) / 0.55)',
        destructive: '0 2px 4px hsl(var(--destructive) / 0.18), 0 14px 28px -16px hsl(var(--destructive) / 0.5)',
      },
      /**
       * Satu skala sudut untuk seluruh app. `--radius` = 12px (kontrol).
       *   lg  12px  tombol, input, chip persegi
       *   xl  14px  kartu, baris daftar, thumbnail
       *   2xl 18px  ubin layanan, sheet, dialog
       *   3xl 24px  panel brand yang dicelup
       * Nilai di bawah ditulis sebagai kelipatan `--radius` supaya mengganti
       * satu angka menggeser seluruh sistem secara proporsional.
       */
      borderRadius: {
        xs: 'calc(var(--radius) * 0.33)',   /* 4px  */
        sm: 'calc(var(--radius) * 0.5)',    /* 6px  */
        md: 'calc(var(--radius) * 0.83)',   /* 10px */
        lg: 'var(--radius)',                /* 12px */
        xl: 'calc(var(--radius) * 1.17)',   /* 14px */
        '2xl': 'calc(var(--radius) * 1.5)', /* 18px */
        '3xl': 'calc(var(--radius) * 2)',   /* 24px */
        '4xl': 'calc(var(--radius) * 2.67)',/* 32px */
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        /* Momen bergarap milik app ini: nominal mendarat saat ia berubah.
           Dimulai dari keadaan yang SUDAH terlihat (opacity 1) supaya angka
           tidak pernah hilang walau animasinya tidak jalan, dan hanya
           menyentuh transform. */
        "amount-land": {
          from: { transform: "translateY(0.22em) scale(0.97)" },
          to: { transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.4s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        float: "float 3s ease-in-out infinite",
        /* Ease-out eksponensial: cepat di awal, mendarat halus. */
        "amount-land": "amount-land 0.42s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
