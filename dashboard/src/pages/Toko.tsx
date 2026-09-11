import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Globe,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Store as StoreIcon,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import {
  ApiError,
  createStore,
  deleteStore,
  fetchStores,
  updateStore,
  updateStoreVisibility,
} from '@/lib/api';
import type { Store } from '@/lib/types';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHead,
  EmptyBox,
  ErrorBox,
  PageHeader,
  Skeleton,
} from '@/components/Common';
import { initials } from '@/components/Sidebar';

/** Alamat ringkas untuk kolom toko — bagian yang kosong dilewati. */
function shortAddress(s: Store): string {
  return [s.address1, s.districtName, s.cityName, s.provinceName].filter(Boolean).join(', ');
}

type EditData = { name: string; phone: string | null; address1: string | null };

export default function Toko({
  maxStores,
  onStoresChanged,
}: {
  maxStores: number | null;
  onStoresChanged: () => void;
}) {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStores(await fetchStores());
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(err instanceof Error ? err.message : 'Gagal memuat daftar toko');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Semua mutasi lewat sini supaya penanganan error, refresh, dan status sibuknya seragam. */
  const run = async (id: string | null, fn: () => Promise<unknown>) => {
    setBusyId(id ?? '__baru__');
    setError(null);
    try {
      await fn();
      await load();
      onStoresChanged();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (await run(null, () => createStore(name))) {
      setNewName('');
      setCreating(false);
    }
  };

  const onDelete = (s: Store) => {
    const yakin = window.confirm(
      `Hapus toko "${s.name}"? Semua data cloud yang menempel padanya ikut terhapus dan tidak bisa dikembalikan.`,
    );
    if (yakin) void run(s.id, () => deleteStore(s.id));
  };

  const count = stores?.length ?? 0;
  const atLimit = maxStores !== null && count >= maxStores;

  const subtitle = loading
    ? 'Memuat…'
    : count === 0
      ? 'Belum ada toko'
      : maxStores !== null
        ? `${count} dari ${maxStores} toko terpakai`
        : `${count} toko`;

  return (
    <>
      <PageHeader title="Toko & Cabang" subtitle={subtitle}>
        <Button
          variant="primary"
          onClick={() => setCreating(true)}
          disabled={atLimit || creating}
        >
          <Plus size={16} /> Tambah toko
        </Button>
      </PageHeader>

      {/* Kuota penuh itu batasan, bukan kesalahan — karena itu kuning, bukan merah. */}
      {atLimit && !loading && (
        <Alert
          variant="warning"
          icon={<TriangleAlert size={16} />}
          title="Kuota toko sudah penuh"
          description={`Paket kamu memuat ${maxStores} toko. Naikkan paket lebih dulu untuk menambah cabang.`}
          className="mb-5"
        />
      )}

      {error && (
        <div className="mb-5">
          <ErrorBox message={error} onRetry={() => void load()} />
        </div>
      )}

      {creating && (
        <Card className="mb-4">
          <CardHead title="Toko baru" />
          <CardBody>
            <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
              <label className="min-w-[220px] flex-1">
                <span className="label">Nama toko</span>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Mis. KanPOS Cabang Cinere"
                  className="isian"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Nama ini tampil di laporan dan struk.
                </p>
              </label>
              <Button
                type="submit"
                variant="primary"
                className="mb-[22px]"
                disabled={busyId === '__baru__' || !newName.trim()}
              >
                {busyId === '__baru__' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Simpan
              </Button>
              <Button
                type="button"
                className="mb-[22px]"
                onClick={() => {
                  setCreating(false);
                  setNewName('');
                }}
              >
                Batal
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <Skeleton className="h-[260px]" />
      ) : count === 0 ? (
        <EmptyBox
          icon={<StoreIcon size={20} strokeWidth={1.75} />}
          title="Belum ada toko"
          description="Tambahkan toko pertamamu di sini, atau aktifkan Cloud di aplikasi kasir supaya tokonya terdaftar otomatis."
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHead
            title="Daftar toko"
            hint={count > 1 ? 'diurutkan dari yang terbaru' : undefined}
          />
          {/* Tabel, bukan tumpukan kartu: kolom aksi jadi rata antar baris. */}
          <div className="overflow-x-auto">
            <table className="tabel min-w-[780px] table-fixed">
              <thead>
                <tr>
                  <th className="w-[38%]">Toko</th>
                  <th className="w-[22%]">Telepon</th>
                  <th className="w-[14%]">Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {stores!.map((s) =>
                  editingId === s.id ? (
                    <tr key={s.id}>
                      {/* `!` diperlukan: aturan hover `.tabel tbody tr:hover td`
                          lebih spesifik daripada utility biasa, dan baris yang
                          sedang diubah tidak boleh ikut menyala saat disentuh. */}
                      <td colSpan={4} className="!bg-background">
                        <StoreEditor
                          store={s}
                          busy={busyId === s.id}
                          onCancel={() => setEditingId(null)}
                          onSave={async (data) => {
                            if (await run(s.id, () => updateStore(s.id, data))) setEditingId(null);
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    <Row
                      key={s.id}
                      store={s}
                      busy={busyId === s.id}
                      onEdit={() => setEditingId(s.id)}
                      onToggle={() => void run(s.id, () => updateStoreVisibility(s.id, !s.isPublic))}
                      onDelete={() => onDelete(s)}
                    />
                  ),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function Row({
  store: s,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  store: Store;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const alamat = shortAddress(s);
  return (
    <tr>
      <td>
        <div className="flex min-w-0 items-center gap-3">
          {s.logoUrl ? (
            <img src={s.logoUrl} alt="" className="h-8 w-8 flex-none rounded-lg object-cover" />
          ) : (
            <Avatar square tone="primary">
              {initials(s.name)}
            </Avatar>
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium">{s.name}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {alamat || 'Alamat belum diisi'}
            </span>
          </span>
        </div>
      </td>
      <td>
        <div className="truncate text-muted-foreground">{s.phone || '—'}</div>
      </td>
      <td>
        <Badge variant={s.isPublic ? 'success' : 'secondary'} size="sm">
          {s.isPublic ? <Globe size={12} /> : <Lock size={12} />}
          {s.isPublic ? 'Publik' : 'Privat'}
        </Badge>
      </td>
      <td>
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" disabled={busy} onClick={onToggle}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            {s.isPublic ? 'Jadikan privat' : 'Jadikan publik'}
          </Button>
          <Button size="icon-sm" title="Ubah" aria-label="Ubah toko" onClick={onEdit}>
            <Pencil size={15} />
          </Button>
          <Button
            variant="destructive"
            size="icon-sm"
            title="Hapus toko"
            aria-label="Hapus toko"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function StoreEditor({
  store,
  busy,
  onSave,
  onCancel,
}: {
  store: Store;
  busy: boolean;
  onSave: (data: EditData) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(store.name);
  const [phone, setPhone] = useState(store.phone ?? '');
  const [address1, setAddress1] = useState(store.address1 ?? '');

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
          name: name.trim(),
          phone: phone.trim() || null,
          address1: address1.trim() || null,
        });
      }}
    >
      <Field label="Nama toko" value={name} onChange={setName} className="min-w-[190px] flex-1" autoFocus />
      <Field label="Telepon" value={phone} onChange={setPhone} className="w-[170px]" />
      <Field label="Alamat" value={address1} onChange={setAddress1} className="min-w-[190px] flex-1" />
      <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Simpan
      </Button>
      <Button type="button" onClick={onCancel}>
        Batal
      </Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  className = '',
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="isian"
      />
    </label>
  );
}
