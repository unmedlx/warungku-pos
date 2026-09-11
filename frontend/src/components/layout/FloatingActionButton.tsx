import { ShoppingCart } from '@/components/icons';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';

export default function FloatingActionButton() {
  const { can } = useAuth();
  const { t } = useTranslation('common');

  if (!can('create_transaction')) {
    return null;
  }

  return (
    <Link
      to="/cashier"
      aria-label={t('nav.cashier')}
      className={cn(
        'fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-primary transition-transform active:scale-95 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30'
      )}
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
    >
      <ShoppingCart className="h-6 w-6" />
    </Link>
  );
}
