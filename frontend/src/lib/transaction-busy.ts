/**
 * Penanda "kasir sedang di tengah transaksi". Keranjang hidup sebagai state
 * lokal halaman Kasir, jadi halaman itu yang menyalakan penanda ini; pihak
 * lain (dialog update) cukup membaca tanpa perlu tahu isi keranjang.
 */
let busy = false;
const listeners = new Set<() => void>();

export function setTransactionBusy(value: boolean) {
  if (busy === value) return;
  busy = value;
  listeners.forEach((fn) => fn());
}

export const isTransactionBusy = () => busy;

export function subscribeTransactionBusy(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
