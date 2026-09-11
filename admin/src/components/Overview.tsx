import type { ReactNode } from 'react';
import type { Overview, PlanBreakdown } from '@/lib/types';
import { formatAngka, formatRupiah, formatRupiahRingkas } from '@/lib/format';
import { Badge, Card, CardHead, ItemMedia, SectionTitle, Skeleton, StatCard } from './Common';
import { cn } from '@/lib/cn';

function Ikon({ d, ukuran = 20 }: { d: ReactNode; ukuran?: number }) {
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
 * Kartu antrean kerja. Seluruh kartunya adalah tombol, bukan cuma tautan kecil
 * di bawahnya: yang diklik orang memang "urusan ini", jadi target kliknya
 * dibuat sebesar kartunya.
 *
 * Kartu dengan jumlah > 0 diberi latar dan garis bernada; yang nol tampil
 * tenang supaya mata langsung jatuh ke yang benar-benar perlu dikerjakan.
 */
function KartuAntrean({
  judul,
  jumlah,
  keterangan,
  nada,
  ikon,
  onAksi,
}: {
  judul: string;
  jumlah: number;
  keterangan: string;
  nada: 'destructive' | 'warning' | 'info';
  ikon: ReactNode;
  onAksi: () => void;
}) {
  const perluDitangani = jumlah > 0;
  const penekanan: Record<typeof nada, string> = {
    destructive: 'border-destructive/30 bg-destructive/5',
    warning: 'border-warning/30 bg-warning/5',
    info: 'border-info/30 bg-info/5',
  };

  return (
    <button
      type="button"
      onClick={onAksi}
      className="text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
    >
      <Card
        className={cn(
          'flex h-full items-center gap-3 p-4 hover:bg-muted/40',
          perluDitangani && penekanan[nada],
        )}
      >
        <ItemMedia tone={perluDitangani ? nada : 'muted'}>
          <Ikon d={ikon} />
        </ItemMedia>
        <div className="min-w-0 flex-1">
          <div className="text-[22px] font-semibold leading-tight tabular-nums">{jumlah}</div>
          <div className="mt-0.5 text-sm font-medium">{judul}</div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">{keterangan}</div>
        </div>
        <span className="flex-none text-muted-foreground">
          <Ikon d={<path d="m9 6 6 6-6 6" />} ukuran={16} />
        </span>
      </Card>
    </button>
  );
}

export function OverviewSection({
  data,
  paket,
  onBukaTransaksi,
  onBukaPengguna,
}: {
  data: Overview | null;
  paket: PlanBreakdown | null;
  onBukaTransaksi: () => void;
  onBukaPengguna: (filter: 'expiring' | 'near_quota') => void;
}) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
    );
  }

  const totalPendapatanPaket = paket?.plans.reduce((s, p) => s + p.revenueThisMonth, 0) ?? 0;
  const totalBerbayar = paket?.plans.reduce((s, p) => s + p.users, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pengguna terdaftar" value={formatAngka(data.users.total)}>
          <Badge variant="success" size="sm">
            +{formatAngka(data.users.new)}
          </Badge>
          <span>dalam 30 hari</span>
        </StatCard>
        <StatCard label="Pengguna aktif" value={formatAngka(data.users.active)}>
          <span>sync atau backup {data.users.activeWindowDays} hari terakhir</span>
        </StatCard>
        <StatCard label="Langganan aktif" value={formatAngka(data.subscriptions.active)}>
          {/* Badge peringatan hanya muncul kalau memang ada yang segera habis. */}
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
        </StatCard>
      </div>

      <section>
        <SectionTitle title="Perlu ditangani" hint="antrean kerja, bukan sekadar angka" />
        <div className="grid gap-4 lg:grid-cols-3">
          <KartuAntrean
            judul="Pembayaran nyangkut"
            jumlah={data.queue.stuckPayments}
            keterangan="Pending >24 jam atau gagal. Pelanggan sudah bayar tapi paket belum aktif."
            nada="destructive"
            ikon={
              <>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </>
            }
            onAksi={onBukaTransaksi}
          />
          <KartuAntrean
            judul="Langganan segera habis"
            jumlah={data.queue.expiringSubscriptions}
            keterangan="Berakhir dalam 30 hari ke depan."
            nada="warning"
            ikon={
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </>
            }
            onAksi={() => onBukaPengguna('expiring')}
          />
          <KartuAntrean
            judul="Kuota hampir penuh"
            jumlah={data.queue.nearQuota}
            keterangan="Pemakaian storage >85%. Peluang tawarkan paket lebih besar."
            nada="info"
            ikon={
              <>
                <path d="M4 7h16M4 12h16M4 17h10" />
              </>
            }
            onAksi={() => onBukaPengguna('near_quota')}
          />
        </div>
      </section>

      <Card>
        <CardHead
          title="Sebaran paket"
          hint={`${formatAngka(data.users.total)} pengguna · ${formatAngka(data.stores.total)} toko`}
        />
        {!paket ? (
          <div className="p-4">
            <Skeleton className="h-32" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel min-w-[680px]">
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
                    <td className={cn('text-right', !p.revenueThisMonth && 'text-muted-foreground')}>
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
  );
}
