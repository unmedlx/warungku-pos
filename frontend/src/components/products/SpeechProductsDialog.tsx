import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  CloudAlert,
  Loader2,
  LogIn,
  Mic,
  MicOff,
  Replay,
  Settings,
} from '@/components/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/jokoui/button';
import { db } from '@/lib/db';
import ProductDraftReview from './ProductDraftReview';
import { buildDraftRows, isDraftReady, saveDraftRows, type DraftRow } from '@/lib/product-draft';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useSpeechDictation } from '@/hooks/use-speech-dictation';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/use-auth';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { cn } from '@/lib/utils';
import {
  CloudApiError,
  ScanAbortedError,
  ScanTimeoutError,
  fetchScanStatus,
  parseProductsFromTranscript,
  scanProductsFromAudio,
  type ScanQuota,
  type SpokenProduct,
} from '@/lib/vision-api';

type Stage = 'record' | 'processing' | 'review';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

/** Detik ditampilkan sebagai 0:07 supaya penanda baris terbaca seperti pemutar musik. */
function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function SpeechProductsDialog({ open, onClose, onSaved }: Props) {
  const { t } = useTranslation('products');
  const { currentUser } = useAuth();
  const { isLoggedIn, restoringSession } = useCloudAuth();
  const { mode } = useBusinessMode();
  const navigate = useNavigate();

  const products = useLiveQuery(() => db.products.where('isDeleted').equals(0).toArray());
  const categories = useLiveQuery(() => db.categories.where('isDeleted').equals(0).toArray());
  const units = useLiveQuery(() => db.units.where('isDeleted').equals(0).toArray());
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  const [stage, setStage] = useState<Stage>('record');
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [status, setStatus] = useState<{
    enabled: boolean;
    speechEnabled: boolean;
    transcriptEnabled: boolean;
    maxAudioSeconds: number;
    quota: ScanQuota;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [saving, setSaving] = useState(false);

  const maxSeconds = status?.maxAudioSeconds ?? 60;
  const recorder = useAudioRecorder(maxSeconds);
  const dictation = useSpeechDictation(maxSeconds);

  /**
   * Dua cara menangkap ucapan, dipilih otomatis.
   *
   * `transcript` adalah jalur utama: pengenalan suara dikerjakan perangkat,
   * yang dikirim cuma teks. Lebih cepat, jauh lebih murah, dan pemilik toko
   * melihat hasil dengarnya selagi bicara.
   *
   * `audio` adalah cadangannya untuk perangkat tanpa layanan pengenalan suara
   * — HP Android murah tanpa Google App lengkap bukan kasus langka di pasar
   * fitur ini. Cadangannya bukan pesan galat, tapi jalur yang benar-benar
   * bekerja, jadi pemilik toko tidak pernah tahu bedanya.
   */
  const captureMode: 'transcript' | 'audio' | null = useMemo(() => {
    if (!status) return null;
    if (status.transcriptEnabled && dictation.available) return 'transcript';
    if (status.speechEnabled) return 'audio';
    return null;
  }, [status, dictation.available]);

  const byText = captureMode === 'transcript';
  const scanAbortRef = useRef<AbortController | null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  // Pemutaran per baris berhenti sendiri di ujung potongannya; tanpa ini satu
  // ketukan memutar sisa rekaman dan pemilik toko harus menghentikannya manual.
  const stopAtRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!open || !online || !isLoggedIn) return;
    setStatusLoading(true);
    fetchScanStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setStatusLoading(false));
  }, [open, online, isLoggedIn]);

  useEffect(() => {
    if (open) return;
    scanAbortRef.current?.abort();
    recorder.cancel();
    recorder.reset();
    void dictation.cancel();
    dictation.reset();
    setStage('record');
    setRows([]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Katalog dikirim bersama rekaman.
   *
   * Inilah yang membuat "aqua enam ratus" ketemu "Aqua Botol 600ml" alih-alih
   * jadi produk kembar. Dibatasi 300 nama supaya prompt tidak membengkak di
   * toko dengan ribuan produk — nama terbaru yang paling mungkin disebut.
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

  const toRows = (spoken: SpokenProduct[]): DraftRow[] =>
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
        sourceLabel:
          !byText && p.startSec != null
            ? `🎙️ ${clock(p.startSec)}${p.endSec != null ? `–${clock(p.endSec)}` : ''}`
            : byText
              ? t('speech.fromSpeech')
              : t('speech.fromRecording'),
        startSec: p.startSec,
        endSec: p.endSec,
        // `qty` di sisi server adalah `stock` di baris draft — nama kolomnya
        // berbeda karena yang diucapkan adalah jumlah beli, bukan stok akhir.
        alternatives: p.alternatives.map((a) => ({
          field: a.field === 'qty' ? ('stock' as const) : a.field,
          value: a.value,
          label: a.label,
        })),
      })),
      { products: products ?? [], categories: categories ?? [], units: units ?? [] },
    );

  const runScan = async () => {
    const rec = recorder.recording;
    const spoken = dictation.transcript.trim();
    if (byText ? spoken.length === 0 : !rec) return;

    const ctrl = new AbortController();
    scanAbortRef.current = ctrl;
    setStage('processing');
    setError(null);
    try {
      const opts = {
        signal: ctrl.signal,
        storeId: storeSettings?.cloudStoreId ?? undefined,
      };
      const res = byText
        ? await parseProductsFromTranscript(spoken, hints, opts)
        : await scanProductsFromAudio(rec!, hints, opts);
      setStatus((prev) => (prev ? { ...prev, quota: res.quota } : prev));

      if (res.products.length === 0) {
        setError({
          code: 'UNHEARD',
          message: res.unreadableReason ?? t('speech.unheardDefault'),
        });
        setStage('record');
        return;
      }

      setRows(toRows(res.products));
      setStage('review');
      trackEvent(byText ? 'scan_products_speech_text' : 'scan_products_speech_audio');
    } catch (err) {
      if (err instanceof ScanAbortedError) {
        setStage('record');
        return;
      }
      if (err instanceof ScanTimeoutError) {
        setError({ code: 'TIMEOUT', message: t('speech.timeoutError') });
        setStage('record');
        return;
      }
      const code = err instanceof CloudApiError ? String(err.body?.code ?? '') : '';
      const message = err instanceof Error ? err.message : t('speech.genericError');
      setError({ code, message });
      setStage('record');
    } finally {
      scanAbortRef.current = null;
    }
  };

  const playSegment = (row: DraftRow) => {
    const audio = playerRef.current;
    if (!audio || row.startSec == null) return;
    stopAtRef.current = row.endSec ?? null;
    audio.currentTime = row.startSec;
    void audio.play().catch(() => {});
  };

  const selectedRows = rows.filter((r) => r.selected);
  const readyRows = selectedRows.filter(isDraftReady);

  const handleSave = async () => {
    if (readyRows.length === 0) return;
    setSaving(true);
    try {
      const { added, updated } = await saveDraftRows(rows, currentUser?.id);
      toast.success(t('draft.saveSuccess', { added, updated }));
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
  const noQuota = quota != null && quota.remaining <= 0;
  // Kemampuan baru diketahui setelah server menjawab DAN perangkat selesai
  // diperiksa. Menyimpulkan lebih awal akan memunculkan layar "fitur mati"
  // sekejap pada perangkat yang sebenarnya mampu.
  const capabilitiesKnown = status != null && dictation.available !== null;
  const featureOff = capabilitiesKnown && (!status!.enabled || captureMode === null);
  const recording = recorder.recording;

  /**
   * Dua mesin penangkap dipetakan ke satu himpunan keadaan supaya layar di
   * bawah tidak perlu ditulis dua kali.
   */
  const isRecording = byText ? dictation.state === 'listening' : recorder.state === 'recording';
  const isPreparing = byText ? dictation.state === 'starting' : recorder.state === 'requesting';
  const micDenied = byText ? dictation.state === 'denied' : recorder.state === 'denied';
  const micUnsupported = byText
    ? dictation.state === 'unsupported'
    : recorder.state === 'unsupported';
  const elapsedSec = byText ? dictation.elapsedSec : recorder.elapsedSec;
  const spokenText = dictation.transcript.trim();
  /** Ada bahan yang siap dikirim ke server. */
  const hasCapture = byText ? dictation.state === 'done' && spokenText.length > 0 : recording != null;

  const beginCapture = () => (byText ? void dictation.start() : void recorder.start());
  const endCapture = () => (byText ? void dictation.stop() : recorder.stop());
  const resetCapture = () => {
    if (byText) dictation.reset();
    else recorder.reset();
  };

  /** Contoh kalimat berbeda per jenis usaha — lihat `speech.examples` di i18n. */
  const examples = t(`speech.examples.${mode}`, { returnObjects: true }) as string[];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            {stage === 'review' ? t('draft.reviewTitle', { count: rows.length }) : t('speech.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {!online ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-muted grid place-items-center mx-auto">
                <CloudAlert className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-semibold">{t('speech.offlineTitle')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {t('speech.offlineDesc')}
              </p>
            </div>
          ) : restoringSession ? (
            <div className="py-14 grid place-items-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !isLoggedIn ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-accent grid place-items-center mx-auto">
                <LogIn className="w-7 h-7 text-primary" />
              </div>
              <p className="font-semibold">{t('speech.loginTitle')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {t('speech.loginDesc')}
              </p>
              <Button
                className="gap-1.5 mt-1"
                onClick={() => {
                  onClose();
                  navigate('/settings/cloud-backup');
                }}
              >
                <LogIn className="w-4 h-4" />
                {t('speech.loginButton')}
              </Button>
            </div>
          ) : featureOff ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-muted grid place-items-center mx-auto">
                <MicOff className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-semibold">{t('speech.disabledTitle')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {t('speech.disabledDesc')}
              </p>
            </div>
          ) : micDenied ? (
            /* ---------- Izin mikrofon ditolak ---------- */
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-warning/15 grid place-items-center mx-auto">
                <MicOff className="w-7 h-7 text-warning-text" />
              </div>
              <p className="font-semibold">{t('speech.deniedTitle')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {t('speech.deniedDesc')}
              </p>
              <div className="rounded-xl bg-muted/50 p-3 text-left max-w-sm mx-auto">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('speech.deniedHowTitle')}
                </p>
                <ul className="text-[11px] text-muted-foreground leading-relaxed list-disc ml-4 mt-1.5 space-y-0.5">
                  <li>{t('speech.deniedStep1')}</li>
                  <li>{t('speech.deniedStep2')}</li>
                </ul>
              </div>
              <Button variant="outline" className="gap-1.5 mt-1" onClick={beginCapture}>
                <Settings className="w-4 h-4" />
                {t('speech.deniedRetry')}
              </Button>
            </div>
          ) : micUnsupported ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-muted grid place-items-center mx-auto">
                <MicOff className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-semibold">{t('speech.unsupportedTitle')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {t('speech.unsupportedDesc')}
              </p>
            </div>
          ) : stage === 'processing' ? (
            <div className="py-14 text-center space-y-3">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="font-semibold">{t('speech.processingTitle')}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('speech.processingDesc')}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scanAbortRef.current?.abort()}
                className="mt-2"
              >
                {t('speech.cancel')}
              </Button>
            </div>
          ) : stage === 'review' ? (
            <>
              {/* Pemutar rekaman: satu-satunya cara memeriksa angka yang
                  meragukan tanpa mengulang seluruh perekaman. */}
              {!byText && recording && (
                <audio
                  ref={playerRef}
                  src={recording.url}
                  controls
                  className="w-full h-10"
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget;
                    if (stopAtRef.current != null && el.currentTime >= stopAtRef.current) {
                      el.pause();
                      stopAtRef.current = null;
                    }
                  }}
                />
              )}

              {/* Jalur teks tidak punya rekaman untuk diputar ulang. Yang
                  menggantikannya adalah transkrip apa adanya: kalau sebuah
                  angka terlihat aneh, di sinilah pemilik toko melihat bahwa
                  yang salah adalah pendengaran HP-nya, bukan ucapannya. */}
              {byText && spokenText.length > 0 && (
                <details className="rounded-xl border border-border bg-muted/30 p-3">
                  <summary className="text-xs font-semibold cursor-pointer">
                    {t('speech.transcriptTitle')}
                  </summary>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-2 italic">
                    “{spokenText}”
                  </p>
                </details>
              )}
              <ProductDraftReview
                rows={rows}
                onChange={setRows}
                categories={categories ?? []}
                units={units ?? []}
                onPlayRow={byText ? undefined : playSegment}
              />
            </>
          ) : (
            /* ---------- Rekam ---------- */
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
                  <div className="space-y-1">
                    <p className="font-medium">{error.message}</p>
                    {error.code === 'UNHEARD' && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('speech.unheardHelp')}
                      </p>
                    )}
                    {error.code === 'TIMEOUT' && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('speech.timeoutHelp')}
                      </p>
                    )}
                    {error.code === 'VISION_QUOTA_EXCEEDED' && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('scan.quotaHelp')}
                      </p>
                    )}
                    {(error.code === 'VISION_PROVIDER_BUSY' || error.code === 'VISION_TIMEOUT') && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('scan.busyHelp')}
                      </p>
                    )}
                    {(error.code === 'VISION_UNAVAILABLE' ||
                      error.code === 'VISION_DISABLED' ||
                      error.code === 'SPEECH_UNSUPPORTED') && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('scan.unavailableHelp')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'rounded-xl p-5 text-center transition-colors',
                  isRecording ? 'bg-destructive/5 border border-destructive/25' : 'bg-muted/30',
                )}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {isRecording ? t('speech.recordingKicker') : t('speech.readyKicker')}
                </p>
                <p className="font-semibold mt-2">
                  {isRecording ? t('speech.recordingTitle') : t('speech.readyTitle')}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {isRecording
                    ? byText
                      ? t('speech.listeningDesc')
                      : t('speech.recordingDesc')
                    : t('speech.readyDesc', { seconds: maxSeconds })}
                </p>

                {isRecording && (
                  <>
                    <p className="text-3xl font-semibold tabular-nums mt-4">
                      {clock(elapsedSec)}
                      <span className="text-sm font-medium text-muted-foreground ml-1">
                        / {clock(maxSeconds)}
                      </span>
                    </p>

                    {/* Jalur teks memperlihatkan hasil dengar selagi bicara.
                        Ini bukan hiasan: pemilik toko bisa mengulang kalimat
                        yang salah tangkap sebelum kuota terpakai sama sekali. */}
                    {byText ? (
                      <div className="mt-3 min-h-[3.5rem] rounded-xl bg-background/70 border border-border px-3 py-2 text-left">
                        {spokenText.length > 0 ? (
                          <p className="text-[13px] leading-relaxed">{spokenText}</p>
                        ) : (
                          <p className="text-[12px] text-muted-foreground italic">
                            {t('speech.listeningEmpty')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-end justify-center gap-[3px] h-12 mt-3">
                          {recorder.levels.length === 0
                            ? null
                            : recorder.levels.map((v, i) => (
                                <span
                                  key={i}
                                  className="w-1 rounded-full bg-primary/70"
                                  style={{ height: `${Math.max(8, v * 100)}%` }}
                                />
                              ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {recorder.level > 0.06 ? t('speech.levelOk') : t('speech.levelLow')}
                        </p>
                      </>
                    )}
                  </>
                )}

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => (isRecording ? endCapture() : beginCapture())}
                    disabled={noQuota || statusLoading || isPreparing}
                    className={cn(
                      'w-20 h-20 grid place-items-center mx-auto text-white transition-all disabled:opacity-40',
                      isRecording
                        ? 'rounded-xl bg-destructive shadow-lg shadow-destructive/30'
                        : 'rounded-full bg-primary shadow-lg shadow-primary/30',
                    )}
                    aria-label={isRecording ? t('speech.stopButton') : t('speech.startButton')}
                  >
                    {isPreparing ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : isRecording ? (
                      <span className="w-6 h-6 rounded bg-white" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </button>
                  <p className="text-[11px] text-muted-foreground mt-3">
                    {isRecording ? t('speech.stopHint') : t('speech.startHint')}
                  </p>
                </div>
              </div>

              {/* Rekaman siap kirim: bisa didengar dulu, atau dibuang tanpa
                  memakai kuota sama sekali. */}
              {hasCapture && !isRecording && (
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {byText
                        ? t('speech.heardTitle')
                        : t('speech.readyToSend', { duration: clock(recording!.durationSec) })}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground shrink-0"
                      onClick={resetCapture}
                    >
                      <Replay className="w-3.5 h-3.5" />
                      {t('speech.recordAgain')}
                    </Button>
                  </div>
                  {byText ? (
                    /* Teks bisa dibetulkan langsung sebelum dikirim. Salah
                       dengar satu kata tidak sepadan dengan mengulang seluruh
                       dikte, dan mengetik satu kata jauh lebih cepat. */
                    <textarea
                      value={dictation.transcript}
                      onChange={(e) => dictation.setTranscript(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      aria-label={t('speech.transcriptTitle')}
                    />
                  ) : (
                    <audio src={recording!.url} controls className="w-full h-10" />
                  )}
                </div>
              )}

              {/* Contoh kalimat: bagian yang paling menentukan hasil. Tanpa ini
                  orang bicara seperti ke manusia dan angkanya tidak tertangkap. */}
              {!isRecording && (
                <div className="rounded-xl bg-accent/60 p-3 space-y-2">
                  <p className="text-xs font-semibold text-primary">{t('speech.examplesTitle')}</p>
                  {(Array.isArray(examples) ? examples : []).map((ex) => (
                    <p
                      key={ex}
                      className="rounded-xl bg-background/80 border border-primary/15 px-3 py-2 text-[12px] leading-relaxed"
                    >
                      “{ex}”
                    </p>
                  ))}
                </div>
              )}

              <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold">{t('speech.tipsTitle')}</p>
                <ul className="text-[11px] text-muted-foreground leading-relaxed list-disc ml-4 space-y-0.5">
                  <li>{t('speech.tip1')}</li>
                  <li>{t('speech.tip2')}</li>
                  <li>{t('speech.tip3')}</li>
                </ul>
              </div>

              {quota && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('speech.quotaLeft', { remaining: quota.remaining, limit: quota.limit })}
                </p>
              )}
            </>
          )}
        </div>

        {online && isLoggedIn && !restoringSession && !featureOff && stage !== 'processing' && (
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-border">
            {stage === 'review' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetCapture();
                    setRows([]);
                    setStage('record');
                  }}
                  className="gap-1.5"
                >
                  <Mic className="w-4 h-4" />
                  {t('speech.recordAgain')}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={readyRows.length === 0 || saving}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {t('draft.saveButton', { count: readyRows.length })}
                </Button>
              </>
            ) : (
              <Button
                onClick={runScan}
                disabled={!hasCapture || isRecording || noQuota || statusLoading}
                className="gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t('speech.processButton')}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
