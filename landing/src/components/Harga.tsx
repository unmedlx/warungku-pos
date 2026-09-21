import { Check } from "lucide-react";
import { DaftarCek, JudulSeksi, Kartu, Tombol } from "./ui";
import { KUOTA_AI, TAUTAN } from "../tautan";

const fiturGratis = [
  "Transaksi sepuasnya, barang sebanyak apa pun",
  "Laporan untung rugi & stok",
  "Cetak struk & scan barcode",
  "Catat utang pelanggan & pengeluaran",
  "Akun karyawan dengan PIN di HP itu sendiri",
  "Backup data ke file sendiri",
  `Jatah AI tiap bulan: ${KUOTA_AI.scan}× foto/dikte produk, ${KUOTA_AI.kasirSuara} sesi kasir suara`,
  "Android, Windows & browser",
];

/**
 * Paket berbayar. Harga, kuota, batas toko, dan jumlah anggota HARUS sama dengan katalog paket
 * di backend (`backend/prisma/seed.ts` → tabel `plans`), karena itu yang dipakai
 * saat checkout. Semua paket berdurasi 30 hari (`Plan.durationDays`).
 *
 * Jumlah karyawan diturunkan dari `Plan.maxMembers`, yang menghitung pemilik:
 * SYNC_BASIC 3 → "kamu + 2 karyawan", SYNC_BUSINESS 15 → "kamu + 14 karyawan".
 * Paket STORAGE punya `maxMembers: 1`, jadi tidak membuka akses karyawan sama
 * sekali — itu sebabnya disebut eksplisit di keterangannya.
 */
const paket = [
  {
    grup: "Backup Otomatis",
    ket: "Data warung dicadangkan ke internet. Kalau HP hilang, tinggal ambil lagi. Untuk satu pemilik saja — belum termasuk akses karyawan.",
    isi: [
      { judul: "1 GB", ket: "cukup untuk warung sehari-hari", harga: "Rp 29.000" },
      { judul: "10 GB", ket: "buat yang backup-nya sering & lama", harga: "Rp 99.000" },
    ],
  },
  {
    grup: "Banyak Kasir & Pantau Dari Jauh",
    ket: "Beberapa HP kasir berbagi satu data, plus ringkasan semua toko yang bisa kamu buka dari mana saja.",
    isi: [
      { judul: "1 toko", ket: "1 GB, kamu + 2 karyawan", harga: "Rp 49.000" },
      { judul: "Sampai 5 toko", ket: "5 GB, kamu + 14 karyawan", harga: "Rp 149.000" },
    ],
  },
];

export default function Harga() {
  return (
    <section id="harga" className="seksi">
      <div className="bungkus">
        <JudulSeksi
          judul="Aplikasi kasirnya nol. Titik."
          ket="Nggak ada hitungan mundur, nggak ada fitur kasir yang tiba-tiba dikunci."
        />

        <div className="grid items-start gap-4 desktop:grid-cols-[1.05fr_0.95fr]">
          {/* Panel gratis — satu-satunya blok gelap di tengah halaman, sengaja
              menonjol karena inilah tawaran utamanya. */}
          <div
            className="rounded-2xl p-6 text-white desktop:p-8"
            style={{
              background:
                "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)",
            }}
          >
            <span className="inline-flex h-6 items-center rounded-md border border-white/25 bg-white/15 px-2.5 text-xs font-medium">
              Aplikasi kasir lengkap
            </span>
            <div className="mb-1.5 mt-4 text-[52px] font-semibold leading-none tracking-tight tabular-nums desktop:text-[60px]">
              Rp 0
            </div>
            <p className="text-sm opacity-85">
              Selamanya. Tanpa kartu kredit, tanpa daftar akun.
            </p>
            <DaftarCek items={fiturGratis} terang />
            <Tombol href={TAUTAN.download} variant="terang" size="xl" blok className="mt-6">
              Download Gratis
            </Tombol>
          </div>

          <div>
            <Kartu className="divide-y divide-border overflow-hidden">
              {paket.map((p) => (
                <div key={p.grup} className="px-5 py-5 desktop:px-6">
                  <h3 className="text-base font-semibold">{p.grup}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{p.ket}</p>
                  <div className="mt-2">
                    {p.isi.map((o, j) => (
                      <div
                        key={o.judul}
                        className={`flex items-center justify-between gap-3 py-3 ${
                          j !== p.isi.length - 1 ? "border-b border-dashed border-border" : "pb-0"
                        }`}
                      >
                        <span>
                          <b className="block text-sm font-semibold">{o.judul}</b>
                          <span className="text-[13px] text-muted-foreground">{o.ket}</span>
                        </span>
                        <span className="whitespace-nowrap text-right">
                          <em className="text-lg font-semibold not-italic tabular-nums">
                            {o.harga}
                          </em>
                          <small className="block text-[11px] text-muted-foreground">
                            /bulan
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Berlangganan apa pun membuat kasir suara tanpa batas
                  (`voice-cart/service.ts` → `hasActiveSubscription`), tapi TIDAK
                  menaikkan jatah foto/dikte: semua paket di `seed.ts` masih
                  `aiScanQuota: 0`. Dua-duanya disebut supaya tidak ada yang
                  berlangganan karena mengira jatah fotonya ikut naik. */}
              <p className="flex gap-2.5 border-t border-border bg-background px-5 py-3.5 text-[13.5px] desktop:px-6">
                <Check className="mt-0.5 h-4 w-4 flex-none text-success-text" strokeWidth={2.5} />
                <span>
                  <b className="font-semibold">Semua paket:</b> kasir suara jadi tanpa
                  batas. Jatah foto/dikte produk tetap {KUOTA_AI.scan}×/bulan.
                </span>
              </p>
            </Kartu>

            <p className="mt-4 px-1 text-sm text-muted-foreground">
              Dua-duanya opsional dan dibayar per bulan. Nggak beli pun aplikasi kasirnya
              tetap lengkap — cuma backup-nya kamu simpan sendiri, dan kasirnya jalan di
              satu HP. Untuk pakai paket ini kamu perlu masuk dengan akun Google.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
