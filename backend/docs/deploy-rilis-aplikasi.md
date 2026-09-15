# Deploy: rilis aplikasi di luar Play Store

Fitur ini menyentuh tiga hal di server — **backend**, **panel admin**, dan
**landing** — lalu rilis pertama diunggah dari panel. Aplikasi kasir
(Android/Windows) tidak di-deploy ke server; ia dibagikan lewat fitur ini.

Urutannya penting: backend dulu (tabel dan endpoint), baru admin dan landing
yang memakainya.

---

## 1. Backend (`backend/`)

### 1.1 Migrasi database — sebelum kode baru jalan

```bash
cd backend
psql "$DATABASE_URL" -f prisma/migrations-preview/app-releases.sql
```

Membuat enum `ReleasePlatform` dan tabel `app_releases`. Aman untuk kode lama
yang masih jalan (tidak mengubah tabel lain). Jangan dijalankan dua kali —
`CREATE TYPE` akan gagal di percobaan kedua, dan itu tanda migrasinya sudah ada.

### 1.2 Tambah env di `backend/.env`

```env
PUBLIC_API_URL=https://api-kanpos.codecircle.cloud
RELEASE_MAX_MB=400
```

- `PUBLIC_API_URL` — tanpa garis miring di akhir. Tanpa ini link unduhan
  disusun dari header permintaan, yang di belakang reverse proxy bisa berubah
  jadi `http://localhost:3210`.
- Pastikan storage (`STORAGE_*`) sudah jalan: installer disimpan di bucket yang
  sama, di bawah prefix `releases/`.

### 1.3 Nginx di depan API

Upload APK/EXE ditolak Nginx sebelum sampai ke backend kalau batasnya kecil
(bawaan 1 MB):

```nginx
server {
    server_name api-kanpos.codecircle.cloud;

    client_max_body_size 400m;      # = RELEASE_MAX_MB

    location / {
        proxy_pass http://127.0.0.1:3210;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Unggahan dan unduhan installer besar: jangan diputus di tengah jalan,
        # dan jangan ditampung dulu di disk Nginx.
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 1.4 Build dan restart

```bash
cd backend
npm ci
npx prisma generate      # wajib: ada model baru AppRelease
npm run build
pm2 restart <nama-proses-backend>
```

### 1.5 Cek

```bash
curl -s https://api-kanpos.codecircle.cloud/api/releases
# → {"android":null,"windows":null}   (belum ada rilis — ini normal)
```

Kalau keluar `Endpoint tidak ditemukan`, kode lama masih jalan. Kalau error
500 soal tabel, langkah 1.1 belum dijalankan.

---

## 2. Panel admin (`admin/`)

Tidak ada env baru. `VITE_API_BASE_URL` yang sudah ada tetap dipakai.

```bash
cd admin
npm ci
npm run build
pm2 restart adm-kanpos
```

**Cek:** masuk panel → menu **Rilis aplikasi** muncul di grup Kelola, halaman
menampilkan "Belum ada rilis".

---

## 3. Landing (`landing/`)

### 3.1 Env build

Buat `landing/.env` (belum ada sebelumnya):

```env
VITE_API_BASE_URL=https://api-kanpos.codecircle.cloud
```

Nilainya ditanam ke bundle saat build — mengubah `.env` setelah build tidak
berpengaruh sampai build ulang.

### 3.2 Build dan restart

```bash
cd landing
npm ci                   # ada dependensi baru: qrcode-generator
npm run build
pm2 restart kankitu-landing
```

`ecosystem.config.cjs` sudah memakai `PM2_SERVE_SPA`, jadi `/download`
otomatis dilayani `index.html`. Kalau landing dilayani Nginx langsung, pastikan
ada `try_files $uri /index.html;`.

**Cek:** buka `https://<domain-landing>/download`. Sebelum ada rilis, halaman
menampilkan "Versi terbaru sedang disiapkan" dengan tombol WhatsApp. Kalau
muncul "Info versi belum bisa dimuat", `VITE_API_BASE_URL` salah atau API
belum di-deploy.

Semua tombol "Download Gratis" di landing sekarang menuju `/download`, bukan
Play Store.

---

## 4. Rilis pertama

### 4.1 Android

```bash
cd frontend
npm run cap:android      # bump-version → build web → sync → buka Android Studio
```

Di Android Studio → **Build › Generate Signed Bundle / APK › APK**, pakai
**keystore yang sama dengan rilis sebelumnya**. Keystore berbeda = Android
menolak update di atas versi lama, pengguna harus uninstall (data lokal hilang).

> Build ini berisi izin `REQUEST_INSTALL_PACKAGES`. Jangan unggah APK/AAB yang
> sama ke Play Store — izin itu dibatasi Google dan bisa ditolak.

### 4.2 Windows

```bash
cd frontend
npm run cap:electron:build:win
```

Skrip ini sudah menjalankan bump-version, build web, dan sync. Jangan didahului
`npm run build` — `versionCode` akan naik dua kali dan tidak cocok lagi dengan
build Android versi yang sama.

Installer ada di `frontend/electron/dist/KanPOS-*-Setup.exe`.

### 4.3 Unggah di panel admin

Menu **Rilis aplikasi → + Unggah rilis**:

Setiap perintah build di atas menaikkan `version.json` sendiri-sendiri, jadi
catat nilainya **tepat setelah** build platform itu selesai.

| Kolom | Isi |
|---|---|
| Nama versi | `appVersion` dari `frontend/version.json` build tersebut |
| versionCode | `versionCode` dari `frontend/version.json` build tersebut — **harus persis sama** |
| Catatan rilis | satu perubahan per baris, diawali `-` |
| Langsung terbitkan | nyalakan kalau sudah siap dibagikan |
| Wajib update | biarkan mati, kecuali versi lama benar-benar rusak |

`versionCode` yang tidak cocok dengan isi APK membuat aplikasi terus menawarkan
update yang sama (terlalu tinggi) atau tidak pernah menawarkan (terlalu rendah).

### 4.4 Cek akhir

1. `https://<domain-landing>/download` menampilkan versi, ukuran, dan QR code.
2. Scan QR dari HP → APK terunduh dan bisa dipasang.
3. Di panel admin, kolom **Unduhan** bertambah.
4. Uji update: pasang APK versi lama → unggah versi baru dengan versionCode
   lebih tinggi → buka aplikasi lama → dialog "Update tersedia" muncul.

---

## Ringkas

| # | Project | Perintah inti | Yang baru |
|---|---|---|---|
| 1 | backend | `psql -f app-releases.sql` → `prisma generate` → build → restart | tabel, 2 env, Nginx body size |
| 2 | admin | build → `pm2 restart adm-kanpos` | — |
| 3 | landing | `.env` → `npm ci` → build → `pm2 restart kankitu-landing` | `VITE_API_BASE_URL`, dependensi QR |
| 4 | rilis | build APK/EXE → unggah di panel | — |
