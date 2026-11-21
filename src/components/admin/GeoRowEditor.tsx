"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Search, Trash2 } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { getCountryName } from "@/lib/country-names";
import {
  filterGeoCodes,
  isPresetGeo,
  normalizeGeoCode,
  POPULAR_GEO_CODES,
} from "@/lib/geo-presets";
import type { GeoConfig } from "@/types/geo-config";
import { isGeoRowConfigured, zeroTodayMetrics } from "@/types/geo-config";
import { spreadGeoDailySeries } from "@/lib/geo-spread";
import { getSpreadDates } from "@/lib/period-spread";
import { calcMetrics } from "@/lib/calculations";
import { todayISO } from "@/lib/date-utils";
import type { PeriodType } from "@/types/stats";

interface GeoRowEditorProps {
  row: GeoConfig;
  locale: string;
  periodType: PeriodType;
  anchorDate: string;
  canRemove: boolean;
  t: (key: string) => string;
  inputClass: string;
  inputStyle: React.CSSProperties;
  onChange: (patch: Partial<GeoConfig>) => void;
  onRemove: () => void;
}

function Section({
  title,
  hint,
  accent,
  children,
}: {
  title: string;
  hint?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: accent
          ? "color-mix(in srgb, var(--theme-accent) 6%, var(--theme-bg-card))"
          : "color-mix(in srgb, var(--theme-border) 28%, transparent)",
        border: "1px solid",
        borderColor: accent
          ? "color-mix(in srgb, var(--theme-accent) 22%, var(--theme-border))"
          : "var(--theme-border)",
      }}
    >
      <div className="mb-3">
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: accent ? "var(--theme-accent)" : "var(--theme-text-muted)" }}
        >
          {title}
        </p>
        {hint && (
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--theme-text-muted)" }}>
            {hint}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function numValue(n: number | undefined): string {
  return n != null && n > 0 ? String(n) : "";
}

function todayNumValue(n: number | undefined): string {
  if (n === undefined) return "";
  return String(n);
}

export function GeoRowEditor({
  row,
  locale,
  periodType,
  anchorDate,
  canRemove,
  t,
  inputClass,
  inputStyle,
  onChange,
  onRemove,
}: GeoRowEditorProps) {
  const tEst = useTranslations("admin");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const code = normalizeGeoCode(row.geo);
  const isCustom = code.length > 0 && !isPresetGeo(code);
  const configured = isGeoRowConfigured(row);
  const name = (c: string) => getCountryName(c, locale);
  const displayName = configured
    ? row.geoLabel?.trim() || (isPresetGeo(code) ? name(code) : code)
    : t("newGeoTitle");

  const listItems = useMemo(() => {
    const q = search.trim();
    if (q) return filterGeoCodes(q, locale);
    // No seeded “popular” geos — keep the picker empty until the user searches.
    return POPULAR_GEO_CODES.length ? [...POPULAR_GEO_CODES] : [];
  }, [search, locale]);

  function selectCountry(preset: string) {
    onChange({ geo: preset, geoLabel: name(preset) });
    setSearch("");
    setPickerOpen(false);
  }

  function enableCustom() {
    onChange({ geo: "", geoLabel: row.geoLabel });
    setSearch("");
    setPickerOpen(true);
  }

  function parseNum(raw: string): number {
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  const estimate = useMemo(() => {
    if (!isGeoRowConfigured(row)) return null;
    const anchorIso = anchorDate > todayISO() ? todayISO() : anchorDate;
    const dates = getSpreadDates(new Date(`${anchorIso}T00:00:00`), periodType);
    const series = spreadGeoDailySeries(
      dates,
      { leads: row.leads, invalids: row.invalids, deposits: row.deposits },
      `preview-${row.geo}`,
      row,
    );
    const leads = series.reduce((a, d) => a + d.leads, 0);
    const deposits = series.reduce((a, d) => a + d.deposits, 0);
    const invalids = series.reduce((a, d) => a + d.invalids, 0);
    const activeDays = series.filter((d) => !d.inactive).length;
    const { cr } = calcMetrics(leads, invalids, deposits);
    return { leads, deposits, invalids, cr, activeDays, days: dates.length };
  }, [row, periodType, anchorDate]);

  const usesPeriodBudget = row.periodLeads != null && row.periodLeads > 0;

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: configured
          ? "var(--theme-border)"
          : "color-mix(in srgb, var(--theme-accent) 35%, var(--theme-border))",
        backgroundColor: "var(--theme-bg-card)",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "color-mix(in srgb, var(--theme-border) 18%, transparent)",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          {configured ? (
            <CountryFlag
              code={code}
              className="h-8 w-11 shrink-0 rounded-[4px]"
              title={displayName}
            />
          ) : (
            <div
              className="flex h-8 w-11 shrink-0 items-center justify-center rounded-[4px] border border-dashed text-xs font-medium"
              style={{ borderColor: "var(--theme-border)", color: "var(--theme-text-muted)" }}
            >
              ?
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
              {configured ? code : t("geoSelectPlaceholder")}
              {isCustom ? ` · ${t("customGeo")}` : ""}
            </p>
          </div>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-400 transition-opacity hover:opacity-80"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">{t("removeGeo")}</span>
          </button>
        )}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--theme-text-muted)" }}>
              {t("geo")}
            </label>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className={`${inputClass} flex w-full items-center justify-between gap-2 text-left`}
              style={inputStyle}
            >
              <span className="flex min-w-0 items-center gap-2 truncate">
                {code && isPresetGeo(code) ? (
                  <>
                    <CountryFlag code={code} className="h-4 w-6 shrink-0 rounded-[2px]" />
                    <span className="truncate">
                      {code} — {row.geoLabel?.trim() || name(code)}
                    </span>
                  </>
                ) : isCustom ? (
                  t("customGeo")
                ) : (
                  <span style={{ color: "var(--theme-text-muted)" }}>{t("geoSelectPlaceholder")}</span>
                )}
              </span>
              <ChevronDown
                size={16}
                className={`shrink-0 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--theme-text-muted)" }}
              />
            </button>

            {pickerOpen && (
              <div
                className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border shadow-xl"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-bg-card)",
                }}
              >
                <div className="border-b p-2" style={{ borderColor: "var(--theme-border)" }}>
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--theme-text-muted)" }}
                    />
                    <input
                      type="search"
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("geoSearchPlaceholder")}
                      className={`${inputClass} py-2 pl-8 text-sm`}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {!search.trim() && (
                    <p className="px-3 py-2 text-[11px]" style={{ color: "var(--theme-text-muted)" }}>
                      {t("geoPopularHint")}
                    </p>
                  )}
                  {listItems.length === 0 ? (
                    <p className="px-3 py-4 text-xs" style={{ color: "var(--theme-text-muted)" }}>
                      {t("geoSearchEmpty")}
                    </p>
                  ) : (
                    listItems.map((preset) => {
                      const selected = code === preset;
                      const country = name(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => selectCountry(preset)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                          style={{
                            backgroundColor: selected
                              ? "color-mix(in srgb, var(--theme-accent) 14%, transparent)"
                              : "transparent",
                          }}
                        >
                          <CountryFlag code={preset} className="h-4 w-6 shrink-0 rounded-[2px]" />
                          <span className="w-8 shrink-0 font-semibold">{preset}</span>
                          <span className="truncate" style={{ color: "var(--theme-text-muted)" }}>
                            {country}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t p-2" style={{ borderColor: "var(--theme-border)" }}>
                  <button
                    type="button"
                    onClick={enableCustom}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs"
                    style={{ color: "var(--theme-text-muted)" }}
                  >
                    {t("customGeo")}…
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--theme-text-muted)" }}>
              {t("geoLabel")}
            </label>
            <input
              type="text"
              value={
                isCustom
                  ? (row.geoLabel ?? "")
                  : (row.geoLabel ?? (isPresetGeo(code) ? name(code) : ""))
              }
              onChange={(e) => onChange({ geoLabel: e.target.value || null })}
              placeholder={t("geoLabelPlaceholder")}
              className={inputClass}
              style={inputStyle}
              maxLength={100}
              disabled={!code && !isCustom}
            />
          </div>

          {isCustom && (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--theme-text-muted)" }}>
                {t("geoCode")}
              </label>
              <input
                type="text"
                value={row.geo}
                onChange={(e) => onChange({ geo: normalizeGeoCode(e.target.value) })}
                placeholder={t("customGeoPlaceholder")}
                className={inputClass}
                style={inputStyle}
                maxLength={10}
                required
              />
            </div>
          )}
        </div>

        <Section title={t("monthDayBase")} hint={t("monthDayBaseHint")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("leads")} inputClass={inputClass} inputStyle={inputStyle}>
              <input
                type="number"
                min={0}
                value={numValue(row.leads)}
                placeholder="0"
                onChange={(e) => onChange({ leads: parseNum(e.target.value) })}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <Field label={t("invalids")} inputClass={inputClass} inputStyle={inputStyle}>
              <input
                type="number"
                min={0}
                max={row.periodLeads && row.leads === 0 ? 100 : row.leads || undefined}
                value={numValue(row.invalids)}
                placeholder={row.periodLeads && row.leads === 0 ? "%" : "0"}
                onChange={(e) => onChange({ invalids: parseNum(e.target.value) })}
                className={inputClass}
                style={inputStyle}
              />
              {row.periodLeads != null && row.periodLeads > 0 && row.leads === 0 && (
                <p className="mt-1 text-[10px]" style={{ color: "var(--theme-text-muted)" }}>
                  {t("invalidPercentHint")}
                </p>
              )}
            </Field>
            <Field label={t("deposits")} inputClass={inputClass} inputStyle={inputStyle}>
              <input
                type="number"
                min={0}
                value={numValue(row.deposits)}
                placeholder="0"
                onChange={(e) => onChange({ deposits: parseNum(e.target.value) })}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <Field label={t("buyersPerGeo")} inputClass={inputClass} inputStyle={inputStyle}>
              <input
                type="number"
                min={1}
                max={20}
                value={row.buyerCount ?? 5}
                onChange={(e) => onChange({ buyerCount: parseNum(e.target.value) || 5 })}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
          </div>
        </Section>

        <Section title={t("todayMetrics")} hint={t("todayMetricsHint")} accent>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px]" style={{ color: "var(--theme-text-muted)" }}>
              {row.todayLeads === 0 ? t("todayZeroActive") : ""}
            </span>
            <button
              type="button"
              onClick={() => onChange(zeroTodayMetrics())}
              className="rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--theme-border)", color: "var(--theme-accent)" }}
            >
              {t("todayZeroButton")}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("leads")} inputClass={inputClass} inputStyle={inputStyle}>
              <input
                type="number"
                min={0}
                value={todayNumValue(row.todayLeads)}
                placeholder={String(row.leads)}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    onChange({
                      todayLeads: undefined,
                      todayInvalids: undefined,
                      todayDeposits: undefined,
                    });
                    return;
                  }
                  const n = parseNum(raw);
                  onChange(
                    n === 0
                      ? zeroTodayMetrics()
                      : { todayLeads: n, todayInvalids: undefined, todayDeposits: undefined },
                  );
                }}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <Field label={t("invalids")} inputClass={inputClass} inputStyle={inputStyle}>
              <input
                type="number"
                min={0}
                value={todayNumValue(row.todayInvalids)}
                placeholder={row.todayLeads === 0 ? "0" : String(row.invalids)}
                onChange={(e) =>
                  onChange({
                    todayInvalids: e.target.value === "" ? undefined : parseNum(e.target.value),
                  })
                }
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <Field label={t("deposits")} inputClass={inputClass} inputStyle={inputStyle}>
              <input
                type="number"
                min={0}
                value={todayNumValue(row.todayDeposits)}
                placeholder={row.todayLeads === 0 ? "0" : String(row.deposits)}
                onChange={(e) =>
                  onChange({
                    todayDeposits: e.target.value === "" ? undefined : parseNum(e.target.value),
                  })
                }
                className={inputClass}
                style={inputStyle}
              />
            </Field>
          </div>
        </Section>

        <Section title={t("geoGeneration")} hint={t("geoGenerationHint")}>
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--theme-border)" }}>
              <input
                type="checkbox"
                checked={row.skipWeekends ?? false}
                onChange={(e) => onChange({ skipWeekends: e.target.checked })}
                className="accent-[var(--theme-accent)]"
              />
              <span>{t("skipWeekends")}</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("depositSchedule")} inputClass={inputClass} inputStyle={inputStyle}>
                <select
                  value={row.depositSchedule ?? "daily"}
                  onChange={(e) =>
                    onChange({
                      depositSchedule: e.target.value as "daily" | "alternate" | "random",
                    })
                  }
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="daily">{t("depositDaily")}</option>
                  <option value="alternate">{t("depositAlternate")}</option>
                  <option value="random">{t("depositRandom")}</option>
                </select>
              </Field>
              <Field label={t("crBasis")} inputClass={inputClass} inputStyle={inputStyle}>
                <select
                  value={row.crBasis ?? "leads"}
                  onChange={(e) =>
                    onChange({ crBasis: e.target.value as "leads" | "valids" })
                  }
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="leads">{t("crByLeads")}</option>
                  <option value="valids">{t("crByValids")}</option>
                </select>
              </Field>
              <Field label={t("targetCr")} inputClass={inputClass} inputStyle={inputStyle}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={row.targetCr ?? ""}
                  onChange={(e) =>
                    onChange({
                      targetCr: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="4"
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <Field label={t("periodLeads")} inputClass={inputClass} inputStyle={inputStyle}>
                <input
                  type="number"
                  min={0}
                  value={row.periodLeads ?? ""}
                  onChange={(e) =>
                    onChange({
                      periodLeads: e.target.value === "" ? undefined : parseNum(e.target.value),
                    })
                  }
                  placeholder="300"
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
            </div>
          </div>
        </Section>

        {estimate && (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: usesPeriodBudget
                ? "color-mix(in srgb, var(--theme-accent) 40%, var(--theme-border))"
                : "color-mix(in srgb, #f59e0b 45%, var(--theme-border))",
              backgroundColor: usesPeriodBudget
                ? "color-mix(in srgb, var(--theme-accent) 8%, transparent)"
                : "color-mix(in srgb, #f59e0b 10%, transparent)",
            }}
          >
            <p className="font-medium" style={{ color: "var(--theme-text)" }}>
              {tEst("geoEstimateTitle")}: ~{estimate.leads} {t("leads").toLowerCase()}, ~{estimate.deposits}{" "}
              {t("deposits").toLowerCase()}, CR {estimate.cr}%
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--theme-text-muted)" }}>
              {usesPeriodBudget
                ? tEst("geoEstimatePeriod", {
                    days: estimate.activeDays,
                    total: row.periodLeads ?? estimate.leads,
                  })
                : tEst("geoEstimateDaily", {
                    base: row.leads,
                    days: estimate.activeDays,
                    total: estimate.leads,
                  })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  inputClass: string;
  inputStyle: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--theme-text-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
