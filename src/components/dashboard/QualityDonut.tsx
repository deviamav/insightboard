"use client";

import { useTranslations } from "next-intl";
import { PageCard } from "@/components/ui/PageCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface QualityDonutProps {
  data: Array<{ name: string; value: number; percent: number }>;
  total: number;
}

const labelKeys: Record<string, string> = {
  valid: "validPercent",
  invalid: "invalidPercent",
  ftd: "ftdPercent",
};

export function QualityDonut({ data, total }: QualityDonutProps) {
  const t = useTranslations("dashboard");
  const colors = [
    "var(--theme-accent)",
    "var(--theme-chart-danger)",
    "var(--theme-chart-secondary)",
  ];

  return (
    <PageCard
      title={t("leadQuality")}
      headerRight={
        <p className="font-mono text-[11px]" style={{ color: "var(--theme-text-muted)" }}>
          {t("totalCount")}: {total}
        </p>
      }
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="h-52 w-full sm:h-56 sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="88%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111113",
                  border: "1px solid var(--theme-border)",
                  borderRadius: 8,
                  color: "var(--theme-text)",
                  fontSize: 12,
                  padding: "6px 10px",
                }}
                itemStyle={{ color: "var(--theme-text)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="w-full space-y-0 text-[13px] sm:w-1/2">
          {data.map((item, i) => (
            <li
              key={item.name}
              className="flex items-center justify-between gap-2 border-b py-2 last:border-b-0"
              style={{ borderColor: "var(--theme-border)" }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-[2px]"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                {t(labelKeys[item.name] as "validPercent")}
              </span>
              <span className="tabular font-mono text-xs font-medium">{item.percent}%</span>
            </li>
          ))}
        </ul>
      </div>
    </PageCard>
  );
}
