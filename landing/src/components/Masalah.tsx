import { Check, X } from "lucide-react";
import { JudulSeksi, Kartu } from "./ui";

const masalah = [
  {
    p: "Nyatet di buku, tulisannya suka hilang.",
    jawab: "Tiap transaksi kecatat sendiri. Rekapnya jadi otomatis.",
  },
  {
    p: "Jualan ramai, tapi nggak tahu untungnya berapa.",
    jawab: "Modal barang otomatis dipotong. Untung bersih kelihatan tiap hari.",
  },
  {
    p: "Aplikasi lain mahal, sinyal jelek malah error.",
    jawab: "Ini gratis, dan jalannya dari HP kamu sendiri.",
  },
];

/** Keluhan yang sering terdengar, langsung dipasangkan dengan jawabannya. */
export default function Masalah() {
  return (
    <section className="seksi">
      <div className="bungkus">
        <JudulSeksi
          judul="Kalau kamu masih ngalamin ini, wajar"
          ket="Hampir semua pemilik warung mulainya dari sini."
        />
        <div className="grid gap-4 desktop:grid-cols-3">
          {masalah.map((m) => (
            <Kartu key={m.p} className="p-5 desktop:p-6">
              <div className="flex items-start gap-2.5 text-[15px] font-medium">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-destructive/10 text-destructive-text">
                  <X className="h-3.5 w-3.5" strokeWidth={2.6} />
                </span>
                {m.p}
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-success/20 bg-success/[0.07] px-3.5 py-3 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 flex-none text-success-text" strokeWidth={2.5} />
                {m.jawab}
              </div>
            </Kartu>
          ))}
        </div>
      </div>
    </section>
  );
}
