# Design Spec — reverse-engineered from `design/*.svg` (Figma export)

> **Status (8 Sep 2026): spec Figma di bawah ini SUDAH DIGANTIKAN oleh Shark UI.**
> Bahasa visual aktif = Shark UI (https://shark.vini.one), lihat bagian **Ronde 5** di akhir
> file dan `docs/shark-migration-guide.md`. Bagian 1–5 disimpan sebagai arsip.

> Sumber: 55 file SVG di `frontend/design/` (export Figma, teks di-outline jadi vector,
> file besar meng-embed raster base64). Spec ini disusun dari ekstraksi hex/rx/dimensi
> + inspeksi anatomi rect. Dipakai sebagai sumber kebenaran untuk adopsi design ke
> `jokoui` + design token.
>
> Catatan: teks pada SVG ter-outline sehingga label/kata tidak bisa diekstrak programatik
> (ditebak dari konteks). Font tidak tercantum di SVG → dipertahankan `Sora`.

## 1. Color tokens (hex → HSL)

| Role                       | Hex       | HSL                 | Catatan                                    |
|----------------------------|-----------|---------------------|--------------------------------------------|
| primary                    | `#3554C1` | `227 57% 48%`       | brand blue (paling sering dipakai)         |
| primary-foreground         | `#FFFFFF` | `0 0% 100%`         |                                            |
| foreground                 | `#0D0D12` | `240 16% 6%`        | teks utama                                 |
| accent (primary-tint bg)   | `#EFF5FF` | `217 100% 97%`      | icon blob, avatar bg                       |
| accent-foreground          | `#3554C1` | `227 57% 48%`       | icon di atas accent bg                     |
| primary-tint stronger      | `#C0CAEC` | `226 54% 84%`       | skeleton/placeholder aktif                 |
| muted-foreground           | `#818898` | `222 10% 55%`       | teks sekunder (paling sering)              |
| muted-foreground alt       | `#7C8690` | `210 8% 53%`        |                                            |
| muted bg / secondary       | `#ECEFF3` | `214 23% 94%`       | chip bg, divider                           |
| background (page)          | `#EDF1F9` | `220 50% 95%`       | bg layar (Container.svg)                   |
| background alt             | `#F8FAFE` | `220 75% 98%`       | summary bg dalam card                      |
| background subtle          | `#F6F8FA` | `210 29% 97%`       | section bg dalam bottom sheet              |
| card                       | `#FFFFFF` | `0 0% 100%`         |                                            |
| border (card)              | `#DFE1E7` | `225 14% 89%`       | stroke circle button                       |
| border soft                | `#ECEFF3` | `214 23% 94%`       | input row, segmented control               |
| border input               | `#EFF2F6` | `214 28% 95%`       | Text Input stroke                          |
| border tab inactive        | `#C1C7D0` | `216 14% 79%`       | Tab outline                                |
| border muted               | `#ADB5C2` | `217 15% 72%`       |                                            |
| success                    | `#5ABC61` | `124 42% 55%`       | badge/CTA positif                          |
| success-foreground         | `#FFFFFF` | `0 0% 100%`         |                                            |
| success bg light           | `#EFF8EF` | `120 39% 95%`       | check icon bg                              |
| destructive                | `#DF1C41` | `349 78% 49%`       |                                            |
| destructive-foreground     | `#FFFFFF` | `0 0% 100%`         |                                            |
| destructive bg light       | `#FFF0F3` | `348 100% 97%`      |                                            |
| warning                    | `#F9A616` | `38 95% 53%`        |                                            |
| warning bg light           | `#FFF6E0` | `43 100% 94%`       |                                            |
| purple accent              | `#CB5CFE` | `281 99% 68%`       | Customer Types segmen 3                    |
| purple alt                 | `#6B39F4` | `256 89% 59%`       |                                            |
| teal accent                | `#3DDBBF` | `169 69% 55%`       |                                            |
| near-white                 | `#FDFDFD` | `0 0% 99%`          |                                            |
| foreground dark alt        | `#1A1B25` | `235 17% 12%`       |                                            |

## 2. Radius / shape

| Token                  | rx (px) | Pemakaian                              | Tailwind target       |
|------------------------|---------|----------------------------------------|-----------------------|
| base `--radius`        | 16      | container, dropdown, help section      | `rounded-lg`          |
| card                   | 24      | Card, News Card, Product List          | `rounded-3xl`         |
| button / CTA           | 26      | Continue Button, Bottom Sheet CTA      | `rounded-full` (pill) |
| input                  | 25.5    | Text Input                             | `rounded-full` (pill) |
| header                 | 24      | Header Container (48px → pill)         | `rounded-full`        |
| tab                    | 22      | Tab segments                           | `rounded-full`        |
| section besar          | 20      | Order Card, Customer Types, Main       | `rounded-[20px]`      |
| inner item             | 12      | item thumbnail, summary box            | `rounded-xl`          |
| chip / badge           | 8.5/8   | status badge, small pill               | `rounded-lg`          |
| small                  | 5       | placeholder bar, tiny chip             | `rounded-md`          |
| user info container    | 36      | User Info Container                    | `rounded-[36px]`      |

- Border/outline tipis: `stroke-width` dominan `1.125`, `1.25`, `1.5` → ≈ 1px border.
- Grabs: Bottom Sheet grabber `40×4 rx=2`.

## 3. Dimensi & spacing

- Viewport mobile acuan: **375px**.
- Page padding: **16px** (konten 343px; beberapa tab 359 = bleeds `-mx`).
- Card padding dalam: **12px** (icon blob di x=12).
- Gap antar kartu: **16px**; antar baris list: **8px**.
- Tinggi standar:
  - Button / CTA / Input: **52px**
  - Header: **48px**
  - Tab: **45px**
  - List row (transaction): **68px**
  - Avatar/icon circle: **44px** (ada juga 40, 46, 72)
  - Small badge: 43×17 / 91×30
  - Product thumb (bottom sheet): 52×52 rx=10

## 4. Anatomi komponen kunci

- **Card (grid 167×142, rx=24)**: putih; icon blob kiri-atas 46×46 circle `#EFF5FF`;
  badge kiri-bawah 43×17 rx=8.5 `#5ABC61`.
- **Card full (343×N, rx=24)**: putih; opsional action circle kanan-atas 39×39 rx=19.5
  stroke `#DFE1E7`; opsional input row bawah 288×43 rx=21.5 white + stroke `#ECEFF3`
  dengan icon circle 36×36 `#EFF5FF`.
- **Header (343×48 rx=24 pill)**: putih pill; avatar kiri 40×40 circle `#3554C1`;
  title; action circle kanan 44×44 putih.
- **Text Input (343×52 rx=25.5 pill)**: putih, stroke `#EFF2F6`, icon kiri (search).
- **Button primary (343×52 rx=26)**: fill `#3554C1`, teks putih.
- **Continue Button Container-3 (CTA bar 343×52 rx=26)**: container putih pill;
  icon circle kiri 44×44 `#EFF5FF`; action pill kanan 63×28 rx=14 `#EFF5FF`.
- **Tab (359×45)**: segmen pill; aktif = fill+stroke `#3554C1`; non-aktif = stroke
  `#C1C7D0`; lebar variabel (92/67/106/141).
- **Order Card (343×311 rx=20)**: putih; image atas; avatar 44×44 `#EFF5FF`;
  action circle kanan-atas 39×39 stroke `#DFE1E7`; summary bawah 319×68 rx=12
  `#F8FAFE`; CTA hijau 74×24 rx=12 `#5ABC61`; item thumb 60×56 rx=12 putih.
- **News Card (343×147 rx=24)**: fill `#3554C1` (brand) + overlay image; CTA pill
  91×30 rx=15 putih opacity 34%.
- **Help Section (343×160 rx=16)**: putih + image pattern; CTA row dalam 311×48 rx=24.
- **Customer Types (343×268 rx=20)**: putih; segmented control 318×27 rx=7.5 stroke
  `#ECEFF3` dengan 3 segmen berwarna (149×20 `#3554C1`, 102×20 `#5ABC61`,
  56×20 `#CB5CFE`); checkbox 16×16 rx=4 berwarna.
- **Transaction Section**: baris 343×68 rx=20 putih; avatar 44×44 circle `#EFF5FF`;
  gap 8px.
- **Bottom Sheet (375×310/811)**: grabber 40×4 rx=2 `#B8C2CC` opacity 0.5; konten
  343×N rx=16 putih; product thumb 52×52 rx=10; CTA 343×52 rx=26 `#3554C1`.
- **Dropdown (228×245 rx=16)**: putih.
- **User Info Container (343×670 rx=36)**: sangat rounded; profile circle 72×72.

## 5. Pemetaan ke token CSS variable (sudah diterapkan di `src/index.css`)

```css
:root {
  --background: 220 50% 95%;        /* #EDF1F9 */
  --foreground: 240 16% 6%;         /* #0D0D12 */
  --card: 0 0% 100%;
  --card-foreground: 240 16% 6%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 16% 6%;
  --primary: 227 57% 48%;           /* #3554C1 */
  --primary-foreground: 0 0% 100%;
  --secondary: 214 23% 94%;         /* #ECEFF3 */
  --secondary-foreground: 240 16% 6%;
  --muted: 214 23% 94%;             /* #ECEFF3 */
  --muted-foreground: 222 10% 55%;  /* #818898 */
  --accent: 217 100% 97%;           /* #EFF5FF */
  --accent-foreground: 227 57% 48%; /* #3554C1 */
  --destructive: 349 78% 49%;       /* #DF1C41 */
  --destructive-foreground: 0 0% 100%;
  --success: 124 42% 55%;           /* #5ABC61 */
  --success-foreground: 0 0% 100%;
  --warning: 38 95% 53%;            /* #F9A616 */
  --warning-foreground: 0 0% 100%;
  --border: 225 14% 89%;            /* #DFE1E7 */
  --input: 214 28% 95%;             /* #EFF2F6 */
  --ring: 227 57% 48%;
  --radius: 1rem;                   /* 16px base */

  /* tint backgrounds (bagian 1) — dipakai Alert/Badge */
  --success-tint: 120 39% 95%;      /* #EFF8EF */
  --destructive-tint: 348 100% 97%; /* #FFF0F3 */
  --warning-tint: 43 100% 94%;      /* #FFF6E0 */
  --surface-alt: 220 75% 98%;       /* #F8FAFE — summary box dalam card */
  --accent-strong: 226 54% 84%;     /* #C0CAEC — placeholder aktif */
}
```

Kelas Tailwind yang dihasilkan: `bg-success-tint`, `bg-destructive-tint`, `bg-warning-tint`,
`bg-surface-alt`, `bg-accent-strong` (lihat `tailwind.config.ts`). Semua punya padanan `.dark`.

## 6. Status adopsi

Sudah diterapkan:

- Token warna + radius di `src/index.css` (light & dark) dan `tailwind.config.ts`.
- Seluruh primitive `src/components/jokoui/*` mengikuti spec: button/input/select pill 52px,
  card rx=24, tab pill, avatar circle 44px (varian 36/46/72), checkbox 16px rx=4 (`size="sm"`),
  alert memakai tint, progress track `#ECEFF3`, empty-state blob circle 72px.
- Ikon-blob di seluruh halaman diubah dari kotak (`rounded-2xl`) menjadi lingkaran
  (`rounded-full`) sesuai anatomi SVG. Pengecualian: dropzone/preview gambar tetap
  `rounded-xl` (thumb rx=12) — foto produk, logo toko, preview toko online.
- Overlay Radix (`src/components/ui/*`) disamakan: calendar hari jadi pill, command input 52px,
  toast action/close pill. Dialog/AlertDialog/Popover sudah token-based sehingga ikut otomatis.
- `UserGreeting` dipakai di header Dashboard; `CtaBar` dipakai sebagai tombol Bayar di kasir
  (pola `Continue Button Container`); `SectionTitle`/`TransactionItem`/`EmptyState` di Dashboard.

Ronde 2 (restrukturisasi layout per layar; mockup di `docs/design-ideas-v4.html`):

- **Beranda** — header pill (`UserGreeting variant="pill"`); transaksi terakhir jadi kartu
  68px terpisah gap 8px (`TransactionItem variant="card"`, nominal hijau); `NewsCard`
  menghidupkan flag `showBackup` yang sebelumnya mati (backup reminder + dismiss);
  `DailyPllCard` & kartu staf jadi kartu putih + summary box `bg-surface-alt`.
- **Kasir** — tab kategori outline (`border-tab` = `#C1C7D0`); kartu produk anatomi
  `Card.svg` (blob foto lingkaran 46px + badge harga hijau, stok menipis → badge kuning);
  bar bawah mobile = `CtaBar` filled (area ikon = buka keranjang, sisanya = bayar).
- **Sheet pembayaran** — Dialog → bottom `Sheet` ber-grabber 40×4; metode bayar =
  `CustomerTypes` (≤4 metode; lebih dari itu fallback grid); CtaBar **hijau**
  (`tone="success"`) untuk "terima uang".
- **Riwayat** — open bills tampil sebagai `OrderCard` di atas daftar (summary box +
  CTA hijau "Lanjutkan" → `/cashier` state `loadBillId`, di-handle effect di Cashier);
  filter status tab outline.
- **Pengaturan** — kepala halaman `UserInfo` (avatar 72 + statistik Dexie `count()`);
  `HelpSection` memunculkan rute `/settings/report-issue` yang terkubur; blob menu
  diseragamkan satu nada accent.

Ronde 3 — `Transaction Overview.svg` (343×590 rx=24, bg `#F8FAFE`):

- **`jokoui/segmented-bar-chart`** — ciri khas SVG ini: tiap bar adalah tumpukan kapsul
  **24×10 rx=5** dengan pitch 11.82, 15 slot, terisi dari bawah. Kosong `#EFF5FF`,
  terisi `#C0CAEC`, bar aktif (nilai tertinggi) `#3554C1`. Sumbu-Y 5 tick (tick terbawah
  = max/5, bukan 0 — sama seperti SVG). `mode="line"` merender seri yang sama sebagai
  garis tren, sesuai ikon kedua di toggle.
- **`jokoui/overview-row`** — baris 319×**60** rx=30 (pill) putih, lingkaran **52×52**,
  label + bar porsi 158×8 rx=4, lalu nominal + badge delta 45×16 rx=8
  (hijau `#5ABC61` / merah `#DF1C41`).
- **`reports/TransactionOverview`** — merangkai keduanya: grafik penjualan **6 bulan
  terakhir** + rincian **per metode pembayaran** (nominal rentang, bar porsi, delta
  bulan terakhir vs sebelumnya). Toggle pill 76×40 rx=20 di kanan-atas mengganti
  batang ↔ tren. Dipasang di halaman **Laporan**, rentangnya sendiri (tidak terikat
  tab periode Harian/7/30 di bawahnya). Warna lingkaran ikon mengikuti
  `paymentMethods.category` (tunai/transfer/e-wallet/qris).

Ronde 4 — onboarding (mockup di `docs/onboarding-mockup.html`):

Alur lama 7 langkah (5 slide tutorial → install PWA → setup toko) dipangkas jadi
**3 layar + layar sukses**, dengan edukasi dipindah ke beranda.

- **Layar 1 — Sambutan.** Logo, pemilih bahasa, CTA `Buat Toko Baru`, dan jalur
  `Saya sudah punya backup` yang membuka Sheet restore (file lokal + cloud).
  Checkbox T&C yang dulu memblokir tombol Lanjut diganti teks clickwrap di bawah CTA.
- **Layar 2 — `Jualan apa?`** Grid 2 kolom 12 jenis usaha (kartu 70px rx=20, blob
  emoji 30px). Panel preview `Yang disiapkan untuk …` menempel di atas CTA — bukan
  di dalam area scroll, supaya imbalan memilih selalu terlihat.
- **Layar 3 — Nama toko.** Satu field wajib; alamat & telepon jadi disclosure
  tertutup; segmented `Produk contoh` / `Mulai kosong` (56px rx=28).
- **Layar sukses** ~1,4 detik dengan rekap angka (kategori/produk/metode bayar),
  bukan langkah yang harus ditekan.

Pendukungnya:

- **`lib/business-seed.ts`** — peta 12 `BUSINESS_TYPES` → kategori, satuan, dan
  produk contoh. `applyBusinessSeed()` idempotent (cocokkan kategori/satuan per nama,
  produk per SKU) dan membuang kategori bawaan `seedDefaultData()` yang tidak relevan
  **hanya bila DB masih kosong**, supaya restore tidak pernah tersentuh. Laundry &
  salon di-seed `trackStock: false` (jasa tanpa stok).
- **`SetupChecklist`** di Beranda — pengganti slide tutorial: 4 item (toko dibuat,
  produk pertama, transaksi pertama, backup) dengan `Progress`; hilang otomatis saat
  100% atau saat ditutup.
- **`InstallBanner`** di Beranda — prompt PWA pindah dari wizard ke sini, baru muncul
  **setelah transaksi pertama** (iOS dapat hint Share → Add to Home Screen).
- Jenis usaha yang dipilih memanggil `markUserTypeAnswered()` + `submitUserType()`,
  jadi **`UserTypeModal` tidak lagi menginterupsi di halaman Laporan** untuk user baru.
- Token baru `--border-soft` (`#ECEFF3`) + kelas `border-soft` — stroke tipis kartu
  pilihan, sesuai bagian 1 tabel warna.
- Pemilih warna tema dikeluarkan dari wizard (tetap ada di `/settings/theme`);
  `storeSettings.themeColor` yang kosong otomatis memakai `DEFAULT_THEME_HUE`.

> **Jebakan i18n:** `i18n.language` bisa berisi region (`en-US`) sehingga
> `i18n.language === code` tidak pernah cocok dengan `SUPPORTED_LANGUAGES` — pemilih
> bahasa jadi tak menandai apa pun. Bandingkan `i18n.resolvedLanguage.split('-')[0]`.

Komponen yang masih menunggu tempat: `HeaderLeft` (belum ada sub-header yang cocok).

> **Penting — tema runtime:** `use-theme-color.ts` menimpa `--primary` dengan
> `storeSettings.themeColor` saat boot. Default lama Indigo (`'243'`) sudah diganti preset
> brand `'227'` (= `#3554C1`), dan nilai `'243'` yang tersimpan di DB lama dipetakan ke brand
> di `getThemeHSL`. Tanpa pemetaan ini seluruh app tampil indigo, bukan biru desain —
> jangan hapus mapping tersebut. Verifikasi visual juga harus dalam **light mode**
> (`nativeTheme.themeSource = 'light'` di Electron) dan ingat **service worker PWA
> menyajikan build lama** — bersihkan `serviceworkers` + `cachestorage` sebelum
> membandingkan screenshot dengan mockup.

> **Jebakan penamaan:** `jokoui/select` adalah `<select>` native, sedangkan `ui/select` adalah
> Radix Select (`SelectTrigger`/`SelectContent`/`SelectItem`). Namanya sama tapi API-nya beda
> total, jadi impornya **tidak** bisa saling ditukar. Halaman yang butuh dropdown kaya
> tetap memakai `ui/select` (sudah disamakan gayanya).

Ronde 4 — redesign berbasis persona (mockup di `docs/design-ideas-v5.html`):

- **`lib/business-mode.ts` + `hooks/use-business-mode.ts`** — jenis usaha
  (`retail` / `wholesale` / `resto`) beserta afordans yang menyertainya
  (`traits`). Nilainya diturunkan dari jawaban "jenis usaha" di onboarding
  (`businessModeFromType`), bukan pertanyaan baru, dan bisa ditimpa di
  Pengaturan → Master Data → Jenis usaha. Disimpan di `StoreSettings.businessMode`
  (field opsional; tidak butuh bump versi Dexie karena `storeSettings` hanya
  ber-index `++id`).
- **`lib/nav-groups.ts` + `components/layout/HubTabs`** — 17 halaman flat
  dikelompokkan jadi Beranda / **Barang** / (FAB Kasir) / **Catatan** / Saya.
  Barang = Produk + Stok Masuk + Stok Keluar + Laporan Stok; Catatan = Riwayat +
  Kasbon + Pengeluaran + Laporan. Rute lamanya tidak berubah — `HubTabs`
  dipasang di bawah `PageHeader` tiap halaman dan `BottomNav` menyalakan
  kelompoknya, jadi deep-link & kebiasaan user tetap utuh. Supplier & Pelanggan
  sengaja tidak jadi kelompok (hanya dipakai di dalam alur lain).
- **`jokoui/money-display`** — `MoneyDisplay` (skala sm/md/lg/**xl 32px**,
  tabular-nums) + `MoneyVisibilityToggle`. Status "sembunyikan nominal" global
  lewat localStorage + CustomEvent, untuk dipakai saat ada pembeli di depan meja.
  Dipakai di `DailyPllCard` (angka utama) dan kembalian di kasir.
- **`jokoui/numpad`** — `NumPad` (keypad sendiri, tap-target 52px) dan
  `QuickCashRow` dengan `suggestCashDenominations()`: pecahan yang disarankan
  dihitung dari total, bukan daftar tetap, sehingga selalu ≥ tagihan.
  Menggantikan `<Input type="number">` + grid 1K–100K di sheet pembayaran —
  keyboard OS menutup nominal kembalian, justru informasi yang paling dicari.
- **`jokoui/qty-stepper`** — dipakai di baris keranjang sheet pembayaran.
- **`jokoui/alert-strip`** — stok menipis & bill terbuka naik dari balik ikon
  lonceng ke badan Beranda.
- **`jokoui/whatsapp-action`** — `WhatsAppAction` + `toWhatsAppNumber()`;
  tombol "Tagih via WA" di detail kasbon dengan pesan tersusun otomatis.
- **Kasir mengikuti mode**: tombol scan hanya pada mode ber-barcode, kolom nomor
  meja hanya pada mode resto.

Ronde 5 — harga bertingkat (mode grosir):

- **`Product.priceTiers?: PriceTier[]`** (`{ name, price, minQty }`) — tingkat
  dasar tidak disimpan, ia adalah `Product.price` itu sendiri; daftar ini hanya
  memuat tingkat tambahan. Field opsional tanpa index, jadi tidak perlu bump
  versi Dexie.
- **`lib/price-tiers.ts`** — `tiersOf` / `autoTier` / `resolveTier` /
  `unitPrice` / `sanitizeTiers`. Pemilihan otomatis memakai urutan `minQty`
  (tingkat terakhir yang syaratnya terlampaui), **bukan** "harga termurah yang
  memenuhi" — pemilik harus bisa menebak tingkat mana yang dipakai hanya dari
  jumlahnya. Tingkat dengan harga ≤ 0, `minQty` ≤ 1, atau nama kosong dibuang
  agar data impor yang berantakan tidak diam-diam mengubah harga jual.
  Diuji di `src/test/price-tiers.test.ts` (13 kasus).
- **`jokoui/price-tier-seg`** — segmented control per baris keranjang; tingkat
  yang belum memenuhi jumlah tetap ditampilkan redup supaya terlihat "tinggal
  berapa lagi".
- **Kasir** — seluruh perhitungan (`getItemSubtotal`, diskon per item, profit,
  dan snapshot `price` pada 4 titik penyimpanan transaksi) lewat
  `unitPrice(product, qty, tierName)`. `CartItem.tierName` menyimpan pilihan
  manual; bernilai `undefined` bila pilihannya sama dengan tingkat otomatis,
  sehingga baris itu kembali mengikuti jumlah saat qty diubah.
  `loadOpenBill` memulihkan pilihan tingkat dengan mencocokkan harga tersimpan;
  bila tidak ada yang cocok (produk diedit sejak bill dibuat) ia jatuh ke
  otomatis, bukan memakai harga yang sudah tak berlaku.
- **Produk** — editor tingkat di dialog produk (nama / min / harga per unit) +
  badge jumlah tingkat di kartu produk.

Ronde 6 — impor Excel bertingkat & denah meja:

- **Kolom "Harga Bertingkat" di template produk** — satu sel berformat
  `Nama:minQty:harga` dipisah `;` (mis. `Grosir:12:13000; Partai:50:11500`),
  dibaca `parseTiersFromSheet()`. Potongan yang tidak terbaca menjadi **galat
  baris**, bukan dibuang diam-diam — kehilangan harga grosir tanpa peringatan
  adalah persis jebakan yang mau dihindari. Catatan: aplikasi hanya punya
  *unduh template*, tidak ada ekspor produk, jadi tidak ada jalur ekspor yang
  perlu ditambal. Backup/restore memakai `toArray()` sehingga `priceTiers` ikut
  otomatis.
- **`jokoui/table-grid` + `StoreSettings.tableCount`** — denah meja mode
  restoran, muncul di atas daftar bill terbuka. Meja **tidak** jadi entitas
  database: nomornya dibangun dari `tableCount` dan statusnya diturunkan dari
  bill yang masih terbuka, sehingga tidak ada data meja yang bisa melenceng dari
  kenyataan transaksi. Meja kosong → bill baru dengan nomor itu; meja terisi →
  lanjutkan billnya. Meja dengan bill ≥ 40 menit ditandai kuning. Satu meja
  dengan lebih dari satu bill terbuka ditampilkan sebagai gabungan nominal +
  umur bill terlama.

Ronde 7 — status "minta bill":

- **`Transaction.billRequestedAt?: Date | null`** + tombol tandai/batalkan pada
  tiap kartu bill terbuka (hanya mode resto & bill yang punya nomor meja). Ini
  aksi pelayan, bukan kasir: pelayan yang dipanggil meja menandainya, kasir
  melihatnya menyala di denah. Dibersihkan otomatis saat bill ditambah item —
  meja yang memesan lagi berarti belum selesai, jadi permintaan lamanya basi.
- **Satu warna alarm untuk satu arti.** "Sudah lama" (≥ 40 menit) tidak lagi
  memakai kuning: meja lama hanya menyorot angka menitnya, sementara kuning
  disimpan untuk hal yang perlu ditindak sekarang — minta bill. Legenda jadi
  Kosong / Ada order / Minta bill.
- **`lib/tables.ts`** — `deriveTableSlots()` dikeluarkan dari komponen agar bisa
  diuji: penggabungan beberapa bill pada satu meja (nominal dijumlahkan, umur
  diambil terlama, satu permintaan cukup menandai meja), bill tanpa nomor meja,
  nomor di luar `tableCount`, dan bill bertanggal masa depan.
  Diuji di `src/test/tables.test.ts` (10 kasus).

Seluruh mockup `docs/design-ideas-v5.html` sudah diimplementasikan.

Ronde 8 — tata letak layar menyusul mockup v5:

Ronde 4–7 mengerjakan struktur & logika, tapi tata letak sebagian layar masih
tertinggal dari `docs/design-ideas-v5.html`. Ronde ini menutupnya.

- **Kasir · Klontong** — keranjang ringkas (3 baris + sisanya diringkas) pindah
  ke atas layar; zona jempol di bawah disediakan untuk memilih barang dan tombol
  bayar. Tap keranjang membuka sheet lengkap seperti sebelumnya.
- **Kasir · Grosir** — `preferListLayout` & `prominentCustomer` yang sebelumnya
  didefinisikan tapi tidak pernah dipakai kini punya efek: mode grosir dipaksa
  ke tata letak daftar (bukan preferensi user, tapi konsekuensi jenis usaha),
  pemilih pelanggan naik ke atas beserta **sisa kasbonnya** sebelum transaksi
  dimulai, dan `emphasizeDebt` memunculkan tombol **Bayar Tempo** sejajar di atas
  CTA Bayar Lunas.
- **Kasir · Restoran** — denah meja jadi layar masuk, bukan lagi terkubur di
  sheet bill. Hanya menghadang saat belum ada yang dikerjakan (`showTablePicker`:
  keranjang kosong, tidak sedang menyunting bill, belum pilih meja, bukan mode
  bungkus) supaya tidak menghalangi. Ada jalan keluar "Order Bungkus".
- **Beranda** — grafik 7 hari naik ke atas menu pintasan: yang dicari pemilik
  saat membuka aplikasi adalah "hari ini gimana", bukan pintasan menu.
- **Barang** — kartu ringkasan Total SKU / Menipis / Habis yang sekaligus jadi
  saringan cepat. Ambang "menipis" memakai angka 5, sama dengan peringatan di
  Beranda, supaya dua layar tidak pernah bertentangan.
- **Pengaturan** — dari 3 grup jadi 5: Tim · Mitra & Pelanggan · Toko ·
  Struk & Tampilan · Data & Cadangan (+ Bahasa). Riwayat, Kasbon, Stok Masuk/
  Keluar, Pengeluaran, dan Laporan Stok **dihapus** dari Pengaturan karena sudah
  jadi tab di Barang & Catatan — menaruhnya di dua tempat membuat pemilik ragu
  mana yang benar.
- **Kasbon** — `Debt.dueDate?: Date | null` (opsional; tanpa tenggat berarti
  tidak pernah dianggap telat, karena menuduh telat atas tenggat yang tak pernah
  disepakati merusak hubungan yang jadi modal warung). Diisi lewat input tanggal
  di sheet pembayaran saat mode kasbon aktif. `lib/debt-urgency.ts`
  mengelompokkan jadi Telat / Minggu ini / Aman — perbandingannya per **hari
  kalender**, bukan per jam, sehingga jatuh tempo hari ini belum dihitung telat.
  Ringkasan tiga keranjang + daftar terurut dari yang paling mendesak.
  Diuji di `src/test/debt-urgency.test.ts` (8 kasus).

---

## Ronde 5 — adopsi Shark UI (8–9 Sep 2026)

Bahasa visual diganti total dari spec Figma di atas ke **Shark UI**
(https://shark.vini.one, repo `sharkui-inc/shark-ui`). Mockup yang disetujui:
`docs/redesign-shark-mockup.html`; aturan kerja: `docs/shark-migration-guide.md`.

**Keputusan teknis.** Shark dibangun di atas Tailwind v4 + Ark UI. Yang di-port
ke sini hanya *token* dan *string kelas komponennya*, ke Tailwind v3 + Radix
yang sudah dipakai proyek — bukan migrasi framework. Alasannya: build
Capacitor/Android tidak layak diguncang untuk perubahan yang murni visual.
Sebagai konsekuensinya, MUI dilepas seluruhnya (`src/themes/*` dihapus, jokoui
tidak lagi mengimpor `@mui/*`); paket `@mui/material` dan `@emotion/*` masih
tercantum di `package.json` tapi sudah tidak dipakai.

**Token** (`src/index.css` + `tailwind.config.ts`):
- Palet netral Tailwind (`neutral-50` latar, `neutral-800` teks) menggantikan
  `#EDF1F9`/`#0D0D12`; `--card` = latar, kartu dibedakan lewat **border 1px**,
  bukan warna. Primary tetap `#3554C1`, dipasang dengan pola preset `.theme-*`
  Shark (hanya `--primary`/`--primary-foreground`/`--ring` yang dioverride).
- Status memakai palet Shark: success emerald, warning amber, destructive red,
  info blue. Ditambahkan token `--*-text` (shade 700) karena Shark memakai
  *tint 10% + border 20% + teks 700* untuk Badge/Alert, sementara `--*-foreground`
  di proyek ini sudah terlanjur berarti "teks di atas fill solid".
- `--radius` 0.5rem dengan skala kelipatan: `lg` 8px (tombol/input),
  `xl` 12px (card/item), `2xl` 16px (dialog/sheet). Tidak ada lagi pil 20–26px.
- Shadow: `xs` (kartu/input), `sm`, `lg` (popover), plus `primary`/`destructive`
  berwarna untuk tombol solid. `shadow-glow` lama dipetakan ke `shadow-primary`.
- Font **Hanken Grotesk** (font default Shark) menggantikan Sora/Inter.
  Bobot: 600 judul & nominal, 500 label/tombol/item, 400 body. `font-bold` dan
  `font-extrabold` dihapus dari seluruh `src`.

**Komponen** (`src/components/jokoui/*`) — port langsung dari
`registry/react/components/*` Shark: Button (varian+ukuran xs–xl, ring fokus
3px), Card (+`CardAction`, `CardFooter` bg-muted/50), Badge (tint), Input,
Textarea, Label, Checkbox, Switch, Tabs (`default`/`underline`/`pill`), Alert
(+`AlertAction`), Avatar, Progress, Skeleton, EmptyState, StatCard, PageHeader,
SectionTitle, SettingsGroup/Item, TransactionItem, QtyStepper, CtaBar, dan tiga
komponen baru: **`item`** (Item/ItemMedia/ItemContent/ItemTitle/ItemDescription/
ItemActions/ItemGroup), **`data-list`** (pasangan label–nilai + baris total),
**`segment-group`** (filter chip aktif `bg-input`).

`src/components/ui/*` (Radix) disesuaikan: overlay `black/30`, dialog/sheet
`rounded-2xl`, select/dropdown/popover `rounded-xl` + fokus `bg-accent`, switch
mengikuti anatomi Shark. `ui/{button,input,textarea,label,badge,skeleton}`
kini **alias** ke jokoui supaya tidak ada dua gaya yang hidup berdampingan.

**Layout.** `BottomNav` = Bottom Navigation Shark (flat, `border-t`,
`bg-background/85 backdrop-blur-sm`, item aktif `text-primary`); tombol Kasir
tetap menonjol tapi jadi kotak `rounded-xl` ber-`shadow-primary`, bukan
lingkaran ber-glow. `HubTabs` = Tabs varian `underline`. `PageHeader` polos
56px (judul kiri 18/600 + tombol ikon `outline` kanan) menggantikan pil putih
beserta lingkaran ikon biru.

**Yang sengaja menyimpang dari Shark:**
- Skala ukuran kontrol digeser satu tingkat (Button `default` = h-9, CTA utama
  `xl` = h-11; Input h-9) karena layar ini disentuh jari, bukan kursor.
- `bg-background/85` pada nav bawah (Shark: `/60`) — pada layar yang penuh
  kartu, teks yang menggulir di baliknya masih terbaca menembus blur.
- Nav bawah mempertahankan tombol Kasir yang menonjol; Shark tidak punya pola
  FAB, tapi kasir dipakai ratusan kali sehari dan tidak boleh setara ikon lain.

**Jebakan yang masih berlaku:** catatan tema runtime (`use-theme-color.ts`
menimpa `--primary`), penamaan `jokoui/select` vs `ui/select`, dan service
worker PWA menyajikan build lama — semuanya masih relevan, lihat bagian
sebelumnya.
