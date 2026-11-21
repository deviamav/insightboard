"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Check,
  ChevronLeft,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CountryFlag } from "@/components/ui/CountryFlag";
import type { ThemeVariant } from "@/lib/themes";
import { getTheme } from "@/lib/themes";
import type { PayoutModel } from "@/lib/offers-catalog";

interface OffersViewProps {
  locale: string;
  themeVariant: ThemeVariant;
}

interface OfferRow {
  id: string;
  geo: string;
  title: string | null;
  payoutModel: PayoutModel;
  price: number;
  testPrice: number | null;
  crMin: number | null;
  crMax: number | null;
  crNote: string | null;
  funnels: string[];
  sources: string[];
  lpdMin: number | null;
  lpdMax: number | null;
  notes: string | null;
  sortOrder: number;
}

interface FunnelRow {
  id: string;
  name: string;
  geo: string | null;
  fileCount: number;
}

const GEO_EMOJI: Record<string, string> = {
  KZ: "🇰🇿",
  KG: "🇰🇬",
  RO: "🇷🇴",
  TR: "🇹🇷",
  UZ: "🇺🇿",
  UA: "🇺🇦",
  PL: "🇵🇱",
  DE: "🇩🇪",
  US: "🇺🇸",
  GB: "🇬🇧",
  IN: "🇮🇳",
  BR: "🇧🇷",
  MX: "🇲🇽",
  PH: "🇵🇭",
  GE: "🇬🇪",
  AR: "🇦🇷",
  ID: "🇮🇩",
  TH: "🇹🇭",
  VN: "🇻🇳",
  PK: "🇵🇰",
  EG: "🇪🇬",
  CN: "🇨🇳",
};

const SOURCE_PRESETS = ["Facebook", "Google", "TikTok", "Native", "UAC"];
const MODELS: PayoutModel[] = ["CPL", "CPA", "CRG"];

type FormState = {
  geo: string;
  title: string;
  payoutModel: PayoutModel;
  price: string;
  testPrice: string;
  cr: string;
  lpd: string;
  sources: string[];
  funnelIds: string[];
  notes: string;
};

const emptyForm = (): FormState => ({
  geo: "",
  title: "",
  payoutModel: "CPL",
  price: "",
  testPrice: "",
  cr: "",
  lpd: "",
  sources: [],
  funnelIds: [],
  notes: "",
});

function formatCr(o: OfferRow): string {
  if (o.crNote) return o.crNote.includes("%") ? o.crNote : o.crNote;
  if (o.crMin != null && o.crMax != null && o.crMin !== o.crMax) {
    return `${o.crMin}-${o.crMax}%`;
  }
  if (o.crMin != null) return `${o.crMin}%`;
  if (o.crMax != null) return `${o.crMax}%`;
  return "";
}

function formatLpd(o: OfferRow): string {
  if (o.lpdMin != null && o.lpdMax != null) return `${o.lpdMin}-${o.lpdMax}`;
  if (o.lpdMin != null) return String(o.lpdMin);
  if (o.lpdMax != null) return String(o.lpdMax);
  return "";
}

function parseCrNote(raw: string): {
  crNote: string | null;
  crMin: number | null;
  crMax: number | null;
} {
  const s = raw.trim();
  if (!s) return { crNote: null, crMin: null, crMax: null };
  const crNote = s.includes("%") ? s : `${s}%`;
  const m = s.replace(/%/g, "").match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (m) {
    return { crNote, crMin: Number(m[1]), crMax: Number(m[2]) };
  }
  const single = s.replace(/%/g, "").match(/^(\d+(?:\.\d+)?)$/);
  if (single) {
    const n = Number(single[1]);
    return { crNote, crMin: n, crMax: n };
  }
  return { crNote, crMin: null, crMax: null };
}

function parseLpd(raw: string): { lpdMin: number | null; lpdMax: number | null } {
  const s = raw.trim();
  if (!s) return { lpdMin: null, lpdMax: null };
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return { lpdMin: Number(m[1]), lpdMax: Number(m[2]) };
  const n = Number(s);
  if (Number.isFinite(n)) return { lpdMin: n, lpdMax: n };
  return { lpdMin: null, lpdMax: null };
}

function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveOfferFunnels(
  refs: string[],
  catalog: FunnelRow[],
): Array<{ id: string | null; name: string; funnel: FunnelRow | null }> {
  return refs.map((ref) => {
    const byId = catalog.find((f) => f.id === ref);
    if (byId) return { id: byId.id, name: byId.name, funnel: byId };
    const byName = catalog.find((f) => normName(f.name) === normName(ref));
    if (byName) return { id: byName.id, name: byName.name, funnel: byName };
    return { id: null, name: ref, funnel: null };
  });
}

function funnelIdsFromOffer(o: OfferRow, catalog: FunnelRow[]): string[] {
  return resolveOfferFunnels(o.funnels, catalog)
    .map((x) => x.id)
    .filter((id): id is string => Boolean(id));
}

export function formatOfferForPartners(
  o: OfferRow,
  funnelNames?: string[],
): string {
  const flag = GEO_EMOJI[o.geo.toUpperCase()] ?? "";
  const cr = formatCr(o);
  const names =
    funnelNames ??
    o.funnels; /* fallback raw refs if names not resolved */

  let line1 = `${flag}${o.geo} ${o.payoutModel} ${o.price}$`;
  if (cr) line1 += ` ${cr}`;
  if (o.testPrice != null) line1 += ` (${o.testPrice}$ на тест)`;

  const lines = [line1];
  if (names.length > 0) lines.push(`Funnel: ${names.join(", ")}`);
  if (o.sources.length > 0) lines.push(`Source: ${o.sources.join("+")}`);
  const lpd = formatLpd(o);
  if (lpd) lines.push(`LPD ${lpd}`);
  if (o.notes?.trim()) lines.push(o.notes.trim());
  return lines.join("\n");
}

export function OffersView({ locale, themeVariant }: OffersViewProps) {
  const t = useTranslations("offersPage");
  const theme = getTheme(themeVariant);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [funnelsCatalog, setFunnelsCatalog] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<OfferRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [offersRes, funnelsRes] = await Promise.all([
      fetch("/api/offers"),
      fetch("/api/funnels"),
    ]);
    if (offersRes.ok) {
      const data = await offersRes.json();
      setOffers(data.offers ?? []);
    }
    if (funnelsRes.ok) {
      const data = await funnelsRes.json();
      setFunnelsCatalog(data.funnels ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sorted = useMemo(
    () =>
      [...offers].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.geo.localeCompare(b.geo),
      ),
    [offers],
  );

  const selected = useMemo(
    () => sorted.find((o) => o.id === selectedId) ?? null,
    [sorted, selectedId],
  );

  const matchedFunnels = useMemo(() => {
    if (!selected) return [];
    return resolveOfferFunnels(selected.funnels, funnelsCatalog);
  }, [selected, funnelsCatalog]);

  const formFunnels = useMemo(() => {
    const geo = form.geo.trim().toUpperCase();
    if (!geo) return funnelsCatalog;
    const sameGeo = funnelsCatalog.filter(
      (f) => !f.geo || f.geo.toUpperCase() === geo,
    );
    return sameGeo.length > 0 ? sameGeo : funnelsCatalog;
  }, [funnelsCatalog, form.geo]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setCreating(true);
  }

  function openEdit(o: OfferRow) {
    setCreating(false);
    setEditing(o);
    setForm({
      geo: o.geo,
      title: o.title ?? "",
      payoutModel: o.payoutModel ?? "CPL",
      price: String(o.price),
      testPrice: o.testPrice != null ? String(o.testPrice) : "",
      cr: formatCr(o).replace(/%$/, "") || o.crNote || "",
      lpd: formatLpd(o),
      sources: [...o.sources],
      funnelIds: funnelIdsFromOffer(o, funnelsCatalog),
      notes: o.notes ?? "",
    });
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  function toggleSource(s: string) {
    setForm((f) => ({
      ...f,
      sources: f.sources.includes(s)
        ? f.sources.filter((x) => x !== s)
        : [...f.sources, s],
    }));
  }

  function toggleFunnel(id: string) {
    setForm((f) => ({
      ...f,
      funnelIds: f.funnelIds.includes(id)
        ? f.funnelIds.filter((x) => x !== id)
        : [...f.funnelIds, id],
    }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const cr = parseCrNote(form.cr);
    const lpd = parseLpd(form.lpd);
    const payload = {
      id: editing?.id,
      geo: form.geo,
      title: form.title || null,
      payoutModel: form.payoutModel,
      price: Number(form.price),
      testPrice: form.testPrice === "" ? null : Number(form.testPrice),
      crMin: cr.crMin,
      crMax: cr.crMax,
      crNote: cr.crNote,
      funnels: form.funnelIds,
      sources: form.sources,
      lpdMin: lpd.lpdMin,
      lpdMax: lpd.lpdMax,
      notes: form.notes || null,
    };

    try {
      const res = await fetch("/api/offers", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        closeModal();
        await load();
        if (saved?.id) setSelectedId(saved.id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/offers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (selectedId === id) setSelectedId(null);
      await load();
    }
  }

  async function copyPartnerText(o: OfferRow) {
    const names = resolveOfferFunnels(o.funnels, funnelsCatalog).map(
      (x) => x.name,
    );
    const text = formatOfferForPartners(o, names);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const modalOpen = creating || editing != null;
  const inputStyle = {
    backgroundColor: theme.bg,
    borderColor: theme.border,
    color: theme.text,
  } as const;

  const funnelsPath = themeVariant === "alt" ? "/alt/funnels" : "/funnels";

  function Chip({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
        style={{
          borderColor: active ? theme.accent : theme.border,
          backgroundColor: active ? `${theme.accent}22` : "transparent",
          color: active ? theme.accent : theme.textMuted,
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <DashboardShell
      locale={locale}
      themeVariant={themeVariant}
      title={t("title")}
      showFilters={false}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm" style={{ color: theme.textMuted }}>
          {t("subtitle")}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-black"
          style={{ backgroundColor: theme.accent }}
        >
          <Plus size={16} />
          {t("add")}
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: theme.textMuted }}>
          ...
        </p>
      ) : sorted.length === 0 ? (
        <p className="text-sm" style={{ color: theme.textMuted }}>
          {t("empty")}
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className={`space-y-2 ${selected ? "hidden lg:block" : ""}`}>
            {sorted.map((o) => {
              const active = o.id === selectedId;
              const cr = formatCr(o);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
                  style={{
                    backgroundColor: active
                      ? `${theme.accent}14`
                      : theme.bgCard,
                    borderColor: active ? theme.accent : theme.border,
                  }}
                >
                  <CountryFlag
                    code={o.geo}
                    className="h-5 w-7 shrink-0 rounded-sm object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tracking-tight">
                        {o.geo}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
                        style={{
                          backgroundColor: `${theme.accent}22`,
                          color: theme.accent,
                        }}
                      >
                        {o.payoutModel}
                      </span>
                    </div>
                    <div
                      className="mt-0.5 text-sm"
                      style={{ color: theme.accent }}
                    >
                      ${o.price}
                      {cr ? (
                        <span style={{ color: theme.textMuted }}>
                          {" "}
                          · {cr}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className={`rounded-xl border ${!selected ? "hidden lg:block" : ""}`}
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
            }}
          >
            {!selected ? (
              <div
                className="flex min-h-70 items-center justify-center px-6 text-center text-sm"
                style={{ color: theme.textMuted }}
              >
                {t("pickOffer")}
              </div>
            ) : (
              <div>
                <div
                  className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4"
                  style={{ borderColor: theme.border }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 lg:hidden"
                      style={{ color: theme.textMuted }}
                      onClick={() => setSelectedId(null)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <CountryFlag
                      code={selected.geo}
                      className="h-7 w-10 shrink-0 rounded-sm object-cover"
                    />
                    <div>
                      <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
                        <span>
                          {GEO_EMOJI[selected.geo] ?? ""} {selected.geo}
                        </span>
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${theme.accent}22`,
                            color: theme.accent,
                          }}
                        >
                          {selected.payoutModel}
                        </span>
                        {selected.title && (
                          <span
                            className="text-base font-normal"
                            style={{ color: theme.textMuted }}
                          >
                            {selected.title}
                          </span>
                        )}
                      </h2>
                      <p className="mt-1 text-sm">
                        <span style={{ color: theme.accent }}>
                          ${selected.price}
                        </span>
                        {selected.testPrice != null && (
                          <span style={{ color: theme.textMuted }}>
                            {" "}
                            ({selected.testPrice}$ {t("onTest")})
                          </span>
                        )}
                        {formatCr(selected) && (
                          <span style={{ color: theme.textMuted }}>
                            {" "}
                            · CR {formatCr(selected)}
                          </span>
                        )}
                        {formatLpd(selected) && (
                          <span style={{ color: theme.textMuted }}>
                            {" "}
                            · LPD {formatLpd(selected)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void copyPartnerText(selected)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-black"
                      style={{ backgroundColor: theme.accent }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? t("copied") : t("copyPartner")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(selected)}
                      className="rounded-lg border p-2"
                      style={{
                        borderColor: theme.border,
                        color: theme.textMuted,
                      }}
                      title={t("edit")}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(selected.id)}
                      className="rounded-lg border p-2"
                      style={{
                        borderColor: theme.border,
                        color: theme.chartDanger,
                      }}
                      title={t("delete")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 p-5 md:grid-cols-2">
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h3
                        className="text-[11px] font-medium uppercase tracking-wider"
                        style={{ color: theme.textMuted }}
                      >
                        {t("funnels")}
                      </h3>
                      <Link
                        href={funnelsPath}
                        className="text-[11px] font-medium"
                        style={{ color: theme.accent }}
                      >
                        {t("manageFunnels")}
                      </Link>
                    </div>
                    {matchedFunnels.length === 0 ? (
                      <p
                        className="text-sm"
                        style={{ color: theme.textMuted }}
                      >
                        {t("noFunnels")}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {matchedFunnels.map(({ id, name, funnel }) => (
                          <li
                            key={id ?? name}
                            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5"
                            style={{ borderColor: theme.border }}
                          >
                            <span className="text-sm font-medium">{name}</span>
                            {funnel ? (
                              <Link
                                href={funnelsPath}
                                className="inline-flex items-center gap-1 text-xs font-medium"
                                style={{ color: theme.accent }}
                                onClick={() => {
                                  try {
                                    sessionStorage.setItem(
                                      "fs-open-funnel",
                                      funnel.id,
                                    );
                                  } catch {
                                    /* ignore */
                                  }
                                }}
                              >
                                {t("openFunnel")}
                                <ExternalLink size={12} />
                              </Link>
                            ) : (
                              <span
                                className="text-[11px]"
                                style={{ color: theme.textMuted }}
                              >
                                {t("funnelMissing")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="space-y-5">
                    <div>
                      <h3
                        className="mb-2 text-[11px] font-medium uppercase tracking-wider"
                        style={{ color: theme.textMuted }}
                      >
                        {t("sources")}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.sources.length === 0 ? (
                          <span
                            className="text-sm"
                            style={{ color: theme.textMuted }}
                          >
                            —
                          </span>
                        ) : (
                          selected.sources.map((s) => (
                            <span
                              key={s}
                              className="rounded-md border px-2.5 py-1 text-xs"
                              style={{ borderColor: theme.border }}
                            >
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h3
                        className="mb-2 text-[11px] font-medium uppercase tracking-wider"
                        style={{ color: theme.textMuted }}
                      >
                        {t("partnerPreview")}
                      </h3>
                      <pre
                        className="overflow-x-auto rounded-lg border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
                        style={{
                          borderColor: theme.border,
                          backgroundColor: theme.bg,
                          color: theme.text,
                        }}
                      >
                        {formatOfferForPartners(
                          selected,
                          matchedFunnels.map((x) => x.name),
                        )}
                      </pre>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSave}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-5"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="font-medium">
                {editing ? t("edit") : t("add")}
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{ color: theme.textMuted }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    {t("geo")}
                  </label>
                  <input
                    value={form.geo}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        geo: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    required
                    maxLength={10}
                    placeholder="KZ"
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    {t("titleField")}
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    placeholder={t("titleOptional")}
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-2 block text-xs"
                  style={{ color: theme.textMuted }}
                >
                  {t("model")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {MODELS.map((m) => (
                    <Chip
                      key={m}
                      active={form.payoutModel === m}
                      onClick={() =>
                        setForm((f) => ({ ...f, payoutModel: m }))
                      }
                    >
                      {m}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    {t("price")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    {t("testPrice")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.testPrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, testPrice: e.target.value }))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    placeholder="19"
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    CR %
                  </label>
                  <input
                    value={form.cr}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cr: e.target.value }))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    placeholder="3-4"
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: theme.textMuted }}
                >
                  LPD
                </label>
                <input
                  value={form.lpd}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lpd: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                  placeholder="10-15"
                />
              </div>

              <div>
                <label
                  className="mb-2 block text-xs"
                  style={{ color: theme.textMuted }}
                >
                  {t("sources")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_PRESETS.map((s) => (
                    <Chip
                      key={s}
                      active={form.sources.includes(s)}
                      onClick={() => toggleSource(s)}
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    className="block text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    {t("funnels")}
                  </label>
                  <Link
                    href={funnelsPath}
                    className="text-[11px]"
                    style={{ color: theme.accent }}
                    onClick={closeModal}
                  >
                    {t("addInFunnels")}
                  </Link>
                </div>
                {formFunnels.length === 0 ? (
                  <p
                    className="rounded-lg border border-dashed px-3 py-4 text-center text-xs"
                    style={{ borderColor: theme.border, color: theme.textMuted }}
                  >
                    {t("noFunnelsYet")}
                  </p>
                ) : (
                  <div
                    className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2"
                    style={{ borderColor: theme.border }}
                  >
                    {formFunnels.map((f) => {
                      const on = form.funnelIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFunnel(f.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm"
                          style={{
                            backgroundColor: on
                              ? `${theme.accent}18`
                              : "transparent",
                            color: on ? theme.text : theme.textMuted,
                          }}
                        >
                          <span
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]"
                            style={{
                              borderColor: on ? theme.accent : theme.border,
                              backgroundColor: on
                                ? theme.accent
                                : "transparent",
                              color: on ? "#000" : "transparent",
                            }}
                          >
                            ✓
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {f.name}
                          </span>
                          {f.geo && (
                            <span className="text-[10px] uppercase">
                              {f.geo}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: theme.textMuted }}
                >
                  {t("notes")}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                  rows={2}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-lg py-2.5 text-sm font-medium text-black disabled:opacity-60"
              style={{ backgroundColor: theme.accent }}
            >
              {saving ? "..." : t("save")}
            </button>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
