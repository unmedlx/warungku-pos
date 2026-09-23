import type { ReactNode } from 'react';
import type { Admin } from '@/lib/types';
import type { Theme } from '@/hooks/use-theme';
import { Avatar, Badge, Button } from './Common';
import { BASE_URL } from '@/lib/api';

/**
 * Bilah atas: jejak halaman di kiri, pencarian global, penanda lingkungan, dan
 * sakelar tema di kanan. Tingginya dikunci ke token `topbar` (56px) supaya
 * sebaris dengan blok merek di sidebar, dan latarnya semi-transparan agar isi
 * halaman terlihat lewat saat digulir.
 */

/**
 * Penanda lingkungan. Panel ini bisa diarahkan ke API mana saja lewat
 * `VITE_API_BASE_URL`, dan tindakan di sini menyentuh uang pelanggan — jadi
 * "sedang menatap produksi atau bukan" harus terbaca tanpa membuka devtools.
 */
function PenandaLingkungan() {
  const lokal = /localhost|127\.0\.0\.1|:\d{4,5}$/.test(BASE_URL) && !/^https:/.test(BASE_URL);
  return (
    <Badge
      variant={lokal ? 'warning' : 'success'}
      size="sm"
      title={BASE_URL}
      className="hidden lg:inline-flex"
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${lokal ? 'bg-warning' : 'bg-success'}`}
      />
      {lokal ? 'Lokal' : 'Produksi'}
    </Badge>
  );
}

function IkonMenu() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Topbar({
  jejak,
  cari,
  theme,
  onGantiTema,
  admin,
  onKeluar,
  onBukaMenu,
}: {
  jejak: string[];
  cari?: ReactNode;
  theme: Theme;
  onGantiTema: () => void;
  admin: Admin;
  onKeluar: () => void;
  /** Membuka drawer sidebar di layar sempit. */
  onBukaMenu?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-topbar items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
      {onBukaMenu && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="-ml-1 md:hidden"
          onClick={onBukaMenu}
          title="Buka menu"
          aria-label="Buka menu"
        >
          <IkonMenu />
        </Button>
      )}

      {/* Di layar sempit breadcrumb tidak muat; yang ditampilkan judul halamannya saja. */}
      <span className="min-w-0 truncate text-sm font-semibold md:hidden">
        {jejak[jejak.length - 1]}
      </span>

      <nav
        aria-label="Jejak halaman"
        className="hidden min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground md:flex"
      >
        <span>Admin</span>
        {jejak.map((j, i) => (
          <span key={j} className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true">›</span>
            <span className={i === jejak.length - 1 ? 'truncate font-medium text-foreground' : ''}>
              {j}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <PenandaLingkungan />
        {cari}

        <Button
          variant="outline"
          size="icon"
          onClick={onGantiTema}
          title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
          aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
        >
          {theme === 'dark' ? (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
            </svg>
          )}
        </Button>

        {/* Di layar sempit sidebar tidak ada, jadi keluar hanya bisa dari sini. */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onKeluar}
          title="Keluar"
          aria-label="Keluar"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </Button>

        <Avatar nama={admin.name} bulat tone="muted" className="hidden md:grid" />
      </div>
    </header>
  );
}
