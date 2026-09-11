import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category } from '@/lib/db';
import { useState } from 'react';
import { Tag, Plus, Trash2, Edit2 } from '@/components/icons';
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

const emojiOptions = ['📦', '🍕', '🥤', '🍜', '🧃', '🎽', '💊', '🧹', '📱', '🛒', '🎁', '✂️'];

export default function ProductCategoriesSettings() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();
  const categories = useLiveQuery(() => db.categories.where('isDeleted').equals(0).toArray());

  const [catDialog, setCatDialog] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catColor, setCatColor] = useState('#FF6B35');
  const [catEditId, setCatEditId] = useState<number | null>(null);

  if (!can('manage_categories_payments')) {
    return (
      <LockedPage
        title={t('productCategory.locked.title')}
        permissionLabel={t('productCategory.locked.permissionLabel')}
      />
    );
  }

  const openCatAdd = () => { setCatEditId(null); setCatName(''); setCatIcon('📦'); setCatColor('#FF6B35'); setCatDialog(true); };
  const openCatEdit = (c: Category) => { setCatEditId(c.id!); setCatName(c.name); setCatIcon(c.icon); setCatColor(c.color); setCatDialog(true); };
  const saveCat = async () => {
    if (!catName.trim()) return;
    if (catEditId) await db.categories.update(catEditId, { name: catName.trim(), icon: catIcon, color: catColor });
    else await db.categories.add({ name: catName.trim(), icon: catIcon, color: catColor, createdAt: new Date(), isDeleted: 0, deletedAt: null });
    setCatDialog(false);
    toast.success(t('productCategory.toast.saved'));
  };
  const deleteCat = async (id: number) => { await db.categories.update(id, { isDeleted: 1, deletedAt: new Date() }); toast.success(t('productCategory.toast.deleted')); };

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={Tag} title={t('productCategory.title')} backTo="/settings">
        <Button size="default" onClick={openCatAdd}><Plus /> {t('productCategory.addButton')}</Button>
      </PageHeader>

      <Card className="divide-y divide-border overflow-hidden">
        {categories && categories.length === 0 && (
          <EmptyState icon={Tag} title={t('productCategory.empty')} />
        )}
        {categories?.map(c => (
          <Item key={c.id} variant="flat">
            {/* Warna kategori dipakai sebagai tint media, bukan blob bulat */}
            <ItemMedia className="text-lg" style={{ backgroundColor: c.color + '20' }}>{c.icon}</ItemMedia>
            <ItemContent>
              <ItemTitle>{c.name}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Button variant="ghost" size="icon-sm" onClick={() => openCatEdit(c)} aria-label={t('productCategory.dialog.editTitle')}><Edit2 /></Button>
              <Button variant="ghost" size="icon-sm" className="text-destructive-text" onClick={() => deleteCat(c.id!)} aria-label={t('productCategory.toast.deleted')}><Trash2 /></Button>
            </ItemActions>
          </Item>
        ))}
      </Card>

      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader><DialogTitle>{catEditId ? t('productCategory.dialog.editTitle') : t('productCategory.dialog.addTitle')}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>{t('productCategory.dialog.nameLabel')}</Label>
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder={t('productCategory.dialog.namePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('productCategory.dialog.iconLabel')}</Label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setCatIcon(e)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg border text-lg shadow-xs transition-colors',
                      catIcon === e ? 'border-primary bg-primary/10' : 'border-input bg-transparent hover:bg-accent',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('productCategory.dialog.colorLabel')}</Label>
              <Input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} className="w-20 p-1" />
            </div>
            <Button size="xl" className="w-full" onClick={saveCat} disabled={!catName.trim()}>{t('productCategory.dialog.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
