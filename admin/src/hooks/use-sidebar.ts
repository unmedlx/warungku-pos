import { useCallback, useEffect, useState } from 'react';

const KEY = 'kanpos.admin.sidebar';

/**
 * Lebar sidebar: penuh (248px) atau rail ikon saja (64px). Pilihannya disimpan
 * karena orang yang bekerja di layar 13" akan memilih rail sekali lalu
 * mengharapkannya tetap begitu esok hari.
 *
 * Hanya berlaku di layar lebar; di bawah md sidebar-nya memang berupa drawer,
 * jadi nilai ini tidak dipakai di sana.
 */
export function useSidebar() {
  const [ciut, setCiut] = useState<boolean>(() => localStorage.getItem(KEY) === 'ciut');

  useEffect(() => {
    localStorage.setItem(KEY, ciut ? 'ciut' : 'penuh');
  }, [ciut]);

  const toggle = useCallback(() => setCiut((v) => !v), []);

  return { ciut, toggle };
}
