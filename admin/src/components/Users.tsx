import { useEffect, useState } from 'react';
import type { UserFilter, UserList, UserRow } from '@/lib/types';
import { formatAngka, formatMb, formatSejak } from '@/lib/format';
import {
  Badge,
  BilahKuota,
  Card,
  EmptyBox,
  ErrorBox,
  FilterGroup,
  IdentitasPengguna,
  Pager,
  SearchInput,
  Skeleton,
  warnaKuota,
} from './Common';

const FILTER: { id: UserFilter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'paid', label: 'Berbayar' },
  { id: 'free', label: 'Gratis' },
  { id: 'expiring', label: 'Segera habis' },
  { id: 'expired', label: 'Kedaluwarsa' },
  { id: 'near_quota', label: 'Kuota penuh' },
  { id: 'suspended', label: 'Disuspend' },
];

function StatusLangganan({ user }: { user: UserRow }) {
  if (user.suspended)
    return (
      <Badge variant="destructive" size="sm">
        Disuspend
      </Badge>
    );
  if (!user.subscription) return <span className="text-muted-foreground">—</span>;
  const { daysLeft, status } = user.subscription;
  if (daysLeft <= 0)
    return (
      <Badge variant="destructive" size="sm">
        Kedaluwarsa {Math.abs(daysLeft)} hari
      </Badge>
    );
  if (daysLeft <= 30)
    return (
      <Badge variant="warning" size="sm">
        Habis {daysLeft} hari lagi
      </Badge>
    );
  return (
    <Badge variant="success" size="sm">
      {status === 'ACTIVE' ? 'Aktif' : status} · {daysLeft} hari
    </Badge>
  );
}

export function UsersSection({
  data,
  memuat,
  error,
  q,
  filter,
  onQ,
  onFilter,
  onHalaman,
  onBuka,
  onMuatUlang,
}: {
  data: UserList | null;
  memuat: boolean;
  error: string | null;
  q: string;
  filter: UserFilter;
  onQ: (v: string) => void;
  onFilter: (f: UserFilter) => void;
  onHalaman: (p: number) => void;
  onBuka: (id: string) => void;
  onMuatUlang: () => void;
}) {
  // Kotak pencarian dikelola lokal lalu di-debounce, supaya tiap ketikan tidak
  // memicu satu permintaan ke backend.
  const [draf, setDraf] = useState(q);
  useEffect(() => setDraf(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (draf !== q) onQ(draf);
    }, 350);
    return () => clearTimeout(t);
  }, [draf, q, onQ]);

  if (error) return <ErrorBox message={error} onRetry={onMuatUlang} />;

  // Backend hanya mengirim jumlah baris untuk penyaringan yang sedang aktif,
  // jadi angka hitungan hanya ditempelkan di tombol yang sedang dipilih —
  // menebak angka untuk tombol lain akan menyesatkan.
  const daftarFilter = FILTER.map((f) =>
    f.id === filter && data ? { ...f, count: data.pagination.totalItems } : f,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterGroup items={daftarFilter} value={filter} onChange={onFilter} />
        <SearchInput
          value={draf}
          onChange={setDraf}
          placeholder="Cari nama, email, atau nama toko…"
          className="w-full max-w-[300px]"
        />
      </div>

      {memuat && !data ? (
        <Skeleton className="h-72" />
      ) : !data || data.users.length === 0 ? (
        <EmptyBox
          title="Tidak ada pengguna yang cocok"
          description="Coba ganti kata kunci atau pilih penyaringan lain."
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tabel min-w-[880px]">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Paket</th>
                    <th>Langganan</th>
                    <th className="text-right">Toko</th>
                    <th className="text-right">Storage</th>
                    <th className="text-right">Aktivitas terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} onClick={() => onBuka(u.id)} className="klik">
                      <td>
                        <IdentitasPengguna nama={u.name} email={u.email} />
                      </td>
                      <td>
                        {u.plan ? (
                          <Badge variant="primary" size="sm">
                            {u.plan.name}
                          </Badge>
                        ) : (
                          <Badge size="sm">Gratis</Badge>
                        )}
                      </td>
                      <td>
                        <StatusLangganan user={u} />
                      </td>
                      <td className="text-right tabular-nums">{u.stores}</td>
                      <td className="text-right">
                        <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                          <BilahKuota ratio={u.storage.ratio} />
                          <span className={`text-[13px] tabular-nums ${warnaKuota(u.storage.ratio)}`}>
                            {u.storage.limitMb > 0
                              ? `${formatMb(u.storage.usedMb)} / ${formatMb(u.storage.limitMb)}`
                              : '—'}
                          </span>
                        </span>
                      </td>
                      <td className="text-right text-[13px] text-muted-foreground">
                        {formatSejak(u.lastActivityAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pager
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              totalItems={data.pagination.totalItems}
              onChange={onHalaman}
            />
          </Card>

          {filter === 'near_quota' && (
            <p className="text-xs text-muted-foreground">
              Penyaringan kuota dikerjakan setelah data diambil, jadi jumlah barisnya bisa lebih
              sedikit dari{' '}
              <span className="font-medium text-foreground">
                {formatAngka(data.pagination.totalItems)}
              </span>{' '}
              yang tertulis di atas.
            </p>
          )}
        </>
      )}
    </div>
  );
}
