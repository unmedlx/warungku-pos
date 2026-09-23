import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  BASE_URL,
  archivePlan,
  createPlan,
  fetchAdminPlans,
  fetchAdmins,
  fetchAudit,
  fetchGrowth,
  fetchOverview,
  fetchPlanBreakdown,
  fetchTransactions,
  fetchUserDetail,
  fetchUsers,
  loginWithGoogle,
  grantSubscription,
  promoteAdmin,
  reconcilePayment,
  revokeAdmin,
  setUnauthorizedHandler,
  suspendUser,
  updatePlan,
} from '@/lib/api';
import { clearSession, getSession } from '@/lib/auth';
import type {
  Admin,
  AdminAccount,
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
  UserRow,
  PlanInput,
} from '@/lib/types';
import { formatWaktu } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useSidebar } from '@/hooks/use-sidebar';
import { Login } from '@/components/Login';
import { GRUP_DARI, LABEL, Sidebar, type Halaman } from '@/components/Sidebar';
import { OverviewSection } from '@/components/Overview';
import { QueueSection } from '@/components/Queue';
import { UsersSection } from '@/components/Users';
import { UserDetailSection } from '@/components/UserDetail';
import { PaymentsSection } from '@/components/Payments';
import { GrowthSection } from '@/components/GrowthChart';
import { AuditSection } from '@/components/Audit';
import { PlansSection } from '@/components/Plans';
import { ReleasesSection } from '@/components/Releases';
import { AdminsSection } from '@/components/Admins';
import { Button, ErrorBox, PageHeader, SearchInput } from '@/components/Common';
import { Topbar } from '@/components/Topbar';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/cn';

const JUDUL: Record<Halaman, { judul: string; sub: string }> = {
  ringkasan: { judul: 'Ringkasan', sub: 'Angka lintas seluruh pengguna' },
  antrean: {
    judul: 'Antrean kerja',
    sub: 'Semua yang menunggu tindakan admin, dikumpulkan di satu tempat',
  },
  pengguna: { judul: 'Pengguna', sub: 'Cari, saring, dan telusuri satu akun' },
  pembayaran: { judul: 'Pembayaran', sub: 'Transaksi Tripay dan rekonsiliasinya' },
  paket: { judul: 'Paket & harga', sub: 'Yang bisa dibeli pelanggan' },
  rilis: { judul: 'Rilis aplikasi', sub: 'Installer Android dan Windows di luar Play Store' },
  audit: { judul: 'Audit log', sub: 'Jejak setiap tindakan admin' },
  admin: { judul: 'Kelola admin', sub: 'Siapa yang boleh masuk ke panel ini' },
};

export default function App() {
  const { theme, toggle: gantiTema } = useTheme();
  const { ciut: sidebarCiut, toggle: toggleSidebar } = useSidebar();
  const [admin, setAdmin] = useState<Admin | null>(() => getSession()?.admin ?? null);
  const [errorMasuk, setErrorMasuk] = useState<string | null>(null);
  const [sedangMasuk, setSedangMasuk] = useState(false);

  const [halaman, setHalaman] = useState<Halaman>('ringkasan');
  // Drawer sidebar di layar sempit. Tidak dipakai di md ke atas, di sana
  // sidebar-nya memang selalu tampil.
  const [menuTerbuka, setMenuTerbuka] = useState(false);
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

  // Antrean kerja dirakit dari tiga sumber yang sudah ada, bukan endpoint baru.
  const [antreanBayar, setAntreanBayar] = useState<TransactionRow[] | null>(null);
  const [antreanHabis, setAntreanHabis] = useState<UserRow[] | null>(null);
  const [antreanKuota, setAntreanKuota] = useState<UserRow[] | null>(null);
  const [memuatAntrean, setMemuatAntrean] = useState(false);

  const [memuatPaket, setMemuatPaket] = useState(false);
  const [tampilkanArsip, setTampilkanArsip] = useState(false);
  const [memprosesPaket, setMemprosesPaket] = useState(false);

  const [audit, setAudit] = useState<AuditList | null>(null);
  const [memuatAudit, setMemuatAudit] = useState(false);
  const [halamanAudit, setHalamanAudit] = useState(1);

  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [memuatAdmins, setMemuatAdmins] = useState(false);
  const [memprosesAdmin, setMemprosesAdmin] = useState(false);
  const [dialogAdmin, setDialogAdmin] = useState(false);

  const superadmin = admin?.role === 'SUPERADMIN';

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
    setAdmins(null);
    setAntreanBayar(null);
    setAntreanHabis(null);
    setAntreanKuota(null);
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

  // Antrean kerja
  const muatAntrean = useCallback(async () => {
    setMemuatAntrean(true);
    setError(null);
    try {
      const [bayar, habis, kuota] = await Promise.all([
        fetchTransactions({ filter: 'attention', page: 1 }),
        fetchUsers({ filter: 'expiring', page: 1 }),
        fetchUsers({ filter: 'near_quota', page: 1 }),
      ]);
      setAntreanBayar(bayar.transactions);
      setAntreanHabis(habis.users);
      setAntreanKuota(kuota.users);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemuatAntrean(false);
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

  // Pembayaran
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

  // Kelola admin
  const muatAdmins = useCallback(async () => {
    setMemuatAdmins(true);
    setError(null);
    try {
      setAdmins((await fetchAdmins()).admins);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemuatAdmins(false);
    }
  }, []);

  useEffect(() => {
    if (!admin) return;
    void muatRingkasan();
  }, [admin, muatRingkasan]);

  useEffect(() => {
    if (!admin || halaman !== 'antrean') return;
    void muatAntrean();
  }, [admin, halaman, muatAntrean]);

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
    if (!admin || halaman !== 'pembayaran') return;
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

  useEffect(() => {
    if (!admin || halaman !== 'admin' || !superadmin) return;
    void muatAdmins();
  }, [admin, halaman, superadmin, muatAdmins]);

  // Pindah halaman selalu menutup drawer; kalau tidak, di layar sempit halaman
  // barunya tertutup menu yang masih terbuka.
  const pindah = useCallback((h: Halaman) => {
    setHalaman(h);
    setUserTerpilih(null);
    setMenuTerbuka(false);
  }, []);

  const bukaPengguna = (id: string) => {
    setHalaman('pengguna');
    setUserTerpilih(id);
    setMenuTerbuka(false);
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
      // Pengguna ini mungkin barusan ada di antrean "segera habis".
      setAntreanHabis(null);
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
      // Dua daftar menampilkan transaksi yang sama; keduanya harus ikut segar.
      if (halaman === 'pembayaran') await muatTransaksi();
      if (halaman === 'antrean') await muatAntrean();
      // Rekonsiliasi selalu tercatat, jadi audit yang tersimpan sudah basi.
      setAudit(null);
      if (hasil.changed) void muatRingkasan();
    } finally {
      setSedangRekonsiliasi(null);
    }
  };

  const angkatAdmin = async (body: {
    email: string;
    role: 'ADMIN' | 'SUPERADMIN';
    reason: string;
  }) => {
    setMemprosesAdmin(true);
    setError(null);
    try {
      await promoteAdmin(body);
      setDialogAdmin(false);
      await muatAdmins();
      setAudit(null);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemprosesAdmin(false);
    }
  };

  const cabutAdmin = async (id: string, alasan: string) => {
    setMemprosesAdmin(true);
    setError(null);
    try {
      await revokeAdmin(id, alasan);
      await muatAdmins();
      setAudit(null);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setMemprosesAdmin(false);
    }
  };

  if (!admin) {
    return (
      <Login
        onCredential={masuk}
        onGoogleError={setErrorMasuk}
        error={errorMasuk}
        memuat={sedangMasuk}
      />
    );
  }

  const judul = userTerpilih
    ? { judul: 'Detail pengguna', sub: 'Riwayat, langganan, dan pemakaian satu akun' }
    : JUDUL[halaman];

  // Breadcrumb mengikuti pengelompokan di sidebar: "Admin › Pelanggan ›
  // Pengguna". Tanpa nama grupnya, jejak halaman tidak memberi tahu apa pun
  // yang belum tertulis di judul halaman.
  const grup = GRUP_DARI[halaman];
  const jejak = [
    ...(grup ? [grup] : []),
    ...(userTerpilih ? [LABEL.pengguna, detail?.name ?? 'Detail pengguna'] : [judul.judul]),
  ];

  const totalAntrean = overview
    ? overview.queue.stuckPayments +
      overview.queue.expiringSubscriptions +
      overview.queue.nearQuota
    : 0;

  const sidebar = (
    <Sidebar
      aktif={halaman}
      onPilih={pindah}
      admin={admin}
      perluDitangani={totalAntrean}
      onKeluar={keluar}
      ciut={sidebarCiut}
      onCiut={toggleSidebar}
    />
  );

  return (
    <div
      className={cn(
        'grid min-h-screen grid-cols-1',
        sidebarCiut ? 'md:grid-cols-[64px_1fr]' : 'md:grid-cols-[theme(spacing.sidebar)_1fr]',
      )}
    >
      <div className="hidden md:block">{sidebar}</div>

      {/* Drawer layar sempit. Sidebar-nya komponen yang sama, hanya dibungkus
          latar gelap dan dipasang di atas isi halaman. */}
      {menuTerbuka && (
        <div
          className="fixed inset-0 z-50 flex bg-black/40 md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenuTerbuka(false);
          }}
        >
          <div className="w-[248px] max-w-[80vw] shadow-lg">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0">
        <Topbar
          jejak={jejak}
          theme={theme}
          onGantiTema={gantiTema}
          onKeluar={keluar}
          onBukaMenu={() => setMenuTerbuka(true)}
          admin={admin}
          cari={
            /* Kotak carinya bukan hiasan: submit-nya melempar kata kunci ke
               halaman Pengguna, jadi pencarian bisa dimulai dari mana saja. */
            <form
              className="hidden w-full max-w-[280px] md:block"
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

        <main className="max-w-[1240px] p-4 pb-24 md:p-6 md:pb-16">
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

            {halaman === 'antrean' && (
              <Button size="sm" onClick={() => void muatAntrean()}>
                Segarkan
              </Button>
            )}

            {halaman === 'admin' && superadmin && (
              <Button variant="primary" size="sm" onClick={() => setDialogAdmin(true)}>
                Angkat admin
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
                growth={growth}
                onBukaAntrean={() => setHalaman('antrean')}
                onBukaPaket={() => setHalaman('paket')}
              />
              <GrowthSection data={growth} />
            </div>
          )}

          {halaman === 'antrean' && (
            <QueueSection
              pembayaran={antreanBayar}
              segeraHabis={antreanHabis}
              kuotaPenuh={antreanKuota}
              memuat={memuatAntrean}
              error={error}
              sedangRekonsiliasi={sedangRekonsiliasi}
              onRekonsiliasi={rekonsiliasi}
              onBukaPengguna={bukaPengguna}
              onMuatUlang={() => void muatAntrean()}
            />
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

          {halaman === 'pembayaran' && (
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

          {halaman === 'admin' &&
            (superadmin ? (
              <AdminsSection
                data={admins}
                memuat={memuatAdmins}
                error={error}
                saya={admin}
                memproses={memprosesAdmin}
                onUndang={(body) => void angkatAdmin(body)}
                onCabut={(id, alasan) => void cabutAdmin(id, alasan)}
                onMuatUlang={() => void muatAdmins()}
                bukaDialog={dialogAdmin}
                onTutupDialog={() => setDialogAdmin(false)}
              />
            ) : (
              <ErrorBox message="Hanya superadmin yang boleh mengelola admin." />
            ))}
        </main>
      </div>

      <BottomNav
        aktif={halaman}
        onPilih={pindah}
        onLainnya={() => setMenuTerbuka(true)}
        perluDitangani={totalAntrean}
      />
    </div>
  );
}
