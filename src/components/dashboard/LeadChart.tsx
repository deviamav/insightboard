"use client";

import { useTranslations } from "next-intl";
import { PageCard } from "@/components/ui/PageCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface LeadChartProps {
  data: Array<{
    hour: string;
    leads: number;
    deposits: number;
    duplicates: number;
  }>;
}

export function LeadChart({ data }: LeadChartProps) {
  const t = useTranslations("dashboard");

  return (
    <PageCard title={t("leadFrequency")}>
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--theme-border)" />
            <XAxis
              dataKey="hour"
              tick={{ fill: "var(--theme-text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
              dy={6}
            />
            <YAxis
              tick={{ fill: "var(--theme-text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
              contentStyle={{
                backgroundColor: "#111113",
                border: "1px solid var(--theme-border)",
                borderRadius: 8,
                color: "var(--theme-text)",
                fontSize: 12,
                padding: "6px 10px",
                boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
              }}
              labelStyle={{ color: "var(--theme-text-muted)", marginBottom: 2 }}
            />
            <Legend
              iconType="plainline"
              iconSize={12}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="leads"
              name={t("pairs")}
              stroke="var(--theme-accent)"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="deposits"
              name={t("deposits")}
              stroke="var(--theme-chart-secondary)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="duplicates"
              name={t("duplicates")}
              stroke="var(--theme-chart-danger)"
              strokeWidth={1.25}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </PageCard>
  );
}
