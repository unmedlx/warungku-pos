import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ExpenseCategory } from '@/lib/db';
import { useState } from 'react';
import { Wallet, Plus, Trash2, Edit2 } from '@/components/icons';
import { Card } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/jokoui/item';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/jokoui/page-header';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';

const expenseEmojiOptions = ['💡', '🏠', '👤', '🚚', '🧰', '📦', '💧', '📞', '🌐', '☕', '🧾', '💼'];

export default function ExpenseCategoriesSettings() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();
  const expenseCategories = useLiveQuery(() =>
    db.expenseCategories.where('isDeleted').equals(0).toArray(),
  );

  const [expCatDialog, setExpCatDialog] = useState(false);
  const [expCatName, setExpCatName] = useState('');
  const [expCatIcon, setExpCatIcon] = useState('📦');
  const [expCatColor, setExpCatColor] = useState('#FBBF24');
  const [expCatEditId, setExpCatEditId] = useState<number | null>(null);

  if (!can('manage_categories_payments')) {
    return (
      <LockedPage
        title={t('expenseCategory.locked.title')}
        permissionLabel={t('expenseCategory.locked.permissionLabel')}
      />
    );
  }

  const openExpCatAdd = () => { setExpCatEditId(null); setExpCatName(''); setExpCatIcon('📦'); setExpCatColor('#FBBF24'); setExpCatDialog(true); };
  const openExpCatEdit = (c: ExpenseCategory) => { setExpCatEditId(c.id!); setExpCatName(c.name); setExpCatIcon(c.icon); setExpCatColor(c.color); setExpCatDialog(true); };
  const saveExpCat = async () => {
    const name = expCatName.trim();
    if (!name) return;
    if (expCatEditId) {
      await db.expenseCategories.update(expCatEditId, { name, icon: expCatIcon, color: expCatColor });
    } else {
      await db.expenseCategories.add({
        name,
        icon: expCatIcon,
        color: expCatColor,
        isDefault: 0,
        createdAt: new Date(),
        isDeleted: 0,
        deletedAt: null,
      });
    }
    setExpCatDialog(false);
    toast.success(t('expenseCategory.toast.saved'));
  };
  const deleteExpCat = async (cat: ExpenseCategory) => {
    if (!cat.id) return;
    const usage = await db.expenses.where('categoryId').equals(cat.id).filter(e => e.isDeleted === 0).count();
    if (usage > 0) {
      toast.error(t('expenseCategory.toast.inUse', { count: usage }));
      return;
    }
    await db.expenseCategories.update(cat.id, { isDeleted: 1, deletedAt: new Date() });
    toast.success(t('expenseCategory.toast.deleted'));
  };

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={Wallet} title={t('expenseCategory.title')} backTo="/settings">
        <Button size="default" onClick={openExpCatAdd}><Plus /> {t('expenseCategory.addButton')}</Button>
      </PageHeader>

      <Card className="divide-y divide-border overflow-hidden">
        {expenseCategories && expenseCategories.length === 0 && (
          <EmptyState icon={Wallet} title={t('expenseCategory.empty')} />
        )}
        {expenseCategories?.map(c => (
          <Item key={c.id} variant="flat">
            <ItemMedia className="text-lg" style={{ backgroundColor: c.color + '20' }}>{c.icon}</ItemMedia>
            <ItemContent>
              <ItemTitle>{c.name}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Button variant="ghost" size="icon-sm" onClick={() => openExpCatEdit(c)} aria-label={t('expenseCategory.dialog.editTitle')}><Edit2 /></Button>
              <Button variant="ghost" size="icon-sm" className="text-destructive-text" onClick={() => deleteExpCat(c)} aria-label={t('expenseCategory.toast.deleted')}><Trash2 /></Button>
            </ItemActions>
          </Item>
        ))}
      </Card>

      <Dialog open={expCatDialog} onOpenChange={setExpCatDialog}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader><DialogTitle>{expCatEditId ? t('expenseCategory.dialog.editTitle') : t('expenseCategory.dialog.addTitle')}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>{t('expenseCategory.dialog.nameLabel')}</Label>
              <Input
                value={expCatName}
                onChange={e => setExpCatName(e.target.value)}
                placeholder={t('expenseCategory.dialog.namePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('expenseCategory.dialog.iconLabel')}</Label>
              <div className="flex flex-wrap gap-2">
                {expenseEmojiOptions.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setExpCatIcon(e)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg border text-lg shadow-xs transition-colors',
                      expCatIcon === e ? 'border-primary bg-primary/10' : 'border-input bg-transparent hover:bg-accent',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('expenseCategory.dialog.colorLabel')}</Label>
              <Input type="color" value={expCatColor} onChange={e => setExpCatColor(e.target.value)} className="w-20 p-1" />
            </div>
            <Button size="xl" className="w-full" onClick={saveExpCat} disabled={!expCatName.trim()}>{t('expenseCategory.dialog.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
