import { useMemo, type ReactNode } from "react";
import { useDailyPll } from "@/hooks/use-daily-pll";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/jokoui/card";
import { Badge } from "@/components/jokoui/badge";
import { Button } from "@/components/jokoui/button";
import { StatCard } from "@/components/jokoui/stat-card";
import { DataList, DataListRow } from "@/components/jokoui/data-list";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay } from "date-fns";
import { id, enUS, ms } from "date-fns/locale";
import { TrendingUp, TrendingDown, Loader2 } from "@/components/icons";
import { MoneyDisplay, MoneyVisibilityToggle } from "@/components/jokoui/money-display";
import { useTranslation } from "react-i18next";
import type { Locale } from "date-fns";

const LOCALES: Record<string, Locale> = { id, en: enUS, ms };
const NUMBER_LOCALES: Record<string, string> = { id: "id-ID", en: "en-US", ms: "ms-MY" };
const CURRENCY_SYMBOL: Record<string, string> = { id: "Rp", en: "Rp", ms: "Rp" };

function formatCurrency(n: number, lang: string) {
  const symbol = CURRENCY_SYMBOL[lang] ?? "Rp";
  const locale = NUMBER_LOCALES[lang] ?? "id-ID";
  return `${symbol} ${n.toLocaleString(locale)}`;
}

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

  return (
    <div className="space-y-2">
      {/* Kartu utama: angka besar + badge margin + grafik 7 hari di kartu yang sama */}
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>{t("pll.title", { defaultValue: "Untung/Rugi Hari Ini" })}</CardDescription>
          <CardAction>
            <Badge variant={isPositive ? "success" : "destructive"} shape="pill">
              {isPositive ? <TrendingUp /> : <TrendingDown />}
              {summary.grossMarginPercent.toFixed(0)}%
            </Badge>
          </CardAction>

          {/* Angka utama satu layar: dibaca sambil berdiri di bawah lampu terang.
              Tombol mata menyamarkannya saat ada pembeli di depan meja. */}
          <div className="col-start-1 flex items-center gap-1.5">
            <MoneyDisplay
              value={summary.grossProfit}
              size="xl"
              symbol={CURRENCY_SYMBOL[lang] ?? "Rp"}
              locale={NUMBER_LOCALES[lang] ?? "id-ID"}
              className={cn("break-words", isPositive ? "text-foreground" : "text-destructive-text")}
            />
            <MoneyVisibilityToggle />
          </div>
          <p className="col-start-1 text-xs text-muted-foreground">
            {profitLabel} ·{" "}
            {t("pll.subtitle", {
              count: summary.transactionCount,
              defaultValue: `{{count}} transaksi`,
            })}
            {" · "}
            {format(date, "EEEE, d MMM", { locale: dateLocale })}
          </p>
        </CardHeader>

        {(chart || summary.topProducts.length > 0 || onViewReport) && (
          <CardContent className="space-y-3 pt-0">
            {chart}

            {summary.topProducts.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t("pll.topProducts", { defaultValue: "Produk terlaris" })}
                </p>
                <DataList>
                  {summary.topProducts.slice(0, 3).map((p) => (
                    <DataListRow
                      key={p.productId}
                      className="py-1.5"
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
              </div>
            )}

            {onViewReport && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onViewReport}
                aria-label={t("pll.viewReport", { defaultValue: "Lihat laporan lengkap" })}
              >
                {t("pll.viewReport", { defaultValue: "Lihat laporan lengkap" })}
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* 3 stat kecil MASUK / KELUAR / KASBON di bawah kartu utama */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          size="sm"
          label={t("pll.in", { defaultValue: "Masuk" })}
          value={formatCompact(summary.revenue, lang)}
          valueClassName="text-success-text"
        />
        <StatCard
          size="sm"
          label={t("pll.out", { defaultValue: "Keluar" })}
          value={formatCompact(expensesToday ?? 0, lang)}
          valueClassName="text-destructive-text"
        />
        <StatCard
          size="sm"
          label={t("pll.debt", { defaultValue: "Kasbon" })}
          value={formatCompact(debtToday ?? 0, lang)}
        />
      </div>
    </div>
  );
}

