import { Camera, Info, Mic, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, IkonKotak, Kartu } from "./ui";
import type { Tone } from "./ui";
import { KUOTA_AI } from "../tautan";

/**
 * Tiga fitur AI dipisah jadi seksinya sendiri, bukan ditambahkan sebagai kartu
 * ke-7 dan ke-8 di `Manfaat`: grid tiga kolom di sana jadi timpang dengan
 * delapan kartu, dan inilah pembeda utama dari aplikasi kasir gratis lain —
 * pantas dapat judul sendiri.
 *
 * Angka kuota HARUS lewat `KUOTA_AI` (lihat `tautan.ts`), jangan ditulis
 * langsung, supaya tidak menjanjikan jatah yang berbeda dari yang ditegakkan
 * server.
 */
const fitur: {
  tone: Tone;
  icon: LucideIcon;
  judul: string;
  label: { teks: string; jenis: "warning" | "primary" }[];
  ket: string;
  contoh?: string;
}[] = [
  {
    tone: "primary",
    icon: Camera,
    judul: "Foto rak, produknya masuk sendiri",
    label: [{ teks: `${KUOTA_AI.scan}×/bulan gratis`, jenis: "warning" }],
    ket: "Jepret rak atau etalase. Nama, harga, dan modalnya dibaca dari foto, kamu tinggal koreksi yang meleset.",
  },
  {
    tone: "primary",
    icon: Mic,
    judul: "Sebutin produknya, nggak usah ngetik",
    label: [{ teks: "Jatah sama dengan foto", jenis: "warning" }],
    ket: "Pegang HP, sebutkan barang satu per satu. Sekali rekam cukup buat sekitar 8 produk.",
    contoh:
      "“Beras lima kilo, modal enam puluh, jual enam delapan… terus… Mie instan, modal dua ribu delapan ratus, jual tiga lima”",
  },
  {
    tone: "success",
    icon: ShoppingCart,
    judul: "Kasir lewat suara",
    label: [
      { teks: `${KUOTA_AI.kasirSuara} sesi/bulan gratis`, jenis: "warning" },
      { teks: "Langganan → tanpa batas", jenis: "primary" },
    ],
    ket: "Tangan sibuk bungkus? Sebut aja belanjaannya, keranjangnya terisi sendiri. Yang salah dengar dipisah supaya gampang dicek.",
    contoh: "“Dua mie instan, satu beras lima kilo, tiga aqua botol”",
  },
];

export default function Ai() {
  return (
    <section id="ai" className="seksi">
      <div className="bungkus grid gap-10 desktop:grid-cols-[0.9fr_1.1fr] desktop:items-center desktop:gap-12">
        <div>
          <Badge variant="primary">Fitur baru</Badge>

          <h2 className="mt-3.5 text-2xl font-semibold tracking-tight desktop:text-[28px]">
            Yang paling capek itu ngetik. Jadi nggak usah.
          </h2>
          <p className="mt-2.5 text-base text-muted-foreground">
            Warung punya ratusan barang. Ngetik satu-satu bikin orang nyerah di hari
            pertama. Di KanPOS, ngisi produk dan melayani pembeli bisa lewat kamera atau
            suara.
          </p>

          {/* Syaratnya disebut di awal, bukan di bawah kartu: fitur ini satu-satunya
              bagian aplikasi yang tidak jalan tanpa internet, dan pengunjung baru saja
              dijanjikan "jalan tanpa sinyal" di hero. */}
          <div className="mt-[18px] flex gap-2.5 rounded-lg border border-warning/25 bg-warning/[0.08] px-3.5 py-3 text-[13.5px] text-warning-text">
            <Info className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2} />
            <span>
              Tiga fitur ini <b className="font-semibold">butuh internet dan masuk akun
              Google</b>, karena diproses di server kami. Gratisnya pakai jatah bulanan;
              sisanya tetap gratis selamanya.
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          {fitur.map((f) => (
            <Kartu key={f.judul} className="flex gap-4 px-5 py-[18px]">
              <IkonKotak tone={f.tone}>
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </IkonKotak>
              <div>
                <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                  {f.judul}
                  {f.label.map((l) => (
                    <Badge key={l.teks} variant={l.jenis} size="sm">
                      {l.teks}
                    </Badge>
                  ))}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.ket}</p>
                {f.contoh && (
                  <p className="mt-2.5 rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs leading-relaxed">
                    {f.contoh}
                  </p>
                )}
              </div>
            </Kartu>
          ))}
        </div>
      </div>
    </section>
  );
}
