/**
 * Penggabung className seadanya. Panel admin tidak memakai `clsx`/`tailwind-merge`
 * seperti aplikasi kasir — di sini kelas selalu ditulis dari komponen sendiri,
 * jadi tidak ada konflik utility yang perlu dibereskan.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
