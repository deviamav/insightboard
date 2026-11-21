"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher({
  border,
  bgCard,
  text,
}: {
  border: string;
  bgCard: string;
  text: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      className="flex h-8 items-center rounded-lg border p-0.5 text-[11px]"
      style={{ borderColor: border, backgroundColor: bgCard }}
    >
      {(["ru", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className="rounded-md px-2 py-1 font-mono font-medium uppercase transition-colors"
          style={{
            color: locale === l ? text : "var(--theme-text-muted)",
            backgroundColor: locale === l ? "rgba(255,255,255,0.09)" : "transparent",
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
