import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, Mic, MicOff, Minus, Package as PackageIcon, Plus, Search, ShoppingCart, X } from '@/components/icons';
import { Button } from '@/components/jokoui/button';
import VoiceRibbon from '@/components/voice/VoiceRibbon';
import { needsCheck, type CartChip, type UseCartDictation } from '@/hooks/use-cart-dictation';
import { cn } from '@/lib/utils';
import type { VoiceCartQuotaView } from '@/lib/voice-cart-quota';
import type { CartItem } from '@/components/cashier/CartPanel';

/**
 * Halaman Keranjang Suara.
 *
 * Selama kasir bicara, yang ia perlu tahu adalah STATUS AKHIR keranjang —
 * barang apa saja dan berapa jumlahnya — bukan riwayat kejadian. Karena itu
 * layar ini menampilkan keranjang itu sendiri (bukan salinan), satu baris per
 * produk dengan qty yang sudah dijumlah, dan barang yang barusan tertangkap
 * disorot lalu naik ke atas.
 *
 * Ucapan yang gagal masuk dipisah ke "Perlu dicek" supaya tidak tercampur
 * dengan barang yang sudah pasti ada di keranjang.
 */

interface Props {
  dictation: UseCartDictation;
  /** Sisa jatah pengguna gratis; tidak ditampilkan untuk pelanggan. */
  quota?: VoiceCartQuotaView;
  cart: CartItem[];
  total: number;
  rp: (n: number) => string;
  unitPriceOf: (item: CartItem) => number;
  subtotalOf: (item: CartItem) => number;
  onUpdateQty: (productId: number, delta: number) => void;
  /** Qty diturunkan dari 1: barisnya dihapus (pemanggil menawarkan batalkan). */
  onRemove: (item: CartItem) => void;
  onClear: () => void;
  onClose: () => void;
  onPay: () => void;
  /** Ucapan tidak dikenali: tutup halaman, lanjut lewat kotak pencarian. */
  onSearchManual: () => void;
}

export default function VoiceCartPage({
  dictation,
  quota,
  cart,
  total,
  rp,
  unitPriceOf,
  subtotalOf,
  onUpdateQty,
  onRemove,
  onClear,
  onClose,
  onPay,
  onSearchManual,
}: Props) {
  const { t } = useTranslation('settings');
  const { listening, starting, liveText, chips, error, denied } = dictation;

  // Tombol kembali Android menutup halaman, bukan meninggalkan kasir.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const issues = chips.filter(needsCheck);
  const latest = chips.find((c) => c.kind === 'added');
  const highlightId = latest?.product?.id;

  // Terbaru di atas: barang yang barusan disebut paling mungkin sedang dicek.
  const rows = [...cart].reverse();
  const hi = rows.findIndex((r) => r.product.id === highlightId);
  if (hi > 0) rows.unshift(...rows.splice(hi, 1));

  const qtyTotal = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label={t('cashier.voice.page.title')}>
      <div className="mx-auto flex h-full w-full max-w-lg flex-col">
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
          {/* Header */}
          <div className="mb-3 flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onClose} aria-label={t('cashier.voice.page.back')}>
              <ArrowLeft />
            </Button>
            <h2 className="flex-1 text-base font-semibold">{t('cashier.voice.page.title')}</h2>
            {quota && !quota.unlimited && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] tabular-nums',
                  quota.remaining > 0 ? 'bg-muted text-muted-foreground' : 'bg-warning/15 text-warning-text',
                )}
              >
                {t('cashier.voice.quota.remaining', { remaining: quota.remaining, limit: quota.limit })}
              </span>
            )}
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
                {t('cashier.voice.page.clear')}
              </Button>
            )}
          </div>

          {/* Status mikrofon */}
          <div className="mb-3">
            {listening ? (
              <VoiceRibbon
                label={t('cashier.voice.listening')}
                stopLabel={t('cashier.voice.stop')}
                onStop={() => void dictation.stop()}
                liveText={liveText}
                idleHint={t('cashier.voice.idleHint')}
              />
            ) : (
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-3.5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/60" />
                <span className="flex-1 text-[12px] text-muted-foreground">
                  {error
                    ? t(denied ? 'cashier.voice.denied' : `cashier.voice.error.${error}`)
                    : t('cashier.voice.page.micOff')}
                </span>
                {!denied && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={starting} onClick={() => void dictation.start()}>
                    <Mic className="h-3 w-3" />
                    {t(error ? 'cashier.voice.retry' : 'cashier.voice.page.resume')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Ringkasan angka */}
          <div className="mb-1 grid grid-cols-3 gap-1.5">
            <Stat label={t('cashier.voice.page.kinds')} value={cart.length} />
            <Stat label={t('cashier.voice.page.qty')} value={qtyTotal} />
            <Stat label={t('cashier.voice.page.needsCheck')} value={issues.length} warn={issues.length > 0} />
          </div>

          {issues.length > 0 && (
            <>
              <SectionLabel warn label={t('cashier.voice.page.needsCheck')} count={issues.length} />
              <div className="space-y-2">
                {issues.map((chip) => (
                  <IssueCard key={chip.id} chip={chip} dictation={dictation} rp={rp} onSearchManual={onSearchManual} />
                ))}
              </div>
            </>
          )}

          <SectionLabel label={t('cashier.voice.page.inCart')} count={cart.length} />
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {rows.length === 0 ? (
              <div className="px-5 py-10 text-center text-muted-foreground">
                <ShoppingCart className="mx-auto mb-2 h-9 w-9 opacity-60" />
                <p className="text-[12.5px]">{t('cashier.voice.page.empty')}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {(t('cashier.voice.page.examples', { returnObjects: true }) as string[]).map((ex) => (
                    <span key={ex} className="rounded-lg border border-border bg-background px-2 py-1 text-[11.5px] text-foreground">
                      “{ex}”
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              rows.map((item) => {
                const isNew = item.product.id === highlightId;
                return (
                  <div
                    key={item.product.id}
                    className={cn(
                      'relative flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5 transition-colors duration-700 last:border-b-0',
                      isNew && 'bg-success/10',
                    )}
                  >
                    {isNew && latest && (
                      <span className="absolute left-10 top-1.5 z-10 rounded-md bg-success px-1.5 text-[9.5px] font-bold text-white tabular-nums">
                        +{latest.qty}
                      </span>
                    )}
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                      {item.product.photo ? (
                        <img src={item.product.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <PackageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{item.product.name}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {rp(unitPriceOf(item))} × {item.qty} = <b className="font-semibold text-foreground">{rp(subtotalOf(item))}</b>
                      </p>
                    </div>
                    <div className="inline-flex h-8 shrink-0 items-stretch overflow-hidden rounded-lg border border-input" role="group">
                      <button
                        type="button"
                        aria-label={t(item.qty === 1 ? 'cashier.qty.remove' : 'cashier.qty.decrease')}
                        className={cn('flex w-8 items-center justify-center hover:bg-muted', item.qty === 1 && 'text-destructive-text')}
                        onClick={() => (item.qty === 1 ? onRemove(item) : onUpdateQty(item.product.id!, -1))}
                      >
                        {item.qty === 1 ? <X className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                      </button>
                      <span className="grid min-w-[28px] place-items-center text-[14px] font-bold tabular-nums">{item.qty}</span>
                      <button
                        type="button"
                        aria-label={t('cashier.qty.increase')}
                        className="flex w-8 items-center justify-center hover:bg-muted"
                        onClick={() => onUpdateQty(item.product.id!, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer tetap: total, mikrofon, bayar */}
        <div className="border-t border-border bg-popover px-4 pt-2.5" style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11.5px] text-muted-foreground">{t('cashier.voice.page.totalLabel', { count: qtyTotal })}</span>
            <span className="text-lg font-bold tabular-nums">{rp(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="lg"
              variant={listening ? 'destructive' : 'outline'}
              className="w-14 shrink-0"
              onClick={dictation.toggle}
              disabled={starting || denied}
              aria-label={t(listening ? 'cashier.voice.stop' : 'cashier.voice.start')}
              aria-pressed={listening}
            >
              {listening ? <MicOff /> : <Mic />}
            </Button>
            <Button size="lg" className="flex-1" disabled={cart.length === 0} onClick={onPay}>
              {cart.length > 0 ? `${t('cashier.buttons.pay')} ${rp(total)}` : t('cashier.buttons.pay')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card px-2.5 py-2', warn && 'border-warning/50 bg-warning/10')}>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-[15px] font-bold tabular-nums', warn && 'text-warning-text')}>{value}</p>
    </div>
  );
}

function SectionLabel({ label, count, warn = false }: { label: string; count: number; warn?: boolean }) {
  return (
    <div className={cn('mx-1 mt-3.5 mb-2 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-[0.12em]', warn ? 'text-warning-text' : 'text-muted-foreground')}>
      {label}
      <span className={cn('rounded-md px-1.5 tracking-normal', warn ? 'bg-warning/15' : 'bg-muted')}>{count}</span>
    </div>
  );
}

function IssueCard({
  chip,
  dictation,
  rp,
  onSearchManual,
}: {
  chip: CartChip;
  dictation: UseCartDictation;
  rp: (n: number) => string;
  onSearchManual: () => void;
}) {
  const { t } = useTranslation('settings');
  const skip = () => dictation.dismissChip(chip.id);

  const tone =
    chip.kind === 'unclear'
      ? 'border-warning/50'
      : chip.kind === 'blocked'
        ? 'border-destructive/40'
        : 'border-border';

  const icon =
    chip.kind === 'unclear' ? (
      <AlertTriangle className="h-4 w-4 text-warning" />
    ) : chip.kind === 'blocked' ? (
      <AlertTriangle className="h-4 w-4 text-destructive" />
    ) : (
      <Search className="h-4 w-4 text-muted-foreground" />
    );

  const title =
    chip.kind === 'unclear' ? (
      <>
        {t('cashier.voice.whichOne')}
        <span className="ml-1 font-medium text-muted-foreground">{t('cashier.voice.qtyNote', { qty: chip.qty })}</span>
      </>
    ) : chip.kind === 'blocked' ? (
      t('cashier.voice.outOfStock', { name: chip.product?.name ?? '' })
    ) : (
      t('cashier.voice.notInCatalog')
    );

  const optBtn = 'rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11.5px] font-semibold';

  return (
    <div className={cn('rounded-2xl border-[1.5px] bg-card p-2.5', tone)}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold">{title}</p>
          <p className="mt-0.5 text-[10.5px] italic text-muted-foreground">“{chip.heard}”</p>
        </div>
        <button
          type="button"
          onClick={skip}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground"
          aria-label={t('cashier.voice.dismiss')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
        {chip.kind === 'unclear' &&
          (chip.candidates ?? []).map((c) => (
            <button key={c.id} type="button" onClick={() => dictation.resolveChip(chip.id, c)} className={optBtn}>
              {c.name}
              <span className="ml-1 font-medium text-muted-foreground">{rp(c.price)}</span>
            </button>
          ))}
        {chip.kind === 'notfound' && (
          <button type="button" onClick={onSearchManual} className={optBtn}>
            {t('cashier.voice.page.searchManual')}
          </button>
        )}
        <button type="button" onClick={skip} className="rounded-xl px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
          {t('cashier.voice.skip')}
        </button>
      </div>
    </div>
  );
}
