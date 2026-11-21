"use client";

import { useTranslations } from "next-intl";
import type { CrBasis } from "@/types/stats";

interface CrBasisSelectProps {
  value: CrBasis;
  onChange: (value: CrBasis) => void;
  accent: string;
  border: string;
  bgCard: string;
  text: string;
}

export function CrBasisSelect({
  value,
  onChange,
  accent,
  border,
  bgCard,
  text,
}: CrBasisSelectProps) {
  const t = useTranslations("filters");

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CrBasis)}
      className="rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
      style={{
        backgroundColor: bgCard,
        borderColor: border,
        color: text,
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = accent)}
      onBlur={(e) => (e.currentTarget.style.borderColor = border)}
      title={t("crBasisHint")}
    >
      <option value="leads">{t("crByLeads")}</option>
      <option value="valids">{t("crByValids")}</option>
    </select>
  );
}
