"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DatePicker } from "@/components/layout/DatePicker";
import { GeoRowEditor } from "@/components/admin/GeoRowEditor";
import { PageCard } from "@/components/ui/PageCard";
import { calcMetrics } from "@/lib/calculations";
import { normalizeGeoCode } from "@/lib/geo-presets";
import { getCountryName } from "@/lib/country-names";
import { parseOffersInput, parseTemplateOffers } from "@/lib/offers";
import { todayISO } from "@/lib/date-utils";
import { estimateAllGeosPeriod } from "@/lib/geo-spread";
import { getSpreadDates, getSpreadDayCount } from "@/lib/period-spread";
import type { PeriodType } from "@/types/stats";
import type { ThemeVariant } from "@/lib/themes";
import type { GeoConfig } from "@/types/geo-config";
import { createEmptyGeoRow, getGeoTodayMetrics, isGeoRowConfigured, serializeGeoForApi, validateGeoRow, validateGeoToday } from "@/types/geo-config";

interface AdminDataViewProps {
  locale: string;
  themeVariant: ThemeVariant;
}

interface Template {
  id: string;
  name: string;
  geo: string;
  geoLabel: string | null;
  geoCodes?: string[];
  geos?: GeoConfig[];
  buyerCount?: number;
  totalLeads?: number;
  periodType: string;
  anchorDate: string;
  leads: number;
  valids: number;
  invalids: number;
  deposits: number;
  offerName: string;
  offers?: string[];
  cr: number;
  invalidPercent: number;
  isActive: boolean;
}

const EMPTY_GEOS: GeoConfig[] = [createEmptyGeoRow()];

interface RecentEntry {
  id: string;
  date: string;
  periodType: string;
  geo: string;
  leads: number;
  valids: number;
  invalids: number;
  deposits: number;
  cr: number;
  invalidPercent: number;
}

export function AdminDataView({
  locale,
  themeVariant,
}: AdminDataViewProps) {
  const t = useTranslations("admin");

  const [message, setMessage] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");

  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [date, setDate] = useState(todayISO());
  const [geoRows, setGeoRows] = useState<GeoConfig[]>(EMPTY_GEOS);
  const [offersText, setOffersText] = useState("");

  const dayCount = getSpreadDayCount(periodType);

  const periodHelpKey =
    periodType === "day"
      ? "periodDayHelp"
      : periodType === "week"
        ? "periodWeekHelp"
        : "periodMonthHelp";

  const totals = useMemo(
    () =>
      geoRows.reduce(
        (acc, g) => ({
          leads: acc.leads + g.leads,
          invalids: acc.invalids + g.invalids,
          deposits: acc.deposits + g.deposits,
        }),
        { leads: 0, invalids: 0, deposits: 0 },
      ),
    [geoRows],
  );

  const todayTotals = useMemo(
    () =>
      geoRows.reduce(
        (acc, g) => {
          const m = getGeoTodayMetrics(g);
          return {
            leads: acc.leads + m.leads,
            invalids: acc.invalids + m.invalids,
            deposits: acc.deposits + m.deposits,
          };
        },
        { leads: 0, invalids: 0, deposits: 0 },
      ),
    [geoRows],
  );

  const preview = useMemo(
    () => calcMetrics(totals.leads, totals.invalids, totals.deposits),
    [totals],
  );

  const todayPreview = useMemo(
    () => calcMetrics(todayTotals.leads, todayTotals.invalids, todayTotals.deposits),
    [todayTotals],
  );

  const periodEstimate = useMemo(() => {
    const anchorIso = date > todayISO() ? todayISO() : date;
    const anchor = new Date(anchorIso + "T00:00:00");
    const dates = getSpreadDates(anchor, periodType);
    return estimateAllGeosPeriod(geoRows, dates);
  }, [geoRows, periodType, date]);

  const loadRecent = useCallback(async () => {
    const res = await fetch("/api/stats/entries");
    if (res.ok) setRecent(await res.json());
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates ?? []);
    }
  }, []);

  useEffect(() => {
    loadRecent();
    loadTemplates();
  }, [loadRecent, loadTemplates]);

  function loadTemplateToForm(tpl: Template) {
    setEditingId(tpl.id);
    setTemplateName(tpl.name);
    setPeriodType(tpl.periodType as PeriodType);
    setDate(tpl.anchorDate.slice(0, 10));
    setGeoRows(
      tpl.geos && tpl.geos.length > 0
        ? tpl.geos.map((g) => ({
            ...g,
            geoLabel: g.geoLabel ?? getCountryName(g.geo, locale),
            buyerCount: g.buyerCount ?? tpl.buyerCount ?? 5,
          }))
        : [
            {
              geo: tpl.geo,
              geoLabel: tpl.geoLabel,
              leads: tpl.leads,
              invalids: tpl.invalids,
              deposits: tpl.deposits,
              buyerCount: tpl.buyerCount ?? 5,
            },
          ],
    );
    setOffersText(
      (tpl.offers ?? parseTemplateOffers(tpl)).join("\n"),
    );
  }

  function resetForm() {
    setEditingId(null);
    setTemplateName("");
    setPeriodType("month");
    setDate(todayISO());
    setGeoRows([createEmptyGeoRow()]);
    setOffersText("");
  }

  function normalizeGeoCodeLocal(raw: string): string {
    return normalizeGeoCode(raw);
  }

  function updateGeoRow(index: number, patch: Partial<GeoConfig>) {
    setGeoRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addGeoRow() {
    setGeoRows((rows) => [...rows, createEmptyGeoRow()]);
  }

  function removeGeoRow(index: number) {
    setGeoRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e: FormEvent, apply = false) {
    e.preventDefault();
    setMessage(null);

    if (geoRows.some((g) => !isGeoRowConfigured(g))) {
      setMessage(t("geoRequired"));
      return;
    }

    if (geoRows.some((g) => !validateGeoRow(g))) {
      setMessage(t("error"));
      return;
    }

    if (geoRows.some((g) => !validateGeoToday(g))) {
      setMessage(t("error"));
      return;
    }

    const anchorDate = date > todayISO() ? todayISO() : date;
    const first = geoRows[0];

    const res = await fetch("/api/stats/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodType,
        date: anchorDate,
        geo: first.geo.toUpperCase(),
        leads: todayTotals.leads,
        invalids: todayTotals.invalids,
        deposits: todayTotals.deposits,
        offerName: parseOffersInput(offersText)[0] ?? null,
      }),
    });

    if (!res.ok) {
      setMessage(t("error"));
      return;
    }

    if (templateName.trim()) {
      const tplRes = await fetch(
        editingId ? `/api/templates/${editingId}` : "/api/templates",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName.trim(),
            geo: first.geo.toUpperCase(),
            geoLabel: first.geoLabel?.trim() || null,
            periodType,
            date: anchorDate,
            leads: todayTotals.leads,
            invalids: todayTotals.invalids,
            deposits: todayTotals.deposits,
            geos: geoRows.map((g) => serializeGeoForApi(g, normalizeGeoCodeLocal)),
            offers: parseOffersInput(offersText),
            apply,
          }),
        },
      );
      if (!tplRes.ok) {
        setMessage(t("templateError"));
        return;
      }
    } else if (apply) {
      setMessage(t("templateNameRequired"));
      return;
    }

    setMessage(t("success"));
    loadRecent();
    loadTemplates();
    if (!editingId) resetForm();
  }

  async function applyTemplate(id: string) {
    setMessage(null);
    const res = await fetch(`/api/templates/${id}/apply`, { method: "POST" });
    if (res.ok) {
      setMessage(t("templateApplied"));
      loadTemplates();
      loadRecent();
    } else {
      setMessage(t("error"));
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    loadTemplates();
    loadRecent();
  }

  const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
  const inputStyle = {
    backgroundColor: "var(--theme-bg-card)",
    borderColor: "var(--theme-border)",
    color: "var(--theme-text)",
  };

  return (
    <DashboardShell
      locale={locale}
      themeVariant={themeVariant}
      title={t("title")}
      showFilters={false}
    >
      <p className="mb-6 text-sm" style={{ color: "var(--theme-text-muted)" }}>
        {t("subtitle")}
      </p>

      {/* Templates */}
      <PageCard title={t("templates")} className="mb-8">
        {templates.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
            {t("noTemplates")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl border p-5"
                style={{
                  borderColor: tpl.isActive
                    ? "var(--theme-accent)"
                    : "var(--theme-border)",
                  backgroundColor: "color-mix(in srgb, var(--theme-bg) 35%, transparent)",
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{tpl.name}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--theme-text-muted)" }}>
                      {(tpl.geoCodes ?? [tpl.geo]).join(", ")} · {tpl.periodType} ·{" "}
                      {tpl.totalLeads ?? tpl.leads} {t("leads").toLowerCase()}/{t("dailyMetrics").toLowerCase()}
                    </p>
                  </div>
                  {tpl.isActive && (
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--theme-accent) 20%, transparent)",
                        color: "var(--theme-accent)",
                      }}
                    >
                      {t("active")}
                    </span>
                  )}
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                  <div>CR: <strong>{tpl.cr}%</strong></div>
                  <div>FTD: <strong>{tpl.deposits}</strong></div>
                  <div>{t("invalidPercent")}: <strong>{tpl.invalidPercent}%</strong></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate(tpl.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-black"
                    style={{ backgroundColor: "var(--theme-accent)" }}
                  >
                    <Play size={12} />
                    {t("applyTemplate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => loadTemplateToForm(tpl)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"
                    style={{ borderColor: "var(--theme-border)" }}
                  >
                    <Pencil size={12} />
                    {t("edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(tpl.id)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-red-400"
                    style={{ borderColor: "var(--theme-border)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      {/* Form */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="mb-8">
        <PageCard>
        <div className="grid gap-6">
        <div>
          <label className="mb-1.5 block text-sm">{t("templateName")}</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={t("templateNameHint")}
            className={inputClass}
            style={inputStyle}
            maxLength={100}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm">{t("periodType")}</label>
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="month">{t("periodMonth")}</option>
            <option value="week">{t("periodWeek")}</option>
            <option value="day">{t("periodDay")}</option>
          </select>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--theme-text-muted)" }}>
            {t(periodHelpKey)}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm">{t("todayDate")}</label>
          <DatePicker value={date} onChange={setDate} max={todayISO()} />
          <p className="mt-2 text-xs" style={{ color: "var(--theme-text-muted)" }}>
            {t("todayDateHint")}
          </p>
        </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">{t("geosSection")}</h3>
              <p className="mt-1 text-xs" style={{ color: "var(--theme-text-muted)" }}>
                {t("monthSpreadHint")} · {dayCount}{" "}
                {periodType === "day" ? t("periodDay").toLowerCase() : "дн."}
              </p>
            </div>
            <button
              type="button"
              onClick={addGeoRow}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--theme-border)", color: "var(--theme-accent)" }}
            >
              <Plus size={14} />
              {t("addGeo")}
            </button>
          </div>

          <div className="space-y-5">
            {geoRows.map((row, index) => (
              <GeoRowEditor
                key={index}
                row={row}
                locale={locale}
                periodType={periodType}
                anchorDate={date}
                canRemove={geoRows.length > 1}
                t={t}
                inputClass={inputClass}
                inputStyle={inputStyle}
                onChange={(patch) => updateGeoRow(index, patch)}
                onRemove={() => removeGeoRow(index)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm">{t("offerName")}</label>
          <textarea
            value={offersText}
            onChange={(e) => setOffersText(e.target.value)}
            placeholder={t("offersHint")}
            className={`${inputClass} min-h-[88px] resize-y`}
            style={inputStyle}
            rows={3}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">{t("offerNameHint")}</p>
        </div>

        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--theme-border)" }}
        >
          <p className="mb-3 text-sm font-medium">{t("totalSummary")} — {t("monthDayBase")}</p>
          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <div>{t("leads")}: <strong>{totals.leads}</strong></div>
            <div>{t("deposits")}: <strong>{totals.deposits}</strong></div>
            <div>{t("invalids")}: <strong>{totals.invalids}</strong></div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <span style={{ color: "var(--theme-text-muted)" }}>{t("valids")}: </span>
              <strong>{preview.valids}</strong>
            </div>
            <div>
              <span style={{ color: "var(--theme-text-muted)" }}>CR: </span>
              <strong>{preview.cr}%</strong>
            </div>
          </div>
          {dayCount > 1 && (
            <div
              className="mb-4 rounded-lg border px-4 py-3 text-sm"
              style={{ borderColor: "var(--theme-border)", color: "var(--theme-text-muted)" }}
            >
              <span className="font-medium" style={{ color: "var(--theme-text)" }}>
                {t("periodEstimate")} ({dayCount}
                {periodEstimate.activeDays > 0 && periodEstimate.activeDays !== dayCount
                  ? `, ${t("activeDays")} ${periodEstimate.activeDays}`
                  : ""}
                ):
              </span>{" "}
              {t("leads")} ~{periodEstimate.leads}, {t("deposits")} ~{periodEstimate.deposits}
              {geoRows.some((g) => g.periodLeads != null && g.periodLeads > 0) && (
                <span className="mt-1 block text-xs">{t("periodLeadsHint")}</span>
              )}
            </div>
          )}

          <p className="mb-3 text-sm font-medium">{t("totalSummary")} — {t("todayMetrics")}</p>
          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <div>{t("leads")}: <strong>{todayTotals.leads}</strong></div>
            <div>{t("deposits")}: <strong>{todayTotals.deposits}</strong></div>
            <div>{t("invalids")}: <strong>{todayTotals.invalids}</strong></div>
          </div>
          <p className="mb-2 text-sm font-medium">{t("calculated")} ({t("todayMetrics")})</p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <span style={{ color: "var(--theme-text-muted)" }}>{t("valids")}: </span>
              <strong>{todayPreview.valids}</strong>
            </div>
            <div>
              <span style={{ color: "var(--theme-text-muted)" }}>CR: </span>
              <strong>{todayPreview.cr}%</strong>
            </div>
            <div>
              <span style={{ color: "var(--theme-text-muted)" }}>{t("invalidPercent")}: </span>
              <strong>{todayPreview.invalidPercent}%</strong>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {message && (
            <p
              className={`w-full text-sm ${message.includes("Ошибка") || message.includes("failed") || message.includes("Error") ? "text-red-400" : "text-green-400"}`}
            >
              {message}
            </p>
          )}
          <button
            type="submit"
            className="rounded-lg px-6 py-2.5 text-sm font-medium text-black"
            style={{ backgroundColor: "var(--theme-accent)" }}
          >
            {t("submit")}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}
            className="inline-flex items-center gap-1 rounded-lg border px-6 py-2.5 text-sm font-medium"
            style={{ borderColor: "var(--theme-accent)", color: "var(--theme-accent)" }}
          >
            <Check size={14} />
            {t("saveAndApply")}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg px-4 py-2.5 text-sm"
              style={{ color: "var(--theme-text-muted)" }}
            >
              {t("cancelEdit")}
            </button>
          )}
        </div>
        </div>
        </PageCard>
      </form>

      <PageCard title={t("recentEntries")}>
        <div
          className="overflow-x-auto rounded-xl border"
          style={{ borderColor: "var(--theme-border)" }}
        >
          <table className="w-full min-w-[720px] text-sm">
            <thead style={{ backgroundColor: "var(--theme-bg-card)" }}>
              <tr style={{ color: "var(--theme-text-muted)" }}>
                <th className="px-4 py-3 text-left">{t("date")}</th>
                <th className="px-4 py-3 text-left">{t("periodType")}</th>
                <th className="px-4 py-3 text-left">{t("geo")}</th>
                <th className="px-4 py-3 text-right">{t("leads")}</th>
                <th className="px-4 py-3 text-right">{t("valids")}</th>
                <th className="px-4 py-3 text-right">{t("deposits")}</th>
                <th className="px-4 py-3 text-right">CR</th>
                <th className="px-4 py-3 text-right">{t("invalidPercent")}</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ color: "var(--theme-text-muted)" }}>
                    —
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--theme-border)" }}>
                    <td className="px-4 py-2">{r.date.slice(0, 10)}</td>
                    <td className="px-4 py-2">{r.periodType}</td>
                    <td className="px-4 py-2">{r.geo}</td>
                    <td className="px-4 py-2 text-right">{r.leads}</td>
                    <td className="px-4 py-2 text-right">{r.valids}</td>
                    <td className="px-4 py-2 text-right">{r.deposits}</td>
                    <td className="px-4 py-2 text-right">{r.cr}%</td>
                    <td className="px-4 py-2 text-right">{r.invalidPercent}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageCard>
    </DashboardShell>
  );
}
