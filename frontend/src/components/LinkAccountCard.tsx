import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { CloudUpload, Check, Loader2 } from '@/components/icons';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { Button } from '@/components/jokoui/button';
import { Card, CardContent } from '@/components/jokoui/card';
import { ItemMedia } from '@/components/jokoui/item';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { nativeGoogleSignIn } from '@/lib/google-auth';
import { isNativePlatform } from '@/lib/printer';
import { linkLocalStoreToCloud } from '@/lib/store-hydration';
import { GoogleMark } from '@/components/GoogleMark';
import { DISMISS_KEYS, useDismissed } from '@/lib/home-interrupts';

const DISMISS_KEY = DISMISS_KEYS['link-account'];

/** Sudah pernah menyelesaikan transaksi — sebelum itu belum ada yang layak diamankan. */
function useHasSold(): boolean {
  return useLiveQuery(
    async () => (await db.transactions.where('status').equals('completed').count()) > 0,
    [],
    false,
  );
}

/** Layak tampil bila sudah jualan tapi datanya masih lokal saja. */
export function useLinkAccountVisible(): boolean {
  const { isLoggedIn, sessionExpired, restoringSession } = useCloudAuth();
  const [dismissed] = useDismissed(DISMISS_KEY);
  const hasSold = useHasSold();
  return !restoringSession && !isLoggedIn && !sessionExpired && !dismissed && hasSold;
}

/**
 * Ajakan menghubungkan akun Google untuk user yang memilih "Lanjut tanpa akun"
 * (dan untuk instalasi lama yang datanya cuma ada di satu HP).
 *
 * Sengaja kartu di beranda, bukan modal: memblokir kasir demi urusan akun akan
 * membuat user menutup aplikasi, bukan mendaftar. Muncul baru setelah ada
 * transaksi — sebelum itu belum ada data yang layak "diamankan", jadi ajakannya
 * tidak berarti apa-apa.
 */
export function LinkAccountCard() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { isLoggedIn, sessionExpired, restoringSession, login } = useCloudAuth();
  const [dismissed, handleDismiss] = useDismissed(DISMISS_KEY);
  const [busy, setBusy] = useState(false);
  const native = isNativePlatform();
  const hasSold = useHasSold();

  if (restoringSession || isLoggedIn || sessionExpired || dismissed || !hasSold) return null;

  const handleToken = async (idToken: string) => {
    setBusy(true);
    try {
      await login(idToken);
      const hasil = await linkLocalStoreToCloud();
      if (hasil.status === 'linked') {
        toast.success(
          hasil.pushed
            ? t('linkAccount.toast.linkedSynced', { name: hasil.store.name })
            : t('linkAccount.toast.linked', { name: hasil.store.name }),
        );
        handleDismiss();
        return;
      }
      // Akunnya sudah punya toko di cloud, atau kuotanya penuh — dua-duanya
      // butuh keputusan user, jadi diarahkan ke halaman Toko Cloud.
      toast.info(hasil.status === 'quota' ? t('linkAccount.toast.quota') : t('linkAccount.toast.hasStores'));
      navigate('/settings/cloud-backup/stores');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('linkAccount.toast.failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleNative = async () => {
    setBusy(true);
    try {
      const idToken = await nativeGoogleSignIn();
      await handleToken(idToken);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('linkAccount.toast.failed'));
    } finally {
      setBusy(false);
    }
  };

  const benefits = [
    t('linkAccount.benefit1'),
    t('linkAccount.benefit2'),
    t('linkAccount.benefit3'),
  ];

  return (
    <Card>
      <CardContent>
      <div className="flex items-start gap-3">
        <ItemMedia tone="primary"><CloudUpload /></ItemMedia>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('linkAccount.title')}</p>
          <p className="mt-0.5 text-xsm leading-snug text-muted-foreground">{t('linkAccount.desc')}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {benefits.map((b) => (
          <div key={b} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-success/10 text-success-text">
              <Check className="h-3 w-3" />
            </span>
            <span className="text-xsm">{b}</span>
          </div>
        ))}
      </div>

      <div className="mt-3">
        {native ? (
          <Button variant="outline" className="w-full" disabled={busy} onClick={handleNative}>
            {busy ? <Loader2 className="size-4.5 animate-spin" /> : <GoogleMark />}
            {t('linkAccount.cta')}
          </Button>
        ) : busy ? (
          <Button className="w-full" disabled>
            <Loader2 className="size-4.5 animate-spin" />
            {t('linkAccount.linking')}
          </Button>
        ) : (
          <div className="flex w-full justify-center [&>div]:w-full">
            <GoogleLogin
              theme="outline"
              size="large"
              shape="rectangular"
              text="continue_with"
              logo_alignment="left"
              width="320"
              onSuccess={(cr) => {
                if (cr.credential) void handleToken(cr.credential);
                else toast.error(t('linkAccount.toast.failed'));
              }}
              onError={() => toast.error(t('linkAccount.toast.failed'))}
            />
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        disabled={busy}
        className="mt-1.5 w-full text-muted-foreground"
      >
        {t('linkAccount.later')}
      </Button>
      </CardContent>
    </Card>
  );
}
