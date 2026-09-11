import { useState } from 'react';
import type { AdminPlan, PlanInput } from '@/lib/types';
import { formatAngka, formatMb, formatRupiah } from '@/lib/format';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHead,
  Dialog,
  EmptyBox,
  ErrorBox,
  Kolom,
  Skeleton,
} from './Common';

const KOSONG: PlanInput = {
  name: '',
  category: 'STORAGE',
  price: 0,
  durationDays: 30,
  storageLimitMb: 1024,
  maxStores: null,
};

function DialogPaket({
  awal,
  memproses,
  onBatal,
  onKirim,
}: {
  /** null = membuat paket baru. */
  awal: AdminPlan | null;
  memproses: boolean;
  onBatal: () => void;
  onKirim: (body: PlanInput) => void;
}) {
  const [form, setForm] = useState<PlanInput>(
    awal
      ? {
          name: awal.name,
          category: awal.category,
          price: awal.price,
          durationDays: awal.durationDays,
          storageLimitMb: awal.storageLimitMb,
          maxStores: awal.maxStores,
        }
      : KOSONG,
  );
  const [id, setId] = useState('');

  const ubah = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.name.trim().length > 0 && form.durationDays >= 1 && !memproses;

  return (
    <Dialog
      title={awal ? 'Ubah paket' : 'Paket baru'}
      // Saat mengubah, id paket adalah penanda yang dicari orang di database dan
      // log — jadi ia berdiri sebagai keterangan dialog, bukan kolom isian.
      description={awal ? <span className="kode">{awal.id}</span> : 'Tercatat di audit log.'}
      onClose={onBatal}
      className="max-w-[480px]"
      footer={
        <>
          <Button onClick={onBatal} disabled={memproses}>
            Batal
          </Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() =>
              onKirim({
                ...form,
                name: form.name.trim(),
                ...(awal || !id.trim() ? {} : { id: id.trim() }),
              })
            }
          >
            {memproses ? 'Menyimpan…' : awal ? 'Simpan' : 'Buat paket'}
          </Button>
        </>
      }
    >
      <div className="mt-4 flex flex-col gap-3.5">
        {!awal && (
          <Kolom
            label="Id (opsional)"
            hint="Kosongkan untuk id acak. Isi agar mudah dikenali di database dan log, mengikuti pola seed: STORAGE_1GB, SYNC_BASIC."
          >
            <input
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              placeholder="SYNC_TAHUNAN"
              className="isian font-mono"
            />
          </Kolom>
        )}

        <Kolom label="Nama">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => ubah('name', e.target.value)}
            placeholder="Sync 1 Tahun"
            className="isian"
          />
        </Kolom>

        {/* Pasangan yang selalu dibaca bersama ditaruh sebaris: kategori↔harga,
            masa aktif↔kuota. */}
        <div className="grid grid-cols-2 gap-3.5">
          <Kolom label="Kategori">
            <select
              value={form.category}
              onChange={(e) => ubah('category', e.target.value as 'STORAGE' | 'SYNC')}
              className="isian-pilih"
            >
              <option value="STORAGE">Storage</option>
              <option value="SYNC">Sync</option>
            </select>
          </Kolom>

          <Kolom label="Harga (Rp)">
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => ubah('price', Number(e.target.value))}
              className="isian tabular-nums"
            />
          </Kolom>

          <Kolom label="Masa aktif (hari)">
            <input
              type="number"
              min={1}
              max={3650}
              value={form.durationDays}
              onChange={(e) => ubah('durationDays', Number(e.target.value))}
              className="isian tabular-nums"
            />
          </Kolom>

          <Kolom label="Kuota storage (MB)">
            <input
              type="number"
              min={0}
              value={form.storageLimitMb}
              onChange={(e) => ubah('storageLimitMb', Number(e.target.value))}
              className="isian tabular-nums"
            />
          </Kolom>
        </div>

        <Kolom label="Batas toko" hint="Kosongkan untuk tanpa batas.">
          <input
            type="number"
            min={1}
            value={form.maxStores ?? ''}
            onChange={(e) => ubah('maxStores', e.target.value ? Number(e.target.value) : null)}
            placeholder="tanpa batas"
            className="isian tabular-nums"
          />
        </Kolom>

        {awal && (
          <Alert
            variant="info"
            title="Tidak menyentuh langganan yang sedang berjalan"
            description="Masa aktifnya tersimpan di baris langganan, dan kuota sudah disalin ke akun pelanggan. Harga dan kuota baru mulai berlaku pada perpanjangan berikutnya."
          />
        )}
      </div>
    </Dialog>
  );
}

function DialogArsip({
  plan,
  memproses,
  onBatal,
  onKirim,
}: {
  plan: AdminPlan;
  memproses: boolean;
  onBatal: () => void;
  onKirim: (alasan: string) => void;
}) {
  const [alasan, setAlasan] = useState('');
  const mengarsip = !plan.archived;

  return (
    <Dialog
      title={mengarsip ? 'Arsipkan paket' : 'Aktifkan kembali paket'}
      description={plan.name}
      onClose={onBatal}
      footer={
        <>
          <Button onClick={onBatal} disabled={memproses}>
            Batal
          </Button>
          <Button
            variant={mengarsip ? 'destructive' : 'primary'}
            disabled={alasan.trim().length < 3 || memproses}
            onClick={() => onKirim(alasan.trim())}
          >
            {memproses ? 'Memproses…' : mengarsip ? 'Arsipkan' : 'Aktifkan'}
          </Button>
        </>
      }
    >
      <div className="mt-4 flex flex-col gap-3">
        {mengarsip ? (
          <Alert
            variant="warning"
            title={`${formatAngka(plan.activeSubscriptions)} langganan aktif tetap dilayani`}
            description="Paket hilang dari pilihan pembelian, tapi pelanggan yang sedang berlangganan dilayani sampai masa aktifnya habis. Riwayat pembayarannya utuh."
          />
        ) : (
          <Alert variant="info" title="Paket muncul lagi sebagai pilihan." />
        )}

        {mengarsip && (
          <p className="text-[13px] text-muted-foreground">
            Tidak ada hapus permanen di panel ini: relasi paket ke langganan dan transaksi memakai
            cascade, jadi menghapusnya ikut menghapus catatan uang yang sudah masuk.
          </p>
        )}

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

export function PlansSection({
  data,
  memuat,
  error,
  tampilkanArsip,
  onTampilkanArsip,
  memproses,
  onSimpan,
  onArsip,
  onMuatUlang,
}: {
  data: AdminPlan[] | null;
  memuat: boolean;
  error: string | null;
  tampilkanArsip: boolean;
  onTampilkanArsip: (v: boolean) => void;
  memproses: boolean;
  onSimpan: (id: string | null, body: PlanInput) => void;
  onArsip: (plan: AdminPlan, alasan: string) => void;
  onMuatUlang: () => void;
}) {
  const [dialog, setDialog] = useState<{ mode: 'baru' } | { mode: 'ubah'; plan: AdminPlan } | null>(
    null,
  );
  const [arsip, setArsip] = useState<AdminPlan | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {/* Judul halaman datang dari PageHeader di App; di sini hanya kontrolnya. */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <input
            type="checkbox"
            checked={tampilkanArsip}
            onChange={(e) => onTampilkanArsip(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Tampilkan yang diarsipkan
        </label>
        <Button variant="primary" onClick={() => setDialog({ mode: 'baru' })}>
          + Paket baru
        </Button>
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={onMuatUlang} />
      ) : memuat && !data ? (
        <Skeleton className="h-64" />
      ) : !data || data.length === 0 ? (
        <EmptyBox
          title="Belum ada paket"
          description="Buat lewat tombol di atas, atau jalankan npm run db:seed di backend."
        />
      ) : (
        <>
          <Card>
            <CardHead title="Paket" hint={`${data.length} paket`} />
            <div className="overflow-x-auto">
              <table className="tabel min-w-[880px]">
                <thead>
                  <tr>
                    <th>Paket</th>
                    <th>Kategori</th>
                    <th className="text-right">Harga</th>
                    <th className="text-right">Masa aktif</th>
                    <th className="text-right">Kuota</th>
                    <th className="text-right">Toko</th>
                    <th className="text-right">Pemakai</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Baris arsip diredupkan, bukan disembunyikan — tetap terbaca
                      kalau checkbox arsip dinyalakan. */}
                  {data.map((p) => (
                    <tr key={p.id} className={p.archived ? 'opacity-60' : undefined}>
                      <td>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="kode mt-0.5">{p.id}</div>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={p.category === 'SYNC' ? 'primary' : 'secondary'}
                            size="sm"
                          >
                            {p.category}
                          </Badge>
                          {p.archived && (
                            <Badge variant="outline" size="sm">
                              Diarsipkan
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{formatRupiah(p.price)}</td>
                      <td className="text-right tabular-nums">{p.durationDays} hari</td>
                      <td className="text-right tabular-nums">
                        {p.storageLimitMb > 0 ? (
                          formatMb(p.storageLimitMb)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {p.maxStores ?? <span className="text-muted-foreground">tanpa batas</span>}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatAngka(p.users)}
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          ({formatAngka(p.activeSubscriptions)} aktif)
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" onClick={() => setDialog({ mode: 'ubah', plan: p })}>
                            Ubah
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setArsip(p)}>
                            {p.archived ? 'Aktifkan' : 'Arsipkan'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground">
            Mengubah harga atau kuota hanya berlaku untuk pembelian dan perpanjangan berikutnya.
            Pelanggan yang sedang berlangganan tetap memakai ketentuan saat mereka membeli.
          </p>
        </>
      )}

      {dialog && (
        <DialogPaket
          awal={dialog.mode === 'ubah' ? dialog.plan : null}
          memproses={memproses}
          onBatal={() => setDialog(null)}
          onKirim={(body) => {
            onSimpan(dialog.mode === 'ubah' ? dialog.plan.id : null, body);
            setDialog(null);
          }}
        />
      )}

      {arsip && (
        <DialogArsip
          plan={arsip}
          memproses={memproses}
          onBatal={() => setArsip(null)}
          onKirim={(alasan) => {
            onArsip(arsip, alasan);
            setArsip(null);
          }}
        />
      )}
    </div>
  );
}
