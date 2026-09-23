<!-- Superdesign init — generated for `admin` -->
# Routes — `admin`

Router entry: `src/App.tsx`

_No `<Route>` declarations found — this app uses state-driven view switching, not a router. See the full entry source below._

## Full entry source

### `src/App.tsx`

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  BASE_URL,
  archivePlan,
  createPlan,
  fetchAdminPlans,
  fetchAudit,
  fetchGrowth,
  fetchOverview,
  fetchPlanBreakdown,
  fetchTransactions,
  fetchUserDetail,
  fetchUsers,
  loginWithGoogle,
  grantSubscription,
  reconcilePayment,
  setUnauthorizedHandler,
  suspendUser,
  updatePlan,
} from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';
import type {
  Admin,
  AdminPlan,
  AuditList,
  Growth,
  Overview,
  PaymentFilter,
  PlanBreakdown,
  ReconcileResult,
  TransactionList,
  TransactionRow,
  UserDetail,
  UserFilter,
  UserList,
  PlanInput,
} from '@/lib/types';
import { formatWaktu } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { Login } from '@/components/Login';
import { Sidebar, type Halaman } from '@/components/Sidebar';
import { OverviewSection } from '@/components/Overview';
import { UsersSection } from '@/components/Users';
import { UserDetailSection } from '@/components/UserDetail';
import { PaymentsSection } from '@/components/Payments';
import { GrowthSection } from '@/components/GrowthChart';
import { AuditSection } from '@/components/Audit';
import { PlansSection } from '@/components/Plans';
import { ReleasesSection } from '@/components/Releases';
import { Button, ErrorBox, PageHeader, SearchInput } from '@/components/Common';
import { Topbar } from '@/components/Topbar';

const JUDUL: Record<Halaman, { judul: string; sub: string }> = {
  ringkasan: { judul: 'Ringkasan platform', sub: 'Angka lintas seluruh pengguna' },
  pengguna: { judul: 'Pengguna', sub: 'Cari, saring, dan telusuri satu akun' },
  transaksi: { judul: 'Transaksi', sub: 'Pembayaran Tripay dan rekonsiliasinya' },
  paket: { judul: 'Paket & harga', sub: 'Yang bisa dibeli pelanggan' },
  rilis: { judul: 'Rilis aplikasi', sub: 'Installer Android dan Windows di luar Play Store' },
  audit: { judul: 'Audit log', sub: 'Jejak setiap tindakan admin' },
};

export default function App() {
  const { theme, toggle: gantiTema } = useTheme();
  const [admin, setAdmin] = useState<Admin | null>(() => getSession()?.admin ?? null);
  const [errorMasuk, setErrorMasuk] = useState<string | null>(null);
  const [sedangMasuk, setSedangMasuk] = useState(false);

  const [halaman, setHalaman] = useState<Halaman>('ringkasan');
  // Terpisah dari `q`: kotak cari di topbar baru mengirim kata kuncinya saat
  // di-submit, jadi mengetik di sana tidak memicu permintaan tiap huruf.
  const [cariTopbar, setCariTopbar] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [paket, setPaket] = useState<PlanBreakdown | null>(null);
  const [growth, setGrowth] = useState<Growth | null>(null);

  const [users, setUsers] = useState<UserList | null>(null);
  const [memuatUsers, setMemuatUsers] = useState(false);
  const [q, setQ] = useState('');
  const [filterUser, setFilterUser] = useState<UserFilter>('all');
  const [halamanUser, setHalamanUser] = useState(1);
  const [userTerpilih, setUserTerpilih] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [memprosesSuspend, setMemprosesSuspend] = useState(false);
  const [daftarPaket, setDaftarPaket] = useState<AdminPlan[] | null>(null);

  const [transaksi, setTransaksi] = useState<TransactionList | null>(null);
  const [memuatTransaksi, setMemuatTransaksi] = useState(false);
  const [filterBayar, setFilterBayar] = useState<PaymentFilter>('attention');
  const [qBayar, setQBayar] = useState('');
  const [halamanBayar, setHalamanBayar] = useState(1);
  const [sedangRekonsiliasi, setSedangRekonsiliasi] = useState<string | null>(null);
  const [hasilRekonsiliasi, setHasilRekonsiliasi] = useState<{
    transaksi: TransactionRow;
    hasil: ReconcileResult;
  } | null>(null);

  const [memuatPaket, setMemuatPaket] = useState(false);
  const [tampilkanArsip, setTampilkanArsip] = useState(false);
  const [memprosesPaket, setMemprosesPaket] = useState(false);

  const [audit, setAudit] = useState<AuditList | null>(null);
  const [memuatAudit, setMemuatAudit] = useState(false);
  const [halamanAudit, setHalamanAudit] = useState(1);

  const keluar = useCallback(() => {
    clearSession();
    setAdmin(null);
    setOverview(null);
    setPaket(null);
    setGrowth(null);
    setAudit(null);
    setUsers(null);
    setDetail(null);
    setDaftarPaket(null);
    setUserTerpilih(null);
    setTransaksi(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setErrorMasuk('Sesi berakhir, silakan masuk lagi.');
      keluar();
    });
  }, [keluar]);

  const masuk = useCallback(async (idToken: string) => {
    setSedangMasuk(true);
    setErrorMasuk(null);
    try {
      const session = await loginWithGoogle(idToken);
      setAdmin(session.admin);
    } catch (err) {
      // Status 0 / TypeError = permintaan tidak sampai ke API (alamat salah,
      // server mati, atau CORS menolak) — beda penanganan dari akun ditolak.
      setErrorMasuk(
        err instanceof ApiError
          ? err.message
          : `Tidak bisa menghubungi server di ${BASE_URL}. Periksa VITE_API_BASE_URL dan pastikan backend berjalan.`,
      );
    } finally {
      setSedangMasuk(false);
    }
  }, []);

  const pesan = (err: unknown) =>
    err instanceof ApiError && err.status !== 401 ? err.message : 'Gagal memuat data.';

  // Ringkasan
  const muatRingkasan = useCallback(async () => {
    setError(null);
    try {
      const [o, p, g] = await Promise.all([fetchOverview(), fetchPlanBreakdown(), fetchGrowth(12)]);
      setOverview(o);
      setPaket(p);
      setGrowth(g);
    } catch (err) {
      setError(pesan(err));
    }
  }, []);

  // Pengguna
  const muatUsers = useCallback(async () => {
    setMemuatUsers(true);
    setError(null);
    try {
      setUsers(await fetchUsers({ q: q || undefined, filter: filterUser, page: halamanUser }));
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemuatUsers(false);
    }
  }, [q, filterUser, halamanUser]);

  const muatDetail = useCallback(async (id: string) => {
    setDetail(null);
    setError(null);
    try {
      setDetail(await fetchUserDetail(id));
    } catch (err) {
      setError(pesan(err));
    }
  }, []);

  // Transaksi
  const muatTransaksi = useCallback(async () => {
    setMemuatTransaksi(true);
    setError(null);
    try {
      setTransaksi(
        await fetchTransactions({ filter: filterBayar, q: qBayar || undefined, page: halamanBayar }),
      );
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemuatTransaksi(false);
    }
  }, [filterBayar, qBayar, halamanBayar]);

  // Paket
  const muatPaket = useCallback(async () => {
    setMemuatPaket(true);
    setError(null);
    try {
      setDaftarPaket((await fetchAdminPlans(tampilkanArsip)).plans);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemuatPaket(false);
    }
  }, [tampilkanArsip]);

  // Audit log
  const muatAudit = useCallback(async () => {
    setMemuatAudit(true);
    setError(null);
    try {
      setAudit(await fetchAudit({ page: halamanAudit }));
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemuatAudit(false);
    }
  }, [halamanAudit]);

  useEffect(() => {
    if (!admin) return;
    void muatRingkasan();
  }, [admin, muatRingkasan]);

  useEffect(() => {
    if (!admin || halaman !== 'pengguna' || userTerpilih) return;
    void muatUsers();
  }, [admin, halaman, userTerpilih, muatUsers]);

  useEffect(() => {
    if (!admin || !userTerpilih) return;
    void muatDetail(userTerpilih);
  }, [admin, userTerpilih, muatDetail]);

  // Daftar paket hanya perlu diambil sekali, dipakai dialog beri langganan.
  useEffect(() => {
    if (!admin || !userTerpilih || daftarPaket) return;
    fetchAdminPlans()
      .then((r) => setDaftarPaket(r.plans))
      .catch(() => setDaftarPaket([]));
  }, [admin, userTerpilih, daftarPaket]);

  useEffect(() => {
    if (!admin || halaman !== 'transaksi') return;
    void muatTransaksi();
  }, [admin, halaman, muatTransaksi]);

  useEffect(() => {
    if (!admin || halaman !== 'paket') return;
    void muatPaket();
  }, [admin, halaman, muatPaket]);

  useEffect(() => {
    if (!admin || halaman !== 'audit') return;
    void muatAudit();
  }, [admin, halaman, muatAudit]);

  const bukaPengguna = (id: string) => {
    setHalaman('pengguna');
    setUserTerpilih(id);
  };

  const gantiFilterUser = (f: UserFilter) => {
    setFilterUser(f);
    setHalamanUser(1);
  };

  const suspend = async (suspended: boolean, alasan: string) => {
    if (!userTerpilih) return;
    setMemprosesSuspend(true);
    try {
      await suspendUser(userTerpilih, suspended, alasan);
      await muatDetail(userTerpilih);
      // Ringkasan ikut berubah karena akun disuspend tidak lagi dihitung.
      void muatRingkasan();
      setAudit(null);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemprosesSuspend(false);
    }
  };

  const beriLangganan = async (body: { planId: string; days?: number; reason: string }) => {
    if (!userTerpilih) return;
    setMemprosesSuspend(true);
    try {
      await grantSubscription(userTerpilih, body);
      await muatDetail(userTerpilih);
      // Langganan aktif dan sebaran paket ikut berubah.
      void muatRingkasan();
      setAudit(null);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemprosesSuspend(false);
    }
  };

  const simpanPaket = async (id: string | null, body: PlanInput) => {
    setMemprosesPaket(true);
    setError(null);
    try {
      if (id) await updatePlan(id, body);
      else await createPlan(body);
      await muatPaket();
      // Sebaran paket di Ringkasan ikut berubah.
      void muatRingkasan();
      setAudit(null);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemprosesPaket(false);
    }
  };

  const arsipkanPaket = async (plan: AdminPlan, alasan: string) => {
    setMemprosesPaket(true);
    setError(null);
    try {
      await archivePlan(plan.id, !plan.archived, alasan);
      await muatPaket();
      setAudit(null);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemprosesPaket(false);
    }
  };

  const rekonsiliasi = async (t: TransactionRow) => {
    setSedangRekonsiliasi(t.id);
    try {
      const hasil = await reconcilePayment(t.id);
      setHasilRekonsiliasi({ transaksi: t, hasil });
      await muatTransaksi();
      // Rekonsiliasi selalu tercatat, jadi audit yang tersimpan sudah basi.
      setAudit(null);
      if (hasil.changed) void muatRingkasan();
    } finally {
      setSedangRekonsiliasi(null);
    }
  };

  if (!admin) {
    return <Login onCredential={masuk} onGoogleError={setErrorMasuk} error={errorMasuk} memuat={sedangMasuk} />;
  }

  const judul = userTerpilih
    ? { judul: 'Detail pengguna', sub: 'Riwayat, langganan, dan pemakaian satu akun' }
    : JUDUL[halaman];

  const jejak = userTerpilih ? ['Pengguna', judul.judul] : [judul.judul];

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[theme(spacing.sidebar)_1fr]">
      <div className="hidden md:block">
        <Sidebar
          aktif={halaman}
          onPilih={(h) => {
            setHalaman(h);
            setUserTerpilih(null);
          }}
          admin={admin}
          perluDitangani={overview?.queue.stuckPayments ?? 0}
          onKeluar={keluar}
        />
      </div>

      <div className="min-w-0">
        <Topbar
          jejak={jejak}
          theme={theme}
          onGantiTema={gantiTema}
          onKeluar={keluar}
          admin={admin}
          cari={
            /* Kotak carinya bukan hiasan: submit-nya melempar kata kunci ke
               halaman Pengguna, jadi pencarian bisa dimulai dari mana saja. */
            <form
              className="hidden w-full max-w-[300px] md:block"
              onSubmit={(e) => {
                e.preventDefault();
                setQ(cariTopbar);
                setHalamanUser(1);
                setUserTerpilih(null);
                setHalaman('pengguna');
              }}
            >
              <SearchInput
                value={cariTopbar}
                onChange={setCariTopbar}
                placeholder="Cari pengguna, email, toko…"
                aria-label="Cari pengguna"
              />
            </form>
          }
        />

        <main className="max-w-[1240px] p-4 pb-16 md:p-6">
          <PageHeader
            title={judul.judul}
            subtitle={
              overview && halaman === 'ringkasan' && !userTerpilih
                ? `${judul.sub} · per ${formatWaktu(overview.generatedAt)}`
                : judul.sub
            }
          >
            {halaman === 'ringkasan' && !userTerpilih && (
              <Button size="sm" onClick={() => void muatRingkasan()}>
                <svg
                  viewBox="0 0 24 24"
                  className="h-[15px] w-[15px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" />
                </svg>
                Muat ulang
              </Button>
            )}
          </PageHeader>

          {error && halaman === 'ringkasan' && !overview && (
            <ErrorBox message={error} onRetry={() => void muatRingkasan()} />
          )}

          {halaman === 'ringkasan' && (
            <div className="space-y-6">
              <OverviewSection
                data={overview}
                paket={paket}
                onBukaTransaksi={() => {
                  setFilterBayar('attention');
                  setHalaman('transaksi');
                }}
                onBukaPengguna={(f) => {
                  gantiFilterUser(f);
                  setUserTerpilih(null);
                  setHalaman('pengguna');
                }}
              />
              <GrowthSection data={growth} />
            </div>
          )}

          {halaman === 'pengguna' &&
            (userTerpilih ? (
              <UserDetailSection
                data={detail}
                error={error}
                plans={daftarPaket}
                memproses={memprosesSuspend}
                onKembali={() => setUserTerpilih(null)}
                onSuspend={(s, alasan) => void suspend(s, alasan)}
                onGrant={(body) => void beriLangganan(body)}
                onMuatUlang={() => void muatDetail(userTerpilih)}
              />
            ) : (
              <UsersSection
                data={users}
                memuat={memuatUsers}
                error={error}
                q={q}
                filter={filterUser}
                onQ={(v) => {
                  setQ(v);
                  setHalamanUser(1);
                }}
                onFilter={gantiFilterUser}
                onHalaman={setHalamanUser}
                onBuka={bukaPengguna}
                onMuatUlang={() => void muatUsers()}
              />
            ))}

          {halaman === 'transaksi' && (
            <PaymentsSection
              data={transaksi}
              memuat={memuatTransaksi}
              error={error}
              filter={filterBayar}
              q={qBayar}
              onQ={(v) => {
                setQBayar(v);
                setHalamanBayar(1);
              }}
              onFilter={(f) => {
                setFilterBayar(f);
                setHalamanBayar(1);
              }}
              onHalaman={setHalamanBayar}
              onRekonsiliasi={rekonsiliasi}
              sedangProses={sedangRekonsiliasi}
              hasil={hasilRekonsiliasi}
              onTutupHasil={() => setHasilRekonsiliasi(null)}
              onBukaPengguna={bukaPengguna}
              onMuatUlang={() => void muatTransaksi()}
            />
          )}

          {halaman === 'paket' && (
            <PlansSection
              data={daftarPaket}
              memuat={memuatPaket}
              error={error}
              tampilkanArsip={tampilkanArsip}
              onTampilkanArsip={(v) => {
                setTampilkanArsip(v);
                setDaftarPaket(null);
              }}
              memproses={memprosesPaket}
              onSimpan={(id, body) => void simpanPaket(id, body)}
              onArsip={(plan, alasan) => void arsipkanPaket(plan, alasan)}
              onMuatUlang={() => void muatPaket()}
            />
          )}

          {halaman === 'rilis' && <ReleasesSection onBerubah={() => setAudit(null)} />}

          {halaman === 'audit' && (
            <AuditSection
              data={audit}
              memuat={memuatAudit}
              error={error}
              onHalaman={setHalamanAudit}
              onMuatUlang={() => void muatAudit()}
            />
          )}
        </main>
      </div>
    </div>
  );
}
```

