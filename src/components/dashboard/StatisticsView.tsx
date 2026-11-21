"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { DashboardStats } from "@/types/stats";
import { useGeoOptions } from "@/hooks/useGeoOptions";
import { useStatsFilters } from "@/hooks/useStatsFilters";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { GeoStats } from "@/components/dashboard/GeoStats";
import { TopResults } from "@/components/dashboard/TopResults";
import { LeadChart } from "@/components/dashboard/LeadChart";
import { QualityDonut } from "@/components/dashboard/QualityDonut";
import { StatsContentLoader } from "@/components/ui/StatsContentLoader";
import type { ThemeVariant } from "@/lib/themes";

interface StatisticsViewProps {
  locale: string;
  themeVariant: ThemeVariant;
}

const emptyStats: DashboardStats = {
  totals: { leads: 0, valids: 0, invalids: 0, deposits: 0, cr: 0, profit: 0 },
  geo: [],
  topBuyers: [],
  hourlyChart: Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, "0")}:00`,
    leads: 0,
    deposits: 0,
    duplicates: 0,
  })),
  qualityChart: [
    { name: "valid", value: 0, percent: 0 },
    { name: "invalid", value: 0, percent: 0 },
    { name: "ftd", value: 0, percent: 0 },
  ],
  qualityTotal: 0,
};

export function StatisticsView({ locale, themeVariant }: StatisticsViewProps) {
  const t = useTranslations("statistics");
  const tf = useTranslations("filters");
  const { options: geoOptions, statsDate, datesReady, statsDateMin, statsDateMax } =
    useGeoOptions();

  const {
    period,
    setPeriod,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    crBasis,
    setCrBasis,
    buildQueryParams,
  } = useStatsFilters(statsDate, datesReady);

  const [geo, setGeo] = useState("ALL");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!datesReady) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?${buildQueryParams(geo)}`);
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, geo, datesReady]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const contentReady = datesReady && !loading;

  return (
    <DashboardShell
      locale={locale}
      themeVariant={themeVariant}
      title={t("title")}
      period={period}
      onPeriodChange={setPeriod}
      crBasis={crBasis}
      onCrBasisChange={setCrBasis}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={onDateFromChange}
      onDateToChange={onDateToChange}
      dateMin={statsDateMin}
      dateMax={statsDateMax}
      geo={geo}
      onGeoChange={setGeo}
      geoOptions={geoOptions}
      allGeoLabel={tf("allGeo")}
      filtersReady={datesReady}
    >
      <p className="mb-6 text-sm" style={{ color: "var(--theme-text-muted)" }}>
        {t("subtitle")}
      </p>
      {!contentReady ? (
        <StatsContentLoader />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-5 text-lg font-semibold">{t("overview")}</h2>
            <MetricCards totals={stats.totals} />
          </section>
          <section>
            <h2 className="mb-5 text-lg font-semibold">{t("byGeo")}</h2>
            <GeoStats geo={stats.geo} />
          </section>
          <section>
            <h2 className="mb-5 text-lg font-semibold">{t("byBuyer")}</h2>
            <TopResults
              buyers={stats.topBuyers}
              geoCodes={stats.geo.map((g) => g.code)}
            />
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold">{t("timeline")}</h2>
            <div className="grid gap-6 xl:grid-cols-2">
              <LeadChart data={stats.hourlyChart} />
              <QualityDonut data={stats.qualityChart} total={stats.qualityTotal} />
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
