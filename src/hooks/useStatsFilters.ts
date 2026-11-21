"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPresetRange } from "@/lib/date-range";
import type { CrBasis, Period } from "@/types/stats";

export function useStatsFilters(anchorDate: string, datesReady: boolean) {
  const [period, setPeriodState] = useState<Period>("today");
  const [crBasis, setCrBasis] = useState<CrBasis>("leads");
  const [dateFrom, setDateFrom] = useState(anchorDate);
  const [dateTo, setDateTo] = useState(anchorDate);
  const initialized = useRef(false);

  useEffect(() => {
    if (!datesReady || initialized.current) return;
    const range = getPresetRange("today", anchorDate);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    initialized.current = true;
  }, [datesReady, anchorDate]);

  function setPeriod(next: Period) {
    setPeriodState(next);
    if (next !== "custom") {
      const range = getPresetRange(next, dateTo);
      setDateFrom(range.dateFrom);
      setDateTo(range.dateTo);
    }
  }

  function onDateFromChange(from: string) {
    setPeriodState("custom");
    setDateFrom(from);
    if (from > dateTo) setDateTo(from);
  }

  function onDateToChange(to: string) {
    if (period === "custom") {
      setDateTo(to);
      if (to < dateFrom) setDateFrom(to);
      return;
    }

    const range = getPresetRange(period, to);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  }

  const buildQueryParams = useCallback(
    (geo: string) => {
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
      });
      if (geo !== "ALL") params.set("geo", geo);
      params.set("crBasis", crBasis);
      return params;
    },
    [dateFrom, dateTo, crBasis],
  );

  return {
    period,
    setPeriod,
    crBasis,
    setCrBasis,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    buildQueryParams,
  };
}
