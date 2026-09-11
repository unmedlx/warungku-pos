import { useLiveQuery } from 'dexie-react-hooks';
import { db, type User, ALL_PERMISSIONS } from '@/lib/db';
import { useState } from 'react';
import { format } from 'date-fns';
import { id as idLocale, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, KeyRound, UserCircle2, ShieldCheck, UserCheck, UserX, Users as UsersIcon } from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from '@/components/jokoui/item';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Alert, AlertDescription } from '@/components/jokoui/alert';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Badge } from '@/components/jokoui/badge';
import { Switch } from '@/components/jokoui/switch';
import { PageHeader } from '@/components/jokoui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import {
  createUser,
  updateUserPin,
  hashPin,
  isValidPin,
  isValidUsername,
  PERMISSION_LABELS,
  DEFAULT_STAFF_PERMISSIONS,
  type PermissionKey,
} from '@/lib/auth';
import { toast } from 'sonner';
import { isCloudManaged, belumPunyaPin } from '@/lib/members';

const LOCALES: Record<string, Locale> = { id: idLocale, en: enUS, ms };

export default function UsersPage() {
  const navigate = useNavigate();
  const { currentUser, isOwner, multiUserEnabled, refresh } = useAuth();
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? idLocale;
  const users = useLiveQuery(() => db.users.toArray());

  // Add/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [permissions, setPermissions] = useState<PermissionKey[]>(DEFAULT_STAFF_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  // Reset PIN dialog
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<User | null>(null);
  const [newPin, setNewPin] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  if (!multiUserEnabled) {
    return (
      <div className="page-container">
        <PageHeader icon={UsersIcon} title={t('users.title')} onBack={() => navigate(-1)} />
        <Card>
          <EmptyState
            icon={UsersIcon}
            title={t('users.notEnabled.title')}
            description={t('users.notEnabled.description')}
            action={
              <Button size="sm" onClick={() => navigate('/settings')}>
                {t('users.notEnabled.button')}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="page-container">
        <PageHeader icon={UsersIcon} title={t('users.title')} onBack={() => navigate(-1)} />
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t('users.notOwner')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const openAdd = () => {
    setEditing(null);
    setName('');
    setUsername('');
    setPin('');
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setName(user.name);
    setUsername(user.username);
    setPin('');
    setPermissions(user.role === 'owner' ? [...ALL_PERMISSIONS] : user.permissions);
    setDialogOpen(true);
  };

  const togglePermission = (key: PermissionKey, checked: boolean) => {
    setPermissions((prev) => (checked ? [...new Set([...prev, key])] : prev.filter((p) => p !== key)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        // Edit existing user (name + permissions only — username & PIN have separate flows)
        if (!name.trim()) {
          toast.error(t('users.toast.nameRequired'));
          return;
        }
        await db.users.update(editing.id!, {
          name: name.trim(),
          permissions: editing.role === 'owner' ? [] : permissions,
        });
        toast.success(t('users.toast.staffUpdated'));
        if (currentUser?.id === editing.id) await refresh();
      } else {
        // Create new staff
        if (!isValidUsername(username)) {
          toast.error(t('users.toast.usernameInvalid'));
          return;
        }
        if (!isValidPin(pin)) {
          toast.error(t('users.toast.pinInvalid'));
          return;
        }
        if (!name.trim()) {
          toast.error(t('users.toast.nameRequired'));
          return;
        }
        const result = await createUser({
          username,
          pin,
          name,
          role: 'staff',
          permissions,
        });
        if (!result.ok) {
          toast.error(result.error || t('users.toast.createFailed'));
          return;
        }
        toast.success(t('users.toast.staffCreated', { name: name.trim() }));
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openPinReset = (user: User) => {
    setPinTarget(user);
    setNewPin('');
    setPinDialogOpen(true);
  };

  const handlePinReset = async () => {
    if (!pinTarget?.id) return;
    if (!isValidPin(newPin)) {
      toast.error(t('users.toast.pinInvalid'));
      return;
    }
    const result = await updateUserPin(pinTarget.id, newPin);
    if (!result.ok) {
      toast.error(result.error || t('users.toast.pinResetFailed'));
      return;
    }
    toast.success(t('users.toast.pinReset', { name: pinTarget.name }));
    setPinDialogOpen(false);
  };

  const toggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error(t('users.toast.cannotSelfDisable'));
      return;
    }
    if (user.role === 'owner') {
      const otherOwners = (users ?? []).filter((u) => u.role === 'owner' && u.id !== user.id && u.isActive === 1);
      if (user.isActive === 1 && otherOwners.length === 0) {
        toast.error(t('users.toast.ownerMinRequired'));
        return;
      }
    }
    await db.users.update(user.id!, { isActive: user.isActive === 1 ? 0 : 1 });
    toast.success(user.isActive === 1 ? t('users.toast.accountDisabled') : t('users.toast.accountEnabled'));
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    if (deleteTarget.id === currentUser?.id) {
      toast.error(t('users.toast.cannotSelfDelete'));
      setDeleteTarget(null);
      return;
    }
    if (deleteTarget.role === 'owner') {
      const otherOwners = (users ?? []).filter((u) => u.role === 'owner' && u.id !== deleteTarget.id);
      if (otherOwners.length === 0) {
        toast.error(t('users.toast.ownerMinRequired'));
        setDeleteTarget(null);
        return;
      }
    }
    await db.users.delete(deleteTarget.id);
    toast.success(t('users.toast.accountDeleted', { name: deleteTarget.name }));
    setDeleteTarget(null);
  };

  const sortedUsers = (users ?? []).slice().sort((a, b) => {
    if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="page-container space-y-4">
      <PageHeader icon={UsersIcon} title={t('users.title')} onBack={() => navigate(-1)}>
        <Button onClick={openAdd}>
          <Plus />
          {t('users.addButton')}
        </Button>
      </PageHeader>

      <p className="text-xs text-muted-foreground">{t('users.desc')}</p>

      <ItemGroup>
        {sortedUsers.map((user) => (
          <Item key={user.id} className="items-start">
            <ItemMedia tone={user.role === 'owner' ? 'primary' : 'muted'}>
              {user.role === 'owner' ? <ShieldCheck /> : <UserCircle2 />}
            </ItemMedia>
            <ItemContent>
              <div className="flex flex-wrap items-center gap-1.5">
                <ItemTitle>{user.name}</ItemTitle>
                {user.role === 'owner' && (
                  <Badge variant="primary" size="sm">{t('users.card.owner')}</Badge>
                )}
                {user.id === currentUser?.id && (
                  <Badge variant="secondary" size="sm">{t('users.card.you')}</Badge>
                )}
                {user.isActive === 0 && (
                  <Badge variant="outline" size="sm">{t('users.card.inactive')}</Badge>
                )}
                {isCloudManaged(user) && (
                  <Badge variant="info" size="sm">{t('users.card.cloud')}</Badge>
                )}
              </div>
              <ItemDescription className="font-mono text-xs">@{user.username}</ItemDescription>
              {belumPunyaPin(user) && (
                <p className="text-xs text-warning-text">{t('users.card.needsPin')}</p>
              )}
              {user.role !== 'owner' && (
                <p className="text-xs text-muted-foreground">
                  {user.permissions.length === 0
                    ? t('users.card.noAccess')
                    : t('users.card.accessCount', { count: user.permissions.length })}
                </p>
              )}
              {user.lastLoginAt && (
                <p className="text-xs text-muted-foreground">
                  {t('users.card.lastLogin', {
                    time: format(new Date(user.lastLoginAt), 'dd MMM yyyy HH:mm', { locale: dateLocale }),
                  })}
                </p>
              )}
            </ItemContent>
            <ItemActions className="flex-col gap-0.5">
              <Button variant="ghost" size="icon-sm" onClick={() => openEdit(user)} title={t('users.card.edit')} aria-label={t('users.card.edit')}>
                <Edit2 />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => openPinReset(user)}
                title={t('users.card.resetPin')}
                aria-label={t('users.card.resetPin')}
              >
                <KeyRound />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => toggleActive(user)}
                title={user.isActive === 1 ? t('users.card.deactivate') : t('users.card.activate')}
                aria-label={user.isActive === 1 ? t('users.card.deactivate') : t('users.card.activate')}
              >
                {user.isActive === 1 ? <UserCheck /> : <UserX className="text-muted-foreground" />}
              </Button>
              {/* Anggota cloud tidak bisa dihapus dari sini: baris ini
                  cerminan dari server, dan penghapusannya akan dibuat
                  ulang pada sinkronisasi berikutnya. Cabut aksesnya di
                  halaman Anggota Cloud. */}
              {user.id !== currentUser?.id && !isCloudManaged(user) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive-text hover:text-destructive-text"
                  onClick={() => setDeleteTarget(user)}
                  title={t('users.card.delete')}
                  aria-label={t('users.card.delete')}
                >
                  <Trash2 />
                </Button>
              )}
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('users.dialog.editTitle') : t('users.dialog.addTitle')}</DialogTitle>
            <DialogDescription>
              {editing ? t('users.dialog.descEdit') : t('users.dialog.descAdd')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3.5">
            <div className="space-y-1.5">
              <Label>{t('users.dialog.nameLabel')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('users.dialog.namePlaceholder')} />
            </div>

            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label>{t('users.dialog.usernameLabel')}</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    placeholder={t('users.dialog.usernamePlaceholder')}
                    className="font-mono"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">{t('users.dialog.usernameHint')}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('users.dialog.pinLabel')}</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('users.dialog.pinPlaceholder')}
                    className="font-mono text-center tracking-widest"
                  />
                </div>
              </>
            )}

            {editing?.role === 'owner' ? (
              <Alert variant="info">
                <ShieldCheck />
                <AlertDescription>{t('users.dialog.ownerNotice')}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <Label>{t('users.dialog.accessLabel')}</Label>
                <ItemGroup>
                  {ALL_PERMISSIONS.map((key) => {
                    const meta = PERMISSION_LABELS[key];
                    const checked = permissions.includes(key);
                    return (
                      <Item key={key} asChild interactive className={checked ? 'border-primary/40 bg-primary/5' : undefined}>
                        <label>
                          <ItemContent>
                            <ItemTitle>{meta.title}</ItemTitle>
                            <ItemDescription className="line-clamp-2">{meta.desc}</ItemDescription>
                          </ItemContent>
                          <Switch
                            checked={checked}
                            onCheckedChange={(v) => togglePermission(key, v === true)}
                            className="shrink-0"
                          />
                        </label>
                      </Item>
                    );
                  })}
                </ItemGroup>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="xl" className="flex-1" onClick={() => setDialogOpen(false)}>
                {t('users.deleteDialog.cancel')}
              </Button>
              <Button size="xl" className="flex-[2]" onClick={handleSave} disabled={saving}>
                {saving ? t('users.dialog.saving') : editing ? t('users.dialog.saveEdit') : t('users.dialog.saveAdd')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN reset dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{t('users.pinReset.title', { name: pinTarget?.name ?? '' })}</DialogTitle>
            <DialogDescription>
              {t('users.pinReset.desc', { name: pinTarget?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder={t('users.pinReset.placeholder')}
              className="h-11 font-mono text-center text-lg tracking-widest"
              autoFocus
            />
            <Button size="xl" className="w-full" onClick={handlePinReset} disabled={!isValidPin(newPin)}>
              {t('users.pinReset.button')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteDialog.title', { name: deleteTarget?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('users.deleteDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('users.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white shadow-destructive hover:bg-destructive/90">
              {t('users.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
