# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pemilik warung, kios, dan toko kelontong UMKM Indonesia yang merangkap sebagai
kasir. Skenario utama (dikonfirmasi user): **warung/kios, HP Android kelas
bawah, satu tangan**, sering di bawah cahaya matahari langsung, transaksi cepat
dan berulang sepanjang hari. Peran kedua: staf kasir dengan izin terbatas pada
mode multi-user opsional (login username + PIN 4–6 digit).

Permukaan lain di repo (landing/, dashboard/, admin/) punya audiens berbeda dan
berada di luar cakupan pekerjaan desain yang berjalan sekarang.

## Product Purpose

KanPOS adalah aplikasi POS gratis, offline-first, dan open source. Pemilik usaha
bisa mencatat penjualan, stok, dan laba tanpa server, tanpa registrasi, tanpa
biaya. Sukses berarti satu transaksi selesai dalam hitungan detik di HP murah
tanpa sinyal, dan pemilik tahu untung-ruginya di akhir hari.

## Positioning

Seluruh data hidup lokal di perangkat (IndexedDB via Dexie) — aplikasi berfungsi
penuh tanpa koneksi dan tanpa akun. Pesaing berbasis SaaS tidak bisa mengklaim
ini secara jujur. Konsekuensinya juga produk: tidak ada sinkronisasi diam-diam,
dan backup/restore JSON adalah jalur pemindahan data yang sesungguhnya.

## Operating Context

- Ritual harian: buka lapak → transaksi berulang (scan/pilih produk, diskon,
  bayar, kembalian) → tutup buku, lihat laporan.
- Open bill untuk warung makan: simpan pesanan dengan nama pelanggan, nomor
  meja, catatan per item.
- Stok masuk dari supplier menghitung HPP otomatis (metode rata-rata tertimbang);
  stok keluar untuk rusak/hilang/retur.
- Struk dicetak ke printer termal ESC/POS lewat Bluetooth (Web Bluetooth di PWA,
  Bluetooth Classic di APK Android) atau diekspor sebagai PNG.
- Barcode dipindai dengan kamera HP (EAN-13/8, UPC-A/E, Code-128/39/93, ITF, QR)
  atau diketik manual.
- Distribusi di luar Play Store: APK diunduh sendiri, dengan dialog update
  in-app untuk Android dan Windows.

## Capabilities and Constraints

- React 18 + TypeScript, Vite, Tailwind CSS v3 + shadcn/ui, React Router v6,
  React Hook Form + Zod, TanStack Query, Recharts, Lucide, i18next, date-fns.
- Dexie.js/IndexedDB sebagai satu-satunya penyimpanan; tidak ada backend untuk
  app POS.
- PWA (vite-plugin-pwa/Workbox) + pembungkus native Capacitor 8 (Android) dan
  Electron (Windows) dari basis kode yang sama. Pembungkus ini tidak membuat
  bahasa desainnya jadi native — targetnya tetap web.
- Tiga bahasa penuh: Bahasa Indonesia, English, Bahasa Malaysia.
- Mode terang dan gelap dua-duanya harus hidup; app sudah punya pemilih warna
  aksen.
- Layout mobile-first dengan mode landscape/tablet (kasir berdampingan:
  produk + keranjang).
- Batas performa nyata: HP Android kelas bawah, WebView, tanpa jaringan. Efek
  yang mahal tidak akan gratis di sini.

## Brand Commitments

- Nama: KanPOS.
- **Biru brand `#3554C1` dikunci oleh user** dan harus dibawa oleh dunia visual
  apa pun yang dipilih.
- **Patokan craft (dikonfirmasi user):** tingkat kerajinan super-app konsumen
  Indonesia — Gojek dan GoPay. Yang diambil tata bahasanya (bidang warna
  dicelup penuh, angka uang tabular berat, ubin kategori berwarna, satu skala
  sudut dan satu tingkat elevasi), bukan warna brand mereka. Dieksekusi lurus,
  tanpa ironi dan tanpa keanehan yang diselundupkan.
- Aset lambang ada di `brand/`: `kanpos-glyph.svg`, `kanpos-icon.svg`,
  `kanpos-maskable.svg`.

## Evidence on Hand

- Kode app POS yang berjalan penuh di `frontend/src` (17 halaman, komponen
  `jokoui/`, kasir, laporan, settings).
- Token visual yang sedang berjalan: port Shark UI di `frontend/src/index.css`
  dan `frontend/tailwind.config.ts`.
- Arsip mockup HTML di `frontend/docs/` (iterasi Shark, SaaSable, kasir suara,
  onboarding, dan lain-lain).
- Tidak ada testimoni, angka pengguna, benchmark, atau klaim komersial yang
  terverifikasi. Pekerjaan berikutnya tidak boleh mengarangnya.

## Product Principles

1. Offline dan lokal bukan fitur, melainkan fondasi; tidak ada layar yang boleh
   mengandaikan jaringan.
2. Kecepatan satu transaksi mengalahkan segalanya — jumlah ketukan dan waktu
   baca adalah metrik desain yang sebenarnya.
3. Dirancang untuk HP murah di bawah matahari, bukan untuk layar retina di
   ruang ber-AC.
4. Uang harus terbaca tanpa ragu: nominal, kembalian, dan laba tidak pernah
   jadi detail sekunder.
5. Gratis dan open source; tidak ada pola gelap, tidak ada dinding bayar.

## Accessibility & Inclusion

Target sentuh harus nyaman untuk satu tangan di HP. Kontras harus bertahan di
bawah cahaya matahari langsung. Tiga bahasa berarti panjang label bisa berubah
cukup jauh; layout tidak boleh pecah karenanya.
