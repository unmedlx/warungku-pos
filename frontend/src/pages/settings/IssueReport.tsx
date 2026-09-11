import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, ShieldCheck } from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { PageHeader } from '@/components/jokoui/page-header';
import { Textarea } from '@/components/jokoui/textarea';
import { Label } from '@/components/jokoui/label';
import { Alert, AlertDescription } from '@/components/jokoui/alert';
import { toast } from 'sonner';
import { APP_VERSION } from '@/lib/app-version';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function IssueReport() {
  const { t } = useTranslation('settings');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      url: window.location.href,
      time: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      appVersion: APP_VERSION,
    };
  };

  const handleSend = async () => {
    if (!description.trim()) {
      toast.error(t('issueReport.emptyError'));
      return;
    }
    setShowConfirm(true);
  };

  const submitReport = async () => {
    setBusy(true);
    try {
      const response = await fetch('https://external-api.freekasir.com/webhook/issue-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error_log: description.trim(),
          device_info: getDeviceInfo(),
        }),
      });

      if (response.ok) {
        toast.success(t('issueReport.success'));
        setDescription('');
        setShowConfirm(false);
      } else {
        toast.error(t('issueReport.failed'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('issueReport.networkError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-container mx-auto max-w-md">
      <PageHeader icon={Send} title={t('issueReport.title')} backTo="/settings" />

      {/* Editor Card */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="issue-description-input">
              {t('issueReport.descriptionLabel')}
            </Label>
            <Textarea
              id="issue-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('issueReport.placeholder')}
              className="min-h-[150px] leading-relaxed"
              maxLength={2000}
            />
          </div>

          <Alert variant="info">
            <ShieldCheck />
            <AlertDescription>{t('issueReport.disclaimer')}</AlertDescription>
          </Alert>

          <Button size="xl" className="w-full" onClick={handleSend} disabled={busy}>
            <Send />
            {t('issueReport.submit')}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('issueReport.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {t('issueReport.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 flex-row justify-end gap-2">
            <AlertDialogCancel disabled={busy} className="mt-0">{t('issueReport.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submitReport();
              }}
              disabled={busy}
            >
              {busy ? t('issueReport.sending') : t('issueReport.agreeAndSend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
