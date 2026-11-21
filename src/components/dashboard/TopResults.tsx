"use client";

import { useLocale, useTranslations } from "next-intl";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { getCountryName } from "@/lib/country-names";
import { PageCard } from "@/components/ui/PageCard";

interface TopResultsProps {
  buyers: Array<{
    name: string;
    geo: string;
    leads: number;
    deposits: number;
    conversion: number;
  }>;
  geoCodes: string[];
}

export function TopResults({ buyers, geoCodes }: TopResultsProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  if (geoCodes.length === 0) {
    return (
      <PageCard title={t("topResults")}>
        <p className="py-8 text-center text-sm" style={{ color: "var(--theme-text-muted)" }}>
          {t("noResults")}
        </p>
      </PageCard>
    );
  }

  return (
    <PageCard title={t("topResults")}>
      <div className="grid gap-4 xl:grid-cols-2">
        {geoCodes.map((geo) => {
          const rows = buyers
            .filter((b) => b.geo === geo)
            .sort((a, b) => b.deposits - a.deposits);

          return (
            <div
              key={geo}
              className="overflow-hidden rounded-lg border"
              style={{
                borderColor: "var(--theme-border)",
                backgroundColor: "var(--theme-bg)",
              }}
            >
              <div
                className="flex items-center gap-2.5 border-b px-4 py-2.5"
                style={{ borderColor: "var(--theme-border)" }}
              >
                <CountryFlag code={geo} className="h-4 w-6 rounded-[3px]" />
                <p className="text-[13px] font-semibold">{getCountryName(geo, locale)}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[300px] text-[13px]">
                  <thead>
                    <tr className="kicker" style={{ color: "var(--theme-text-muted)" }}>
                      <th className="px-4 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">{t("buyer")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("pairs")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("deposits")}</th>
                      <th className="px-4 py-2 text-right font-medium">{t("conversion")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-8 text-center text-[13px]"
                          style={{ color: "var(--theme-text-muted)" }}
                        >
                          {t("noResults")}
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, i) => (
                        <tr
                          key={`${row.name}-${i}`}
                          className="border-t transition-colors hover:bg-white/[0.025]"
                          style={{ borderColor: "var(--theme-border)" }}
                        >
                          <td
                            className="px-4 py-2 font-mono text-xs tabular-nums"
                            style={{ color: "var(--theme-text-muted)" }}
                          >
                            {i + 1}
                          </td>
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.leads}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.deposits}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{row.conversion}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </PageCard>
  );
}
