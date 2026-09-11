import {
  BarChart3,
  Boxes,
  LineChart,
  Printer,
  ShoppingCart,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, DaftarCek, JudulSeksi, IkonKotak, Kartu } from "./ui";
import type { Tone } from "./ui";

const manfaat: {
  tone: Tone;
  icon: LucideIcon;
  judul: string;
  ket: string;
  list: string[];
  label?: string;
  labelJenis?: "warning" | "primary";
}[] = [
  {
    tone: "primary",
    icon: ShoppingCart,
    judul: "Kasir yang cepat",
    ket: "Tinggal ketuk barangnya, kembalian dihitung sendiri.",
    list: [
      "Scan barcode pakai kamera HP",
      "Diskon per barang atau sekaligus",
      "Pesanan belum bayar bisa disimpan",
      "Tiket dapur buat kafe & resto",
    ],
  },
  {
    tone: "success",
    icon: LineChart,
    judul: "Untung, bukan cuma omzet",
    ket: "Modal barang dipotong otomatis, jadi angkanya jujur.",
    list: [
      "Laporan harian, 7 hari, 30 hari",
      "Barang paling laris kelihatan",
      "Pengeluaran warung ikut dicatat",
      "Rekap bisa diekspor ke Excel",
    ],
  },
  {
    tone: "warning",
    icon: Boxes,
    judul: "Stok nggak kacau lagi",
    ket: "Stok berkurang sendiri tiap ada yang beli.",
    list: [
      "Diingatkan kalau stok mau habis",
      "Barang masuk dari supplier tercatat",
      "Stok opname buat cocokkan hitungan fisik",
      "Isi daftar barang sekaligus dari Excel",
    ],
  },
  {
    tone: "netral",
    icon: Printer,
    judul: "Struk, utang & karyawan",
    ket: "Cetak struk, catat kasbon, dan karyawan boleh pegang kasir dengan aman.",
    list: [
      "Printer bluetooth, atau kirim lewat WA",
      "Utang pelanggan tercatat & bisa dicicil",
      "Karyawan masuk pakai PIN sendiri",
      "Laporan bisa disembunyikan dari mereka",
    ],
  },
  {
    tone: "info",
    icon: Store,
    judul: "Toko online sendiri",
    ket: "Barang di kasir bisa dipajang jadi etalase online, lengkap dengan QR untuk dicetak.",
    label: "Butuh internet",
    labelJenis: "warning",
    list: [
      "Alamat toko sendiri yang bisa dibagikan",
      "QR code siap tempel di meja kasir",
      "Kamu yang atur mau tampil atau tidak",
    ],
  },
  {
    tone: "primary",
    icon: BarChart3,
    judul: "Banyak kasir, satu data",
    ket: "Dua HP kasir atau lebih jalan bareng dengan katalog yang sama. Ringkasannya kamu buka dari mana saja, tanpa harus ada di tokonya.",
    label: "Paket berbayar",
    labelJenis: "primary",
    list: [
      "Karyawan pegang HP sendiri, transaksinya masuk semua",
      "Produk & harga diubah sekali, semua HP ikut",
      "Ringkasan semua toko dalam satu layar",
      "Bandingkan cabang & lihat tren 12 bulan",
    ],
  },
];

export default function Manfaat() {
  return (
    <section id="fitur" className="seksi seksi-alt">
      <div className="bungkus">
        <JudulSeksi
          judul="Yang kamu dapat"
          ket="Semua urusan kasirnya gratis. Yang butuh internet atau paket berbayar kami tandai, biar jelas dari awal."
        />
        <div className="grid gap-4 desktop:grid-cols-3">
          {manfaat.map((m) => (
            <Kartu key={m.judul} className="p-5 desktop:p-6">
              <IkonKotak tone={m.tone}>
                <m.icon className="h-5 w-5" strokeWidth={1.75} />
              </IkonKotak>
              <h3 className="mt-4 flex flex-wrap items-center gap-2 text-base font-semibold">
                {m.judul}
                {m.label && (
                  <Badge variant={m.labelJenis === "warning" ? "warning" : "primary"} size="sm">
                    {m.label}
                  </Badge>
                )}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{m.ket}</p>
              <DaftarCek items={m.list} />
            </Kartu>
          ))}
        </div>
      </div>
    </section>
  );
}
