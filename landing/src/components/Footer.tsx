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
