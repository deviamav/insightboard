"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { DashboardStats } from "@/types/stats";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { GeoStats } from "@/components/dashboard/GeoStats";
import { TopResults } from "@/components/dashboard/TopResults";
import { LeadChart } from "@/components/dashboard/LeadChart";
import { QualityDonut } from "@/components/dashboard/QualityDonut";
import { useGeoOptions } from "@/hooks/useGeoOptions";
import { useStatsFilters } from "@/hooks/useStatsFilters";
import { StatsContentLoader } from "@/components/ui/StatsContentLoader";
import type { ThemeVariant } from "@/lib/themes";

interface DashboardViewProps {
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

export function DashboardView({ locale, themeVariant }: DashboardViewProps) {
  const t = useTranslations("dashboard");
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
      <div className="dashboard-section-gap">
        {!datesReady || loading ? (
          <StatsContentLoader />
        ) : (
          <>
            <MetricCards totals={stats.totals} />
            <GeoStats geo={stats.geo} />
            <TopResults
              buyers={stats.topBuyers}
              geoCodes={stats.geo.map((g) => g.code)}
            />
            <div className="grid gap-6 xl:grid-cols-2">
              <LeadChart data={stats.hourlyChart} />
              <QualityDonut data={stats.qualityChart} total={stats.qualityTotal} />
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
