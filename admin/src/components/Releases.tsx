import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  BASE_URL,
  deleteRelease,
  fetchReleases,
  updateRelease,
  uploadRelease,
} from '@/lib/api';
import type { AppRelease, ReleaseInput, ReleasePlatform } from '@/lib/types';
import { formatAngka, formatBytes, formatTanggal } from '@/lib/format';
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

const PLATFORM: Record<ReleasePlatform, { label: string; ext: string; slug: string }> = {
  ANDROID: { label: 'Android', ext: '.apk', slug: 'android' },
  WINDOWS: { label: 'Windows', ext: '.exe', slug: 'windows' },
};

function pesan(err: unknown, cadangan: string) {
  return err instanceof ApiError && err.status !== 401 ? err.message : cadangan;
}

function DialogUnggah({
  daftar,
  onBatal,
  onSelesai,
}: {
  daftar: AppRelease[];
  onBatal: () => void;
  onSelesai: () => void;
}) {
  const [form, setForm] = useState<ReleaseInput>({
    platform: 'ANDROID',
    versionName: '',
    versionCode: 0,
    changelog: '',
    mandatory: false,
    publish: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [progres, setProgres] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ubah = <K extends keyof ReleaseInput>(k: K, v: ReleaseInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Saran versionCode: satu di atas rilis tertinggi platform yang dipilih.
  const tertinggi = daftar
    .filter((r) => r.platform === form.platform)
    .reduce<AppRelease | null>((a, r) => (!a || r.versionCode > a.versionCode ? r : a), null);
  const minimal = (tertinggi?.versionCode ?? 0) + 1;

  useEffect(() => {
    setForm((f) => ({ ...f, versionCode: minimal }));
  }, [minimal]);

  const ext = PLATFORM[form.platform].ext;
  const fileCocok = !file || file.name.toLowerCase().endsWith(ext);
  const mengunggah = progres !== null;
  const valid =
    file &&
    fileCocok &&
    form.versionName.trim().length > 0 &&
    form.versionCode >= minimal &&
    !mengunggah;

  // Referensi harus stabil: Dialog memfokuskan ulang panelnya setiap onClose
  // berganti, yang akan merebut fokus dari kolom isian di tiap ketikan.
  const tutup = useCallback(() => {
    if (!mengunggah) onBatal();
  }, [mengunggah, onBatal]);

  const kirim = async () => {
    if (!file) return;
    setError(null);
    setProgres(0);
    try {
      await uploadRelease({ ...form, versionName: form.versionName.trim() }, file, setProgres);
      onSelesai();
    } catch (err) {
      setError(pesan(err, 'Unggahan gagal.'));
      setProgres(null);
    }
  };

  return (
    <Dialog
      title="Unggah rilis"
      description="File disimpan di storage, tercatat di audit log."
      onClose={tutup}
      className="max-w-[520px]"
      footer={
        <>
          <Button onClick={onBatal} disabled={mengunggah}>
            Batal
          </Button>
          <Button variant="primary" disabled={!valid} onClick={() => void kirim()}>
            {mengunggah ? `Mengunggah ${Math.round((progres ?? 0) * 100)}%` : 'Unggah'}
          </Button>
        </>
      }
    >
      <div className="mt-4 flex flex-col gap-3.5">
        {error && <Alert variant="destructive" title={error} />}

        <div className="grid grid-cols-2 gap-3.5">
          <Kolom label="Platform">
            <select
              value={form.platform}
              onChange={(e) => {
                ubah('platform', e.target.value as ReleasePlatform);
              }}
              disabled={mengunggah}
              className="isian-pilih"
            >
              <option value="ANDROID">Android (.apk)</option>
              <option value="WINDOWS">Windows (.exe)</option>
            </select>
          </Kolom>

          <Kolom label="File installer" hint={fileCocok ? undefined : `Harus berekstensi ${ext}`}>
            <input
              type="file"
              accept={ext}
              disabled={mengunggah}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="isian py-1.5 text-[13px]"
            />
          </Kolom>

          <Kolom label="Nama versi" hint="appVersion di version.json">
            <input
              autoFocus
              value={form.versionName}
              onChange={(e) => ubah('versionName', e.target.value)}
              placeholder="2026.09.14.5"
              disabled={mengunggah}
              className="isian font-mono"
            />
          </Kolom>

          <Kolom
            label="versionCode"
            hint={tertinggi ? `Tertinggi sekarang ${tertinggi.versionCode}` : 'Harus naik tiap rilis'}
          >
            <input
              type="number"
              min={minimal}
              value={form.versionCode || ''}
              onChange={(e) => ubah('versionCode', Number(e.target.value))}
              disabled={mengunggah}
              className="isian tabular-nums"
            />
          </Kolom>
        </div>

        <Kolom label="Catatan rilis" hint="Ditampilkan ke pengguna di dialog update dan halaman download.">
          <textarea
            rows={4}
            value={form.changelog}
            onChange={(e) => ubah('changelog', e.target.value)}
            placeholder={'- Perbaikan cetak struk\n- Laporan harian lebih cepat'}
            disabled={mengunggah}
            className="isian h-auto py-2"
          />
        </Kolom>

        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.publish}
            onChange={(e) => ubah('publish', e.target.checked)}
            disabled={mengunggah}
            className="h-4 w-4 accent-primary"
          />
          Langsung terbitkan
          <span className="text-muted-foreground">(kalau tidak, disimpan sebagai draf)</span>
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.mandatory}
            onChange={(e) => ubah('mandatory', e.target.checked)}
            disabled={mengunggah}
            className="h-4 w-4 accent-primary"
          />
          Wajib update
          <span className="text-muted-foreground">(aplikasi lama tidak bisa dipakai)</span>
        </label>

        {mengunggah && (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${Math.round((progres ?? 0) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}

function DialogHapus({
  release,
  memproses,
  onBatal,
  onKirim,
}: {
  release: AppRelease;
  memproses: boolean;
  onBatal: () => void;
  onKirim: (alasan: string) => void;
}) {
  const [alasan, setAlasan] = useState('');
  return (
    <Dialog
      title="Hapus rilis"
      description={`${PLATFORM[release.platform].label} ${release.versionName}`}
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
            {memproses ? 'Menghapus…' : 'Hapus permanen'}
          </Button>
        </>
      }
    >
      <div className="mt-4 flex flex-col gap-3">
        <Alert
          variant="warning"
          title="File installer ikut dihapus dari storage"
          description="Link unduhan versi ini berhenti bekerja. Kalau hanya ingin menyembunyikannya, tarik rilisnya saja."
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

export function ReleasesSection({ onBerubah }: { onBerubah: () => void }) {
  const [data, setData] = useState<AppRelease[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memproses, setMemproses] = useState<string | null>(null);
  const [unggah, setUnggah] = useState(false);
  const [hapus, setHapus] = useState<AppRelease | null>(null);
  const [tersalin, setTersalin] = useState<string | null>(null);

  const tutupUnggah = useCallback(() => setUnggah(false), []);
  const tutupHapus = useCallback(() => setHapus(null), []);

  const muat = useCallback(async () => {
    setError(null);
    try {
      setData((await fetchReleases()).releases);
    } catch (err) {
      setError(pesan(err, 'Gagal memuat data.'));
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const aksi = async (id: string, fn: () => Promise<unknown>) => {
    setMemproses(id);
    setError(null);
    try {
      await fn();
      await muat();
      onBerubah();
    } catch (err) {
      setError(pesan(err, 'Aksi gagal.'));
    } finally {
      setMemproses(null);
    }
  };

  const salin = (slug: string) => {
    const url = new URL(`/api/releases/download/${slug}`, BASE_URL).toString();
    void navigator.clipboard?.writeText(url);
    setTersalin(slug);
    setTimeout(() => setTersalin(null), 1500);
  };

  // Rilis terbit dengan versionCode tertinggi = yang sedang diunduh pengguna.
  const terbaru = new Map<ReleasePlatform, string>();
  for (const r of data ?? []) {
    if (!r.published) continue;
    const cur = data!.find((x) => x.id === terbaru.get(r.platform));
    if (!cur || r.versionCode > cur.versionCode) terbaru.set(r.platform, r.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PLATFORM) as ReleasePlatform[]).map((p) => (
            <Button key={p} size="sm" onClick={() => salin(PLATFORM[p].slug)}>
              {tersalin === PLATFORM[p].slug ? 'Tersalin ✓' : `Salin link ${PLATFORM[p].label}`}
            </Button>
          ))}
        </div>
        <Button variant="primary" onClick={() => setUnggah(true)}>
          + Unggah rilis
        </Button>
      </div>

      {error && <ErrorBox message={error} onRetry={() => void muat()} />}

      {!data ? (
        !error && <Skeleton className="h-64" />
      ) : data.length === 0 ? (
        <EmptyBox
          title="Belum ada rilis"
          description="Unggah APK atau EXE pertama. Setelah terbit, link unduhan dan cek update di aplikasi langsung memakainya."
        />
      ) : (
        <Card>
          <CardHead title="Rilis" hint={`${data.length} file`} />
          <div className="overflow-x-auto">
            <table className="tabel min-w-[900px]">
              <thead>
                <tr>
                  <th>Versi</th>
                  <th>Status</th>
                  <th>File</th>
                  <th className="text-right">Unduhan</th>
                  <th>Diunggah</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className={r.published ? undefined : 'opacity-70'}>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Badge variant={r.platform === 'ANDROID' ? 'success' : 'info'} size="sm">
                          {PLATFORM[r.platform].label}
                        </Badge>
                        <span className="font-mono">{r.versionName}</span>
                      </div>
                      <div className="kode mt-0.5">code {r.versionCode}</div>
                      {r.changelog && (
                        <div
                          className="mt-1 max-w-[280px] truncate text-xs text-muted-foreground"
                          title={r.changelog}
                        >
                          {r.changelog.split('\n')[0]}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {terbaru.get(r.platform) === r.id ? (
                          <Badge variant="primary" size="sm">
                            Terbaru
                          </Badge>
                        ) : r.published ? (
                          <Badge variant="secondary" size="sm">
                            Terbit
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm">
                            Draf
                          </Badge>
                        )}
                        {r.mandatory && (
                          <Badge variant="warning" size="sm">
                            Wajib
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-[13px]">{formatBytes(r.fileSize)}</div>
                      <div className="kode mt-0.5" title={r.sha256}>
                        sha256 {r.sha256.slice(0, 12)}…
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{formatAngka(r.downloads)}</td>
                    <td>
                      <div className="text-[13px]">{formatTanggal(r.createdAt)}</div>
                      <div className="text-xs text-muted-foreground">{r.uploadedBy ?? '—'}</div>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          disabled={memproses === r.id}
                          onClick={() =>
                            void aksi(r.id, () => updateRelease(r.id, { published: !r.published }))
                          }
                        >
                          {r.published ? 'Tarik' : 'Terbitkan'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={memproses === r.id}
                          onClick={() =>
                            void aksi(r.id, () => updateRelease(r.id, { mandatory: !r.mandatory }))
                          }
                        >
                          {r.mandatory ? 'Tidak wajib' : 'Jadikan wajib'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setHapus(r)}>
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Link “Salin link” selalu mengarah ke rilis terbit dengan versionCode tertinggi. Menarik rilis
        terbaru membuat unduhan kembali ke versi terbit sebelumnya.
      </p>

      {unggah && (
        <DialogUnggah
          daftar={data ?? []}
          onBatal={tutupUnggah}
          onSelesai={() => {
            setUnggah(false);
            void muat();
            onBerubah();
          }}
        />
      )}

      {hapus && (
        <DialogHapus
          release={hapus}
          memproses={memproses === hapus.id}
          onBatal={tutupHapus}
          onKirim={(alasan) => {
            const r = hapus;
            setHapus(null);
            void aksi(r.id, () => deleteRelease(r.id, alasan));
          }}
        />
      )}
    </div>
  );
}
