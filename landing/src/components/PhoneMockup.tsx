import { Clock, LayoutGrid, Package, Receipt, Search } from "lucide-react";

/**
 * Layar kasir di dalam bingkai HP untuk hero.
 *
 * Sebelumnya isinya layar beranda bergaya dashboard (kartu angka + grafik
 * kapsul). Sekarang yang ditampilkan layar kasir — pekerjaan yang benar-benar
 * dilakukan pengunjung setiap hari — dan digambar dengan komponen yang sama
 * seperti aplikasi aslinya: kartu produk bergaris, bar keranjang mengambang,
 * bottom nav. Jadi apa yang dilihat di landing sama dengan yang didapat.
 */

const produk = [
  { emoji: "🍚", nama: "Beras 5 kg", harga: "Rp 68.000", stok: "Stok 12" },
  { emoji: "🍜", nama: "Mie instan", harga: "Rp 3.500", stok: "Stok 48" },
  { emoji: "🥚", nama: "Telur 1 kg", harga: "Rp 28.000", stok: "Stok 9" },
  { emoji: "🧴", nama: "Minyak 1 L", harga: "Rp 17.500", stok: "Stok 20" },
];

const kategori = ["Semua", "Sembako", "Minuman", "Rokok", "Rumah"];

const nav = [
  { icon: LayoutGrid, label: "Kasir", aktif: true },
  { icon: Clock, label: "Riwayat" },
  { icon: Package, label: "Barang" },
  { icon: Receipt, label: "Laporan" },
];

export default function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      className="w-[264px] shrink-0 overflow-hidden rounded-[36px] border-8 border-foreground bg-foreground shadow-hp desktop:w-[300px]"
    >
      <div className="flex h-[500px] flex-col bg-background text-xs desktop:h-[560px]">
        {/* kepala toko */}
        <div className="flex items-center justify-between border-b border-border bg-card px-3.5 pb-2.5 pt-3.5">
          <span className="text-sm font-semibold">Warung Bu Sri</span>
          <span className="inline-flex h-5 items-center rounded-md border border-success/20 bg-success/10 px-1.5 text-[11px] font-medium text-success-text">
            Offline OK
          </span>
        </div>

        {/* cari */}
        <div className="mx-3 mt-2.5 flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-muted-foreground shadow-xs">
          <Search className="h-3.5 w-3.5 flex-none" />
          Cari barang atau scan…
        </div>

        {/* kategori */}
        <div className="flex gap-1.5 overflow-hidden px-3 pt-2.5">
          {kategori.map((k, i) => (
            <span
              key={k}
              className={`flex h-[26px] flex-none items-center rounded-lg px-2.5 text-[11px] font-medium ${
                i === 0
                  ? "border border-primary bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {k}
            </span>
          ))}
        </div>

        {/* grid produk */}
        <div className="grid grid-cols-2 gap-2 px-3 py-2.5">
          {produk.map((p) => (
            <div key={p.nama} className="rounded-xl border border-border bg-card p-2 shadow-xs">
              <div className="mb-1.5 grid h-11 place-items-center rounded-lg bg-muted text-xl">
                {p.emoji}
              </div>
              <div className="truncate text-[11.5px] font-medium">{p.nama}</div>
              <div className="text-xs font-semibold tabular-nums">{p.harga}</div>
              <div className="text-[10.5px] text-muted-foreground">{p.stok}</div>
            </div>
          ))}
        </div>

        {/* keranjang mengambang */}
        <div className="mx-2.5 mb-2.5 mt-auto flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 pl-3 shadow-lg">
          <span className="flex-1">
            <small className="block text-[10.5px] text-muted-foreground">4 barang</small>
            <b className="text-[13px] font-semibold tabular-nums">Rp 78.500</b>
          </span>
          <span className="flex h-[34px] items-center rounded-lg bg-primary px-3.5 text-[12.5px] font-medium text-primary-foreground">
            Bayar
          </span>
        </div>

        {/* bottom nav */}
        <div className="flex justify-around border-t border-border bg-card px-1.5 py-2 text-[10px] text-muted-foreground">
          {nav.map(({ icon: Icon, label, aktif }) => (
            <span
              key={label}
              className={`flex flex-col items-center gap-0.5 ${aktif ? "font-medium text-primary" : ""}`}
            >
              <Icon className="h-[15px] w-[15px]" strokeWidth={1.9} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
