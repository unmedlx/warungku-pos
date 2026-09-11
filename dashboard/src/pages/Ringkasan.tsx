import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Store } from 'lucide-react';
import { ApiError, fetchOverview, fetchTrend } from '@/lib/api';
import type { Health, Overview, Profile, Trend } from '@/lib/types';
import type { ReportFilter } from '@/hooks/use-report-filter';
import { formatDateTime, formatNumber, formatPercent, formatRp, formatRpShort } from '@/lib/format';
import {
  Card,
  CardHead,
  DeltaBadge,
  EmptyBox,
  ErrorBox,
  SectionTitle,
  Skeleton,
  StatCard,
} from '@/components/Common';
import { ReportHeader } from '@/components/ReportHeader';
import { AttentionChips } from '@/components/AttentionChips';
import { ProfitHero } from '@/components/ProfitHero';
import { StoreRanking } from '@/components/StoreRanking';
import { TrendSection } from '@/components/TrendChart';

/** Panjang rentang dalam hari, dipakai untuk label dan rata-rata harian. */
function rangeDays(range: Overview['range']): number {
  if (!range) return 1;
  const ms = new Date(range.to).getTime() - new Date(range.from).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export default function Ringkasan({
  profile,
  health,
  filter,
  onReloadAccount,
}: {
  profile: Profile | null;
  health: Health | null;
  filter: ReportFilter;
  onReloadAccount: () => void;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<Trend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const { range, nonce } = filter;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, t] = await Promise.all([fetchOverview(range), fetchTrend(12)]);
      setOverview(o);
      setTrend(t);
      setFetchedAt(new Date());
    } catch (err) {
      // 401 sudah ditangani handler global — di sini cukup error yang bisa dicoba lagi.
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data');
      }
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  useEffect(() => {
    if (nonce > 0) onReloadAccount();
  }, [nonce, onReloadAccount]);

  const days = rangeDays(overview?.range ?? null);
  const totals = overview?.totals ?? null;
  const noStores = !loading && overview !== null && overview.stores.length === 0;

  const subtitle = [
    profile?.name ? `Halo, ${profile.name.split(' ')[0]}` : null,
    overview ? `${overview.stores.length} toko` : null,
    fetchedAt ? `data per ${formatDateTime(fetchedAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <ReportHeader
        title="Ringkasan"
        subtitle={subtitle || 'Memuat…'}
        filter={filter}
        busy={loading}
        onError={setError}
      />

      <AttentionChips health={health} />

      {error && (
        <div className="mb-5">
          <ErrorBox message={error} onRetry={() => void load()} />
        </div>
      )}

      {noStores ? (
        <EmptyBox
          icon={<Store size={20} strokeWidth={1.75} />}
          title="Belum ada toko tersambung"
          description="Aktifkan Cloud di aplikasi kasir dan buat toko lebih dulu. Setelah kasir mengirim data pertamanya, laporannya muncul di sini."
        />
      ) : (
        <>
          <section className="mb-4">
            <ProfitHero
              current={totals?.current ?? null}
              previous={totals?.previous ?? null}
              delta={totals?.delta ?? null}
              loading={loading}
              days={days}
            />
          </section>

          <section className="mb-5">
            {loading || !totals ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[104px]" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Omzet"
                  value={formatRpShort(totals.current.revenue)}
                  title={formatRp(totals.current.revenue)}
                >
                  <DeltaBadge value={totals.delta.revenue} />
                  <span>dari {formatRpShort(totals.previous.revenue)}</span>
                </StatCard>
                <StatCard label="Transaksi" value={formatNumber(totals.current.transactions)}>
                  <DeltaBadge value={totals.delta.transactions} />
                  <span>{formatNumber(totals.current.transactions / days)} / hari</span>
                </StatCard>
                <StatCard
                  label="Rata-rata nota"
                  value={formatRpShort(totals.current.avgTicket)}
                  title={formatRp(totals.current.avgTicket)}
                >
                  <DeltaBadge value={totals.delta.avgTicket} />
                  <span>dari {formatRpShort(totals.previous.avgTicket)}</span>
                </StatCard>
                <StatCard
                  label="Diskon diberikan"
                  value={formatRpShort(totals.current.discount)}
                  title={formatRp(totals.current.discount)}
                >
                  <span>
                    {totals.current.revenue > 0
                      ? `${formatPercent((totals.current.discount / totals.current.revenue) * 100)} dari omzet`
                      : '—'}
                  </span>
                </StatCard>
              </div>
            )}
          </section>

          <section className="mb-5">
            {loading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <Card className="overflow-hidden">
                <CardHead title="Peringkat toko" hint="urut dari omzet terbesar">
                  <Link
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                    to="/bandingkan"
                  >
                    Bandingkan detail <ArrowRight size={14} />
                  </Link>
                </CardHead>
                <StoreRanking
                  stores={overview?.stores ?? []}
                  totalRevenue={totals?.current.revenue ?? 0}
                  loading={loading}
                />
              </Card>
            )}
          </section>

          <section>
            <SectionTitle title="Tren omzet 12 bulan" hint="garis putus-putus = tahun lalu">
              <Link
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                to="/tren"
              >
                Tren lengkap <ArrowRight size={14} />
              </Link>
            </SectionTitle>
            <TrendSection data={trend} loading={loading} />
          </section>
        </>
      )}
    </>
  );
}
