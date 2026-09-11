import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Customer } from '@/lib/db';
import { useState } from 'react';
import { Users as UsersIcon, Plus, Edit2, Trash2, Phone, MapPin, Mail, Search, Eye, ShoppingBag, HandCoins } from '@/components/icons';
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from '@/components/jokoui/item';
import { StatCard } from '@/components/jokoui/stat-card';
import { SectionTitle } from '@/components/jokoui/section-title';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Badge } from '@/components/jokoui/badge';
import { Textarea } from '@/components/jokoui/textarea';
import { PageHeader } from '@/components/jokoui/page-header';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';

const LOCALES: Record<string, Locale> = { id, en: enUS, ms };
const CURRENCY_SYMBOL: Record<string, string> = { id: 'Rp', en: 'Rp', ms: 'Rp' };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

export default function CustomersPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? id;
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[i18n.language] ?? 'Rp';

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const customers = useLiveQuery(() => db.customers.where('isDeleted').equals(0).toArray());
  const debts = useLiveQuery(() => db.debts.toArray());

  // Transaksi pelanggan yang sedang dilihat, terbaru dulu.
  // customerId tidak di-index, jadi pakai filter (dataset transaksi UMKM kecil).
  const customerTx = useLiveQuery(
    async () => {
      if (!viewCustomer?.id) return [];
      const all = await db.transactions
        .filter((t) => t.customerId === viewCustomer.id)
        .toArray();
      return all.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    },
    [viewCustomer?.id],
  );

  if (!can('manage_customers')) {
    return <LockedPage title={t('customers.locked.title')} permissionLabel={t('customers.locked.permissionLabel')} />;
  }

  const filtered = customers?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const openAdd = () => {
    setEditCustomer(null);
    setName(''); setPhone(''); setEmail(''); setAddress(''); setNotes('');
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setName(c.name); setPhone(c.phone); setEmail(c.email); setAddress(c.address); setNotes(c.notes);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
    };
    if (editCustomer?.id) {
      await db.customers.update(editCustomer.id, data);
      toast.success(t('customers.toast.updated'));
    } else {
      await db.customers.add({ ...data, createdAt: new Date(), isDeleted: 0, deletedAt: null });
      trackEvent('create_customer');
      toast.success(t('customers.toast.added'));
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await db.customers.update(deleteId, { isDeleted: 1, deletedAt: new Date() });
      setDeleteId(null);
      toast.success(t('customers.toast.deleted'));
    }
  };

  return (
    <div className="page-container space-y-4">
      <PageHeader icon={UsersIcon} title={t('customers.title')} backTo="/settings">
        <Button onClick={openAdd}>
          <Plus /> {t('customers.add')}
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t('customers.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      <p className="text-xs text-muted-foreground">{t('customers.count', { count: filtered.length })}</p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={t('customers.empty.title')}
          action={
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus /> {t('customers.empty.add')}
            </Button>
          }
        />
      ) : (
        <ItemGroup>
          {filtered.map(c => (
            <Item key={c.id} className="items-start">
              {/* Avatar orang boleh bulat */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <ItemContent>
                <ItemTitle>{c.name}</ItemTitle>
                {c.phone && (
                  <ItemDescription className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" /> {c.phone}
                  </ItemDescription>
                )}
                {c.email && (
                  <ItemDescription className="flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" /> {c.email}
                  </ItemDescription>
                )}
                {c.address && (
                  <ItemDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" /> {c.address}
                  </ItemDescription>
                )}
                {c.notes && <p className="mt-0.5 text-xs italic text-muted-foreground">{c.notes}</p>}
              </ItemContent>
              <ItemActions className="gap-0.5">
                <Button variant="ghost" size="icon-sm" onClick={() => setViewCustomer(c)} aria-label={t('customers.viewDialog.historyTitle')}><Eye /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)} aria-label={t('customers.dialog.editTitle')}><Edit2 /></Button>
                <Button variant="ghost" size="icon-sm" className="text-destructive-text hover:text-destructive-text" onClick={() => setDeleteId(c.id!)} aria-label={t('customers.deleteDialog.title')}><Trash2 /></Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader><DialogTitle>{editCustomer ? t('customers.dialog.editTitle') : t('customers.dialog.addTitle')}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3.5">
            <div className="space-y-1.5"><Label>{t('customers.dialog.nameLabel')}</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder={t('customers.dialog.namePlaceholder')} /></div>
            <div className="space-y-1.5"><Label>{t('customers.dialog.phoneLabel')}</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('customers.dialog.phonePlaceholder')} type="tel" /></div>
            <div className="space-y-1.5"><Label>{t('customers.dialog.emailLabel')}</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('customers.dialog.emailPlaceholder')} type="email" /></div>
            <div className="space-y-1.5"><Label>{t('customers.dialog.addressLabel')}</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t('customers.dialog.addressPlaceholder')} /></div>
            <div className="space-y-1.5"><Label>{t('customers.dialog.notesLabel')}</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('customers.dialog.notesPlaceholder')} rows={2} /></div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="xl" className="flex-1" onClick={() => setDialogOpen(false)}>{t('customers.deleteDialog.cancel')}</Button>
              <Button size="xl" className="flex-[2]" onClick={handleSave} disabled={!name.trim()}>{t('customers.dialog.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('customers.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('customers.deleteDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('customers.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white shadow-destructive hover:bg-destructive/90">{t('customers.deleteDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View customer + transaction history */}
      <Dialog open={!!viewCustomer} onOpenChange={(open) => { if (!open) setViewCustomer(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewCustomer?.name}</DialogTitle>
          </DialogHeader>

          {viewCustomer && (
            <div className="space-y-4 mt-1">
              {/* Contact info */}
              <div className="space-y-1.5">
                {viewCustomer.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {viewCustomer.phone}</p>
                )}
                {viewCustomer.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {viewCustomer.email}</p>
                )}
                {viewCustomer.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {viewCustomer.address}</p>
                )}
                {viewCustomer.notes && (
                  <p className="text-sm text-muted-foreground italic">{viewCustomer.notes}</p>
                )}
              </div>

              {/* Summary */}
              {(() => {
                const txs = customerTx ?? [];
                const completed = txs.filter(t => t.status !== 'open');
                const totalSpent = completed.reduce((s, t) => s + t.total, 0);
                const customerDebts = debts?.filter((debt) => debt.customerId === viewCustomer.id) ?? [];
                const remainingDebt = customerDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
                return (
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard size="sm" label={t('customers.viewDialog.summary.totalTransactions')} value={completed.length} />
                    <StatCard size="sm" label={t('customers.viewDialog.summary.totalSpent')} value={`${currencySymbol} ${totalSpent.toLocaleString(numberLocale)}`} valueClassName="text-sm" />
                    <StatCard
                      size="sm"
                      label={t('customers.viewDialog.summary.remainingDebt')}
                      value={`${currencySymbol} ${remainingDebt.toLocaleString(numberLocale)}`}
                      valueClassName="text-sm text-warning-text"
                      className={remainingDebt > 0 ? 'border-warning/30 bg-warning/5' : undefined}
                    />
                  </div>
                );
              })()}

              {(debts?.some((debt) => debt.customerId === viewCustomer.id) ?? false) && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/debts')}>
                  <HandCoins />
                  {t('customers.viewDialog.openDebts')}
                </Button>
              )}

              {/* History */}
              <div className="space-y-2">
                <SectionTitle title={t('customers.viewDialog.historyTitle')} className="mb-0" />

                {customerTx === undefined ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">{t('customers.viewDialog.loading')}</p>
                ) : customerTx.length === 0 ? (
                  <EmptyState icon={ShoppingBag} title={t('customers.viewDialog.empty')} className="py-6" />
                ) : (
                  <ItemGroup>
                    {customerTx.map(tx => (
                      <Item key={tx.id} asChild interactive>
                        <button type="button" onClick={() => navigate(`/history?txId=${tx.id}`)}>
                          <ItemContent>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" size="sm">{tx.receiptNumber}</Badge>
                              {tx.status === 'open' && (
                                <Badge variant="warning" size="sm">{t('transactionHistory.badges.open')}</Badge>
                              )}
                              {debts?.some((debt) => debt.transactionId === tx.id && debt.status !== 'paid') && (
                                <Badge variant="warning" size="sm">{t('transactionHistory.badges.debt')}</Badge>
                              )}
                            </div>
                            <ItemDescription className="text-xs">
                              {format(new Date(tx.date), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}
                            </ItemDescription>
                          </ItemContent>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">{currencySymbol} {tx.total.toLocaleString(numberLocale)}</span>
                        </button>
                      </Item>
                    ))}
                  </ItemGroup>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
