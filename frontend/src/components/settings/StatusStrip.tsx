import { ChevronRight, type IconComponent } from '@/components/icons';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { Badge } from '@/components/jokoui/badge';
import { Link } from 'react-router-dom';

export type StatusTone = 'ok' | 'warn' | 'danger';

const TONE: Record<StatusTone, 'success' | 'warning' | 'destructive'> = {
  ok: 'success',
  warn: 'warning',
  danger: 'destructive',
};

interface StatusStripProps {
  to: string;
  tone: StatusTone;
  icon: IconComponent;
  title: string;
  badge?: string;
  description: string;
  /** Baris ketiga opsional, mis. waktu sinkron terakhir. */
  meta?: string;
}

/**
 * Strip status di atas hub — Alert berwarna sesuai kondisi (cloud sync) yang
 * seluruhnya bisa diketuk. Hanya menampilkan hal yang benar-benar punya
 * kondisi, menggantikan kartu besar + banner yang dulu selalu tampil.
 */
export function StatusStrip({ to, tone, icon: Icon, title, badge, description, meta }: StatusStripProps) {
  const variant = TONE[tone];
  return (
    <Link
      to={to}
      className="block rounded-xl outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/30 active:scale-[0.995]"
    >
      <Alert variant={variant}>
        <Icon />
        <AlertTitle className="flex items-center gap-1.5">
          <span className="truncate">{title}</span>
          {badge && (
            <Badge variant={variant} size="sm">
              {badge}
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription>
          {description}
          {meta && <span className="block text-xs text-muted-foreground/80">{meta}</span>}
        </AlertDescription>
        <AlertAction>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </AlertAction>
      </Alert>
    </Link>
  );
}
