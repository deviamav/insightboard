"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  Percent,
  Wallet,
} from "lucide-react";

interface MetricCardsProps {
  totals: {
    leads: number;
    valids: number;
    invalids: number;
    deposits: number;
    cr: number;
    profit: number;
  };
}

const icons = [Users, ThumbsUp, ThumbsDown, DollarSign, Percent, Wallet];

export function MetricCards({ totals }: MetricCardsProps) {
  const t = useTranslations("metrics");
  const values = [
    totals.leads,
    totals.valids,
    totals.invalids,
    totals.deposits,
    `${totals.cr}%`,
    `${totals.profit}$`,
  ];
  const keys = ["leads", "valids", "invalids", "ftd", "cr", "profit"] as const;

  // One bordered strip with hairline dividers (gap-px over a border-colored track).
  return (
    <div
      className="animate-fade-in grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-3 xl:grid-cols-6"
      style={{
        backgroundColor: "var(--theme-border)",
        borderColor: "var(--theme-border)",
      }}
    >
      {keys.map((key, i) => {
        const Icon = icons[i];
        return (
          <div
            key={key}
            className="p-4"
            style={{ backgroundColor: "var(--theme-bg-card)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="kicker" style={{ color: "var(--theme-text-muted)" }}>
                {t(key)}
              </span>
              <Icon
                size={14}
                style={{ color: "var(--theme-text-muted)" }}
                strokeWidth={1.5}
              />
            </div>
            <p className="tabular text-[1.65rem] font-semibold leading-none tracking-[-0.02em]">
              {values[i]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
