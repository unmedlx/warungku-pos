<!-- Superdesign init — generated for `landing` -->

# Layouts — `landing`

Shared shell/layout components with FULL source.

### `src/components/Header.tsx`

```tsx
import Logo from "./Logo";
import { Tombol } from "./ui";
import { TAUTAN } from "../tautan";

const menu = [
  { label: "Fitur", href: "#fitur" },
  { label: "Cara pakai", href: "#cara" },
  { label: "Harga", href: "#harga" },
  { label: "Tanya jawab", href: "#tanya" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-[70] border-b border-border bg-card/85 backdrop-blur-[10px]">
      <div className="bungkus flex h-16 items-center gap-8">
        <a href="#beranda" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8 shrink-0 rounded-lg" />
          <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
            Kan<span className="text-primary">POS</span>
          </span>
        </a>

        <nav className="hidden gap-6 desktop:flex">
          {menu.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {m.label}
            </a>
          ))}
        </nav>

        {/*
          Di mobile hanya CTA utama yang muncul di sini — "Coba di browser"
          tetap tersedia sebagai tautan teks di hero, dan bar bawah yang
          memegang aksi utamanya.
        */}
        <div className="ml-auto flex items-center gap-2">
          <Tombol href={TAUTAN.aplikasiWeb} size="sm" className="hidden desktop:inline-flex">
            Coba di browser
          </Tombol>
          <Tombol href={TAUTAN.download} variant="primary" size="sm">
            Download Gratis
          </Tombol>
        </div>
      </div>
    </header>
  );
}
```


### `src/components/Footer.tsx`

```tsx
import Logo from "./Logo";
import { TAUTAN } from "../tautan";

/**
 * Domain kanal masih campur (kasirgratisan / kankitu / freekasir), jadi tiap
 * tautan keluar menyebut tujuannya apa adanya. Ini penambal, bukan solusi —
 * begitu domain dikonsolidasi, `dom` bisa dihapus dan cukup `tautan.ts` yang
 * diubah.
 */
const tautan: {
  judul: string;
  items: { label: string; href: string; dom?: string }[];
}[] = [
  {
    judul: "Produk",
    items: [
      { label: "Fitur", href: "/#fitur" },
      { label: "Harga", href: "/#harga" },
      { label: "Download aplikasi", href: TAUTAN.download, dom: "Android & Windows" },
      { label: "Buka dari browser", href: TAUTAN.aplikasiWeb, dom: "kasirgratisan.com" },
      { label: "Dashboard pemilik", href: TAUTAN.dashboard, dom: "dashboard.kankitu.com" },
    ],
  },
  {
    judul: "Bantuan",
    items: [
      { label: "Tanya jawab", href: "/#tanya" },
      { label: "WhatsApp", href: TAUTAN.whatsapp },
      { label: "Telegram", href: TAUTAN.telegram },
      { label: "Lapor kendala", href: TAUTAN.laporKendala, dom: "kasirgratisan.fider.io" },
    ],
  },
  {
    judul: "Lainnya",
    items: [
      { label: "Kebijakan privasi", href: TAUTAN.privasi },
      { label: "Syarat pakai", href: TAUTAN.syarat },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#111111] pb-7 pt-12 text-[#c7c7c7] desktop:pt-14">
      <div className="bungkus">
        <div className="desktop:grid desktop:grid-cols-[1.4fr_2fr] desktop:items-start desktop:gap-12">
          <div>
            <a href="/#beranda" className="flex items-center gap-2.5">
              <Logo className="h-8 w-8 shrink-0 rounded-lg" />
              <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-white">
                Kan<span className="text-[#8FA6F5]">POS</span>
              </span>
            </a>
            <p className="mt-3.5 max-w-[38ch] text-sm text-[#9a9a9a]">
              Aplikasi kasir gratis buat warung, toko, dan resto kecil di Indonesia.
            </p>
            <p className="mt-2.5 max-w-[38ch] text-xs text-[#7c7c7c]">
              Nama domain kami masih beda-beda karena sejarah. Semuanya milik kami —
              tujuan tiap tautan ditulis biar kamu nggak ragu waktu diklik.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6 desktop:mt-0 desktop:grid-cols-3">
            {tautan.map((t) => (
              <div key={t.judul}>
                <h4 className="mb-3 text-[13px] font-semibold text-white">{t.judul}</h4>
                <ul className="grid list-none gap-2 p-0">
                  {t.items.map((it) => (
                    <li key={it.label}>
                      <a href={it.href} className="text-sm transition-colors hover:text-white">
                        {it.label}
                        {it.dom && (
                          <span className="block text-xs text-[#7c7c7c]">{it.dom}</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-[#262626] pt-5 text-xs text-[#7c7c7c]">
          <span>© 2026 KanPOS</span>
          {/* Ini soal bahasa aplikasi (`frontend/src/i18n/locales`), bukan daftar
              negara — dulu terbaca ambigu. */}
          <span className="flex items-center gap-1.5">
            Tersedia dalam
            {["Bahasa Indonesia", "English", "Bahasa Melayu"].map((b) => (
              <span key={b} className="rounded-[5px] border border-[#333] px-2 py-0.5 text-[#a3a3a3]">
                {b}
              </span>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
```


### `src/components/BottomBar.tsx`

```tsx
import { WhatsAppIcon } from "./icons";
import { Tombol } from "./ui";
import { TAUTAN } from "../tautan";

/** Bar aksi tetap di bawah layar, hanya di mobile. */
export default function BottomBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] flex gap-2 border-t border-border bg-card px-3 py-2.5 shadow-bar desktop:hidden">
      <Tombol href={TAUTAN.download} variant="primary" className="flex-1">
        Download Gratis
      </Tombol>
      <a
        href={TAUTAN.whatsapp}
        aria-label="Chat WhatsApp"
        className="inline-flex h-10 w-11 flex-none items-center justify-center rounded-lg bg-wa text-white transition hover:brightness-110"
      >
        <WhatsAppIcon className="h-[22px] w-[22px]" />
      </a>
    </div>
  );
}
```

