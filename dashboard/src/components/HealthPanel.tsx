import { CheckCircle2, Clock, Database, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Health } from '@/lib/types';
import { formatDate, formatDateTime, formatRelative, formatRp } from '@/lib/format';
import {
  Badge,
  Bar,
  buttonClass,
  Card,
  CardBody,
  CardHead,
  Item,
  ItemContent,
  ItemList,
  ItemMedia,
  Skeleton,
} from './Common';

type Tone = 'success' | 'warning' | 'destructive' | 'muted';

function Baris({
  tone,
  icon,
  title,
  desc,
  aksi,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  desc: string;
  aksi?: ReactNode;
}) {
  return (
    <Item>
      <ItemMedia tone={tone}>{icon}</ItemMedia>
      <ItemContent title={title} desc={desc} />
      {aksi}
    </Item>
  );
}

/**
 * 1.5 — status data & langganan. Panel ini merangkap dua fungsi: menjaga
 * kepercayaan pada angka (segar atau basi) sekaligus jadi kanal pengingat
 * perpanjangan yang tidak terasa seperti iklan.
 */
export function HealthSection({ data, loading }: { data: Health | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[240px]" />
        <Skeleton className="h-[190px]" />
      </div>
    );
  }

  const stale = data.stores.filter((s) => s.stale);
  const fresh = data.stores.filter((s) => !s.stale);
  const { storage, plan } = data;

  const monthsLeft =
    storage.limitMb > 0 && storage.backupCount > 0 && storage.usedMb > 0
      ? Math.floor(((storage.limitMb - storage.usedMb) / storage.usedMb) * 12)
      : null;

  const langgananMendesak = plan.daysLeft !== null && plan.daysLeft <= 30;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
      <ItemList>
        {stale.map((s) => (
          <Baris
            key={s.id}
            tone="warning"
            icon={<TriangleAlert size={18} strokeWidth={1.75} />}
            title={
              s.neverSynced
                ? `${s.name} belum pernah sinkron`
                : `${s.name} belum sinkron ${formatRelative(s.lastSyncedAt).replace('yang lalu', '')}`
            }
            desc={
              s.lastSyncedAt
                ? `Terakhir ${formatDateTime(s.lastSyncedAt)} · buka aplikasi kasir dan pastikan Cloud aktif`
                : 'Aktifkan Cloud di aplikasi kasir toko ini'
            }
            aksi={
              <Badge variant="warning" size="sm">
                Basi
              </Badge>
            }
          />
        ))}

        {fresh.length > 0 && (
          <Baris
            tone="success"
            icon={<CheckCircle2 size={18} strokeWidth={1.75} />}
            title={`${fresh.length} toko tersinkron normal`}
            desc={fresh.map((s) => `${s.name} ${formatRelative(s.lastSyncedAt)}`).join(' · ')}
            aksi={
              <Badge variant="success" size="sm">
                Segar
              </Badge>
            }
          />
        )}

        {storage.latestBackupAt && (
          <Baris
            tone="muted"
            icon={<Database size={18} strokeWidth={1.75} />}
            title={`${storage.backupCount} berkas cadangan tersimpan`}
            desc={`Cadangan terbaru ${formatDateTime(storage.latestBackupAt)}`}
          />
        )}

        {plan.expiresAt && (
          <Baris
            tone={langgananMendesak ? 'destructive' : 'success'}
            icon={<Clock size={18} strokeWidth={1.75} />}
            title={
              plan.daysLeft !== null && plan.daysLeft >= 0
                ? `Langganan berakhir dalam ${plan.daysLeft} hari`
                : 'Langganan sudah berakhir'
            }
            desc={`${plan.name ?? 'Paket'}${plan.price ? ` · ${formatRp(plan.price)}/bln` : ''} · berakhir ${formatDate(plan.expiresAt)}`}
            aksi={
              <a
                href="https://dashboard.kankitu.com/langganan"
                className={buttonClass('primary', 'sm')}
              >
                Perpanjang
              </a>
            }
          />
        )}
      </ItemList>

      <Card>
        <CardHead title="Penyimpanan" />
        <CardBody>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[22px] font-semibold tabular-nums">{storage.usedMb} MB</span>
            <span className="text-xs text-muted-foreground">/ {storage.limitMb} MB</span>
          </div>
          <Bar
            percent={storage.usedPercent}
            tone={storage.usedPercent > 85 ? 'destructive' : 'primary'}
            className="my-3 h-2"
          />
          <div className="text-xs tabular-nums text-muted-foreground">
            {storage.usedPercent.toFixed(0)}% terpakai · {storage.backupCount} berkas cadangan
          </div>
          {monthsLeft !== null && (
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Pada laju sekarang, kuota cukup untuk sekitar{' '}
              <span className="font-medium text-foreground">{monthsLeft} bulan</span> lagi.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
