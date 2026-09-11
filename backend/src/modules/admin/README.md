# Modul Admin

Panel internal KanPOS. Berbeda dari modul lain yang selalu difilter
`userId = req.user.id`, modul ini justru membaca lintas seluruh pengguna —
karena itu ia punya autentikasi, CORS, dan rate limit sendiri.

Mockup layarnya: [`../../../../frontend/docs/admin-dashboard-mockup.html`](../../../../frontend/docs/admin-dashboard-mockup.html)

## Autentikasi

Login tetap lewat Google, tapi ID token ditukar **sekali** menjadi sesi JWT
milik backend. Alasannya token Google berumur ±1 jam — terlalu pendek untuk
sesi kerja admin, dan `dashboard/` sudah merasakan akibatnya.

```
POST /api/admin/auth/google  { idToken }   → { token, expiresAt, admin }
                                             (satu-satunya endpoint tanpa sesi)
Authorization: Bearer <token>              → semua endpoint lain
```

Dua lapis penjaga di `middleware/auth.ts`:

| | Guna |
|---|---|
| `authenticateAdmin` | Verifikasi JWT, lalu **muat ulang user dari database** tiap request — pencabutan role dan suspend langsung berlaku, tanpa menunggu token habis |
| `requireAdmin` | Tolak `role === USER`. Role dibaca dari database, bukan dari isi token |

Admin pertama disemai lewat `ADMIN_EMAILS` di `.env`. Email yang terdaftar di
sana — dan yang kepemilikannya sudah dipastikan Google (`email_verified`) —
otomatis jadi `SUPERADMIN` saat login pertama, baik akunnya sudah ada maupun
belum. Tanpa jalur ini, database yang masih kosong tidak punya cara masuk sama
sekali. Di luar allowlist itu, endpoint ini **tidak membuat user baru**.

Setiap penyemaian tercatat di audit log sebagai `admin.seed`, jadi pengangkatan
lewat env tidak pernah tak terlihat. Kosongkan `ADMIN_EMAILS` setelah admin
pertama terbentuk kalau ingin menutup jalur itu sepenuhnya.

## Endpoint

| Endpoint | Guna |
|---|---|
| `GET /api/admin/me` | Identitas admin yang sedang masuk |
| `GET /api/admin/metrics/overview` | KPI platform + antrean kerja |
| `GET /api/admin/metrics/plans` | Sebaran pengguna & pendapatan per paket |
| `GET /api/admin/metrics/growth?months` | Pendaftar & pendapatan per bulan |
| `GET /api/admin/users?q&filter&page&limit` | Daftar pengguna lintas akun |
| `GET /api/admin/users/:id` | Detail satu pengguna |
| `POST /api/admin/users/:id/suspend` | `{ suspended, reason }` — wajib beralasan |
| `GET /api/admin/plans?includeArchived` | Daftar paket + jumlah pemakainya |
| `POST /api/admin/plans` | Buat paket; `id` boleh ditentukan sendiri |
| `PATCH /api/admin/plans/:id` | Ubah nama, harga, durasi, kuota, batas toko |
| `POST /api/admin/plans/:id/archive` | `{ archived, reason }` — arsip, bukan hapus |
| `POST /api/admin/users/:id/subscription` | `{ planId, days?, reason }` — beri/perpanjang tanpa pembayaran |
| `GET /api/admin/payments?filter&q&page` | Transaksi; `filter=attention` = antrean kerja |
| `POST /api/admin/payments/:id/reconcile` | Tanya ulang ke Tripay, selaraskan status lokal |
| `GET /api/admin/audit?page&limit` | Jejak semua mutasi admin |

## Keputusan yang perlu diketahui

- **Paket diarsipkan, tidak pernah dihapus.** `Plan` punya relasi
  `onDelete: Cascade` ke `Subscription` dan `PaymentTransaction`, jadi menghapus
  satu paket ikut menghapus riwayat pembayarannya — catatan uang yang sudah
  masuk. Yang tersedia hanya `Plan.archivedAt`; pelanggan yang sedang
  berlangganan tetap dilayani sampai masa aktifnya habis.
- **Mengubah paket tidak menyentuh langganan berjalan.** Masa aktif tersimpan di
  baris `Subscription`, dan kuota sudah disalin ke `User` saat langganan
  diberikan. Harga dan kuota baru berlaku pada perpanjangan berikutnya.
- **Pemberian langganan memakai `grantSubscription` yang sama dengan alur
  pembayaran** (`modules/payments/service.ts`), bukan salinannya. Kalau aturan
  masa aktif berubah, jalur admin ikut berubah dengan sendirinya — tidak ada
  dua perhitungan yang bisa saling menyimpang.

- **Metrik memakai raw SQL.** Pola `analytics/service.ts` yang menarik baris ke
  memori lalu menghitung di Node memadai untuk satu pemilik toko, tapi akan
  menggantung untuk agregat seluruh platform. Index pendukungnya sudah ada di
  skema.
- **"Aktif" dihitung dari sync/backup, bukan login.** Backend tidak menyimpan
  sesi untuk pengguna biasa, jadi waktu login tidak tercatat di mana pun.
  Berhenti menyinkron juga sinyal churn yang lebih awal.
- **Tidak ada hapus permanen.** Relasi di skema memakai `onDelete: Cascade` —
  menghapus satu pengguna ikut menghapus toko, backup, sync, dan transaksinya
  tanpa jalan pulang. Yang tersedia hanya suspend (`User.deletedAt`), dan
  `authenticate()` menolak akun yang disuspend dengan 403.
- **Admin melihat volume, bukan isi.** Detail pengguna menampilkan jumlah toko
  dan jejak sync, bukan data penjualan pelanggan.
- **Audit tidak dibungkus try/catch.** Kalau pencatatan gagal, aksinya ikut
  gagal — lebih baik daripada mutasi tanpa jejak.
- **CORS terpisah.** `/api/admin/*` hanya menerima origin di `ADMIN_ORIGIN`
  (403 kalau tidak cocok). API pelanggan tetap `origin: true` karena aplikasi
  kasir berjalan dari Capacitor/Electron dengan origin yang tidak tetap.
- **`filter=near_quota` disaring setelah query,** karena rasio kuota baru bisa
  dinilai setelah pemakaian terkumpul — konsekuensinya paginasi filter itu
  perkiraan.

## Utang teknis yang ditemui

- `User.planId` menyimpan id paket tapi **tidak punya relasi Prisma**. Yang ada
  di skema justru many-to-many `User.plans ↔ Plan.users` yang tidak dipakai
  modul mana pun. Selama itu belum dibereskan, paket diambil terpisah lewat
  `plansByIdFor()` di `users.service.ts`.
