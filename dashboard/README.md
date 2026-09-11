# Dashboard Cloud KanPOS

Dashboard web untuk pengguna Cloud KanPOS — laporan lintas toko yang tidak bisa
disediakan aplikasi kasir lokal. Rancangan fiturnya ada di
[`../frontend/docs/cloud-dashboard-ideas.md`](../frontend/docs/cloud-dashboard-ideas.md),
mockup visualnya di [`../frontend/docs/cloud-dashboard-mockup.html`](../frontend/docs/cloud-dashboard-mockup.html).

## Cakupan (Tier 1)

| # | Fitur | Komponen |
|---|---|---|
| 1.1 | Ringkasan semua toko + KPI gabungan | `src/components/Overview.tsx` |
| 1.2 | Perbandingan antar cabang | `src/components/Comparison.tsx` |
| 1.3 | Tren 12 bulan + pembanding tahun lalu | `src/components/TrendChart.tsx` |
| 1.4 | Rentang tanggal bebas + ekspor CSV | `src/components/RangeControls.tsx` |
| 1.5 | Status data & langganan | `src/components/HealthPanel.tsx` |

## Menjalankan

```bash
cp .env.example .env    # isi VITE_API_BASE_URL dan VITE_GOOGLE_CLIENT_ID
npm install
npm run dev             # http://localhost:5175
```

`VITE_GOOGLE_CLIENT_ID` harus **sama** dengan yang dipakai aplikasi kasir — backend
memverifikasi Google ID token pada tiap request (`backend/src/middleware/auth.ts`),
tidak ada sesi server terpisah. Konsekuensinya token kedaluwarsa ±1 jam; respons 401
otomatis mengembalikan pengguna ke layar masuk.

## Endpoint backend

Modul `backend/src/modules/analytics`:

| Endpoint | Guna |
|---|---|
| `GET /api/analytics/overview?from&to&storeIds` | KPI gabungan + kartu per toko + sparkline 30 hari |
| `GET /api/analytics/compare?from&to` | Baris perbandingan cabang |
| `GET /api/analytics/trend?months&storeId` | Deret bulanan + periode sama tahun lalu |
| `GET /api/analytics/health` | Status sync, penyimpanan, langganan |
| `GET /api/analytics/export?dataset=daily\|transactions&from&to` | Unduhan CSV |

## Keputusan yang perlu diketahui

- **Data basi tidak ditampilkan sebagai data hari ini.** Toko yang belum sinkron lebih
  dari 24 jam ditandai `stale`; angka hari ini-nya dikosongkan (`—`) dan diganti peringatan.
- **Batas hari mengikuti `Store.timezone`,** bukan zona server (`backend/src/lib/timezone.ts`),
  supaya rekap harian cocok dengan struk closing yang dicetak kasir.
- **Transaksi berstatus `open` tidak dihitung** — itu bill yang belum dibayar.
- **Agregasi dikerjakan di memori** dari `SyncRecord`. Cukup untuk skala satu pemilik
  usaha. Bila satu akun menembus ratusan ribu transaksi, ganti `loadRows()` di
  `analytics/service.ts` dengan tabel agregat harian yang diperbarui saat sync.
