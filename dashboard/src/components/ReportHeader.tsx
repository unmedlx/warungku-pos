import { ApiError, downloadExport } from '@/lib/api';
import type { ReportFilter } from '@/hooks/use-report-filter';
import { PageHeader } from './Common';
import { RangeControls } from './RangeControls';

/**
 * Kepala halaman untuk ketiga laporan berkala. Dipakai bersama supaya judul,
 * subjudul, dan kontrol rentang berada di posisi yang sama di setiap halaman.
 * Kelompok halaman (Laporan/Akun) tidak lagi diulang di sini — sudah ada di
 * breadcrumb topbar.
 */
export function ReportHeader({
  title,
  subtitle,
  filter,
  busy,
  onError,
}: {
  title: string;
  subtitle: string;
  filter: ReportFilter;
  busy: boolean;
  onError: (message: string) => void;
}) {
  const onExport = async (dataset: 'daily' | 'transactions') => {
    try {
      await downloadExport(dataset, filter.range);
    } catch (err) {
      // 401 sudah memicu logout — memasang kotak error di sini hanya membuat
      // pesan merah berkelebat sepersekian detik sebelum layar login muncul.
      if (err instanceof ApiError && err.status === 401) return;
      onError(err instanceof Error ? err.message : 'Ekspor gagal');
    }
  };

  return (
    <PageHeader title={title} subtitle={subtitle}>
      <RangeControls
        presetId={filter.presetId}
        range={filter.range}
        busy={busy}
        onPreset={filter.setPreset}
        onRange={filter.setRange}
        onRefresh={filter.refresh}
        onExport={onExport}
      />
    </PageHeader>
  );
}
