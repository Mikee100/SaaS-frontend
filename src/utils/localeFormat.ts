/**
 * Format date and number using user's language/region preferences.
 * Use for receipts, dashboard, and reports.
 */

/** Locale string for formatting (e.g. en-KE, sw-KE). */
export function getLocale(language: string, region: string): string {
  if (language === "sw") return "sw-KE";
  if (region === "ug") return "en-UG";
  if (region === "tz") return "en-TZ";
  return "en-KE";
}

export function formatDate(
  date: Date | string | number,
  language: string,
  region: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "object" && "getTime" in date ? date : new Date(date);
  const locale = getLocale(language, region);
  return d.toLocaleDateString(locale, options ?? { dateStyle: "medium", timeStyle: "short" });
}

export function formatDateShort(
  date: Date | string | number,
  language: string,
  region: string
): string {
  const d = typeof date === "object" && "getTime" in date ? date : new Date(date);
  const locale = getLocale(language, region);
  return d.toLocaleDateString(locale, { dateStyle: "short" });
}

export function formatNumber(
  value: number,
  language: string,
  region: string,
  options?: Intl.NumberFormatOptions
): string {
  const locale = getLocale(language, region);
  return value.toLocaleString(locale, options);
}

export function formatCurrency(
  value: number,
  currency: string,
  language: string,
  region: string
): string {
  const locale = getLocale(language, region);
  return value.toLocaleString(locale, { style: "currency", currency: currency || "KES" });
}
