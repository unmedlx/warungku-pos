import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Receipt, Save } from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Switch } from '@/components/jokoui/switch';
import { SectionTitle } from '@/components/jokoui/section-title';
import { SettingsGroup, SettingsItem } from '@/components/jokoui/settings-group';
import { PageHeader } from '@/components/jokoui/page-header';
import { useAuth } from '@/hooks/use-auth';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import LockedPage from '@/components/LockedPage';
import { toast } from 'sonner';

export default function ReceiptSettings() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const { isLoggedIn: cloudLoggedIn, isSyncSubscribed: cloudSubscribed } = useCloudAuth();
  const [footerText, setFooterText] = useState('');
  const [printLogo, setPrintLogo] = useState(false);
  const [hideWatermark, setHideWatermark] = useState(false);

  const isCloudActive = cloudLoggedIn && cloudSubscribed && !!storeSettings?.cloudStoreId;

  // Sync state with db loaded value
  useEffect(() => {
    if (storeSettings) {
      setFooterText(storeSettings.receiptFooter ?? '');
      setPrintLogo(storeSettings.printLogo ?? false);
      setHideWatermark(storeSettings.hideWatermark ?? false);
    }
  }, [storeSettings]);

  if (!can('manage_store_settings')) {
    return <LockedPage title={t('receiptSettings.title')} permissionLabel={t('masterData.theme.permissionLabel')} />;
  }

  const handleSave = async () => {
    if (!storeSettings?.id) return;
    try {
      await db.storeSettings.update(storeSettings.id, {
        receiptFooter: footerText.trim(),
        printLogo,
        hideWatermark: hideWatermark && isCloudActive,
      });
      toast.success(t('receiptSettings.saveSuccess'));
    } catch {
      toast.error(t('receiptSettings.saveFailed'));
    }
  };

  return (
    <div className="page-container mx-auto max-w-md space-y-4">
      <PageHeader icon={Receipt} title={t('receiptSettings.title')} backTo="/settings" />

      {/* Saklar tampilan struk */}
      <SettingsGroup className="mb-0">
        <SettingsItem
          label={<label htmlFor="print-logo-switch" className="cursor-pointer">{t('receiptSettings.printLogoLabel')}</label>}
          description={t('receiptSettings.printLogoDescription')}
          trailing={<Switch id="print-logo-switch" checked={printLogo} onCheckedChange={setPrintLogo} />}
        />
        <SettingsItem
          className={!isCloudActive ? 'opacity-70' : undefined}
          label={<label htmlFor="hide-watermark-switch" className="cursor-pointer">{t('receiptSettings.hideWatermarkLabel')}</label>}
          description={
            isCloudActive
              ? t('receiptSettings.hideWatermarkDescActive')
              : t('receiptSettings.hideWatermarkDescRequired')
          }
          trailing={
            <Switch
              id="hide-watermark-switch"
              checked={hideWatermark && isCloudActive}
              disabled={!isCloudActive}
              onCheckedChange={setHideWatermark}
            />
          }
        />
      </SettingsGroup>

      {/* Teks kaki struk */}
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="receipt-footer-input">{t('receiptSettings.footerLabel')}</Label>
            <Input
              id="receipt-footer-input"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder={t('receipt.footerFallback')}
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground">{t('masterData.receiptFooter.description')}</p>
          </div>

          <Button size="xl" className="w-full" onClick={handleSave}>
            <Save />
            {t('common:common.save')}
          </Button>
        </CardContent>
      </Card>

      {/* Pratinjau langsung */}
      <div>
        <SectionTitle title="Preview Struk" />
        <Card className="border-dashed">
          <CardContent className="space-y-4 p-6 font-mono text-[11px] text-foreground">

            {/* Logo Preview */}
            {printLogo && storeSettings?.logo && (
              <div className="mb-2 flex justify-center">
                <img
                  src={storeSettings.logo}
                  alt="Store Logo"
                  className="h-12 w-12 object-contain grayscale contrast-125"
                />
              </div>
            )}

            <div className="space-y-1 text-center text-muted-foreground">
              <p className="text-xs font-semibold">TOKO MAJU JAYA</p>
              <p>Tangerang</p>
              <p>081208120812</p>
            </div>

            <div className="border-t border-dashed border-border" />

            <div className="space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Nasi Goreng Spesial</span>
                <span>Rp 15.000</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>TOTAL</span>
                <span>Rp 15.000</span>
              </div>
            </div>

            <div className="border-t border-dashed border-border" />

            {/* Real-time footer preview */}
            <div className="break-words px-4 py-2 pb-1 text-center font-semibold text-foreground transition-all">
              {footerText.trim() || t('receipt.footerFallback')}
            </div>

            {/* Watermark preview */}
            {!(hideWatermark && isCloudActive) && (
              <div className="space-y-0.5 border-t border-dotted border-border pt-2 text-center text-[11px] text-muted-foreground">
                <p>Dicetak Dari Aplikasi</p>
                <p className="font-semibold">KanPOS.com</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
