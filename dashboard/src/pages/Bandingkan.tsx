import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchComparison } from '@/lib/api';
import type { Comparison } from '@/lib/types';
import type { ReportFilter } from '@/hooks/use-report-filter';
import { EmptyBox, ErrorBox } from '@/components/Common';
import { GitCompare } from 'lucide-react';
import { ReportHeader } from '@/components/ReportHeader';
import { ComparisonSection } from '@/components/Comparison';

export default function Bandingkan({ filter }: { filter: ReportFilter }) {
  const [data, setData] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { range, nonce } = filter;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchComparison(range));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(err instanceof Error ? err.message : 'Gagal memuat perbandingan');
      }
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  const subtitle =
    data?.range ? `${data.range.from} s/d ${data.range.to}` : 'Perbandingan antar cabang';
  const kosong = !loading && data !== null && data.rows.length === 0;

  return (
    <>
      <ReportHeader
        title="Bandingkan Cabang"
        subtitle={subtitle}
        filter={filter}
        busy={loading}
        onError={setError}
      />

      {error && (
        <div className="mb-5">
          <ErrorBox message={error} onRetry={() => void load()} />
        </div>
      )}

      {kosong ? (
        <EmptyBox
          icon={<GitCompare size={20} strokeWidth={1.75} />}
          title="Belum ada cabang untuk dibandingkan"
          description="Perbandingan muncul setelah ada minimal satu toko yang mengirim data pada rentang tanggal ini."
        />
      ) : (
        <ComparisonSection data={data} loading={loading} />
      )}
    </>
  );
}
