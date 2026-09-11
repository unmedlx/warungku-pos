import { JudulSeksi, Kartu } from "./ui";

const usaha = [
  { emoji: "🏪", label: "Warung kelontong" },
  { emoji: "🍚", label: "Toko sembako" },
  { emoji: "☕", label: "Kafe & resto kecil" },
  { emoji: "🍵", label: "Coffee shop" },
  { emoji: "🧺", label: "Laundry" },
  { emoji: "💈", label: "Salon & barbershop" },
  { emoji: "💊", label: "Apotek" },
  { emoji: "👕", label: "Toko pakaian" },
  { emoji: "🔨", label: "Toko bangunan" },
  { emoji: "📱", label: "Toko elektronik" },
  { emoji: "📦", label: "Jualan online" },
  { emoji: "✨", label: "Usaha lain" },
];

export default function Usaha() {
  return (
    <section className="seksi seksi-alt">
      <div className="bungkus-lg">
        <JudulSeksi
          judul="Cocok buat usaha kamu"
          ket="Pilih jenis usahanya, barang contoh langsung terisi. Tinggal ganti harga."
        />
        <div className="flex flex-wrap justify-center gap-2">
          {usaha.map((u) => (
            <span
              key={u.label}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-3.5 text-sm font-medium shadow-xs transition-colors hover:border-primary hover:text-primary"
            >
              <span aria-hidden="true">{u.emoji}</span>
              {u.label}
            </span>
          ))}
        </div>
        <Kartu className="mt-7 p-5 text-sm text-muted-foreground desktop:p-6">
          Contoh: pilih <b className="font-semibold text-foreground">Warung Kelontong</b>,
          langsung dapat kategori Sembako, Minuman, Rokok, Kebutuhan Rumah, satuan
          pcs/kg/bungkus/renceng/sachet, plus 8 barang contoh lengkap dengan harga dan
          modalnya. Buat <b className="font-semibold text-foreground">laundry dan salon</b>,
          kolom stok otomatis dimatikan biar nggak bikin bingung.
        </Kartu>
      </div>
    </section>
  );
}
