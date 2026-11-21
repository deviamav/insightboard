"use client";

import type { ComponentType } from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { hasFlag } from "country-flag-icons";

type FlagProps = { className?: string; title?: string; "aria-label"?: string };

const FLAG_MAP = Flags as Record<string, ComponentType<FlagProps>>;

interface CountryFlagProps {
  code: string;
  className?: string;
  title?: string;
}

export function CountryFlag({
  code,
  className = "h-5 w-7 shrink-0 rounded-sm object-cover",
  title,
}: CountryFlagProps) {
  const upper = code.toUpperCase();
  const Flag = hasFlag(upper) ? FLAG_MAP[upper] : null;

  if (!Flag) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-sm bg-white/10 text-[9px] font-semibold uppercase ${className}`}
        title={title ?? code}
      >
        {upper.slice(0, 2) || "?"}
      </span>
    );
  }

  return <Flag className={className} title={title ?? code} aria-label={title ?? code} />;
}

export function hasCountryFlag(code: string): boolean {
  return hasFlag(code.toUpperCase());
}
