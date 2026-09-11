// Ikon khusus yang tidak ada padanan langsung di lucide-react.
// Ikon WhatsApp mengikuti bentuk asli mockup.

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.5-1.2-2.9s.7-2 .9-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2.1 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l2 1c.2.1.4.2.4.3.1.2.1.6-.1 1.2z" />
    </svg>
  );
}

// Ikon sinyal bar (status bar HP) — 4 batang menaik
export function SignalBarsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2 17h3v4H2zM7 13h3v8H7zM12 9h3v12h-3z" />
      <path d="M17 4h3v17h-3z" opacity=".3" />
    </svg>
  );
}

// Ikon wifi-putus (sinyal hilang) — wifi + garis serong
export function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

// Ikon baterai (status bar HP)
export function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="7" width="18" height="10" rx="3" />
      <rect x="4" y="9" width="12" height="6" rx="1.6" fill="currentColor" />
      <path d="M22 11v2" />
    </svg>
  );
}
