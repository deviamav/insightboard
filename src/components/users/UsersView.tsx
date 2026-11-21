"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  KeyRound,
  LogOut,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  User as UserIcon,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { ThemeVariant } from "@/lib/themes";
import { getTheme } from "@/lib/themes";
import type { UserRole } from "@/types/user";

interface UsersViewProps {
  locale: string;
  themeVariant: ThemeVariant;
}

interface UserRow {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

function generatePasswordValue() {
  const chars =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  const arr = new Uint8Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

export function UsersView({ locale, themeVariant }: UsersViewProps) {
  const t = useTranslations("users");
  const theme = getTheme(themeVariant);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [primaryAdminId, setPrimaryAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<"created" | "error" | null>(null);

  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<"ok" | "error" | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    const [usersRes, meRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/auth/login"),
    ]);

    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(data.users ?? []);
      setPrimaryAdminId(data.primaryAdminId ?? null);
    }

    if (meRes.ok) {
      const me = await meRes.json();
      setCurrentUserId(me.user?.id ?? null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });

      if (res.ok) {
        setUsername("");
        setPassword("");
        setRole("user");
        setMessage("created");
        await loadUsers();
      } else {
        setMessage("error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;

    const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (res.ok) {
      await loadUsers();
    }
  }

  async function handleForceLogout(id: string) {
    if (!confirm(t("confirmLogout"))) return;
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "logout" }),
    });
    if (res.ok) {
      await loadUsers();
    }
  }

  async function handleSavePassword(e: FormEvent) {
    e.preventDefault();
    if (!passwordUser) return;
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: passwordUser.id, password: newPassword }),
      });
      if (res.ok) {
        setPasswordMsg("ok");
        setNewPassword("");
        setTimeout(() => {
          setPasswordUser(null);
          setPasswordMsg(null);
        }, 800);
      } else {
        setPasswordMsg("error");
      }
    } finally {
      setPasswordSaving(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const inputStyle = {
    backgroundColor: theme.bg,
    borderColor: theme.border,
    color: theme.text,
  } as const;

  return (
    <DashboardShell
      locale={locale}
      themeVariant={themeVariant}
      title={t("title")}
      showFilters={false}
    >
      <p className="mb-6 text-sm" style={{ color: theme.textMuted }}>
        {t("subtitle")}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className="overflow-hidden rounded-xl border"
          style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
        >
          <div
            className="border-b px-5 py-4 text-sm font-medium"
            style={{ borderColor: theme.border, color: theme.textMuted }}
          >
            {t("listTitle")} ({users.length})
          </div>

          {loading ? (
            <p className="px-5 py-8 text-sm" style={{ color: theme.textMuted }}>
              ...
            </p>
          ) : users.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: theme.textMuted }}>
              {t("noUsers")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: theme.textMuted }}>
                    <th className="px-5 py-3 text-left font-medium">{t("username")}</th>
                    <th className="px-5 py-3 text-left font-medium">{t("role")}</th>
                    <th className="px-5 py-3 text-left font-medium">{t("createdAt")}</th>
                    <th className="px-5 py-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const isPrimaryAdmin = user.id === primaryAdminId;
                    const isAdmin = user.role === "admin";
                    const canDelete = !isSelf && !isPrimaryAdmin;
                    const canLogout = !isSelf;

                    return (
                      <tr
                        key={user.id}
                        className="border-t"
                        style={{ borderColor: theme.border }}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <UserIcon size={15} style={{ color: theme.textMuted }} />
                            <span>{user.username}</span>
                            {isSelf && (
                              <span
                                className="rounded px-1.5 py-0.5 text-xs"
                                style={{
                                  backgroundColor: `${theme.accent}22`,
                                  color: theme.accent,
                                }}
                              >
                                {t("you")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: isAdmin
                                ? `${theme.accent}22`
                                : `${theme.textMuted}22`,
                              color: isAdmin ? theme.accent : theme.textMuted,
                            }}
                          >
                            {isAdmin && <Shield size={12} />}
                            {isAdmin ? t("roleAdmin") : t("roleUser")}
                          </span>
                        </td>
                        <td className="px-5 py-3" style={{ color: theme.textMuted }}>
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordUser(user);
                                setNewPassword("");
                                setPasswordMsg(null);
                              }}
                              className="rounded-lg p-2 transition-opacity hover:opacity-80"
                              style={{ color: theme.accent }}
                              title={t("changePassword")}
                            >
                              <KeyRound size={16} />
                            </button>
                            {canLogout && (
                              <button
                                type="button"
                                onClick={() => handleForceLogout(user.id)}
                                className="rounded-lg p-2 transition-opacity hover:opacity-80"
                                style={{ color: theme.textMuted }}
                                title={t("forceLogout")}
                              >
                                <LogOut size={16} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(user.id)}
                                className="rounded-lg p-2 transition-opacity hover:opacity-80"
                                style={{ color: theme.chartDanger }}
                                title={t("delete")}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form
          onSubmit={handleCreate}
          className="h-fit rounded-xl border p-5"
          style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
        >
          <div className="mb-4 flex items-center gap-2 font-medium">
            <UserPlus size={18} style={{ color: theme.accent }} />
            {t("createTitle")}
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs" style={{ color: theme.textMuted }}>
                {t("username")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={inputStyle}
                required
                minLength={3}
                maxLength={50}
                pattern="[a-zA-Z0-9_.-]+"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs" style={{ color: theme.textMuted }}>
                {t("password")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                  required
                  minLength={8}
                  maxLength={256}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setPassword(generatePasswordValue())}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{
                    borderColor: theme.border,
                    color: theme.textMuted,
                  }}
                  title={t("generatePassword")}
                >
                  <RefreshCw size={14} />
                  {t("generatePassword")}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs" style={{ color: theme.textMuted }}>
                {t("role")}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="user">{t("roleUser")}</option>
                <option value="admin">{t("roleAdmin")}</option>
              </select>
            </div>
          </div>

          {message === "created" && (
            <p className="mt-3 text-sm" style={{ color: theme.accent }}>
              {t("created")}
            </p>
          )}
          {message === "error" && (
            <p className="mt-3 text-sm text-red-400">{t("error")}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-black disabled:opacity-60"
            style={{ backgroundColor: theme.accent }}
          >
            {submitting ? "..." : t("create")}
          </button>
        </form>
      </div>

      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSavePassword}
            className="w-full max-w-md rounded-xl border p-5 shadow-xl"
            style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="font-medium">
                {t("changePassword")} — {passwordUser.username}
              </div>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="rounded-lg p-1"
                style={{ color: theme.textMuted }}
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-xs" style={{ color: theme.textMuted }}>
              {t("changePasswordHint")}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                style={inputStyle}
                required
                minLength={8}
                maxLength={256}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setNewPassword(generatePasswordValue())}
                className="rounded-lg border px-3 py-2 text-xs"
                style={{ borderColor: theme.border, color: theme.textMuted }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            {passwordMsg === "ok" && (
              <p className="mt-2 text-sm" style={{ color: theme.accent }}>
                {t("passwordUpdated")}
              </p>
            )}
            {passwordMsg === "error" && (
              <p className="mt-2 text-sm text-red-400">{t("error")}</p>
            )}
            <button
              type="submit"
              disabled={passwordSaving}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-black disabled:opacity-60"
              style={{ backgroundColor: theme.accent }}
            >
              {passwordSaving ? "..." : t("savePassword")}
            </button>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
