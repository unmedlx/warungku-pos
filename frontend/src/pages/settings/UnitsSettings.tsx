import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Unit } from '@/lib/db';
import { useState } from 'react';
import { Ruler, Plus, Trash2, Edit2 } from '@/components/icons';
import { Card } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/jokoui/item';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/jokoui/page-header';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function UnitsSettings() {
  const { t } = useTranslation('settings');
  const units = useLiveQuery(() => db.units.where('isDeleted').equals(0).toArray());

  const [unitDialog, setUnitDialog] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [unitEditId, setUnitEditId] = useState<number | null>(null);
  const [unitOriginalName, setUnitOriginalName] = useState('');
  const [unitDeleteTarget, setUnitDeleteTarget] = useState<Unit | null>(null);
  const [unitDeleteUsage, setUnitDeleteUsage] = useState(0);

  const openUnitAdd = () => {
    setUnitEditId(null);
    setUnitName('');
    setUnitOriginalName('');
    setUnitDialog(true);
  };
  const openUnitEdit = (u: Unit) => {
    setUnitEditId(u.id!);
    setUnitName(u.name);
    setUnitOriginalName(u.name);
    setUnitDialog(true);
  };
  const saveUnit = async () => {
    const name = unitName.trim();
    if (!name) return;

    // Uniqueness check (active units only — soft-deleted records still occupy &name index,
    // but we want to surface a clearer message on conflict)
    const existing = await db.units.where('name').equals(name).first();
    if (existing && existing.id !== unitEditId) {
      if (existing.isDeleted === 1) {
        toast.error(t('units.toast.wasDeleted', { name }));
      } else {
        toast.error(t('units.toast.duplicate', { name }));
      }
      return;
    }

    try {
      if (unitEditId) {
        await db.units.update(unitEditId, { name });
        // Cascade rename to all products using the old name so the dropdown stays consistent
        if (unitOriginalName && unitOriginalName !== name) {
          await db.products.where('unit').equals(unitOriginalName).modify({ unit: name, updatedAt: new Date() });
        }
      } else {
        await db.units.add({
          name,
          isDefault: 0,
          createdAt: new Date(),
          isDeleted: 0,
          deletedAt: null,
        });
      }
      setUnitDialog(false);
      toast.success(t('units.toast.saved'));
    } catch {
      toast.error(t('units.toast.saveFailed'));
    }
  };
  const requestDeleteUnit = async (u: Unit) => {
    const usage = await db.products.where('unit').equals(u.name).filter(p => p.isDeleted === 0).count();
    setUnitDeleteUsage(usage);
    setUnitDeleteTarget(u);
  };
  const confirmDeleteUnit = async () => {
    if (!unitDeleteTarget?.id) return;
    await db.units.update(unitDeleteTarget.id, { isDeleted: 1, deletedAt: new Date() });
    setUnitDeleteTarget(null);
    toast.success(t('units.toast.deleted'));
  };

  const trimmedUnitName = unitName.trim();

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={Ruler} title={t('units.title')} backTo="/settings">
        <Button size="default" onClick={openUnitAdd}><Plus /> {t('units.addButton')}</Button>
      </PageHeader>

      <Card className="divide-y divide-border overflow-hidden">
        {units && units.length === 0 && (
          <EmptyState icon={Ruler} title={t('units.empty')} />
        )}
        {units?.map(u => (
          <Item key={u.id} variant="flat">
            <ItemMedia tone="muted"><Ruler /></ItemMedia>
            <ItemContent>
              <ItemTitle>{u.name}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Button variant="ghost" size="icon-sm" onClick={() => openUnitEdit(u)} aria-label={t('units.dialog.editTitle')}><Edit2 /></Button>
              <Button variant="ghost" size="icon-sm" className="text-destructive-text" onClick={() => requestDeleteUnit(u)} aria-label={t('units.deleteDialog.confirm')}><Trash2 /></Button>
            </ItemActions>
          </Item>
        ))}
      </Card>

      <Dialog open={unitDialog} onOpenChange={setUnitDialog}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader><DialogTitle>{unitEditId ? t('units.dialog.editTitle') : t('units.dialog.addTitle')}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>{t('units.dialog.nameLabel')}</Label>
              <Input
                value={unitName}
                onChange={e => setUnitName(e.target.value)}
                placeholder={t('units.dialog.namePlaceholder')}
              />
              {unitEditId && unitOriginalName && trimmedUnitName && trimmedUnitName !== unitOriginalName && (
                <p className="text-xs text-muted-foreground">
                  {t('units.dialog.renameHint', { old: unitOriginalName, new: trimmedUnitName })}
                </p>
              )}
            </div>
            <Button size="xl" className="w-full" onClick={saveUnit} disabled={!unitName.trim()}>{t('units.dialog.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!unitDeleteTarget} onOpenChange={(o) => { if (!o) setUnitDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('units.deleteDialog.title', { name: unitDeleteTarget?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {unitDeleteUsage > 0
                ? t('units.deleteDialog.inUse', { count: unitDeleteUsage, name: unitDeleteTarget?.name ?? '' })
                : t('units.deleteDialog.safe')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('units.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUnit} className="bg-destructive text-white hover:bg-destructive/90">{t('units.deleteDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
