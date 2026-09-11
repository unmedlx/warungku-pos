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
          <Tombol href={TAUTAN.playStore} variant="primary" size="sm">
            Download Gratis
          </Tombol>
        </div>
      </div>
    </header>
  );
}
