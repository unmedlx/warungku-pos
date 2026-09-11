import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Store, Users, Upload, Cloud, Loader2, Check, ChevronRight, ChevronLeft,
  Plus, Shield, DownloadCloud, AlertTriangle, Lock,
} from '@/components/icons';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { Badge } from '@/components/jokoui/badge';
import { Card } from '@/components/jokoui/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/jokoui/item';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/jokoui/avatar';
import { Progress } from '@/components/jokoui/progress';
import { GoogleLogin } from '@react-oauth/google';
import { GoogleMark } from '@/components/GoogleMark';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { nativeGoogleSignIn } from '@/lib/google-auth';
import { isNativePlatform } from '@/lib/printer';
import {
  fetchBootstrap, acceptStoreInvite,
  type BootstrapData, type CloudStore,
} from '@/lib/cloud-api';
import { hydrateStore, type HydrationStep } from '@/lib/store-hydration';
import { db, type User } from '@/lib/db';
import { cariUserTanpaPin } from '@/lib/members';
import { hashPin, isValidPin } from '@/lib/auth';
import { setSkippedAccountGate, hasSkippedAccountGate } from '@/lib/account-gate';
import Onboarding from '@/components/Onboarding';

/**
 * Gerbang akun di depan onboarding.
 *
 * Sebelum ini, instalasi baru langsung membuat toko lokal dan akun cloud hanya
 * muncul jauh di belakang, di Pengaturan. Akibatnya pemilik yang ganti HP tidak
 * punya cara memulihkan tokonya, dan karyawan terjebak membuat toko sendiri.
 *
 * Satu tombol Google menangani masuk **dan** daftar — backend membuat user pada
 * token pertama, jadi keduanya memang jalur yang sama. Percabangan setelahnya
 * ditentukan isi `/api/bootstrap`: punya toko → pilih, belum punya → buat,
 * punya undangan → gabung.
 */

type Mode = 'welcome' | 'loading' | 'picker' | 'join' | 'hydrating' | 'create' | 'pin';

interface AuthGateProps {
  onComplete: () => void;
}

export default function AuthGate({ onComplete }: AuthGateProps) {
  const { t, i18n } = useTranslation(['onboarding']);
  const native = useMemo(() => isNativePlatform(), []);
  const { isLoggedIn, googleUser, login, logout, restoringSession } = useCloudAuth();

  const [mode, setMode] = useState<Mode>(() => (hasSkippedAccountGate() ? 'create' : 'welcome'));
  const [busy, setBusy] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openRestore, setOpenRestore] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [hydrStep, setHydrStep] = useState<HydrationStep>('settings');
  const [hydrStore, setHydrStore] = useState<CloudStore | null>(null);

  // Karyawan yang baru masuk lewat undangan belum punya PIN di HP ini —
  // `syncCloudMembers` sengaja membuat barisnya dengan `pinHash` kosong.
  const [pinUser, setPinUser] = useState<User | null>(null);

  const activeLang = (i18n.resolvedLanguage ?? i18n.language ?? '').split('-')[0];

  /** Ambil daftar toko lalu tentukan layar berikutnya. */
  const loadAndBranch = useCallback(async () => {
    setMode('loading');
    try {
      const data = await fetchBootstrap();
      setBootstrap(data);

      if (data.stores.length === 1) {
        await runHydration(data.stores[0]);
        return;
      }
      if (data.stores.length > 1) {
        setSelectedId(data.stores[0].id);
        setMode('picker');
        return;
      }
      // Belum punya toko: kalau ada undangan untuk emailnya, tawarkan gabung dulu.
      setMode(data.pendingInvites.length > 0 ? 'join' : 'create');
    } catch {
      // Backend tak terjangkau — jangan kunci user di gerbang, biarkan lanjut
      // membuat toko lokal. Toko akan didaftarkan ke cloud saat online.
      toast.error(t('auth.bootstrapFailed'));
      setMode('create');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // Sesi lama sudah dipulihkan → langsung lewati layar sambutan.
  useEffect(() => {
    if (restoringSession) return;
    if (isLoggedIn && mode === 'welcome') void loadAndBranch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoringSession, isLoggedIn]);

  const handleGoogleToken = async (idToken: string) => {
    setBusy(true);
    try {
      await login(idToken);
      setSkippedAccountGate(false);
      await loadAndBranch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.googleLoginFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleNativeLogin = async () => {
    setBusy(true);
    try {
      const idToken = await nativeGoogleSignIn();
      await handleGoogleToken(idToken);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.googleLoginFailed'));
    } finally {
      setBusy(false);
    }
  };

  async function runHydration(store: CloudStore) {
    setHydrStore(store);
    setHydrStep('settings');
    setMode('hydrating');
    try {
      const hasil = await hydrateStore(store, (p) => setHydrStep(p.step));
      if (hasil.warnings.includes('data')) toast.warning(t('join.pullFailed'));
      else if (hasil.applied > 0) toast.success(t('join.pulled', { count: hasil.applied }));

      // Tanpa PIN, `verifyLogin` selalu gagal dan karyawan langsung terkunci di
      // layar login begitu wizard ditutup. Jadi PIN dibuat di sini, bukan
      // ditunda ke menu Karyawan yang justru tidak bisa dia buka.
      const perluPin = await cariUserTanpaPin(googleUser?.email ?? null);
      if (perluPin) {
        setPinUser(perluPin);
        setMode('pin');
        return;
      }
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('auth.hydrateFailed'));
      setMode(bootstrap && bootstrap.stores.length > 1 ? 'picker' : 'create');
    }
  }

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || joining) return;
    setJoining(true);
    try {
      const { member, store } = await acceptStoreInvite(code);
      toast.success(t('join.success', { name: store.name }));
      // Endpoint undangan hanya mengembalikan id + nama toko; peran diambil
      // dari baris keanggotaan yang baru dibuat.
      await runHydration({ ...store, role: member.role } as CloudStore);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('join.failed'));
      setJoining(false);
    }
  };

  const lanjutTanpaAkun = (withRestore: boolean) => {
    setSkippedAccountGate(true);
    setOpenRestore(withRestore);
    setMode('create');
  };

  // Sesi tersimpan masih dipulihkan. Tanpa penjagaan ini layar sambutan
  // sempat berkedip sebelum `loadAndBranch` mengambil alih — user yang
  // sebenarnya sudah punya akun melihat tombol "Masuk" untuk sepersekian
  // detik, lalu layarnya berganti sendiri.
  if (restoringSession && mode === 'welcome' && !hasSkippedAccountGate()) {
    return (
      <div
        className="fixed inset-x-0 top-0 z-[100] mx-auto flex max-w-lg flex-col items-center justify-center gap-4 bg-background md:max-w-2xl"
        style={{ height: '100dvh' }}
      >
        <img src="/header-icon.png" alt="KanPOS" className="h-20 w-20 object-contain" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Wizard buat toko: komponen lama, dipakai apa adanya ───────────── */
  if (mode === 'create') {
    return (
      <Onboarding
        onComplete={onComplete}
        skipWelcome
        openRestoreOnMount={openRestore}
        onBackToGate={
          isLoggedIn || hasSkippedAccountGate()
            ? undefined
            : () => {
                setSkippedAccountGate(false);
                setMode('welcome');
              }
        }
      />
    );
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] mx-auto max-w-lg overflow-hidden bg-background md:max-w-2xl"
      style={{ height: '100dvh' }}
    >
      <div className="flex h-full flex-col">
        {mode === 'welcome' && (
          <WelcomeScreen
            t={t}
            busy={busy}
            native={native}
            activeLang={activeLang}
            onChangeLang={(code) => i18n.changeLanguage(code)}
            onNativeLogin={handleNativeLogin}
            onGoogleCredential={handleGoogleToken}
            onJoin={() => setMode('join')}
            onRestore={() => lanjutTanpaAkun(true)}
            onSkip={() => lanjutTanpaAkun(false)}
          />
        )}

        {mode === 'loading' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            {googleUser && <AccountRow user={googleUser} caption={t('auth.checking')} />}
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="max-w-[15rem] text-sm leading-relaxed text-muted-foreground">
              {t('auth.checkingDesc')}
            </p>
            <Button variant="ghost" className="text-muted-foreground" onClick={() => lanjutTanpaAkun(false)}>
              {t('auth.continueOffline')}
            </Button>
          </div>
        )}

        {mode === 'picker' && bootstrap && (
          <StorePicker
            t={t}
            data={bootstrap}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={() => {
              const store = bootstrap.stores.find((s) => s.id === selectedId);
              if (store) void runHydration(store);
            }}
            onCreateNew={() => {
              if (!bootstrap.canCreateStore) {
                toast.error(t('auth.storeQuotaReached', { count: bootstrap.maxStores }));
                return;
              }
              setMode('create');
            }}
            onSwitchAccount={() => {
              logout();
              setBootstrap(null);
              setMode('welcome');
            }}
          />
        )}

        {mode === 'join' && (
          <JoinScreen
            t={t}
            code={joinCode}
            onCode={setJoinCode}
            joining={joining}
            user={googleUser}
            isLoggedIn={isLoggedIn}
            busy={busy}
            native={native}
            invites={bootstrap?.pendingInvites ?? []}
            onNativeLogin={handleNativeLogin}
            onGoogleCredential={handleGoogleToken}
            onSubmit={handleJoin}
            onBack={() => setMode(isLoggedIn ? (bootstrap?.stores.length ? 'picker' : 'create') : 'welcome')}
          />
        )}

        {mode === 'hydrating' && <HydrationScreen t={t} step={hydrStep} storeName={hydrStore?.name ?? ''} />}

        {mode === 'pin' && pinUser && (
          <SetPinScreen
            t={t}
            user={pinUser}
            storeName={hydrStore?.name ?? ''}
            role={hydrStore?.role ?? 'STAFF'}
            onDone={onComplete}
          />
        )}
      </div>
    </div>
  );
}


/* ── Buat PIN kasir ──────────────────────────────────────────────────── */

/**
 * Akun Google = identitas di cloud. PIN = siapa yang sedang pegang kasir di HP
 * bersama. Dua lapis ini saling melengkapi, bukan saling menggantikan.
 *
 * PIN diminta dua kali di kotak yang sama: kalau salah ketik, karyawan akan
 * terkunci dari kasir sampai pemilik toko mereset PIN-nya.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SetPinScreen({ t, user, storeName, role, onDone }: any) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [stage, setStage] = useState<'set' | 'confirm'>('set');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const owner = role === 'OWNER';
  const value = stage === 'set' ? pin : confirm;
  const setValue = stage === 'set' ? setPin : setConfirm;

  const handleNext = () => {
    setError('');
    if (!isValidPin(pin)) {
      setError(t('pin.errorFormat'));
      return;
    }
    setStage('confirm');
  };

  const handleSave = async () => {
    setError('');
    if (pin !== confirm) {
      setError(t('pin.errorMismatch'));
      setConfirm('');
      return;
    }
    setSaving(true);
    try {
      const settings = await db.storeSettings.toCollection().first();
      const deviceId = settings?.deviceId;
      if (!deviceId) throw new Error(t('pin.errorNoDevice'));
      await db.users.update(user.id!, {
        pinHash: await hashPin(pin, deviceId),
        updatedAt: new Date(),
      });
      toast.success(t('pin.saved'));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pin.errorSave'));
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 animate-in flex-col fade-in duration-300">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-8">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-primary">
            <Lock className="h-7 w-7" />
          </span>
          <h2 className="pt-1 text-[22px] font-semibold tracking-tight">
            {stage === 'set' ? t('pin.title') : t('pin.confirmTitle')}
          </h2>
          <p className="mx-auto max-w-[19rem] text-sm leading-relaxed text-muted-foreground">
            {stage === 'set' ? t('pin.subtitle') : t('pin.confirmSubtitle')}
          </p>
        </div>

        <Item>
          <ItemMedia tone="muted" className="text-sm font-semibold">
            {initials(storeName || '?')}
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="truncate">{storeName}</ItemTitle>
            <ItemDescription className="truncate">
              {user.name} · {user.username}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Badge variant={owner ? 'primary' : 'secondary'} size="sm">
              {owner ? t('auth.roleOwner') : t('auth.roleStaff')}
            </Badge>
          </ItemActions>
        </Item>

        <div className="space-y-1.5">
          <Label htmlFor="newPin" className="flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-muted-foreground" />
            {stage === 'set' ? t('pin.label') : t('pin.confirmLabel')}
          </Label>
          <Input
            id="newPin"
            key={stage}
            autoFocus
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={value}
            disabled={saving}
            onChange={(e) => {
              setError('');
              setValue(e.target.value.replace(/\D/g, ''));
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (stage === 'set') handleNext();
              else void handleSave();
            }}
            placeholder="••••"
            className="h-11 text-center text-xl font-semibold tracking-widest"
          />
          <p className="text-xs text-muted-foreground">{t('pin.hint')}</p>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <Alert variant="info">
          <Shield />
          <AlertTitle>{t('pin.accessTitle')}</AlertTitle>
          <AlertDescription>{owner ? t('pin.accessOwner') : t('pin.accessStaff')}</AlertDescription>
        </Alert>
      </div>

      <div className="space-y-2 px-4 pt-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
        {stage === 'set' ? (
          <Button size="xl" className="w-full" disabled={pin.length < 4} onClick={handleNext}>
            {t('navigation.next')}
            <ChevronRight />
          </Button>
        ) : (
          <>
            <Button size="xl" className="w-full" disabled={confirm.length < 4 || saving} isLoading={saving} onClick={handleSave}>
              {t('pin.submit')}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled={saving}
              onClick={() => {
                setStage('set');
                setConfirm('');
                setError('');
              }}
            >
              <ChevronLeft />
              {t('pin.back')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Layar sambutan ──────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WelcomeScreen({ t, busy, native, activeLang, onChangeLang, onNativeLogin, onGoogleCredential, onJoin, onRestore, onSkip }: any) {
  return (
    <div className="flex min-h-0 flex-1 animate-in flex-col fade-in duration-300">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-primary"
          aria-hidden
        >
          <Store className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-[22px] font-semibold tracking-tight">KanPOS</h1>
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
                  onClick={() => onChangeLang(code as SupportedLanguage)}
                  aria-pressed={active}
                  className={cn(
                    'flex h-14 flex-col items-center justify-center gap-1 rounded-xl border bg-card shadow-xs transition-colors',
                    active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                  )}
                >
                  <span className="text-lg leading-none">{flag}</span>
                  <span className={cn('text-[11px] font-medium leading-none', active ? 'text-primary' : 'text-muted-foreground')}>
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
        <GoogleButton
          t={t}
          busy={busy}
          native={native}
          onNativeLogin={onNativeLogin}
          onGoogleCredential={onGoogleCredential}
        />

        <Button variant="outline" size="xl" className="w-full" onClick={onJoin}>
          <Users />
          {t('auth.joinCta')}
        </Button>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={onRestore}>
            <Upload />
            {t('auth.restoreCta')}
          </Button>
          <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={onSkip}>
            {t('auth.skipCta')}
          </Button>
        </div>

        <p className="pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
          {t('tnc.prefix')}{' '}
          <a href="https://freekasir.com/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
            {t('tnc.terms')}
          </a>{' '}
          {t('tnc.and')}{' '}
          <a href="https://freekasir.com/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
            {t('tnc.privacy')}
          </a>
          .
        </p>
      </div>
    </div>
  );
}

/**
 * Tombol Google. Di WebView Android, Google Identity Services diblokir, jadi
 * native memakai Credential Manager lewat plugin — lihat `lib/google-auth`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GoogleButton({ t, busy, native, onNativeLogin, onGoogleCredential }: any) {
  // Di native tombolnya milik kita sendiri, jadi bisa persis mengikuti mockup:
  // permukaan putih dengan logo Google berwarna — sekaligus bentuk yang
  // diwajibkan pedoman merek Google untuk tombol buatan sendiri.
  if (native) {
    return (
      <Button variant="outline" size="xl" className="w-full" disabled={busy} isLoading={busy} onClick={onNativeLogin}>
        <GoogleMark />
        {t('auth.googleCta')}
      </Button>
    );
  }
  // Di web, tombolnya di-render Google di dalam iframe dan tidak bisa kita
  // gayai. Yang bisa disetel cuma varian bawaannya — dipilih yang paling dekat
  // dengan gaya tombol outline: sudut kotak, permukaan putih, tinggi besar,
  // logo di kiri.
  return (
    <div className="flex w-full justify-center [&>div]:w-full">
      <GoogleLogin
        theme="outline"
        size="large"
        shape="rectangular"
        text="continue_with"
        logo_alignment="left"
        width="320"
        onSuccess={(cr) => {
          if (cr.credential) void onGoogleCredential(cr.credential);
          else toast.error(t('toast.googleLoginFailed'));
        }}
        onError={() => toast.error(t('toast.googleLoginFailed'))}
      />
    </div>
  );
}


/* ── Pemilih toko ────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StorePicker({ t, data, selectedId, onSelect, onOpen, onCreateNew, onSwitchAccount }: any) {
  const selected = data.stores.find((s: CloudStore) => s.id === selectedId);
  return (
    <div className="flex min-h-0 flex-1 animate-in flex-col fade-in duration-300">
      <div className="space-y-1.5 px-4 pb-3 pt-4">
        <h2 className="text-[22px] font-semibold tracking-tight">{t('auth.pickerTitle')}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('auth.pickerSubtitle')}</p>
      </div>

      <div className="px-4 pb-3">
        <AccountRow
          user={{ email: data.user.email, name: data.user.name, picture: data.user.picture ?? undefined }}
          caption={t('auth.storeCount', { count: data.stores.length })}
          action={{ label: t('restore.switchAccount'), onClick: onSwitchAccount }}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4">
        {data.stores.map((store: CloudStore) => {
          const owner = store.role === 'OWNER';
          return (
            <Item
              key={store.id}
              asChild
              interactive
              className={cn(store.id === selectedId && 'border-primary bg-primary/5')}
            >
              <button type="button" aria-pressed={store.id === selectedId} onClick={() => onSelect(store.id)} className="w-full text-left">
                <ItemMedia tone={owner ? 'primary' : 'muted'} className="text-sm font-semibold">
                  {initials(store.name)}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="truncate">{store.name}</ItemTitle>
                  <ItemDescription className="truncate">
                    {store.cityName ?? store.address1 ?? t('auth.noAddress')}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Badge variant={owner ? 'primary' : 'secondary'} size="sm">
                    {owner ? t('auth.roleOwner') : t('auth.roleStaff')}
                  </Badge>
                  {store.id === selectedId && <Check className="h-4 w-4 text-primary" />}
                </ItemActions>
              </button>
            </Item>
          );
        })}

        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>{t('auth.oneStoreTitle')}</AlertTitle>
          <AlertDescription>{t('auth.oneStoreDesc')}</AlertDescription>
        </Alert>
      </div>

      <div className="space-y-2 px-4 pt-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
        <Button size="xl" className="w-full" disabled={!selected} onClick={onOpen}>
          {selected ? t('auth.openStore', { name: selected.name }) : t('auth.pickOne')}
          <ChevronRight />
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onCreateNew}>
          <Plus />
          {t('auth.createNewStore')}
        </Button>
      </div>
    </div>
  );
}

/* ── Gabung toko ─────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function JoinScreen({ t, code, onCode, joining, user, isLoggedIn, busy, native, invites, onNativeLogin, onGoogleCredential, onSubmit, onBack }: any) {
  return (
    <div className="flex min-h-0 flex-1 animate-in flex-col fade-in duration-300">
      <div className="flex h-12 flex-none items-center px-4 pt-2">
        <Button variant="outline" size="icon" onClick={onBack} aria-label={t('navigation.back')}>
          <ChevronLeft />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-4">
        <div className="space-y-2">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-primary">
            <Users className="h-7 w-7" />
          </span>
          <h2 className="pt-2 text-[22px] font-semibold tracking-tight">{t('join.title')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('join.desc')}</p>
        </div>

        {!isLoggedIn ? (
          <Card className="space-y-3 p-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">{t('join.loginFirst')}</p>
            <GoogleButton t={t} busy={busy} native={native} onNativeLogin={onNativeLogin} onGoogleCredential={onGoogleCredential} />
          </Card>
        ) : (
          <>
            {invites.length > 0 && (
              <Alert variant="success">
                <Check />
                <AlertTitle>{t('auth.inviteFound', { name: invites[0].storeName ?? '' })}</AlertTitle>
                <AlertDescription>{t('auth.inviteFoundDesc')}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="joinCode" className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-muted-foreground" />
                {t('join.codeLabel')}
              </Label>
              <Input
                id="joinCode"
                autoFocus
                maxLength={12}
                placeholder="XXXXXXXX"
                value={code}
                onChange={(e) => onCode(e.target.value.toUpperCase())}
                className="h-11 text-center text-xl font-semibold tracking-widest"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">{t('join.codeHint')}</p>
            </div>

            {user && <AccountRow user={user} caption={t('auth.codeMustMatch')} />}
          </>
        )}
      </div>

      <div className="px-4 pt-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
        <Button size="xl" className="w-full" disabled={!isLoggedIn || !code.trim() || joining} isLoading={joining} onClick={onSubmit}>
          {t('join.submit')}
        </Button>
      </div>
    </div>
  );
}

/* ── Tarik data toko ─────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HydrationScreen({ t, step, storeName }: { t: any; step: HydrationStep; storeName: string }) {
  const steps: { key: HydrationStep; label: string }[] = [
    { key: 'settings', label: t('auth.hydrSettings') },
    { key: 'members', label: t('auth.hydrMembers') },
    { key: 'data', label: t('auth.hydrData') },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);
  const activeIndex = step === 'done' ? steps.length : currentIndex;

  return (
    <div className="flex min-h-0 flex-1 animate-in flex-col items-center justify-center gap-6 px-4 text-center fade-in duration-300">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-primary">
        <DownloadCloud className="h-7 w-7" />
      </span>

      <div className="space-y-2">
        <h2 className="text-[22px] font-semibold tracking-tight">{t('auth.hydrTitle', { name: storeName })}</h2>
        <p className="mx-auto max-w-[15rem] text-sm leading-relaxed text-muted-foreground">
          {t('auth.hydrSubtitle')}
        </p>
      </div>

      <Card className="w-full max-w-sm space-y-1 p-4 text-left">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2.5 py-2">
            <span
              className={cn(
                'flex h-6 w-6 flex-none items-center justify-center rounded-md',
                i < activeIndex ? 'bg-success/10 text-success-text' : i === activeIndex ? 'bg-primary/10 text-primary' : 'bg-muted',
              )}
            >
              {i < activeIndex ? (
                <Check className="h-[13px] w-[13px]" />
              ) : i === activeIndex ? (
                <Loader2 className="h-[13px] w-[13px] animate-spin" />
              ) : null}
            </span>
            <span
              className={cn(
                'flex-1 text-[13px]',
                i <= activeIndex ? 'font-medium' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
          </div>
        ))}

        {/* Batang progres: langkahnya cuma tiga, jadi daftar centang saja
            terasa diam terlalu lama di langkah terakhir yang paling berat. */}
        <Progress className="mt-3" value={Math.round((Math.max(activeIndex, 0) / steps.length) * 100)} />
      </Card>

      <p className="max-w-[17rem] text-xs leading-relaxed text-muted-foreground">
        {t('auth.hydrHistoryNote')}
      </p>
    </div>
  );
}

/* ── Bagian bersama ──────────────────────────────────────────────────── */

function AccountRow({
  user,
  caption,
  action,
}: {
  user: { email?: string; name?: string; picture?: string };
  caption: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <Item className="w-full">
      <Avatar size="sm" tone="brand">
        {user.picture && <AvatarImage src={user.picture} alt="" referrerPolicy="no-referrer" />}
        <AvatarFallback>{initials(user.name ?? user.email ?? '?')}</AvatarFallback>
      </Avatar>
      <ItemContent className="text-left">
        <ItemTitle className="truncate">{user.email ?? user.name}</ItemTitle>
        <ItemDescription className="truncate">{caption}</ItemDescription>
      </ItemContent>
      {action && (
        <ItemActions>
          <Button variant="link" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </ItemActions>
      )}
    </Item>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
