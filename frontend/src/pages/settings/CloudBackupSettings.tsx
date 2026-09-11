import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Link } from 'react-router-dom';
import {
  Cloud,
  ChevronRight,
  LogOut,
  CheckCircle2,
  Loader2,
  CreditCard,
  Clock,
  History,
  RefreshCw,
  Store,
  BarChart3,
  MonitorSmartphone,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Globe,
  DownloadCloud,
  HardDrive,
  CloudUpload,
} from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Badge } from '@/components/jokoui/badge';
import { PageHeader } from '@/components/jokoui/page-header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { format, type Locale } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { isNativePlatform } from '@/lib/printer';
import { nativeGoogleSignIn } from '@/lib/google-auth';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { fetchPlans, checkoutPlan, verifyPayment, fetchStores, uploadBackup, type Plan, type CloudStore } from '@/lib/cloud-api';
import { buildBackupJsonString, backupFileName } from '@/lib/backup';
import { useTranslation } from 'react-i18next';

const CURRENCY_SYMBOL: Record<string, string> = { id: 'Rp', en: 'Rp', ms: 'Rp' };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };
const LOCALES: Record<string, Locale> = { id, en: enUS, ms };

const WEB_APP_ORIGIN = 'https://dashboard.kankitu.com';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Buka halaman pembayaran. Di Android `window.open` hanya memuat URL di dalam
 * WebView Capacitor (atau diblokir), jadi dipakai Capacitor Browser yang
 * membuka Custom Tab / browser eksternal.
 */
const openCheckout = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, presentationStyle: 'popover' });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * URL kembali setelah pembayaran. Di build native `window.location.origin`
 * berupa skema internal (capacitor://) yang tidak bisa dipakai gateway.
 */
const paymentReturnUrl = () => {
  const origin = isNativePlatform() ? WEB_APP_ORIGIN : window.location.origin;
  return `${origin}/settings/cloud-backup`;
};

const fmtMb = (mb: number) => `${mb.toFixed(2)} MB`;
const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

/** Jeda auto-backup dalam ms; null bila nonaktif. Selaras dengan use-cloud-auto-backup. */
function intervalMs(interval: string | undefined, hours: number | undefined): number | null {
  switch (interval) {
    case 'hourly':
      return hours && hours >= 1 ? hours * HOUR_MS : null;
    case 'daily':
      return DAY_MS;
    case 'weekly':
      return 7 * DAY_MS;
    default:
      return null;
  }
}

/**
 * Kondisi tunggal yang menjawab pertanyaan utama halaman ini: "data toko saya
 * aman atau tidak?". Urutannya dari hambatan paling awal ke paling akhir.
 */
type StatusKind = 'loggedOut' | 'inactive' | 'noStore' | 'error' | 'never' | 'stale' | 'safe';

export default function CloudBackupSettings() {
  const { can } = useAuth();
  const { isLoggedIn, googleUser, profile, loadingProfile, isSyncSubscribed, login, logout, refreshProfile } = useCloudAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? id;
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[i18n.language] ?? 'Rp';
  const rp = (n: number) => `${currencySymbol} ${n.toLocaleString(numberLocale)}`;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [backupSizeBytes, setBackupSizeBytes] = useState<number | null>(null);
  const [stores, setStores] = useState<CloudStore[]>([]);
  const [showPlans, setShowPlans] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

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

  const activeStoreId = storeSettings?.cloudStoreId ?? null;
  const activeStore = stores.find((s) => s.id === activeStoreId);

  const byPrice = (a: Plan, b: Plan) => a.price - b.price;
  const syncPlans = plans.filter((p) => p.category === 'SYNC').sort(byPrice);
  const cheapestSyncPrice = syncPlans.length ? syncPlans[0].price : null;

  const loadPlans = useCallback(async () => {
    try {
      setPlans(await fetchPlans());
    } catch {
      /* diabaikan */
    }
  }, []);

  const loadStores = useCallback(async () => {
    try {
      setStores(await fetchStores());
    } catch {
      setStores([]);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (isLoggedIn) {
      buildBackupJsonString()
        .then((json) => setBackupSizeBytes(new Blob([json]).size))
        .catch(() => setBackupSizeBytes(null));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && isSyncSubscribed) loadStores();
  }, [isLoggedIn, isSyncSubscribed, loadStores]);

  const checkPayment = useCallback(
    async (silent: boolean) => {
      if (!pendingTxId) return;
      if (!silent) setBusy('verify');
      try {
        const result = await verifyPayment(pendingTxId);
        if (result.transaction.status === 'COMPLETED') {
          await refreshProfile();
          setPendingTxId(null);
          setPaymentLink(null);
          setShowPlans(false);
          toast.success(t('cloudBackup.toast.paymentSuccess'));
        } else if (!silent) {
          toast.info(t('cloudBackup.toast.paymentNotDetected'));
        }
      } catch (err) {
        if (!silent) toast.error(err instanceof Error ? err.message : t('cloudBackup.toast.verifyFailed'));
      } finally {
        if (!silent) setBusy(null);
      }
    },
    [pendingTxId, refreshProfile, t],
  );

  useEffect(() => {
    if (!pendingTxId) return;
    const timer = window.setInterval(() => checkPayment(true), 4000);
    return () => window.clearInterval(timer);
  }, [pendingTxId, checkPayment]);

  // Di native, cek sekali lagi begitu Custom Tab pembayaran ditutup user.
  useEffect(() => {
    if (!pendingTxId || !Capacitor.isNativePlatform()) return;
    const handle = Browser.addListener('browserFinished', () => checkPayment(true));
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [pendingTxId, checkPayment]);

  if (!can('manage_backup')) {
    return <LockedPage title={t('cloudBackup.locked.title')} permissionLabel={t('cloudBackup.locked.permissionLabel')} />;
  }

  const handleNativeLogin = async () => {
    setBusy('login');
    try {
      const idToken = await nativeGoogleSignIn();
      await login(idToken);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudBackup.toast.loginFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setBusy(`checkout:${planId}`);
    try {
      const result = await checkoutPlan(planId, { redirectURL: paymentReturnUrl() });
      setPaymentLink(result.paymentLink);
      setPendingTxId(result.transaction.id);
      await openCheckout(result.paymentLink);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudBackup.toast.checkoutFailed'));
    } finally {
      setBusy(null);
    }
  };

  const closePaymentModal = () => {
    setPendingTxId(null);
    setPaymentLink(null);
  };

  const handleBackupNow = async () => {
    const storeId = activeStoreId ?? undefined;
    if (!storeId) {
      toast.error(t('cloudBackup.toast.selectStoreFirst'));
      return;
    }
    setBusy('sync');
    const now = new Date();
    try {
      const json = await buildBackupJsonString();
      await uploadBackup(json, backupFileName(), storeId);
      if (storeSettings?.id) {
        await db.storeSettings.update(storeSettings.id, {
          lastCloudBackupAt: now,
          lastCloudBackupAttemptAt: now,
          lastCloudBackupStatus: 'success',
          lastCloudBackupError: null,
        });
      }
      await refreshProfile();
      toast.success(t('cloudBackup.toast.syncSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('cloudBackup.toast.syncFailed');
      if (storeSettings?.id) {
        await db.storeSettings.update(storeSettings.id, {
          lastCloudBackupAttemptAt: now,
          lastCloudBackupStatus: 'error',
          lastCloudBackupError: message,
        });
      }
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  // --- Turunan status ---

  const relative = (date: Date) => {
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return t('cloudBackup.relative.justNow');
    if (diff < HOUR_MS) return t('cloudBackup.relative.minutes', { count: Math.floor(diff / 60_000) });
    if (diff < DAY_MS) return t('cloudBackup.relative.hours', { count: Math.floor(diff / HOUR_MS) });
    return t('cloudBackup.relative.days', { count: Math.floor(diff / DAY_MS) });
  };

  const interval = storeSettings?.cloudAutoBackupInterval ?? 'off';
  const autoMs = intervalMs(interval, storeSettings?.cloudAutoBackupHours);
  const intervalLabel =
    interval === 'hourly'
      ? t('cloudBackup.interval.everyNHours', { hours: storeSettings?.cloudAutoBackupHours ?? 6 })
      : t(`cloudBackup.interval.${interval}`, { defaultValue: t('cloudBackup.interval.off') });

  const lastBackupAt = storeSettings?.lastCloudBackupAt ? new Date(storeSettings.lastCloudBackupAt) : null;
  const lastAttemptAt = storeSettings?.lastCloudBackupAttemptAt ? new Date(storeSettings.lastCloudBackupAttemptAt) : null;
  const lastError = storeSettings?.lastCloudBackupStatus === 'error' ? storeSettings.lastCloudBackupError : null;
  const backupAgeMs = lastBackupAt ? Date.now() - lastBackupAt.getTime() : null;
  // Ambang "basi": dua kali jeda auto-backup, atau 3 hari bila auto nonaktif.
  const staleMs = autoMs ? autoMs * 2 : 3 * DAY_MS;

  const status: StatusKind = !isLoggedIn
    ? 'loggedOut'
    : !isSyncSubscribed
      ? 'inactive'
      : !activeStoreId
        ? 'noStore'
        : lastError
          ? 'error'
          : !lastBackupAt
            ? 'never'
            : backupAgeMs !== null && backupAgeMs > staleMs
              ? 'stale'
              : 'safe';

  const staleDays = backupAgeMs ? Math.floor(backupAgeMs / DAY_MS) : 0;

  const nextBackupLabel = (() => {
    if (!autoMs) return t('cloudBackup.metric.manual');
    const base = lastBackupAt ? lastBackupAt.getTime() : Date.now();
    const next = new Date(base + autoMs);
    return next.getTime() <= Date.now() ? t('cloudBackup.relative.justNow') : format(next, 'HH:mm', { locale: dateLocale });
  })();

  const subscription = profile?.syncSubscription ?? null;
  const daysLeft = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / DAY_MS))
    : null;
  const usage = profile?.storageUsage;
  const backupCount = profile?.backups?.length ?? 0;
  const maxStores = profile?.user?.maxStores ?? null;

  // --- Bagian visual ---

  const heroTone: 'safe' | 'risk' | 'idle' =
    status === 'safe' ? 'safe' : status === 'loggedOut' || status === 'inactive' ? 'idle' : 'risk';

  const heroTitle = {
    loggedOut: t('cloudBackup.status.loggedOut.title'),
    inactive: t('cloudBackup.status.inactive.title'),
    noStore: t('cloudBackup.status.noStore.title'),
    error: t('cloudBackup.status.error.title'),
    never: t('cloudBackup.status.never.title'),
    stale: t('cloudBackup.status.stale.title', { days: staleDays }),
    safe: t('cloudBackup.status.safe.title'),
  }[status];

  const heroDesc = {
    loggedOut: t('cloudBackup.status.loggedOut.desc'),
    inactive: t('cloudBackup.status.inactive.desc'),
    noStore: t('cloudBackup.status.noStore.desc'),
    error: lastError ?? '',
    never: t('cloudBackup.status.never.desc'),
    stale: t('cloudBackup.status.stale.desc'),
    safe:
      autoMs && lastBackupAt
        ? t('cloudBackup.status.safe.descAuto', { time: relative(lastBackupAt), schedule: intervalLabel.toLowerCase() })
        : t('cloudBackup.status.safe.desc', { time: lastBackupAt ? relative(lastBackupAt) : '-' }),
  }[status];

  const HeroIcon = status === 'safe' ? ShieldCheck : heroTone === 'risk' ? ShieldAlert : Cloud;

  /** Fokuskan user ke daftar paket; dipakai hero & checklist saat belum berlangganan. */
  const goToPlans = () => {
    setShowPlans(true);
    requestAnimationFrame(() => {
      document.getElementById('cloud-plans')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const heroAction = (() => {
    if (status === 'loggedOut') return null; // tombol login dirender terpisah
    if (status === 'inactive')
      return (
        <Button size="xl" className="w-full" onClick={goToPlans}>
          {cheapestSyncPrice != null
            ? t('cloudBackup.action.activateFrom', { price: rp(cheapestSyncPrice) })
            : t('cloudBackup.action.activate')}
        </Button>
      );
    if (status === 'noStore')
      return (
        <Link to="/settings/cloud-backup/stores" className="block">
          <Button size="xl" className="w-full gap-2" variant={heroTone === 'risk' ? 'secondary' : 'default'}>
            <Store className="w-4 h-4" /> {t('cloudBackup.action.connectStore')}
          </Button>
        </Link>
      );
    return (
      <Button
        size="xl"
        className="w-full gap-2"
        variant={heroTone === 'safe' || heroTone === 'risk' ? 'secondary' : 'default'}
        disabled={busy === 'sync' || !online}
        onClick={handleBackupNow}
      >
        {busy === 'sync' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
        {t('cloudBackup.action.backupNow')}
      </Button>
    );
  })();

  const setupSteps = isLoggedIn && !isSyncSubscribed ? true : isLoggedIn && isSyncSubscribed && !activeStoreId;

  return (
    <div className="page-container space-y-4">
      <PageHeader icon={Cloud} title={t('cloudBackup.page.title')} backTo="/settings" />

      {/* 1. Status — satu jawaban untuk "data saya aman atau tidak?" */}
      <StatusHero tone={heroTone} icon={<HeroIcon className="w-7 h-7" />} title={heroTitle} description={heroDesc}>
        {isLoggedIn && (
          <div className="grid grid-cols-3 gap-2">
            <HeroMetric value={activeStore?.name ?? t('cloudBackup.metric.none')}
              label={t('cloudBackup.metric.activeStore')}
            />
            <HeroMetric value={nextBackupLabel} label={t('cloudBackup.metric.nextBackup')} />
            <HeroMetric value={backupSizeBytes != null ? fmtSize(backupSizeBytes) : '—'}
              label={t('cloudBackup.metric.dataSize')}
            />
          </div>
        )}
        {heroAction}
        {status === 'loggedOut' && (
          <div className="space-y-2">
            <div className="flex justify-center">
              {isNativePlatform() ? (
                <Button size="xl" className="w-full gap-2" disabled={busy === 'login'} onClick={handleNativeLogin}>
                  {busy === 'login' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                  {t('cloudBackup.continueWithGoogle')}
                </Button>
              ) : (
                <GoogleLogin
                  onSuccess={(cr) => {
                    if (cr.credential) login(cr.credential).catch(() => toast.error(t('cloudBackup.toast.loginFailed')));
                    else toast.error(t('cloudBackup.toast.loginFailed'));
                  }}
                  onError={() => toast.error(t('cloudBackup.toast.loginFailed'))}
                />
              )}
            </div>
          </div>
        )}
      </StatusHero>

      {/* 2. Peringatan yang butuh tindakan */}
      {!online && (
        <Banner tone="warn" icon={<AlertTriangle className="w-4 h-4" />}>
          {t('cloudBackup.banner.offline')}
        </Banner>
      )}

      {lastError && (
        <Banner tone="bad" icon={<AlertTriangle className="w-4 h-4" />}>
          <b>{t('cloudBackup.banner.failedTitle')}</b>
          <br />
          {t('cloudBackup.banner.failedBody', {
            time: lastAttemptAt ? format(lastAttemptAt, 'dd MMM HH:mm', { locale: dateLocale }) : '-',
            message: lastError,
          })}
        </Banner>
      )}

      {isSyncSubscribed && daysLeft !== null && daysLeft <= 7 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-warning/10 text-warning-text flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t('cloudBackup.banner.expiringTitle', { days: daysLeft })}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{t('cloudBackup.banner.expiringDesc')}</p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full h-9"
              disabled={!subscription || busy === `checkout:${subscription.planId}`}
              onClick={() => subscription && handleSubscribe(subscription.planId)}
            >
              {subscription && busy === `checkout:${subscription.planId}` ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('cloudBackup.banner.renew', { price: rp(subscription?.plan?.price ?? 0) })
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 3. Tindakan utama kedua: pulihkan */}
      {isLoggedIn && isSyncSubscribed && (
        <MenuRow
          to="/settings/cloud-backup/restore"
          icon={<DownloadCloud className="w-4 h-4" />}
          tone="success"
          title={t('cloudBackup.row.restore.title')}
          subtitle={
            backupCount > 0
              ? t('cloudBackup.row.restore.count', { count: backupCount })
              : t('cloudBackup.row.restore.subtitle')
          }
          standalone
        />
      )}

      {/* 4. Checklist aktivasi — hanya saat setup belum kelar */}
      {setupSteps && (
        <SetupChecklist
          loggedIn={isLoggedIn}
          subscribed={isSyncSubscribed}
          storeLinked={!!activeStoreId}
          email={googleUser?.email}
          onSeePlans={goToPlans}
        />
      )}

      {/* 5. Nilai + paket, hanya untuk yang belum berlangganan */}
      {loadingProfile && !profile ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        !isSyncSubscribed && (
          <>
            <Card>
              <CardContent className="p-4 space-y-3">
                <SectionTitle className="mt-0">{t('cloudBackup.sections.whatYouGet')}</SectionTitle>
                <ul className="space-y-2.5">
                  <BenefitItem
                    icon={<ShieldCheck className="w-4 h-4" />}
                    title={t('cloudBackup.benefits.safe.title')}
                    desc={t('cloudBackup.benefits.safe.desc')}
                  />
                  <BenefitItem
                    icon={<MonitorSmartphone className="w-4 h-4" />}
                    title={t('cloudBackup.benefits.dashboard.title')}
                    desc={t('cloudBackup.benefits.dashboard.desc', { dashboard: 'dashboard.kankitu.com' })}
                  />
                  <BenefitItem
                    icon={<Store className="w-4 h-4" />}
                    title={t('cloudBackup.benefits.market.title')}
                    desc={t('cloudBackup.benefits.market.desc', { market: 'market.freekasir.com' })}
                  />
                  <BenefitItem
                    icon={<Sparkles className="w-4 h-4" />}
                    title={t('cloudBackup.benefits.growth.title')}
                    desc={t('cloudBackup.benefits.growth.desc')}
                  />
                </ul>
                {cheapestSyncPrice != null && (
                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    {t('cloudBackup.valueProp.priceNote', { price: rp(cheapestSyncPrice) })}
                  </p>
                )}
              </CardContent>
            </Card>

            {(showPlans || isLoggedIn) && (
              <>
                <SectionTitle>{t('cloudBackup.sections.choosePlan')}</SectionTitle>
                <Card id="cloud-plans">
                  <CardContent className="p-4 space-y-2">
                    <PlanList plans={syncPlans} busy={busy} currentPlanId={null} onSubscribe={handleSubscribe} rp={rp} t={t} />
                    <p className="text-[11px] text-muted-foreground text-center pt-1">
                      {t('cloudBackup.valueProp.stopAnytime')}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )
      )}

      {/* 6. Pengaturan cadangan */}
      {isSyncSubscribed && (
        <>
          <SectionTitle>{t('cloudBackup.sections.backupSettings')}</SectionTitle>
          <Card>
            <CardContent className="p-4 divide-y">
              <MenuRow
                to="/settings/cloud-backup/auto"
                icon={<Clock className="w-4 h-4" />}
                title={t('cloudBackup.row.schedule.title')}
                subtitle={intervalLabel}
                badge={interval === 'off' ? t('cloudBackup.badge.inactive') : t('cloudBackup.badge.active')}
                badgeTone={interval === 'off' ? 'neutral' : 'success'}
              />
              <MenuRow
                to="/settings/cloud-backup/stores"
                icon={<Store className="w-4 h-4" />}
                title={t('cloudBackup.row.store.title')}
                subtitle={
                  activeStore
                    ? maxStores
                      ? t('cloudBackup.row.store.usage', { name: activeStore.name, used: stores.length, max: maxStores })
                      : activeStore.name
                    : t('cloudBackup.row.store.none')
                }
                badge={activeStore ? undefined : t('cloudBackup.badge.attention')}
                badgeTone="danger"
              />
              <MenuRow
                to="/settings/backup-restore"
                icon={<HardDrive className="w-4 h-4" />}
                title={t('cloudBackup.row.localBackup.title')}
                subtitle={
                  storeSettings?.lastBackupAt
                    ? t('cloudBackup.row.localBackup.last', { time: relative(new Date(storeSettings.lastBackupAt)) })
                    : t('cloudBackup.row.localBackup.subtitle')
                }
              />
            </CardContent>
          </Card>

          <SectionTitle>{t('cloudBackup.sections.onlineServices')}</SectionTitle>
          <Card>
            <CardContent className="p-4 divide-y">
              <MenuRow
                href="https://dashboard.kankitu.com"
                icon={<BarChart3 className="w-4 h-4" />}
                title={t('cloudBackup.row.dashboard.title')}
                subtitle="dashboard.kankitu.com"
              />
              <MenuRow
                to="/settings/cloud-backup/online-store"
                icon={<Globe className="w-4 h-4" />}
                title={t('cloudBackup.row.onlineStore.title')}
                subtitle={
                  activeStore?.isPublic
                    ? t('cloudBackup.row.onlineStore.public')
                    : t('cloudBackup.row.onlineStore.private')
                }
                badge={activeStore?.isPublic ? t('cloudBackup.badge.active') : t('cloudBackup.badge.inactive')}
                badgeTone={activeStore?.isPublic ? 'success' : 'neutral'}
              />
            </CardContent>
          </Card>

          {usage && usage.limitMb > 0 && (
            <>
              <SectionTitle>{t('cloudBackup.sections.storage')}</SectionTitle>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground text-sm">
                      {t('cloudBackup.storageCard.used', { used: fmtMb(usage.usedMb) })}
                    </span>
                    <span>{t('cloudBackup.storageCard.limit', { limit: fmtMb(usage.limitMb) })}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${usage.usedMb / usage.limitMb > 0.9 ? 'bg-warning' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, (usage.usedMb / usage.limitMb) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('cloudBackup.storageCard.stored', { count: backupCount })}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* 7. Langganan & akun */}
      {isLoggedIn && (
        <>
          <SectionTitle>{t('cloudBackup.sections.subscriptionAccount')}</SectionTitle>
          <Card>
            <CardContent className="p-4 divide-y">
              {isSyncSubscribed && subscription && (
                <div className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {t('cloudBackup.row.subscription.title', { name: subscription.plan.name })}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {subscription.endDate
                        ? t('cloudBackup.row.subscription.until', {
                            date: format(new Date(subscription.endDate), 'dd MMM yyyy', { locale: dateLocale }),
                            days: daysLeft ?? 0,
                          })
                        : t('cloudBackup.row.subscription.none')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    disabled={busy === `checkout:${subscription.planId}`}
                    onClick={() => handleSubscribe(subscription.planId)}
                  >
                    {busy === `checkout:${subscription.planId}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t('cloudBackup.subscription.renew')
                    )}
                  </Button>
                </div>
              )}

              <MenuRow
                to="/settings/cloud-backup/history"
                icon={<History className="w-4 h-4" />}
                title={t('cloudBackup.row.history.title')}
                subtitle={t('cloudBackup.menu.history.subtitle')}
              />

              <div className="flex items-center gap-3 py-3 last:pb-0">
                {googleUser?.picture ? (
                  <img src={googleUser.picture} alt="" className="w-9 h-9 rounded-full shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                    {googleUser?.name?.charAt(0) ?? '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{googleUser?.email ?? t('cloudBackup.account.fallbackName')}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{t('cloudBackup.row.account.subtitle')}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground shrink-0" onClick={logout}>
                  <LogOut className="w-4 h-4" /> {t('cloudBackup.account.logout')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 8. Jaring pengaman — terlihat di semua kondisi */}
      {!isSyncSubscribed && (
        <>
          <SectionTitle>{t('cloudBackup.sections.alwaysAvailable')}</SectionTitle>
          <Card>
            <CardContent className="p-4">
              <MenuRow
                to="/settings/backup-restore"
                icon={<HardDrive className="w-4 h-4" />}
                title={t('cloudBackup.row.localBackup.title')}
                subtitle={t('cloudBackup.row.localBackup.safe')}
              />
            </CardContent>
          </Card>
        </>
      )}

      {!isLoggedIn && (
        <p className="text-center text-[11px] text-muted-foreground px-4">{t('cloudBackup.valueProp.privacy')}</p>
      )}

      <Dialog open={!!pendingTxId} onOpenChange={(o) => !o && closePaymentModal()}>
        <DialogContent className="max-w-[88vw] rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('cloudBackup.paymentDialog.title')}</DialogTitle>
            <DialogDescription className="text-center">
              {t('cloudBackup.paymentDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3 py-2">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
              <Loader2 className="w-16 h-16 absolute inset-0 text-primary animate-spin" style={{ animationDuration: '1.5s' }} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t('cloudBackup.paymentDialog.checking')}
            </p>
          </div>

          <div className="space-y-2">
            <Button className="w-full h-10 gap-2" disabled={busy === 'verify'} onClick={() => checkPayment(false)}>
              {busy === 'verify' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {t('cloudBackup.paymentDialog.iHavePaid')}
            </Button>
            {paymentLink && (
              <Button
                variant="outline"
                className="w-full h-10 gap-2"
                onClick={() => void openCheckout(paymentLink)}
              >
                <ExternalLink className="w-4 h-4" />
                {t('cloudBackup.paymentDialog.openPaymentPage')}
              </Button>
            )}
            <Button variant="ghost" className="w-full h-9 text-muted-foreground" onClick={closePaymentModal}>
              {t('cloudBackup.paymentDialog.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// --- Hero status ---

type Tone = 'safe' | 'risk' | 'idle';

/**
 * Shark tidak mengenal blok gradient penuh: status dibedakan lewat border +
 * latar tint tipis, sama seperti varian Alert.
 */
const HERO_TONE: Record<Tone, string> = {
  safe: 'bg-card border border-success/30 text-foreground',
  risk: 'bg-destructive/5 border border-destructive/30 text-foreground',
  idle: 'bg-card border border-border text-foreground',
};

function StatusHero({
  tone,
  icon,
  title,
  description,
  children,
}: {
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const blob = {
    safe: 'bg-success/10 text-success-text',
    risk: 'bg-destructive/10 text-destructive-text',
    idle: 'bg-primary/10 text-primary',
  }[tone];
  return (
    <div className={`rounded-xl p-5 text-center space-y-3 shadow-xs ${HERO_TONE[tone]}`}>
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${blob}`}>{icon}</div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold leading-snug">{title}</h2>
        {description && (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/50 px-2 py-2">
      <p className="truncate text-[13px] font-semibold">{value}</p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

// --- Banner peringatan ---

function Banner({ tone, icon, children }: { tone: 'warn' | 'bad' | 'info'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = {
    warn: 'border-warning/30 bg-warning/5 [&>span]:text-warning',
    bad: 'border-destructive/30 bg-destructive/5 [&>span]:text-destructive',
    info: 'border-info/30 bg-info/5 [&>span]:text-info',
  }[tone];
  return (
    <div className={`flex gap-2 rounded-xl border px-3.5 py-3 text-[13px] leading-snug ${cls}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// --- Judul seksi ---

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`px-1 pt-2 text-sm font-semibold text-foreground ${className}`}>
      {children}
    </p>
  );
}

// --- Baris menu ---

interface MenuRowProps {
  to?: string;
  href?: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: 'success' | 'neutral' | 'danger';
  tone?: 'primary' | 'success';
  /** Dirender sebagai kartu sendiri, bukan baris di dalam daftar. */
  standalone?: boolean;
}

function MenuRow({ to, href, icon, title, subtitle, badge, badgeTone = 'neutral', tone = 'primary', standalone }: MenuRowProps) {
  const badgeVariant = ({ success: 'success', neutral: 'secondary', danger: 'destructive' } as const)[badgeTone];
  const iconCls = tone === 'success' ? 'bg-success/10 text-success-text' : 'bg-primary/10 text-primary';

  const body = (
    <div className={standalone ? 'flex items-center gap-3 p-3.5' : 'flex items-center gap-3 py-3 first:pt-0 last:pb-0'}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">{title}</p>
        <p className="truncate text-[13px] leading-snug text-muted-foreground">{subtitle}</p>
      </div>
      {badge && (
        <Badge variant={badgeVariant} size="sm" className="shrink-0">
          {badge}
        </Badge>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );

  const wrapped = standalone ? <Card className="overflow-hidden cursor-pointer">{body}</Card> : body;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {wrapped}
      </a>
    );
  }
  return (
    <Link to={to!} className="block">
      {wrapped}
    </Link>
  );
}

// --- Checklist aktivasi ---

function SetupChecklist({
  loggedIn,
  subscribed,
  storeLinked,
  email,
  onSeePlans,
}: {
  loggedIn: boolean;
  subscribed: boolean;
  storeLinked: boolean;
  email?: string;
  onSeePlans: () => void;
}) {
  const { t } = useTranslation('settings');
  const steps = [
    { done: loggedIn, title: t('cloudBackup.setup.step1.title'), desc: email ?? t('cloudBackup.setup.step1.desc'), action: null },
    {
      done: subscribed,
      title: t('cloudBackup.setup.step2.title'),
      desc: t('cloudBackup.setup.step2.desc'),
      action: (
        <Button size="sm" className="h-8 text-xs mt-2" onClick={onSeePlans}>
          {t('cloudBackup.action.seePlans')}
        </Button>
      ),
    },
    {
      done: storeLinked,
      title: t('cloudBackup.setup.step3.title'),
      desc: t('cloudBackup.setup.step3.desc'),
      action: (
        <Link to="/settings/cloud-backup/stores">
          <Button size="sm" variant="outline" className="h-8 text-xs mt-2">
            {t('cloudBackup.setup.chooseStore')}
          </Button>
        </Link>
      ),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p className="text-sm font-semibold">{t('cloudBackup.setup.title')}</p>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('cloudBackup.setup.progress', { done: doneCount, total: steps.length })}
        </p>
        <div className="divide-y pt-1">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-3 py-3 first:pt-1 last:pb-0">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-medium ${
                  step.done
                    ? 'bg-success text-success-foreground'
                    : i === currentIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{step.title}</p>
                <p className="text-[11px] text-muted-foreground leading-snug truncate">{step.desc}</p>
                {!step.done && i === currentIndex && step.action}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Daftar paket ---

function PlanList({
  plans,
  busy,
  currentPlanId,
  onSubscribe,
  rp,
  t,
}: {
  plans: Plan[];
  busy: string | null;
  currentPlanId: string | null;
  onSubscribe: (planId: string) => void;
  rp: (n: number) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (plans.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-2">{t('cloudBackup.subscription.loadingPlans')}</p>;
  }
  return (
    <>
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const storeLimit = plan.maxStores;
        return (
          <div
            key={plan.id}
            className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${isCurrent ? 'border-primary/40 bg-primary/5' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {plan.name}
                {isCurrent && <span className="ml-1.5 text-[11px] font-medium text-primary">{t('cloudBackup.subscription.activePlan')}</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {rp(plan.price)} {t('cloudBackup.hero.perMonth')}
                {storeLimit != null && (
                  <>
                    {' · '}
                    {storeLimit >= 999999
                      ? t('cloudBackup.subscription.unlimitedStores')
                      : t('cloudBackup.subscription.store', { count: storeLimit })}
                  </>
                )}
              </p>
            </div>
            <Button
              size="sm"
              className="h-8 shrink-0"
              disabled={busy === `checkout:${plan.id}`}
              onClick={() => onSubscribe(plan.id)}
            >
              {busy === `checkout:${plan.id}` ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrent ? (
                t('cloudBackup.subscription.renew')
              ) : (
                t('cloudBackup.subscription.subscribe')
              )}
            </Button>
          </div>
        );
      })}
    </>
  );
}

// --- Benefit item (marketing highlight) ---

function BenefitItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
      </div>
    </li>
  );
}
