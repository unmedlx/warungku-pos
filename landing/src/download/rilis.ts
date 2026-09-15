import { API_BASE_URL } from "../tautan";

export type Platform = "android" | "windows";

export interface VersiLama {
  versionName: string;
  versionCode: number;
  fileSize: number;
  publishedAt: string;
  downloadUrl: string;
}

export interface Rilis {
  platform: Platform;
  versionName: string;
  versionCode: number;
  fileName: string;
  fileSize: number;
  sha256: string;
  changelog: string;
  publishedAt: string;
  downloadUrl: string;
  previous: VersiLama[];
}

export type DaftarRilis = Record<Platform, Rilis | null>;

/**
 * Link unduhan dari API disusun backend dari header permintaan; di belakang
 * reverse proxy yang salah konfigurasi hasilnya bisa `http://localhost/...`.
 * Landing sudah tahu alamat API-nya sendiri, jadi hanya path yang dipakai.
 */
function linkDariApi(url: string) {
  try {
    const u = new URL(url, API_BASE_URL);
    return `${API_BASE_URL}${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

export async function ambilRilis(signal?: AbortSignal): Promise<DaftarRilis> {
  const res = await fetch(`${API_BASE_URL}/api/releases`, { signal });
  if (!res.ok) throw new Error(`Gagal memuat rilis (${res.status})`);
  const data = (await res.json()) as DaftarRilis;
  for (const r of Object.values(data)) {
    if (!r) continue;
    r.downloadUrl = linkDariApi(r.downloadUrl);
    r.previous = r.previous.map((v) => ({ ...v, downloadUrl: linkDariApi(v.downloadUrl) }));
  }
  return data;
}

/** Link tetap yang selalu menunjuk versi terbaru — dipakai QR code. */
export const linkTetap = (p: Platform) => `${API_BASE_URL}/api/releases/download/${p}`;

export function formatUkuran(bytes: number) {
  return `${(bytes / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}

export function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Pengunjung dari Windows mendapat pilihan Windows; selain itu Android, karena
 * mayoritas pengunjung datang dari HP. iPhone/Mac tetap ke Android — halaman
 * menampilkan catatan bahwa belum ada versi iOS.
 */
export function tebakPlatform(ua = navigator.userAgent): Platform {
  if (/Android/i.test(ua)) return "android";
  if (/Windows/i.test(ua)) return "windows";
  return "android";
}

export const PLATFORM: Record<
  Platform,
  { nama: string; label: string; syarat: string; lawan: Platform }
> = {
  android: {
    nama: "KanPOS untuk Android",
    label: "Download APK",
    syarat: "Android 7.0 ke atas",
    lawan: "windows",
  },
  windows: {
    nama: "KanPOS untuk Windows",
    label: "Download untuk Windows",
    syarat: "Windows 10 ke atas",
    lawan: "android",
  },
};
