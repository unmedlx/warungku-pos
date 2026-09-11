import { useMemo, useState } from 'react';
import type { AdminPlan, UserDetail } from '@/lib/types';
import { formatRupiah, formatTanggal } from '@/lib/format';
import { Alert, Button, Dialog, Kolom } from './Common';

/**
 * Memberi langganan tanpa pembayaran. Dialog ini menghitung dan menampilkan
 * tanggal berakhir yang akan terjadi **sebelum** tombolnya ditekan — memberi
 * masa aktif adalah tindakan yang bernilai uang, jadi akibatnya tidak boleh
 * baru terlihat setelah dijalankan.
 */
export function GrantDialog({
  user,
  plans,
  memproses,
  onBatal,
  onKirim,
}: {
  user: UserDetail;
  plans: AdminPlan[] | null;
  memproses: boolean;
  onBatal: () => void;
  onKirim: (body: { planId: string; days?: number; reason: string }) => void;
}) {
  const [planId, setPlanId] = useState(user.plan?.id ?? '');
  const [pakaiDurasiLain, setPakaiDurasiLain] = useState(false);
  const [hari, setHari] = useState('30');
  const [alasan, setAlasan] = useState('');

  const paket = plans?.find((p) => p.id === planId) ?? null;
  const hariAngka = Number(hari);
  const durasi = pakaiDurasiLain ? hariAngka : (paket?.durationDays ?? 0);

  const langgananBerjalan = user.subscriptions.find(
    (s) => s.status === 'ACTIVE' && new Date(s.endDate) > new Date(),
  );

  const perkiraan = useMemo(() => {
    if (!paket || !durasi || durasi < 1) return null;
    // Cerminan aturan backend: sisa masa aktif tidak hangus.
    const mulai = langgananBerjalan ? new Date(langgananBerjalan.endDate) : new Date();
    const dasar = mulai > new Date() ? mulai : new Date();
    return {
      akhir: new Date(dasar.getTime() + durasi * 86_400_000),
      menyambung: mulai > new Date(),
      dari: mulai,
    };
  }, [paket, durasi, langgananBerjalan]);

  const gantiPaket = user.plan && planId && planId !== user.plan.id;
  const valid = Boolean(paket) && durasi >= 1 && alasan.trim().length >= 3 && !memproses;

  return (
    <Dialog
      title="Beri langganan manual"
      description={`${user.name} · ${user.email}`}
      onClose={onBatal}
      className="max-h-[90vh] overflow-y-auto"
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
                planId,
                days: pakaiDurasiLain ? hariAngka : undefined,
                reason: alasan.trim(),
              })
            }
          >
            {memproses ? 'Memproses…' : 'Beri langganan'}
          </Button>
        </>
      }
    >
      <div className="mt-4 flex flex-col gap-3">
        <Kolom label="Paket">
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="isian-pilih"
          >
            <option value="">— pilih paket —</option>
            {(plans ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatRupiah(p.price)} · {p.durationDays} hari
              </option>
            ))}
          </select>
        </Kolom>

        {plans?.length === 0 && (
          <Alert
            variant="warning"
            title="Belum ada paket di database"
            description={
              <>
                Jalankan <span className="kode">npm run db:seed</span> di backend lebih dulu.
              </>
            }
          />
        )}

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={pakaiDurasiLain}
            onChange={(e) => setPakaiDurasiLain(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Pakai durasi lain
        </label>

        {pakaiDurasiLain && (
          <Kolom label="Jumlah hari">
            <input
              type="number"
              min={1}
              max={3650}
              value={hari}
              onChange={(e) => setHari(e.target.value)}
              className="isian tabular-nums"
            />
          </Kolom>
        )}

        <Kolom label="Alasan" hint="Tercatat di audit log beserta alasannya.">
          <input
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Kompensasi, trial, atau kesepakatan khusus"
            className="isian"
          />
        </Kolom>

        {perkiraan && (
          <Alert
            variant="info"
            title={<>Berlaku sampai {formatTanggal(perkiraan.akhir.toISOString())}</>}
            description={
              perkiraan.menyambung
                ? `Menyambung dari sisa masa aktif (${formatTanggal(perkiraan.dari.toISOString())}), bukan menggantinya.`
                : 'Dihitung dari hari ini.'
            }
          />
        )}

        {gantiPaket && (
          <Alert
            variant="warning"
            title={`Paket berbeda dari yang sekarang (${user.plan?.name})`}
            description="Langganan lama akan ditutup dan batas storage serta jumlah toko ikut berubah."
          />
        )}
      </div>
    </Dialog>
  );
}
