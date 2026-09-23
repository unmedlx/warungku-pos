import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, LayoutGrid, Palette, Printer, Receipt, X } from '@/components/icons';
import { PageHeader } from '@/components/jokoui/page-header';
import { SettingsGroup, SettingsItem } from '@/components/jokoui/settings-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TONE_CLASS } from '@/components/settings/SettingsTile';
import { useAuth } from '@/hooks/use-auth';
import {
  isNativePlatform, getDefaultBluetoothPrinter, setDefaultBluetoothPrinter,
  listPairedBluetoothDevices, type BluetoothPrinter,
} from '@/lib/printer';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const RowIcon = ({ icon: Icon }: { icon: typeof Receipt }) => (
  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS.amber}`}>
    <Icon className="size-4.5" />
  </div>
);

/** Sub-halaman "Struk & Tampilan" — struk, tema, layout kasir, printer. */
export default function DisplaySettings() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();
  const isNative = isNativePlatform();
  const canStore = can('manage_store_settings');

  const [cashierLayoutMode, setCashierLayoutModeState] = useState<'grid' | 'rows'>(() => {
    try {
      return (localStorage.getItem('kg_cashier_layout_mode') as 'grid' | 'rows') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleCashierLayoutModeChange = (val: 'grid' | 'rows') => {
    setCashierLayoutModeState(val);
    try {
      localStorage.setItem('kg_cashier_layout_mode', val);
      toast.success(t('toast.saveSuccess'));
    } catch {
      toast.error(t('common:common.error') || 'Gagal');
    }
  };

  // Printer Bluetooth (APK saja)
  const [defaultPrinter, setDefaultPrinter] = useState<BluetoothPrinter | null>(() => getDefaultBluetoothPrinter());
  const [pairedPrinters, setPairedPrinters] = useState<BluetoothPrinter[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const refreshPairedPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const devices = await listPairedBluetoothDevices();
      setPairedPrinters(devices);
      if (devices.length === 0) toast.error(t('toast.noPairedDevices'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.loadPrintersFailed'));
    } finally {
      setLoadingPrinters(false);
    }
  };

  const selectDefaultPrinter = (printer: BluetoothPrinter) => {
    setDefaultBluetoothPrinter(printer);
    setDefaultPrinter(printer);
    toast.success(t('toast.printerDefaultSet', { name: printer.name }));
  };

  const clearDefaultPrinter = () => {
    setDefaultBluetoothPrinter(null);
    setDefaultPrinter(null);
    toast.success(t('toast.printerDefaultCleared'));
  };

  return (
    <div className="page-container">
      <PageHeader backTo="/settings" title={t('hub.categories.display.label')} />

      <SettingsGroup title={t('receiptAndDisplay.sectionTitle')}>
        {canStore && (
          <Link to="/settings/receipt" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={Receipt} />}
              label={t('masterData.receiptFooter.title')}
              description={t('masterData.receiptFooter.description')}
              trailing={<ChevronRight className="h-4 w-4" />}
            />
          </Link>
        )}
        {canStore && (
          <Link to="/settings/theme" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={Palette} />}
              label={t('masterData.theme.title')}
              description={t('masterData.theme.description')}
              trailing={<ChevronRight className="h-4 w-4" />}
            />
          </Link>
        )}
        <SettingsItem
          icon={<RowIcon icon={LayoutGrid} />}
          label={t('masterData.cashierLayout.title')}
          description={t('masterData.cashierLayout.description')}
          trailing={
            <Select value={cashierLayoutMode} onValueChange={handleCashierLayoutModeChange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">{t('masterData.cashierLayout.grid')}</SelectItem>
                <SelectItem value="rows">{t('masterData.cashierLayout.rows')}</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </SettingsGroup>

      {isNative && canStore && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5">
              <Printer className="h-4 w-4 text-muted-foreground" /> {t('bluetoothPrinter.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">{t('bluetoothPrinter.default')}</p>
              {defaultPrinter ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{defaultPrinter.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{defaultPrinter.address}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" className="shrink-0 text-destructive-text" onClick={clearDefaultPrinter} aria-label={t('bluetoothPrinter.notSelected')}>
                    <X />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('bluetoothPrinter.notSelected')}</p>
              )}
            </div>

            <Button variant="outline" size="lg" className="w-full" onClick={refreshPairedPrinters} disabled={loadingPrinters}>
              <Printer /> {loadingPrinters ? t('bluetoothPrinter.searching') : t('bluetoothPrinter.search')}
            </Button>

            {pairedPrinters.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t('bluetoothPrinter.selectPrinter')}</p>
                {pairedPrinters.map(printer => {
                  const isSelected = defaultPrinter?.address === printer.address;
                  return (
                    <button
                      key={printer.address}
                      type="button"
                      onClick={() => selectDefaultPrinter(printer)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left shadow-xs transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/50'}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{printer.name || t('bluetoothPrinter.unnamed')}</p>
                        <p className="truncate text-xs text-muted-foreground">{printer.address}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs leading-snug text-muted-foreground">{t('bluetoothPrinter.hint')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
