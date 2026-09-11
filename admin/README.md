# Admin KanPOS

Panel internal tim KanPOS. **Bukan** untuk pelanggan — itu `../dashboard/`.

| | `dashboard/` | `admin/` (ini) |
|---|---|---|
| Pengguna | Pemilik toko | Tim KanPOS |
| Data | Toko miliknya sendiri | Seluruh pengguna platform |
| Endpoint | `/api/analytics/*` | `/api/admin/*` |
| Sesi | Google ID token mentah (±1 jam) | Sesi JWT backend (8 jam) |

Mockup: [`../frontend/docs/admin-shark-mockup.html`](../frontend/docs/admin-shark-mockup.html)
Backend: [`../backend/src/modules/admin/README.md`](../backend/src/modules/admin/README.md)

## Menjalankan

```bash
cp .env.example .env    # isi VITE_API_BASE_URL dan VITE_GOOGLE_CLIENT_ID
npm install
npm run dev             # http://localhost:5176
```

Tiga hal yang harus cocok, kalau tidak login-nya gagal tanpa penjelasan jelas:

1. **`VITE_GOOGLE_CLIENT_ID` = `GOOGLE_CLIENT_ID` di `backend/.env`.** Backend
   memverifikasi ID token terhadap satu client ID saja.
2. **`http://localhost:5176` terdaftar sebagai Authorized JavaScript origin**
   di client OAuth tersebut (Google Cloud Console). Tanpa ini tombol Google
   tidak muncul sama sekali.
3. **Port dev = `ADMIN_ORIGIN` di `backend/.env`.** CORS `/api/admin/*` dikunci
   ke origin itu dan menjawab 403 kalau tidak cocok — tidak seperti API
   pelanggan yang terbuka untuk semua origin.

## Melihat komponen tanpa data

`http://localhost:5176/preview.html` merender grafik pertumbuhan, audit log, dan
tabel paket dengan data contoh, tanpa perlu login atau database berisi. Berguna saat
menggarap tampilannya — panel asli menampilkan grafik kosong selama belum ada
pendaftar. Halaman ini **tidak ikut** ke build produksi (Vite hanya membangun
`index.html`); hapus `preview.html` dan `src/preview.tsx` kalau tidak diperlukan
lagi.

## Cakupan (P0)

| Layar | Komponen |
|---|---|
| Ringkasan platform + antrean kerja | `src/components/Overview.tsx` |
| Daftar pengguna, cari &amp; saring | `src/components/Users.tsx` |
| Detail pengguna + suspend | `src/components/UserDetail.tsx` |
| Transaksi + rekonsiliasi Tripay, dengan pencarian | `src/components/Payments.tsx` |
| Grafik pertumbuhan bulanan | `src/components/GrowthChart.tsx` |
| Audit log | `src/components/Audit.tsx` |
| Paket &amp; harga (CRUD + arsip) | `src/components/Plans.tsx` |
| Beri/perpanjang langganan manual | `src/components/GrantDialog.tsx` |

Yang masih redup di sidebar tinggal **Kelola admin** — untuk sekarang peran
diubah lewat `npm run admin -- promote <email>` di backend.

Dua tindakan sengaja tidak tersedia di panel: **hapus pengguna** dan **hapus
paket**. Keduanya memakai relasi `onDelete: Cascade`, jadi menghapusnya ikut
menghapus toko, backup, dan riwayat pembayaran. Gantinya suspend dan arsip.

Grafik pertumbuhan sengaja dipecah jadi **dua panel terpisah**, bukan satu
grafik dua sumbu Y. Pendaftar (puluhan orang) dan pendapatan (jutaan rupiah)
beda skala jauh; menumpuknya di satu grafik membuat perpotongan garis tampak
bermakna padahal itu cuma akibat pemilihan skala.

## Tampilan

Panel ini memakai bahasa visual **Shark UI** (<https://shark.vini.one>), sama
dengan aplikasi kasir (`frontend/`) dan dashboard pemilik (`dashboard/`).
Ketiganya berbagi nama token, skala radius, dan shadow yang sama, jadi orang
yang membuka dua panel berdampingan tidak perlu menyesuaikan mata.

- **Token** ada di `src/index.css` (HSL) + `tailwind.config.js`. Nilainya
  kembar dengan `dashboard/src/index.css`; kalau salah satu berubah, ubah
  keduanya.
- **Komponen** ada di `src/components/Common.tsx` — `Button`, `Card`, `Badge`,
  `StatCard`, `Alert`, `Dialog`, `Pager`, `FilterGroup`, dan seterusnya.
  Pakai komponen itu; jangan menulis ulang gaya kartu/tombol/badge sendiri,
  supaya radius, tinggi, dan tint warnanya tetap satu.
- **Radius**: 8px tombol & input, 12px kartu, 16px dialog. Tanpa pil, tanpa
  blob bulat, tanpa label uppercase, tanpa `font-bold` (600 untuk judul dan
  nominal, 500 untuk label).
- **Warna status** untuk teks memakai varian `*-text` (shade 700), bukan warna
  isian yang pekat: `text-success-text`, `text-warning-text`,
  `text-destructive-text`, `text-info-text`.
- **Mode gelap** ada, lewat kelas `dark` di elemen root (`src/hooks/use-theme.ts`).
  Sakelarnya di topbar. Tanpa pilihan tersimpan, temanya mengikuti setelan OS.

Panduan lengkapnya di
[`../frontend/docs/shark-migration-guide.md`](../frontend/docs/shark-migration-guide.md).
Tema SaaSable lama (font Sora, radius 4, netral keunguan) sudah tidak dipakai —
token-tokennya (`t-h*`, `.kartu`, `.tbl*`, `.tag*`, `text-teks-*`, `bg-abu-*`)
sudah dihapus dari `tailwind.config.js`, jadi markup lama yang tersisa akan
kehilangan warna, bukan gagal build.

## Masuk pertama kali

Panel ini **tidak membuat pengguna baru**. Akun harus sudah ada di database —
artinya sudah pernah login lewat aplikasi kasir. Email yang terdaftar di
`ADMIN_EMAILS` (`backend/.env`) otomatis diangkat jadi `SUPERADMIN` saat login
pertama, dan pengangkatan itu tercatat di audit log.

Kalau akunnya belum ada, pesannya sengaja sama dengan kasus "bukan admin"
(*"Akun ini tidak punya akses admin"*) supaya panel ini tidak bisa dipakai
menebak email mana yang terdaftar.

## Keputusan yang perlu diketahui

- **Sesi disimpan utuh, bukan cuma token.** `lib/auth.ts` menyimpan
  `{ token, expiresAt, admin }` sehingga sidebar bisa langsung menampilkan
  identitas tanpa menunggu `/api/admin/me`. Kedaluwarsa dicek di klien hanya
  agar tidak muncul layar kosong sesaat — yang menentukan tetap backend.
- **401 selalu berarti keluar.** Tidak ada refresh token; sesi habis →
  kembali ke layar masuk dengan pesan yang jelas.
- **Suspend wajib beralasan.** Tombolnya membuka dialog, bukan langsung
  bertindak, karena alasannya masuk audit log. Tidak ada tombol hapus
  permanen — relasi Prisma memakai `onDelete: Cascade`.
- **Hasil rekonsiliasi ditampilkan apa adanya,** termasuk ketika Tripay
  memberi status yang sama dan tidak ada yang berubah. Rekonsiliasi yang tidak
  mengubah apa pun adalah informasi, bukan kegagalan.
- **Kolom "aktivitas terakhir" berasal dari `SyncRecord`, bukan waktu login.**
  Backend tidak menyimpan sesi untuk pengguna biasa, dan berhenti menyinkron
  adalah sinyal churn yang lebih awal.
- **Penyaringan `near_quota` disaring setelah data diambil,** jadi jumlah
  barisnya bisa lebih sedikit dari total yang tertulis di pager. Panel
  menyebutkan ini di layar supaya tidak terbaca sebagai bug.
