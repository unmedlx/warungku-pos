import { useEffect, useState } from 'react';
import { Bell, CloudUpload, CreditCard, Megaphone } from '@/components/icons';
import { Button } from '@/components/jokoui/button';
import { Modal, ModalTitle, ModalDescription } from '@/components/jokoui/modal';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { isPushSupported, getPermissionState, requestPushPermission, checkPushPermissionNative } from '@/lib/onesignal';
import { isNativePlatform } from '@/lib/printer';
import { useTranslation } from 'react-i18next';

const ASKED_KEY = 'freekasir_push_asked_v1';

export default function PushPermissionModal() {
  const { t } = useTranslation('settings');
  const { isLoggedIn } = useCloudAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!isPushSupported()) return;
    if (localStorage.getItem(ASKED_KEY)) return;

    let active = true;
    let timer: NodeJS.Timeout | undefined;

    const checkPermission = async () => {
      if (isNativePlatform()) {
        const hasPermission = await checkPushPermissionNative();
        if (hasPermission) return;
      } else {
        if (getPermissionState() !== 'default') return;
      }

      if (active) {
        timer = setTimeout(() => setOpen(true), 800);
      }
    };

    checkPermission();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [isLoggedIn]);

  const dismiss = () => {
    localStorage.setItem(ASKED_KEY, '1');
    setOpen(false);
  };

  const enable = () => {
    localStorage.setItem(ASKED_KEY, '1');
    requestPushPermission();
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={dismiss} className="max-w-sm space-y-4">
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <ModalTitle>{t('pushPermission.title')}</ModalTitle>
        <ModalDescription className="leading-relaxed">{t('pushPermission.description')}</ModalDescription>
      </div>

      <div className="space-y-2.5">
        <Benefit icon={<CloudUpload className="h-4 w-4" />} text={t('pushPermission.benefits.cloudBackup')} />
        <Benefit icon={<CreditCard className="h-4 w-4" />} text={t('pushPermission.benefits.payment')} />
        <Benefit icon={<Megaphone className="h-4 w-4" />} text={t('pushPermission.benefits.announcement')} />
      </div>

      <div className="space-y-2 pt-1">
        <Button size="xl" className="w-full" onClick={enable}>
          <Bell /> {t('pushPermission.enable')}
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={dismiss}>
          {t('pushPermission.later')}
        </Button>
      </div>

      <p className="text-center text-2xs text-muted-foreground">{t('pushPermission.hint')}</p>
    </Modal>
  );
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <p className="text-xsm text-foreground leading-snug pt-1.5">{text}</p>
    </div>
  );
}
