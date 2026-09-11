import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import {
  setCloudTokenGetter,
  setCloudRefreshHandler,
  createSession,
  refreshSession,
  fetchProfile,
  type UserProfile,
} from '@/lib/cloud-api';
import {
  saveSession,
  loadSession,
  clearSession,
  takeLegacyGoogleToken,
  needsRefresh,
  isRefreshExpired,
  type CloudSession,
} from '@/lib/cloud-auth';
import { initOneSignal, oneSignalLogin, oneSignalLogout } from '@/lib/onesignal';
import { nativeGoogleSignOut } from '@/lib/google-auth';
import { isNativePlatform } from '@/lib/printer';

interface GoogleUser {
  email?: string;
  name?: string;
  picture?: string;
}

interface CloudAuthValue {
  token: string | null;
  googleUser: GoogleUser | null;
  profile: UserProfile | null;
  loadingProfile: boolean;
  /** Sesi masih dipulihkan dari penyimpanan; gerbang login belum boleh diputuskan. */
  restoringSession: boolean;
  isLoggedIn: boolean;
  /**
   * Sesi berakhir dan tidak bisa diperpanjang. Sengaja dipisah dari
   * `isLoggedIn`: kasir tetap jalan, yang muncul hanya banner "masuk lagi".
   */
  sessionExpired: boolean;
  isSubscribed: boolean;
  isSyncSubscribed: boolean;
  /** true bila akun baru dibuat pada login terakhir. */
  isNewUser: boolean;
  login: (idToken: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const CloudAuthContext = createContext<CloudAuthValue | null>(null);

export function CloudAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CloudSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Ref agar getter token yang didaftarkan ke cloud-api selalu mengembalikan
  // nilai terkini tanpa perlu re-register.
  const sessionRef = useRef<CloudSession | null>(null);
  sessionRef.current = session;

  const applySession = useCallback((next: CloudSession) => {
    saveSession(next);
    sessionRef.current = next;
    setSession(next);
    setSessionExpired(false);
  }, []);

  const dropSession = useCallback((expired: boolean) => {
    clearSession();
    sessionRef.current = null;
    setSession(null);
    setProfile(null);
    setSessionExpired(expired);
    oneSignalLogout();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!sessionRef.current) return;
    setLoadingProfile(true);
    try {
      const p = await fetchProfile();
      setProfile(p);
      // Kaitkan device push ke user Google (pakai user.id ber-prefix dari backend,
      // bukan `sub` token).
      if (p.user?.id) oneSignalLogin(p.user.id);
    } catch {
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  /**
   * Perpanjang sesi. Dipakai dua arah: proaktif saat aplikasi dibuka, dan
   * reaktif oleh cloud-api ketika sebuah request kena 401.
   */
  const renew = useCallback(async (): Promise<boolean> => {
    const current = sessionRef.current;
    if (!current) return false;
    if (isRefreshExpired(current)) {
      dropSession(true);
      return false;
    }
    try {
      const next = await refreshSession(current.refreshToken);
      applySession(next);
      return true;
    } catch {
      // Refresh ditolak backend (dicabut, akun disuspend) — sesi memang habis.
      dropSession(true);
      return false;
    }
  }, [applySession, dropSession]);

  const renewRef = useRef(renew);
  renewRef.current = renew;

  useEffect(() => {
    setCloudTokenGetter(() => sessionRef.current?.accessToken ?? null);
    setCloudRefreshHandler(() => renewRef.current());
    initOneSignal(); // muat SDK push sekali (no-op bila App ID kosong)
    return () => setCloudRefreshHandler(null);
  }, []);

  const login = useCallback(
    async (idToken: string) => {
      const next = await createSession(idToken);
      setIsNewUser(!!next.isNewUser);
      applySession(next);
      await refreshProfile();
    },
    [applySession, refreshProfile],
  );

  const logout = useCallback(() => {
    dropSession(false);
    setIsNewUser(false);
    if (isNativePlatform()) nativeGoogleSignOut();
  }, [dropSession]);

  // Pulihkan sesi saat mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = loadSession();
        if (saved) {
          sessionRef.current = saved;
          if (!cancelled) setSession(saved);
          // Diperpanjang lebih awal supaya request pertama tidak perlu kena 401 dulu.
          if (needsRefresh(saved)) {
            const ok = await renewRef.current();
            if (!ok) return;
          }
          if (!cancelled) await refreshProfile();
          return;
        }

        // Instalasi lama menyimpan Google ID token mentah. Selama masih hidup,
        // token itu ditukar sekali jadi sesi baru supaya user tidak perlu login ulang.
        const legacy = takeLegacyGoogleToken();
        if (legacy) {
          const next = await createSession(legacy);
          if (cancelled) return;
          applySession(next);
          await refreshProfile();
        }
      } catch {
        /* offline atau backend mati — biarkan user masuk tanpa sesi cloud */
      } finally {
        if (!cancelled) setRestoringSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: CloudAuthValue = {
    token: session?.accessToken ?? null,
    googleUser: session?.user
      ? { email: session.user.email, name: session.user.name, picture: session.user.picture ?? undefined }
      : null,
    profile,
    loadingProfile,
    restoringSession,
    isLoggedIn: !!session,
    sessionExpired,
    isSubscribed: !!profile?.subscription?.hasActiveSubscription,
    isSyncSubscribed: !!profile?.syncSubscription?.hasActiveSubscription,
    isNewUser,
    login,
    logout,
    refreshProfile,
  };

  return <CloudAuthContext.Provider value={value}>{children}</CloudAuthContext.Provider>;
}

export function useCloudAuth(): CloudAuthValue {
  const ctx = useContext(CloudAuthContext);
  if (!ctx) throw new Error('useCloudAuth must be used within CloudAuthProvider');
  return ctx;
}
