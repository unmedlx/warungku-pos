import { useState } from 'react';
import type { Admin, AdminAccount } from '@/lib/types';
import { formatSejak, formatTanggal } from '@/lib/format';
import {
  AksiBaris,
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHead,
  Dialog,
  EmptyBox,
  ErrorBox,
  IdentitasPengguna,
  Kolom,
  Skeleton,
} from './Common';

/**
 * Kelola admin. "Admin" di KanPOS bukan tabel tersendiri melainkan `User`
 * dengan role ADMIN/SUPERADMIN, jadi halaman ini mengangkat dan mencabut peran
 * akun yang sudah ada — bukan membuat akun baru.
 *
 * Hanya superadmin yang boleh membukanya; backend menolak dengan 403, dan App
 * tidak menampilkan menunya untuk admin biasa.
 */

function IkonInfo() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

/** Mengangkat admin baru: email + peran + alasan (alasan wajib, masuk audit). */
function DialogUndang({
  onBatal,
  onKirim,
  memproses,
}: {
  onBatal: () => void;
  onKirim: (body: { email: string; role: 'ADMIN' | 'SUPERADMIN'; reason: string }) => void;
  memproses: boolean;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPERADMIN'>('ADMIN');
  const [alasan, setAlasan] = useState('');

  const sah = /.+@.+\..+/.test(email) && alasan.trim().length >= 3;

  return (
    <Dialog
      title="Angkat admin"
      description="Peran akun yang sudah ada diubah. Panel ini tidak membuat akun baru."
      onClose={onBatal}
      footer={
        <>
          <Button onClick={onBatal} disabled={memproses}>
            Batal
          </Button>
          <Button
            variant="primary"
            disabled={!sah || memproses}
            onClick={() => onKirim({ email: email.trim(), role, reason: alasan.trim() })}
          >
            {memproses ? 'Memproses…' : 'Angkat'}
          </Button>
        </>
      }
    >
      <div className="mt-4 flex flex-col gap-3">
        <Alert
          variant="info"
          icon={<IkonInfo />}
          title="Orangnya harus sudah pernah masuk KanPOS"
          description="Login panel memakai Google dan tidak pernah membuat pengguna baru. Kalau akunnya belum ada, minta dia masuk ke aplikasi KanPOS sekali dulu."
        />

        <Kolom label="Email akun">
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@kankitu.id"
            className="isian"
          />
        </Kolom>

        <Kolom
          label="Peran"
          hint={
            role === 'SUPERADMIN'
              ? 'Superadmin bisa mengangkat dan mencabut admin lain, termasuk kamu.'
              : 'Admin bisa melihat semua, beri langganan, rekonsiliasi, dan unggah rilis.'
          }
        >
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'ADMIN' | 'SUPERADMIN')}
            className="isian-pilih"
          >
            <option value="ADMIN">Admin</option>
            <option value="SUPERADMIN">Superadmin</option>
          </select>
        </Kolom>

        <Kolom label="Alasan">
          <input
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

function DialogCabut({
  target,
  onBatal,
  onKirim,
  memproses,
}: {
  target: AdminAccount;
  onBatal: () => void;
  onKirim: (alasan: string) => void;
  memproses: boolean;
}) {
  const [alasan, setAlasan] = useState('');

  return (
    <Dialog
      title="Cabut hak admin"
      description={`${target.name} · ${target.email}`}
      onClose={onBatal}
      footer={
        <>
          <Button onClick={onBatal} disabled={memproses}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={alasan.trim().length < 3 || memproses}
            onClick={() => onKirim(alasan.trim())}
          >
            {memproses ? 'Memproses…' : 'Cabut'}
          </Button>
        </>
      }
    >
      <div className="mt-4 flex flex-col gap-3">
        <Alert
          variant="warning"
          title="Akunnya tetap utuh, hanya perannya turun jadi pengguna biasa"
          description="Dia langsung kehilangan akses ke panel ini. Toko, data, dan langganannya tidak tersentuh."
        />

        {target.seeded && (
          <Alert
            variant="destructive"
            title="Email ini terdaftar di ADMIN_EMAILS"
            description="Perannya akan dipulihkan otomatis jadi superadmin begitu dia masuk lagi. Untuk mencabutnya sungguhan, hapus dulu emailnya dari ADMIN_EMAILS di server."
          />
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

export function AdminsSection({
  data,
  memuat,
  error,
  saya,
  memproses,
  onUndang,
  onCabut,
  onMuatUlang,
  bukaDialog,
  onTutupDialog,
}: {
  data: AdminAccount[] | null;
  memuat: boolean;
  error: string | null;
  saya: Admin;
  memproses: boolean;
  onUndang: (body: { email: string; role: 'ADMIN' | 'SUPERADMIN'; reason: string }) => void;
  onCabut: (id: string, alasan: string) => void;
  onMuatUlang: () => void;
  /** Dialog "Angkat admin" dibuka dari tombol di kepala halaman, di App. */
  bukaDialog: boolean;
  onTutupDialog: () => void;
}) {
  const [cabut, setCabut] = useState<AdminAccount | null>(null);

  if (error) return <ErrorBox message={error} onRetry={onMuatUlang} />;
  if (memuat && !data) return <Skeleton className="h-72" />;

  const superadmin = (data ?? []).filter((a) => a.role === 'SUPERADMIN' && !a.suspended).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-4">
        {!data || data.length === 0 ? (
          <EmptyBox
            title="Belum ada admin lain"
            description="Hanya kamu yang bisa masuk panel ini."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tabel min-w-[720px]">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Peran</th>
                    <th className="text-right">Tindakan terakhir</th>
                    <th className="text-right">Bergabung</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((a) => {
                    const sayaSendiri = a.id === saya.id;
                    // Superadmin terakhir tidak boleh dicabut, kalau tidak panel
                    // kehilangan satu-satunya orang yang bisa mengangkat admin.
                    const terakhir = a.role === 'SUPERADMIN' && superadmin <= 1;
                    return (
                      <tr key={a.id} className="group">
                        <td>
                          <IdentitasPengguna
                            nama={a.name}
                            email={a.email}
                            tone={a.role === 'SUPERADMIN' ? 'destructive' : 'primary'}
                          />
                        </td>
                        <td>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={a.role === 'SUPERADMIN' ? 'destructive' : 'secondary'}
                              size="sm"
                            >
                              {a.role === 'SUPERADMIN' ? 'Superadmin' : 'Admin'}
                            </Badge>
                            {a.seeded && (
                              <Badge
                                variant="outline"
                                size="sm"
                                title="Email terdaftar di ADMIN_EMAILS — perannya dipulihkan otomatis saat login"
                              >
                                dari env
                              </Badge>
                            )}
                            {a.suspended && (
                              <Badge variant="warning" size="sm">
                                Disuspend
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="text-right text-[13px] text-muted-foreground">
                          {formatSejak(a.lastActionAt)}
                        </td>
                        <td className="whitespace-nowrap text-right text-[13px] text-muted-foreground">
                          {formatTanggal(a.createdAt)}
                        </td>
                        <td>
                          {sayaSendiri ? (
                            <div className="text-right text-xs text-muted-foreground">kamu</div>
                          ) : (
                            <AksiBaris>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={terakhir}
                                title={
                                  terakhir
                                    ? 'Superadmin terakhir — angkat superadmin lain dulu'
                                    : 'Turunkan jadi pengguna biasa'
                                }
                                onClick={() => setCabut(a)}
                              >
                                Cabut
                              </Button>
                            </AksiBaris>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHead title="Apa beda perannya" />
          <CardBody className="flex flex-col gap-3 text-[13px]">
            <div>
              <div className="font-medium">Admin</div>
              <p className="mt-0.5 text-muted-foreground">
                Melihat seluruh pengguna dan pembayaran, memberi langganan manual, rekonsiliasi
                Tripay, mengunggah rilis, dan menyuspend akun.
              </p>
            </div>
            <div>
              <div className="font-medium">Superadmin</div>
              <p className="mt-0.5 text-muted-foreground">
                Semua hak admin, ditambah halaman ini: mengangkat dan mencabut admin lain.
              </p>
            </div>
          </CardBody>
        </Card>

        <Alert
          variant="info"
          icon={<IkonInfo />}
          title="Masuk selalu lewat Google"
          description="Tidak ada kata sandi yang dibuat di sini. Mengangkat admin hanya menaikkan peran akun KanPOS yang sudah ada, jadi orangnya harus sudah pernah masuk ke aplikasi."
        />

        <Alert
          variant="warning"
          title="Setiap perubahan tercatat"
          description="Mengangkat dan mencabut admin masuk ke Audit log lengkap dengan alasannya."
        />
      </div>

      {bukaDialog && (
        <DialogUndang
          memproses={memproses}
          onBatal={onTutupDialog}
          onKirim={(body) => {
            onUndang(body);
          }}
        />
      )}

      {cabut && (
        <DialogCabut
          target={cabut}
          memproses={memproses}
          onBatal={() => setCabut(null)}
          onKirim={(alasan) => {
            onCabut(cabut.id, alasan);
            setCabut(null);
          }}
        />
      )}
    </div>
  );
}
