import { RefreshCw } from 'lucide-react';
import type { Health } from '@/lib/types';
import { Button, PageHeader } from '@/components/Common';
import { HealthSection } from '@/components/HealthPanel';

export default function StatusData({
  health,
  loading,
  onRefresh,
}: {
  health: Health | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const basi = health ? health.stores.filter((s) => s.stale || s.neverSynced).length : 0;
  const subtitle = health
    ? basi === 0
      ? `${health.stores.length} toko tersinkron normal`
      : `${basi} dari ${health.stores.length} toko perlu perhatian`
    : 'Memuat…';

  return (
    <>
      {/*
        Halaman ini tidak memakai rentang tanggal: isinya keadaan saat ini
        (kapan terakhir sinkron, sisa kuota, sisa langganan), bukan angka
        sepanjang periode. Jadi kontrol rentang sengaja tidak ditampilkan.
      */}
      <PageHeader title="Status Data" subtitle={subtitle}>
        <Button size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Periksa ulang
        </Button>
      </PageHeader>

      <HealthSection data={health} loading={loading} />
    </>
  );
}
