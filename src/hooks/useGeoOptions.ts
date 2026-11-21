"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { getCountryName } from "@/lib/country-names";
import { todayISO } from "@/lib/date-utils";

interface GeoOption {
  code: string;
  label: string | null;
}

export function useGeoOptions() {
  const locale = useLocale();
  const [options, setOptions] = useState<GeoOption[]>([]);
  const [defaultStatsDate, setDefaultStatsDate] = useState<string | null>(null);
  const [statsDateMin, setStatsDateMin] = useState<string | null>(null);
  const [statsDateMax, setStatsDateMax] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [statsDate, setStatsDate] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<{
    id: string;
    name: string;
    geo: string;
    geoLabel: string | null;
    anchorDate?: string;
    geoCodes?: string[];
    buyerCount?: number;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/geos");
    if (res.ok) {
      const data = await res.json();
      setOptions(data.geos ?? []);
      setActiveTemplate(data.activeTemplate ?? null);
      setStatsDateMin(data.statsDateMin ?? null);
      setStatsDateMax(data.statsDateMax ?? null);
      const resolved = data.defaultStatsDate ?? todayISO();
      setDefaultStatsDate(resolved);
      setStatsDate((prev) => prev ?? resolved);
    } else {
      setStatsDate((prev) => prev ?? todayISO());
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function labelFor(code: string): string {
    const opt = options.find((o) => o.code === code);
    if (opt?.label) return opt.label;
    return getCountryName(code, locale);
  }

  const geoLabels = Object.fromEntries(
    options.map((o) => [o.code, o.label ?? getCountryName(o.code, locale)]),
  );

  return {
    options,
    activeTemplate,
    geoLabels,
    statsDate: statsDate ?? todayISO(),
    setStatsDate,
    statsDateMin: statsDateMin ?? undefined,
    statsDateMax: statsDateMax ?? undefined,
    datesReady: loaded && statsDate !== null,
    reloadGeos: load,
  };
}
