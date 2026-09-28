import { useMemo, type ReactNode } from "react";
import { useDailyPll } from "@/hooks/use-daily-pll";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/jokoui/card";
import { Badge } from "@/components/jokoui/badge";
import { SectionTitle } from "@/components/jokoui/section-title";
import { DataList, DataListRow } from "@/components/jokoui/data-list";
import {
  MoneyPanel,
  MoneyPanelAmount,
  MoneyPanelFooter,
  MoneyPanelLabel,
} from "@/components/jokoui/money-panel";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay } from "date-fns";
import { id, enUS, ms } from "date-fns/locale";
import { TrendingUp, TrendingDown, Loader2, ChevronRight } from "@/components/icons";
import { MoneyVisibilityToggle } from "@/components/jokoui/money-display";
import { useTranslation } from "react-i18next";
import type { Locale } from "date-fns";

const LOCALES: Record<string, Locale> = { id, en: enUS, ms };
const NUMBER_LOCALES: Record<string, string> = { id: "id-ID", en: "en-US", ms: "ms-MY" };
function formatCompact(n: number, lang: string) {
  const locale = NUMBER_LOCALES[lang] ?? "id-ID";
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export interface DailyPllCardProps {
  date?: Date;
  onViewReport?: () => void;
  /** Grafik 7 hari yang ditaruh di dalam kartu angka utama (dikirim dari Beranda). */
  chart?: ReactNode;
}

export function DailyPllCard({ date: dateProp, onViewReport, chart }: DailyPllCardProps) {
  const { t, i18n } = useTranslation("dashboard");
  const lang = i18n.language;
  const dateLocale = LOCALES[lang] ?? id;

  // Batas hari dipakai sebagai dependency query. Harus stabil antar render —
  // kalau tidak, `new Date()` default bikin useLiveQuery re-subscribe terus
  // dan komponen masuk render loop (dashboard tampak blank).
  const dayStart = startOfDay(dateProp ?? new Date()).getTime();
  const dayEnd = endOfDay(dayStart).getTime();
  const date = useMemo(() => new Date(dayStart), [dayStart]);

  const summary = useDailyPll(date);
  /* Mockup menjanjikan garis "dari kemarin", jadi angkanya dihitung, bukan
     diganti metrik lain yang kebetulan tersedia. */
  const yesterday = useMemo(() => new Date(dayStart - 86_400_000), [dayStart]);
  const summaryYesterday = useDailyPll(yesterday);

  // Stat KELUAR & KASBON: pengeluaran + kasbon hari itu
  const expensesToday = useLiveQuery(async () => {
    const rows = await db.expenses
      .where("date").between(new Date(dayStart), new Date(dayEnd), true, true)
      .filter(e => e.isDeleted === 0)
      .toArray();
    return rows.reduce((s, e) => s + e.amount, 0);
  }, [dayStart, dayEnd]);
  const debtToday = useLiveQuery(async () => {
    const rows = await db.debts
      .where("createdAt").between(new Date(dayStart), new Date(dayEnd), true, true)
      .toArray();
    return rows.reduce((s, d) => s + d.remainingAmount, 0);
  }, [dayStart, dayEnd]);

  if (summary === undefined) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <p className="text-sm font-medium">{t("pll.loading", { defaultValue: "Memuat ringkasan keuangan..." })}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* Persen perubahan laba terhadap kemarin. Kalau kemarin nol, persentase
     tidak punya arti — jatuh ke 0 daripada mencetak angka tak hingga. */
  const profitYesterday = summaryYesterday?.grossProfit ?? 0;
  const trend =
    profitYesterday === 0 ? 0 : ((summary.grossProfit - profitYesterday) / Math.abs(profitYesterday)) * 100;

  /**
   * Tiga angka pendamping di kaki panel. Sengaja BUKAN tiga kartu stat
   * terpisah di bawah kartu utama: itu template "angka besar + stat
   * pendukung" yang membuat setiap dashboard terlihat sama, dan ia memecah
   * satu urusan uang menjadi empat permukaan. Di sini keempatnya satu objek
   * — panel dompet yang sama — dipisah garis rambut dari putih transparan.
   */
  const subFigures = [
    { key: "in", label: t("pll.in", { defaultValue: "Masuk" }), value: summary.revenue },
    { key: "out", label: t("pll.out", { defaultValue: "Keluar" }), value: expensesToday ?? 0 },
    { key: "debt", label: t("pll.debt", { defaultValue: "Kasbon" }), value: debtToday ?? 0 },
  ];

  return (
    <div className="space-y-3">
      <MoneyPanel variant="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <MoneyPanelLabel>{t("pll.title", { defaultValue: "Untung/Rugi Hari Ini" })}</MoneyPanelLabel>
            {/* Angka utama satu layar: dibaca sambil berdiri, dari jarak
                lengan. Tombol mata menyamarkannya saat ada pembeli di
                depan meja. */}
            <MoneyPanelAmount value={summary.grossProfit} scale="lead" locale={NUMBER_LOCALES[lang] ?? "id-ID"} />
          </div>
          <MoneyVisibilityToggle className="-mr-1 shrink-0 text-primary-dim hover:bg-white/15 hover:text-primary-foreground" />
        </div>

        {/* Rel tren selalu digambar, bahkan saat semua harinya nol. Ia
            bagian dari bentuk panel ini, bukan hiasan yang muncul kalau
            kebetulan ada data — dan tujuh batang rata bawah berlabel hari
            membaca "belum ada penjualan minggu ini", bukan "ada yang gagal
            dimuat". */}
        {chart && <div className="mt-3.5">{chart}</div>}

        {/* Satu garis perbandingan — kaki panel di mockup. */}
        <div className="mt-3.5 flex items-center gap-1.5 border-t border-white/20 pt-3 text-2xs font-medium text-primary-dim">
          <b className="inline-flex shrink-0 items-center gap-0.5 font-bold text-primary-foreground">
            {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(trend).toFixed(0)}%
          </b>
          <span className="min-w-0 truncate">
            {t("pll.vsYesterday", { defaultValue: "dari kemarin" })}
            {" \u00b7 "}
            {t("pll.subtitle", { count: summary.transactionCount, defaultValue: `{{count}} transaksi` })}
          </span>
        </div>


      </MoneyPanel>

      {/* Masuk / Keluar / Kasbon tinggal di bawah panel, bukan di dalamnya.
          Panel itu satu objek dengan bentuk yang sudah ditetapkan mockup —
          label, nominal, rel tren, satu garis perbandingan — dan menumpuk
          baris keempat di dalamnya membuatnya berhenti terbaca sebagai satu
          benda. Di sini ketiganya tetap satu baris bergaris, bukan tiga
          kartu stat yang berdiri sendiri-sendiri. */}
      <button
        type="button"
        onClick={onViewReport}
        disabled={!onViewReport}
        aria-label={t("pll.viewReport", { defaultValue: "Lihat laporan lengkap" })}
        className={cn(
          "flex w-full items-center gap-1 rounded-xl bg-card px-1 py-2.5 text-left",
          "shadow-lift dark:shadow-none dark:ring-1 dark:ring-border",
          "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
          onViewReport && "transition-colors active:bg-accent motion-reduce:transition-none",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center divide-x divide-border">
          {subFigures.map((f) => (
            <span key={f.key} className="min-w-0 flex-1 px-3">
              <span className="block truncate text-3xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {f.label}
              </span>
              <span className="mt-0.5 block truncate text-xsm font-bold tabular-nums text-foreground">
                {formatCompact(f.value, lang)}
              </span>
            </span>
          ))}
        </span>
        {onViewReport && <ChevronRight className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {/* Produk terlaris adalah daftar, bukan uang — jadi ia keluar dari
          panel dompet dan memakai permukaan kartu biasa. */}
      {summary.topProducts.length > 0 && (
        <div>
          <SectionTitle title={t("pll.topProducts", { defaultValue: "Produk terlaris" })} />
          <Card>
            <CardContent className="py-1">
              <DataList>
                {summary.topProducts.slice(0, 3).map((p) => (
                  <DataListRow
                    key={p.productId}
                    className="py-2"
                    label={
                      <span className="flex min-w-0 items-center gap-2">
                        <Badge variant="primary" size="sm" className="shrink-0">{p.quantity}</Badge>
                        <span className="truncate text-foreground">{p.name}</span>
                      </span>
                    }
                    value={formatCompact(p.profit, lang)}
                  />
                ))}
              </DataList>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

