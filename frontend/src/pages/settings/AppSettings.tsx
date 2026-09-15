import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/lib/db';
import { ChevronRight, Globe, HardDrive, Send, Sparkles } from '@/components/icons';
import { PageHeader } from '@/components/jokoui/page-header';
import { SettingsGroup, SettingsItem } from '@/components/jokoui/settings-group';
import { TONE_CLASS } from '@/components/settings/SettingsTile';
import { Badge } from '@/components/jokoui/badge';
import { Card } from '@/components/jokoui/card';
import { SectionTitle } from '@/components/jokoui/section-title';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import WhatsNewModal from '@/components/WhatsNewModal';
import { FEATURES, getUnseenFeatures } from '@/lib/whats-new';
import { APP_VERSION } from '@/lib/app-version';
import { useTranslation } from 'react-i18next';
import AppUpdateRows from '@/components/app-update/AppUpdateRows';

const RowIcon = ({ icon: Icon }: { icon: typeof Globe }) => (
  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS.gray}`}>
    <Icon className="h-[18px] w-[18px]" />
  </div>
);

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/** Sub-halaman "Aplikasi" — bahasa, catatan rilis, bantuan, info versi. */
export default function AppSettings() {
  const { t } = useTranslation('settings');
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(est => {
        setStorageUsage({ usage: est.usage ?? 0, quota: est.quota ?? 0 });
      });
    }
  }, []);

  const unseenFeatures = useMemo(
    () => getUnseenFeatures(storeSettings?.seenWhatsNewIds),
    [storeSettings?.seenWhatsNewIds],
  );

  const usedPercent = storageUsage && storageUsage.quota > 0
    ? Math.min(100, (storageUsage.usage / storageUsage.quota) * 100)
    : 0;

  return (
    <div className="page-container">
      <PageHeader backTo="/settings" title={t('hub.categories.app.label')} />

      <SettingsGroup>
        <SettingsItem
          icon={<RowIcon icon={Globe} />}
          label={t('language.title')}
          trailing={<LanguageSwitcher />}
        />
        <SettingsItem
          interactive
          onClick={() => setWhatsNewOpen(true)}
          icon={<RowIcon icon={Sparkles} />}
          label={t('about.whatsNew')}
          description={t('about.version', { version: APP_VERSION })}
          trailing={
            <>
              {unseenFeatures.length > 0 && (
                <Badge variant="primary" size="sm" shape="pill">
                  {unseenFeatures.length}
                </Badge>
              )}
              <ChevronRight className="h-4 w-4" />
            </>
          }
        />
        <AppUpdateRows />
        <Link to="/settings/report-issue" className="block">
          <SettingsItem
            interactive
            icon={<RowIcon icon={Send} />}
            label={t('masterData.reportIssue.title')}
            description={t('masterData.reportIssue.description')}
            trailing={<ChevronRight className="h-4 w-4" />}
          />
        </Link>
      </SettingsGroup>

      {storageUsage && (
        <section className="mb-4">
          <SectionTitle title={t('about.storageUsed')} />
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS.gray}`}>
                <HardDrive className="h-[18px] w-[18px]" />
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatBytes(storageUsage.usage)} / {formatBytes(storageUsage.quota)}
              </p>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${usedPercent}%` }} />
            </div>
          </Card>
        </section>
      )}

      <WhatsNewModal open={whatsNewOpen} onOpenChange={setWhatsNewOpen} features={FEATURES} markSeenOnClose={false} />
    </div>
  );
}
