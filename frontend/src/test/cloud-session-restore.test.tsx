import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CloudAuthProvider, useCloudAuth } from '@/hooks/use-cloud-auth';
import { isSessionRejected } from '@/lib/cloud-auth';

const refreshSession = vi.fn();
const fetchProfile = vi.fn();

vi.mock('@/lib/cloud-api', () => ({
  setCloudTokenGetter: vi.fn(),
  setCloudRefreshHandler: vi.fn(),
  createSession: vi.fn(),
  refreshSession: (t: string) => refreshSession(t),
  fetchProfile: () => fetchProfile(),
}));
vi.mock('@/lib/onesignal', () => ({
  initOneSignal: vi.fn(),
  oneSignalLogin: vi.fn(),
  oneSignalLogout: vi.fn(),
}));
vi.mock('@/lib/google-auth', () => ({ nativeGoogleSignOut: vi.fn() }));
vi.mock('@/lib/printer', () => ({ isNativePlatform: () => false }));

const SESSION_KEY = 'kanpos_cloud_session_v2';

/** Sesi tersimpan yang access token-nya hampir habis → mount memicu refresh. */
function seedStaleSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      refreshExpiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      user: { id: 'u1', email: 'a@b.c', name: 'A' },
    }),
  );
}

let state: ReturnType<typeof useCloudAuth> | null = null;
function Probe() {
  state = useCloudAuth();
  return null;
}

function renderProvider() {
  return render(
    <CloudAuthProvider>
      <Probe />
    </CloudAuthProvider>,
  );
}

describe('pemulihan sesi saat aplikasi dibuka', () => {
  beforeEach(() => {
    localStorage.clear();
    state = null;
    refreshSession.mockReset();
    fetchProfile.mockReset().mockResolvedValue({ user: { id: 'u1' } });
  });

  it('mempertahankan sesi ketika perpanjangan gagal karena jaringan', async () => {
    seedStaleSession();
    refreshSession.mockRejectedValue(new TypeError('Failed to fetch'));

    renderProvider();

    await waitFor(() => expect(state?.restoringSession).toBe(false));
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
    expect(state?.isLoggedIn).toBe(true);
    expect(state?.sessionExpired).toBe(false);
  });

  it('menghapus sesi ketika backend menolak refresh token', async () => {
    seedStaleSession();
    refreshSession.mockRejectedValue(
      Object.assign(new Error('Sesi sudah berakhir'), { status: 401 }),
    );

    renderProvider();

    await waitFor(() => expect(state?.sessionExpired).toBe(true));
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(state?.isLoggedIn).toBe(false);
  });
});

describe('isSessionRejected', () => {
  it('hanya benar untuk penolakan auth dari backend', () => {
    expect(isSessionRejected(Object.assign(new Error(), { status: 401 }))).toBe(true);
    expect(isSessionRejected(Object.assign(new Error(), { status: 403 }))).toBe(true);
    expect(isSessionRejected(Object.assign(new Error(), { status: 500 }))).toBe(false);
    expect(isSessionRejected(new TypeError('Failed to fetch'))).toBe(false);
    expect(isSessionRejected(null)).toBe(false);
  });
});
