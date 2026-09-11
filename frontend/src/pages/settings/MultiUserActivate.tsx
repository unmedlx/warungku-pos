import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Check, ChevronRight, Cloud, Info, Loader2, Lock, ShieldCheck, Users as UsersIcon } from '@/components/icons';
import { GoogleLogin } from '@react-oauth/google';
import { PageHeader } from '@/components/jokoui/page-header';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/jokoui/item';
import { GoogleMark } from '@/components/GoogleMark';
import LockedPage from '@/components/LockedPage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { createUser, isValidPin, saveSession } from '@/lib/auth';
import { buildUsername } from '@/lib/members';
import { nativeGoogleSignIn } from '@/lib/google-auth';
import { isNativePlatform } from '@/lib/printer';

/**
 * Aktivasi "kasir bergantian" — sekarang bersyarat cloud.
 *
 * Sebelum ini multi-user bisa dinyalakan sepenuhnya offline, sehingga daftar
 * karyawan punya dua sumber kebenaran: baris lokal murni dan anggota cloud.
 * `syncCloudMembers` harus sengaja tidak menyentuh yang pertama, dan
 * pencabutan akses hanya berlaku di perangkat tempat karyawan dihapus.
 *
 * Aturannya sekarang dipisah tegas: **internet untuk keanggotaan, offline
 * untuk sesi**. Mengaktifkan dan mengundang butuh server; login kasir harian
 * tetap PIN yang diperiksa di perangkat ini dan tidak pernah menyentuh
 * jaringan.
 */
export default function MultiUserActivate() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const { isOwner, multiUserEnabled } = useAuth();
  const { isLoggedIn, isSyncSubscribed, googleUser, profile, login, restoringSession } = useCloudAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const native = useMemo(() => isNativePlatform(), []);

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'prereq' | 'pin'>('prereq');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const cloudBound = !!storeSettings?.cloudStoreId;
  const semuaSiap = isLoggedIn && cloudBound && isSyncSubscribed;

  if (!isOwner) return <LockedPage title={t('multiUserActivate.title')} />;

  const handleToken = async (idToken: string) => {
    setBusy(true);
    try {
      await login(idToken);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('multiUserActivate.toast.loginFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleNativeLogin = async () => {
    setBusy(true);
    try {
      await handleToken(await nativeGoogleSignIn());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('multiUserActivate.toast.loginFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async () => {
    if (!storeSettings?.id || !storeSettings.deviceId) return;
    if (!isValidPin(pin)) {
      toast.error(t('multiUserActivate.toast.pinInvalid'));
      return;
    }
    if (pin !== pinConfirm) {
      toast.error(t('multiUserActivate.toast.pinMismatch'));
      return;
    }

    setBusy(true);
    try {
      const nama = googleUser?.name?.trim() || t('multiUserActivate.defaultOwnerName');
      const existing = await db.users.where('role').equals('owner').first();
      let ownerId = existing?.id;

      if (existing?.id) {
        // Idempotent: pemilik sudah pernah dibuat (mis. aktivasi lama), cukup
        // pasang PIN barunya.
        const { hashPin } = await import('@/lib/auth');
        await db.users.update(existing.id, {
          pinHash: await hashPin(pin, storeSettings.deviceId),
          updatedAt: new Date(),
        });
      } else {
        // Username tidak lagi diminta ke user — ia cuma pengenal internal,
        // jadi diturunkan dari email akun cloud.
        const username = await buildUsername(googleUser?.email ?? null, 'pemilik');
        const hasil = await createUser({ username, pin, name: nama, role: 'owner', permissions: [] });
        if (!hasil.ok || !hasil.userId) {
          toast.error(hasil.error || t('multiUserActivate.toast.createOwnerFailed'));
          return;
        }
        ownerId = hasil.userId;
      }

      // Tanpa ini `syncCloudMembers` tidak mengenali baris pemilik sebagai
      // padanan anggota cloud, lalu membuat baris kedua untuk orang yang sama.
      if (ownerId && profile?.user?.id) {
        await db.users.update(ownerId, {
          cloudUserId: profile.user.id,
          cloudEmail: googleUser?.email ?? null,
          updatedAt: new Date(),
        });
      }

      await db.storeSettings.update(storeSettings.id, { multiUserEnabled: true });
      if (ownerId) saveSession(ownerId, storeSettings.deviceId);

      toast.success(t('multiUserActivate.toast.activated'));
      // Reload supaya AuthProvider membaca flag + sesi dari state bersih.
      window.location.href = '/settings/employees/cloud';
    } finally {
      setBusy(false);
    }
  };

  if (multiUserEnabled) {
    return (
      <div className="page-container space-y-3">
        <PageHeader icon={UsersIcon} title={t('multiUserActivate.title')} backTo="/settings/employees" />
        <Alert variant="success">
          <ShieldCheck />
          <AlertTitle>{t('multiUserActivate.title')}</AlertTitle>
          <AlertDescription>{t('multiUserActivate.alreadyOn')}</AlertDescription>
        </Alert>
        <Button size="xl" className="w-full" onClick={() => navigate('/settings/employees/cloud')}>
          {t('multiUserActivate.manageMembers')}
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container space-y-4">
      <PageHeader icon={UsersIcon} title={t('multiUserActivate.title')} backTo="/settings/employees" />

      {stage === 'prereq' ? (
        <>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {t('multiUserActivate.intro')}
          </p>

          <ItemGroup>
            <PrereqRow
              done={isLoggedIn}
              title={t('multiUserActivate.prereq.account')}
              detail={isLoggedIn ? (googleUser?.email ?? '') : t('multiUserActivate.prereq.accountTodo')}
            >
              {!isLoggedIn && !restoringSession && (
                <div className="mt-2">
                  {native ? (
                    <Button variant="outline" size="sm" disabled={busy} onClick={handleNativeLogin}>
                      {busy ? <Loader2 className="animate-spin" /> : <GoogleMark className="!h-4 !w-4" />}
                      {t('multiUserActivate.prereq.accountCta')}
                    </Button>
                  ) : (
                    <GoogleLogin
                      theme="outline"
                      size="medium"
                      shape="rectangular"
                      logo_alignment="left"
                      onSuccess={(cr) => {
                        if (cr.credential) void handleToken(cr.credential);
                        else toast.error(t('multiUserActivate.toast.loginFailed'));
                      }}
                      onError={() => toast.error(t('multiUserActivate.toast.loginFailed'))}
                    />
                  )}
                </div>
              )}
            </PrereqRow>

            <PrereqRow
              done={cloudBound}
              title={t('multiUserActivate.prereq.store')}
              detail={
                cloudBound
                  ? (storeSettings?.storeName ?? '')
                  : t('multiUserActivate.prereq.storeTodo')
              }
            >
              {!cloudBound && (
                <Link
                  to="/settings/cloud-backup/stores"
                  className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-primary"
                >
                  {t('multiUserActivate.prereq.storeCta')}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </PrereqRow>

            <PrereqRow
              done={isSyncSubscribed}
              title={t('multiUserActivate.prereq.plan')}
              detail={
                isSyncSubscribed
                  ? (profile?.syncSubscription?.plan?.name ?? t('multiUserActivate.prereq.planActive'))
                  : t('multiUserActivate.prereq.planTodo')
              }
            >
              {!isSyncSubscribed && (
                <Link
                  to="/settings/cloud-backup"
                  className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-primary"
                >
                  {t('multiUserActivate.prereq.planCta')}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </PrereqRow>
          </ItemGroup>

          <Alert variant="info">
            <Info />
            <AlertTitle>{t('multiUserActivate.offlineNote.title')}</AlertTitle>
            <AlertDescription>{t('multiUserActivate.offlineNote.desc')}</AlertDescription>
          </Alert>

          <Button size="xl" className="w-full" disabled={!semuaSiap} onClick={() => setStage('pin')}>
            {t('multiUserActivate.next')}
            <ChevronRight />
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </span>
            <h2 className="pt-1 text-xl font-semibold tracking-tight">{t('multiUserActivate.pin.title')}</h2>
            <p className="mx-auto max-w-[19rem] text-[13px] leading-relaxed text-muted-foreground">
              {t('multiUserActivate.pin.subtitle')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ownerPin">{t('multiUserActivate.pin.label')}</Label>
              <Input
                id="ownerPin"
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="text-center font-mono text-lg tracking-[0.4em]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ownerPinConfirm">{t('multiUserActivate.pin.confirmLabel')}</Label>
              <Input
                id="ownerPinConfirm"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="text-center font-mono text-lg tracking-[0.4em]"
              />
              <p className="text-xs text-muted-foreground">{t('multiUserActivate.pin.hint')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button size="xl" className="w-full" disabled={pin.length < 4 || pinConfirm.length < 4 || busy} onClick={handleActivate}>
              {busy && <Loader2 className="animate-spin" />}
              {t('multiUserActivate.pin.submit')}
            </Button>
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => setStage('prereq')}>
              {t('multiUserActivate.back')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Satu baris prasyarat: status, penjelasan, dan jalan keluarnya. */
function PrereqRow({
  done,
  title,
  detail,
  children,
}: {
  done: boolean;
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <Item className="items-start">
      {/* Titik status boleh bulat: ini indikator, bukan blob ikon */}
      <span
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          done ? 'bg-success text-white' : 'border border-warning/40 bg-warning/10 text-warning-text',
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
      </span>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription className="line-clamp-none break-words">{detail}</ItemDescription>
        {children}
      </ItemContent>
    </Item>
  );
}
