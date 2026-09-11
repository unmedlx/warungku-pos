import { useCallback, useEffect, useState } from 'react';
import { HardDrive, LogOut, Moon, RefreshCw, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ApiError, fetchAccount } from '@/lib/api';
import type { Account, SubscriptionSummary } from '@/lib/types';
import type { Theme } from '@/hooks/use-theme';
import { formatDate, formatNumber, formatRp } from '@/lib/format';
import {
  Alert,
  Avatar,
  Badge,
  Bar,
  Button,
  Card,
  CardBody,
  CardHead,
  DataList,
  DataListRow,
  ErrorBox,
  Item,
  ItemContent,
  ItemList,
  ItemMedia,
  PageHeader,
  SectionTitle,
  Skeleton,
} from '@/components/Common';

/** Sisa hari sampai `endDate`; negatif berarti sudah lewat. */
function daysLeft(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

export default function Pengaturan({
  onLogout,
  theme,
  onThemeChange,
}: {
  onLogout: () => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAccount(await fetchAccount());
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const usage = account?.storageUsage;
  const percent =
    usage && usage.limitMb > 0 ? Math.min((usage.usedMb / usage.limitMb) * 100, 100) : 0;
  const hampirPenuh = percent >= 90;

  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Akun, penyimpanan cloud, dan langganan">
        <Button size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Muat ulang
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-5">
          <ErrorBox message={error} onRetry={() => void load()} />
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {loading || !account ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-[210px]" />
              <Skeleton className="h-[130px]" />
            </div>
          ) : (
            <>
              <Card className="mb-4">
                <CardHead title="Akun" />
                <Item>
                  {account.user.picture ? (
                    <img
                      src={account.user.picture}
                      alt=""
                      className="h-10 w-10 flex-none rounded-full object-cover"
                    />
                  ) : (
                    <Avatar tone="primary" className="h-10 w-10 text-sm">
                      {(account.user.name || account.user.email || '?').slice(0, 1).toUpperCase()}
                    </Avatar>
                  )}
                  <ItemContent
                    title={account.user.name || account.user.email}
                    desc={account.user.email}
                  />
                </Item>
                <CardBody className="border-t border-border py-1">
                  <DataList>
                    <DataListRow
                      label="Bergabung"
                      hint="pertama kali masuk lewat Google"
                      value={formatDate(account.user.createdAt)}
                    />
                    <DataListRow
                      label="Batas toko"
                      hint="mengikuti paket yang aktif"
                      value={
                        account.user.maxStores !== null
                          ? `${account.user.maxStores} toko`
                          : 'Tidak dibatasi'
                      }
                    />
                  </DataList>
                </CardBody>
              </Card>

              <Card className="mb-4">
                <CardHead title="Penyimpanan cloud" hint="cadangan otomatis dari tiap kasir">
                  <Badge variant={hampirPenuh ? 'destructive' : 'outline'} size="sm">
                    {percent.toFixed(0)}% terpakai
                  </Badge>
                </CardHead>
                <CardBody>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[22px] font-semibold tabular-nums">
                      {formatNumber(usage!.usedMb)} MB
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {formatNumber(usage!.limitMb)} MB
                    </span>
                  </div>
                  <Bar
                    percent={percent}
                    tone={hampirPenuh ? 'destructive' : 'primary'}
                    className="my-3 h-2"
                  />
                  <div className="text-xs tabular-nums text-muted-foreground">
                    {account.backups.length} berkas cadangan · sisa{' '}
                    {formatNumber(usage!.remainingMb)} MB
                  </div>
                </CardBody>
              </Card>

              {hampirPenuh && (
                <Alert
                  variant="destructive"
                  icon={<TriangleAlert size={16} />}
                  title="Kuota hampir penuh"
                  description="Hapus cadangan lama atau naikkan paket agar sinkronisasi tidak berhenti."
                  className="mb-4"
                />
              )}

              <SectionTitle title="Langganan" />
              <div className="grid gap-4 sm:grid-cols-2">
                <PlanCard
                  icon={HardDrive}
                  title="Paket penyimpanan"
                  sub={account.subscription}
                  kosong="Belum berlangganan paket penyimpanan."
                />
                <PlanCard
                  icon={RefreshCw}
                  title="Paket sinkronisasi"
                  sub={account.syncSubscription}
                  kosong="Belum berlangganan paket sinkronisasi."
                />
              </div>
            </>
          )}
        </div>

        <div>
          <ItemList className="mb-4">
            <div className="border-b border-border px-4 py-3.5">
              <h2 className="text-sm font-semibold">Tampilan</h2>
            </div>
            <Item>
              <ItemMedia tone="muted">
                <Moon size={18} strokeWidth={1.75} />
              </ItemMedia>
              <ItemContent title="Mode gelap" desc="Tersimpan di perangkat ini" />
              <Switch
                checked={theme === 'dark'}
                onChange={(on) => onThemeChange(on ? 'dark' : 'light')}
                label="Mode gelap"
              />
            </Item>
          </ItemList>

          <Card className="border-destructive/30">
            <CardHead title="Keluar" />
            <Item>
              <ItemContent
                title="Keluar dari dashboard"
                desc="Kamu perlu masuk lagi dengan akun Google."
              />
              <Button variant="destructive" size="sm" onClick={onLogout}>
                <LogOut size={15} /> Keluar
              </Button>
            </Item>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Sakelar dua keadaan. Tetap `<button>` supaya bisa dicapai keyboard. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 flex-none rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-input'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function PlanCard({
  icon: Icon,
  title,
  sub,
  kosong,
}: {
  icon: LucideIcon;
  title: string;
  sub: SubscriptionSummary | null;
  kosong: string;
}) {
  if (!sub) {
    return (
      <Card>
        <CardHead title={title}>
          <Badge variant="secondary" size="sm">
            Belum ada
          </Badge>
        </CardHead>
        <CardBody className="py-6 text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Icon size={18} strokeWidth={1.75} />
          </div>
          <p className="text-[13px] text-muted-foreground">{kosong}</p>
        </CardBody>
      </Card>
    );
  }

  const sisa = daysLeft(sub.endDate);
  const habis = sisa < 0;

  return (
    <Card>
      <CardHead title={title}>
        <Badge variant={habis ? 'destructive' : 'success'} size="sm">
          {habis ? 'Berakhir' : 'Aktif'}
        </Badge>
      </CardHead>
      <CardBody className="py-1">
        <DataList>
          <DataListRow label="Paket" value={sub.plan.name} />
          <DataListRow label="Harga" value={`${formatRp(sub.plan.price)} / bln`} />
          <DataListRow
            label="Berlaku"
            value={
              <span className="flex items-center justify-end gap-2">
                {formatDate(sub.endDate)}
                {!habis && (
                  <Badge variant={sisa <= 30 ? 'warning' : 'secondary'} size="sm">
                    {sisa} hari
                  </Badge>
                )}
              </span>
            }
          />
        </DataList>
      </CardBody>
    </Card>
  );
}
