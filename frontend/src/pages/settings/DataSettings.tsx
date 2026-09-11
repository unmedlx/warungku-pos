import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardCheck, Cloud, Download } from '@/components/icons';
import { PageHeader } from '@/components/jokoui/page-header';
import { SettingsGroup, SettingsItem } from '@/components/jokoui/settings-group';
import { TONE_CLASS } from '@/components/settings/SettingsTile';
import { StatusStrip } from '@/components/settings/StatusStrip';
import { useCloudStatus } from '@/hooks/use-cloud-status';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';

const RowIcon = ({ icon: Icon }: { icon: typeof Download }) => (
  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS.red}`}>
    <Icon className="h-[18px] w-[18px]" />
  </div>
);

/** Sub-halaman "Data & Backup" — cloud, backup lokal, stock opname. */
export default function DataSettings() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();
  const cloud = useCloudStatus();

  const canBackup = can('manage_backup');
  const canStock = can('manage_stock_inout');
  if (!canBackup && !canStock) {
    return <LockedPage title={t('hub.categories.data.label')} permissionLabel={t('cloudBackup.locked.permissionLabel')} />;
  }

  return (
    <div className="page-container">
      <PageHeader backTo="/settings" title={t('hub.categories.data.label')} />

      {canBackup && (
        <div className="mb-4">
          <StatusStrip
            to="/settings/cloud-backup"
            tone={cloud.tone}
            icon={Cloud}
            title={t('cloudSync.title')}
            badge={cloud.badge}
            description={cloud.shortDescription}
            meta={cloud.meta}
          />
        </div>
      )}

      <SettingsGroup title={t('dataAndBackup.sectionTitle')}>
        {canBackup && (
          <Link to="/settings/backup" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={Download} />}
              label={t('masterData.backup.title')}
              description={t('masterData.backup.description')}
              trailing={<ChevronRight className="h-4 w-4" />}
            />
          </Link>
        )}
        {canStock && (
          <Link to="/settings/stock-opname" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={ClipboardCheck} />}
              label={t('stockOpname.title')}
              description={t('masterData.stockOpname.description')}
              trailing={<ChevronRight className="h-4 w-4" />}
            />
          </Link>
        )}
      </SettingsGroup>
    </div>
  );
}
