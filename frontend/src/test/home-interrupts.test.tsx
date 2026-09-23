import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DISMISS_KEYS,
  HOME_INTERRUPTS,
  dismissInterrupt,
  pickInterrupt,
  useDismissed,
  type HomeInterruptId,
} from '@/lib/home-interrupts';

/**
 * Beranda hanya boleh menyela sekali. Yang diuji di sini adalah janjinya:
 * satu kartu, yang paling mendesak, dan yang berikutnya maju begitu yang di
 * atasnya ditutup.
 */

const ALL_VISIBLE = Object.fromEntries(HOME_INTERRUPTS.map((id) => [id, true])) as Record<HomeInterruptId, boolean>;

describe('pickInterrupt', () => {
  it('memilih satu saja walau semuanya layak tampil', () => {
    expect(pickInterrupt(ALL_VISIBLE)).toBe('session-expired');
  });

  it('mengembalikan null kalau tidak ada yang layak', () => {
    expect(pickInterrupt({})).toBeNull();
    expect(pickInterrupt({ setup: false, install: false })).toBeNull();
  });

  it('mendahulukan sesi habis — satu-satunya yang tidak bisa ditutup', () => {
    expect(pickInterrupt({ 'session-expired': true, install: true })).toBe('session-expired');
  });

  it('mendahulukan checklist daripada pengingat backup, supaya pesannya tidak dobel', () => {
    // Item ke-4 checklist adalah backup; menampilkan keduanya = menagih hal
    // yang sama dua kali di layar yang sama.
    expect(pickInterrupt({ setup: true, backup: true })).toBe('setup');
  });

  it('mendahulukan hubungkan akun daripada backup — solusi permanen di atas tambal sementara', () => {
    expect(pickInterrupt({ 'link-account': true, backup: true })).toBe('link-account');
  });

  it('menaruh ajakan pasang aplikasi paling akhir', () => {
    for (const id of HOME_INTERRUPTS) {
      if (id === 'install') continue;
      expect(pickInterrupt({ [id]: true, install: true })).toBe(id);
    }
  });

  it('memunculkan kandidat berikutnya kalau yang di atasnya tidak layak', () => {
    expect(pickInterrupt({ ...ALL_VISIBLE, 'session-expired': false })).toBe('setup');
    expect(pickInterrupt({ ...ALL_VISIBLE, 'session-expired': false, setup: false })).toBe('link-account');
    expect(pickInterrupt({ backup: true, install: true })).toBe('backup');
    expect(pickInterrupt({ install: true })).toBe('install');
  });
});

describe('useDismissed', () => {
  beforeEach(() => localStorage.clear());

  it('membaca penutupan yang sudah tersimpan', () => {
    localStorage.setItem(DISMISS_KEYS.setup, '1');
    const { result } = renderHook(() => useDismissed(DISMISS_KEYS.setup));
    expect(result.current[0]).toBe(true);
  });

  it('memberitahu SEMUA pembaca saat satu komponen menutup kartunya', () => {
    // Inti perbaikannya: dulu tiap kartu memegang state-nya sendiri, jadi
    // induknya tidak tahu kartu teratas sudah ditutup dan Beranda jadi
    // kosong sampai dimuat ulang.
    const a = renderHook(() => useDismissed(DISMISS_KEYS.install));
    const b = renderHook(() => useDismissed(DISMISS_KEYS.install));

    expect(a.result.current[0]).toBe(false);
    expect(b.result.current[0]).toBe(false);

    act(() => a.result.current[1]());

    expect(a.result.current[0]).toBe(true);
    expect(b.result.current[0]).toBe(true);
    expect(localStorage.getItem(DISMISS_KEYS.install)).toBe('1');
  });

  it('tidak saling mempengaruhi antar kunci', () => {
    const setup = renderHook(() => useDismissed(DISMISS_KEYS.setup));
    const install = renderHook(() => useDismissed(DISMISS_KEYS.install));
    act(() => dismissInterrupt(DISMISS_KEYS.setup));
    expect(setup.result.current[0]).toBe(true);
    expect(install.result.current[0]).toBe(false);
  });

  it('tetap jalan saat localStorage diblokir (mode privat)', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    try {
      const { result } = renderHook(() => useDismissed(DISMISS_KEYS.setup));
      expect(result.current[0]).toBe(false);
      expect(() => act(() => result.current[1]())).not.toThrow();
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});

/**
 * Uji rakitannya: `HomeInterrupt` merender tepat satu anak. Kelima komponen
 * asli di-stub karena masing-masing menyeret Dexie, Google OAuth, dan PWA —
 * yang diuji di sini adalah pemilihannya, bukan isi kartunya.
 */
describe('HomeInterrupt', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  async function renderWith(flags: Partial<Record<HomeInterruptId, boolean>>) {
    vi.doMock('@/components/SessionExpiredBanner', () => ({
      SessionExpiredBanner: () => <div data-testid="session-expired" />,
      useSessionExpiredVisible: () => !!flags['session-expired'],
    }));
    vi.doMock('@/components/SetupChecklist', () => ({
      SetupChecklist: () => <div data-testid="setup" />,
      useSetupChecklistVisible: () => !!flags.setup,
    }));
    vi.doMock('@/components/LinkAccountCard', () => ({
      LinkAccountCard: () => <div data-testid="link-account" />,
      useLinkAccountVisible: () => !!flags['link-account'],
    }));
    vi.doMock('@/components/InstallBanner', () => ({
      InstallBanner: () => <div data-testid="install" />,
      useInstallBannerVisible: () => !!flags.install,
    }));
    vi.doMock('@/components/jokoui/news-card', () => ({
      NewsCard: () => <div data-testid="backup" />,
    }));
    vi.doMock('@/components/BackupReminder', () => ({
      shouldShowBackupReminder: () => !!flags.backup,
      exportBackupData: vi.fn(),
    }));

    const { HomeInterrupt } = await import('@/components/home/HomeInterrupt');
    const { id } = await import('date-fns/locale');
    return render(
      <HomeInterrupt lastBackupAt={null} canBackup settingsLoaded dateLocale={id} />,
    );
  }

  it('merender tepat satu kartu walau kelimanya layak', async () => {
    const { container } = await renderWith(ALL_VISIBLE);
    expect(container.children).toHaveLength(1);
    expect(screen.getByTestId('session-expired')).toBeInTheDocument();
  });

  it('turun ke kandidat berikutnya sesuai prioritas', async () => {
    const { container } = await renderWith({ setup: true, backup: true, install: true });
    expect(container.children).toHaveLength(1);
    expect(screen.getByTestId('setup')).toBeInTheDocument();
  });

  it('tidak merender apa-apa kalau tidak ada yang mendesak', async () => {
    const { container } = await renderWith({});
    expect(container).toBeEmptyDOMElement();
  });
});
