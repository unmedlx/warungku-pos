import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/jokoui/button';
import { cn } from '@/lib/utils';
import {
  type WhatsNewFeature,
  markFeaturesSeen,
} from '@/lib/whats-new';
import { format } from 'date-fns';
import { id as idLocale, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';

const LOCALES: Record<string, Locale> = { id: idLocale, en: enUS, ms };

interface WhatsNewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  features: WhatsNewFeature[];
  /**
   * When true, ids of shown features are persisted as "seen" on dismiss.
   * Set to false when manually opened from Settings (read-only re-view).
   */
  markSeenOnClose?: boolean;
}

export default function WhatsNewModal({
  open,
  onOpenChange,
  features,
  markSeenOnClose = true,
}: WhatsNewModalProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const dateLocale = LOCALES[i18n.language] ?? idLocale;
  const [index, setIndex] = useState(0);

  // Reset to first slide whenever the modal is reopened or the list changes.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open, features]);

  if (features.length === 0) return null;

  const safeIndex = Math.min(index, features.length - 1);
  const current = features[safeIndex];
  const Icon = current.icon;
  const isLast = safeIndex === features.length - 1;
  const isFirst = safeIndex === 0;

  const handleClose = async () => {
    if (markSeenOnClose) {
      await markFeaturesSeen(features.map((f) => f.id));
    }
    onOpenChange(false);
  };

  const handleCta = async () => {
    if (!current.cta) return;
    if (markSeenOnClose) {
      await markFeaturesSeen(features.map((f) => f.id));
    }
    onOpenChange(false);
    if (current.cta.to.startsWith('http://') || current.cta.to.startsWith('https://')) {
      window.open(current.cta.to, '_blank', 'noopener,noreferrer');
    } else {
      navigate(current.cta.to);
    }
  };

  const next = () => {
    if (!isLast) setIndex((i) => i + 1);
  };
  const prev = () => {
    if (!isFirst) setIndex((i) => i - 1);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          // Treat outside-click and ESC as dismissal too — mark as seen.
          void handleClose();
        } else {
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="max-w-[95vw] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('whatsNew.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Slide content */}
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-xl',
                current.iconColor,
              )}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {format(new Date(current.publishedAt), 'd MMMM yyyy', { locale: dateLocale })}
              </p>
              <h3 className="text-lg font-semibold tracking-tight">{t(`whatsNewFeatures.${current.id}.title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`whatsNewFeatures.${current.id}.description`)}
              </p>
            </div>
          </div>

          {/* Pagination dots */}
          {features.length > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {features.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setIndex(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === safeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/25',
                  )}
                  aria-label={t('whatsNew.slide', { number: i + 1 })}
                />
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2 pt-1">
            {features.length > 1 && (
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={prev}
                disabled={isFirst}
              >
                <ChevronLeft />
              </Button>
            )}

            {current.cta ? (
              <Button onClick={handleCta} className="flex-1">
                {t(`whatsNewFeatures.${current.id}.ctaLabel`)}
              </Button>
            ) : isLast ? (
              <Button onClick={handleClose} className="flex-1">
                {t('whatsNew.finish')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={handleClose}
                className="flex-1 text-muted-foreground"
              >
                {t('whatsNew.skip')}
              </Button>
            )}

            {features.length > 1 && (
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={isLast ? handleClose : next}
              >
                <ChevronRight />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
