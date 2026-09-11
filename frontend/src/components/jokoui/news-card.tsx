import * as React from 'react';
import { X, Info } from '@/components/icons';

import { cn } from '@/lib/utils';
import { Alert, AlertAction, AlertContent, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';

interface NewsCardProps {
  imageSrc?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  ctaLabel?: React.ReactNode;
  onCtaClick?: () => void;
  onDismiss?: () => void;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Kartu pengumuman/promo. Dulu blok biru solid dengan gelembung dekoratif;
 * sekarang = Alert Shark varian info (bg info/4, border info/32) dengan
 * tombol aksi kecil dan × untuk menutup. Lebih tenang, tidak berebut
 * perhatian dengan angka penjualan.
 */
const NewsCard = React.forwardRef<HTMLDivElement, NewsCardProps>(
  ({ title, description, ctaLabel, onCtaClick, onDismiss, onClick, className, children }, ref) => (
    <Alert ref={ref} variant="info" onClick={onClick} className={cn(onClick && 'cursor-pointer', className)}>
      <Info />
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
      {(ctaLabel || children) && (
        <AlertContent className="flex flex-wrap items-center gap-2">
          {ctaLabel && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCtaClick?.();
              }}
            >
              {ctaLabel}
            </Button>
          )}
          {children}
        </AlertContent>
      )}
      {onDismiss && (
        <AlertAction className="self-start">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Tutup"
            className="-mr-1.5 -mt-1 h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </AlertAction>
      )}
    </Alert>
  ),
);
NewsCard.displayName = 'NewsCard';

export { NewsCard };
