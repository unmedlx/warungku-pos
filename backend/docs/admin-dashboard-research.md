# Riset: Dashboard Web Admin untuk Backend KanPOS

## 1. Kondisi backend saat ini
- Express 4 + TypeScript (tsx dev, tsc + tsc-alias build), modular monolith di `src/modules/*` dengan pola `routes.ts` + `service.ts`.
- Prisma 5 + PostgreSQL. Model: User, Plan, Subscription, Store, Backup, PaymentTransaction, SyncRecord.
- Auth **hanya** Google ID token (`middleware/auth.ts`) — token diverifikasi tiap request, user auto-create kalau belum ada.
- **Belum ada konsep admin/role sama sekali** (grep `admin|role` = 0 hasil). Semua endpoint scoped ke `req.user.id`.
- Storage S3/MinIO, payment Tripay (callback publik `/api/payments/callback`).
- `JWT_SECRET` sudah ada di env tapi belum dipakai.
- Analytics yang ada (`/api/analytics/*`) adalah analitik **milik pemilik toko**, bukan analitik platform.

## 2. Gap yang harus ditutup
| Gap | Dampak |
|---|---|
| Tidak ada `role` / tabel admin | Tidak bisa membedakan admin platform vs user biasa |
| Auth berbasis Google ID token saja | Token pendek umur, tidak cocok untuk sesi dashboard web; perlu session/JWT sendiri |
| CORS `origin: true` (semua origin) | Harus dikunci ke origin dashboard admin |
| Tidak ada audit log | Aksi admin (ubah plan, refund, hapus user) tak terlacak |
| Plans read-only (`GET /api/plans` saja) | Admin butuh CRUD plan |
| Tidak ada rate limit / brute-force protection | Endpoint admin jadi target |

## 3. Opsi arsitektur

### A. Dashboard sebagai app frontend terpisah (`admin/`, Vite + React)
- Backend hanya menambah `src/modules/admin/*` yang mengembalikan JSON.
- **Plus**: pemisahan jelas, bisa reuse komponen `jokoui` dari frontend, deploy terpisah (Vercel/Netlify/nginx), tidak menambah beban proses backend.
- **Minus**: satu repo app lagi (build, env, CI), perlu CORS + auth token handling.

### B. Server-rendered di dalam backend (EJS/Hono JSX + HTMX)
- **Plus**: satu deploy, cookie session sederhana, tanpa CORS.
- **Minus**: menyalahi gaya proyek (backend murni JSON API), UI kurang kaya, tidak bisa reuse komponen React yang sudah ada.

### C. Admin panel generik (AdminJS / Forest Admin / Prisma Studio)
- AdminJS punya adapter Prisma → CRUD semua model dalam hitungan jam.
- **Plus**: sangat cepat jadi.
- **Minus**: bundling React lawas ke dalam proses Express, sulit dikustom untuk metrik bisnis (MRR, retensi), tampilan tidak sejalan brand KanPOS.

### Rekomendasi
**Opsi A**, dengan catatan: kalau kebutuhan hanya "lihat & edit data mentah" untuk 1–2 orang internal, mulai dari **C (AdminJS)** dulu sebagai jembatan, lalu pindah ke A saat butuh metrik bisnis. Untuk produk yang akan dipakai jangka panjang dan sudah punya design system (`jokoui`, biru #3554C1, Sora), A lebih sepadan.

## 4. Desain auth admin (untuk Opsi A)
1. Tambah `enum UserRole { USER, ADMIN, SUPERADMIN }` + `role UserRole @default(USER)` di model `User`.
2. Login admin: tetap **Login Google** (reuse `verifyGoogleIdToken`), tapi tukar ID token → **session JWT backend** (`JWT_SECRET`, exp 8 jam, refresh token httpOnly cookie). Ini menghindari ketergantungan pada masa berlaku token Google yang pendek.
3. Middleware baru `requireAdmin` (setelah `authenticate`/`authenticateAdmin`) yang menolak `role === USER`.
4. Allowlist email admin awal lewat env `ADMIN_EMAILS` untuk bootstrap user admin pertama (seed).
5. Kunci CORS: `origin: [ADMIN_ORIGIN, ...]` dan `credentials: true` hanya untuk origin tersebut.
6. `express-rate-limit` di `/api/admin/*`.
7. Tabel `AuditLog { id, actorId, action, targetType, targetId, before Json?, after Json?, ip, createdAt }` — tulis di setiap mutasi admin.

## 5. Ruang lingkup fitur dashboard (usulan prioritas)
**P0 — visibilitas**
- Ringkasan platform: total user, user aktif (punya sync/backup 30 hari), total toko, pendapatan bulan berjalan, langganan aktif vs kedaluwarsa.
- Daftar user: cari/filter by plan, status langganan, jumlah toko, pemakaian storage.
- Detail user: toko, backup (ukuran total), riwayat transaksi, langganan.
- Daftar transaksi Tripay: status, gagal/pending, link verifikasi manual (`service.verifyPayment` sudah ada).

**P1 — aksi**
- CRUD Plan (saat ini hanya list).
- Grant/extend langganan manual (kompensasi, trial), plus alasan → audit log.
- Suspend / hapus user (hati-hati: cascade delete ke stores/backups/sync).
- Retry/rekonsiliasi pembayaran yang menggantung.

**P2 — operasional**
- Monitor storage: total byte per user vs `storageLimitMb`, orphan file di S3.
- Kesehatan sync: SyncRecord terakhir per toko, toko yang lama tak sinkron.
- Grafik pertumbuhan: signup/bulan, MRR, konversi free→berbayar, churn.
- Export CSV.

## 6. Perubahan konkret di backend
```
prisma/schema.prisma      + enum UserRole, User.role, model AuditLog
src/middleware/auth.ts    + authenticateSession (JWT sendiri), requireAdmin
src/modules/admin/
  routes.ts               /api/admin/* (mount dengan authenticateSession + requireAdmin)
  auth.routes.ts          POST /api/admin/auth/google  → session JWT
  metrics.service.ts      agregasi platform (raw SQL utk grup waktu)
  users.service.ts        list/detail/mutasi user
  plans.service.ts        CRUD plan
  payments.service.ts     list/rekonsiliasi transaksi
  audit.ts                helper tulis AuditLog
src/routes/index.ts       routes.use('/admin', adminRoutes)
src/app.ts                CORS allowlist, rate limit
```
Dependensi baru: `jsonwebtoken`, `express-rate-limit`, (`cookie-parser` kalau pakai refresh cookie).

## 7. Catatan & risiko
- **Query agregat berat**: `SyncRecord` dan `Backup` bisa membesar cepat. Metrik dashboard sebaiknya pakai raw SQL + index (`created_at`, `user_id`) dan/atau tabel ringkasan harian; hindari `findMany` lalu agregasi di Node.
- **Index yang kemungkinan perlu ditambah**: `PaymentTransaction(status, createdAt)`, `Subscription(status, endDate)`, `Backup(userId, createdAt)`, `SyncRecord(syncedAt)`.
- **Privasi**: dashboard membuka data semua toko. Batasi field sensitif, dan wajibkan audit log untuk view data transaksi kalau perlu.
- **Cascade delete**: hapus user = hapus stores, backups, sync, transaksi. Lebih aman soft-delete (`deletedAt`) daripada hard delete.
- **Google Sign-In di web**: perlu Client ID web (bisa beda dari Android/desktop) — cek `GOOGLE_CLIENT_ID` mendukung multi-audience.

## 8. Langkah berikutnya (usulan urutan)
1. Konfirmasi opsi arsitektur + ruang lingkup P0.
2. Migrasi Prisma: role + AuditLog + index.
3. Auth admin (session JWT + requireAdmin + seed admin dari `ADMIN_EMAILS`).
4. Endpoint P0 (`/api/admin/metrics/overview`, `/users`, `/users/:id`, `/payments`).
5. Mockup HTML dashboard (sesuai konvensi proyek: mockup dulu sebelum kode React).
6. Scaffold app `admin/` dan sambungkan.
