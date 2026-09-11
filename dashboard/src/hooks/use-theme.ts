import { useCallback, useEffect, useState } from 'react';

const KEY = 'kanpos.dashboard.theme';

export type Theme = 'light' | 'dark';

function preferensiSistem(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function tersimpan(): Theme | null {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' ? v : null;
}

/**
 * Mode terang/gelap. Token Shark sudah punya dua set nilai di `index.css`;
 * yang perlu dilakukan hanya memasang kelas `dark` di elemen root.
 *
 * Tanpa pilihan tersimpan, tema mengikuti sistem dan ikut berubah saat setelan
 * OS berubah. Begitu pengguna memilih sendiri, pilihannya menang dan bertahan.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => tersimpan() ?? preferensiSistem());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (tersimpan()) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setThemeState(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(KEY, next);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggle };
}
