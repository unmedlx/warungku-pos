import type { ReactNode } from 'react';
import type { Growth, Overview, PlanBreakdown } from '@/lib/types';
import { formatAngka, formatRupiah, formatRupiahRingkas } from '@/lib/format';
import { Badge, Button, Card, CardHead, ItemMedia, Skeleton, StatCard } from './Common';
import { cn } from '@/lib/cn';

function Ikon({ d, ukuran = 18 }: { d: ReactNode; ukuran?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={ukuran}
      height={ukuran}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}

/**
 * Garis tren mungil di kaki kartu angka. Sengaja tanpa sumbu, label, atau
 * tooltip: tugasnya cuma menjawab "naik atau turun", angka persisnya sudah ada
 * di grafik Pertumbuhan di bawahnya.
 */
function Sparkline({ nilai, warna }: { nilai: number[]; warna: string }) {
  if (nilai.length < 2) return null;

  const maks = Math.max(...nilai);
  const min = Math.min(...nilai);
  // Rentang nol (semua nilainya sama) akan membuat pembagi 0 — ratakan ke tengah.
  const rentang = maks - min || 1;
  const titik = nilai
    .map((v, i) => {
      const x = (i / (nilai.length - 1)) * 100;
      const y = 26 - ((v - min) / rentang) * 22;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className="mt-1.5 h-6 w-full"
      aria-hidden="true"
    >
      <polyline
        points={titik}
        fill="none"
        stroke={warna}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Antrean kerja versi ringkas. Daftar lengkapnya pindah ke halaman sendiri;
 * yang tinggal di Ringkasan hanya tiga angka beserta jalan masuknya, supaya
 * Ringkasan kembali jadi tempat membaca keadaan, bukan tempat bekerja.
 */
function BarisAntrean({
  judul,
  keterangan,
  jumlah,
  nada,
  ikon,
  onAksi,
}: {
  judul: string;
  keterangan: string;
  jumlah: number;
  nada: 'destructive' | 'warning' | 'info';
  ikon: ReactNode;
  onAksi: () => void;
}) {
  const perlu = jumlah > 0;
  return (
    <button
      type="button"
      onClick={onAksi}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <ItemMedia tone={perlu ? nada : 'muted'}>
        <Ikon d={ikon} />
      </ItemMedia>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{judul}</span>
        <span className="block text-xs text-muted-foreground">{keterangan}</span>
      </span>
      <span
        className={cn(
          'flex-none text-[20px] font-semibold tabular-nums',
          !perlu && 'text-muted-foreground',
        )}
      >
        {jumlah}
      </span>
      <span className="flex-none text-muted-foreground">
        <Ikon d={<path d="m9 6 6 6-6 6" />} ukuran={16} />
      </span>
    </button>
  );
}

export function OverviewSection({
  data,
  paket,
  growth,
  onBukaAntrean,
  onBukaPaket,
}: {
  data: Overview | null;
  paket: PlanBreakdown | null;
  growth: Growth | null;
  /** Membuka halaman Antrean kerja, opsional pada tab tertentu. */
  onBukaAntrean: (tab?: 'bayar' | 'habis' | 'kuota') => void;
  onBukaPaket: () => void;
}) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[124px]" />
        ))}
      </div>
    );
  }

  const bulan = growth?.months ?? [];
  const totalPendapatanPaket = paket?.plans.reduce((s, p) => s + p.revenueThisMonth, 0) ?? 0;
  const totalBerbayar = paket?.plans.reduce((s, p) => s + p.users, 0) ?? 0;
  const totalAntrean =
    data.queue.stuckPayments + data.queue.expiringSubscriptions + data.queue.nearQuota;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pengguna terdaftar" value={formatAngka(data.users.total)}>
          <Badge variant="success" size="sm">
            +{formatAngka(data.users.new)}
          </Badge>
          <span>dalam 30 hari</span>
          <Sparkline nilai={bulan.map((m) => m.signups)} warna="hsl(var(--chart-1))" />
        </StatCard>

        <StatCard label="Pengguna aktif" value={formatAngka(data.users.active)}>
          <span>
            {data.users.total > 0
              ? `${Math.round((data.users.active / data.users.total) * 100)}% dari terdaftar`
              : 'belum ada pengguna'}
          </span>
          <span className="w-full text-[11px]">
            sync atau backup {data.users.activeWindowDays} hari terakhir
          </span>
        </StatCard>

        <StatCard label="Langganan aktif" value={formatAngka(data.subscriptions.active)}>
          {data.subscriptions.expiringSoon > 0 ? (
            <Badge variant="warning" size="sm">
              {formatAngka(data.subscriptions.expiringSoon)} habis &lt;30 hari
            </Badge>
          ) : (
            <span>tidak ada yang segera habis</span>
          )}
        </StatCard>

        <StatCard
          label="Pendapatan bulan ini"
          value={formatRupiahRingkas(data.revenue.thisMonth)}
          title={formatRupiah(data.revenue.thisMonth)}
        >
          <span>bulan lalu {formatRupiahRingkas(data.revenue.lastMonth)}</span>
          <Sparkline nilai={bulan.map((m) => m.revenue)} warna="hsl(var(--chart-2))" />
        </StatCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <Card className="overflow-hidden">
          <CardHead
            title="Antrean kerja"
            hint={totalAntrean > 0 ? `${totalAntrean} menunggu` : 'kosong'}
          >
            <Button variant="link" onClick={() => onBukaAntrean()}>
              Buka semua →
            </Button>
          </CardHead>
          <div className="divide-y divide-border">
            <BarisAntrean
              judul="Pembayaran nyangkut"
              keterangan="Pending lama atau gagal — uang masuk, paket belum aktif"
              jumlah={data.queue.stuckPayments}
              nada="destructive"
              onAksi={() => onBukaAntrean('bayar')}
              ikon={
                <>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </>
              }
            />
            <BarisAntrean
              judul="Langganan segera habis"
              keterangan="Berakhir dalam 30 hari ke depan"
              jumlah={data.queue.expiringSubscriptions}
              nada="warning"
              onAksi={() => onBukaAntrean('habis')}
              ikon={
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </>
              }
            />
            <BarisAntrean
              judul="Kuota hampir penuh"
              keterangan="Storage di atas 85% — peluang tawarkan paket lebih besar"
              jumlah={data.queue.nearQuota}
              nada="info"
              onAksi={() => onBukaAntrean('kuota')}
              ikon={<path d="M4 7h16M4 12h16M4 17h10" />}
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHead
            title="Sebaran paket"
            hint={`${formatAngka(data.users.total)} pengguna · ${formatAngka(data.stores.total)} toko`}
          >
            <Button variant="link" onClick={onBukaPaket}>
              Kelola paket →
            </Button>
          </CardHead>
          {!paket ? (
            <div className="p-4">
              <Skeleton className="h-32" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabel min-w-[620px]">
                <thead>
                  <tr>
                    <th>Paket</th>
                    <th className="text-right">Harga</th>
                    <th className="text-right">Pengguna</th>
                    <th className="text-right">Langganan aktif</th>
                    <th className="text-right">Pendapatan bulan ini</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr>
                    <td>
                      <Badge variant="secondary">Gratis</Badge>
                    </td>
                    <td className="text-right text-muted-foreground">—</td>
                    <td className="text-right">{formatAngka(paket.free.users)}</td>
                    <td className="text-right text-muted-foreground">—</td>
                    <td className="text-right text-muted-foreground">—</td>
                  </tr>
                  {paket.plans.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Badge variant="primary">{p.name}</Badge>
                      </td>
                      <td className="text-right">{formatRupiah(p.price)}</td>
                      <td className="text-right">{formatAngka(p.users)}</td>
                      <td className="text-right">{formatAngka(p.activeSubscriptions)}</td>
                      <td
                        className={cn('text-right', !p.revenueThisMonth && 'text-muted-foreground')}
                      >
                        {p.revenueThisMonth ? formatRupiah(p.revenueThisMonth) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="tabular-nums">
                    <td>Total berbayar</td>
                    <td />
                    <td className="text-right">{formatAngka(totalBerbayar)}</td>
                    <td className="text-right">{formatAngka(data.subscriptions.active)}</td>
                    <td className="text-right">{formatRupiah(totalPendapatanPaket)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
