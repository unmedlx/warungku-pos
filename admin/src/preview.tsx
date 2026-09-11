import { createRoot } from 'react-dom/client';
import { GrowthSection } from './components/GrowthChart';
import { AuditSection } from './components/Audit';
import { PlansSection } from './components/Plans';
import { SectionTitle } from './components/Common';
import './index.css';

const growth = {
  months: [
    { month: '2025-09', signups: 24, revenue: 1_240_000 },
    { month: '2025-10', signups: 31, revenue: 2_180_000 },
    { month: '2025-11', signups: 28, revenue: 1_990_000 },
    { month: '2025-12', signups: 45, revenue: 4_320_000 },
    { month: '2026-01', signups: 52, revenue: 5_110_000 },
    { month: '2026-02', signups: 41, revenue: 4_870_000 },
    { month: '2026-03', signups: 58, revenue: 7_240_000 },
    { month: '2026-04', signups: 49, revenue: 6_980_000 },
    { month: '2026-05', signups: 63, revenue: 9_450_000 },
    { month: '2026-06', signups: 71, revenue: 11_200_000 },
    { month: '2026-07', signups: 66, revenue: 13_290_000 },
    { month: '2026-08', signups: 62, revenue: 14_768_000 },
  ],
};

const audit = {
  logs: [
    { id: '1', action: 'payment.reconcile', targetType: 'PaymentTransaction', targetId: 'ckx8f2a91bqq', reason: null,
      before: { status: 'PENDING' }, after: { status: 'COMPLETED' }, ip: '103.28.14.7',
      createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
      actor: { id: 'a', name: 'Ahmad Latief', email: 'ahmadlatiefm@gmail.com' } },
    { id: '2', action: 'user.suspend', targetType: 'User', targetId: 'ckx7a1b2c3dd', reason: 'Penyalahgunaan kuota storage',
      before: { suspended: false }, after: { suspended: true }, ip: '103.28.14.7',
      createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
      actor: { id: 'a', name: 'Ahmad Latief', email: 'ahmadlatiefm@gmail.com' } },
    { id: '3', action: 'admin.seed', targetType: 'User', targetId: 'ckx0000admin', reason: 'Akun admin pertama dibuat dari ADMIN_EMAILS',
      before: null, after: { role: 'SUPERADMIN', email: 'ahmadlatiefm@gmail.com' }, ip: null,
      createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      actor: { id: 'a', name: 'Ahmad Latief', email: 'ahmadlatiefm@gmail.com' } },
  ],
  pagination: { page: 1, limit: 50, totalItems: 3, totalPages: 1, hasMore: false },
};

const plans = [
  { id: 'STORAGE_1GB', name: 'Cloud Storage 1 GB', category: 'STORAGE' as const, price: 29000,
    durationDays: 30, storageLimitMb: 1024, maxStores: null, archived: false, archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z', users: 61, activeSubscriptions: 57 },
  { id: 'SYNC_TAHUNAN', name: 'Sync 1 Tahun', category: 'SYNC' as const, price: 249000,
    durationDays: 365, storageLimitMb: 5120, maxStores: 3, archived: false, archivedAt: null,
    createdAt: '2026-02-01T00:00:00.000Z', users: 118, activeSubscriptions: 104 },
  { id: 'SYNC_LAMA', name: 'Sync Basic (lama)', category: 'SYNC' as const, price: 49000,
    durationDays: 30, storageLimitMb: 1024, maxStores: 1, archived: true,
    archivedAt: '2026-06-01T00:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z',
    users: 9, activeSubscriptions: 4 },
];

createRoot(document.getElementById('root')!).render(
  <div className="mx-auto flex max-w-[1100px] flex-col gap-8 bg-background p-6 text-foreground">
    <GrowthSection data={growth} />
    <section>
      <SectionTitle title="Paket & harga" hint="pratinjau tanpa data nyata" />
      <PlansSection data={plans} memuat={false} error={null} tampilkanArsip
        onTampilkanArsip={() => {}} memproses={false} onSimpan={() => {}}
        onArsip={() => {}} onMuatUlang={() => {}} />
    </section>
    <section>
      <SectionTitle title="Audit log" hint="pratinjau tanpa data nyata" />
      <AuditSection data={audit} memuat={false} error={null} onHalaman={() => {}} onMuatUlang={() => {}} />
    </section>
  </div>,
);
