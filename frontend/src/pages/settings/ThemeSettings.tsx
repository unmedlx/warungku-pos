import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Palette, Sun, Moon, Monitor, type IconComponent } from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import ThemeColorPicker from '@/components/ThemeColorPicker';
import { PageHeader } from '@/components/jokoui/page-header';
import { Tabs, TabsList, TabsTrigger } from '@/components/jokoui/tabs';
import { setThemeColor, setTheme, useTheme, type ThemeMode } from '@/hooks/use-theme-color';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';

const MODES: { value: ThemeMode; icon: IconComponent; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'light' },
  { value: 'dark', icon: Moon, labelKey: 'dark' },
  { value: 'system', icon: Monitor, labelKey: 'system' },
];

export default function ThemeSettings() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const currentTheme = useTheme();

  if (!can('manage_store_settings')) {
    return <LockedPage title={t('masterData.theme.title')} permissionLabel={t('masterData.theme.permissionLabel')} />;
  }

  return (
    <div className="page-container">
      <PageHeader icon={Palette} title={t('masterData.theme.title')} backTo="/settings" />

      <Card>
        <CardContent className="space-y-5 p-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('masterData.theme.mode')}</h3>
            <Tabs variant="pill" value={currentTheme} onValueChange={value => setTheme(value as ThemeMode)}>
              <TabsList className="w-full">
                {MODES.map(({ value, icon: Icon, labelKey }) => (
                  <TabsTrigger key={value} value={value} className="flex-1 gap-1.5">
                    <Icon className="h-4 w-4" />
                    {t(`masterData.theme.${labelKey}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('masterData.theme.color')}</h3>
            <ThemeColorPicker
              value={storeSettings?.themeColor ?? '243'}
              onChange={hue => setThemeColor(hue)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
