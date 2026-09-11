import { useEffect, useState } from 'react';
import type { PaymentFilter, ReconcileResult, TransactionList, TransactionRow } from '@/lib/types';
import { formatRupiah, formatSejak, formatWaktu } from '@/lib/format';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyBox,
  ErrorBox,
  FilterGroup,
  IdentitasPengguna,
  Pager,
  SearchInput,
  Skeleton,
} from './Common';

const FILTER: { id: PaymentFilter; label: string }[] = [
  { id: 'attention', label: 'Perlu ditangani' },
  { id: 'all', label: 'Semua' },
  { id: 'completed', label: 'Lunas' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Gagal' },
];

/** Ikon panah muter — dipakai di tombol verifikasi ulang. */
function IkonUlang({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" />
    </svg>
  );
}

function IkonInfo() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  );
}

function Status({ t }: { t: TransactionRow }) {
  if (t.status === 'COMPLETED')
    return (
      <Badge variant="success" size="sm">
        Lunas
      </Badge>
    );
  if (t.status === 'FAILED')
    return (
      <Badge variant="destructive" size="sm">
        Gagal
      </Badge>
    );
  if (t.status === 'PENDING')
    return (
      // Pending lewat sehari sudah bukan "sabar sebentar" lagi — naikkan ke merah.
      <Badge variant={t.ageHours >= 24 ? 'destructive' : 'warning'} size="sm">
        Pending {t.ageHours >= 24 ? `· ${t.ageHours} jam` : ''}
      </Badge>
    );
  return (
    <Badge variant="secondary" size="sm">
      {t.status}
    </Badge>
  );
}

/** Badge status mentah (PENDING/COMPLETED/…) untuk perbandingan di dialog. */
function BadgeStatusMentah({ status }: { status: string | null }) {
  if (!status)
    return (
      <Badge variant="outline" size="sm">
        —
      </Badge>
    );
  const variant =
    status === 'COMPLETED'
      ? 'success'
      : status === 'FAILED'
        ? 'destructive'
        : status === 'PENDING'
          ? 'warning'
          : 'secondary';
  return (
    <Badge variant={variant} size="sm">
      {status}
    </Badge>
  );
}

/** Hasil rekonsiliasi ditampilkan apa adanya — termasuk saat tidak ada yang berubah. */
function HasilRekonsiliasi({
  hasil,
  onTutup,
}: {
  hasil: { transaksi: TransactionRow; hasil: ReconcileResult };
  onTutup: () => void;
}) {
  const { transaksi, hasil: r } = hasil;
  return (
    <Dialog
      title="Hasil rekonsiliasi"
      description={
        <>
          {transaksi.user.name} · <span className="kode">{transaksi.reference ?? '—'}</span> ·{' '}
          {formatRupiah(transaksi.amount)} · {transaksi.plan.name}
        </>
      }
      onClose={onTutup}
      footer={
        <Button variant="primary" onClick={onTutup}>
          Selesai
        </Button>
      }
    >
      {/* Sebelum → sesudah disandingkan supaya jelas apa yang berubah. */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground">Sebelum</div>
          <div className="mt-1">
            <BadgeStatusMentah status={r.before.status ?? null} />
          </div>
        </div>
        <span aria-hidden="true" className="text-muted-foreground">
          →
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground">Sesudah (dari Tripay)</div>
          <div className="mt-1">
            <BadgeStatusMentah status={r.after.status} />
          </div>
        </div>
      </div>

      <Alert
        className="mt-3"
        variant={r.changed ? 'success' : 'info'}
        title={
          r.changed
            ? r.after.status === 'COMPLETED'
              ? 'Langganan pengguna sudah diaktifkan'
              : `Status diperbarui menjadi ${r.after.status}`
            : 'Tidak ada yang perlu diperbaiki'
        }
        description={
          r.changed
            ? 'Tindakan ini tercatat di audit log.'
            : 'Tripay memberi status yang sama seperti yang tercatat di sini.'
        }
      />
    </Dialog>
  );
}

export function PaymentsSection({
  data,
  memuat,
  error,
  filter,
  q,
  onQ,
  onFilter,
  onHalaman,
  onRekonsiliasi,
  sedangProses,
  hasil,
  onTutupHasil,
  onBukaPengguna,
  onMuatUlang,
}: {
  data: TransactionList | null;
  memuat: boolean;
  error: string | null;
  filter: PaymentFilter;
  q: string;
  onQ: (v: string) => void;
  onFilter: (f: PaymentFilter) => void;
  onHalaman: (p: number) => void;
  onRekonsiliasi: (t: TransactionRow) => void;
  sedangProses: string | null;
  hasil: { transaksi: TransactionRow; hasil: ReconcileResult } | null;
  onTutupHasil: () => void;
  onBukaPengguna: (id: string) => void;
  onMuatUlang: () => void;
}) {
  const [gagalRekonsiliasi, setGagal] = useState<string | null>(null);

  // Sama seperti pencarian pengguna: di-debounce supaya tiap ketikan tidak
  // memicu satu permintaan.
  const [draf, setDraf] = useState(q);
  useEffect(() => setDraf(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (draf !== q) onQ(draf);
    }, 350);
    return () => clearTimeout(t);
  }, [draf, q, onQ]);

  // Hitungan tampilan saja, dari baris yang sedang dimuat: berapa pembayaran
  // pending yang sudah menggantung. Dipakai untuk alert dan angka di penyaring.
  const jumlahNyangkut =
    filter === 'attention' && !q ? (data?.transactions.length ?? 0) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {jumlahNyangkut !== undefined && jumlahNyangkut > 0 && (
        <Alert
          variant="info"
          icon={<IkonInfo />}
          title={`${jumlahNyangkut} pembayaran pending tanpa callback Tripay`}
          description="Biasanya callback tertunda atau pelanggan tidak menyelesaikan pembayaran. “Verifikasi ulang” menanyakan status terbaru langsung ke Tripay dan hasilnya tercatat di audit log."
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterGroup
          items={FILTER.map((f) =>
            f.id === 'attention' ? { ...f, count: jumlahNyangkut } : f,
          )}
          value={filter}
          onChange={onFilter}
        />
        <SearchInput
          className="w-full sm:w-[300px]"
          value={draf}
          onChange={setDraf}
          placeholder="Cari nama, email, atau ref Tripay…"
        />
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={onMuatUlang} />
      ) : memuat && !data ? (
        <Skeleton className="h-64" />
      ) : !data || data.transactions.length === 0 ? (
        <EmptyBox
          title={q ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi'}
          description={
            q
              ? `Tidak ada transaksi yang cocok dengan "${q}".`
              : filter === 'attention'
                ? 'Tidak ada pembayaran yang menggantung. Bagus.'
                : 'Tidak ada transaksi pada penyaringan ini.'
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="tabel min-w-[900px]">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Paket</th>
                  <th className="text-right">Nominal</th>
                  <th>Ref Tripay</th>
                  <th className="text-right">Dibuat</th>
                  <th className="text-right">Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {data.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/40">
                    <td>
                      <button
                        className="block w-full text-left"
                        onClick={() => onBukaPengguna(t.user.id)}
                      >
                        <IdentitasPengguna nama={t.user.name} email={t.user.email} />
                      </button>
                    </td>
                    <td>{t.plan.name}</td>
                    <td className="text-right font-semibold">{formatRupiah(t.amount)}</td>
                    <td>
                      <span className="kode text-muted-foreground">{t.reference ?? '—'}</span>
                    </td>
                    <td className="whitespace-nowrap text-right text-[13px] text-muted-foreground">
                      <span title={formatWaktu(t.createdAt)}>{formatSejak(t.createdAt)}</span>
                    </td>
                    <td className="text-right">
                      <Status t={t} />
                    </td>
                    <td className="text-right">
                      <Button
                        // Tanpa reference tidak ada yang bisa ditanyakan ke Tripay —
                        // tombolnya tetap tampil tapi jadi ghost supaya tidak menarik mata.
                        variant={t.reference ? 'outline' : 'ghost'}
                        size="sm"
                        disabled={!t.reference || sedangProses === t.id}
                        title={
                          t.reference
                            ? 'Tanya ulang status ke Tripay'
                            : 'Transaksi belum punya reference Tripay'
                        }
                        onClick={async () => {
                          setGagal(null);
                          try {
                            await onRekonsiliasi(t);
                          } catch (e) {
                            setGagal(e instanceof Error ? e.message : 'Rekonsiliasi gagal');
                          }
                        }}
                      >
                        <IkonUlang />
                        {sedangProses === t.id ? 'Memeriksa…' : 'Verifikasi ulang'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {gagalRekonsiliasi && (
            <div className="px-4 pt-4">
              <Alert variant="destructive" title={gagalRekonsiliasi} />
            </div>
          )}

          <Pager
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            totalItems={data.pagination.totalItems}
            onChange={onHalaman}
          />
        </Card>
      )}

      {hasil && <HasilRekonsiliasi hasil={hasil} onTutup={onTutupHasil} />}
    </div>
  );
}
