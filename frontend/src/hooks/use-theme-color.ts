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

/**
 * Turunan aksen yang dipakai dunia visual "Dibagi Per Peran".
 *
 * Bidang brand dicelup penuh, jadi warna aksen tidak cuma muncul sebagai
 * garis tipis — ia jadi permukaan yang memikul teks. Itu butuh tiga turunan
 * yang tidak bisa ditulis mati di CSS, karena user boleh mengganti aksennya:
 *
 *   --primary-text  brand saat ia jadi TEKS/ikon di atas ground. Di mode
 *                   gelap ia harus diangkat, karena aksen pada lightness
 *                   aslinya tidak terbaca di atas permukaan gelap.
 *   --primary-dim   teks sekunder DI ATAS bidang brand — ditint dari hue
 *                   brand-nya sendiri, bukan abu-abu.
 *   --primary-press warna saat ditekan.
 */
function deriveAccent(hsl: string) {
  const [h, s, l] = hsl.split(' ');
  const hue = parseFloat(h);
  const sat = parseFloat(s);
  const light = parseFloat(l);

  return {
    press: `${hue} ${sat}% ${Math.max(light - 8, 12)}%`,
    deep: `${hue} ${Math.min(sat + 3, 100)}% ${Math.max(light - 22, 8)}%`,
    /* Teks sekunder di atas bidang brand: hue dipertahankan, lightness
       didorong ke 90% supaya rasio kontrasnya tetap di atas 4.5:1 apa pun
       aksen yang dipilih. */
    dim: `${hue} ${Math.max(sat + 16, 60)}% 90%`,
    /* Versi teks untuk mode gelap. */
    textDark: `${hue} ${Math.max(sat + 28, 70)}% 79%`,
  };
}

export function applyThemeColor(hue: string) {
  const hsl = getThemeHSL(hue);
  const root = document.documentElement;
  const accent = deriveAccent(hsl);
  const isDark = root.classList.contains('dark');

  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--primary-text', isDark ? accent.textDark : hsl);
  root.style.setProperty('--primary-dim', accent.dim);
  root.style.setProperty('--primary-press', accent.press);
  root.style.setProperty('--primary-deep', accent.deep);
  root.style.setProperty('--ring', isDark ? accent.textDark : hsl);

  // Meta theme-color PWA mengikuti bidang brand, bukan versi teksnya:
  // bilah status di Android berdiri tepat di atas panel yang dicelup.
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

  // `--primary-text` dan `--ring` beda nilainya antara terang dan gelap, dan
  // keduanya ditulis sebagai inline style oleh applyThemeColor — jadi kelas
  // `.dark` saja tidak cukup untuk menggesernya. Hitung ulang di sini supaya
  // ganti tema tidak meninggalkan teks aksen yang tak terbaca.
  const current = root.style.getPropertyValue('--primary').trim();
  if (current) {
    const accent = deriveAccent(current);
    const dark = root.classList.contains('dark');
    root.style.setProperty('--primary-text', dark ? accent.textDark : current);
    root.style.setProperty('--ring', dark ? accent.textDark : current);
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
