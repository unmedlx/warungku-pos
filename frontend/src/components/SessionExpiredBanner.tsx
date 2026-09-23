import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CloudAlert, Loader2 } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { Button } from '@/components/jokoui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { nativeGoogleSignIn } from '@/lib/google-auth';
import { isNativePlatform } from '@/lib/printer';
import { GoogleLogin } from '@react-oauth/google';
import { GoogleMark } from '@/components/GoogleMark';

/**
 * Banner "sesi cloud berakhir" di beranda.
 *
 * Aturannya: sesi cloud yang mati **tidak boleh** menutup kasir. Refresh token
 * sudah dicoba otomatis di `use-cloud-auth`; kalau itu pun gagal (dicabut,
 * kedaluwarsa), yang muncul cuma banner ini — kasir dan seluruh menu tetap
 * jalan dari data lokal, dan transaksi menumpuk sampai user masuk lagi.
 */

/**
 * Satu-satunya interupsi Beranda yang tidak bisa ditutup: selama sesinya
 * mati, transaksi tidak bisa naik ke cloud. Karena itu prioritasnya
 * tertinggi di `HOME_INTERRUPTS`.
 */
export function useSessionExpiredVisible(): boolean {
  const { sessionExpired } = useCloudAuth();
  return sessionExpired;
}
export function SessionExpiredBanner() {
  const { t } = useTranslation('dashboard');
  const { sessionExpired, login } = useCloudAuth();
  const [busy, setBusy] = useState(false);
  const native = isNativePlatform();

  // Berapa yang tertahan — angka konkret lebih meyakinkan daripada "ada data
  // belum tersinkron", dan sekaligus jadi alasan kenapa user perlu masuk lagi.
  const pending = useLiveQuery(async () => {
    if (!sessionExpired) return 0;
    return db.transactions
      .filter((tx) => {
        if (!tx.syncedAt) return true;
        if (!tx.updatedAt) return false;
        return new Date(tx.updatedAt).getTime() > new Date(tx.syncedAt).getTime();
      })
      .count();
  }, [sessionExpired], 0);

  if (!sessionExpired) return null;

  const handleToken = async (idToken: string) => {
    setBusy(true);
    try {
      await login(idToken);
      toast.success(t('sessionExpired.success'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('sessionExpired.failed'));
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
      toast.error(err instanceof Error ? err.message : t('sessionExpired.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Alert variant="warning">
      <CloudAlert />
      <AlertTitle>{t('sessionExpired.title')}</AlertTitle>
      <AlertDescription>
        {pending && pending > 0
          ? t('sessionExpired.descPending', { count: pending })
          : t('sessionExpired.desc')}
        <div className="mt-2.5">
          {native ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={handleNative}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark className="!h-4 !w-4" />}
              {t('sessionExpired.cta')}
            </Button>
          ) : (
            <GoogleLogin
              theme="outline"
              size="medium"
              shape="rectangular"
              logo_alignment="left"
              onSuccess={(cr) => {
                if (cr.credential) void handleToken(cr.credential);
                else toast.error(t('sessionExpired.failed'));
              }}
              onError={() => toast.error(t('sessionExpired.failed'))}
            />
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
