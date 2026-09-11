import { KeranjangBaris, KeranjangTotal, LayarKecil, Struk } from "./MiniLayar";
import { JudulSeksi } from "./ui";

const langkah = [
  {
    no: 1,
    judul: "Pembeli datang",
    ket: "Ketuk barangnya, atau scan barcode-nya.",
    layar: (
      <LayarKecil tulisan="Pilih barang">
        <KeranjangBaris emoji="🍚" nama="Beras 5kg" sub="1 × Rp 68.000" nilai="68.000" />
        <KeranjangBaris emoji="🍜" nama="Mie instan" sub="3 × Rp 3.500" nilai="10.500" />
        <KeranjangTotal nama="Total belanja" nilai="Rp 78.500" />
      </LayarKecil>
    ),
  },
  {
    no: 2,
    judul: "Terima uang",
    ket: "Kembaliannya dihitung aplikasi, nggak perlu kalkulator.",
    layar: (
      <LayarKecil tulisan="Bayar">
        <KeranjangBaris nama="Total" nilai="Rp 78.500" />
        <KeranjangBaris nama="Uang diterima" nilai="Rp 100.000" />
        <KeranjangTotal nama="Kembalian" nilai="Rp 21.500" />
      </LayarKecil>
    ),
  },
  {
    no: 3,
    judul: "Kasih struk",
    ket: "Cetak ke printer bluetooth, atau kirim gambarnya lewat WhatsApp.",
    layar: (
      <LayarKecil tulisan="Struk">
        <Struk />
      </LayarKecil>
    ),
  },
  {
    no: 4,
    judul: "Warung tutup",
    ket: "Lihat hari ini untung berapa, tanpa hitung manual.",
    layar: (
      <LayarKecil tulisan="Tutup toko · 13 Agustus">
        <KeranjangBaris nama="Omzet" nilai="Rp 1.284.000" />
        <KeranjangBaris nama="Modal barang" nilai="Rp 1.043.100" />
        <KeranjangBaris nama="Pengeluaran" nilai="Rp 67.000" />
        <KeranjangTotal nama="Untung bersih" nilai="Rp 173.900" hijau />
      </LayarKecil>
    ),
  },
];

/** Satu hari kerja, dari pembeli datang sampai warung tutup. */
export default function Langkah() {
  return (
    <section id="cara" className="seksi">
      <div className="bungkus">
        <JudulSeksi
          judul="Sehari pakai KanPOS"
          ket="Dari pembeli datang sampai warung tutup."
        />
        <div className="grid gap-6 desktop:grid-cols-4 desktop:gap-5">
          {langkah.map((l) => (
            <div key={l.no}>
              <span className="mb-3.5 grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                {l.no}
              </span>
              <h3 className="text-base font-semibold">{l.judul}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{l.ket}</p>
              {l.layar}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
