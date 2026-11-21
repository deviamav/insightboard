"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Menu, X, PanelLeft } from "lucide-react";
import type { ThemeVariant } from "@/lib/themes";
import { getTheme } from "@/lib/themes";
import { Sidebar } from "./Sidebar";
import { PeriodSelect } from "./PeriodSelect";
import { CrBasisSelect } from "./CrBasisSelect";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { DateRangeFilter } from "./DateRangeFilter";
import { GeoSelect } from "./GeoSelect";
import type { CrBasis, Period } from "@/types/stats";

interface DashboardShellProps {
  locale: string;
  themeVariant: ThemeVariant;
  title: string;
  children: React.ReactNode;
  period?: Period;
  onPeriodChange?: (period: Period) => void;
  crBasis?: CrBasis;
  onCrBasisChange?: (basis: CrBasis) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (date: string) => void;
  onDateToChange?: (date: string) => void;
  dateMin?: string;
  dateMax?: string;
  geo?: string;
  onGeoChange?: (geo: string) => void;
  geoOptions?: Array<{ code: string; label: string | null }>;
  allGeoLabel?: string;
  showFilters?: boolean;
  filtersReady?: boolean;
}

const SIDEBAR_KEY = "fs-sidebar-collapsed";

export function DashboardShell({
  locale,
  themeVariant,
  title,
  children,
  period = "today",
  onPeriodChange,
  crBasis = "leads",
  onCrBasisChange,
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  dateMin,
  dateMax,
  geo = "ALL",
  onGeoChange,
  geoOptions = [],
  allGeoLabel = "All",
  showFilters = true,
  filtersReady = true,
}: DashboardShellProps) {
  const theme = getTheme(themeVariant);
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/login")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/login");
          return;
        }
        setSessionChecked(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div
      className="flex min-h-screen"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        ["--theme-accent" as string]: theme.accent,
        ["--theme-border" as string]: theme.border,
        ["--theme-bg-card" as string]: theme.bgCard,
        ["--theme-text" as string]: theme.text,
        ["--theme-text-muted" as string]: theme.textMuted,
        ["--theme-chart-secondary" as string]: theme.chartSecondary,
        ["--theme-chart-danger" as string]: theme.chartDanger,
      }}
    >
      {!sessionChecked ? null : (
        <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar
          themeVariant={themeVariant}
          collapsed={collapsed && !mobileOpen}
          onToggleCollapse={toggleCollapsed}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 border-b px-4 py-2.5 lg:px-6"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.border,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md p-1.5 lg:hidden"
                style={{ color: theme.text }}
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <button
                type="button"
                className="hidden rounded-md p-1.5 transition-colors hover:bg-white/[0.06] lg:inline-flex"
                style={{ color: theme.textMuted }}
                onClick={toggleCollapsed}
                aria-label="Toggle sidebar"
              >
                <PanelLeft size={16} strokeWidth={1.5} />
              </button>
              <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <LanguageSwitcher
                border={theme.border}
                bgCard={theme.bgCard}
                text={theme.text}
              />
              {showFilters && onPeriodChange && (
                <PeriodSelect
                  value={period}
                  onChange={onPeriodChange}
                  accent={theme.accent}
                  border={theme.border}
                  bgCard={theme.bgCard}
                  text={theme.text}
                />
              )}
              {showFilters && onCrBasisChange && (
                <CrBasisSelect
                  value={crBasis}
                  onChange={onCrBasisChange}
                  accent={theme.accent}
                  border={theme.border}
                  bgCard={theme.bgCard}
                  text={theme.text}
                />
              )}
              {showFilters && onDateFromChange && onDateToChange && (
                <DateRangeFilter
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onDateFromChange={onDateFromChange}
                  onDateToChange={onDateToChange}
                  min={dateMin}
                  max={dateMax}
                />
              )}
              {showFilters && onGeoChange && filtersReady && (
                <GeoSelect
                  value={geo}
                  onChange={onGeoChange}
                  options={geoOptions}
                  allLabel={allGeoLabel}
                />
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 lg:p-6">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
        </>
      )}
    </div>
  );
}
