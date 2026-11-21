const displayNamesCache = new Map<string, Intl.DisplayNames>();

function getDisplayNames(locale: string): Intl.DisplayNames {
  const loc = locale.startsWith("ru") ? "ru" : "en";
  let dn = displayNamesCache.get(loc);
  if (!dn) {
    dn = new Intl.DisplayNames([loc], { type: "region" });
    displayNamesCache.set(loc, dn);
  }
  return dn;
}

export function getCountryName(code: string, locale = "en"): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return code;
  try {
    return getDisplayNames(locale).of(upper) ?? upper;
  } catch {
    return upper;
  }
}
