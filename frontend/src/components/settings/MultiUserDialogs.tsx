import { useState } from 'react';
import { db } from '@/lib/db';
import { buttonVariants } from '@/components/jokoui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface DisableProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId?: number;
}

export function MultiUserDisableDialog({ open, onOpenChange, storeId }: DisableProps) {
  const { t } = useTranslation('settings');

  const handleDisable = async () => {
    if (!storeId) return;
    await db.storeSettings.update(storeId, { multiUserEnabled: false });
    onOpenChange(false);
    toast.success(t('toast.multiUserDisabled'));
    window.location.reload();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[90vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('employees.disableDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('employees.disableDialog.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common:common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDisable} className={buttonVariants({ variant: 'destructive' })}>
            {t('employees.disableDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface LogoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function LogoutDialog({ open, onOpenChange, onConfirm }: LogoutProps) {
  const { t } = useTranslation('settings');
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[90vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('employees.logoutDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('employees.logoutDialog.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common:common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={buttonVariants({ variant: 'destructive' })}>
            {t('employees.logoutDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
