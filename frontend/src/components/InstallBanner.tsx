import { useLiveQuery } from 'dexie-react-hooks';
import { Download, X } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { Button } from '@/components/jokoui/button';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/jokoui/item';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { isNativePlatform } from '@/lib/printer';
import { DISMISS_KEYS, useDismissed } from '@/lib/home-interrupts';

const DISMISS_KEY = DISMISS_KEYS.install;

/** Layak tampil bila aplikasi memang bisa dipasang dan user sudah pernah jualan. */
export function useInstallBannerVisible(): boolean {
  const { canInstall, isInstalled, isIOS } = usePWAInstall();
  const [dismissed] = useDismissed(DISMISS_KEY);
  const hasSold = useLiveQuery(
    async () => (await db.transactions.where('status').equals('completed').count()) > 0,
    [],
    false,
  );
  if (isNativePlatform() || isInstalled || dismissed || !hasSold) return false;
  return canInstall || isIOS;
}

/**
 * Ajakan pasang PWA di beranda.
 *
 * Dulu ini langkah wajib di onboarding, padahal user baru belum punya alasan
 * memasang aplikasi yang belum pernah dia pakai. Sekarang baru muncul setelah
 * transaksi pertama — saat nilainya sudah terbukti.
 */
export function InstallBanner() {
  const { t } = useTranslation('dashboard');
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, handleDismiss] = useDismissed(DISMISS_KEY);

  const hasSold = useLiveQuery(
    async () => (await db.transactions.where('status').equals('completed').count()) > 0,
    [],
    false,
  );

  if (isNativePlatform() || isInstalled || dismissed || !hasSold) return null;
  if (!canInstall && !isIOS) return null;

  const handleInstall = async () => {
    // iOS tidak punya `beforeinstallprompt`; satu-satunya jalur adalah menu Share.
    if (isIOS) {
      toast.info(t('install.iosHint'), { duration: 8000 });
      return;
    }
    const ok = await install();
    if (ok) toast.success(t('install.success'));
  };

  return (
    <Item>
      <ItemMedia tone="primary"><Download /></ItemMedia>
      <ItemContent>
        <ItemTitle>{t('install.title')}</ItemTitle>
        <ItemDescription className="line-clamp-2">{t('install.desc')}</ItemDescription>
      </ItemContent>
      <Button size="sm" onClick={handleInstall} className="shrink-0">
        {t('install.cta')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleDismiss}
        aria-label={t('install.dismiss')}
        className="-mr-1 h-7 w-7 text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </Item>
  );
}
