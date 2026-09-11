import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PaymentMethod } from '@/lib/db';
import { useState } from 'react';
import { CreditCard, Plus, Trash2, Edit2 } from '@/components/icons';
import { Card } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { EmptyState } from '@/components/jokoui/empty-state';
import { SegmentGroup } from '@/components/jokoui/segment-group';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/jokoui/item';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/jokoui/page-header';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';

const PM_CATEGORIES = ['tunai', 'transfer', 'e-wallet', 'qris'];

export default function PaymentMethodsSettings() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());

  const [pmDialog, setPmDialog] = useState(false);
  const [pmName, setPmName] = useState('');
  const [pmCategory, setPmCategory] = useState('tunai');
  const [pmEditId, setPmEditId] = useState<number | null>(null);

  if (!can('manage_categories_payments')) {
    return (
      <LockedPage
        title={t('paymentMethod.locked.title')}
        permissionLabel={t('paymentMethod.locked.permissionLabel')}
      />
    );
  }

  const openPmAdd = () => { setPmEditId(null); setPmName(''); setPmCategory('tunai'); setPmDialog(true); };
  const openPmEdit = (pm: PaymentMethod) => { setPmEditId(pm.id!); setPmName(pm.name); setPmCategory(pm.category); setPmDialog(true); };
  const savePm = async () => {
    if (!pmName.trim()) return;
    if (pmEditId) await db.paymentMethods.update(pmEditId, { name: pmName.trim(), category: pmCategory });
    else await db.paymentMethods.add({ name: pmName.trim(), category: pmCategory, isDefault: false, createdAt: new Date() });
    setPmDialog(false);
    toast.success(t('paymentMethod.toast.saved'));
  };
  const deletePm = async (id: number) => { await db.paymentMethods.delete(id); toast.success(t('paymentMethod.toast.deleted')); };

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={CreditCard} title={t('paymentMethod.title')} backTo="/settings">
        <Button size="default" onClick={openPmAdd}><Plus /> {t('paymentMethod.addButton')}</Button>
      </PageHeader>

      <Card className="divide-y divide-border overflow-hidden">
        {paymentMethods && paymentMethods.length === 0 && (
          <EmptyState icon={CreditCard} title={t('paymentMethod.empty')} />
        )}
        {paymentMethods?.map(pm => (
          <Item key={pm.id} variant="flat">
            <ItemMedia tone="primary"><CreditCard /></ItemMedia>
            <ItemContent>
              <ItemTitle>{pm.name}</ItemTitle>
              <ItemDescription className="capitalize">{pm.category}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="ghost" size="icon-sm" onClick={() => openPmEdit(pm)} aria-label={t('paymentMethod.dialog.editTitle')}><Edit2 /></Button>
              <Button variant="ghost" size="icon-sm" className="text-destructive-text" onClick={() => deletePm(pm.id!)} aria-label={t('paymentMethod.toast.deleted')}><Trash2 /></Button>
            </ItemActions>
          </Item>
        ))}
      </Card>

      <Dialog open={pmDialog} onOpenChange={setPmDialog}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader><DialogTitle>{pmEditId ? t('paymentMethod.dialog.editTitle') : t('paymentMethod.dialog.addTitle')}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>{t('paymentMethod.dialog.nameLabel')}</Label>
              <Input value={pmName} onChange={e => setPmName(e.target.value)} placeholder={t('paymentMethod.dialog.namePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('paymentMethod.dialog.categoryLabel')}</Label>
              <SegmentGroup
                layout="full"
                value={pmCategory}
                onValueChange={setPmCategory}
                items={PM_CATEGORIES.map(c => ({ value: c, label: <span className="capitalize">{c}</span> }))}
              />
            </div>
            <Button size="xl" className="w-full" onClick={savePm} disabled={!pmName.trim()}>{t('paymentMethod.dialog.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
