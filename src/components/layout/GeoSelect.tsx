"use client";

interface GeoOption {
  code: string;
  label: string | null;
}

interface GeoSelectProps {
  value: string;
  onChange: (geo: string) => void;
  options: GeoOption[];
  allLabel: string;
  includeAll?: boolean;
}

export function GeoSelect({
  value,
  onChange,
  options,
  allLabel,
  includeAll = true,
}: GeoSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border px-2.5 text-[13px] outline-none transition-colors hover:border-white/[0.16] focus:border-[var(--theme-accent)]"
      style={{
        backgroundColor: "var(--theme-bg-card)",
        borderColor: "var(--theme-border)",
        color: "var(--theme-text)",
      }}
    >
      {includeAll && <option value="ALL">{allLabel}</option>}
      {options.map((g) => (
        <option key={g.code} value={g.code}>
          {g.label ? `${g.code} — ${g.label}` : g.code}
        </option>
      ))}
    </select>
  );
}
