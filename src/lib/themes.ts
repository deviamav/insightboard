export type ThemeVariant = "primary" | "alt";

/*
  Shared dark-first system: near-charcoal surfaces, hairline borders, ONE sky accent.
  Hex values only (some views append alpha, e.g. `${theme.accent}22`).
  `border` ≈ rgba(255,255,255,0.08) on the card surface.
*/
const base = {
  bg: "#09090b",
  bgCard: "#0c0c0e",
  bgSidebar: "#0a0a0c",
  bgElevated: "#111113",
  border: "#1f1f23",
  accent: "#38bdf8",
  accentMuted: "#0ea5e9",
  text: "#ededef",
  textMuted: "#8a8a93",
  chartSecondary: "#a1a1aa",
  chartDanger: "#f87171",
} as const;

export const themes = {
  primary: {
    ...base,
    name: "TRAFFIC FLOW",
    logoLetter: "Z",
  },
  alt: {
    ...base,
    name: "Campaign HQ",
    logoLetter: "H",
  },
} as const;

export function getTheme(variant: ThemeVariant) {
  return themes[variant];
}
