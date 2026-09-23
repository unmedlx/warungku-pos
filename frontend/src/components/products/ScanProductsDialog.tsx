import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  X,
  CloudAlert,
  LogIn,
} from '@/components/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/jokoui/button';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/jokoui/alert';
import { db } from '@/lib/db';
import ProductDraftReview from './ProductDraftReview';
import {
  buildDraftRows,
  isDraftReady,
  saveDraftRows,
  type DraftRow,
} from '@/lib/product-draft';
import { compressImageForScan } from '@/lib/image-utils';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/use-auth';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import {
  CloudApiError,
  ScanAbortedError,
  ScanTimeoutError,
  fetchScanStatus,
  scanProducts,
  type ScanConfidence,
  type ScanQuota,
  type ScannedProduct,
} from '@/lib/vision-api';

type Stage = 'pick' | 'processing' | 'review';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const MAX_FILE_MB = 6;

export default function ScanProductsDialog({ open, onClose, onSaved }: Props) {
  const { t } = useTranslation('products');
  const { currentUser } = useAuth();
  const { isLoggedIn, restoringSession } = useCloudAuth();
  const navigate = useNavigate();

  const products = useLiveQuery(() => db.products.where('isDeleted').equals(0).toArray());
  const categories = useLiveQuery(() => db.categories.where('isDeleted').equals(0).toArray());
  const units = useLiveQuery(() => db.units.where('isDeleted').equals(0).toArray());
  // Toko cloud yang terikat ke perangkat ini — dipakai server untuk mencatat
  // pemakaian scan per toko, bukan sekadar per akun.
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  const [stage, setStage] = useState<Stage>('pick');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [status, setStatus] = useState<{ enabled: boolean; maxImages: number; quota: ScanQuota } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [saving, setSaving] = useState(false);

  const scanAbortRef = useRef<AbortController | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  // Kuota diambil saat dialog dibuka supaya angka sisa yang ditampilkan
  // adalah angka server, bukan tebakan dari sesi sebelumnya.
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
    previews.forEach((url) => URL.revokeObjectURL(url));
    setStage('pick');
    setFiles([]);
    setPreviews([]);
    setRows([]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const maxImages = status?.maxImages ?? 5;

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;

    const room = maxImages - files.length;
    if (room <= 0) {
      toast.error(t('scan.tooManyPhotos', { max: maxImages }));
      return;
    }

    const accepted: File[] = [];
    for (const f of picked.slice(0, room)) {
      if (!f.type.startsWith('image/')) {
        toast.error(t('scan.notAnImage'));
        continue;
      }
      try {
        const compressed = await compressImageForScan(f);
        if (compressed.size > MAX_FILE_MB * 1024 * 1024) {
          toast.error(t('scan.fileTooLarge'));
          continue;
        }
        accepted.push(compressed);
      } catch {
        toast.error(t('scan.readPhotoFailed'));
      }
    }

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
      setPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
    }
    if (picked.length > room) toast.info(t('scan.tooManyPhotos', { max: maxImages }));
  };

  const removeFile = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  /** Hasil provider dipetakan ke bentuk netral, lalu dicocokkan dengan katalog. */
  const toRows = (scanned: ScannedProduct[]): DraftRow[] =>
    buildDraftRows(
      scanned.map((p) => ({
        name: p.name,
        hpp: p.hpp,
        price: p.price,
        unit: p.unit,
        qty: p.qty,
        categoryHint: p.categoryHint,
        confidence: p.confidence,
        note: p.note,
        sourceLabel: t('scan.fromPhoto', { index: p.imageIndex }),
      })),
      { products: products ?? [], categories: categories ?? [], units: units ?? [] },
    );

  const cancelScan = () => {
    scanAbortRef.current?.abort();
  };

  const runScan = async () => {
    if (files.length === 0) return;
    const ctrl = new AbortController();
    scanAbortRef.current = ctrl;
    setStage('processing');
    setError(null);
    try {
      const res = await scanProducts(files, {
        signal: ctrl.signal,
        storeId: storeSettings?.cloudStoreId ?? undefined,
      });
      setStatus((prev) => (prev ? { ...prev, quota: res.quota } : prev));

      if (res.products.length === 0) {
        setError({
          code: 'UNREADABLE',
          message: res.unreadableReason ?? t('scan.unreadableDefault'),
        });
        setStage('pick');
        return;
      }

      setRows(toRows(res.products));
      setStage('review');
      trackEvent('scan_products_photo');
    } catch (err) {
      // Batal atas permintaan sendiri bukan kegagalan — kembalikan saja ke
      // layar pilih foto tanpa pesan galat yang membingungkan.
      if (err instanceof ScanAbortedError) {
        setStage('pick');
        return;
      }
      if (err instanceof ScanTimeoutError) {
        setError({ code: 'TIMEOUT', message: t('scan.timeoutError') });
        setStage('pick');
        return;
      }
      const code = err instanceof CloudApiError ? String(err.body?.code ?? '') : '';
      const message = err instanceof Error ? err.message : t('scan.genericError');
      setError({ code, message });
      setStage('pick');
    } finally {
      scanAbortRef.current = null;
    }
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
  const featureOff = status != null && !status.enabled;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {stage === 'review' ? t('scan.reviewTitle', { count: rows.length }) : t('scan.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* ---------- Offline ---------- */}
          {!online ? (
            <EmptyState icon={CloudAlert} title={t('scan.offlineTitle')} description={t('scan.offlineDesc')} />
          ) : restoringSession ? (
            <div className="py-14 grid place-items-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !isLoggedIn ? (
            <EmptyState
              icon={LogIn}
              title={t('scan.loginTitle')}
              description={t('scan.loginDesc')}
              action={
                <Button
                  onClick={() => {
                    onClose();
                    navigate('/settings/cloud-backup');
                  }}
                >
                  <LogIn />
                  {t('scan.loginButton')}
                </Button>
              }
            />
          ) : featureOff ? (
            <EmptyState icon={Camera} title={t('scan.disabledTitle')} description={t('scan.disabledDesc')} />
          ) : stage === 'processing' ? (
            /* ---------- Memproses ---------- */
            <div className="space-y-3 py-14 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">{t('scan.processingTitle')}</p>
              <p className="text-xsm leading-relaxed text-muted-foreground">
                {t('scan.processingDesc')}
              </p>
              <Button variant="ghost" size="sm" onClick={cancelScan} className="mt-2">
                {t('scan.cancel')}
              </Button>
            </div>
          ) : stage === 'review' ? (
            /* ---------- Tinjau hasil ---------- */
            <ProductDraftReview
              rows={rows}
              onChange={setRows}
              categories={categories ?? []}
              units={units ?? []}
            />
          ) : (
            /* ---------- Pilih foto ---------- */
            <>
              {error && (
                <Alert variant={error.code === 'VISION_QUOTA_EXCEEDED' ? 'warning' : 'destructive'}>
                  <AlertTriangle />
                  <AlertTitle>{error.message}</AlertTitle>
                  <AlertDescription className="space-y-1">
                    {error.code === 'UNREADABLE' && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('scan.unreadableHelp')}
                      </p>
                    )}
                    {error.code === 'TIMEOUT' && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('scan.timeoutHelp')}
                      </p>
                    )}
                    {error.code === 'VISION_QUOTA_EXCEEDED' && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('scan.quotaHelp')}
                      </p>
                    )}
                    {/* Gangguan di sisi provider: yang perlu diketahui pemilik
                        toko adalah kuotanya aman dan ini layak dicoba lagi. */}
                    {(error.code === 'VISION_PROVIDER_BUSY' || error.code === 'VISION_TIMEOUT') && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('scan.busyHelp')}
                      </p>
                    )}
                    {(error.code === 'VISION_UNAVAILABLE' || error.code === 'VISION_DISABLED') && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('scan.unavailableHelp')}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-sm text-muted-foreground leading-relaxed">{t('scan.lede')}</p>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" onClick={() => cameraInputRef.current?.click()}>
                  <Camera />
                  {t('scan.takePhoto')}
                </Button>
                <Button variant="outline" size="lg" onClick={() => galleryInputRef.current?.click()}>
                  <Plus />
                  {t('scan.fromGallery')}
                </Button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePick}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePick}
              />

              {previews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    <div key={src} className="relative">
                      <img
                        src={src}
                        alt={t('scan.photoAlt', { index: i + 1 })}
                        className="h-20 w-20 rounded-xl border border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-white shadow-xs"
                        aria-label={t('scan.removePhoto')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5 rounded-xl bg-muted p-3">
                <p className="text-xs font-medium">{t('scan.tipsTitle')}</p>
                <ul className="ml-4 list-disc space-y-0.5 text-xs leading-relaxed text-muted-foreground">
                  <li>{t('scan.tip1')}</li>
                  <li>{t('scan.tip2')}</li>
                  <li>{t('scan.tip3')}</li>
                </ul>
              </div>

              {quota && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('scan.quotaLeft', { remaining: quota.remaining, limit: quota.limit })}
                </p>
              )}
            </>
          )}
        </div>

        {/* ---------- Footer ---------- */}
        {online && isLoggedIn && !restoringSession && !featureOff && stage !== 'processing' && (
          <div className="flex gap-2 border-t border-border pt-3">
            {stage === 'review' ? (
              <>
                <Button variant="outline" size="xl" onClick={() => setStage('pick')} className="flex-1">
                  <Camera />
                  {t('scan.rescan')}
                </Button>
                <Button size="xl" onClick={handleSave} disabled={readyRows.length === 0 || saving} className="flex-[2]">
                  {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  {t('scan.saveButton', { count: readyRows.length })}
                </Button>
              </>
            ) : (
              <Button
                size="xl"
                onClick={runScan}
                disabled={files.length === 0 || noQuota || statusLoading}
                className="w-full"
              >
                <Sparkles />
                {t('scan.processButton', { count: files.length })}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
