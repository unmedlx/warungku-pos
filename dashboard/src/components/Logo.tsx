/**
 * Logo KanPOS — sumber tunggal: `frontend/design/logo/kanpos-icon.svg`.
 * Ikon mesin kasir putih di dalam kotak biru brand; ukuran & radius sudut
 * ikut `className`. Kalau master SVG berubah, salin ulang path-nya ke sini
 * (komponen ini sengaja inline supaya logo tidak menunggu request jaringan).
 */
export default function Logo({ className = 'h-[34px] w-[34px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="KanPOS">
      <rect width="512" height="512" rx="112" fill="#3554C1" />
      <g
        transform="translate(80 92) scale(25.14)"
        fill="none"
        stroke="#fff"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 11h1" />
        <path d="M10 5V3" />
        <path d="M12 1.75A1.25 1.25 0 0 1 10.75 3h-1.5a1.25 1.25 0 0 1 0-2.5h1.5A1.25 1.25 0 0 1 12 1.75Z" />
        <path d="M5.5 5V1.5h-3V5" />
        <rect x=".5" y="8.5" width="13" height="5" rx="1" />
        <path d="M12.5 8.5V6a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v2.5" />
      </g>
    </svg>
  );
}
