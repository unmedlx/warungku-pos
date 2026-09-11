import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { ApiError, fetchAccount, fetchHealth, setUnauthorizedHandler } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/auth';
import type { Health, Profile } from '@/lib/types';
import { useReportFilter } from '@/hooks/use-report-filter';
import { useTheme } from '@/hooks/use-theme';
import { Avatar, Badge, Button } from '@/components/Common';
import { Login } from '@/components/Login';
import { NAV, Sidebar } from '@/components/Sidebar';
import Ringkasan from '@/pages/Ringkasan';
import Bandingkan from '@/pages/Bandingkan';
import TrenPage from '@/pages/Tren';
import StatusData from '@/pages/StatusData';
import Toko from '@/pages/Toko';
import Pengaturan from '@/pages/Pengaturan';

export default function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [maxStores, setMaxStores] = useState<number | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Rentang tanggal dipegang di sini supaya tidak ikut ter-reset tiap pindah halaman.
  const filter = useReportFilter();
  const { theme, setTheme, toggle: toggleTheme } = useTheme();

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setProfile(null);
    setHealth(null);
    setMaxStores(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setLoginError('Sesi berakhir, silakan masuk lagi.');
      logout();
    });
  }, [logout]);

  /**
   * Data milik kerangka halaman: identitas + kuota di sidebar, dan `health`
   * yang dipakai chip peringatan di Ringkasan serta halaman Status Data.
   * Sengaja terpisah dari data per halaman supaya pindah rute tidak memuat
   * ulang semuanya.
   */
  const loadAccount = useCallback(async () => {
    if (!token) return;
    setHealthLoading(true);
    try {
      const [a, h] = await Promise.all([fetchAccount(), fetchHealth()]);
      setProfile(a.user);
      setMaxStores(a.user.maxStores);
      setHealth(h);
    } catch (err) {
      // 401 sudah ditangani handler global; error lain dilaporkan halaman aktif.
      if (err instanceof ApiError && err.status === 401) return;
    } finally {
      setHealthLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const handleToken = (t: string) => {
    setToken(t);
    setTokenState(t);
    setLoginError(null);
  };

  if (!token) return <Login onToken={handleToken} error={loginError} />;

  const sidebar = <Sidebar health={health} profile={profile} onLogout={logout} />;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">{sidebar}</div>

      {/* Navigasi mobile: sidebar yang sama, digeser masuk sebagai lapisan. */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative" onClick={() => setMenuOpen(false)}>
            {sidebar}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 bg-card text-foreground shadow-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={18} />
          </Button>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-topbar items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={18} />
          </Button>

          <Breadcrumb />

          <span className="ml-auto flex items-center gap-2.5">
            {health?.plan?.name && (
              <Badge variant="primary" className="hidden sm:inline-flex">
                {health.plan.name}
              </Badge>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
              title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            {profile &&
              (profile.picture ? (
                <img src={profile.picture} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <Avatar tone="primary" className="h-7 w-7">
                  {(profile.name || profile.email || '?').slice(0, 1).toUpperCase()}
                </Avatar>
              ))}
          </span>
        </header>

        <main className="w-full min-w-0 max-w-[1240px] p-4 pb-16 md:p-6">
          <Routes>
            <Route
              path="/"
              element={
                <Ringkasan
                  profile={profile}
                  health={health}
                  filter={filter}
                  onReloadAccount={loadAccount}
                />
              }
            />
            <Route path="/bandingkan" element={<Bandingkan filter={filter} />} />
            <Route path="/tren" element={<TrenPage filter={filter} />} />
            <Route
              path="/status"
              element={
                <StatusData health={health} loading={healthLoading} onRefresh={loadAccount} />
              }
            />
            <Route
              path="/toko"
              element={<Toko maxStores={maxStores} onStoresChanged={loadAccount} />}
            />
            <Route
              path="/pengaturan"
              element={<Pengaturan onLogout={logout} theme={theme} onThemeChange={setTheme} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/** Kelompok › halaman, dibaca dari daftar navigasi yang sama dengan sidebar. */
function Breadcrumb() {
  const { pathname } = useLocation();
  const item = NAV.find((i) => i.to === pathname);
  if (!item) return null;
  return (
    <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className="hidden sm:inline">{item.grup}</span>
      <span className="hidden sm:inline" aria-hidden="true">
        ›
      </span>
      <span className="font-medium text-foreground">{item.label}</span>
    </nav>
  );
}
