import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { Metrics, Delta } from '@/lib/types';
import { formatPercent, formatRp, formatRpShort } from '@/lib/format';
import { Badge, Card, Skeleton } from './Common';

function DeltaLaba({ value }: { value: number | null }) {
  if (value === null) return <Badge pill>—</Badge>;
  const naik = value >= 0;
  const Icon = naik ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge variant={naik ? 'success' : 'destructive'} pill className="tabular-nums">
      <Icon size={13} />
      {formatPercent(Math.abs(value))}
    </Badge>
  );
}

/**
 * Batang komposisi omzet: modal (HPP) + biaya operasional + laba bersih.
 *
 * `expenses` dan `grossProfit` sudah dikirim API sejak awal tapi tidak pernah
 * ditampilkan di level total — pemilik toko hanya melihat omzet dan laba, tanpa
 * tahu ke mana perginya selisihnya. Persentase dihitung terhadap jumlah ketiga
 * bagian, bukan terhadap `revenue`, supaya batangnya selalu penuh walau angka
 * dari server tidak persis berjumlah sama (diskon, pembulatan).
 */
function Komposisi({ m }: { m: Metrics }) {
  const modal = Math.max(0, m.revenue - m.grossProfit);
  const biaya = Math.max(0, m.expenses);
  const laba = Math.max(0, m.netProfit);
  const total = modal + biaya + laba;

  // Rugi, atau belum ada omzet sama sekali: batang bertumpuk jadi menyesatkan.
  if (total <= 0 || m.netProfit < 0) {
    return (
      <div className="rounded-xl bg-muted px-4 py-3.5 text-[13px] text-muted-foreground">
        {m.netProfit < 0 ? (
          <>
            Periode ini{' '}
            <span className="font-medium text-destructive-text">
              rugi {formatRp(Math.abs(m.netProfit))}
            </span>{' '}
            — biaya {formatRp(m.expenses)} melebihi laba kotor {formatRp(m.grossProfit)}.
          </>
        ) : (
          'Belum ada omzet pada periode ini.'
        )}
      </div>
    );
  }

  const bagian = [
    { key: 'modal', label: 'Modal (HPP)', nilai: modal, isi: 'bg-primary/25 text-primary', titik: 'bg-primary/25' },
    { key: 'biaya', label: 'Biaya operasional', nilai: biaya, isi: 'bg-warning text-warning-foreground', titik: 'bg-warning' },
    { key: 'laba', label: 'Laba bersih', nilai: laba, isi: 'bg-success text-success-foreground', titik: 'bg-success' },
  ];

  return (
    <>
      <div className="text-[13px] font-medium text-muted-foreground">
        Ke mana perginya omzet {formatRpShort(m.revenue)}
      </div>
      <div className="mt-2.5 flex h-8 overflow-hidden rounded-lg bg-muted">
        {bagian.map((b) => {
          const pct = (b.nilai / total) * 100;
          return (
            <span
              key={b.key}
              className={`grid place-items-center overflow-hidden whitespace-nowrap text-[11.5px] font-medium ${b.isi}`}
              style={{ width: `${pct}%` }}
              title={`${b.label}: ${formatRp(b.nilai)}`}
            >
              {pct >= 8 ? formatPercent(pct, 0) : ''}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        {bagian.map((b) => (
          <div key={b.key}>
            <span className={`mr-1.5 inline-block h-[9px] w-[9px] rounded-xs align-middle ${b.titik}`} />
            {b.label}
            <span className="ml-1.5 font-medium text-foreground tabular-nums" title={formatRp(b.nilai)}>
              {formatRpShort(b.nilai)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export function ProfitHero({
  current,
  previous,
  delta,
  loading,
  days,
}: {
  current: Metrics | null;
  previous: Metrics | null;
  delta: Delta | null;
  loading: boolean;
  days: number;
}) {
  if (loading || !current || !previous || !delta) {
    return <Skeleton className="h-[180px]" />;
  }

  return (
    <Card className="p-5">
      <div className="grid items-center gap-7 xl:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Laba bersih {days} hari</div>
          <div
            className="my-1.5 text-4xl font-semibold leading-tight tracking-tight tabular-nums"
            title={formatRp(current.netProfit)}
          >
            {formatRpShort(current.netProfit)}
          </div>
          <div className="text-xs text-muted-foreground">margin {formatPercent(current.margin)}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeltaLaba value={delta.netProfit} />
            <span className="text-xs text-muted-foreground">
              dari {formatRpShort(previous.netProfit)} periode lalu
            </span>
          </div>
        </div>
        <div>
          <Komposisi m={current} />
        </div>
      </div>
    </Card>
  );
}
