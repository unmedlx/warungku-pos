import { cn } from '@/lib/utils';

/**
 * Tombol kirim pesan WhatsApp dengan teks yang sudah tersusun.
 *
 * Warung menagih lewat WhatsApp, bukan email. Menyusun kalimatnya otomatis
 * menghilangkan hambatan sosial "canggung menagih" — hambatan nyata yang
 * membuat kasbon menumpuk meskipun datanya sudah tercatat rapi.
 */
export interface WhatsAppActionProps {
  /** Nomor tujuan, format bebas (spasi, tanda hubung, 0/62 di depan). */
  phone: string;
  message: string;
  label: string;
  variant?: 'solid' | 'soft';
  className?: string;
  disabled?: boolean;
}

/** Normalkan nomor Indonesia ke format internasional tanpa tanda baca. */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.02h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 5.82 2.42 8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.55-.43h-.47c-.16 0-.43.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.71 2.61 4.15 3.66.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.47-.28z" />
    </svg>
  );
}

export function WhatsAppAction({
  phone,
  message,
  label,
  variant = 'soft',
  className,
  disabled,
}: WhatsAppActionProps) {
  const number = toWhatsAppNumber(phone);
  const unavailable = disabled || !number;

  const open = () => {
    if (!number) return;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={unavailable}
      title={unavailable ? 'Nomor WhatsApp belum diisi' : undefined}
      className={cn(
        'flex h-9 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100',
        variant === 'solid'
          ? 'border-transparent bg-success text-white shadow-sm hover:bg-success/90'
          : 'border-success/20 bg-success/10 text-success-text hover:bg-success/20',
        className,
      )}
    >
      <WhatsAppIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
