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

  const isPositive = summary.grossProfit >= 0;
  const profitLabel = isPositive
    ? t("pll.profit", { defaultValue: "Untung" })
    : t("pll.loss", { defaultValue: "Rugi" });

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
            <div className="flex items-center gap-2">
              <MoneyPanelLabel>{t("pll.title", { defaultValue: "Untung/Rugi Hari Ini" })}</MoneyPanelLabel>
              <Badge
                variant={isPositive ? "success" : "destructive"}
                shape="pill"
                size="sm"
                className="shrink-0 border-0 bg-white/15 text-primary-foreground"
              >
                {isPositive ? <TrendingUp /> : <TrendingDown />}
                {summary.grossMarginPercent.toFixed(0)}%
              </Badge>
            </div>
            {/* Angka utama satu layar: dibaca sambil berdiri, dari jarak
                lengan. Tombol mata menyamarkannya saat ada pembeli di
                depan meja. */}
            <MoneyPanelAmount value={summary.grossProfit} locale={NUMBER_LOCALES[lang] ?? "id-ID"} />
          </div>
          <MoneyVisibilityToggle className="-mr-1 shrink-0 text-primary-dim hover:bg-white/15 hover:text-primary-foreground" />
        </div>

        <p className="mt-1.5 text-2xs font-medium text-primary-dim">
          {profitLabel}
          {" \u00b7 "}
          {t("pll.subtitle", { count: summary.transactionCount, defaultValue: `{{count}} transaksi` })}
          {" \u00b7 "}
          {format(date, "EEEE, d MMM", { locale: dateLocale })}
        </p>

        {chart && <div className="mt-3.5">{chart}</div>}

        <MoneyPanelFooter className="justify-start divide-x divide-white/20">
          {subFigures.map((f, i) => (
            <div key={f.key} className={cn("min-w-0 flex-1", i === 0 ? "pr-3" : "px-3 last:pr-0")}>
              <span className="block truncate text-3xs font-semibold uppercase tracking-[0.04em] text-primary-dim">
                {f.label}
              </span>
              <span className="mt-0.5 block truncate text-xsm font-bold tabular-nums text-primary-foreground">
                {formatCompact(f.value, lang)}
              </span>
            </div>
          ))}
        </MoneyPanelFooter>

        {onViewReport && (
          <button
            type="button"
            onClick={onViewReport}
            className="mt-3 inline-flex items-center gap-0.5 rounded-sm text-xsm font-bold text-primary-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-primary-foreground/50"
          >
            {t("pll.viewReport", { defaultValue: "Lihat laporan lengkap" })}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}


      </MoneyPanel>

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

