import { Check, Download, Globe, Monitor, Smartphone } from "lucide-react";
import { WhatsAppIcon } from "./icons";
import PhoneMockup from "./PhoneMockup";
import { Badge, Tombol } from "./ui";
import { TAUTAN } from "../tautan";

const jaminan = ["Rp 0 selamanya", "Tanpa daftar akun", "Jalan tanpa sinyal"];

/**
 * Baris platform dipisah dari `jaminan` karena bentuknya beda: ikon + nama,
 * bukan badge. Ini satu-satunya tempat di paruh atas halaman yang menyebut
 * Windows, jadi jangan dihapus tanpa memindahkannya ke tempat lain.
 */
const platform = [
  { icon: Smartphone, label: "Android" },
  { icon: Monitor, label: "Windows" },
  { icon: Globe, label: "Browser" },
];

export default function Hero() {
  return (
    <section
      id="beranda"
      className="relative overflow-hidden py-10 desktop:pb-20 desktop:pt-[72px]"
      style={{
        // Sapuan biru tipis di kanan atas, lalu meluruh jadi putih di bawah.
        background:
          "radial-gradient(900px 420px at 80% 0%, hsl(var(--primary) / 0.12), transparent 60%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--card)) 75%)",
      }}
    >
      <div className="bungkus grid items-center gap-10 desktop:grid-cols-[1.05fr_0.95fr] desktop:gap-14">
        <div>
          <Badge variant="success">
            <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
            Gratis selamanya
          </Badge>

          <h1 className="my-4 text-[32px] font-semibold leading-[1.1] tracking-tight desktop:text-[44px]">
            Aplikasi kasir gratis untuk{" "}
            <span className="text-primary">warung, toko &amp; resto kecil</span>
          </h1>

          <p className="max-w-[32rem] text-base text-muted-foreground desktop:text-[17px]">
            Catat jualan, hitung untung, atur stok. Isi daftar barangnya tinggal foto
            rak atau sebutin &mdash; nggak perlu ngetik satu-satu. Jalan di HP Android
            atau laptop Windows, tanpa daftar, tanpa internet.
          </p>

          <div className="mb-3.5 mt-7 flex flex-col gap-2.5 desktop:flex-row">
            <Tombol href={TAUTAN.download} variant="primary" size="xl" blok className="desktop:w-auto">
              <Download className="h-[18px] w-[18px]" />
              Download Gratis
            </Tombol>
            <Tombol href={TAUTAN.whatsapp} variant="wa" size="xl" blok className="desktop:w-auto">
              <WhatsAppIcon className="h-[18px] w-[18px]" />
              Tanya dulu via WhatsApp
            </Tombol>
          </div>

          <p className="text-sm text-muted-foreground">
            Nggak mau install dulu?{" "}
            <a href={TAUTAN.aplikasiWeb} className="font-medium text-primary hover:underline">
              Coba langsung dari browser
            </a>
            .
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {jaminan.map((j) => (
              <Badge key={j}>{j}</Badge>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-[13px] text-muted-foreground">
            {platform.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <Icon className="h-[15px] w-[15px]" strokeWidth={1.8} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
