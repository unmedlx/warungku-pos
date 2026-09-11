import { useState } from 'react';
import type { AdminPlan, UserDetail } from '@/lib/types';
import { formatBytes, formatMb, formatRupiah, formatSejak, formatTanggal } from '@/lib/format';
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
  Dialog,
  ErrorBox,
  Item,
  ItemContent,
  ItemMedia,
  Kolom,
  Skeleton,
  warnaKuota,
} from './Common';
import { GrantDialog } from './GrantDialog';

function statusTransaksi(status: string) {
  if (status === 'COMPLETED')
    return (
      <Badge variant="success" size="sm">
        Lunas
      </Badge>
    );
  if (status === 'FAILED')
    return (
      <Badge variant="destructive" size="sm">
        Gagal
      </Badge>
    );
  if (status === 'PENDING')
    return (
      <Badge variant="warning" size="sm">
        Pending
      </Badge>
    );
  return <Badge size="sm">{status}</Badge>;
}

/** Ikon toko untuk baris daftar toko. */
function IkonToko() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l1.5-5h15L21 9M3 9h18v11H3zM3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    </svg>
  );
}

function IkonPeringatan() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

/** Konfirmasi suspend. Alasan wajib karena backend menolak yang <3 karakter. */
function DialogSuspend({
  user,
  onBatal,
  onKirim,
  memproses,
}: {
  user: UserDetail;
  onBatal: () => void;
  onKirim: (alasan: string) => void;
  memproses: boolean;
}) {
  const [alasan, setAlasan] = useState('');
  const menyuspend = !user.suspended;

  return (
    <Dialog
      title={menyuspend ? 'Suspend akun' : 'Aktifkan kembali akun'}
      description={`${user.name} · ${user.email}`}
      onClose={onBatal}
      footer={
        <>
          <Button onClick={onBatal} disabled={memproses}>
            Batal
          </Button>
          <Button
            variant={menyuspend ? 'destructive' : 'primary'}
            disabled={alasan.trim().length < 3 || memproses}
            onClick={() => onKirim(alasan.trim())}
          >
            {memproses ? 'Memproses…' : menyuspend ? 'Suspend' : 'Aktifkan'}
          </Button>
        </>
      }
    >
      <div className="mt-4 flex flex-col gap-3">
        <Alert
          variant={menyuspend ? 'warning' : 'info'}
          title={menyuspend ? 'Akses API berhenti, data tetap utuh' : 'Akses API dipulihkan'}
          description={
            menyuspend
              ? 'Akun tidak bisa memakai API sampai diaktifkan lagi. Panel ini tidak menyediakan hapus permanen.'
              : 'Akun bisa memakai API lagi seperti biasa.'
          }
        />

        <Kolom label="Alasan">
          <input
            autoFocus
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Tercatat di audit log"
            className="isian"
          />
        </Kolom>
      </div>
    </Dialog>
  );
}

export function UserDetailSection({
  data,
  error,
  plans,
  onKembali,
  onSuspend,
  onGrant,
  memproses,
  onMuatUlang,
}: {
  data: UserDetail | null;
  error: string | null;
  plans: AdminPlan[] | null;
  onKembali: () => void;
  onSuspend: (suspended: boolean, alasan: string) => void;
  onGrant: (body: { planId: string; days?: number; reason: string }) => void;
  memproses: boolean;
  onMuatUlang: () => void;
}) {
  const [dialog, setDialog] = useState(false);
  const [dialogGrant, setDialogGrant] = useState(false);

  if (error) return <ErrorBox message={error} onRetry={onMuatUlang} />;
  if (!data) return <Skeleton className="h-96" />;

  const rasio = data.storage.limitMb > 0 ? data.storage.usedMb / data.storage.limitMb : 0;
  const langganan = data.subscriptions[0];
  const sisaHari = langganan
    ? Math.ceil((new Date(langganan.endDate).getTime() - Date.now()) / 86_400_000)
    : null;

  // Peringatan langganan dan storage digabung jadi satu alert: keduanya sama-sama
  // berakhir di tiket support, dan dua strip terpisah membuat halaman ini berisik.
  const masalah: string[] = [];
  if (sisaHari !== null && sisaHari <= 0) masalah.push('langganan sudah kedaluwarsa');
  else if (sisaHari !== null && sisaHari <= 30)
    masalah.push(`langganan berakhir dalam ${sisaHari} hari`);
  if (rasio >= 0.85) masalah.push(`storage ${Math.round(rasio * 100)}% terpakai`);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar nama={data.name} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{data.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground">
              <span>{data.email}</span>
              <span aria-hidden="true">·</span>
              <span>Daftar {formatTanggal(data.createdAt)}</span>
              {data.plan && (
                <Badge variant="primary" size="sm">
                  {data.plan.name}
                </Badge>
              )}
              {data.suspended && (
                <Badge variant="destructive" size="sm">
                  Disuspend
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onKembali}>← Kembali</Button>
          <Button onClick={() => setDialogGrant(true)}>Beri langganan</Button>
          <Button
            variant={data.suspended ? 'outline' : 'destructive'}
            onClick={() => setDialog(true)}
          >
            {data.suspended ? 'Aktifkan kembali' : 'Suspend akun'}
          </Button>
        </div>
      </div>

      {data.suspended ? (
        <Alert
          variant="destructive"
          icon={<IkonPeringatan />}
          title={`Akun disuspend sejak ${formatTanggal(data.suspendedAt)}`}
          description="Semua permintaan API-nya ditolak dengan 403."
          action={
            <Button size="sm" onClick={() => setDialog(true)}>
              Aktifkan kembali
            </Button>
          }
        />
      ) : (
        masalah.length > 0 && (
          <Alert
            variant="warning"
            icon={<IkonPeringatan />}
            // Huruf pertama dibesarkan agar kalimatnya tetap wajar walau dirakit.
            title={masalah.join(' dan ').replace(/^./, (c) => c.toUpperCase())}
            description="Biasanya berujung tiket. Pertimbangkan menghubungi pemilik sebelum kedaluwarsa."
            action={
              <Button size="sm" onClick={() => setDialogGrant(true)}>
                Perpanjang manual
              </Button>
            }
          />
        )
      )}

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <CardHead
              title={`Toko (${data.stores.length})`}
              hint={data.maxStores ? `maksimal ${data.maxStores} di paket ini` : undefined}
            />
            {data.stores.length === 0 ? (
              <CardBody className="text-[13px] text-muted-foreground">Belum ada toko.</CardBody>
            ) : (
              <div className="divide-y divide-border">
                {data.stores.map((s) => (
                  <Item key={s.id}>
                    <ItemMedia tone="primary">
                      <IkonToko />
                    </ItemMedia>
                    <ItemContent
                      title={<span className="block truncate">{s.name}</span>}
                      desc={
                        <>
                          Sinkron terakhir {formatSejak(s.lastSyncAt)}
                          {s.timezone ? ` · ${s.timezone}` : ''}
                          {s.isPublic ? ' · publik' : ''}
                        </>
                      }
                    />
                  </Item>
                ))}
              </div>
            )}
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Panel menampilkan jejak pemakaian toko, bukan isi data penjualannya.
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHead title="Riwayat transaksi" hint={`${data.transactions.length} terbaru`} />
            {data.transactions.length === 0 ? (
              <CardBody className="text-[13px] text-muted-foreground">
                Belum ada transaksi.
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="tabel min-w-[520px]">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Paket</th>
                      <th>Ref</th>
                      <th className="text-right">Nominal</th>
                      <th className="text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="whitespace-nowrap tabular-nums">
                          {formatTanggal(t.createdAt)}
                        </td>
                        <td>{t.plan}</td>
                        <td className="kode text-muted-foreground">{t.reference ?? '—'}</td>
                        <td className="text-right font-medium tabular-nums">
                          {formatRupiah(t.amount)}
                        </td>
                        <td className="text-right">{statusTransaksi(t.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHead
              title="Backup"
              hint={`${data.storage.files} berkas · ${formatMb(data.storage.usedMb)}`}
            />
            {data.backups.length === 0 ? (
              <CardBody className="text-[13px] text-muted-foreground">Belum ada backup.</CardBody>
            ) : (
              <div className="divide-y divide-border">
                {data.backups.slice(0, 8).map((b) => (
                  <Item key={b.id} className="py-2.5">
                    <ItemContent
                      title={<span className="block truncate">{b.fileName}</span>}
                      desc={formatSejak(b.createdAt)}
                    />
                    <span className="flex-none text-[13px] font-medium tabular-nums">
                      {formatBytes(b.fileSize)}
                    </span>
                  </Item>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHead title="Langganan" />
            <CardBody>
              <DataList>
                <DataListRow label="Paket" value={data.plan?.name ?? 'Gratis'} />
                <DataListRow
                  label="Status"
                  value={
                    !langganan ? (
                      <span className="text-muted-foreground">—</span>
                    ) : sisaHari !== null && sisaHari <= 0 ? (
                      <Badge variant="destructive" size="sm">
                        Kedaluwarsa
                      </Badge>
                    ) : sisaHari !== null && sisaHari <= 30 ? (
                      <Badge variant="warning" size="sm">
                        Habis {sisaHari} hari lagi
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        Aktif
                      </Badge>
                    )
                  }
                />
                {langganan && (
                  <>
                    <DataListRow label="Mulai" value={formatTanggal(langganan.startDate)} />
                    <DataListRow label="Berakhir" value={formatTanggal(langganan.endDate)} />
                  </>
                )}
                <DataListRow label="Batas toko" value={data.maxStores ?? '—'} />
              </DataList>
              <Button className="mt-3 w-full" onClick={() => setDialogGrant(true)}>
                {langganan ? 'Perpanjang manual' : 'Beri langganan'}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Storage" />
            <CardBody>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-muted-foreground">Terpakai</span>
                <span className={`font-medium tabular-nums ${warnaKuota(rasio)}`}>
                  {formatMb(data.storage.usedMb)} dari{' '}
                  {data.storage.limitMb > 0 ? formatMb(data.storage.limitMb) : '—'}
                </span>
              </div>
              <Bar
                percent={rasio * 100}
                tone={rasio >= 0.97 ? 'destructive' : rasio >= 0.85 ? 'warning' : 'primary'}
                className="my-2.5 block w-full"
              />
              {rasio >= 0.85 && (
                <p className="text-xs text-muted-foreground">
                  Begitu kuota penuh, unggahan backup ditolak backend — kasir berhenti punya
                  cadangan tanpa pemberitahuan.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {dialogGrant && (
        <GrantDialog
          user={data}
          plans={plans}
          memproses={memproses}
          onBatal={() => setDialogGrant(false)}
          onKirim={(body) => {
            onGrant(body);
            setDialogGrant(false);
          }}
        />
      )}

      {dialog && (
        <DialogSuspend
          user={data}
          memproses={memproses}
          onBatal={() => setDialog(false)}
          onKirim={(alasan) => {
            onSuspend(!data.suspended, alasan);
            setDialog(false);
          }}
        />
      )}
    </div>
  );
}
