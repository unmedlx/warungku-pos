# Panduan migrasi halaman ke Shark UI

Mockup acuan: `frontend/docs/redesign-shark-mockup.html` (buka di browser).
Sumber: https://shark.vini.one (komponen di `github.com/sharkui-inc/shark-ui/registry/react/components`).

Fondasi SUDAH selesai — jangan diubah lagi:
- Token warna/radius/shadow/font di `src/index.css` + `tailwind.config.ts` (font Hanken Grotesk, `--radius` 0.5rem, skala radius Shark: `rounded-lg` 8px tombol/input, `rounded-xl` 12px card/item, `rounded-2xl` 16px dialog/sheet).
- Semua komponen di `src/components/jokoui/*` sudah bergaya Shark. **Pakai mereka**, jangan tulis ulang gaya card/tombol/badge/input sendiri.
- `src/components/ui/*` (Radix: dialog, sheet, select, dropdown, popover, switch, alert-dialog) sudah disesuaikan.
- `PageHeader`, `HubTabs`, `BottomNav`, `AppLayout` sudah Shark.
- Penggantian mekanis sudah dijalankan (rounded-3xl→xl, shadow-card→xs, font-bold→semibold, bg-accent text-accent-foreground→bg-primary/10 text-primary, text-success→text-success-text, dll).

## Bahasa visual Shark (yang harus tercermin di JSX halaman)

| Elemen | Lama (Figma/Sora) | Shark — pakai ini |
|---|---|---|
| Card | rx 20–24, tanpa border, `shadow-card` | `<Card>` jokoui = `rounded-xl border shadow-xs`; isi `<CardContent className="p-3">` atau `p-4` |
| Tombol | pil 52px, `rounded-full`, `font-bold` | `<Button>` jokoui: size `default` h-9, `lg` h-10, `xl` h-11 (CTA utama), `sm` h-8, `icon`/`icon-sm`/`icon-lg`. **Jangan tambah `rounded-full`, `h-[52px]`, `shadow-glow`** ke tombol. Tombol ikon di header = `variant="outline" size="icon"`. |
| Input | pil 52px | `<Input>` jokoui h-9 (jangan override `h-11/h-[52px]/rounded-full/pl-10`). Ikon search di dalam: wrapper `relative`, ikon `absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`, input `pl-8`. |
| Label form | uppercase kecil | `<Label>` jokoui (14/500) + `<p className="text-xs text-muted-foreground mt-1">` untuk hint |
| Badge status | solid hijau/merah | `<Badge variant="success|warning|destructive|info|secondary|outline" size="sm">` (tint 10% + border 20%). `shape="pill"` boleh untuk angka/persen. |
| Ikon blob | lingkaran 44px `bg-accent` biru muda | kotak 40px `rounded-xl`: `bg-primary/10 text-primary` (utama) / `bg-muted text-muted-foreground` (netral) / `bg-success/10 text-success-text` / `bg-warning/10 text-warning-text` / `bg-destructive/10 text-destructive-text` / `bg-info/10 text-info-text`. Atau pakai `<ItemMedia tone="...">`. |
| Baris list | kartu 68px pil | `<Item>`/`<ItemMedia>`/`<ItemContent>`/`<ItemTitle>`/`<ItemDescription>`/`<ItemActions>` dari `@/components/jokoui/item`; daftar per grup = `<Card className="divide-y divide-border">` berisi `<Item variant="flat">`. Atau `<TransactionItem variant="row|card">`. |
| Filter kategori/status (chip pil) | pil biru solid / outline | `<SegmentGroup items value onValueChange layout="scroll|full|inline">` dari `@/components/jokoui/segment-group` |
| Tab periode (Harian/7 hari) | pil | `<Tabs variant="pill">` jokoui (list bg-muted, tab aktif putih ber-shadow), `<TabsList className="w-full">` + `<TabsTrigger className="flex-1">` |
| Tab kelompok Barang/Catatan | pil | `<HubTabs />` (sudah underline) |
| Angka ringkasan (stat) | kartu dengan blob ikon | `<StatCard label value sub valueClassName>` (tanpa ikon) atau Card kecil: label `text-xs font-medium text-muted-foreground`, angka `text-lg font-semibold tabular-nums`. Angka utama satu layar: `text-[28px] font-semibold tracking-tight`. |
| Rincian label–nilai (laba rugi, subtotal) | baris manual | `<DataList>` + `<DataListRow label value total? valueClassName>` dari `@/components/jokoui/data-list` |
| Peringatan/status (cloud, stok menipis) | strip berwarna | `<Alert variant="warning|info|success|destructive">` + `<svg/ikon>` anak pertama + `<AlertTitle>`/`<AlertDescription>`/`<AlertAction>`; atau `<AlertStrip>` |
| Judul seksi | 16 bold / uppercase 11px | `<SectionTitle title action>` (14/600) atau `<h2 className="text-sm font-semibold">`. **Tidak ada** label uppercase-tracking. |
| Header halaman | pil putih + ikon bulat | `<PageHeader title onBack? inlineActions? >{children}</PageHeader>` (prop `icon` boleh dibiarkan, diabaikan). Aksi = `<Button variant="outline" size="icon">` atau `<Button size="default">` untuk CTA "+ Tambah". |
| Kartu produk (grid kasir) | pil + blob | Card: `rounded-xl border bg-card shadow-xs overflow-hidden`; area gambar `h-24 bg-muted` dengan badge stok `absolute top-1.5 right-1.5`; body `p-2.5`: nama `text-[13px] font-medium truncate`, harga `text-sm font-semibold tabular-nums`, stok `text-xs text-muted-foreground`. Habis = `opacity-60`. |
| Stepper qty | pil abu | `<QtyStepper>` jokoui (sudah kotak bergaris) |
| Keranjang mobile | kartu pil bg-surface-alt | floating bar `absolute/fixed` di atas bottom nav: `rounded-xl border bg-popover shadow-lg p-2.5 pl-3.5 flex items-center gap-2.5` + `<Button size="lg">Bayar</Button>` (lihat mockup frame 2) |
| Sheet keranjang/bayar | – | `SheetContent side="bottom"` (sudah rounded-t-2xl); grabber `mx-auto mb-3 h-1 w-10 rounded-full bg-input`; metode bayar = toggle-group: tombol `h-9 px-3 rounded-lg border border-input shadow-xs text-[13px] font-medium` aktif `bg-accent border-foreground` |
| Dialog konfirmasi | – | `AlertDialogContent` sudah rounded-2xl; tombol destruktif `<Button variant="destructive">` |
| Warna teks status | `text-success/warning/destructive` | untuk TEKS pakai `text-success-text` / `text-warning-text` / `text-destructive-text` / `text-info-text` (shade 700). `text-primary` untuk nominal penting boleh, tapi nominal biasa = `text-foreground font-semibold tabular-nums`. |
| Bobot font | extrabold/bold | 600 (`font-semibold`) untuk judul/nominal, 500 (`font-medium`) untuk label/tombol/item title, 400 body. **Jangan ada `font-bold`/`font-extrabold`.** |
| Ukuran mikro | `text-[9px]`, `text-[10px]` | minimum `text-[11px]`; deskripsi item `text-[13px]`; meta `text-xs` |
| Spasi | gap-3/4 antar kartu | `space-y-3`/`gap-2` antar card, `gap-2` grid stat |

## Aturan
1. Jangan ubah logika/state/i18n/handler — hanya JSX className, struktur wrapper, dan pemakaian komponen jokoui.
2. Hapus semua `rounded-full` pada tombol/input/chip/blob kotak. `rounded-full` HANYA untuk avatar orang/toko, titik indikator, badge angka di atas ikon, dan Badge `shape="pill"`.
3. Hapus `h-[52px]`, `min-h-[38px]`, `shadow-glow*`, `bg-surface-alt`, `border-tab`, `-mt-[26px]` dsb.
4. Hapus wrapper "pil" dan "blob" custom; ganti dengan komponen jokoui di atas.
5. Jangan pakai `@mui/*` (sudah dihapus dari jokoui).
6. Jangan sentuh file di luar daftar yang ditugaskan. Jangan mengubah `src/components/jokoui/*`, `src/components/ui/*`, `src/index.css`, `tailwind.config.ts`. Kalau butuh komponen baru, buat lokal di file halaman.
7. Setelah selesai: jalankan `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep <file-yang-kamu-ubah>` dan pastikan tidak ada error baru dari filemu (error pre-existing di use-auth.tsx, db.ts, onesignal.ts, Reports.tsx:161, src/test/* boleh diabaikan). Lalu `npx eslint <file>` untuk file yang kamu ubah.
8. Komentar dalam Bahasa Indonesia, tulis alasan bila perlu, jangan sebut "Shark" berulang di setiap baris.

## Contoh pola

```tsx
// Search + tombol ikon
<div className="flex gap-2">
  <div className="relative flex-1">
    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input placeholder="Cari…" className="pl-8" value={q} onChange={...} />
  </div>
  <Button variant="outline" size="icon" aria-label="Scan"><ScanBarcode /></Button>
</div>

// Stat 3 kolom
<div className="grid grid-cols-3 gap-2">
  <StatCard label={t('summary.totalSku')} value={n} />
  <StatCard label={t('summary.lowStock')} value={low} valueClassName="text-warning-text" className={cn(low > 0 && 'border-warning/30 bg-warning/5')} />
</div>

// Daftar item di dalam satu Card
<Card className="divide-y divide-border overflow-hidden">
  {rows.map(r => (
    <Item key={r.id} variant="flat" interactive onClick={...}>
      <ItemMedia tone="muted"><Receipt /></ItemMedia>
      <ItemContent>
        <ItemTitle>{r.title}</ItemTitle>
        <ItemDescription>{r.meta}</ItemDescription>
      </ItemContent>
      <span className="text-sm font-semibold tabular-nums">{rp(r.total)}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Item>
  ))}
</Card>

// Filter status
<SegmentGroup layout="full" value={status} onValueChange={setStatus}
  items={[{ value: 'all', label: t('all') }, { value: 'open', label: t('open') }]} />
```
