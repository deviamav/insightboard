"use client";

import { useLocale, useTranslations } from "next-intl";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { getCountryName } from "@/lib/country-names";
import { PageCard } from "@/components/ui/PageCard";

interface GeoStatsProps {
  geo: Array<{
    code: string;
    total: number;
    valid: number;
    invalid: number;
    deposit: number;
  }>;
}

export function GeoStats({ geo }: GeoStatsProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const grandTotal = geo.reduce((sum, g) => sum + g.total, 0);

  return (
    <PageCard title={t("geoStats")}>
      {geo.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: "var(--theme-text-muted)" }}>
          {t("noResults")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {geo.map((g) => {
            const share = grandTotal > 0 ? Math.round((g.total / grandTotal) * 100) : 0;
            const label = getCountryName(g.code, locale);

            return (
              <div
                key={g.code}
                className="rounded-lg border p-4 transition-colors hover:border-white/[0.16]"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-bg)",
                }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CountryFlag
                      code={g.code}
                      className="h-5 w-7 shrink-0 rounded-[3px]"
                      title={label}
                    />
                    <div>
                      <p className="text-[13px] font-semibold leading-tight">{label}</p>
                      <p
                        className="mt-0.5 font-mono text-[11px]"
                        style={{ color: "var(--theme-text-muted)" }}
                      >
                        {g.code}
                      </p>
                    </div>
                  </div>
                  <span
                    className="shrink-0 font-mono text-xs font-medium tabular-nums"
                    style={{ color: "var(--theme-text-muted)" }}
                  >
                    {share}%
                  </span>
                </div>

                <div
                  className="mb-4 h-1 overflow-hidden rounded-full"
                  style={{ backgroundColor: "var(--theme-border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(share, share > 0 ? 4 : 0)}%`,
                      backgroundColor: "var(--theme-accent)",
                    }}
                  />
                </div>

                <dl className="grid grid-cols-4 gap-x-3 text-sm">
                  {[
                    ["total", g.total],
                    ["valid", g.valid],
                    ["invalid", g.invalid],
                    ["deposit", g.deposit],
                  ].map(([labelKey, val]) => (
                    <div key={labelKey as string}>
                      <dt
                        className="truncate text-[11px]"
                        style={{ color: "var(--theme-text-muted)" }}
                      >
                        {t(labelKey as "total")}
                      </dt>
                      <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{val}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </PageCard>
  );
}
