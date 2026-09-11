import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchTrend } from '@/lib/api';
import type { Trend } from '@/lib/types';
import type { ReportFilter } from '@/hooks/use-report-filter';
import { ErrorBox } from '@/components/Common';
import { ReportHeader } from '@/components/ReportHeader';
import { TrendSection } from '@/components/TrendChart';

export default function TrenPage({ filter }: { filter: ReportFilter }) {
  const [data, setData] = useState<Trend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { nonce } = filter;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTrend(12));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(err instanceof Error ? err.message : 'Gagal memuat tren');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  return (
    <>
      {/*
        Tren selalu 12 bulan penuh — endpoint `/analytics/trend` memakai
        parameter `months`, bukan rentang tanggal. Kontrol rentang tetap
        ditampilkan supaya pilihan periode tidak hilang saat pindah halaman,
        tapi subjudulnya menegaskan grafik ini tidak mengikutinya.
      */}
      <ReportHeader
        title="Tren Jangka Panjang"
        subtitle="12 bulan terakhir, dibanding periode sama tahun lalu"
        filter={filter}
        busy={loading}
        onError={setError}
      />

      {error && (
        <div className="mb-5">
          <ErrorBox message={error} onRetry={() => void load()} />
        </div>
      )}

      <TrendSection data={data} loading={loading} />
    </>
  );
}
