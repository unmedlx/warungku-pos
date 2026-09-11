import { Pencil } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/jokoui/avatar';
import { Badge } from '@/components/jokoui/badge';
import { Button } from '@/components/jokoui/button';
import { Card } from '@/components/jokoui/card';
import { useTranslation } from 'react-i18next';

interface StoreIdentityCardProps {
  name: string;
  address: string;
  logo?: string;
  chips: string[];
  /** Tanpa handler, kartu tampil sebagai info saja (karyawan tanpa izin). */
  onEdit?: () => void;
}

/** Inisial toko (maks. 2 huruf) untuk avatar tanpa logo. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Kartu identitas toko di hub: avatar bulat 56px (logo atau inisial),
 * nama + alamat + chip ringkasan, dan tombol ikon edit di kanan.
 * Dibuat horizontal & ringkas supaya hub tidak kehilangan sifat ringkasnya.
 */
export function StoreIdentityCard({ name, address, logo, chips, onEdit }: StoreIdentityCardProps) {
  const { t } = useTranslation('settings');

  return (
    <Card className="flex items-center gap-3 p-3">
      <Avatar tone="brand" className="h-14 w-14 text-base">
        {logo ? <AvatarImage src={logo} alt="" /> : <AvatarFallback>{initials(name) || '?'}</AvatarFallback>}
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-tight">{name}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{address}</p>
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {chips.map(c => (
              <Badge key={c} variant="outline" size="sm">
                {c}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {onEdit && (
        <Button variant="ghost" size="icon-sm" className="shrink-0 self-start" onClick={onEdit} aria-label={t('hub.editStore')}>
          <Pencil />
        </Button>
      )}
    </Card>
  );
}
