import { useState, useEffect, useCallback } from 'react';
import { History, CreditCard, Loader2, Info } from '@/components/icons';
import { Card } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Badge } from '@/components/jokoui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/jokoui/item';
import { PageHeader } from '@/components/jokoui/page-header';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { fetchPaymentHistory, verifyPayment, type PaymentTransaction } from '@/lib/cloud-api';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 10;
const LOCALES: Record<string, Locale> = { id: idLocale, en: enUS, ms };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

export default function CloudHistorySettings() {
  const { can } = useAuth();
  const { isLoggedIn, refreshProfile } = useCloudAuth();
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? idLocale;
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const rp = (n: number) => `Rp ${n.toLocaleString(numberLocale)}`;

  const STATUS_LABEL: Record<string, string> = {
    COMPLETED: t('cloudHistory.status.completed'),
    PENDING: t('cloudHistory.status.pending'),
    FAILED: t('cloudHistory.status.failed'),
  };
  const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
    COMPLETED: 'success',
    PENDING: 'warning',
    FAILED: 'destructive',
  };

  const [history, setHistory] = useState<PaymentTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (p: number, append: boolean) => {
    setLoading(true);
    try {
      const { items, pagination } = await fetchPaymentHistory({ page: p, limit: PAGE_SIZE });
      setHistory((prev) => (append ? [...prev, ...items] : items));
      setPage(pagination.page);
      setHasMore(pagination.hasMore);
    } catch {
      /* diabaikan */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) load(1, false);
  }, [isLoggedIn, load]);

  if (!can('manage_backup')) {
    return <LockedPage title={t('cloudHistory.locked.title')} permissionLabel={t('cloudHistory.locked.permissionLabel')} />;
  }

  const handleCheckPayment = async (txId: string) => {
    setBusy(`verify:${txId}`);
    try {
      const result = await verifyPayment(txId);
      await load(1, false);
      if (result.transaction.status === 'COMPLETED') {
        await refreshProfile();
        toast.success(t('cloudHistory.toast.paymentSuccess'));
      } else {
        toast.info(t('cloudHistory.toast.pending'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudHistory.toast.verifyFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={History} title={t('cloudHistory.title')} backTo="/settings/cloud-backup" />

      {!isLoggedIn ? (
        <Alert variant="info">
          <Info />
          <AlertTitle>{t('cloudHistory.title')}</AlertTitle>
          <AlertDescription>{t('cloudHistory.loginPrompt')}</AlertDescription>
        </Alert>
      ) : loading && history.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : history.length === 0 ? (
        <Card>
          <EmptyState icon={History} title={t('cloudHistory.noTransactions')} />
        </Card>
      ) : (
        <>
          <Card className="divide-y divide-border overflow-hidden">
            {history.map((tx) => (
              <Item key={tx.id} variant="flat">
                <ItemContent>
                  <ItemTitle>{tx.plan?.name ?? tx.planId}</ItemTitle>
                  <ItemDescription>{format(new Date(tx.createdAt), 'dd MMM yyyy HH:mm', { locale: dateLocale })}</ItemDescription>
                </ItemContent>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums">{rp(tx.amount)}</span>
                  <Badge size="sm" variant={STATUS_VARIANT[tx.status] ?? 'secondary'}>
                    {STATUS_LABEL[tx.status] ?? tx.status}
                  </Badge>
                </div>
                {tx.status === 'PENDING' && (
                  <Button variant="outline" size="sm" disabled={busy === `verify:${tx.id}`} onClick={() => handleCheckPayment(tx.id)}>
                    {busy === `verify:${tx.id}` ? <Loader2 className="animate-spin" /> : <CreditCard />}
                    {t('cloudHistory.checkButton')}
                  </Button>
                )}
              </Item>
            ))}
          </Card>
          {hasMore && (
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => load(page + 1, true)}>
              {loading ? <Loader2 className="animate-spin" /> : t('cloudHistory.loadMore')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
