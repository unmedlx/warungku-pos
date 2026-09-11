import { Banknote, Smartphone, UserRound, WifiOff } from "lucide-react";
import { IkonKotak } from "./ui";

const items = [
  { icon: Banknote, title: "Rp 0 selamanya", desc: "Bukan masa coba 14 hari" },
  { icon: WifiOff, title: "Sinyal hilang, tetap jalan", desc: "Kasir nggak ikut mati" },
  { icon: UserRound, title: "Nggak perlu daftar akun", desc: "Akun Google cuma buat cloud" },
  { icon: Smartphone, title: "HP, tablet, laptop", desc: "Ringan, HP lama pun kuat" },
];

/** Empat janji utama, dipasang tepat di bawah hero sebelum orang menggulir jauh. */
export default function Strip() {
  return (
    <section className="seksi-alt py-7 desktop:py-9">
      <div className="bungkus grid grid-cols-1 gap-5 desktop:grid-cols-4 desktop:gap-6">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3">
            <IkonKotak>
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </IkonKotak>
            <span>
              <b className="block text-sm font-semibold">{title}</b>
              <span className="text-[13px] text-muted-foreground">{desc}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
