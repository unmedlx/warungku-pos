import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Supplier } from '@/lib/db';
import { useState } from 'react';
import { Truck, Plus, Edit2, Trash2, Phone, MapPin, Search } from '@/components/icons';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from '@/components/jokoui/item';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Textarea } from '@/components/jokoui/textarea';
import { PageHeader } from '@/components/jokoui/page-header';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const CURRENCY_SYMBOL: Record<string, string> = { id: 'Rp', en: 'Rp', ms: 'Rp' };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

export default function SupplierPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { t } = useTranslation('settings');

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const suppliers = useLiveQuery(() => db.suppliers.where('isDeleted').equals(0).toArray());

  if (!can('manage_supplier')) {
    return <LockedPage title={t('supplier.locked.title')} permissionLabel={t('supplier.locked.permissionLabel')} />;
  }

  const filtered = suppliers?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  ) ?? [];

  const openAdd = () => {
    setEditSupplier(null);
    setName(''); setPhone(''); setAddress(''); setNotes('');
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditSupplier(s);
    setName(s.name); setPhone(s.phone); setAddress(s.address); setNotes(s.notes);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim() };
    if (editSupplier?.id) {
      await db.suppliers.update(editSupplier.id, data);
      toast.success(t('supplier.toast.updated'));
    } else {
      await db.suppliers.add({ ...data, createdAt: new Date(), isDeleted: 0, deletedAt: null });
      toast.success(t('supplier.toast.added'));
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) { await db.suppliers.update(deleteId, { isDeleted: 1, deletedAt: new Date() }); setDeleteId(null); toast.success(t('supplier.toast.deleted')); }
  };

  return (
    <div className="page-container space-y-4">
      <PageHeader icon={Truck} title={t('supplier.title')} backTo="/settings">
        <Button onClick={openAdd}>
          <Plus /> {t('supplier.add')}
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t('supplier.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      <p className="text-xs text-muted-foreground">{t('supplier.count', { count: filtered.length })}</p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={t('supplier.empty.title')}
          action={
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus /> {t('supplier.empty.add')}
            </Button>
          }
        />
      ) : (
        <ItemGroup>
          {filtered.map(s => (
            <Item key={s.id} className="items-start">
              <ItemMedia tone="muted"><Truck /></ItemMedia>
              <ItemContent>
                <ItemTitle>{s.name}</ItemTitle>
                {s.phone && (
                  <ItemDescription className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" /> {s.phone}
                  </ItemDescription>
                )}
                {s.address && (
                  <ItemDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" /> {s.address}
                  </ItemDescription>
                )}
                {s.notes && <p className="mt-0.5 text-xs italic text-muted-foreground">{s.notes}</p>}
              </ItemContent>
              <ItemActions>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)} aria-label={t('supplier.dialog.editTitle')}><Edit2 /></Button>
                <Button variant="ghost" size="icon-sm" className="text-destructive-text hover:text-destructive-text" onClick={() => setDeleteId(s.id!)} aria-label={t('supplier.deleteDialog.title')}><Trash2 /></Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader><DialogTitle>{editSupplier ? t('supplier.dialog.editTitle') : t('supplier.dialog.addTitle')}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3.5">
            <div className="space-y-1.5"><Label>{t('supplier.dialog.nameLabel')}</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder={t('supplier.dialog.namePlaceholder')} /></div>
            <div className="space-y-1.5"><Label>{t('supplier.dialog.phoneLabel')}</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('supplier.dialog.phonePlaceholder')} type="tel" /></div>
            <div className="space-y-1.5"><Label>{t('supplier.dialog.addressLabel')}</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t('supplier.dialog.addressPlaceholder')} /></div>
            <div className="space-y-1.5"><Label>{t('supplier.dialog.notesLabel')}</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('supplier.dialog.notesPlaceholder')} rows={2} /></div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="xl" className="flex-1" onClick={() => setDialogOpen(false)}>{t('supplier.deleteDialog.cancel')}</Button>
              <Button size="xl" className="flex-[2]" onClick={handleSave} disabled={!name.trim()}>{t('supplier.dialog.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('supplier.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('supplier.deleteDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('supplier.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white shadow-destructive hover:bg-destructive/90">{t('supplier.deleteDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
