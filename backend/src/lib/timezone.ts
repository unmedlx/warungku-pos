/**
 * Util zona waktu untuk laporan.
 *
 * Batas "hari" harus mengikuti zona toko (`Store.timezone`), bukan zona server.
 * Kalau tidak, angka tutup harian di dashboard akan berbeda dengan struk closing
 * yang dicetak kasir — dan owner akan menganggap dashboard-nya salah.
 */

const DEFAULT_TZ = 'Asia/Jakarta';

/** Selisih menit zona `tz` terhadap UTC pada saat `at` (positif = di timur UTC). */
export function offsetMinutes(tz: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second'),
    );
    return Math.round((asUtc - at.getTime()) / 60000);
  } catch {
    return 7 * 60; // WIB
  }
}

export function resolveTimezone(tz?: string | null): string {
  return tz && tz.trim() ? tz : DEFAULT_TZ;
}

/** Instan UTC yang mewakili tengah malam awal hari lokal `tz` untuk tanggal pada `at`. */
export function startOfDayIn(tz: string, at: Date): Date {
  const off = offsetMinutes(tz, at);
  const local = new Date(at.getTime() + off * 60000);
  const midnightLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  return new Date(midnightLocal - off * 60000);
}

/** Kunci tanggal lokal `YYYY-MM-DD` untuk pengelompokan harian. */
export function dayKeyIn(tz: string, at: Date): string {
  const local = new Date(at.getTime() + offsetMinutes(tz, at) * 60000);
  return local.toISOString().slice(0, 10);
}

/** Kunci bulan lokal `YYYY-MM`. */
export function monthKeyIn(tz: string, at: Date): string {
  return dayKeyIn(tz, at).slice(0, 7);
}

/**
 * Parse `YYYY-MM-DD` sebagai awal hari di zona `tz`.
 * `endExclusive` menambah satu hari agar rentang inklusif secara tanggal.
 */
export function parseDateIn(tz: string, value: string, endExclusive = false): Date {
  const [y, m, d] = value.split('-').map(Number);
  const guess = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const off = offsetMinutes(tz, guess);
  const base = Date.UTC(y, (m || 1) - 1, (d || 1) + (endExclusive ? 1 : 0));
  return new Date(base - off * 60000);
}
