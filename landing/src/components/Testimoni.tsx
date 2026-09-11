import { Badge } from "./ui";

/**
 * Slot testimoni sengaja dikosongkan sampai ada data asli — bukti sosial
 * karangan lebih merugikan daripada kotak kosong yang jujur.
 */
export default function Testimoni() {
  return (
    <section className="seksi">
      <div className="bungkus-lg">
        <div className="rounded-2xl border-2 border-dashed border-input bg-card px-6 py-11 text-center">
          <Badge variant="warning">SLOT — BELUM DIISI</Badge>
          <h2 className="mb-2 mt-3.5 text-xl font-semibold tracking-tight">
            Testimoni pemilik warung
          </h2>
          <p className="mx-auto max-w-[52ch] text-sm text-muted-foreground">
            Di sinilah testimoni pemilik warung ditaruh, lengkap dengan foto dan nama
            tokonya. Bagian ini paling menaikkan kepercayaan, jadi jangan diisi karangan.
            Minta 3 pengguna yang sudah pakai, rekam suaranya lewat WhatsApp, tulis apa
            adanya.
          </p>
        </div>
      </div>
    </section>
  );
}
