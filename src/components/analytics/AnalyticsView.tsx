"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { OfferRow } from "@/types/stats";
import { useGeoOptions } from "@/hooks/useGeoOptions";
import { useStatsFilters } from "@/hooks/useStatsFilters";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { OffersTable } from "@/components/analytics/OffersTable";
import { StatsContentLoader } from "@/components/ui/StatsContentLoader";
import type { ThemeVariant } from "@/lib/themes";

interface AnalyticsViewProps {
  locale: string;
  themeVariant: ThemeVariant;
}

export function AnalyticsView({ locale, themeVariant }: AnalyticsViewProps) {
  const t = useTranslations("analytics");
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
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!datesReady) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?${buildQueryParams(geo)}`);
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, geo, datesReady]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      {!datesReady || loading ? <StatsContentLoader /> : <OffersTable offers={offers} />}
    </DashboardShell>
  );
}
