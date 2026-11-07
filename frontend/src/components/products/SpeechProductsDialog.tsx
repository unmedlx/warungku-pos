import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Pencil,
  Settings,
  Sparkles,
  X,
} from '@/components/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/jokoui/button';
import VoiceRibbon from '@/components/voice/VoiceRibbon';
import { db } from '@/lib/db';
import ProductDraftReview from './ProductDraftReview';
import {
  applyMargin,
  buildDraftRows,
  isDraftReady,
  num,
  saveDraftRows,
  type DraftAlternative,
  type DraftRow,
} from '@/lib/product-draft';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useProductDictation } from '@/hooks/use-product-dictation';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/use-auth';
// OFFLINE MODE: Cloud auth disabled
// import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { cn } from '@/lib/utils';
import {
  CloudApiError,
  ScanAbortedError,
  ScanTimeoutError,
  fetchScanStatus,
  parseProductsFromTranscript,
  scanProductsFromAudio,
  type ScanStatus,
  type SpokenProduct,
} from '@/lib/vision-api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Tambah produk lewat suara, dengan pola yang sama seperti kasir suara.
 *
 * Dulu alurnya rekam → kirim → tinjau: tidak ada satu pun umpan balik sampai
 * rekaman diproses server, dan angka yang salah dengar baru ketahuan setelah
 * kuota terpakai. Sekarang setiap produk menjadi kartu SAMBIL pemilik toko
 * bicara, diurai di perangkat, tanpa internet dan tanpa login. AI turun
 * menjadi pilihan: "Rapikan" untuk memeriksa ulang kartu yang sudah ada.
 *
 * Jalur rekam-lalu-kirim tetap hidup untuk satu kasus saja — HP yang tidak
 * punya pengenal suara sama sekali — dan hasilnya masuk ke daftar kartu yang
 * sama, jadi layar selebihnya tidak perlu tahu dari mana kartunya datang.
 */

function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Kartu yang belum boleh disimpan sebelum pemilik toko memutuskan sesuatu. */
function isPending(r: DraftRow): boolean {
  if (!isDraftReady(r)) return true;
  return r.confidence !== 'high' && (r.alternatives?.length ?? 0) > 0;
}

export default function SpeechProductsDialog({ open, onClose, onSaved }: Props) {
  const { t } = useTranslation('products');
  const { currentUser } = useAuth();
  // OFFLINE MODE: Cloud auth disabled
  // const { isLoggedIn } = useCloudAuth();
  const { mode } = useBusinessMode();

  const products = useLiveQuery(() => db.products.where('isDeleted').equals(0).toArray());
  const categories = useLiveQuery(() => db.categories.where('isDeleted').equals(0).toArray());
  const units = useLiveQuery(() => db.units.where('isDeleted').equals(0).toArray());
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  const [view, setView] = useState<'cards' | 'detail'>('cards');
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Katalog toko sebagai petunjuk ejaan.
   *
   * Dipakai pengurai lokal untuk mencocokkan "aqua enam ratus" ke produk yang
   * sudah ada, dan dikirim ke server saat dirapikan AI. Dibatasi 300 nama
   * terbaru supaya toko dengan ribuan produk tidak membengkakkan prompt.
   */
  const hints = useMemo(
    () => ({
      productNames: (products ?? []).slice(-300).map((p) => p.name),
      units: (units ?? []).map((u) => u.name),
      categories: (categories ?? []).map((c) => c.name),
      businessMode: mode,
    }),
    [products, units, categories, mode],
  );

  const ctx = { products: products ?? [], categories: categories ?? [], units: units ?? [] };

  const dictation = useProductDictation({ ...ctx, hints, sourceLabel: t('speech.fromSpeech') });
  const recorder = useAudioRecorder(status?.maxAudioSeconds ?? 60);

  /** HP tanpa pengenal suara jatuh ke rekam-lalu-kirim. */
  const fallback = dictation.available === false;
  const { rows, setRows } = dictation;
  // OFFLINE MODE: Cloud disabled
  const cloudReady = false; // online && isLoggedIn;

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Status server hanya dibutuhkan untuk AI; dikte lokal tidak menunggunya.
  useEffect(() => {
    if (!open || !cloudReady) return;
    fetchScanStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [open, cloudReady]);

  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    void dictation.cancel();
    dictation.reset();
    recorder.cancel();
    recorder.reset();
    setView('cards');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Kegagalan mikrofon wajib punya keterangan. Mikrofon yang padam lalu
   * layarnya kembali seperti semula terbaca sebagai "fiturnya rusak".
   * `denied` dan `unsupported` punya layarnya sendiri.
   */
  useEffect(() => {
    const code = dictation.error;
    if (!code || code === 'denied' || code === 'unsupported') return;
    setError({
      code: 'MIC',
      message: t(
        code === 'network'
          ? 'speech.micNetwork'
          : code === 'no-speech'
            ? 'speech.micNoSpeech'
            : 'speech.micUnknown',
      ),
    });
  }, [dictation.error, t]);

  const fromServer = (spoken: SpokenProduct[], label: string): DraftRow[] =>
    buildDraftRows(
      spoken.map((p) => ({
        name: p.name,
        hpp: p.hpp,
        price: p.price,
        unit: p.unit,
        qty: p.qty,
        categoryHint: p.categoryHint,
        confidence: p.confidence,
        note: p.note,
        sourceLabel: label,
        alternatives: p.alternatives.map((a) => ({
          field: a.field === 'qty' ? ('stock' as const) : a.field,
          value: a.value,
          label: a.label,
        })),
      })),
      ctx,
    ).map((r, i) => ({ ...r, key: `ai-${Date.now()}-${i}` }));

  /** Satu pintu untuk semua panggilan server: batal, galat, kuota. */
  const callServer = async (run: (opts: { signal: AbortSignal; storeId?: string }) => Promise<void>) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    try {
      await run({ signal: ctrl.signal, storeId: storeSettings?.cloudStoreId ?? undefined });
    } catch (err) {
      if (err instanceof ScanAbortedError) return;
      if (err instanceof ScanTimeoutError) {
        setError({ code: 'TIMEOUT', message: t('speech.timeoutError') });
        return;
      }
      const code = err instanceof CloudApiError ? String(err.body?.code ?? '') : '';
      setError({ code, message: err instanceof Error ? err.message : t('speech.genericError') });
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  /**
   * Rapikan dengan AI: kartu lokal diganti hasil server.
   *
   * Seluruh ucapan dikirim sekali, bukan per kartu — kuotanya dihitung per
   * panggilan, dan AI justru lebih baik memisahkan produk kalau mendengar
   * kalimat utuhnya.
   */
  const refine = () =>
    callServer(async (opts) => {
      const res = await parseProductsFromTranscript(dictation.transcript, hints, opts);
      setStatus((prev) => (prev ? { ...prev, quota: res.quota } : prev));
      if (res.products.length === 0) {
        setError({ code: 'UNHEARD', message: res.unreadableReason ?? t('speech.unheardDefault') });
        return;
      }
      setRows(fromServer(res.products, t('speech.live.aiTag')));
      trackEvent('scan_products_speech_text');
    });

  const sendRecording = () => {
    const rec = recorder.recording;
    if (!rec) return;
    return callServer(async (opts) => {
      const res = await scanProductsFromAudio(rec, hints, opts);
      setStatus((prev) => (prev ? { ...prev, quota: res.quota } : prev));
      recorder.reset();
      if (res.products.length === 0) {
        setError({ code: 'UNHEARD', message: res.unreadableReason ?? t('speech.unheardDefault') });
        return;
      }
      setRows([...rows, ...fromServer(res.products, t('speech.fromRecording'))]);
      trackEvent('scan_products_speech_audio');
    });
  };

  const patchRow = (key: string, patch: Partial<DraftRow>) =>
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const takeAlternative = (row: DraftRow, alt: DraftAlternative) =>
    patchRow(row.key, { [alt.field]: String(alt.value), alternatives: [], confidence: 'high' } as Partial<DraftRow>);

  const saveable = rows.filter((r) => r.selected && !isPending(r));
  const pending = rows.filter((r) => r.selected && isPending(r));

  const handleSave = async () => {
    if (saveable.length === 0) return;
    setSaving(true);
    try {
      const { added, updated } = await saveDraftRows(saveable, currentUser?.id);
      toast.success(t('draft.saveSuccess', { added, updated }));
      trackEvent('scan_products_speech_saved');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t('draft.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const quota = status?.quota;
  const canRefine =
    cloudReady &&
    !!status?.enabled &&
    status.transcriptEnabled &&
    (quota?.remaining ?? 0) > 0 &&
    dictation.transcript.length > 0 &&
    !dictation.listening;
  const canFallback = cloudReady && !!status?.enabled && status.speechEnabled;
  const examples = t(`speech.examples.${mode}`, { returnObjects: true }) as string[];
  const hasCards = rows.length > 0 || dictation.building.length > 0;
  const recording = recorder.state === 'recording';

  const micButton = fallback ? null : (
    <Button
      variant="outline"
      onClick={() => (dictation.listening ? void dictation.stop() : void dictation.start())}
      disabled={dictation.starting || dictation.stopping || busy}
      className={cn(
        'h-10 w-10 shrink-0 rounded-full p-0',
        dictation.listening && 'border-destructive bg-destructive text-white hover:bg-destructive/90',
      )}
      aria-label={dictation.listening ? t('speech.live.done') : t('speech.live.continue')}
    >
      {dictation.starting || dictation.stopping ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : dictation.listening ? (
        <span className="h-3 w-3 rounded-sm bg-white" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            <span className="flex-1">{t('speech.title')}</span>
            {rows.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mr-6 h-8 gap-1.5 rounded-full text-xs"
                onClick={() => setView(view === 'cards' ? 'detail' : 'cards')}
                disabled={dictation.listening}
              >
                {view === 'cards' ? <Pencil className="h-3.5 w-3.5" /> : null}
                {view === 'cards' ? t('speech.live.detail') : t('speech.live.back')}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {dictation.denied || recorder.state === 'denied' ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-warning/15 grid place-items-center mx-auto">
                <MicOff className="w-7 h-7 text-warning-text" />
              </div>
              <p className="font-semibold">{t('speech.deniedTitle')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {t('speech.deniedDesc')}
              </p>
              <div className="rounded-xl bg-muted/50 p-3 text-left max-w-sm mx-auto">
                <p className="text-xs font-medium text-muted-foreground">{t('speech.deniedHowTitle')}</p>
                <ul className="text-2xs text-muted-foreground leading-relaxed list-disc ml-4 mt-1.5 space-y-0.5">
                  <li>{t('speech.deniedStep1')}</li>
                  <li>{t('speech.deniedStep2')}</li>
                </ul>
              </div>
              <Button
                variant="outline"
                className="gap-1.5 mt-1"
                onClick={() => (fallback ? void recorder.start() : void dictation.start())}
              >
                <Settings className="w-4 h-4" />
                {t('speech.deniedRetry')}
              </Button>
            </div>
          ) : view === 'detail' ? (
            <ProductDraftReview rows={rows} onChange={setRows} categories={categories ?? []} units={units ?? []} />
          ) : busy ? (
            <div className="py-14 text-center space-y-3">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="font-semibold">
                {recorder.recording ? t('speech.processingTitle') : t('speech.live.aiWorking')}
              </p>
              <p className="text-sm text-muted-foreground">{t('speech.processingDesc')}</p>
              <Button variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
                {t('speech.cancel')}
              </Button>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className={cn(
                    'rounded-xl border p-3 flex items-start gap-2.5 text-sm',
                    error.code === 'VISION_QUOTA_EXCEEDED'
                      ? 'border-warning/40 bg-warning/10'
                      : 'border-destructive/40 bg-destructive/10',
                  )}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">{error.message}</p>
                    {error.code === 'MIC' && (
                      <p className="text-xs text-muted-foreground">{t('speech.micErrorHelp')}</p>
                    )}
                    {error.code === 'UNHEARD' && (
                      <p className="text-xs text-muted-foreground">{t('speech.unheardHelp')}</p>
                    )}
                    {error.code === 'VISION_QUOTA_EXCEEDED' && (
                      <p className="text-xs text-muted-foreground">{t('scan.quotaHelp')}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => setError(null)} aria-label={t('speech.cancel')}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* ---------- Jalur cadangan: HP tanpa pengenal suara ---------- */}
              {fallback && (
                <>
                  <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs leading-relaxed">
                    {canFallback ? t('speech.live.fallbackNote') : t('speech.live.fallbackOffline')}
                  </div>
                  {canFallback && (
                    <div className="rounded-xl bg-muted/30 p-5 text-center">
                      <button
                        type="button"
                        onClick={() => (recording ? recorder.stop() : void recorder.start())}
                        disabled={recorder.state === 'requesting'}
                        className={cn(
                          'w-20 h-20 grid place-items-center mx-auto text-white disabled:opacity-40',
                          recording ? 'rounded-xl bg-destructive' : 'rounded-full bg-primary',
                        )}
                        aria-label={recording ? t('speech.stopButton') : t('speech.startButton')}
                      >
                        {recording ? <span className="w-6 h-6 rounded bg-white" /> : <Mic className="w-8 h-8" />}
                      </button>
                      <p className="text-sm font-semibold tabular-nums mt-3">
                        {recording
                          ? `${clock(recorder.elapsedSec)} / ${clock(status?.maxAudioSeconds ?? 60)}`
                          : recorder.recording
                            ? t('speech.readyToSend', { duration: clock(recorder.recording.durationSec) })
                            : t('speech.startHint')}
                      </p>
                      {recorder.recording && !recording && (
                        <div className="mt-3 flex justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={recorder.reset}>
                            {t('speech.recordAgain')}
                          </Button>
                          <Button size="sm" onClick={() => void sendRecording()}>
                            {t('speech.live.sendRecording')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ---------- Pengantar ---------- */}
              {!fallback && !hasCards && !dictation.listening && (
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => void dictation.start()}
                    disabled={dictation.available == null || dictation.starting}
                    className="w-24 h-24 rounded-full bg-primary text-white grid place-items-center mx-auto shadow-lg shadow-primary/30 disabled:opacity-40"
                    aria-label={t('speech.live.introStart')}
                  >
                    {dictation.starting ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-10 h-10" />}
                  </button>
                  <p className="font-semibold mt-4">{t('speech.live.introTitle')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('speech.live.introDesc')}</p>
                </div>
              )}

              {dictation.listening && (
                <VoiceRibbon
                  label={t('speech.live.listening')}
                  stopLabel={t('speech.live.done')}
                  onStop={() => void dictation.stop()}
                  stopping={dictation.stopping}
                  liveText={dictation.liveText}
                  idleHint={t('speech.live.idleHint')}
                />
              )}

              {dictation.building.map((row) => (
                <BuildingCard key={row.key} row={row} />
              ))}

              {pending.length > 0 && (
                <SectionHead label={t('speech.live.needsDecision')} count={pending.length} />
              )}
              {pending.map((row) => (
                <DraftCard
                  key={row.key}
                  row={row}
                  onRemove={() => setRows(rows.filter((r) => r.key !== row.key))}
                  onAlternative={(alt) => takeAlternative(row, alt)}
                  onKeep={() => patchRow(row.key, { alternatives: [], confidence: 'high' })}
                  onMargin={(pct) => setRows(rows.map((r) => (r.key === row.key ? applyMargin([r], pct)[0] : r)))}
                  onEdit={() => setView('detail')}
                />
              ))}

              {saveable.length > 0 && <SectionHead label={t('speech.live.ready')} count={saveable.length} />}
              {saveable.map((row) => (
                <DraftCard key={row.key} row={row} onRemove={() => setRows(rows.filter((r) => r.key !== row.key))} />
              ))}

              {/* Contoh kalimat: bagian yang paling menentukan hasil. */}
              {!fallback && rows.length === 0 && (
                <div className="rounded-xl bg-accent/60 p-3 space-y-2">
                  <p className="text-xs font-semibold text-primary">{t('speech.examplesTitle')}</p>
                  {(Array.isArray(examples) ? examples : []).map((ex) => (
                    <p
                      key={ex}
                      className="rounded-xl bg-background/80 border border-primary/15 px-3 py-2 text-xsm leading-relaxed"
                    >
                      “{ex}”
                    </p>
                  ))}
                </div>
              )}

              {canRefine && rows.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-accent/50 p-3 flex items-start gap-2.5 text-xs leading-relaxed">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>{t('speech.live.aiHint', { remaining: quota?.remaining ?? 0 })}</span>
                </div>
              )}
            </>
          )}
        </div>

        {!dictation.denied && !busy && (
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            {view === 'cards' && micButton}
            {view === 'cards' && canRefine && rows.length > 0 && (
              <Button variant="outline" className="gap-1.5" onClick={() => void refine()}>
                <Sparkles className="h-4 w-4" />
                {t('speech.live.aiButton')}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saveable.length === 0 || saving || dictation.listening}
              className="ml-auto gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {pending.length > 0
                ? t('speech.live.savePending', { count: saveable.length, pending: pending.length })
                : t('speech.live.saveButton', { count: saveable.length })}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SectionHead({ label, count }: { label: string; count: number }) {
  return (
    <p className="flex justify-between px-0.5 pt-1 text-3xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
      <span>{label}</span>
      <span>{count}</span>
    </p>
  );
}

const money = (v: string) => (num(v) > 0 ? num(v).toLocaleString('id-ID') : '—');

/** Produk yang sedang disebut: kolomnya terisi satu per satu selagi bicara. */
function BuildingCard({ row }: { row: DraftRow }) {
  const { t } = useTranslation('products');
  const fields = [
    ['hpp', row.hpp],
    ['price', row.price],
    ['stock', row.stock],
  ] as const;

  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-primary/40 bg-card p-3">
      <p className="flex items-center gap-1.5 text-3xs font-bold uppercase tracking-[0.12em] text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        {t('speech.live.building')}
      </p>
      <p className="mt-1.5 text-sm font-semibold">{row.name}</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {fields.map(([key, value]) => (
          <div
            key={key}
            className={cn(
              'rounded-xl border px-2 py-1.5',
              value ? 'border-primary/30 bg-accent/60' : 'border-border bg-muted/30',
            )}
          >
            <p className="text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t(`speech.live.${key}`)}
            </p>
            <p className={cn('text-xsm font-bold', !value && 'font-medium text-muted-foreground/60')}>
              {key === 'stock' ? value || '—' : money(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DraftCardProps {
  row: DraftRow;
  onRemove: () => void;
  onAlternative?: (alt: DraftAlternative) => void;
  onKeep?: () => void;
  onMargin?: (percent: number) => void;
  onEdit?: () => void;
}

/**
 * Satu produk yang sudah terkunci.
 *
 * Kartu yang siap cukup satu baris ringkasan. Kartu yang menunggu keputusan
 * menawarkan jawabannya sebagai satu ketukan — pola chip "yang mana?" di kasir —
 * karena mengetik angka di HP sambil memegang kardus adalah persis hal yang
 * ingin dihindari fitur ini.
 */
function DraftCard({ row, onRemove, onAlternative, onKeep, onMargin, onEdit }: DraftCardProps) {
  const { t } = useTranslation('products');
  const pending = isPending(row);
  const noPrice = num(row.price) <= 0;
  const hpp = num(row.hpp);
  const alternatives = row.alternatives ?? [];

  return (
    <div
      className={cn(
        'rounded-2xl border px-3 py-2.5',
        pending ? 'border-warning/50 bg-warning/10' : 'border-success/40 bg-card',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'grid h-6 w-6 shrink-0 place-items-center rounded-lg',
            pending ? 'bg-background' : 'bg-success/10',
          )}
        >
          {pending ? (
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          ) : (
            <Check className="h-3.5 w-3.5 text-success" />
          )}
        </span>
        <p className="min-w-0 flex-1 truncate text-xsm font-semibold">{row.name}</p>
        {row.matchedProductId && (
          <span className="rounded bg-accent px-1.5 py-px text-3xs font-bold uppercase text-primary">
            {t('speech.live.update')}
          </span>
        )}
        {row.key.startsWith('ai-') && (
          <span className="rounded bg-primary/10 px-1.5 py-px text-3xs font-bold uppercase text-primary">AI</span>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground"
          aria-label={t('speech.live.remove')}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="ml-8 mt-1 flex flex-wrap gap-x-3 text-2xs text-muted-foreground">
        <span>
          {t('speech.live.price')} <b className="font-semibold text-foreground">{money(row.price)}</b>
        </span>
        <span>
          {t('speech.live.hpp')} <b className="font-semibold text-foreground">{money(row.hpp)}</b>
        </span>
        {row.stock && (
          <span>
            {t('speech.live.stock')} <b className="font-semibold text-foreground">+{row.stock}</b>
          </span>
        )}
      </div>

      {pending && (
        <div className="ml-8 mt-2 space-y-1.5">
          <p className="text-2xs font-semibold">
            {noPrice ? t('speech.live.askPrice') : t('speech.live.askNumber')}
            {row.note && <span className="ml-1 font-normal italic text-muted-foreground">{row.note}</span>}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {noPrice && hpp > 0 &&
              [20, 30].map((pct) => (
                <Chip key={pct} onClick={() => onMargin?.(pct)}>
                  +{pct}% · {(Math.round((hpp * (1 + pct / 100)) / 100) * 100).toLocaleString('id-ID')}
                </Chip>
              ))}
            {!noPrice && (
              <Chip onClick={onKeep} primary>
                {t('speech.live.keep')}
              </Chip>
            )}
            {!noPrice &&
              alternatives.map((alt) => (
                <Chip key={`${alt.field}-${alt.value}`} onClick={() => onAlternative?.(alt)}>
                  {t(`speech.live.${alt.field}`)} {alt.value.toLocaleString('id-ID')}
                </Chip>
              ))}
            <Chip onClick={onEdit} dim>
              {t('speech.live.fillManual')}
            </Chip>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  onClick,
  primary,
  dim,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  dim?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-2.5 py-1.5 text-2xs font-semibold',
        primary ? 'border-primary text-primary bg-background' : 'border-border bg-background',
        dim && 'border-transparent bg-transparent font-medium text-muted-foreground',
      )}
    >
      {children}
    </button>
  );
}
