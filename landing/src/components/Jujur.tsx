import { TriangleAlert } from "lucide-react";
import { IkonKotak, JudulSeksi, Kartu } from "./ui";

const jujur = [
  {
    judul: "Data tersimpan di HP kamu",
    isi: "Enaknya: nggak butuh internet. Risikonya: kalau HP hilang dan belum di-backup, datanya ikut hilang. Backup cuma dua ketukan — biasakan tiap minggu.",
  },
  {
    judul: "Banyak kasir cuma jalan di paket berbayar",
    isi: "Versi gratisnya satu HP, satu data — dan itu memang cukup buat kebanyakan warung. Begitu kamu mau dua kasir atau lebih berbagi data yang sama, itu masuk paket berbayar dan perlu internet. Produk dan harga diubah dari HP kamu, lalu ikut ke HP karyawan.",
  },
  {
    judul: "Cetak struk paling lancar di Android",
    isi: "Pakai aplikasi Android-nya untuk printer bluetooth. Di iPhone, struknya disimpan jadi gambar lalu dikirim lewat WhatsApp.",
  },
  {
    judul: "Fitur cloud butuh akun Google",
    isi: "Kasirnya bisa dipakai tanpa daftar sama sekali. Tapi begitu kamu mau backup otomatis, pulihkan data dari cloud, pakai banyak kasir, atau buka toko online, kamu perlu masuk dengan akun Google.",
  },
];

/** Batasan yang disebut lebih dulu, supaya tidak jadi kejutan setelah install. */
export default function Jujur() {
  return (
    <section className="seksi seksi-alt">
      <div className="bungkus-lg">
        <JudulSeksi judul="Yang perlu kamu tahu dulu" />
        <Kartu className="divide-y divide-border overflow-hidden">
          {jujur.map((j) => (
            <div key={j.judul} className="flex gap-3.5 px-5 py-4">
              <IkonKotak tone="warning">
                <TriangleAlert className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </IkonKotak>
              <span>
                <b className="block text-sm font-semibold">{j.judul}</b>
                <span className="text-sm text-muted-foreground">{j.isi}</span>
              </span>
            </div>
          ))}
        </Kartu>
      </div>
    </section>
  );
}
