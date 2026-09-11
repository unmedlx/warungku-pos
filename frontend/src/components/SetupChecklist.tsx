import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, ListChecks, X } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/db';
import { Progress } from '@/components/jokoui/progress';
import { Card, CardContent } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { ItemMedia } from '@/components/jokoui/item';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'kanpos_setup_checklist_dismissed_v1';

/** Sekali ditutup, kartu tidak muncul lagi di device ini. */
function isDismissed(): boolean {
  return localStorage.getItem(DISMISS_KEY) === '1';
}

/**
 * Kartu "Siapkan toko" di beranda — pengganti slide tutorial onboarding.
 *
 * Slide tutorial mengajar sebelum user punya konteks, dan hampir selalu
 * di-skip. Checklist ini mengajar sambil user bekerja: tiap item adalah
 * langkah nyata yang menghasilkan data, dan kartunya menghilang sendiri
 * begitu keempatnya selesai.
 */
export function SetupChecklist() {
  const { t } = useTranslation('dashboard');
  const [dismissed, setDismissed] = useState(isDismissed);

  const stats = useLiveQuery(async () => {
    const [products, transactions, settings] = await Promise.all([
      db.products.where('isDeleted').equals(0).count(),
      db.transactions.where('status').equals('completed').count(),
      db.storeSettings.toCollection().first(),
    ]);
    return {
      hasProduct: products > 0,
      hasTransaction: transactions > 0,
      hasBackup: !!(settings?.lastBackupAt || settings?.lastCloudBackupAt),
    };
  }, []);

  if (dismissed || !stats) return null;

  const items = [
    { key: 'store', done: true, to: null },
    { key: 'product', done: stats.hasProduct, to: '/products' },
    { key: 'transaction', done: stats.hasTransaction, to: '/cashier' },
    { key: 'backup', done: stats.hasBackup, to: '/settings/backup' },
  ] as const;

  const doneCount = items.filter(i => i.done).length;
  // Tugas beres — kartu sudah selesai tugasnya juga.
  if (doneCount === items.length) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <Card>
      <CardContent>
      <div className="flex items-start gap-3">
        <ItemMedia tone="primary"><ListChecks /></ItemMedia>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('setup.title')}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {t('setup.progress', { done: doneCount, total: items.length })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          aria-label={t('setup.dismiss')}
          className="-mr-1.5 -mt-1 text-muted-foreground"
        >
          <X />
        </Button>
      </div>

      <Progress value={doneCount} max={items.length} className="my-3.5 h-1.5" />

      <div className="space-y-1.5">
        {items.map(item => {
          const row = (
            <div
              className={cn(
                'flex h-11 items-center gap-2.5 rounded-lg px-2.5',
                item.done ? 'bg-transparent' : 'bg-muted/50 transition-colors hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors',
                  item.done ? 'border-success bg-success' : 'border-input',
                )}
              >
                {item.done && <Check className="h-3 w-3 text-success-foreground" />}
              </span>
              <span
                className={cn(
                  'flex-1 text-[13px] font-medium',
                  item.done && 'text-muted-foreground line-through decoration-muted-foreground/40',
                )}
              >
                {t(`setup.items.${item.key}`)}
              </span>
              {!item.done && item.to && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          );

          if (item.done || !item.to) return <div key={item.key}>{row}</div>;
          return (
            <Link key={item.key} to={item.to} className="block transition-transform active:scale-[0.99]">
              {row}
            </Link>
          );
        })}
      </div>
      </CardContent>
    </Card>
  );
}
