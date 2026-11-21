/** Resolve sidebar href with optional /alt base */
export function resolveNavHref(basePath: string, href: string): string {
  if (href === "/") return basePath || "/";
  return `${basePath}${href}`;
}

export function isNavActive(pathname: string, basePath: string, href: string): boolean {
  const target = resolveNavHref(basePath, href);
  if (href === "/") {
    return pathname === target || pathname === `${target}/`;
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}

export const STATS_ROUTES = ["/statistics", "/analytics", "/team-stats", "/reports"] as const;
