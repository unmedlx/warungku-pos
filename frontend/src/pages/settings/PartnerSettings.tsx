import { Link } from 'react-router-dom';
import { ChevronRight, Truck, Users as UsersIcon } from '@/components/icons';
import { PageHeader } from '@/components/jokoui/page-header';
import { SettingsGroup, SettingsItem } from '@/components/jokoui/settings-group';
import { TONE_CLASS } from '@/components/settings/SettingsTile';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';

const RowIcon = ({ icon: Icon }: { icon: typeof Truck }) => (
  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS.green}`}>
    <Icon className="h-[18px] w-[18px]" />
  </div>
);

/** Sub-halaman "Mitra" — supplier & pelanggan. */
export default function PartnerSettings() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();

  const canSupplier = can('manage_supplier');
  const canCustomers = can('manage_customers');
  if (!canSupplier && !canCustomers) {
    return <LockedPage title={t('hub.categories.partners.label')} />;
  }

  return (
    <div className="page-container">
      <PageHeader backTo="/settings" title={t('hub.categories.partners.label')} />
      <SettingsGroup>
        {canSupplier && (
          <Link to="/supplier" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={Truck} />}
              label={t('transactionsAndStock.supplier.title')}
              description={t('transactionsAndStock.supplier.description')}
              trailing={<ChevronRight className="h-4 w-4" />}
            />
          </Link>
        )}
        {canCustomers && (
          <Link to="/customers" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={UsersIcon} />}
              label={t('transactionsAndStock.customers.title')}
              description={t('transactionsAndStock.customers.description')}
              trailing={<ChevronRight className="h-4 w-4" />}
            />
          </Link>
        )}
      </SettingsGroup>
    </div>
  );
}
