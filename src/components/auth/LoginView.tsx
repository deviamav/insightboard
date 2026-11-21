"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { stripLocalePrefix } from "@/lib/i18n-path";
import { useTranslations } from "next-intl";
import type { ThemeVariant } from "@/lib/themes";
import { getTheme } from "@/lib/themes";
import { BrandLogo } from "@/components/layout/BrandLogo";

interface LoginViewProps {
  locale: string;
  themeVariant?: ThemeVariant;
}

export function LoginView({ locale, themeVariant = "primary" }: LoginViewProps) {
  const t = useTranslations("auth");
  const theme = getTheme(themeVariant);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const rawFrom = searchParams.get("from");
        const from =
          rawFrom && !rawFrom.startsWith("/api") && !rawFrom.includes("/login")
            ? stripLocalePrefix(rawFrom)
            : "/";
        router.push(from as "/");
        router.refresh();
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-10 w-full rounded-lg border px-3 text-[13px] outline-none transition-colors placeholder:opacity-40 hover:border-white/[0.16] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-accent)_22%,transparent)]";

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        ["--theme-accent" as string]: theme.accent,
      }}
    >
      <div className="login-glow" aria-hidden />

      <div className="relative z-10 w-full max-w-[360px] animate-fade-in">
        <div className="mb-8 flex flex-col items-start gap-5">
          <BrandLogo variant={themeVariant} size={32} />
          <div>
            <p className="kicker mb-2" style={{ color: theme.textMuted }}>
              {theme.name}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{t("login")}</h1>
            <p className="mt-1.5 text-[13px]" style={{ color: theme.textMuted }}>
              {t("subtitle")}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border p-5"
          style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: theme.textMuted }}>
              {t("username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
              }}
              autoComplete="username"
              required
              minLength={3}
              maxLength={50}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: theme.textMuted }}>
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
              }}
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={256}
            />
          </div>

          {error && (
            <p className="text-[13px]" style={{ color: theme.chartDanger }}>
              {t("invalidCredentials")}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-lg text-[13px] font-semibold text-[#04121c] transition-[filter] hover:brightness-110 active:brightness-95 disabled:opacity-60"
            style={{ backgroundColor: theme.accent }}
          >
            {loading ? "…" : t("login")}
          </button>
        </form>
      </div>
    </div>
  );
}
