import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
  Users as UsersIcon,
  Plus,
  Loader2,
  Copy,
  Trash2,
  Mail,
  ShieldCheck,
  UserCircle2,
  RefreshCw,
} from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Badge } from '@/components/jokoui/badge';
import { PageHeader } from '@/components/jokoui/page-header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';
import {
  fetchStoreMembers,
  inviteStoreMember,
  revokeStoreInvite,
  removeStoreMember,
  acceptStoreInvite,
  type StoreMember,
  type StoreInvite,
  type StoreRole,
} from '@/lib/cloud-api';
import { syncCloudMembers } from '@/lib/members';
import { pullSyncData } from '@/lib/sync';

/**
 * Anggota cloud toko — karyawan yang punya akun Google sendiri dan menumpang
 * langganan pemilik.
 *
 * Berbeda dari halaman Karyawan (`/users`) yang mengelola login username+PIN
 * per perangkat: yang di sini menentukan siapa yang boleh menyentuh data toko
 * dari perangkat mana pun, dan pencabutannya berlaku dari sisi server.
 */
export default function CloudMembersSettings() {
  const { can } = useAuth();
  const { isLoggedIn, profile } = useCloudAuth();
  const { t } = useTranslation('settings');
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const storeId = storeSettings?.cloudStoreId ?? null;

  const [members, setMembers] = useState<StoreMember[]>([]);
  const [invites, setInvites] = useState<StoreInvite[]>([]);
  const [myRole, setMyRole] = useState<StoreRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'STAFF'>('STAFF');

  // Undangan yang baru dibuat, ditahan supaya kodenya bisa langsung dibagikan.
  // Tanpa layar ini pemilik harus mencarinya lagi di daftar — dan kode itulah
  // satu-satunya cara karyawan masuk, karena tidak ada email otomatis.
  const [newInvite, setNewInvite] = useState<StoreInvite | null>(null);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const maxMembers =
    profile?.syncSubscription?.plan?.maxMembers ?? profile?.subscription?.plan?.maxMembers ?? null;
  const terpakai = members.length + invites.length;
  const atLimit = maxMembers != null && terpakai >= maxMembers;
  const bisaKelola = myRole === 'OWNER' || myRole === 'ADMIN';

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await fetchStoreMembers(storeId);
      setMembers(data.members);
      setInvites(data.invites);
      setMyRole(data.myRole);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudMembers.toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [storeId, t]);

  useEffect(() => {
    if (isLoggedIn && storeId) load();
  }, [isLoggedIn, storeId, load]);

  if (!can('manage_store_settings')) {
    return <LockedPage title={t('cloudMembers.title')} />;
  }

  const handleInvite = async () => {
    if (!storeId) return;
    const email = inviteEmail.trim();
    if (!email) return;
    setBusy('invite');
    try {
      const invite = await inviteStoreMember(storeId, { email, role: inviteRole });
      setInvites((prev) => [invite, ...prev]);
      setInviteOpen(false);
      setInviteEmail('');
      setNewInvite(invite);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudMembers.toast.inviteFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (invite: StoreInvite) => {
    if (!storeId) return;
    setBusy(`revoke:${invite.id}`);
    try {
      await revokeStoreInvite(storeId, invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      toast.success(t('cloudMembers.toast.revoked'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudMembers.toast.revokeFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (member: StoreMember) => {
    if (!storeId) return;
    setBusy(`remove:${member.userId}`);
    try {
      await removeStoreMember(storeId, member.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      // Cerminkan pencabutan ke tabel lokal supaya login PIN-nya ikut mati
      // di perangkat ini tanpa menunggu sync berikutnya.
      await syncCloudMembers(storeId).catch(() => undefined);
      toast.success(t('cloudMembers.toast.removed', { name: member.name ?? member.email ?? '' }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudMembers.toast.removeFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy('join');
    try {
      const { store } = await acceptStoreInvite(code);
      setJoinOpen(false);
      setJoinCode('');
      toast.success(t('cloudMembers.toast.joined', { name: store.name }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudMembers.toast.joinFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleTarikKeLokal = async () => {
    if (!storeId) return;
    setBusy('pull');
    try {
      const hasil = await syncCloudMembers(storeId);
      // Sekalian tarik katalog: dari sudut pandang user, satu tombol "segarkan
      // dari cloud" lebih masuk akal daripada dua tombol terpisah.
      await pullSyncData(storeId).catch(() => undefined);
      toast.success(
        t('cloudMembers.toast.pulled', {
          added: hasil.ditambahkan,
          updated: hasil.diperbarui,
          disabled: hasil.dinonaktifkan,
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudMembers.toast.pullFailed'));
    } finally {
      setBusy(null);
    }
  };

  /**
   * Bagikan kode lewat aplikasi pesan.
   *
   * Tidak ada pengiriman email dari server — undangan sengaja dibagikan
   * manual, mengikuti kebiasaan yang sudah ada (WhatsApp). `navigator.share`
   * dipakai kalau tersedia; kalau tidak, jatuh ke tautan wa.me.
   */
  const bagikanKode = async (invite: StoreInvite) => {
    const pesan = t('cloudMembers.inviteResult.message', {
      store: storeSettings?.storeName ?? '',
      code: invite.code,
    });
    try {
      if (navigator.share) {
        await navigator.share({ text: pesan });
        return;
      }
    } catch {
      // Dibatalkan user atau ditolak browser — lanjut ke jalur wa.me.
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, '_blank', 'noopener');
  };

  const salinKode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t('cloudMembers.toast.codeCopied'));
    } catch {
      toast.error(t('cloudMembers.toast.codeCopyFailed'));
    }
  };

  return (
    <div className="page-container space-y-4">
      <PageHeader icon={UsersIcon} title={t('cloudMembers.title')} backTo="/settings/employees" />

      {!isLoggedIn ? (
        <Card>
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            {t('cloudMembers.requiresLogin')}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Gabung toko orang lain — jalur masuk untuk karyawan. */}
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t('cloudMembers.join.title')}</p>
                <p className="text-2xs text-muted-foreground">{t('cloudMembers.join.desc')}</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setJoinOpen(true)}>
                {t('cloudMembers.join.button')}
              </Button>
            </CardContent>
          </Card>

          {!storeId ? (
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                {t('cloudMembers.noStore')}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{t('cloudMembers.list.title')}</p>
                    <p className="text-2xs text-muted-foreground">
                      {maxMembers == null
                        ? t('cloudMembers.list.countUnlimited', { count: members.length })
                        : t('cloudMembers.list.count', { used: terpakai, max: maxMembers })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleTarikKeLokal}
                      disabled={busy === 'pull'}
                      title={t('cloudMembers.pullButton')}
                    >
                      {busy === 'pull' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    {bisaKelola && !atLimit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => { setInviteEmail(''); setInviteRole('STAFF'); setInviteOpen(true); }}
                      >
                        <Plus className="h-3.5 w-3.5" /> {t('cloudMembers.inviteButton')}
                      </Button>
                    )}
                  </div>
                </div>

                {atLimit && bisaKelola && (
                  <p className="text-2xs text-warning-text">{t('cloudMembers.atLimit')}</p>
                )}

                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.role === 'OWNER' ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info-text'}`}>
                          {m.role === 'OWNER' ? <ShieldCheck className="h-4 w-4" /> : <UserCircle2 className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{m.name ?? m.email}</p>
                            <Badge variant="secondary" size="sm">
                              {t(`cloudMembers.role.${m.role}`)}
                            </Badge>
                          </div>
                          <p className="truncate text-xsm text-muted-foreground">{m.email}</p>
                        </div>
                        {bisaKelola && m.role !== 'OWNER' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive-text"
                            onClick={() => handleRemove(m)}
                            disabled={busy === `remove:${m.userId}`}
                            title={t('cloudMembers.removeButton')}
                          >
                            {busy === `remove:${m.userId}`
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    ))}

                    {invites.map((i) => (
                      <div key={i.id} className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{i.email}</p>
                            <Badge variant="secondary" size="sm">
                              {t('cloudMembers.pending')}
                            </Badge>
                          </div>
                          <p className="font-mono text-2xs text-muted-foreground">{i.code}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => salinKode(i.code)} title={t('cloudMembers.copyCode')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive-text"
                          onClick={() => handleRevoke(i)}
                          disabled={busy === `revoke:${i.id}`}
                          title={t('cloudMembers.revokeButton')}
                        >
                          {busy === `revoke:${i.id}`
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {myRole != null && myRole !== 'OWNER' && (
                  <p className="rounded-lg bg-muted/60 p-2 text-2xs leading-relaxed text-muted-foreground">
                    {t('cloudMembers.replicaNotice')}
                  </p>
                )}

                <p className="text-2xs leading-relaxed text-muted-foreground">
                  {t('cloudMembers.footnote')}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog undang */}
      <Dialog open={!!newInvite} onOpenChange={(open) => !open && setNewInvite(null)}>
        <DialogContent className="max-w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('cloudMembers.inviteResult.title')}</DialogTitle>
            <DialogDescription className="text-xs">
              {t('cloudMembers.inviteResult.desc', { email: newInvite?.email ?? '' })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-1 space-y-4">
            <div className="rounded-xl border border-soft bg-muted/50 py-4 text-center">
              <p className="font-mono text-2xl font-semibold tracking-[0.25em]">{newInvite?.code}</p>
              <p className="mt-1.5 text-2xs text-muted-foreground">
                {t('cloudMembers.inviteResult.validity')}
              </p>
            </div>

            <div className="space-y-2">
              <Button className="w-full" onClick={() => newInvite && bagikanKode(newInvite)}>
                {t('cloudMembers.inviteResult.share')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => newInvite && salinKode(newInvite.code)}
              >
                <Copy className="h-4 w-4" />
                {t('cloudMembers.inviteResult.copy')}
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setNewInvite(null)}>
                {t('cloudMembers.inviteResult.done')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('cloudMembers.inviteDialog.title')}</DialogTitle>
            <DialogDescription className="text-xs">
              {t('cloudMembers.inviteDialog.desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>{t('cloudMembers.inviteDialog.emailLabel')}</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="karyawan@gmail.com"
                
              />
              <p className="text-2xs text-muted-foreground">
                {t('cloudMembers.inviteDialog.emailHint')}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('cloudMembers.inviteDialog.roleLabel')}</Label>
              <div className="flex gap-2">
                {(['STAFF', 'ADMIN'] as const).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={inviteRole === r ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 flex-1 text-xs"
                    onClick={() => setInviteRole(r)}
                  >
                    {t(`cloudMembers.role.${r}`)}
                  </Button>
                ))}
              </div>
              <p className="text-2xs text-muted-foreground">
                {t(`cloudMembers.roleHint.${inviteRole}`)}
              </p>
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={busy === 'invite'}>
              {busy === 'invite' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('cloudMembers.inviteDialog.submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog gabung */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="max-w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('cloudMembers.joinDialog.title')}</DialogTitle>
            <DialogDescription className="text-xs">
              {t('cloudMembers.joinDialog.desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCD2345"
              className="h-12 text-center font-mono text-lg tracking-[0.3em]"
              maxLength={8}
            />
            <Button className="w-full" onClick={handleJoin} disabled={busy === 'join'}>
              {busy === 'join' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('cloudMembers.joinDialog.submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
