import { useEffect, useState } from 'react';
import { Bell, CloudUpload, CreditCard, Megaphone } from '@/components/icons';
import { Button } from '@/components/jokoui/button';
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={dismiss}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-lg space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold">{t('pushPermission.title')}</h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {t('pushPermission.description')}
          </p>
        </div>

        <div className="space-y-2.5">
          <Benefit icon={<CloudUpload className="w-4 h-4" />} text={t('pushPermission.benefits.cloudBackup')} />
          <Benefit icon={<CreditCard className="w-4 h-4" />} text={t('pushPermission.benefits.payment')} />
          <Benefit icon={<Megaphone className="w-4 h-4" />} text={t('pushPermission.benefits.announcement')} />
        </div>

        <div className="space-y-2 pt-1">
          <Button size="xl" className="w-full" onClick={enable}>
            <Bell /> {t('pushPermission.enable')}
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={dismiss}>
            {t('pushPermission.later')}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          {t('pushPermission.hint')}
        </p>
      </div>
    </div>
  );
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <p className="text-[13px] text-foreground leading-snug pt-1.5">{text}</p>
    </div>
  );
}
