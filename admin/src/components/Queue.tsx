import { useState } from 'react';
import type { ReactNode } from 'react';
import type { TransactionRow, UserRow } from '@/lib/types';
import { formatMb, formatRupiah, formatSejak, formatWaktu } from '@/lib/format';
import {
  AksiBaris,
  Alert,
  Badge,
  Button,
  Card,
  EmptyBox,
  ErrorBox,
  IdentitasPengguna,
  Skeleton,
  Tabs,
} from './Common';

/**
 * Antrean kerja — satu tempat untuk semua yang menunggu tindakan admin.
 *
 * Sebelumnya ini hanya tiga kartu angka di Ringkasan: angkanya terlihat, tapi
 * untuk mengerjakannya orang harus pindah halaman, memasang penyaring yang
 * benar, lalu mencari barisnya. Di sini barisnya langsung ada beserta tombol
 * yang menyelesaikannya.
 *
 * Datanya dirakit dari tiga permintaan yang sudah ada (pembayaran "attention",
 * pengguna "expiring", pengguna "near_quota") — tidak ada endpoint antrean
 * tersendiri di backend, dan memang belum perlu.
 */

export type JenisAntrean = 'semua' | 'bayar' | 'habis' | 'kuota';

function IkonUlang() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[14px] w-[14px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" />
    </svg>
  );
}

/** Satu baris antrean, sudah diseragamkan dari tiga sumber yang berbeda. */
interface Baris {
  key: string;
  jenis: Exclude<JenisAntrean, 'semua'>;
  /** Untuk mengurutkan: makin besar makin mendesak. */
  bobot: number;
  user: { id: string; name: string; email: string };
  detail: ReactNode;
  sejak: string;
  aksi: ReactNode;
}

const JENIS: Record<
  Exclude<JenisAntrean, 'semua'>,
  { label: string; variant: 'destructive' | 'warning' | 'info' }
> = {
  bayar: { label: 'Pembayaran nyangkut', variant: 'destructive' },
  habis: { label: 'Segera habis', variant: 'warning' },
  kuota: { label: 'Kuota hampir penuh', variant: 'info' },
};

export function QueueSection({
  pembayaran,
  segeraHabis,
  kuotaPenuh,
  memuat,
  error,
  sedangRekonsiliasi,
  onRekonsiliasi,
  onBukaPengguna,
  onMuatUlang,
}: {
  pembayaran: TransactionRow[] | null;
  segeraHabis: UserRow[] | null;
  kuotaPenuh: UserRow[] | null;
  memuat: boolean;
  error: string | null;
  sedangRekonsiliasi: string | null;
  /** Mengembalikan promise supaya kegagalannya bisa ditangkap dan ditampilkan. */
  onRekonsiliasi: (t: TransactionRow) => Promise<void>;
  onBukaPengguna: (id: string) => void;
  onMuatUlang: () => void;
}) {
  const [tab, setTab] = useState<JenisAntrean>('semua');
  const [gagal, setGagal] = useState<string | null>(null);

  // Rekonsiliasi memanggil Tripay dan bisa gagal karena jaringan. Tanpa
  // penangkapan di sini, kegagalannya jadi unhandled rejection dan layarnya
  // diam saja — orang mengira tombolnya tidak berfungsi.
  const jalankanRekonsiliasi = async (t: TransactionRow) => {
    setGagal(null);
    try {
      await onRekonsiliasi(t);
    } catch (e) {
      setGagal(e instanceof Error ? e.message : 'Rekonsiliasi gagal.');
    }
  };

  if (error) return <ErrorBox message={error} onRetry={onMuatUlang} />;
  if (memuat && !pembayaran && !segeraHabis && !kuotaPenuh) return <Skeleton className="h-96" />;

  const baris: Baris[] = [
    ...(pembayaran ?? []).map<Baris>((t) => ({
      key: `bayar-${t.id}`,
      jenis: 'bayar',
      // Pembayaran menggantung paling mendesak: pelanggan sudah membayar tapi
      // paketnya belum aktif, dan tiap jam tambahan berujung tiket support.
      bobot: 1000 + t.ageHours,
      user: t.user,
      detail: (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="kode">{t.reference ?? 'tanpa ref'}</span>
          <span aria-hidden="true">·</span>
          <span>{t.plan.name}</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium tabular-nums">{formatRupiah(t.amount)}</span>
          <Badge variant={t.ageHours >= 24 ? 'destructive' : 'warning'} size="sm">
            {t.status} {t.ageHours}&nbsp;jam
          </Badge>
        </span>
      ),
      sejak: t.createdAt,
      aksi: (
        <>
          <Button
            variant={t.reference ? 'primary' : 'ghost'}
            size="sm"
            disabled={!t.reference || sedangRekonsiliasi === t.id}
            title={
              t.reference ? 'Tanya ulang status ke Tripay' : 'Transaksi belum punya reference Tripay'
            }
            onClick={() => void jalankanRekonsiliasi(t)}
          >
            <IkonUlang />
            {sedangRekonsiliasi === t.id ? 'Memeriksa…' : 'Verifikasi'}
          </Button>
          <Button size="sm" onClick={() => onBukaPengguna(t.user.id)}>
            Buka
          </Button>
        </>
      ),
    })),

    ...(segeraHabis ?? []).map<Baris>((u) => {
      const sisa = u.subscription?.daysLeft ?? 0;
      return {
        key: `habis-${u.id}`,
        jenis: 'habis',
        // Makin sedikit sisa harinya makin mendesak; yang sudah lewat paling atas.
        bobot: 500 - sisa,
        user: u,
        detail: (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{u.plan?.name ?? 'Gratis'}</span>
            <span aria-hidden="true">·</span>
            <Badge variant={sisa <= 0 ? 'destructive' : 'warning'} size="sm">
              {sisa <= 0 ? `Kedaluwarsa ${Math.abs(sisa)} hari` : `Habis ${sisa} hari lagi`}
            </Badge>
          </span>
        ),
        sejak: u.subscription?.endDate ?? u.createdAt,
        aksi: (
          <Button variant="primary" size="sm" onClick={() => onBukaPengguna(u.id)}>
            Beri langganan
          </Button>
        ),
      };
    }),

    ...(kuotaPenuh ?? []).map<Baris>((u) => ({
      key: `kuota-${u.id}`,
      jenis: 'kuota',
      bobot: u.storage.ratio * 100,
      user: u,
      detail: (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
          <span>
            {formatMb(u.storage.usedMb)} / {formatMb(u.storage.limitMb)}
          </span>
          <Badge variant={u.storage.ratio >= 0.97 ? 'destructive' : 'info'} size="sm">
            {Math.round(u.storage.ratio * 100)}%
          </Badge>
        </span>
      ),
      sejak: u.lastActivityAt ?? u.createdAt,
      aksi: (
        <Button size="sm" onClick={() => onBukaPengguna(u.id)}>
          Tawarkan paket
        </Button>
      ),
    })),
  ].sort((a, b) => b.bobot - a.bobot);

  const hitung = {
    semua: baris.length,
    bayar: baris.filter((b) => b.jenis === 'bayar').length,
    habis: baris.filter((b) => b.jenis === 'habis').length,
    kuota: baris.filter((b) => b.jenis === 'kuota').length,
  };

  const tampil = tab === 'semua' ? baris : baris.filter((b) => b.jenis === tab);

  if (baris.length === 0) {
    return (
      <EmptyBox
        title="Antrean kosong"
        description="Tidak ada pembayaran menggantung, langganan yang segera habis, atau kuota yang hampir penuh. Tidak ada yang perlu dikerjakan sekarang."
        icon={
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        }
        action={
          <Button size="sm" onClick={onMuatUlang}>
            Segarkan
          </Button>
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'semua', label: 'Semua', count: hitung.semua },
          { id: 'bayar', label: JENIS.bayar.label, count: hitung.bayar },
          { id: 'habis', label: JENIS.habis.label, count: hitung.habis },
          { id: 'kuota', label: JENIS.kuota.label, count: hitung.kuota },
        ]}
      />

      {gagal && (
        <div className="px-4 pt-4">
          <Alert variant="destructive" title={gagal} />
        </div>
      )}

      {tampil.length === 0 ? (
        <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
          Tidak ada yang menunggu di kategori ini.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabel min-w-[900px]">
            <thead>
              <tr>
                <th>Jenis</th>
                <th>Pengguna</th>
                <th>Detail</th>
                <th className="text-right">Sejak</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((b) => (
                <tr key={b.key} className="group">
                  <td>
                    <Badge variant={JENIS[b.jenis].variant} size="sm">
                      {JENIS[b.jenis].label}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="block w-full text-left"
                      onClick={() => onBukaPengguna(b.user.id)}
                    >
                      <IdentitasPengguna nama={b.user.name} email={b.user.email} />
                    </button>
                  </td>
                  <td className="text-[13px] text-muted-foreground">{b.detail}</td>
                  <td
                    className="whitespace-nowrap text-right text-[13px] text-muted-foreground"
                    title={formatWaktu(b.sejak)}
                  >
                    {formatSejak(b.sejak)}
                  </td>
                  <td>
                    <AksiBaris>{b.aksi}</AksiBaris>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Dirakit dari pembayaran yang perlu ditangani serta pengguna dengan langganan segera habis
        dan kuota hampir penuh. Hanya halaman pertama tiap sumber yang ditarik, jadi angka di sini
        bisa lebih kecil dari kartu di Ringkasan.
      </div>
    </Card>
  );
}
