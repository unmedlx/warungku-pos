import { Download } from "lucide-react";
import { WhatsAppIcon } from "./icons";
import { Tombol } from "./ui";
import { TAUTAN } from "../tautan";

/** Ajakan terakhir sebelum footer, di atas panel gradien yang sama dengan kartu harga. */
/** `alt` = latar abu, menyambung FAQ di atasnya. */
export default function Penutup({ alt = true }: { alt?: boolean }) {
  return (
    <section className={`${alt ? "bg-background" : "bg-card"} pb-12 pt-0 desktop:pb-16`}>
      <div className="bungkus">
        <div
          className="rounded-2xl px-6 py-12 text-center text-white desktop:py-14"
          style={{
            background:
              "linear-gradient(140deg, hsl(var(--primary-dark)) 0%, hsl(var(--primary)) 100%)",
          }}
        >
          <h2 className="text-2xl font-semibold tracking-tight desktop:text-[28px]">
            Transaksi pertama kamu bisa dicatat malam ini
          </h2>
          <p className="mt-2 text-base opacity-85">
            Nggak ada demo, nggak ada sales yang nelpon.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2.5 desktop:flex-row">
            <Tombol href={TAUTAN.download} variant="terang" size="xl" blok className="desktop:w-auto">
              <Download className="h-[18px] w-[18px]" />
              Download Gratis
            </Tombol>
            <Tombol href={TAUTAN.whatsapp} variant="hantu" size="xl" blok className="desktop:w-auto">
              <WhatsAppIcon className="h-[18px] w-[18px]" />
              Chat WhatsApp
            </Tombol>
          </div>
          <p className="mt-5 text-[13px] opacity-70">
            Gratis · Tanpa daftar · Bisa langsung dicoba dari browser
          </p>
        </div>
      </div>
    </section>
  );
}
