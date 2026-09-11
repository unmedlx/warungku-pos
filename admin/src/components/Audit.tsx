import { useState } from 'react';
import type { AuditList, AuditLogRow } from '@/lib/types';
import { formatSejak, formatWaktu } from '@/lib/format';
import { Badge, Card, EmptyBox, ErrorBox, Pager, Skeleton } from './Common';

/** Kalimat manusiawi untuk tiap aksi; kode mentahnya tetap ditampilkan di baris kedua. */
const AKSI: Record<string, { label: string; nada: 'ok' | 'peringatan' | 'bahaya' | 'utama' }> = {
  'admin.seed': { label: 'Admin pertama disemai', nada: 'utama' },
  'admin.promote': { label: 'Diangkat jadi admin', nada: 'utama' },
  'admin.demote': { label: 'Hak admin dicabut', nada: 'peringatan' },
  'user.suspend': { label: 'Akun disuspend', nada: 'bahaya' },
  'user.unsuspend': { label: 'Akun diaktifkan kembali', nada: 'ok' },
  'payment.reconcile': { label: 'Pembayaran direkonsiliasi', nada: 'peringatan' },
};

/** Nada lama dipertahankan di data di atas; pemetaannya ke varian badge ada di sini. */
const VARIAN = {
  ok: 'success',
  peringatan: 'warning',
  bahaya: 'destructive',
  utama: 'primary',
} as const;

/** Jam saja untuk baris waktu; tanggal lengkapnya tetap ada di atribut title. */
function jam(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function ringkasPerubahan(log: AuditLogRow) {
  const kunci = new Set([...Object.keys(log.before ?? {}), ...Object.keys(log.after ?? {})]);
  const bagian: string[] = [];
  for (const k of kunci) {
    const sebelum = log.before?.[k];
    const sesudah = log.after?.[k];
    if (String(sebelum) === String(sesudah)) continue;
    bagian.push(
      sebelum === undefined ? `${k}: ${sesudah}` : `${k}: ${sebelum} → ${sesudah}`,
    );
  }
  return bagian;
}

function Baris({ log }: { log: AuditLogRow }) {
  const [buka, setBuka] = useState(false);
  const aksi = AKSI[log.action] ?? { label: log.action, nada: 'utama' as const };
  const perubahan = ringkasPerubahan(log);

  return (
    <div className="flex gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
      {/* Kolom waktu tetap di kiri supaya mata bisa menyusuri kronologinya. */}
      <div className="w-[76px] flex-none pt-0.5 text-right" title={formatWaktu(log.createdAt)}>
        <div className="text-[13px] font-semibold tabular-nums">{jam(log.createdAt)}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {formatSejak(log.createdAt)}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{log.actor.name}</span>
          <Badge variant={VARIAN[aksi.nada]} size="sm">
            {aksi.label}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium">
            {log.targetType}
            {log.targetId ? <span className="kode ml-1.5">{log.targetId}</span> : null}
          </span>
        </div>

        <div className="mt-1 text-[11px] text-muted-foreground">
          <span className="font-mono">{log.action}</span>
          {log.ip ? ` · dari ${log.ip}` : ''}
        </div>

        {log.reason && (
          <p className="mt-1.5 text-[13px] text-muted-foreground">“{log.reason}”</p>
        )}

        {perubahan.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {perubahan.map((p) => (
              <span key={p} className="kode rounded-lg border border-border px-2 py-1">
                {p}
              </span>
            ))}
          </div>
        )}

        {(log.before || log.after) && (
          <div className="mt-2">
            <button
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={buka}
              onClick={() => setBuka((v) => !v)}
            >
              Data mentah
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
                className={buka ? 'rotate-180 transition-transform' : 'transition-transform'}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {buka && (
              <pre className="kode mt-2 overflow-x-auto rounded-lg border border-border bg-muted p-3 leading-relaxed">
                {JSON.stringify({ before: log.before, after: log.after }, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AuditSection({
  data,
  memuat,
  error,
  onHalaman,
  onMuatUlang,
}: {
  data: AuditList | null;
  memuat: boolean;
  error: string | null;
  onHalaman: (p: number) => void;
  onMuatUlang: () => void;
}) {
  if (error) return <ErrorBox message={error} onRetry={onMuatUlang} />;
  if (memuat && !data) return <Skeleton className="h-64" />;
  if (!data || data.logs.length === 0) {
    return (
      <EmptyBox
        title="Belum ada tindakan admin yang tercatat"
        description="Setiap suspend, rekonsiliasi, dan perubahan peran akan muncul di sini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Catatan ini hanya bisa ditambah, tidak bisa diubah atau dihapus lewat panel — termasuk oleh
        superadmin.
      </p>

      <Card>
        {data.logs.map((log) => (
          <Baris key={log.id} log={log} />
        ))}

        <Pager
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          totalItems={data.pagination.totalItems}
          onChange={onHalaman}
        />
      </Card>
    </div>
  );
}
