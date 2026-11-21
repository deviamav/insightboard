"use client";

import { useTranslations } from "next-intl";
import { Construction } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageCard } from "@/components/ui/PageCard";
import type { ThemeVariant } from "@/lib/themes";

interface StubViewProps {
  locale: string;
  themeVariant: ThemeVariant;
  pageKey: string;
}

export function StubView({ locale, themeVariant, pageKey }: StubViewProps) {
  const tNav = useTranslations("nav");
  const t = useTranslations("stub");

  return (
    <DashboardShell
      locale={locale}
      themeVariant={themeVariant}
      title={tNav(pageKey)}
      showFilters={false}
    >
      <PageCard>
        <div className="flex min-h-[45vh] flex-col items-center justify-center py-8 text-center">
          <div
            className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border"
            style={{
              borderColor: "var(--theme-border)",
              backgroundColor: "var(--theme-bg)",
            }}
          >
            <Construction
              size={20}
              strokeWidth={1.5}
              style={{ color: "var(--theme-accent)" }}
            />
          </div>
          <h2 className="mb-2 text-lg font-semibold">{t("title")}</h2>
          <p
            className="max-w-md text-sm leading-relaxed"
            style={{ color: "var(--theme-text-muted)" }}
          >
            {t("description")}
          </p>
        </div>
      </PageCard>
    </DashboardShell>
  );
}
