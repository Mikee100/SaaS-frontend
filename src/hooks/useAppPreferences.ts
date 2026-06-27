"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";

export type DashboardDateRangePref = "last_7_days" | "last_30_days" | "last_90_days";
export type PosPaymentMethodPref = "cash" | "mpesa" | "card";
export type ExportFormatPref = "pdf" | "csv";

export interface AppPreferences {
  dashboardDefaultDateRange: DashboardDateRangePref;
  dashboardAutoRefresh: boolean;
  posDefaultPaymentMethod: PosPaymentMethodPref;
  posAutoPrintReceipt: boolean;
  reportingDefaultExportFormat: ExportFormatPref;
  language: string;
  region: string;
}

const defaults: AppPreferences = {
  dashboardDefaultDateRange: "last_30_days",
  dashboardAutoRefresh: true,
  posDefaultPaymentMethod: "cash",
  posAutoPrintReceipt: true,
  reportingDefaultExportFormat: "pdf",
  language: "en",
  region: "ke",
};

function extractPreferences(data: Record<string, unknown>): AppPreferences {
  const prefs = (data.preferences as Record<string, unknown>) || {};
  return {
    dashboardDefaultDateRange:
      (prefs.dashboardDefaultDateRange as DashboardDateRangePref) || defaults.dashboardDefaultDateRange,
    dashboardAutoRefresh: Boolean(prefs.dashboardAutoRefresh ?? defaults.dashboardAutoRefresh),
    posDefaultPaymentMethod:
      (prefs.posDefaultPaymentMethod as PosPaymentMethodPref) || defaults.posDefaultPaymentMethod,
    posAutoPrintReceipt: prefs.posAutoPrintReceipt !== false,
    reportingDefaultExportFormat:
      (prefs.reportingDefaultExportFormat as ExportFormatPref) || defaults.reportingDefaultExportFormat,
    language: (data.language as string) || defaults.language,
    region: (data.region as string) || defaults.region,
  };
}

/** Map preference date range to dashboard dropdown value (7d, 30d, 90d, 12m). */
export function preferenceDateRangeToDashboard(
  pref: DashboardDateRangePref
): "7d" | "30d" | "90d" | "12m" {
  switch (pref) {
    case "last_7_days":
      return "7d";
    case "last_30_days":
      return "30d";
    case "last_90_days":
      return "90d";
    default:
      return "30d";
  }
}

/** Map preference payment method to sales page value (cash, mpesa, credit). */
export function preferencePaymentToSales(pref: PosPaymentMethodPref): "cash" | "mpesa" | "credit" {
  if (pref === "cash" || pref === "mpesa") return pref;
  return "credit"; // card -> credit
}

/**
 * Load app preferences from /user/me (dashboard, POS, reporting, language, region).
 * Used to apply saved preferences in dashboard, sales, receipt, and reports.
 */
export function useAppPreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiGet<Record<string, unknown>>("/user/me")
      .then((data) => {
        if (!cancelled && data) setPrefs(extractPreferences(data));
      })
      .catch(() => {
        if (!cancelled) setPrefs(defaults);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { preferences: prefs, loading };
}
