import type { ReactNode } from 'react';
import { ChevronRight } from '@/components/icons';
import type { IconComponent } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert';

/**
 * Baris peringatan di Beranda untuk kejadian yang bikin rugi diam-diam.
 * Kini = Alert Shark (bg 4% + border 32% + ikon berwarna) dengan chevron
 * sebagai aksi; seluruh baris bisa ditekan.
 */
export interface AlertStripProps {
  icon: IconComponent;
  title: ReactNode;
  description?: ReactNode;
  tone?: 'warning' | 'destructive' | 'info' | 'success';
  onClick?: () => void;
  className?: string;
}

export function AlertStrip({ icon: Icon, title, description, tone = 'warning', onClick, className }: AlertStripProps) {
  const content = (
    <Alert variant={tone} className={cn(onClick && 'transition-colors hover:bg-muted/40', className)}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription className="truncate">{description}</AlertDescription>}
      {onClick && (
        <AlertAction>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </AlertAction>
      )}
    </Alert>
  );

  if (!onClick) return content;

  return (
    <button type="button" onClick={onClick} className="block w-full rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 active:scale-[0.995]">
      {content}
    </button>
  );
}
