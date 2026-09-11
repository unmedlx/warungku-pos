import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Search, X } from '@/components/icons';
import { Button } from '@/components/jokoui/button';
import { cn } from '@/lib/utils';
import type { CartChip, UseCartDictation } from '@/hooks/use-cart-dictation';

/**
 * Pita "sedang mendengarkan" beserta chip hasilnya.
 *
 * Dua tugasnya sama pentingnya. Pertama, membuat status mikrofon **tidak
 * mungkin salah dibaca** — kasir tidak boleh ragu apakah HP-nya sedang
 * mendengar, dan itu sebabnya pitanya gelap dan mencolok alih-alih ikon kecil
 * di pojok. Kedua, menyediakan jalan koreksi: chip di sini menggantikan layar
 * tinjau, karena membatalkan satu barang harus lebih murah daripada
 * menyetujui setiap barang.
 */

interface Props {
  dictation: UseCartDictation;
  /** Batalkan satu barang yang sudah telanjur masuk keranjang. */
  onUndo: (chip: CartChip) => void;
}

export default function VoiceCartBar({ dictation, onUndo }: Props) {
  const { t } = useTranslation('settings');
  const { listening, liveText, chips } = dictation;

  if (!listening && chips.length === 0) return null;

  return (
    <div className="mb-3 space-y-2">
      {listening && (
        <div className="rounded-2xl bg-foreground text-background px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">
              {t('cashier.voice.listening')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void dictation.stop()}
              className="ml-auto h-7 rounded-xl bg-background/15 px-3 text-[11px] font-semibold text-background hover:bg-background/25"
            >
              {t('cashier.voice.stop')}
            </Button>
          </div>
          {/* Hanya ucapan yang SEDANG berjalan. Begitu satu barang terkunci,
              baris ini bersih lagi supaya kasir fokus ke barang berikutnya —
              bukan membaca ulang seluruh transaksi. */}
          <p className="mt-2 min-h-[20px] text-[13px] leading-relaxed line-clamp-2">
            {liveText.trim().length > 0 ? (
              liveText
            ) : (
              <span className="italic opacity-50">{t('cashier.voice.idleHint')}</span>
            )}
          </p>
        </div>
      )}

      {chips.map((chip) => (
        <ChipRow key={chip.id} chip={chip} dictation={dictation} onUndo={onUndo} />
      ))}
    </div>
  );
}

function ChipRow({
  chip,
  dictation,
  onUndo,
}: {
  chip: CartChip;
  dictation: UseCartDictation;
  onUndo: (chip: CartChip) => void;
}) {
  const { t } = useTranslation('settings');

  if (chip.kind === 'unclear') {
    return (
      <div className="rounded-2xl border border-warning/50 bg-warning/10 p-2.5 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold">
              {t('cashier.voice.whichOne')}
              <span className="ml-1 font-medium text-muted-foreground">
                {t('cashier.voice.qtyNote', { qty: chip.qty })}
              </span>
            </p>
            <p className="mt-0.5 text-[10.5px] italic text-muted-foreground">“{chip.heard}”</p>
          </div>
          <button
            type="button"
            onClick={() => dictation.dismissChip(chip.id)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground"
            aria-label={t('cashier.voice.dismiss')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(chip.candidates ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => dictation.resolveChip(chip.id, c)}
              className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11.5px] font-semibold"
            >
              {c.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => dictation.dismissChip(chip.id)}
            className="rounded-xl px-2.5 py-1.5 text-[11.5px] text-muted-foreground"
          >
            {t('cashier.voice.skip')}
          </button>
        </div>
      </div>
    );
  }

  // "Tidak ketemu" bukan kesalahan kasir dan bukan kerusakan — teksnya sudah
  // pindah ke pencarian. Warna merah di situ membunyikan alarm yang tidak perlu.
  const tone =
    chip.kind === 'added'
      ? 'border-success/40 bg-success/10'
      : chip.kind === 'notfound'
        ? 'border-border bg-muted/40'
        : 'border-destructive/40 bg-destructive/10';

  /**
   * Chip kabar sengaja setipis mungkin: satu baris, tanpa kartu.
   *
   * Ia cuma perlu dilirik — hasilnya sudah terlihat di keranjang. Bentuk kartu
   * tebal membuat beberapa kabar berurutan mendorong grid produk keluar layar,
   * padahal grid itulah cara utama kasir bekerja.
   */
  return (
    <div className={cn('flex items-center gap-2 rounded-xl border px-2.5 py-1.5', tone)}>
      {chip.kind === 'added' ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
      ) : chip.kind === 'notfound' ? (
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
      )}

      <p className="min-w-0 flex-1 truncate text-[12px] font-medium">
        {chip.kind === 'added' && chip.product?.name}
        {chip.kind === 'blocked' && t('cashier.voice.outOfStock', { name: chip.product?.name ?? '' })}
        {/* Yang gagal perlu menyebut apa yang terdengar; yang berhasil tidak —
            di situ kutipan hanya menambah teks tanpa menambah keterangan. */}
        {chip.kind === 'notfound' && (
          <>
            {t('cashier.voice.notInCatalog')}
            <span className="ml-1 font-normal italic text-muted-foreground">“{chip.heard}”</span>
          </>
        )}
      </p>

      {chip.kind === 'added' && <span className="shrink-0 text-[12px] font-bold">×{chip.qty}</span>}

      <button
        type="button"
        onClick={() => (chip.kind === 'added' ? onUndo(chip) : dictation.dismissChip(chip.id))}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground"
        aria-label={t(chip.kind === 'added' ? 'cashier.voice.undo' : 'cashier.voice.dismiss')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
