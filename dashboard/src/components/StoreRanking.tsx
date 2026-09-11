import { TriangleAlert } from 'lucide-react';
import type { StoreOverview } from '@/lib/types';
import { formatNumber, formatPercent, formatRelative, formatRp, formatRpShort } from '@/lib/format';
import { Avatar, Bar, DeltaBadge, Skeleton } from './Common';
import { initials } from './Sidebar';
import { cn } from '@/lib/cn';

/**
 * Peringkat toko — pengganti grid kartu "Per toko" yang lama.
 *
 * Kartu lama menampilkan angka *hari ini* sementara KPI di atasnya memakai
 * rentang terpilih; dua kerangka waktu dalam satu layar. Di sini semuanya
 * memakai rentang yang sama, jadi kontribusi antar cabang benar-benar bisa
 * dijumlahkan dan dibandingkan.
 */
export function StoreRanking({
  stores,
  totalRevenue,
  loading,
}: {
  stores: StoreOverview[];
  totalRevenue: number;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-[280px]" />;

  const urut = [...stores].sort((a, b) => b.current.revenue - a.current.revenue);

  return (
    <div className="overflow-x-auto">
      <table className="tabel min-w-[820px]">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Toko</th>
            <th className="w-[200px]">Kontribusi omzet</th>
            <th className="text-right">Omzet</th>
            <th className="text-right">Laba bersih</th>
            <th className="text-right">vs periode lalu</th>
          </tr>
        </thead>
        <tbody>
          {urut.map((s, i) => {
            const kontribusi = totalRevenue > 0 ? (s.current.revenue / totalRevenue) * 100 : 0;
            return (
              <tr key={s.id}>
                <td>
                  <span
                    className={cn(
                      'grid h-[22px] w-[22px] place-items-center rounded-md text-xs font-medium',
                      i === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i + 1}
                  </span>
                </td>

                <td>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {s.logoUrl ? (
                      <img
                        src={s.logoUrl}
                        alt=""
                        className="h-8 w-8 flex-none rounded-lg object-cover"
                      />
                    ) : (
                      <Avatar square tone={s.stale ? 'warning' : i === 0 ? 'primary' : 'muted'}>
                        {initials(s.name)}
                      </Avatar>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span
                        className={cn(
                          'mt-0.5 flex items-center gap-1.5 text-xs',
                          s.stale ? 'text-warning-text' : 'text-success-text',
                        )}
                      >
                        {s.stale ? (
                          <TriangleAlert size={12} className="flex-none" />
                        ) : (
                          <i className="h-1.5 w-1.5 flex-none rounded-full bg-success" />
                        )}
                        <span className="truncate">
                          {s.lastSyncedAt
                            ? `Tersinkron ${formatRelative(s.lastSyncedAt)}`
                            : 'Belum pernah sinkron'}
                        </span>
                      </span>
                    </span>
                  </div>
                </td>

                <td>
                  <div className="flex items-center gap-2.5">
                    <Bar
                      percent={kontribusi}
                      tone={s.stale ? 'faded' : 'primary'}
                      className="min-w-[40px] flex-1"
                    />
                    <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                      {formatPercent(kontribusi, 0)}
                    </span>
                  </div>
                </td>

                <td className="text-right">
                  <div className="font-medium tabular-nums" title={formatRp(s.current.revenue)}>
                    {formatRpShort(s.current.revenue)}
                  </div>
                  <div className="sel-sub tabular-nums">
                    {formatNumber(s.current.transactions)} nota
                  </div>
                </td>

                <td className="text-right">
                  <div className="font-medium tabular-nums" title={formatRp(s.current.netProfit)}>
                    {formatRpShort(s.current.netProfit)}
                  </div>
                  <div className="sel-sub">margin {formatPercent(s.current.margin)}</div>
                </td>

                <td className="text-right">
                  <DeltaBadge value={s.delta.revenue} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
