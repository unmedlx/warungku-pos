import React, { useEffect, useRef, useState } from 'react';
import { db, type StoreSettings } from '@/lib/db';
import { Camera, X } from '@/components/icons';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compressImage } from '@/lib/image-utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface StoreProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeSettings?: StoreSettings;
}

/**
 * Dialog "Info Toko" — sebelumnya inline di `Settings.tsx`. Diekstrak supaya
 * hub tetap ringkas dan dialog yang sama bisa dibuka dari sub-halaman Toko.
 */
export function StoreProfileDialog({ open, onOpenChange, storeSettings }: StoreProfileDialogProps) {
  const { t } = useTranslation('settings');
  const [storeName, setStoreName] = useState('');
  const [storeAddr, setStoreAddr] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeLogo, setStoreLogo] = useState<string | undefined>(undefined);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Isi ulang form tiap kali dialog dibuka agar tidak menampilkan draft basi.
  useEffect(() => {
    if (!open) return;
    setStoreName(storeSettings?.storeName ?? '');
    setStoreAddr(storeSettings?.address ?? '');
    setStorePhone(storeSettings?.phone ?? '');
    setStoreLogo(storeSettings?.logo);
  }, [open, storeSettings]);

  const saveStore = async () => {
    if (!storeSettings?.id) return;
    await db.storeSettings.update(storeSettings.id, {
      storeName: storeName.trim(),
      address: storeAddr.trim(),
      phone: storePhone.trim(),
      logo: storeLogo || undefined,
    });
    toast.success(t('storeDialog.saveSuccess'));
    onOpenChange(false);
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.invalidImage'));
      return;
    }
    try {
      setStoreLogo(await compressImage(file));
    } catch {
      toast.error(t('toast.processImageFailed'));
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw]">
        <DialogHeader><DialogTitle>{t('storeDialog.title')}</DialogTitle></DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label>{t('storeDialog.logoLabel')}</Label>
            <div className="flex items-center gap-3">
              <div
                className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-input bg-transparent transition-colors hover:border-primary/50"
                onClick={() => logoInputRef.current?.click()}
              >
                {storeLogo ? (
                  <img src={storeLogo} alt={t('storeDialog.logoPreviewAlt')} className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                  <Camera />
                  {storeLogo ? t('storeDialog.logoChange') : t('storeDialog.logoSelect')}
                </Button>
                {storeLogo && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive-text" onClick={() => setStoreLogo(undefined)}>
                    <X />
                    {t('storeDialog.logoRemove')}
                  </Button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
            </div>
          </div>
          <div className="space-y-1.5"><Label>{t('storeDialog.storeName')}</Label><Input value={storeName} onChange={e => setStoreName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('storeDialog.address')}</Label><Input value={storeAddr} onChange={e => setStoreAddr(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('storeDialog.phone')}</Label><Input value={storePhone} onChange={e => setStorePhone(e.target.value)} type="tel" /></div>
          <Button size="xl" className="w-full" onClick={saveStore}>{t('common:common.save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
