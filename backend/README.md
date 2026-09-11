# KanPOS Cloud Backend

Backend cloud modular monolith untuk aplikasi [KanPOS](../) menggunakan **Express + TypeScript + Prisma**.

## Struktur

```
cloud/
├── src/
│   ├── app.ts                 # Express app
│   ├── server.ts              # Entry point
│   ├── config/                # Env + config
│   ├── lib/                   # DB, Storage, Google, errors
│   ├── middleware/            # Auth, error handler
│   ├── modules/               # Modular monolith
│   │   ├── auth
│   │   ├── users
│   │   ├── plans
│   │   ├── subscriptions
│   │   ├── stores
│   │   ├── backups
│   │   ├── payments
│   │   ├── sync
│   │   └── destinations
│   ├── routes/index.ts
│   └── types/
├── prisma/schema.prisma
└── package.json
```

## Cara Menjalankan

### 1. Install dependensi

```bash
npm install
```

### 2. Setup database

Salin `.env.example` menjadi `.env`, lalu sesuaikan `DATABASE_URL`. Pastikan PostgreSQL berjalan, lalu:

```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```

`db:seed` akan mengisi data paket langganan default (STORAGE dan SYNC).

### Migrasi multi-user cloud

Instalasi yang sudah berjalan perlu dua langkah tambahan, **berurutan**:

```bash
psql "$DATABASE_URL" -f prisma/migrations-preview/store-members.sql
npm run db:backfill-members -- --apply
```

Skrip kedua membuat baris `store_members(role=OWNER)` untuk tiap toko lama.
Tanpa itu, seluruh akses toko lewat `store_members` akan kosong dan pemiliknya
sendiri ikut terkunci — jadi jangan deploy kode barunya sebelum skrip itu jalan.
Tanpa `--apply` skrip hanya melapor (dry-run), dan aman dijalankan berulang.

### 3. Setup MinIO / S3

Jalankan MinIO atau layanan S3-compatible. Sesuaikan konfigurasi `STORAGE_*` di `.env`.

### 4. Jalankan development

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3210`.

### 5. Hubungkan aplikasi KanPOS

Tambahkan di file `.env` aplikasi frontend:

```
VITE_AUTH_API_URL=http://localhost:3210
```

## Module

Tiap module terdiri dari:
- `routes.ts` — definisi route Express
- `controller.ts` — handler HTTP
- `service.ts` — logika bisnis
- `schema.ts` — validasi Zod

## Lisensi

MIT
