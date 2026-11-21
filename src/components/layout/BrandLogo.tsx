import type { ThemeVariant } from "@/lib/themes";
import { getTheme } from "@/lib/themes";

interface BrandLogoProps {
  variant: ThemeVariant;
  size?: number;
  className?: string;
}

export function BrandLogo({ variant, size = 36, className = "" }: BrandLogoProps) {
  const theme = getTheme(variant);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="39"
        rx="9.5"
        fill={`${theme.accent}12`}
        stroke={`${theme.accent}40`}
      />
      <rect x="10.5" y="21" width="4.5" height="10" rx="1" fill={theme.accent} opacity="0.55" />
      <rect x="17.75" y="15" width="4.5" height="16" rx="1" fill={theme.accent} opacity="0.8" />
      <rect x="25" y="9" width="4.5" height="22" rx="1" fill={theme.accent} />
    </svg>
  );
}
