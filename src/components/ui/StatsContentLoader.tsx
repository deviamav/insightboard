"use client";

import { useTranslations } from "next-intl";

export function StatsContentLoader() {
  const t = useTranslations("common");

  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border py-16"
      style={{ borderColor: "var(--theme-border)" }}
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-transparent"
        style={{
          borderTopColor: "var(--theme-accent)",
          borderRightColor: "var(--theme-accent)",
        }}
      />
      <p className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
        {t("loading")}
      </p>
    </div>
  );
}
