# Riset: Speech to Product (tambah produk lewat suara)

Status: riset kebutuhan, belum ada keputusan implementasi.
Tanggal: 2026-09-04

---

## 1. Ringkasan & rekomendasi

Fitur ini adalah **saudara kandung scan foto**, bukan fitur baru dari nol. Alur
"ekstrak → tinjau → simpan massal" sudah matang di `ScanProductsDialog` dan
modul `vision` di backend. Yang benar-benar baru hanya **cara input** dan
**cara parsing angka dari kalimat lisan**.

> **KEPUTUSAN (2026-09-10): arah A yang diambil dan sudah diimplementasikan.**
> Pengenalan suara dikerjakan di perangkat, yang dikirim ke server hanya
> transkrip teks. Jalur B (kirim audio) tetap ada di kode sebagai cadangan
> otomatis untuk perangkat tanpa layanan pengenalan suara — pemilik toko tidak
> melihat perbedaannya. Rincian di §15.
>
> Sisa dokumen ini adalah riset aslinya, dibiarkan apa adanya sebagai catatan
> pertimbangan sebelum keputusan.

Rekomendasi arsitektur (riset awal): **kirim rekaman audio langsung ke Gemini** (satu
panggilan: audio → JSON produk), bukan STT di HP lalu parsing teks. Alasannya
di §5 — intinya STT bawaan Android menghancurkan justru bagian yang paling
mahal untuk salah: angka rupiah dan nama merek.

Ruang lingkup MVP yang saya sarankan ada di §13.

---

## 2. Apa yang sudah ada (peta reuse)

Sebagian besar pekerjaan berat sudah selesai. Yang bisa dipakai ulang:

| Aset | Lokasi | Reuse |
|---|---|---|
| Kontrak hasil ekstraksi | [schema.ts](../../backend/src/modules/vision/schema.ts) — `RESPONSE_JSON_SCHEMA`, `extractionResultSchema` | ~90%, cuma `image_index` diganti |
| Parsing angka longgar | `looseNumber` di schema yang sama | 100% — `"15.000"`, `"Rp 3.500"` sudah ditangani |
| Kuota + pencatatan biaya | [service.ts](../../backend/src/modules/vision/service.ts), model `AiScanUsage` | 100%, perlu generalisasi kolom (§8) |
| Rate limit + timeout | [routes.ts](../../backend/src/modules/vision/routes.ts) | 100% |
| Provider abstraction | `providers/gemini.ts` + `providers/index.ts` | tambah satu method |
| UI tinjau hasil (`DraftRow`, checkbox, badge confidence, margin cepat, matching produk lama, `makeSku`) | [ScanProductsDialog.tsx](../src/components/products/ScanProductsDialog.tsx) | **inilah aset terbesar** — layak diekstrak jadi komponen bersama |
| Guard offline / belum login / fitur mati | dialog yang sama, baris ~400–450 | 100% |

**Konsekuensi desain:** jangan bikin `SpeechProductsDialog` yang menyalin 764
baris itu. Pecah dulu jadi `ProductDraftReview` (tahap tinjau + simpan) yang
menerima `DraftRow[]` dari sumber mana pun — foto, suara, nanti mungkin
impor Excel.

---

## 3. Masalah yang dipecahkan

Foto menang kalau **daftarnya sudah ada di kertas** (nota supplier, papan menu).
Suara menang di tiga situasi yang tidak tercakup foto:

1. **Tidak ada kertasnya.** Pemilik warung tahu harga di kepala. Sekarang
   satu-satunya jalan adalah mengetik form satu per satu di HP.
2. **Tangan kotor / sedang jalan.** Restoran waktu prep, grosir waktu bongkar
   dus. Mengetik butuh dua tangan dan perhatian penuh; bicara tidak.
3. **Koreksi cepat setelah scan.** "Yang nomor tiga harganya salah, harusnya
   dua belas ribu." Ini use case turunan yang nilainya besar dan sering
   terlewat — lihat §13 tahap 2.

Yang **tidak** dipecahkan suara: input 50 produk sekaligus. Setelah ~8–10 item,
pengguna lupa sudah menyebut apa dan hasilnya sulit ditinjau. Foto tetap jalur
untuk volume besar.

---

## 4. Bentuk ucapan yang harus ditangani

Contoh nyata dari tiga mode bisnis di [business-mode.ts](../src/lib/business-mode.ts):

**Retail (warung):**
> "Indomie goreng modal dua ribu lima ratus jual tiga ribu stok dua dus"
> "Aqua botol enam ratus mili, beli tiga rebu, jual lima rebu"

**Grosir:**
> "Gula pasir Gulaku satu kilo hpp tiga belas lima jual empat belas, kalau
> ambil dua belas ke atas empat belas ribu" ← menyentuh `priceTiers`

**Resto:**
> "Tambah menu: nasi goreng spesial dua puluh lima ribu, mie goreng dua puluh
> tiga, es teh manis lima ribu" ← tanpa HPP sama sekali, satu kalimat 3 produk

Pola yang harus diurai:
- **Angka lisan**: "dua ribu lima ratus" = 2500; "tiga belas lima" = 13500
  (idiom grosir!); "lima rebu"/"15rb"/"15k"/"1,5jt".
- **Elipsis**: "mie goreng dua puluh tiga" — satuan "ribu" dihilangkan karena
  mengikuti item sebelumnya.
- **Campur kode**: "modal"/"hpp"/"beli"/"kulakan" semua berarti HPP;
  "jual"/"harga"/"eceran" berarti `price`.
- **Batas antar produk** tanpa jeda eksplisit — ini yang paling sering salah.
- **Merek**: Indomie, Gulaku, Le Minerale, Teh Pucuk. STT generik akan menulis
  "indo mie", "gula ku", "leminerale".

---

## 5. Opsi arsitektur

### Opsi A — STT on-device → teks → LLM parsing
HP mentranskrip (plugin Capacitor), teks dikirim ke backend untuk diurai jadi JSON.

- Plugin: [`@capacitor-community/speech-recognition`](https://github.com/capacitor-community/speech-recognition),
  [`@capgo/capacitor-speech-recognition`](https://www.npmjs.com/package/@capgo/capacitor-speech-recognition)
  (fork terpelihara, punya punctuation & segmented session), atau
  [`@capawesome-team/capacitor-speech-recognition`](https://capawesome.io/plugins/speech-recognition/)
  (berbayar, punya silence detection + `contextualStrings`).
- Biaya LLM ~nol (teks pendek). Latensi paling rendah. Bisa tampilkan partial
  result sambil bicara — terasa hidup.
- **Masalah utamanya**: WER bahasa Indonesia untuk Whisper di percakapan
  informal dilaporkan sangat buruk (27% untuk berita formal, jauh lebih parah
  untuk obrolan santai); STT bawaan Android tidak lebih baik di ruang berisik.
  Dan errornya jatuh persis di angka dan nama merek. Sekali "dua ribu lima
  ratus" jadi "2 rb 15 ratus", LLM tidak punya cara memperbaikinya — informasi
  akustiknya sudah hilang.
- Bergantung Google App / layanan pengenalan suara terpasang. Di HP Android
  murah tanpa GMS lengkap, `available()` mengembalikan false.

### Opsi B — Rekam audio → kirim ke Gemini (REKOMENDASI)
Rekam WAV/AAC di HP, unggah ke `/api/vision/scan-products-audio`, Gemini
mengembalikan JSON produk langsung.

- Satu model melihat akustik **dan** konteks sekaligus: ia tahu produk warung
  Indonesia, jadi "indomi" → "Indomie" dan "tiga belas lima" → 13500 punya
  peluang benar jauh lebih tinggi.
- Persis pola yang sudah dipakai foto — provider, kuota, timeout, tinjauan
  hasil tidak berubah bentuknya.
- Biaya: ~1.500–1.920 token per menit audio; pada tarif audio input Gemini 2.5
  Flash (~$1/M token) itu **~$0,0015–0,0019 per menit** — sekitar Rp 25–30 per
  menit. Rekaman khas fitur ini 15–30 detik. Murah, tapi tidak gratis seperti
  Opsi A, jadi tetap kena kuota.
- Kekurangan: butuh koneksi (sama seperti scan foto), latensi 5–15 detik, tidak
  ada umpan balik saat bicara selain waveform.

### Opsi C — Hybrid
Opsi A untuk teks mentah (ditampilkan langsung sebagai umpan balik), audio
tetap dikirim ke Gemini, transkrip dilampirkan sebagai petunjuk.

- Kualitas terbaik dan UI paling responsif, tapi dua jalur kode, dua mode
  kegagalan, dan izin plugin sekaligus izin mikrofon. **Simpan untuk nanti.**

**Keputusan yang disarankan: B untuk MVP.** Alasan dominan: satu jalur kode
yang sudah terbukti, dan kualitas parsing angka adalah keseluruhan nilai fitur
ini. Kalau angkanya salah, pemilik toko rugi diam-diam — risiko yang sama
persis dengan yang sudah diantisipasi prompt scan foto.

---

## 6. Kebutuhan fungsional

1. **Grounding ke katalog yang ada.** Kirim daftar nama produk, satuan
   (`db.units`), dan kategori (`db.categories`) milik toko itu ke prompt.
   Dampaknya besar: "aqua enam ratus" jadi cocok dengan "Aqua Botol 600ml" yang
   sudah ada → baris jadi *update*, bukan duplikat. Dialog scan sudah punya
   mekanisme `matchedProductId`; tinggal diberi masukan yang lebih baik.
   Batasi ke ~300 nama produk teratas agar prompt tidak membengkak.
2. **Prompt terpisah dari `EXTRACTION_PROMPT`.** Ucapan berbeda sifat dari
   foto: pengguna menyatakan *niat*, bukan menyalin dokumen. Aturan HPP-vs-jual
   di prompt foto ("jangan pernah menebak harga jual") harus **dilonggarkan** —
   di suara, "jual tiga ribu" adalah pernyataan eksplisit yang sah.
3. **Confidence tetap wajib.** Maknanya bergeser: bukan "terbaca jelas" tapi
   "tidak ambigu". "Tiga belas lima" harus `medium` dengan catatan
   "13.500 atau 13,5 ribu? cek lagi".
4. **Batas durasi rekaman** 60 detik. Cukup untuk ~8 produk, menjaga biaya, dan
   memaksa pengguna bicara terstruktur.
5. **Dengar ulang.** Simpan blob audio di memori selama sesi tinjau supaya
   pengguna bisa memutar ulang kalau hasilnya aneh. Jangan disimpan ke disk —
   ikuti keputusan privasi foto (`multer.memoryStorage()`, tidak menyentuh S3).
6. **Bisa tambah baris manual** di tahap tinjau (sudah ada di dialog foto).
7. **Mode bisnis mempengaruhi default**: `resto` → HPP boleh kosong tanpa
   diberi peringatan; `wholesale` → tawarkan isi `priceTiers`.

---

## 7. Tantangan spesifik Bahasa Indonesia

| Tantangan | Mitigasi |
|---|---|
| "tiga belas lima" = 13.500 (idiom grosir) | Contoh eksplisit di prompt + paksa `confidence: medium` |
| "dua rebu"/"rong ewu" (Jawa), logat daerah | Gemini lebih tahan daripada STT generik; uji dengan rekaman asli |
| Elipsis satuan ribuan antar item | Aturan prompt: warisi skala dari item sebelumnya, tandai `note` |
| Merek lokal | Grounding katalog (§6.1) |
| Ambient noise warung (kipas, motor, TV) | Batasi rekaman ke tap-to-talk, tampilkan level meter, tolak rekaman terlalu pelan |
| Satuan lokal: renteng, sak, ikat, lusin, dus | `db.units` sudah punya daftar; kirim sebagai enum lunak |

---

## 8. Perubahan yang dibutuhkan

**Backend**
- Modul `vision` sebaiknya diganti nama jadi `extraction` — atau, agar tidak
  memecah kontrak yang sudah dipakai, tambahkan `POST /api/vision/scan-audio`
  di router yang sama. (Saya condong ke opsi kedua untuk MVP.)
- `AiScanUsage`: kolom `imageCount` terlalu spesifik. Tambah
  `kind: 'image' | 'audio'` dan `durationMs Int?`, biarkan `imageCount` untuk
  data lama. Kuota tetap satu ember bersama — pemilik toko tidak perlu tahu
  bedanya "kuota foto" dan "kuota suara".
- `multer` fileFilter: terima `audio/webm`, `audio/mp4`, `audio/aac`, `audio/wav`.
  Batas ukuran 6 MB masih cukup untuk 60 detik terkompresi.
- Method provider baru: `extractProductsFromAudio(audio, catalogHints)`.
- Kebijakan `countsAgainstQuota` yang sudah ada (nol baris = tidak potong
  kuota) berlaku sama dan penting di sini — rekaman gagal karena berisik tidak
  boleh menghukum pengguna.

**Frontend**
- Izin `RECORD_AUDIO` di [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml)
  (belum ada; sekarang hanya CAMERA, BLUETOOTH, LOCATION). Plus alur permintaan
  izin runtime dan penanganan "ditolak permanen".
- Perekaman: `MediaRecorder` WebView cukup untuk Android + Electron, tidak perlu
  plugin baru. Uji dulu codec yang didukung WebView Android target.
- Ekstrak `ProductDraftReview` dari `ScanProductsDialog` (§2).
- `vision-api.ts`: fungsi `scanProductsFromAudio`, reuse `CloudApiError`,
  `ScanTimeoutError`. Timeout klien bisa lebih ketat (~60 dtk) karena payload
  audio jauh lebih kecil dari 5 foto.
- i18n: string baru di tiga locale (`id`, `en`, `ms`).

---

## 9. Alur UX yang disarankan

```
[Produk] → tombol "Tambah lewat suara"
   ↓
Layar rekam: tahan-untuk-bicara ATAU tap mulai/stop
   • level meter + hitung mundur 60 dtk
   • contoh kalimat di layar (paling menentukan keberhasilan!)
   ↓
Memproses (bisa dibatalkan, seperti scan foto)
   ↓
Tinjau: DraftRow yang sama dengan scan foto
   • tombol putar ulang rekaman
   • baris confidence rendah diberi latar peringatan
   • margin cepat 20%/30% untuk yang HPP-nya saja terisi
   ↓
Simpan terpilih
```

Elemen paling menentukan adalah **contoh kalimat di layar rekam**. Tanpa itu
pengguna bicara seperti ke manusia ("eh, itu... indomie ya, yang goreng,
harganya berapa ya tadi") dan hasilnya buruk. Contoh yang ditampilkan langsung
membentuk cara bicara.

---

## 10. Kuota & biaya

Per rekaman 30 detik: ~800–1.000 token audio input + ~300 token output.
Kasarnya **< Rp 30 per pemakaian** pada Gemini 2.5 Flash. Jauh lebih murah dari
scan foto (foto = ~258 token per tile, 5 foto bisa ribuan token).

Implikasinya: kalau kuota disatukan dengan foto, pengguna gratis mendapat nilai
lebih banyak dari suara dengan biaya lebih rendah bagi kita. Itu bagus untuk
adopsi. Tidak perlu kuota terpisah di MVP.

---

## 11. Privasi & offline

- Audio **tidak disimpan** di server, konsisten dengan keputusan foto
  (`memoryStorage`, tidak ke S3). Alasannya sama: rekaman bisa memuat suara
  pelanggan atau obrolan lain di sekitar.
- Perlu kalimat izin yang jelas sebelum permintaan izin mikrofon Android —
  Play Store menuntut ini dan pemilik toko akan curiga tanpa penjelasan.
- Fitur mati saat offline, sama seperti scan. Ini konsisten dan sudah punya
  UI-nya (`scan.offlineTitle`).

---

## 12. Metrik & rencana uji

Sebelum menulis kode produksi, kumpulkan **20–30 rekaman asli** dari pemilik
warung/resto sungguhan (bukan rekaman sendiri di ruang sunyi) dan ukur:

- **Akurasi angka**: % baris dengan HPP dan harga jual benar. Target ≥ 90%.
  Ini metrik yang menentukan fitur ini layak rilis atau tidak.
- **Akurasi pemisahan item**: % rekaman yang jumlah produknya tepat.
- **Nama yang bisa dipakai tanpa edit**: target ≥ 80%.
- **Waktu total** dari tap rekam sampai tersimpan, dibanding mengetik manual.
  Kalau tidak minimal 2× lebih cepat, fitur ini tidak akan dipakai.

Setelah rilis: rasio baris disimpan / baris dihasilkan, dan berapa persen baris
yang diedit sebelum simpan.

---

## 13. Ruang lingkup bertahap

**Tahap 1 — MVP (fokus di sini)**
Rekam ≤ 60 dtk → Gemini → JSON → tahap tinjau yang sudah ada. Retail & resto
saja. Tanpa `priceTiers`, tanpa stok masuk. Ekstrak `ProductDraftReview` dulu.

**Tahap 2 — Koreksi lewat suara**
"Ubah yang nomor tiga jadi dua belas ribu" di tahap tinjau. Nilainya besar dan
berlaku juga untuk hasil scan foto, karena mengedit angka di HP itu menyakitkan.

**Tahap 3 — Grosir & stok**
`priceTiers` dari ucapan, dan "tambah stok indomie dua dus" yang masuk ke
`stockIns`, bukan bikin produk baru.

**Tidak disarankan**: input suara di layar kasir saat transaksi. Berisik,
berisiko salah, dan kasir sudah dioptimalkan untuk kecepatan tap.

---

## 14. Risiko utama

1. **Akurasi angka di lingkungan nyata belum terbukti.** Ini risiko yang bisa
   membatalkan fitur. Karena itu §12 harus dikerjakan sebelum implementasi.
2. **Pengguna tidak tahu harus bicara apa.** Dimitigasi contoh kalimat, tapi
   perlu diuji pada pengguna sungguhan.
3. **Fitur terasa "AI mainan"** kalau hasilnya sering perlu diedit. Ambang
   psikologisnya: kalau lebih dari ~2 dari 5 baris perlu disentuh, pengguna
   kembali mengetik manual dan tidak pernah mencoba lagi.

---

## Sumber

- [@capacitor-community/speech-recognition](https://github.com/capacitor-community/speech-recognition)
- [@capgo/capacitor-speech-recognition](https://www.npmjs.com/package/@capgo/capacitor-speech-recognition)
- [Capawesome Speech Recognition Plugin](https://capawesome.io/plugins/speech-recognition/)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Speech Recognition dengan Whisper dalam Bahasa Indonesia](https://arl.ridwaninstitute.co.id/index.php/arl/article/download/2573/1364/8264)
- [Optimisasi Whisper Speech-to-Text Bahasa Indonesia dengan Hybrid Cloud dan Multi-Engine](https://journal.stekom.ac.id/index.php/elkom/article/view/2759)
- [Cloud-based Automatic Speech Recognition Systems for Southeast Asian Languages](https://arxiv.org/pdf/2210.03580)


---

## 15. Catatan implementasi (arah A)

Yang dibangun, dan di mana:

**Backend** — endpoint `POST /api/vision/parse-transcript` menerima teks, bukan
berkas.
- `speech-schema.ts`: `TRANSCRIPT_RESPONSE_JSON_SCHEMA` + `buildTranscriptPrompt`.
  Prompt-nya berangkat dari asumsi berbeda dengan jalur audio: masukannya
  **sudah rusak** sebelum sampai, jadi tugas model bergeser dari mengurai
  menjadi merekonstruksi, dan katalog toko naik dari pembantu ejaan menjadi
  sandaran utama. Model juga diminta lebih pelit memberi `confidence: high` —
  di jalur ini "terlihat yakin padahal salah dengar" adalah mode gagal yang
  paling merugikan.
- `providers/gemini.ts`: `parseTranscript()`.
- `service.ts`: `parseProductsFromTranscript()`, dicatat sebagai `kind:
  'transcript'` di `AiScanUsage`. Kuotanya tetap satu ember dengan foto dan
  audio — lihat komentar di fungsinya untuk alasannya.

**Frontend**
- `src/lib/speech-recognition.ts`: pembungkus dua mesin (plugin Capacitor untuk
  Android, `webkitSpeechRecognition` untuk Electron/browser). Bagian yang
  bukan sekadar penerus panggilan adalah **penyambungan sesi**: kedua mesin
  berhenti sendiri saat penuturnya diam, padahal pemilik toko memang berhenti
  di antara barang. Sesi disambung otomatis dan hasilnya digabung dengan spasi.
- `src/hooks/use-speech-dictation.ts`: dibentuk semirip `useAudioRecorder`
  supaya dialognya tidak perlu ditulis dua kali.
- `SpeechProductsDialog.tsx`: memilih jalur sendiri lewat `captureMode`
  (`transcript` kalau perangkat mampu dan server siap, selain itu `audio`).
- Transkrip bisa **disunting sebelum dikirim**. Salah dengar satu kata tidak
  sepadan dengan mengulang seluruh dikte, dan perbaikannya terjadi sebelum
  kuota terpakai.
- `AndroidManifest.xml`: `<queries>` untuk `android.speech.RecognitionService`.
  Tanpa ini Android 11+ melaporkan pengenalan suara tidak tersedia walaupun
  terpasang, dan aplikasi diam-diam jatuh ke jalur cadangan di semua perangkat
  modern.

**Tes** — `src/test/speech-recognition.test.ts` (9 tes), semuanya mengunci
perilaku seputar jeda: sesi disambung, sambungannya berspasi, stop tidak ikut
menyambung, batal tidak menyisakan hasil.

**Yang belum dikerjakan**
- Pengujian akurasi angka dengan rekaman asli (§12). Ini tetap syarat sebelum
  fitur dirilis ke pengguna, dan arah A justru menaikkan taruhannya: kualitas
  transkrip perangkat adalah variabel yang tidak kita kendalikan.
- `prisma db push` untuk kolom `kind` dan `duration_ms`.
- Uji di perangkat Android sungguhan — perilaku `SpeechRecognizer` di HP murah
  adalah hal yang tidak bisa diverifikasi dari emulator maupun jsdom.

---

## 16. Refactor ke pola kasir suara (2026-09-14)

Alur rekam → kirim → tinjau diganti kartu yang muncul sambil bicara. Mockup dan
analisanya ada di [speech-to-product-live-mockup.html](speech-to-product-live-mockup.html).

- `hooks/use-live-dictation.ts`: siklus mikrofon bersama kasir dan produk.
  `useCartDictation` sekarang dibangun di atasnya, API publiknya tidak berubah.
- `hooks/use-product-dictation.ts`: mengurai ulang ucapan final dengan
  `spoken-product.ts`, lalu mengunci produk jadi kartu saat produk berikutnya
  terdengar, saat hening 2,5 detik (kalau harga jual sudah ada), atau saat
  mikrofon berhenti.
- `components/voice/VoiceRibbon.tsx`: pita "mendengarkan" yang dipakai berdua.
- `SpeechProductsDialog.tsx`: dikte lokal tanpa login/internet; AI jadi tombol
  "Rapikan" (satu panggilan `/parse-transcript` untuk seluruh ucapan, mengganti
  kartu). Jalur audio hanya untuk HP tanpa pengenal suara.
- `use-speech-dictation.ts` beserta tesnya dihapus.

Belum: uji di Android sungguhan, dan endpoint AI masih mengurai ulang dari nol
(bukan memperbaiki kartu satu per satu seperti di rencana mockup).
