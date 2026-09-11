# Product Requirements Document — KanPOS Cloud Backend

## 1. Pendahuluan

Dokumen ini menjelaskan spesifikasi backend cloud yang diperlukan untuk menunjang aplikasi **KanPOS**. Backend ini bertugas menyediakan layanan autentikasi, penyimpanan backup, sinkronisasi data antar perangkat, langganan (subscription), serta publikasi toko online.

Aplikasi KanPOS tetap dapat berjalan **secara lokal/offline**. Cloud adalah fitur opsional yang memberikan nilai tambah berupa cadangan aman, sinkronisasi multi-perangkat, dan toko online.

---

## 2. Tujuan & Ruang Lingkup

### 2.1 Tujuan
- Menyediakan backend independen yang dapat dipasang sendiri oleh operator/merchant.
- Mendukung backup otomatis dan manual dari data lokal KanPOS.
- Mensinkronkan data lokal antar perangkat (PWA/Android/Desktop) berdasarkan toko yang sama.
- Mengelola langganan paket STORAGE dan SYNC.
- Menyediakan API toko online untuk dipublikasikan.

### 2.2 Ruang Lingkup (In-Scope)
- Autentikasi Google JWT.
- Manajemen user, toko, langganan, backup, dan sinkronisasi.
- API pembayaran (checkout, verify, history, Google Play).
- API data wilayah (provinsi, kota, kecamatan).
- Penyimpanan file backup dan logo toko.
- REST API JSON berbasis HTTP.

### 2.3 Di Luar Ruang Lingkup (Out-of-Scope)
- Push notification — dikelola client-side via OneSignal.
- Pemrosesan pembayaran secara langsung (backend hanya generate/verify transaksi payment gateway pihak ketiga).

---

## 3. Stack Teknologi Rekomendasi

| Lapisan | Rekomendasi | Catatan |
|---|---|---|
| Bahasa / Framework | Node.js + Express / NestJS atau Go + Fiber | Pilih sesuai keahlian tim. |
| Database | PostgreSQL / MySQL | Untuk data relasional user, toko, langganan. |
| Storage File | MinIO / S3-compatible / Filesystem lokal | Untuk backup JSON dan logo toko. |
| Cache (opsional) | Redis | Untuk rate-limit atau sesi pembayaran. |
| Container | Docker + docker-compose | Untuk deployment lokal awal. |
| Web Server | Nginx / Caddy | Reverse proxy + SSL. |

---

## 4. Arsitektur Sistem

```
┌─────────────────────┐
│   KanPOS App    │  (PWA/Android/Electron)
│  Dexie.js (IndexedDB)│
└──────────┬──────────┘
           │ HTTPS / REST
           ▼
┌─────────────────────┐
│   Cloud API Server  │  (NestJS/Express/Go)
└──────────┬──────────┘
           │
     ┌─────┴─────┬──────────────┐
     ▼           ▼              ▼
PostgreSQL   MinIO/S3      Payment Gateway
```

---

## 5. Konfigurasi Aplikasi

Aplikasi KanPOS membaca URL cloud dari environment variable:

```
VITE_AUTH_API_URL=https://api.kanpos-anda.com
```

Jika tidak di-set, aplikasi akan menggunakan default `http://localhost:3210`.

---

## 6. Autentikasi

### 6.1 Mekanisme
- Aplikasi mengirimkan `Authorization: Bearer <google_id_token>` pada setiap request (kecuali `/api/plans`).
- Backend **wajib memverifikasi** token Google ID JWT ke endpoint Google atau menggunakan Google OAuth2 library.
- Dari token, ambil klaim: `sub` (Google user ID), `email`, `name`, `picture`.
- Backend membuat/mengambil user internal berdasarkan `sub`.

### 6.2 Header Standar
```http
Authorization: Bearer <jwt_google_id_token>
Content-Type: application/json
```

### 6.3 Respons Error Standar
```json
{
  "error": "Pesan error dalam Bahasa Indonesia"
}
```

---

## 7. Skema Data (Database)

### 7.1 Tabel `users`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | UUID / CUID | ID internal user (bukan `sub` Google). |
| `googleSub` | string, unique | ID dari klaim `sub`. |
| `email` | string | Email Google. |
| `name` | string | Nama Google. |
| `picture` | string, nullable | URL foto profil. |
| `planId` | string, nullable | Paket default/storage. |
| `storageLimitMb` | number | Kuota storage saat ini. |
| `syncExpiry` | datetime, nullable | Masa aktif paket SYNC. |
| `maxStores` | number, nullable | Batas jumlah toko. |
| `createdAt` | datetime | Waktu registrasi. |
| `updatedAt` | datetime | Update terakhir. |

### 7.2 Tabel `plans`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string, PK | ID paket. |
| `name` | string | Nama paket. |
| `category` | enum('STORAGE','SYNC') | Kategori paket. |
| `storageLimitMb` | number | Batas penyimpanan (MB). |
| `price` | number | Harga. |
| `maxStores` | number, nullable | Batas toko. |

### 7.3 Tabel `subscriptions`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string, PK | UUID. |
| `userId` | string, FK | Pemilik. |
| `planId` | string, FK | Paket. |
| `startDate` | datetime | Mulai. |
| `endDate` | datetime | Berakhir. |
| `status` | string | ACTIVE, EXPIRED, dll. |
| `hasActiveSubscription` | boolean | Flag aktif. |

### 7.4 Tabel `stores`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string, PK | UUID toko. |
| `userId` | string, FK | Pemilik toko. |
| `name` | string | Nama toko. |
| `identifier` | string, unique, nullable | Slug untuk URL toko online. |
| `isPublic` | boolean | Publikasikan toko online. |
| `address1`, `address2` | text, nullable | Alamat. |
| `provinceId`, `provinceName` | number/string, nullable | Wilayah. |
| `cityId`, `cityName` | number/string, nullable | Kota. |
| `districtId`, `districtName` | number/string, nullable | Kecamatan. |
| `latitude`, `longitude` | number, nullable | Koordinat. |
| `phone` | string, nullable | Nomor WA/telepon. |
| `timezone` | string, nullable | Zona waktu. |
| `operationalHours` | json, nullable | Jam buka. |
| `logoUrl` | string, nullable | URL logo. |
| `createdAt`, `updatedAt` | datetime | Audit. |

### 7.5 Tabel `backups`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string, PK | UUID backup. |
| `userId` | string, FK | Pemilik. |
| `storeId` | string, FK, nullable | Toko terkait (wajib bila paket SYNC aktif). |
| `fileName` | string | Nama file, contoh `kanpos-backup-2026-07-29.json`. |
| `fileKey` | string | Path penyimpanan file. |
| `fileSize` | number | Ukuran dalam byte. |
| `createdAt`, `updatedAt` | datetime | Audit. |

### 7.6 Tabel `payment_transactions`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string, PK | UUID transaksi. |
| `userId` | string, FK | Pembeli. |
| `planId` | string, FK | Paket yang dibeli. |
| `amount` | number | Nominal. |
| `status` | string | PENDING, COMPLETED, FAILED. |
| `paymentGatewayRef` | string, nullable | ID referensi payment gateway. |
| `createdAt`, `updatedAt` | datetime | Audit. |

### 7.7 Tabel `store_members`
Keanggotaan seseorang di sebuah toko — inti dari multi-user cloud. `stores.userId`
tetap dipertahankan sebagai penanda **pemilik/penanggung langganan**; tabel ini
menambah lapisan akses di atasnya.

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string, PK | UUID. |
| `storeId` | string, FK | Toko. |
| `userId` | string, FK | Akun Google anggota. |
| `role` | enum('OWNER','ADMIN','STAFF') | Peran di toko ini. |
| `permissions` | json, nullable | Permission granular POS. null untuk OWNER. |
| `invitedBy` | string, nullable | Yang mengundang. |

Setiap toko selalu punya tepat satu baris `OWNER` yang mencerminkan `stores.userId`.

### 7.8 Tabel `store_invites`
Undangan yang belum diterima. Dipisah dari `store_members` karena email yang
diundang belum tentu pernah login lewat Google.

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string, PK | UUID. |
| `storeId` | string, FK | Toko tujuan. |
| `email` | string | Email Google yang diundang (lowercase). |
| `role` | enum | Peran yang akan diberikan. Tidak boleh `OWNER`. |
| `code` | string, unique | Kode 8 karakter yang diketik calon anggota. |
| `expiresAt` | datetime | Masa berlaku (7 hari). |
| `acceptedAt` / `revokedAt` | datetime, nullable | Status. |

### 7.9 Tabel Data Sinkronisasi
`sync_records` dikunci pada `(storeId, tableName, deviceId, localId)`. Kolom
`deviceId` ditambahkan bersama fitur sync dua arah — lihat 8.7.

Disarankan membuat tabel mirror untuk tiap entitas yang disinkronkan dari aplikasi, misalnya:
- `sync_categories`
- `sync_products`
- `sync_customers`
- `sync_transactions`
- `sync_transaction_items`
- `sync_expenses`
- `sync_debts`
- `sync_stock_opnames`

Masing-masing memiliki field:
- `id` (UUID/cloud ID, karena ID lokal number bisa duplikat antar device)
- `storeId` (FK)
- `deviceId` / `localId` (ID asli lokal)
- `payload` (json)
- `syncedAt` / `updatedAt`

---

## 8. REST API Endpoints

### 8.1 Paket Langganan
```
GET /api/plans
```
Respons:
```json
{
  "plans": [
    { "id": "STORAGE_10GB", "name": "10 GB Storage", "category": "STORAGE", "storageLimitMb": 10240, "price": 50000, "maxStores": null }
  ]
}
```

### 8.2 Profil User
```
GET /api/user/profile
```
Respons:
```json
{
  "user": { "id": "...", "email": "...", "name": "...", "planId": "...", "storageLimitMb": 10240, "syncExpiry": "..." },
  "subscription": { ... },
  "syncSubscription": { ... },
  "storageUsage": { "usedMb": 100, "limitMb": 10240, "remainingMb": 10140 },
  "backups": [ ... ]
}
```

### 8.3 Backup
```
GET    /api/backups
POST   /api/backups           (multipart: file, storeId)
GET    /api/backups/:id/download
DELETE /api/backups/:id
```

### 8.4 Pembayaran
```
POST   /api/payments/checkout              { planId, mobile?, redirectURL? }
POST   /api/payments/verify/:transactionId
POST   /api/payments/google-play/verify   { planId, productId, purchaseToken, packageName }
GET    /api/payments/history
```

### 8.5 Manajemen Toko
```
GET    /api/stores
POST   /api/stores                          { name }
PUT    /api/stores/:id                      { name, address1?, ... }
DELETE /api/stores/:id
PATCH  /api/stores/:id/identifier           { identifier }
PATCH  /api/stores/:id/visibility          { isPublic }
GET    /api/stores/identifier/check?q=...  { available: true/false }
POST   /api/stores/:id/logo                (multipart: logo)
DELETE /api/stores/:id/logo
```

### 8.6 Data Wilayah
```
GET /api/destinations/provinces
GET /api/destinations/cities/:provinceId
GET /api/destinations/districts/:cityId
```
Respons:
```json
{
  "data": [
    { "id": 11, "name": "Jawa Barat" }
  ]
}
```

### 8.7 Sinkronisasi Data
```
POST /api/stores/:storeId/sync
```
Body:
```json
{
  "categories": [...],
  "products": [...],
  "customers": [...],
  "transactions": [...],
  "transactionItems": [...],
  "expenseCategories": [...],
  "expenses": [...],
  "debts": [...],
  "debtPayments": [...],
  "stockOpnames": [...],
  "stockOpnameItems": [...]
}
```
Respons:
```json
{
  "message": "Sinkronisasi berhasil."
}
```

Body **wajib** memuat `deviceId` (nilai `storeSettings.deviceId` di aplikasi).
`localId` adalah auto-increment Dexie yang berjalan sendiri-sendiri di tiap
perangkat, jadi tanpa `deviceId` transaksi id 5 dari tablet kasir akan menimpa
transaksi id 5 milik HP pemilik.

Respons juga memuat `rejectedTables`: tabel yang diabaikan server karena
perangkat pengirim bukan perangkat pemilik.

> Tabel `users` (daftar karyawan) **tidak lagi diterima** di payload ini. Sejak
> multi-user cloud, sumber kebenaran anggota adalah `store_members` dan
> endpoint di 8.8 — kalau keduanya berjalan, perangkat yang membawa daftar lama
> bisa menghidupkan kembali anggota yang sudah dikeluarkan pemilik.

#### Arah tarik (master data)
```
GET /api/stores/:storeId/sync?since=<iso>&deviceId=<deviceId>
```
Mengembalikan **master data** (`categories`, `products`, `expenseCategories`)
milik perangkat **lain**, untuk diterapkan sebagai replika. Data transaksi tidak
ikut: tiap perangkat sudah punya miliknya sendiri, dan menariknya masuk akan
menabrakkan `localId` yang dialokasikan Dexie secara independen.

```json
{
  "tables": { "categories": [...], "products": [...], "expenseCategories": [...] },
  "total": 128,
  "syncedAt": "2026-08-24T10:00:00.000Z",
  "hasMore": false,
  "role": "STAFF",
  "masterTables": ["categories", "products", "expenseCategories"]
}
```
Klien menyimpan `syncedAt` dan mengirimkannya kembali sebagai `since` pada
tarikan berikutnya. `hasMore: true` berarti hasil terpotong dan klien perlu
menarik lagi.

#### Arah data: satu sumber untuk master data
- **Master data** (katalog) hanya boleh didorong perangkat **pemilik**.
  Dorongan dari perangkat lain diabaikan dan dilaporkan di `rejectedTables`.
- **Data transaksi** boleh didorong perangkat mana pun; tabrakan `localId`
  dicegah kolom `deviceId`, bukan pembatasan penulis.
- Pilihan ini menghindari penggantian `localId` menjadi UUID di seluruh tabel:
  selama master data punya satu sumber, `localId` milik pemilik bisa dipakai apa
  adanya sebagai primary key di perangkat karyawan, sehingga `productId` pada
  transaksi karyawan otomatis menunjuk produk yang sama.
- Baris `sync_records` warisan (sebelum kolom `deviceId` ada) punya `deviceId`
  kosong dan **diklaim** perangkat pertama yang push setelah upgrade. Aman
  karena sebelum ini tidak ada endpoint tarik sama sekali, jadi praktis hanya
  satu perangkat per toko yang pernah mendorong data.

### 8.8 Anggota Toko (Multi-User)
```
GET    /api/stores/:storeId/members            # anggota + undangan berlaku
POST   /api/stores/:storeId/invites            # {email, role, permissions?}
DELETE /api/stores/:storeId/invites/:inviteId
PATCH  /api/stores/:storeId/members/:userId    # {role?, permissions?}
DELETE /api/stores/:storeId/members/:userId
POST   /api/stores/:storeId/leave              # anggota keluar sendiri
POST   /api/invites/accept                     # {code}
```
Aturan akses:
- `GET members` — semua anggota. `invites` dikosongkan untuk `STAFF`.
- `POST/DELETE invites`, `PATCH/DELETE members` — `OWNER` dan `ADMIN`.
- `ADMIN` tidak bisa mengangkat atau mengeluarkan sesama `ADMIN`.
- `POST /api/invites/accept` mencocokkan kode **dan** email akun yang login,
  supaya kode yang tersebar di grup chat tidak bisa dipakai orang lain.

---

## 9. Alur Fitur Utama

### 9.1 Login Cloud
1. User sign in with Google di aplikasi.
2. Aplikasi kirim `id_token` ke backend pada request pertama.
3. Backend verifikasi JWT, buat user bila belum ada.
4. Backend kembalikan profil + langganan + kuota + daftar backup.

### 9.2 Backup Manual / Otomatis
1. Aplikasi ekspor seluruh IndexedDB menjadi JSON.
2. Aplikasi `POST /api/backups` dengan file JSON.
3. Backend validasi kuota, simpan file ke storage.
4. Backend kembalikan objek `CloudBackup`.
5. Auto-backup (jika aktif) di-trigger saat aplikasi dibuka sesuai interval.

### 9.3 Restore dari Cloud
1. User memilih backup dari daftar.
2. Aplikasi `GET /api/backups/:id/download`.
3. Aplikasi restore ke IndexedDB lokal.

### 9.4 Sinkronisasi Multi-Perangkat
1. Aplikasi mengidentifikasi data yang `updatedAt > syncedAt` (data kotor).
2. Aplikasi mengirim data kotor ke `POST /api/stores/:storeId/sync`.
3. Backend menyimpan/menggabungkan data.
4. Backend kembalikan konfirmasi.
5. Aplikasi update `syncedAt` lokal.

### 9.5 Toko Online
1. User membuat toko dan set `identifier` unik.
2. User set `isPublic: true`.
3. Backend menyediakan endpoint publik (di luar scope API ini, bisa dibuat terpisah) untuk render toko online berdasarkan `identifier`.

---

## 10. Aturan Bisnis

### 10.1 Kuota Storage
- Backend wajib menolak upload backup jika kuota penuh (HTTP 400).
- Jika memungkinkan, hitung `storageUsage` dari total file backup + logo user.

### 10.2 Langganan
- Paket `STORAGE` mengaktifkan fitur backup cloud.
- Paket `SYNC` mengaktifkan sinkronisasi multi-perangkat dan wajib memilih `storeId` saat upload backup.
- `maxStores` membatasi jumlah toko yang dapat dibuat.

### 10.3 Kepemilikan Data
- Akses toko ditentukan oleh `store_members`, bukan lagi oleh `stores.userId`.
- **Hak yang dibeli tetap milik pemilik**: kuota storage, `syncExpiry`,
  `maxStores`, dan `maxMembers` selalu dibaca dari pemilik toko, bukan dari
  anggota yang sedang login. Itulah cara karyawan menumpang langganan owner
  tanpa punya langganan sendiri.
- Backup (`/api/backups/*`) tetap per-user dan efektif hanya untuk pemilik:
  isinya mencakup modal dan margin. Karyawan menerima data lewat sync.
- Analitik (`/api/analytics/*`) tetap berbasis kepemilikan dengan alasan yang sama.
- Pembayaran dan profil langganan tidak pernah bisa diakses anggota non-pemilik.
- Toko yang tidak boleh diakses dibalas **404**, bukan 403, supaya keberadaan
  sebuah toko tidak bisa diprobe orang luar.

### 10.5 Batas Anggota
- `plans.maxMembers` membatasi jumlah anggota per toko (termasuk pemilik).
  `null` = tak terbatas, nilai untuk paket lama sebelum fitur ini ada.
- Batas dihitung dari anggota yang sudah bergabung **ditambah** undangan yang
  masih berlaku, supaya kuota tidak bisa ditembus dengan menyebar undangan.
- Batas dicek ulang saat undangan diterima: paket bisa saja turun di antaranya.
- Mengundang butuh langganan `SYNC` pemilik yang masih aktif.

### 10.4 Identifier Toko
- `identifier` harus unik dan aman untuk URL (alphanumeric, dash, underscore).
- Endpoint `/api/stores/identifier/check` memastikan ketersediaan.

---

## 11. Keamanan

- Verifikasi Google ID JWT di setiap endpoint terproteksi.
- Validasi input dan sanitasi file upload (hanya terima `.json` untuk backup, image untuk logo).
- Batasi ukuran file backup (misal max 100 MB per file).
- Gunakan HTTPS di production.
- Enkripsi file backup secara opsional (server-side encryption).
- Implementasikan rate limiting untuk mencegah abuse.

---

## 12. Deployment Awal (Docker)

### 12.1 docker-compose.yml Minimal
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kanpos_pos
      POSTGRES_USER: kanpos
      POSTGRES_PASSWORD: kanpos123
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: kanpos
      MINIO_ROOT_PASSWORD: kanpos123
    volumes:
      - miniodata:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  api:
    build: .
    environment:
      DATABASE_URL: postgres://kanpos:kanpos123@postgres:5432/kanpos_pos
      STORAGE_ENDPOINT: minio:9000
      STORAGE_BUCKET: kanpos
    ports:
      - "3210:3210"
    depends_on:
      - postgres
      - minio

volumes:
  pgdata:
  miniodata:
```

### 12.2 Environment Variables Backend
```
DATABASE_URL=
STORAGE_TYPE=s3|minio|filesystem
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
STORAGE_REGION=
GOOGLE_CLIENT_ID=
PAYMENT_GATEWAY_URL=
PAYMENT_GATEWAY_API_KEY=
JWT_SECRET=
PORT=3210
```

---

## 13. Kriteria Penerimaan (Acceptance Criteria)

- [ ] Semua endpoint di `src/lib/cloud-api.ts` dapat dijawab dengan benar.
- [ ] Login Google berhasil dan token terverifikasi.
- [ ] Upload/restore backup berfungsi dan mematuhi kuota.
- [ ] Sinkronisasi data kotor berhasil mengirim dan menyimpan data.
- [ ] Pembuatan toko, identifier, dan visibilitas berfungsi.
- [ ] Checkout dan verify pembayaran mengaktifkan langganan.
- [ ] Aplikasi dapat diarahkan ke `VITE_AUTH_API_URL` backend sendiri tanpa error.

---

## 14. Catatan Implementasi

- ID lokal aplikasi (IndexedDB/Dexie) berupa auto-increment number. Untuk sinkronisasi, backend harus menghindari konflik ID dengan mengelola UUID/cloud ID terpisah atau memastikan unik per `storeId` + `deviceId`.
- Struktur JSON backup berasal dari `buildBackupData()` di `src/lib/backup.ts` versi 7.
- Endpoint `/api/plans` bersifat publik, tidak memerlukan autentikasi.
- Logo toko dihapus via `DELETE /api/stores/:id/logo` dan di-upload via `POST /api/stores/:id/logo`.
- Field `operationalHours` dapat berupa JSON bebas sesuai kebutuhan frontend.
