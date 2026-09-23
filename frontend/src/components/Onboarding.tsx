import { useState, useMemo, useEffect } from 'react';
import {
  Store, MapPin, Phone, ChevronRight, ChevronLeft, ChevronDown, Check, Plus,
  Shield, Sparkles, Upload, Cloud, Loader2, DownloadCloud, LogOut, Users,
} from '@/components/icons';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { Badge } from '@/components/jokoui/badge';
import { Card } from '@/components/jokoui/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/jokoui/item';
import { SegmentGroup } from '@/components/jokoui/segment-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/jokoui/avatar';
import { GoogleMark } from '@/components/GoogleMark';
import { db } from '@/lib/db';
import { markAllFeaturesSeen } from '@/lib/whats-new';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { isNativePlatform } from '@/lib/printer';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { GoogleLogin } from '@react-oauth/google';
import { listBackups, downloadBackup, acceptStoreInvite, type CloudBackup } from '@/lib/cloud-api';
import { syncCloudMembers } from '@/lib/members';
import { pullSyncData } from '@/lib/sync';
import { nativeGoogleSignIn } from '@/lib/google-auth';
import { restoreFromBackupData } from '@/lib/backup';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { BUSINESS_TYPES, BUSINESS_TYPE_KEYS, markUserTypeAnswered, submitUserType, type BusinessType } from '@/lib/user-type';
import { businessModeFromType } from '@/lib/business-mode';
import { BUSINESS_ICONS, BUSINESS_SEEDS, applyBusinessSeed, hasSampleProducts, seedPreviewChips, type AppliedSeed } from '@/lib/business-seed';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface OnboardingProps {
  onComplete: () => void;
  /**
   * Layar sambutan + pemilih bahasa sudah ditangani `AuthGate`, jadi wizard
   * ini langsung mulai dari pertanyaan jenis usaha.
   */
  skipWelcome?: boolean;
  /** Buka panel pulihkan-backup begitu tampil (dipilih dari gerbang akun). */
  openRestoreOnMount?: boolean;
  /** Kembali ke gerbang akun dari langkah pertama; tanpa ini tombolnya disembunyikan. */
  onBackToGate?: () => void;
}

/**
 * Onboarding 3 layar: sambutan → jenis usaha → nama toko, ditutup layar sukses.
 *
 * Tutorial slide sengaja tidak ada lagi — edukasi dipindah ke kartu checklist
 * "Siapkan toko" di beranda, yang mengajar sambil user bekerja. Prompt install
 * PWA juga pindah ke beranda (setelah transaksi pertama), karena user baru
 * belum punya alasan untuk memasang aplikasi yang belum pernah dia pakai.
 */
export default function Onboarding({
  onComplete,
  skipWelcome = false,
  openRestoreOnMount = false,
  onBackToGate,
}: OnboardingProps) {
  const { t, i18n } = useTranslation(['onboarding', 'reports']);
  const isNative = useMemo(() => isNativePlatform(), []);
  // Dipanggil agar event `beforeinstallprompt` tetap tertangkap sejak awal;
  // promptnya sendiri baru ditawarkan di beranda.
  usePWAInstall();

  const [step, setStep] = useState<0 | 1 | 2>(skipWelcome ? 1 : 0);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [withSamples, setWithSamples] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<AppliedSeed | null>(null);

  const [restoring, setRestoring] = useState(false);
  const [showRestore, setShowRestore] = useState(openRestoreOnMount);
  const { isLoggedIn: cloudLoggedIn, login: cloudLogin, googleUser: cloudUser, logout: cloudLogout } = useCloudAuth();
  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudRestoringId, setCloudRestoringId] = useState<string | null>(null);
  const [cloudLoginBusy, setCloudLoginBusy] = useState(false);

  // Jalur karyawan: gabung ke toko orang lain pakai kode undangan, bukan
  // membuat toko baru. Tanpa ini, karyawan yang baru install terpaksa membuat
  // toko sendiri lalu terjebak dengan data kosong yang bukan milik siapa pun.
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const samplesAvailable = businessType ? hasSampleProducts(businessType) : false;
  // `i18n.language` bisa berisi region ("en-US") sehingga tidak pernah sama
  // dengan kode di SUPPORTED_LANGUAGES — bandingkan bagian bahasanya saja,
  // kalau tidak tak ada satu pun kartu bahasa yang tampak terpilih.
  const activeLang = (i18n.resolvedLanguage ?? i18n.language ?? '').split('-')[0];

  const handleNativeCloudLogin = async () => {
    setCloudLoginBusy(true);
    try {
      const idToken = await nativeGoogleSignIn();
      await cloudLogin(idToken);
    } catch {
      toast.error(t('toast.googleLoginFailed'));
    } finally {
      setCloudLoginBusy(false);
    }
  };

  const handleRestore = () => {
    if (restoring) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setRestoring(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        // Tutup sheet SEBELUM restore — lihat catatan di handleCloudRestore.
        setShowRestore(false);
        await restoreFromBackupData(data);
        await finishAfterRestore(t('toast.restoreSuccess'));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.restoreError'));
      } finally {
        setRestoring(false);
      }
    };
    input.click();
  };

  // Tutup wizard onboarding setelah restore berhasil (paksa onboardingDone).
  const finishAfterRestore = async (successMsg: string) => {
    const s = await db.storeSettings.toCollection().first();
    if (s?.id) {
      await db.storeSettings.update(s.id, { onboardingDone: true });
    } else {
      await db.storeSettings.add({
        storeName: 'Toko Saya',
        address: '',
        phone: '',
        receiptFooter: 'Terima kasih atas kunjungan Anda!',
        printLogo: false,
        onboardingDone: true,
        lastBackupAt: null,
        deviceId: crypto.randomUUID(),
      });
    }
    await markAllFeaturesSeen();
    toast.success(successMsg);
    onComplete();
  };

  const loadCloudBackups = async () => {
    setCloudLoading(true);
    try {
      const { items } = await listBackups({ page: 1, limit: 50 });
      setCloudBackups(items);
    } catch {
      toast.error(t('toast.cloudLoadError'));
    } finally {
      setCloudLoading(false);
    }
  };

  // Saat login cloud berhasil & panel terbuka, ambil daftar backup.
  useEffect(() => {
    if (showRestore && cloudLoggedIn) loadCloudBackups();
  }, [showRestore, cloudLoggedIn]);

  const handleCloudRestore = async (backup: CloudBackup) => {
    if (cloudRestoringId) return;
    // Tutup sheet LEBIH DULU. Restore akan menulis onboardingDone=true yang
    // memicu AppLayout melepas Onboarding; jika sheet masih terbuka saat itu,
    // Radix meninggalkan `pointer-events:none` di body → layar freeze.
    setShowRestore(false);
    setCloudRestoringId(backup.id);
    setRestoring(true);
    const toastId = toast.loading(t('restore.restoring'));
    try {
      const data = await downloadBackup(backup.id);
      await restoreFromBackupData(data);
      toast.dismiss(toastId);
      await finishAfterRestore(t('toast.cloudRestoreSuccess'));
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : t('toast.cloudRestoreError'));
      setShowRestore(true); // buka lagi agar user bisa coba lagi
    } finally {
      setCloudRestoringId(null);
      setRestoring(false);
    }
  };

  /**
   * Menerima undangan lalu menyiapkan perangkat ini sebagai perangkat kerja
   * karyawan: pengaturan toko dibuat seperlunya dan langsung diikat ke toko
   * cloud, tanpa seed produk contoh — katalognya milik pemilik toko.
   */
  const handleJoinStore = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || joining) return;
    setJoining(true);
    try {
      const { store } = await acceptStoreInvite(code);

      const existing = await db.storeSettings.toCollection().first();
      const patch = {
        storeName: store.name,
        onboardingDone: true,
        cloudStoreId: store.id,
        // Perangkat karyawan hampir selalu dipakai bergantian, jadi login
        // per-orang diaktifkan sejak awal.
        multiUserEnabled: true,
      };
      if (existing?.id) {
        await db.storeSettings.update(existing.id, patch);
      } else {
        await db.storeSettings.add({
          ...patch,
          address: '',
          phone: '',
          receiptFooter: 'Terima kasih atas kunjungan Anda!',
          printLogo: false,
          lastBackupAt: null,
          deviceId: crypto.randomUUID(),
        });
      }

      // Tarik daftar anggota supaya karyawan langsung punya baris user lokal
      // untuk menetapkan PIN-nya sendiri.
      await syncCloudMembers(store.id).catch(() => undefined);

      // Tarik katalog pemilik. Tanpa ini karyawan masuk ke layar kasir yang
      // kosong dan menyangka aplikasinya rusak.
      try {
        const tarik = await pullSyncData(store.id);
        if (tarik.applied > 0) toast.success(t('join.pulled', { count: tarik.applied }));
      } catch {
        toast.warning(t('join.pullFailed'));
      }

      await markAllFeaturesSeen();
      setShowJoin(false);
      toast.success(t('join.success', { name: store.name }));
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('join.failed'));
    } finally {
      setJoining(false);
    }
  };

  const handleFinish = async () => {
    if (!storeName.trim() || !businessType || saving) return;
    setSaving(true);
    try {
      const existing = await db.storeSettings.toCollection().first();
      const patch = {
        storeName: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        onboardingDone: true,
        // Mode kasir diturunkan dari jenis usaha yang sudah dipilih di step 1;
        // bisa ditimpa lewat Pengaturan → Toko.
        businessMode: businessModeFromType(businessType),
      };
      if (existing?.id) {
        await db.storeSettings.update(existing.id, patch);
      } else {
        await db.storeSettings.add({
          ...patch,
          deviceId: crypto.randomUUID(),
          receiptFooter: 'Terima kasih atas kunjungan Anda!',
          printLogo: false,
          lastBackupAt: null,
        });
      }

      const applied = await applyBusinessSeed(businessType, {
        withSampleProducts: withSamples && samplesAvailable,
      });

      // Jenis usaha sudah dijawab di sini, jadi survei di halaman Laporan
      // tidak perlu menginterupsi lagi.
      markUserTypeAnswered();
      void submitUserType(businessType);

      // Fresh installs shouldn't see the "What's New" modal for shipped
      // features that exist at install time — those aren't new to them.
      await markAllFeaturesSeen();

      setDone(applied);
      // Layar sukses bukan langkah: tampil sebentar lalu melepas wizard.
      setTimeout(onComplete, 1400);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.setupError'));
      setSaving(false);
    }
  };

  const typeLabel = (type: BusinessType) =>
    t(`reports:survey.types.${BUSINESS_TYPE_KEYS[BUSINESS_TYPES.indexOf(type)]}`);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] mx-auto max-w-lg overflow-hidden bg-background md:max-w-2xl"
      style={{ height: '100dvh' }}
    >
      {done ? (
        <SuccessScreen storeName={storeName.trim()} applied={done} t={t} />
      ) : (
        <div className="flex h-full flex-col">
          {/* Header: back + progress dots (layar sambutan tanpa keduanya) */}
          {step > 0 && (
            <div className="flex h-12 shrink-0 items-center justify-between px-4 pt-3">
              {step === 1 && skipWelcome ? (
                onBackToGate ? (
                  <Button variant="outline" size="icon" onClick={onBackToGate} aria-label={t('navigation.back')}>
                    <ChevronLeft />
                  </Button>
                ) : (
                  <div className="w-9" aria-hidden="true" />
                )
              ) : (
                <Button variant="outline" size="icon" onClick={() => setStep(s => (s - 1) as 0 | 1)} aria-label={t('navigation.back')}>
                  <ChevronLeft />
                </Button>
              )}
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {[1, 2].map(i => (
                  <span
                    key={i}
                    className={cn('h-1 w-6 rounded-full transition-colors duration-300', i <= step ? 'bg-primary' : 'bg-muted')}
                  />
                ))}
              </div>
              <div className="w-9" aria-hidden="true" />
            </div>
          )}

          {step === 0 && (
            <div key="welcome" className="flex min-h-0 flex-1 animate-in flex-col fade-in duration-300">
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-primary">
                  <img src="/header-icon.png" alt="KanPOS" className="h-10 w-10 object-contain" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-title font-semibold tracking-tight">KanPOS</h1>
                  <p className="mx-auto max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
                    {t('welcome.tagline')}
                  </p>
                </div>

                <div className="w-full max-w-xs space-y-2 pt-2">
                  <Label className="block text-center text-muted-foreground">{t('language.title')}</Label>
                  {/* Pilihan bahasa = item outline yang bisa dipilih */}
                  <div className="grid grid-cols-3 gap-2">
                    {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => {
                      const active = activeLang === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => i18n.changeLanguage(code as SupportedLanguage)}
                          aria-pressed={active}
                          className={cn(
                            'flex h-14 flex-col items-center justify-center gap-1 rounded-xl border bg-card shadow-xs transition-colors',
                            active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                          )}
                        >
                          <span className="text-lg leading-none">{flag}</span>
                          <span className={cn('text-2xs font-medium leading-none', active ? 'text-primary' : 'text-muted-foreground')}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className="space-y-2.5 px-4 pt-4"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
              >
                <Button size="xl" className="w-full" onClick={() => setStep(1)}>
                  {t('welcome.cta')}
                  <ChevronRight />
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowRestore(true)}>
                  <Upload />
                  {t('welcome.restoreCta')}
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowJoin(true)}>
                  <Users />
                  {t('welcome.joinCta')}
                </Button>
                <p className="pt-1 text-center text-2xs leading-relaxed text-muted-foreground">
                  {t('tnc.prefix')}{' '}
                  <a
                    href="https://freekasir.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    {t('tnc.terms')}
                  </a>{' '}
                  {t('tnc.and')}{' '}
                  <a
                    href="https://freekasir.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    {t('tnc.privacy')}
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div key="business" className="flex min-h-0 flex-1 animate-in flex-col slide-in-from-right-4 fade-in duration-300">
              <div className="space-y-1.5 px-4 pb-3 pt-3">
                <h2 className="text-title font-semibold tracking-tight">{t('business.title')}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{t('business.subtitle')}</p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4">
                <div className="grid grid-cols-2 gap-2 pb-2">
                  {BUSINESS_TYPES.map(type => {
                    const active = businessType === type;
                    return (
                      <Item
                        key={type}
                        asChild
                        interactive
                        className={cn('h-auto', active && 'border-primary bg-primary/5')}
                      >
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setBusinessType(type);
                            setWithSamples(hasSampleProducts(type));
                          }}
                          className="text-left"
                        >
                          <ItemMedia tone={active ? 'primary' : 'muted'} size="sm" className="text-base leading-none">
                            {BUSINESS_ICONS[type]}
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle className="text-xsm leading-tight">{typeLabel(type)}</ItemTitle>
                          </ItemContent>
                          {active && (
                            <ItemActions>
                              <Check className="h-4 w-4 text-primary" />
                            </ItemActions>
                          )}
                        </button>
                      </Item>
                    );
                  })}
                </div>
              </div>

              <div
                className="space-y-2.5 px-4 pt-3"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
              >
                {businessType && (
                  <Alert variant="info" className="animate-in fade-in duration-200">
                    <Sparkles />
                    <AlertTitle>{t('business.prepared', { type: typeLabel(businessType) })}</AlertTitle>
                    <AlertDescription>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {seedPreviewChips(businessType).map(chip => (
                          <Badge key={chip} variant="secondary" size="sm">
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                <Button size="xl" className="w-full" disabled={!businessType} onClick={() => setStep(2)}>
                  {t('navigation.next')}
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div key="store" className="flex min-h-0 flex-1 animate-in flex-col slide-in-from-right-4 fade-in duration-300">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-3">
                <div className="space-y-1.5">
                  <h2 className="text-title font-semibold tracking-tight">{t('store.title')}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t('store.subtitle')}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="storeName" className="flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    {t('store.storeName')} <span className="text-destructive-text">*</span>
                  </Label>
                  <Input
                    id="storeName"
                    autoFocus
                    placeholder={t('store.storeNamePlaceholder')}
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                  />
                </div>

                {showOptional ? (
                  <div className="animate-in space-y-3 fade-in duration-200">
                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {t('store.address')}
                      </Label>
                      <Input
                        id="address"
                        placeholder={t('store.addressPlaceholder')}
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {t('store.phone')}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t('store.phonePlaceholder')}
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full justify-between text-muted-foreground" onClick={() => setShowOptional(true)}>
                    <span className="flex items-center gap-2">
                      <Plus />
                      {t('store.optionalToggle')}
                    </span>
                    <ChevronDown />
                  </Button>
                )}

                {samplesAvailable && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      {t('store.sampleTitle')}
                    </Label>
                    <SegmentGroup
                      layout="full"
                      value={withSamples ? 'on' : 'off'}
                      onValueChange={v => setWithSamples(v === 'on')}
                      items={[
                        { value: 'on', label: t('store.sampleOn') },
                        { value: 'off', label: t('store.sampleOff') },
                      ]}
                    />
                    <p className="text-xs text-muted-foreground">
                      {withSamples
                        ? t('store.sampleOnDesc', { count: businessType ? BUSINESS_SEEDS[businessType].products.length : 0 })
                        : t('store.sampleOffDesc')}
                    </p>
                  </div>
                )}

                <Alert variant="success">
                  <Shield />
                  <AlertTitle>{t('store.safeTitle')}</AlertTitle>
                  <AlertDescription>{t('store.safeDesc')}</AlertDescription>
                </Alert>
              </div>

              <div
                className="px-4 pt-3"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
              >
                <Button size="xl" className="w-full" onClick={handleFinish} disabled={!storeName.trim() || saving} isLoading={saving}>
                  {saving ? t('navigation.saving') : t('store.cta')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sheet restore — file lokal & cloud */}
      <Sheet open={showJoin} onOpenChange={open => !joining && setShowJoin(open)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="size-4.5 text-primary" />
              {t('join.title')}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">{t('join.desc')}</p>
          </SheetHeader>

          <div className="space-y-3 py-4">
            {!cloudLoggedIn ? (
              <div className="space-y-3 py-1 text-center">
                <p className="text-xsm text-muted-foreground">{t('join.loginFirst')}</p>
                <div className="flex justify-center">
                  {isNative ? (
                    <Button variant="outline" size="xl" className="w-full" disabled={cloudLoginBusy} isLoading={cloudLoginBusy} onClick={handleNativeCloudLogin}>
                      <GoogleMark />
                      {t('restore.googleContinue')}
                    </Button>
                  ) : (
                    <GoogleLogin
                      onSuccess={(cr) => {
                        if (cr.credential) cloudLogin(cr.credential).catch(() => toast.error(t('toast.googleLoginFailed')));
                        else toast.error(t('toast.googleLoginFailed'));
                      }}
                      onError={() => toast.error(t('toast.googleLoginFailed'))}
                    />
                  )}
                </div>
              </div>
            ) : (
              <>
                <Item>
                  <Avatar size="sm">
                    {cloudUser?.picture && <AvatarImage src={cloudUser.picture} alt="" referrerPolicy="no-referrer" />}
                    <AvatarFallback>{cloudUser?.name?.charAt(0) ?? '?'}</AvatarFallback>
                  </Avatar>
                  <ItemContent>
                    <ItemTitle className="truncate">{cloudUser?.name ?? t('restore.account')}</ItemTitle>
                    <ItemDescription className="truncate">{cloudUser?.email}</ItemDescription>
                  </ItemContent>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    disabled={joining}
                    onClick={() => cloudLogout()}
                  >
                    <LogOut className="h-4 w-4" /> {t('restore.switchAccount')}
                  </Button>
                </Item>

                <div className="space-y-1.5">
                  <Label>{t('join.codeLabel')}</Label>
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABCD2345"
                    maxLength={8}
                    className="h-11 text-center text-xl font-semibold tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">{t('join.codeHint')}</p>
                </div>

                <Button size="xl" className="w-full" disabled={!joinCode.trim() || joining} isLoading={joining} onClick={handleJoinStore}>
                  {t('join.submit')}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showRestore} onOpenChange={open => !cloudRestoringId && setShowRestore(open)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Upload className="size-4.5 text-primary" />
              {t('restore.title')}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">{t('restore.desc')}</p>
          </SheetHeader>

          <div className="space-y-3 py-4">
            <Button variant="outline" size="xl" className="w-full" onClick={handleRestore} disabled={restoring} isLoading={restoring}>
              <Upload />
              {restoring ? t('restore.restoring') : t('restore.backupButton')}
            </Button>

            <div className="flex items-center gap-3 pt-1">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t('restore.or')}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Card className="space-y-3 p-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('restore.cloudTitle')}</h3>
              </div>

              {!cloudLoggedIn ? (
                <div className="space-y-3 py-1 text-center">
                  <p className="text-xsm text-muted-foreground">{t('restore.cloudLogin')}</p>
                  <div className="flex justify-center">
                    {isNative ? (
                      <Button variant="outline" size="xl" className="w-full" disabled={cloudLoginBusy} isLoading={cloudLoginBusy} onClick={handleNativeCloudLogin}>
                        <GoogleMark />
                        {t('restore.googleContinue')}
                      </Button>
                    ) : (
                      <GoogleLogin
                        onSuccess={(cr) => {
                          if (cr.credential) cloudLogin(cr.credential).catch(() => toast.error(t('toast.googleLoginFailed')));
                          else toast.error(t('toast.googleLoginFailed'));
                        }}
                        onError={() => toast.error(t('toast.googleLoginFailed'))}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Item>
                    <Avatar size="sm">
                      {cloudUser?.picture && <AvatarImage src={cloudUser.picture} alt="" referrerPolicy="no-referrer" />}
                      <AvatarFallback>{cloudUser?.name?.charAt(0) ?? '?'}</AvatarFallback>
                    </Avatar>
                    <ItemContent>
                      <ItemTitle className="truncate">{cloudUser?.name ?? t('restore.account')}</ItemTitle>
                      <ItemDescription className="truncate">{cloudUser?.email}</ItemDescription>
                    </ItemContent>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground"
                      disabled={!!cloudRestoringId}
                      onClick={() => { cloudLogout(); setCloudBackups([]); }}
                    >
                      <LogOut className="h-4 w-4" /> {t('restore.switchAccount')}
                    </Button>
                  </Item>

                  <div className="space-y-2">
                    {cloudLoading ? (
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : cloudBackups.length === 0 ? (
                      <p className="py-6 text-center text-xsm text-muted-foreground">{t('restore.noBackups')}</p>
                    ) : (
                      cloudBackups.map((b) => (
                        <Item key={b.id} asChild interactive>
                          <button
                            type="button"
                            disabled={!!cloudRestoringId}
                            onClick={() => handleCloudRestore(b)}
                            className="w-full text-left disabled:opacity-60"
                          >
                            <ItemMedia tone="primary" size="sm">
                              <DownloadCloud />
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle className="truncate">{b.fileName}</ItemTitle>
                              <ItemDescription>
                                {(b.fileSize / (1024 * 1024)).toFixed(2)} MB · {format(new Date(b.createdAt), 'dd MMM yyyy HH:mm')}
                              </ItemDescription>
                            </ItemContent>
                            {cloudRestoringId === b.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                          </button>
                        </Item>
                      ))
                    )}
                  </div>
                  {cloudRestoringId && (
                    <p className="text-center text-xs text-muted-foreground">{t('restore.restoringInProgress')}</p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Layar penutup — tampil ~1,4 detik lalu wizard dilepas. */
function SuccessScreen({
  storeName,
  applied,
  t,
}: {
  storeName: string;
  applied: AppliedSeed;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const lines = [
    applied.categories > 0 && t('success.categories', { count: applied.categories }),
    applied.products > 0 && t('success.products', { count: applied.products }),
    t('success.payments'),
  ].filter(Boolean) as string[];

  return (
    <div className="flex h-full animate-in flex-col items-center justify-center gap-6 px-4 text-center fade-in duration-300">
      <div className="flex h-16 w-16 animate-in items-center justify-center rounded-2xl bg-success text-white shadow-sm zoom-in-50 duration-500">
        <Check className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-title font-semibold tracking-tight">{t('success.title', { name: storeName })}</h2>
        <p className="text-sm text-muted-foreground">{t('success.subtitle')}</p>
      </div>
      <div className="w-full max-w-[17rem] space-y-2">
        {lines.map(line => (
          <div key={line} className="flex items-center gap-2.5 text-xsm text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-success/10 text-success-text">
              <Check className="h-3 w-3" />
            </span>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
