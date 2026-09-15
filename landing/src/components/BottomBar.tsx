import { WhatsAppIcon } from "./icons";
import { Tombol } from "./ui";
import { TAUTAN } from "../tautan";

/** Bar aksi tetap di bawah layar, hanya di mobile. */
export default function BottomBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] flex gap-2 border-t border-border bg-card px-3 py-2.5 shadow-bar desktop:hidden">
      <Tombol href={TAUTAN.download} variant="primary" className="flex-1">
        Download Gratis
      </Tombol>
      <a
        href={TAUTAN.whatsapp}
        aria-label="Chat WhatsApp"
        className="inline-flex h-10 w-11 flex-none items-center justify-center rounded-lg bg-wa text-white transition hover:brightness-110"
      >
        <WhatsAppIcon className="h-[22px] w-[22px]" />
      </a>
    </div>
  );
}
