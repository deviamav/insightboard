"use client";

import { useEffect, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ThemeVariant } from "@/lib/themes";
import { getTheme } from "@/lib/themes";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { isNavActive, resolveNavHref, STATS_ROUTES } from "@/lib/nav-paths";
import type { UserRole } from "@/types/user";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Users,
  Upload,
  LineChart,
  UsersRound,
  FileText,
  UserCog,
  Globe,
  Filter,
  Tag,
  Wallet,
  Wrench,
  LogOut,
  Database,
  Palette,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SidebarProps {
  themeVariant: ThemeVariant;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

type SubLink = {
  key: string;
  href: string;
  icon: LucideIcon;
};

type NavItem =
  | {
      type: "link";
      key: string;
      icon: LucideIcon;
      href: string;
      adminOnly?: boolean;
    }
  | {
      type: "group";
      key: string;
      icon: LucideIcon;
      children: SubLink[];
    };

const navItems: NavItem[] = [
  { type: "link", key: "dashboard", icon: LayoutDashboard, href: "/" },
  {
    type: "group",
    key: "statistics",
    icon: BarChart3,
    children: [
      { key: "statistics", href: "/statistics", icon: BarChart3 },
      { key: "analytics", href: "/analytics", icon: LineChart },
      { key: "teamStats", href: "/team-stats", icon: UsersRound },
      { key: "reports", href: "/reports", icon: FileText },
    ],
  },
  { type: "link", key: "leads", icon: Users, href: "/leads" },
  { type: "link", key: "importHistory", icon: Upload, href: "/import-history" },
  { type: "link", key: "users", icon: UserCog, href: "/users", adminOnly: true },
  { type: "link", key: "domains", icon: Globe, href: "/domains" },
  { type: "link", key: "funnels", icon: Filter, href: "/funnels" },
  { type: "link", key: "offers", icon: Tag, href: "/offers" },
  { type: "link", key: "finance", icon: Wallet, href: "/finance" },
];

export function Sidebar({
  themeVariant,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const theme = getTheme(themeVariant);
  const basePath = themeVariant === "alt" ? "/alt" : "";
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const statsPaths = STATS_ROUTES.map((p) => `${basePath}${p}`);
  const isStatsActive = statsPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const [statsOpen, setStatsOpen] = useState(isStatsActive);

  const toolsPaths = [`${basePath}/admin/data`, themeVariant === "alt" ? "/" : "/alt"];
  const isToolsActive = toolsPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const [toolsOpen, setToolsOpen] = useState(isToolsActive);

  useEffect(() => {
    if (isStatsActive) setStatsOpen(true);
  }, [isStatsActive]);

  useEffect(() => {
    fetch("/api/auth/login")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user?.role) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  const isAdmin = userRole === "admin";

  const toolLinks = [
    { key: "toolsDataEntry" as const, href: `${basePath}/admin/data`, icon: Database },
    {
      key: themeVariant === "alt" ? "toolsPrimaryTheme" : "toolsAltTheme",
      href: themeVariant === "alt" ? "/" : "/alt",
      icon: Palette,
    },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function itemStyle(active: boolean) {
    return {
      color: active ? theme.text : theme.textMuted,
      backgroundColor: active ? "rgba(255,255,255,0.07)" : "transparent",
    };
  }

  function navClass(active: boolean) {
    return `relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 hover:bg-white/[0.05] hover:!text-[var(--theme-text)] ${
      collapsed ? "justify-center px-0" : ""
    } ${active ? "is-active" : ""}`;
  }

  return (
    <aside
      className={`flex h-full flex-col border-r transition-[width] duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
      style={{
        backgroundColor: theme.bgSidebar,
        borderColor: theme.border,
      }}
    >
      <div
        className={`flex h-12 items-center border-b ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}
        style={{ borderColor: theme.border }}
      >
        <Link
          href={resolveNavHref(basePath, "/") as "/"}
          onClick={onNavigate}
          className={`flex items-center gap-2.5 ${collapsed ? "" : "min-w-0"}`}
        >
          <BrandLogo variant={themeVariant} size={24} />
          {!collapsed && (
            <span
              className="truncate text-[13px] font-semibold tracking-tight"
              style={{ color: theme.text }}
            >
              {theme.name}
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 transition-colors hover:bg-white/[0.06]"
            style={{ color: theme.textMuted }}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={15} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center border-b py-2" style={{ borderColor: theme.border }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 transition-colors hover:bg-white/[0.06]"
            style={{ color: theme.textMuted }}
            aria-label="Expand sidebar"
          >
            <PanelLeft size={15} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            if (item.type === "link" && item.adminOnly && !isAdmin) return null;

            if (item.type === "link") {
              const Icon = item.icon;
              const active = isNavActive(pathname, basePath, item.href);
              const href = resolveNavHref(basePath, item.href);

              return (
                <li key={item.key}>
                  <Link
                    href={href as "/"}
                    onClick={onNavigate}
                    className={navClass(active)}
                    style={itemStyle(active)}
                    title={collapsed ? t(item.key) : undefined}
                  >
                    <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                    {!collapsed && <span className="flex-1 text-left">{t(item.key)}</span>}
                  </Link>
                </li>
              );
            }

            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      onToggleCollapse();
                      setStatsOpen(true);
                    } else {
                      setStatsOpen((v) => !v);
                    }
                  }}
                  className={navClass(isStatsActive)}
                  style={itemStyle(isStatsActive)}
                  title={collapsed ? t(item.key) : undefined}
                >
                  <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{t(item.key)}</span>
                      {statsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </>
                  )}
                </button>

                {!collapsed && statsOpen && (
                  <ul
                    className="ml-[18px] mt-0.5 space-y-0.5 border-l pl-2"
                    style={{ borderColor: theme.border }}
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isNavActive(pathname, basePath, child.href);
                      const href = resolveNavHref(basePath, child.href);

                      return (
                        <li key={child.key}>
                          <Link
                            href={href as "/"}
                            onClick={onNavigate}
                            className="flex h-7 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors hover:bg-white/[0.05] hover:!text-[var(--theme-text)]"
                            style={itemStyle(active)}
                          >
                            <ChildIcon size={15} strokeWidth={1.5} className="shrink-0" />
                            <span className="flex-1 text-left">{t(child.key)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}

          <li>
            <button
              type="button"
              onClick={() => {
                if (collapsed) {
                  onToggleCollapse();
                  setToolsOpen(true);
                } else {
                  setToolsOpen((v) => !v);
                }
              }}
              className={navClass(isToolsActive)}
              style={itemStyle(isToolsActive)}
              title={collapsed ? t("tools") : undefined}
            >
              <Wrench size={18} strokeWidth={1.5} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{t("tools")}</span>
                  {toolsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </>
              )}
            </button>

            {!collapsed && toolsOpen && (
              <ul
                className="ml-[18px] mt-0.5 space-y-0.5 border-l pl-2"
                style={{ borderColor: theme.border }}
              >
                {toolLinks.map((link) => {
                  const Icon = link.icon;
                  const active =
                    pathname === link.href || pathname.startsWith(`${link.href}/`);

                  return (
                    <li key={link.key}>
                      <Link
                        href={link.href as "/"}
                        onClick={onNavigate}
                        className="flex h-7 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors hover:bg-white/[0.05] hover:!text-[var(--theme-text)]"
                        style={itemStyle(active)}
                      >
                        <Icon size={15} strokeWidth={1.5} />
                        {t(link.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      <div className="border-t px-2 py-2" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={handleLogout}
          className={`${navClass(false)} hover:opacity-100`}
          style={itemStyle(false)}
          title={collapsed ? t("logout") : undefined}
        >
          <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
          {!collapsed && <span>{t("logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
