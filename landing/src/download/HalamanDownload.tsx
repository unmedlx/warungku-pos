import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Check, Download, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import qrcode from "qrcode-generator";
import Logo from "../components/Logo";
import Footer from "../components/Footer";
import { WhatsAppIcon } from "../components/icons";
import { Badge, JudulSeksi, Kartu, Tombol, cn } from "../components/ui";
import { TAUTAN } from "../tautan";
import {
  PLATFORM,
  ambilRilis,
  formatTanggal,
  formatUkuran,
  linkTetap,
  tebakPlatform,
  type DaftarRilis,
  type Platform,
  type Rilis,
} from "./rilis";

const IKON: Record<Platform, typeof Smartphone> = { android: Smartphone, windows: Monitor };

/* ══════════════════════════ Header ══════════════════════════ */

function Header() {
  return (
    <header className="sticky top-0 z-[70] border-b border-border bg-card/85 backdrop-blur-[10px]">
      <div className="bungkus flex h-16 items-center gap-6">
        <a href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8 shrink-0 rounded-lg" />
          <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
            Kan<span className="text-primary">POS</span>
          </span>
        </a>
        <div className="ml-auto flex items-center gap-2">
          <Tombol href="/" size="sm" className="hidden desktop:inline-flex">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke beranda
          </Tombol>
          <Tombol href={TAUTAN.whatsapp} variant="wa" size="sm">
            <WhatsAppIcon className="h-4 w-4" />
            Tanya via WhatsApp
          </Tombol>
        </div>
      </div>
    </header>
  );
}

/* ══════════════════════════ QR ══════════════════════════ */

function KodeQr({ teks }: { teks: string }) {
  // Tipe 0 = ukuran otomatis; koreksi M cukup untuk layar dan cetakan.
  const path = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(teks);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { d, n };
  }, [teks]);

  return (
    <svg
      viewBox={`-2 -2 ${path.n + 4} ${path.n + 4}`}
      className="h-full w-full"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code ${teks}`}
    >
      <rect x="-2" y="-2" width={path.n + 4} height={path.n + 4} fill="#fff" />
      <path d={path.d} fill="#111" />
    </svg>
  );
}

/* ══════════════════════════ Hero ══════════════════════════ */

function PilihPlatform({ aktif, onPilih }: { aktif: Platform; onPilih: (p: Platform) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Pilih perangkat"
      className="mt-6 flex gap-1 rounded-lg bg-muted p-1 desktop:inline-flex"
    >
      {(["android", "windows"] as Platform[]).map((p) => {
        const Ikon = IKON[p];
        return (
          <button
            key={p}
            role="tab"
            aria-selected={aktif === p}
            onClick={() => onPilih(p)}
            className={cn(
              "flex h-[34px] flex-1 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium transition",
              aktif === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Ikon className="h-4 w-4" />
            {p === "android" ? "Android" : "Windows"}
          </button>
        );
      })}
    </div>
  );
}

function KartuUnduh({
  rilis,
  platform,
  lawanTersedia,
  onTukar,
}: {
  rilis: Rilis;
  platform: Platform;
  lawanTersedia: boolean;
  onTukar: () => void;
}) {
  const info = PLATFORM[platform];
  const Ikon = IKON[platform];
  return (
    <Kartu className="mt-4 p-5">
      <div className="flex items-center gap-3.5">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-primary/10 text-primary">
          <Ikon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold">{info.nama}</h3>
          <div className="mt-0.5 flex flex-wrap gap-x-3.5 gap-y-0.5 text-[13px] tabular-nums text-muted-foreground">
            <span>
              Versi <span className="font-medium text-foreground">{rilis.versionName}</span>
            </span>
            <span>{formatUkuran(rilis.fileSize)}</span>
            <span>Rilis {formatTanggal(rilis.publishedAt)}</span>
            <span>{info.syarat}</span>
          </div>
        </div>
      </div>

      <Tombol href={rilis.downloadUrl} variant="primary" size="xl" blok className="mt-[18px] h-12 text-base">
        <Download className="h-[18px] w-[18px]" />
        {info.label}
      </Tombol>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
        {lawanTersedia && (
          <span>
            Pakai {platform === "android" ? "Windows" : "HP Android"}?{" "}
            <button onClick={onTukar} className="font-medium text-primary">
              Download versi {platform === "android" ? "Windows" : "Android"}
            </button>
          </span>
        )}
        <a href="#langkah" className="font-medium text-primary">
          Cara pasang ↓
        </a>
      </div>
    </Kartu>
  );
}

function BelumAda({ gagal }: { gagal: boolean }) {
  return (
    <Kartu className="mt-4 p-6">
      <h3 className="text-[17px] font-semibold">
        {gagal ? "Info versi belum bisa dimuat" : "Versi terbaru sedang disiapkan"}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {gagal
          ? "Coba muat ulang halaman ini. Atau hubungi kami lewat WhatsApp, file installer akan kami kirim langsung."
          : "Hubungi kami lewat WhatsApp, file installer akan kami kirim langsung."}
      </p>
      <Tombol href={TAUTAN.whatsapp} variant="wa" blok className="mt-4">
        <WhatsAppIcon className="h-4 w-4" />
        Minta file via WhatsApp
      </Tombol>
    </Kartu>
  );
}

/* ══════════════════════════ Langkah pasang ══════════════════════════ */

function LayarMini({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "mt-3.5 min-h-[92px] rounded-lg border border-border bg-background p-2.5 text-xs",
        className,
      )}
    >
      {children}
    </div>
  );
}

function DialogMini({ judul, isi, aksi }: { judul: string; isi: string; aksi: string[] }) {
  return (
    <div className="rounded-lg bg-card p-2.5 shadow-sm">
      <b className="mb-1 block font-semibold">{judul}</b>
      <span className="break-all text-muted-foreground">{isi}</span>
      <div className="mt-2 flex justify-end gap-3">
        {aksi.map((a, i) => (
          <span
            key={a}
            className={
              i === aksi.length - 1
                ? "rounded font-semibold text-primary outline outline-2 outline-offset-2 outline-primary"
                : "text-muted-foreground"
            }
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

function Langkah({ platform, rilis }: { platform: Platform; rilis: Rilis | null }) {
  const namaFile = rilis?.fileName ?? (platform === "android" ? "kankitu-pos.apk" : "kankitu-pos.exe");
  const ukuran = rilis ? ` · ${formatUkuran(rilis.fileSize)}` : "";

  const langkah: { judul: string; isi: ReactNode; layar?: ReactNode }[] =
    platform === "android"
      ? [
          {
            judul: "Download APK",
            isi: (
              <>
                Tekan tombol Download. Kalau Chrome bertanya, pilih <b>Tetap download</b>.
              </>
            ),
            layar: (
              <DialogMini
                judul="File ini dapat membahayakan perangkat"
                isi={namaFile}
                aksi={["Batal", "Tetap download"]}
              />
            ),
          },
          {
            judul: "Buka file",
            isi: (
              <>
                Buka notifikasi download, atau cari di folder <b>Download</b>.
              </>
            ),
            layar: <DialogMini judul="Download selesai" isi={namaFile + ukuran} aksi={["Buka"]} />,
          },
          {
            judul: "Izinkan pemasangan",
            isi: (
              <>
                Android minta izin sekali. Tekan <b>Setelan</b>, lalu nyalakan{" "}
                <b>Izinkan dari sumber ini</b>.
              </>
            ),
            layar: (
              <div className="flex items-center justify-between rounded-lg bg-card px-2.5 py-2 shadow-sm">
                <span>Izinkan dari sumber ini</span>
                <span className="relative h-[17px] w-[30px] rounded-full bg-primary outline outline-2 outline-offset-2 outline-primary after:absolute after:right-0.5 after:top-0.5 after:h-[13px] after:w-[13px] after:rounded-full after:bg-white" />
              </div>
            ),
          },
          {
            judul: "Pasang & buka",
            isi: (
              <>
                Tekan <b>Instal</b>. Selesai, KanPOS muncul di layar HP kamu.
              </>
            ),
            layar: (
              <DialogMini judul="KanPOS" isi="Ingin menginstal aplikasi ini?" aksi={["Batal", "Instal"]} />
            ),
          },
        ]
      : [
          {
            judul: "Download installer",
            isi: (
              <>
                Tekan tombol Download. Kalau browser bertanya, pilih <b>Simpan</b>.
              </>
            ),
          },
          {
            judul: "Jalankan file",
            isi: (
              <>
                Buka <b className="break-all">{namaFile}</b> dari folder Downloads.
              </>
            ),
          },
          {
            judul: "Kalau muncul layar biru",
            isi: (
              <>
                Klik <b>More info</b>, lalu <b>Run anyway</b>.
              </>
            ),
            layar: (
              <LayarMini className="border-0 bg-[#0b5cad] text-white">
                <b className="block font-semibold">Windows protected your PC</b>
                <span className="rounded underline outline outline-2 outline-offset-2 outline-white">
                  More info
                </span>
              </LayarMini>
            ),
          },
          {
            judul: "Selesai",
            isi: "Ikon KanPOS muncul di desktop dan menu Start.",
          },
        ];

  return (
    <section id="langkah" className="seksi seksi-alt">
      <div className="bungkus-lg">
        <JudulSeksi
          judul={platform === "android" ? "Cara pasang di Android" : "Cara pasang di Windows"}
          ket="Cuma sekali di awal. Update berikutnya muncul otomatis di aplikasi."
        />
        <ol className="grid list-none gap-4 p-0 desktop:grid-cols-4">
          {langkah.map((l, i) => (
            <li key={l.judul}>
              <Kartu className="h-full p-[18px]">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mb-1 mt-3 text-[15px] font-semibold">{l.judul}</h3>
                <p className="text-sm text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground">
                  {l.isi}
                </p>
                {l.layar &&
                  (platform === "windows" ? l.layar : <LayarMini>{l.layar}</LayarMini>)}
              </Kartu>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-info/20 bg-info/[.07] px-3.5 py-3 text-sm">
          <ShieldCheck className="mt-0.5 h-[18px] w-[18px] flex-none text-info-text" />
          <div>
            <b className="font-semibold">Aman.</b> Peringatan tadi muncul untuk semua aplikasi di
            luar Play Store, bukan karena ada masalah di KanPOS. Pastikan kamu download hanya dari
            halaman ini.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════ Catatan rilis + FAQ ══════════════════════════ */

function CatatanRilis({ rilis }: { rilis: Rilis }) {
  const baris = rilis.changelog
    .split("\n")
    .map((b) => b.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);

  return (
    <Kartu className="p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Yang baru di versi ini</h3>
        <Badge variant="primary">{rilis.versionName}</Badge>
      </div>
      {baris.length > 0 ? (
        <ul className="mt-2.5 grid list-disc gap-1 pl-[18px] text-sm text-muted-foreground">
          {baris.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 text-sm text-muted-foreground">Perbaikan kecil dan peningkatan performa.</p>
      )}

      {rilis.previous.length > 0 && (
        <div className="mt-[18px] border-t border-border">
          {rilis.previous.map((v) => (
            <div
              key={v.versionCode}
              className="flex justify-between gap-2.5 border-b border-border py-2.5 text-sm"
            >
              <span className="tabular-nums">
                {v.versionName}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatTanggal(v.publishedAt)} · {formatUkuran(v.fileSize)}
                </span>
              </span>
              <a href={v.downloadUrl} className="font-medium text-primary">
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </Kartu>
  );
}

function Faq({ rilis }: { rilis: Rilis | null }) {
  const faq: { q: string; a: ReactNode }[] = [
    {
      q: "Kenapa tidak ada di Play Store?",
      a: "Supaya update bisa kami kirim lebih cepat ke kamu. File di halaman ini sama resminya dengan aplikasi di toko aplikasi.",
    },
    {
      q: "Bagaimana cara update nanti?",
      a: (
        <>
          Aplikasi memberi tahu sendiri kalau ada versi baru. Tinggal tekan <b>Update</b>, data
          jualan kamu tetap aman.
        </>
      ),
    },
    {
      q: "Data saya hilang kalau pasang ulang?",
      a: "Tidak, selama kamu memasang di atas aplikasi yang lama (jangan uninstall dulu). Aktifkan backup cloud supaya lebih tenang.",
    },
    {
      q: "Pakai iPhone, bisa?",
      a: "Aplikasi iPhone belum ada. Kamu tetap bisa pakai KanPOS langsung dari browser Safari.",
    },
  ];
  if (rilis) {
    faq.push({
      q: "Cara memastikan file asli",
      a: (
        <>
          Cocokkan kode SHA-256 file yang kamu unduh:
          <br />
          <span className="break-all font-mono text-xs">{rilis.sha256}</span>
        </>
      ),
    });
  }

  return (
    <div>
      <h3 className="mb-3.5 text-lg font-semibold">Pertanyaan yang sering muncul</h3>
      <Kartu className="divide-y divide-border overflow-hidden">
        {faq.map((f, i) => (
          <details key={f.q} open={i === 0} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-[15px] font-medium group-open:bg-background [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-5 pb-4 text-sm text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground">
              {f.a}
            </div>
          </details>
        ))}
      </Kartu>
    </div>
  );
}

/* ══════════════════════════ Halaman ══════════════════════════ */

export default function HalamanDownload() {
  const [data, setData] = useState<DaftarRilis | null>(null);
  const [gagal, setGagal] = useState(false);
  const [platform, setPlatform] = useState<Platform>(() => tebakPlatform());

  useEffect(() => {
    document.title = "Download KanPOS — Aplikasi Kasir Gratis";
    const ctrl = new AbortController();
    ambilRilis(ctrl.signal)
      .then((d) => {
        setData(d);
        // Kalau tebakan tidak punya rilis tapi platform lain punya, pindah ke sana.
        setPlatform((p) => (d[p] ? p : d[PLATFORM[p].lawan] ? PLATFORM[p].lawan : p));
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setGagal(true);
      });
    return () => ctrl.abort();
  }, []);

  const memuat = !data && !gagal;
  const rilis = data?.[platform] ?? null;
  const lawan = PLATFORM[platform].lawan;

  return (
    <div className="min-h-screen bg-card pb-[68px] desktop:pb-0">
      <Header />
      <main>
        <section
          className="pb-9 pt-7 desktop:pb-14 desktop:pt-12"
          style={{
            background:
              "radial-gradient(800px 380px at 85% 0%, hsl(var(--primary) / .11), transparent 60%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--card)) 80%)",
          }}
        >
          <div className="bungkus-lg grid items-start gap-10 desktop:grid-cols-[1.15fr_.85fr]">
            <div>
              <Badge variant="success">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Gratis · resmi dari KanPOS
              </Badge>
              <h1 className="mb-3 mt-3.5 text-[28px] font-semibold leading-[1.12] tracking-[-.03em] desktop:text-[38px]">
                Download aplikasi kasir KanPOS
              </h1>
              <p className="max-w-[34rem] text-[15px] text-muted-foreground desktop:text-[17px]">
                Pasang di HP Android atau laptop Windows kamu. Nggak perlu lewat Play Store, cukup
                unduh dan pasang dalam 2 menit.
              </p>

              <PilihPlatform aktif={platform} onPilih={setPlatform} />

              {memuat ? (
                <div className="mt-4 h-[196px] animate-pulse rounded-xl bg-muted" />
              ) : rilis ? (
                <KartuUnduh
                  rilis={rilis}
                  platform={platform}
                  lawanTersedia={Boolean(data?.[lawan])}
                  onTukar={() => setPlatform(lawan)}
                />
              ) : (
                <BelumAda gagal={gagal} />
              )}
            </div>

            {data?.android && (
              <Kartu className="hidden p-6 text-center desktop:block">
                <h3 className="text-base font-semibold">Buka dari laptop?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scan pakai kamera HP untuk langsung download versi Android.
                </p>
                <div className="mx-auto my-3.5 h-[176px] w-[176px] rounded-xl border border-border bg-white p-1.5">
                  <KodeQr teks={linkTetap("android")} />
                </div>
              </Kartu>
            )}
          </div>
        </section>

        <Langkah platform={platform} rilis={rilis} />

        {rilis ? (
          <section className="seksi">
            <div className="bungkus-lg grid gap-5 desktop:grid-cols-2">
              <CatatanRilis rilis={rilis} />
              <Faq rilis={rilis} />
            </div>
          </section>
        ) : (
          <section className="seksi">
            <div className="bungkus-lg mx-auto max-w-[640px]">
              <Faq rilis={null} />
            </div>
          </section>
        )}

        <section className="pb-12 desktop:pb-16">
          <div className="bungkus-lg">
            <div
              className="flex flex-wrap items-center justify-between gap-5 rounded-2xl p-6 text-white desktop:p-8"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))",
              }}
            >
              <div>
                <h2 className="text-[22px] font-semibold">Bingung saat pasang?</h2>
                <p className="mt-1 text-white/80">Chat kami, kami bantu sampai aplikasinya jalan.</p>
              </div>
              <Tombol href={TAUTAN.whatsapp} variant="terang" size="xl" blok className="text-wa-text desktop:w-auto">
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                Chat WhatsApp
              </Tombol>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Bar bawah khusus mobile: satu tombol download versi yang sedang dipilih. */}
      <div className="fixed inset-x-0 bottom-0 z-[80] flex gap-2 border-t border-border bg-card px-3 py-2.5 shadow-bar desktop:hidden">
        {rilis ? (
          <Tombol href={rilis.downloadUrl} variant="primary" className="flex-1">
            <Download className="h-4 w-4" />
            {PLATFORM[platform].label} · {formatUkuran(rilis.fileSize)}
          </Tombol>
        ) : (
          <Tombol href={TAUTAN.whatsapp} variant="wa" className="flex-1">
            <WhatsAppIcon className="h-4 w-4" />
            Minta file via WhatsApp
          </Tombol>
        )}
      </div>
    </div>
  );
}
