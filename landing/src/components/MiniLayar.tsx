import type { ReactNode } from "react";

/**
 * Layar contoh kecil di dalam kartu langkah. Digambar dengan bahasa yang sama
 * seperti aplikasi: kartu bergaris radius 12, kepala berlatar abu, baris
 * berpembatas. Kepala layar memakai huruf biasa — bukan uppercase-tracking
 * seperti versi sebelumnya, yang tidak ada di Shark.
 */

export function LayarKecil({
  tulisan,
  children,
}: {
  tulisan: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card text-[12.5px] shadow-xs">
      <div className="border-b border-border bg-background px-3 py-2 text-[11px] font-medium text-muted-foreground">
        {tulisan}
      </div>
      {children}
    </div>
  );
}

export function KeranjangBaris({
  emoji,
  nama,
  sub,
  nilai,
}: {
  emoji?: string;
  nama: string;
  sub?: string;
  nilai: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-b-0">
      <span className="min-w-0">
        {emoji && (
          <span className="mr-1.5" aria-hidden="true">
            {emoji}
          </span>
        )}
        {nama}
        {sub && <small className="block text-[11px] text-muted-foreground">{sub}</small>}
      </span>
      <span className="whitespace-nowrap tabular-nums">{nilai}</span>
    </div>
  );
}

/** Baris penutup: berlatar abu dan tebal, hijau kalau angkanya untung. */
export function KeranjangTotal({
  nama,
  nilai,
  hijau,
}: {
  nama: string;
  nilai: string;
  hijau?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 bg-background px-3 py-2 font-semibold ${
        hijau ? "text-success-text" : ""
      }`}
    >
      <span>{nama}</span>
      <span className="whitespace-nowrap tabular-nums">{nilai}</span>
    </div>
  );
}

/** Struk teks monospace untuk langkah ketiga. */
export function Struk() {
  return (
    <div className="px-3 py-2.5 font-mono text-[11px] leading-[1.8] text-muted-foreground">
      <div className="text-center font-semibold text-foreground">WARUNG BU SRI</div>
      <div className="text-center">13 Agt 2026 · 19:24</div>
      <div className="my-1.5 border-t border-dashed border-border" />
      <div className="flex justify-between">
        <span>Beras 5kg ×1</span>
        <span>68.000</span>
      </div>
      <div className="flex justify-between">
        <span>Mie instan ×3</span>
        <span>10.500</span>
      </div>
      <div className="my-1.5 border-t border-dashed border-border" />
      <div className="flex justify-between font-semibold text-foreground">
        <span>TOTAL</span>
        <span>78.500</span>
      </div>
    </div>
  );
}
