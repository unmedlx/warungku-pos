import { useState } from 'react';
import type { Growth } from '@/lib/types';
import { formatAngka, formatRupiah, formatRupiahRingkas } from '@/lib/format';
import { Card, SectionTitle, Skeleton } from './Common';

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function labelBulan(kunci: string) {
  const [tahun, bulan] = kunci.split('-');
  return { pendek: NAMA_BULAN[Number(bulan) - 1] ?? kunci, panjang: `${NAMA_BULAN[Number(bulan) - 1]} ${tahun}` };
}

/* Sistem koordinat grafik — dipakai bareng oleh batang, kisi, dan label. */
const W = 640;
const H = 190;
const ATAS = 12;
const DASAR = 158;

/**
 * Pendaftar dan pendapatan sengaja dipisah jadi dua panel, bukan ditumpuk di
 * satu grafik dengan dua sumbu Y. Skalanya beda jauh (puluhan orang vs jutaan
 * rupiah), dan grafik dua sumbu membuat perpotongan garis tampak bermakna
 * padahal cuma akibat pemilihan skala.
 */
function Panel({
  judul,
  data,
  warna,
  format,
  formatRingkas,
}: {
  judul: string;
  data: { kunci: string; nilai: number }[];
  warna: string;
  format: (v: number) => string;
  formatRingkas: (v: number) => string;
}) {
  const [aktif, setAktif] = useState<number | null>(null);

  const maks = Math.max(...data.map((d) => d.nilai), 1);
  const indeksTertinggi = data.findIndex((d) => d.nilai === maks);
  const total = data.reduce((s, d) => s + d.nilai, 0);

  /* Lebar slot per bulan; batangnya sedikit lebih ramping supaya ada jeda. */
  const slot = W / data.length;
  const lebarBatang = Math.max(slot * 0.62, 3);

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{judul}</h3>
        <span className="text-xs text-muted-foreground">
          total <span className="tabular-nums">{formatRingkas(total)}</span>
        </span>
      </div>

      <div className="relative mt-4">
        <svg
          className="w-full"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${judul} per bulan`}
          onMouseLeave={() => setAktif(null)}
        >
          {/* Kisi dibuat samar — data yang harus menonjol, bukan garis bantunya. */}
          <g className="stroke-border" strokeWidth={1}>
            {[ATAS, (ATAS + DASAR) / 2, DASAR].map((y) => (
              <line key={y} x1={0} y1={y} x2={W} y2={y} strokeDasharray="2 4" />
            ))}
          </g>

          {data.map((d, i) => {
            const tinggiPenuh = (d.nilai / maks) * (DASAR - ATAS);
            const tinggi = d.nilai > 0 ? Math.max(tinggiPenuh, 3) : 0;
            const x = i * slot + (slot - lebarBatang) / 2;
            const disorot = aktif === i;
            return (
              <g key={d.kunci}>
                <rect
                  x={x}
                  y={DASAR - tinggi}
                  width={lebarBatang}
                  height={tinggi}
                  rx={3}
                  className={warna}
                  opacity={aktif === null || disorot ? 1 : 0.35}
                />
                {/* Label langsung hanya pada bulan tertinggi — bukan tiap batang. */}
                {i === indeksTertinggi && d.nilai > 0 && !disorot && (
                  <text
                    x={i * slot + slot / 2}
                    y={DASAR - tinggi - 5}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={500}
                    className="fill-muted-foreground"
                  >
                    {formatRingkas(d.nilai)}
                  </text>
                )}
                {/* Area tangkap sepanjang kolom: batang pendek tetap gampang disorot. */}
                <rect
                  x={i * slot}
                  y={0}
                  width={slot}
                  height={H}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${labelBulan(d.kunci).panjang}: ${format(d.nilai)}`}
                  onMouseEnter={() => setAktif(i)}
                  onFocus={() => setAktif(i)}
                  onBlur={() => setAktif(null)}
                />
                <text
                  x={i * slot + slot / 2}
                  y={H - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={disorot ? 500 : 400}
                  className={disorot ? 'fill-foreground' : 'fill-muted-foreground'}
                >
                  {labelBulan(d.kunci).pendek}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip tetap HTML supaya ukuran teks dan padding-nya tidak ikut
            diskalakan oleh viewBox. */}
        {aktif !== null && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md"
            style={{ left: `${((aktif + 0.5) / data.length) * 100}%` }}
          >
            <span className="font-medium tabular-nums">{format(data[aktif].nilai)}</span>
            <span className="ml-1.5 opacity-70">{labelBulan(data[aktif].kunci).panjang}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function GrowthSection({ data }: { data: Growth | null }) {
  if (!data) {
    return (
      <section>
        <SectionTitle title="Pertumbuhan" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[220px]" />
          <Skeleton className="h-[220px]" />
        </div>
      </section>
    );
  }

  if (data.months.length === 0) {
    return (
      <section>
        <SectionTitle title="Pertumbuhan" />
        <Card className="grid place-items-center p-10 text-center text-sm text-muted-foreground">
          Belum ada data bulanan. Grafik muncul setelah ada pendaftar atau pembayaran pertama.
        </Card>
      </section>
    );
  }

  return (
    <section>
      <SectionTitle title="Pertumbuhan" hint={`${data.months.length} bulan terakhir`} />
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Warna batang lewat kelas token, bukan atribut fill heksadesimal —
            supaya ikut berubah di mode gelap. */}
        <Panel
          judul="Pendaftar baru"
          data={data.months.map((m) => ({ kunci: m.month, nilai: m.signups }))}
          warna="fill-chart-1"
          format={(v) => `${formatAngka(v)} pendaftar`}
          formatRingkas={formatAngka}
        />
        <Panel
          judul="Pendapatan"
          data={data.months.map((m) => ({ kunci: m.month, nilai: m.revenue }))}
          warna="fill-chart-2"
          format={formatRupiah}
          formatRingkas={formatRupiahRingkas}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Skala tiap panel berdiri sendiri — tinggi batang hanya bisa dibandingkan di dalam satu
        panel, bukan antar panel.
      </p>
    </section>
  );
}
