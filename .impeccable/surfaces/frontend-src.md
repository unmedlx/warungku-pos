---
version: 1
slug: "frontend-src"
primary_target: "frontend/src"
related_targets: []
---

Scope: seluruh app POS di `frontend/src` (kasir, produk, stok, laporan, riwayat, pelanggan, utang, pengeluaran, supplier, pengguna, settings, onboarding). Mode pengunjung: **Operate**.

Audiens: pemilik warung/kios UMKM Indonesia yang merangkap kasir. HP Android kelas bawah, satu tangan, sering di bawah matahari langsung. Tugas: satu transaksi selesai dalam hitungan detik, lalu tahu untung-rugi di akhir hari.

Kendala terkonfirmasi: biru brand `#3554C1` dikunci. Patokan craft = Gojek/GoPay (tata bahasanya, bukan warnanya). Mode terang dan gelap dua-duanya wajib hidup. Tiga bahasa (id/en/ms) mengubah panjang label. Tanpa jaringan, tanpa efek mahal.

Keputusan belum selesai: apakah warna kategori boleh melewati enam nilai; bagaimana mode gelap merender bidang biru yang dicelup penuh tanpa kehilangan peringkatnya.

## Direction contract

THESIS: KanPOS dikerjakan pada tingkat craft super-app konsumen Indonesia, dibagi menurut pekerjaan layarnya — kasir, pembayaran, dan laporan memakai tata bahasa dompet; beranda, menu, stok, dan pengaturan memakai tata bahasa kisi layanan. Yang ditolak: kisi kartu netral seragam ala shadcn di mana setiap layar terlihat sama dan tidak ada satu objek pun yang memimpin.

OWN-WORLD: Biru brand `#3554C1` sebagai bidang yang dicelup penuh, bukan aksen; `#1B2C6B` untuk kedalamannya; latar `#F5F7FB`; tiga warna kategori (`#12B76A`, `#F79009`, `#F04438`) dipegang konsisten sebagai sistem pengenal di seluruh app. Angka uang tabular sangat berat. Satu skala sudut membulat, satu tingkat elevasi saja. Ubin kategori berpiktogram tebal. Nav bawah berikon terisi. Tidak ada gradien, glass, atau bayangan bertingkat.

STORY: pemilik warung membuka app dan langsung tahu berapa hari ini; satu ketukan masuk ke kasir; total tidak pernah hilang dari pandangan; transaksi ditutup tanpa berpindah layar.

FIRST VIEWPORT (Kasir, HP portrait): panel biru dicelup penuh di atas memikul total berjalan dalam angka tabular sangat berat — satu-satunya objek besar di layar. Di bawahnya pita kategori berwarna, lalu kisi produk tiga kolom berkartu rapat dengan satu tingkat elevasi. Aksi utama adalah baris tebal penuh lebar di garis jempol paling bawah, tepat di atas nav.

FORM: kandidat "Dibagi Per Peran" dari ronde patokan Gojek/GoPay; jalur kanon — patokan pesaing yang disebut user sendiri, bukan arah yang dibagikan dadu. Seed key 645cf77b.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
