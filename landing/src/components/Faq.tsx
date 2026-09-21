import { Plus } from "lucide-react";
import { JudulSeksi, Kartu } from "./ui";
import { KUOTA_AI } from "../tautan";

const faq = [
  {
    q: "Beneran gratis?",
    // Versi lama bilang "kami nggak keluar biaya server" tanpa kecuali — itu
    // bentrok dengan fitur AI yang jelas-jelas diproses di server kami.
    a: "Iya. Aplikasi kasirnya jalan di HP kamu, jadi kami nggak keluar biaya server buat tiap transaksi. Yang pakai server kami cuma dua: paket cloud (backup otomatis, pantau dari jauh) yang berbayar, dan fitur AI (foto/suara) yang gratis dengan jatah bulanan. Nggak butuh dua-duanya? Kamu nggak akan pernah ditagih.",
  },
  {
    q: "Kenapa nggak ada di Play Store?",
    a: "Karena kami bagikan langsung dari sini, biar update-nya bisa kami kirim kapan saja tanpa nunggu antrean review, dan biar nggak ada versi tiruan. Waktu install, Android bakal nanya “izinkan dari sumber ini?” — itu peringatan standar untuk semua aplikasi di luar Play Store, bukan tanda ada masalah. Pastikan aja download-nya cuma dari halaman kami.",
  },
  {
    q: "Kalau ada versi baru, update-nya gimana?",
    a: "Aplikasinya ngecek sendiri. Kalau ada versi baru, muncul pemberitahuan di dalam aplikasi, tinggal ketuk dan pasang — data kamu nggak ke mana-mana. Berlaku di Android maupun Windows. Kalau mau lihat apa yang berubah tiap versi, ada di halaman download.",
  },
  {
    q: "Kalau HP saya rusak atau hilang?",
    a: "Kalau sudah pernah backup, tinggal restore dan datanya balik. Kalau belum pernah backup dan nggak langganan, datanya hilang — kami nggak menyimpan salinannya. Makanya biasakan backup tiap minggu, cuma dua ketukan.",
  },
  {
    q: "HP saya jadul, kuat nggak?",
    a: "Kuat. Aplikasinya ringan dan datanya ada di HP, jadi sehari-hari hampir nggak makan kuota. Internet cuma kepakai waktu update versi baru atau kalau kamu pakai fitur cloud dan AI.",
  },
  {
    q: "Saya belum pernah pakai aplikasi kasir.",
    a: "Nggak apa-apa. Awalnya cuma tiga layar: pilih bahasa, pilih jenis usaha, isi nama toko. Barang contoh sudah disiapkan jadi kamu bisa langsung coba jualan. Pas mau isi barang sendiri, nggak usah ngetik: foto raknya atau sebutin satu-satu, nanti dibikinin daftarnya. Bingung? Chat kami di WhatsApp.",
  },
  {
    q: "Printer struk saya merek murah, bisa?",
    a: "Bisa, asal printer thermal bluetooth. Hampir semua printer struk di pasaran cocok. Paling lancar lewat aplikasi Android-nya.",
  },
  {
    q: "Bisa dipakai di laptop atau komputer kasir?",
    a: "Bisa. Ada versi Windows yang dipasang seperti aplikasi biasa, dan datanya tersimpan di komputer itu. Printer thermal USB/bluetooth bisa dipakai dari sini juga. Kalau mau HP dan laptop pakai data yang sama, itu pakai paket Banyak Kasir.",
  },
  {
    q: "Fitur foto dan suara itu akurat nggak?",
    a: `Cukup akurat buat nama dan harga yang jelas kebaca atau kedengeran, tapi nggak 100%. Makanya hasilnya selalu ditampilkan dulu buat kamu periksa sebelum disimpan — nggak ada yang masuk ke daftar barang atau keranjang tanpa kamu lihat. Kalau hasilnya kosong, jatahmu nggak kepotong. Gratisnya ${KUOTA_AI.scan}× sebulan buat foto dan dikte produk, plus ${KUOTA_AI.kasirSuara} sesi kasir suara.`,
  },
  {
    q: "Bedanya Backup Otomatis dan paket Banyak Kasir apa?",
    a: "Backup Otomatis itu jaga-jaga: data warung disimpan di internet supaya bisa diambil lagi kalau HP-mu kenapa-kenapa, dan isinya cuma buat kamu sendiri. Paket Banyak Kasir itu kerja bareng: beberapa HP kasir pakai satu data yang sama, dan kamu bisa memantau semuanya dari jauh.",
  },
  {
    q: "Karyawan saya bisa pakai HP-nya sendiri?",
    a: "Bisa, dengan paket Banyak Kasir. Kamu undang mereka, lalu HP mereka menerima daftar barang dan harga dari HP kamu, dan transaksi yang mereka catat masuk ke laporanmu. Tanpa paket itu, karyawan tetap bisa pegang kasir di HP yang sama dengan PIN masing-masing.",
  },
  {
    q: "Toko online itu maksudnya gimana?",
    a: "Barang yang sudah ada di kasir bisa kamu pajang jadi etalase online dengan alamat sendiri, plus QR code untuk dicetak dan ditempel di meja. Kamu yang menentukan toko itu tampil atau tidak. Fitur ini butuh internet.",
  },
  {
    q: "Data jualan saya kamu intip nggak?",
    a: "Nggak. Transaksi, produk, dan angka untung tersimpan di HP kamu, dan cuma naik ke cloud kalau kamu sendiri yang mengaktifkan backup atau paket cloud. Foto rak dan rekaman suara yang kamu kirim ke fitur AI dipakai untuk membaca produknya saja, bukan buat disimpan jadi profil tokomu. Yang kami kumpulkan cuma statistik pemakaian aplikasi secara umum.",
  },
  {
    q: "Karyawan bisa lihat untung saya nggak?",
    a: "Nggak, kalau kamu nggak izinkan. Karyawan punya akun sendiri pakai PIN, dan kamu yang atur mereka boleh buka halaman apa saja.",
  },
];

/**
 * Akordeon memakai `<details>` bawaan browser, bukan state React: pertanyaannya
 * statis, dan dengan begitu isinya tetap ada di HTML untuk mesin pencari serta
 * bisa dibuka lewat Ctrl+F meski akordeonnya tertutup.
 */
export default function Faq({ alt = true }: { alt?: boolean }) {
  return (
    <section id="tanya" className={alt ? "seksi seksi-alt border-b-0" : "seksi"}>
      <div className="bungkus">
        <JudulSeksi judul="Yang sering ditanya" />
        <Kartu className="mx-auto max-w-[800px] divide-y divide-border overflow-hidden">
          {faq.map((f, i) => (
            <details key={f.q} open={i === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-[15px] font-medium group-open:bg-background [&::-webkit-details-marker]:hidden">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-muted text-muted-foreground transition-transform group-open:rotate-45 group-open:bg-primary/10 group-open:text-primary">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                {f.q}
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground desktop:pl-14">{f.a}</div>
            </details>
          ))}
        </Kartu>
      </div>
    </section>
  );
}
