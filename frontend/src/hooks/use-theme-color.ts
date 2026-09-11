import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

const THEME_STORAGE_KEY = 'kg_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

// Predefined theme color options with HSL values.
// '227' = brand blue #3554C1 dari design/*.svg (default baru).
export const THEME_COLORS = [
  { name: 'Biru Kan', hue: '227', saturation: '57%', lightness: '48%' },
  { name: 'Biru', hue: '215', saturation: '76%', lightness: '46%' },
  { name: 'Oranye', hue: '25', saturation: '90%', lightness: '48%' },
  { name: 'Hijau', hue: '147', saturation: '100%', lightness: '35%' },
  { name: 'Ungu', hue: '262', saturation: '70%', lightness: '52%' },
  { name: 'Merah', hue: '0', saturation: '72%', lightness: '51%' },
  { name: 'Pink', hue: '330', saturation: '70%', lightness: '52%' },
  { name: 'Teal', hue: '172', saturation: '66%', lightness: '38%' },
  { name: 'Kuning', hue: '45', saturation: '90%', lightness: '42%' },
] as const;

export const DEFAULT_THEME_HUE = '227';

export function getThemeHSL(hue: string) {
  // Migrasi rebranding: default lama Indigo ('243') dipetakan ke brand blue.
  if (hue === '243') hue = DEFAULT_THEME_HUE;
  const preset = THEME_COLORS.find(c => c.hue === hue);
  if (preset) return `${preset.hue} ${preset.saturation} ${preset.lightness}`;
  return `${hue} 95% 53%`;
}

export function applyThemeColor(hue: string) {
  const hsl = getThemeHSL(hue);
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
  // Update meta theme-color for PWA
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', `hsl(${hsl})`);
}

export function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function isThemeDark(theme: ThemeMode): boolean {
  return theme === 'dark' || (theme === 'system' && getSystemDark());
}

function readStoredTheme(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // ignore storage errors in private mode
  }
  return null;
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (isThemeDark(theme)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage errors in private mode
  }
}

export function useThemeColor() {
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  useEffect(() => {
    if (storeSettings?.themeColor) {
      applyThemeColor(storeSettings.themeColor);
    }
  }, [storeSettings?.themeColor]);

  return storeSettings?.themeColor ?? DEFAULT_THEME_HUE;
}

export function useTheme() {
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const [initialTheme] = useState<ThemeMode>(() => readStoredTheme() ?? 'system');
  const theme: ThemeMode = storeSettings?.theme ?? initialTheme;

  useEffect(() => {
    applyTheme(theme);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [theme]);

  return theme;
}

export async function setThemeColor(hue: string) {
  const settings = await db.storeSettings.toCollection().first();
  if (settings?.id) {
    await db.storeSettings.update(settings.id, { themeColor: hue });
  }
  applyThemeColor(hue);
}

export async function setTheme(theme: ThemeMode) {
  applyTheme(theme);
  const settings = await db.storeSettings.toCollection().first();
  if (settings?.id) {
    await db.storeSettings.update(settings.id, { theme });
  }
}
