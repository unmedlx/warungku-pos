import { useState } from 'react';
import { Search, ScanBarcode, Check, X, Package as PackageIcon } from '@/components/icons';
import { Input } from '@/components/jokoui/input';
import { Button } from '@/components/jokoui/button';
import { toast } from 'sonner';
import type { Product } from '@/lib/db';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useTranslation } from 'react-i18next';

const NUMBER_LOCALES: Record<string, string> = {
  id: 'id-ID',
  en: 'en-US',
  ms: 'id-ID',
};

interface ProductPickerProps {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
  filter?: (p: Product) => boolean;
  placeholder?: string;
  showHpp?: boolean;
}

export default function ProductPicker({
  products,
  value,
  onChange,
  filter,
  placeholder,
  showHpp = false,
}: ProductPickerProps) {
  const { t, i18n } = useTranslation('settings');
  const numberLocale = NUMBER_LOCALES[i18n.language] || 'id-ID';
  const [query, setQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const available = filter ? products.filter(filter) : products;
  const selected = products.find(p => p.id === Number(value));

  const q = query.trim().toLowerCase();
  const matches = available.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.sku?.toLowerCase().includes(q) ||
    p.barcode?.toLowerCase().includes(q)
  );

  const handleScan = (code: string) => {
    setScannerOpen(false);
    const product = available.find(p => p.sku === code || p.barcode === code);
    if (product) {
      onChange(product.id!.toString());
      setQuery('');
    } else {
      toast.error(t('productPicker.skuBarcodeNotFound', { code }));
    }
  };

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{selected.name}</p>
          <p className="text-xs text-muted-foreground">
            {selected.sku}
            {selected.barcode ? ` · ${selected.barcode}` : ''} · {t('productPicker.stockLabel')} {selected.stock} {selected.unit}
          </p>
          {showHpp && (
            <p className="text-xs text-muted-foreground">
              {t('productPicker.hppLabel')} Rp {selected.hpp.toLocaleString(numberLocale)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => { onChange(''); setQuery(''); }}
        >
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={placeholder ?? t('productPicker.placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="button" variant="outline" size="icon" aria-label="Scan barcode" onClick={() => setScannerOpen(true)}>
          <ScanBarcode />
        </Button>
      </div>

      {q && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
          {matches.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><PackageIcon className="h-5 w-5" /></span>
              <p className="text-[13px] text-muted-foreground">{t('productPicker.notFound')}</p>
            </div>
          ) : (
            matches.map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() => { onChange(p.id!.toString()); setQuery(''); }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-accent active:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.sku}{p.barcode ? ` · ${p.barcode}` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{t('productPicker.stockLabel')} {p.stock}</span>
              </button>
            ))
          )}
        </div>
      )}

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
    </div>
  );
}
