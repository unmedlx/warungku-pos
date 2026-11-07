import { Outlet, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDefaultData } from '@/lib/db';
import { useEffect } from 'react';
import { Loader2, Store } from '@/components/icons';
import BottomNav from './BottomNav';
import { useThemeColor, useTheme } from '@/hooks/use-theme-color';
// import { useCloudAutoBackup } from '@/hooks/use-cloud-auto-backup';
// OFFLINE MODE: AuthGate disabled, use Onboarding directly
// import AuthGate from '@/components/AuthGate';
import Onboarding from '@/components/Onboarding';
import LoginScreen from '@/components/LoginScreen';
// import PushPermissionModal from '@/components/PushPermissionModal';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';

function isMainPage(path: string) {
  const segments = path.split('/').filter(Boolean);
  return segments.length <= 1;
}

export default function AppLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  useThemeColor(); // Apply saved theme color on mount
  useTheme();      // Apply saved light/dark/system mode
  // useCloudAutoBackup(); // Auto cloud backup on app open (if enabled & subscribed) - DISABLED
  const { multiUserEnabled, currentUser, loading } = useAuth();

  useEffect(() => {
    seedDefaultData();
  }, []);

  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  // Loading state
  if (storeSettings === undefined || loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-primary">
          <Store className="h-8 w-8" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Warungku POS</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">{t('app.loading', { defaultValue: 'Menyiapkan aplikasi...' })}</p>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // OFFLINE MODE: Use Onboarding directly instead of AuthGate
  // Belum ada toko di perangkat ini → gerbang akun.
  //
  // `AuthGate` yang memutuskan apa yang tampil: masuk Google lalu memilih toko
  // yang sudah terdaftar (jalur pemilik yang ganti HP), gabung lewat undangan,
  // atau membuat toko lokal. Wizard `Onboarding` yang lama tetap dipakai —
  // dirender oleh AuthGate sendiri pada mode 'create'.
  //
  // Syaratnya sengaja tetap `onboardingDone`, bukan status sesi cloud: toko
  // yang sudah jalan tidak boleh tiba-tiba disambut layar login, karena bagi
  // pemiliknya itu terbaca sebagai datanya hilang.
  if (!storeSettings || !storeSettings.onboardingDone) {
    return <Onboarding onComplete={() => { /* Dexie live query will auto-refresh */ }} />;
  }

  // Multi-user mode is on but no one is logged in → show login
  if (multiUserEnabled && !currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-[100dvh] bg-background max-w-lg sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto relative flex flex-col">
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
      {isMainPage(pathname) && <BottomNav />}
      {/* <PushPermissionModal /> */}
    </div>
  );
}
