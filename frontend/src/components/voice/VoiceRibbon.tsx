import type { ReactNode } from 'react';
import { Loader2 } from '@/components/icons';
import { Button } from '@/components/jokoui/button';

/**
 * Pita "sedang mendengarkan".
 *
 * Dipakai kasir dan pendaftaran produk. Pitanya gelap dan mencolok alih-alih
 * ikon kecil di pojok karena status mikrofon tidak boleh mungkin salah dibaca:
 * pengguna yang ragu apakah HP-nya mendengar akan berhenti bicara, atau lebih
 * buruk, terus bicara ke mesin yang sudah mati.
 */

interface Props {
  label: string;
  stopLabel: string;
  onStop: () => void;
  /** Ucapan yang SEDANG berjalan saja. */
  liveText: string;
  idleHint: string;
  stopping?: boolean;
  children?: ReactNode;
}

export default function VoiceRibbon({
  label,
  stopLabel,
  onStop,
  liveText,
  idleHint,
  stopping = false,
  children,
}: Props) {
  return (
    <div className="rounded-2xl bg-foreground text-background px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
        <span className="text-3xs font-bold uppercase tracking-[0.14em] opacity-75">{label}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onStop}
          disabled={stopping}
          className="ml-auto h-7 gap-1.5 rounded-xl bg-background/15 px-3 text-2xs font-semibold text-background hover:bg-background/25"
        >
          {stopping && <Loader2 className="h-3 w-3 animate-spin" />}
          {stopLabel}
        </Button>
      </div>
      <p className="mt-2 min-h-[20px] text-xsm leading-relaxed line-clamp-2">
        {liveText.trim().length > 0 ? (
          liveText
        ) : (
          <span className="italic opacity-50">{idleHint}</span>
        )}
      </p>
      {children}
    </div>
  );
}
