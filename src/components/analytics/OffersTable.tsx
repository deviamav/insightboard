"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import type { OfferRow } from "@/types/stats";

type SortKey = keyof Pick<
  OfferRow,
  "name" | "total" | "valid" | "invalid" | "noSend" | "invalidPercent" | "deposits" | "conversion"
>;

interface OffersTableProps {
  offers: OfferRow[];
}

export function OffersTable({ offers }: OffersTableProps) {
  const t = useTranslations("analytics");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: t("offer") },
    { key: "total", label: t("total") },
    { key: "valid", label: t("valid") },
    { key: "invalid", label: t("invalid") },
    { key: "noSend", label: t("noSend") },
    { key: "invalidPercent", label: t("invalidPercent") },
    { key: "deposits", label: t("deposits") },
    { key: "conversion", label: t("conversion") },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = offers.filter((o) => o.name.toLowerCase().includes(q));
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? Number(av) - Number(bv)
        : Number(bv) - Number(av);
    });
    return rows;
  }, [offers, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <section
      className="rounded-xl border"
      style={{
        backgroundColor: "var(--theme-bg-card)",
        borderColor: "var(--theme-border)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--theme-border)" }}>
        <h2 className="text-base font-semibold">{t("offers")}</h2>
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
          style={{ borderColor: "var(--theme-border)" }}
        >
          <Search size={14} style={{ color: "var(--theme-text-muted)" }} />
          <input
            type="search"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-32 bg-transparent text-sm outline-none sm:w-48"
            style={{ color: "var(--theme-text)" }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr style={{ color: "var(--theme-text-muted)" }}>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1"
                    style={{
                      color:
                        sortKey === col.key
                          ? "var(--theme-accent)"
                          : "var(--theme-text-muted)",
                      backgroundColor:
                        sortKey === col.key ? "color-mix(in srgb, var(--theme-accent) 15%, transparent)" : "transparent",
                      borderRadius: 4,
                      padding: col.key === "total" ? "2px 6px" : undefined,
                    }}
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )
                    ) : (
                      <ChevronDown size={12} className="opacity-30" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center"
                  style={{ color: "var(--theme-text-muted)" }}
                >
                  {t("noResults")}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.name}
                  className="border-t"
                  style={{
                    borderColor: "var(--theme-border)",
                    backgroundColor:
                      row.name === "TOTAL"
                        ? "color-mix(in srgb, var(--theme-accent) 8%, transparent)"
                        : undefined,
                  }}
                >
                  <td className="px-4 py-2.5 font-medium">{row.name}</td>
                  <td className="px-4 py-2.5">{row.total}</td>
                  <td className="px-4 py-2.5">{row.valid}</td>
                  <td className="px-4 py-2.5">{row.invalid}</td>
                  <td className="px-4 py-2.5">{row.noSend}</td>
                  <td className="px-4 py-2.5">{row.invalidPercent}%</td>
                  <td className="px-4 py-2.5">{row.deposits}</td>
                  <td className="px-4 py-2.5">{row.conversion}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
