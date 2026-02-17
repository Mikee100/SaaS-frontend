"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import Link from "next/link";
import { FaCogs, FaPalette, FaTachometerAlt, FaChartLine, FaCashRegister, FaBoxes, FaFileExport, FaShieldAlt } from 'react-icons/fa';
import { useTheme } from "@/contexts/ThemeContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { SketchPicker, ColorResult } from "react-color";
import { useUser } from "@/components/UserContext";
import { hasPermission } from "@/utils/permissions";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sw", label: "Swahili" },
];
const REGIONS = [
  { value: "ke", label: "Kenya" },
  { value: "ug", label: "Uganda" },
  { value: "tz", label: "Tanzania" },
];
const DATE_RANGES = [
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
];
const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "card", label: "Card" },
];
const EXPORT_FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
];

interface UserPreferences {
  notificationPreferences?: { email: boolean; sms: boolean };
  language: string;
  region: string;
}

interface StockConfigResponse {
  key?: string;
  value?: string | null;
}

export default function PreferencesSettings() {
  const { user } = useUser();
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [stockThresholdWarning, setStockThresholdWarning] = useState("");

  const canEditBilling = hasPermission(user, "edit_billing");
  const canViewBilling = hasPermission(user, "view_billing");

  const { theme, setTheme, loading: themeLoading, error: themeError } = useTheme();
  const { preferences: dashboardPrefs, toggleWidgetVisibility, loading: dashboardLoading, error: dashboardError } = useDashboard();
  
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [prefs, setPrefs] = useState({
    notificationPreferences: { email: true, sms: false },
    language: "en",
    region: "ke",
    stockThreshold: 15,
    dashboardDefaultDateRange: "last_30_days",
    dashboardAutoRefresh: false,
    posDefaultPaymentMethod: "cash",
    posAutoPrintReceipt: true,
    inventoryLowStockAlertEmail: "",
    inventoryAllowNegativeStock: false,
    reportingDefaultExportFormat: "pdf",
    securitySessionTimeout: 30,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const u = (await apiGet("/user/me")) as Record<string, unknown>;
        if (cancelled) return;
        const stored = (u.preferences as Record<string, unknown>) || {};
        const notif = (u.notificationPreferences as { email?: boolean; sms?: boolean }) || {};
        let stockThreshold = 15;
        if (canViewBilling) {
          try {
            const config = (await apiGet("/tenant/configurations/stockThreshold")) as StockConfigResponse;
            if (config?.value != null && config.value !== "") stockThreshold = Number(config.value) || 15;
          } catch {
            // use default
          }
        }
        if (cancelled) return;
        setPrefs({
          notificationPreferences: {
            email: notif.email ?? true,
            sms: notif.sms ?? false,
          },
          language: (u.language as string) || "en",
          region: (u.region as string) || "ke",
          stockThreshold,
          dashboardDefaultDateRange: (stored.dashboardDefaultDateRange as string) || "last_30_days",
          dashboardAutoRefresh: Boolean(stored.dashboardAutoRefresh),
          posDefaultPaymentMethod: (stored.posDefaultPaymentMethod as string) || "cash",
          posAutoPrintReceipt: stored.posAutoPrintReceipt !== false,
          inventoryLowStockAlertEmail: (stored.inventoryLowStockAlertEmail as string) || "",
          inventoryAllowNegativeStock: Boolean(stored.inventoryAllowNegativeStock),
          reportingDefaultExportFormat: (stored.reportingDefaultExportFormat as string) || "pdf",
          securitySessionTimeout: Number(stored.securitySessionTimeout) || 30,
        });
      } catch (err: unknown) {
        if (!cancelled) {
          console.error(err);
          setError("Failed to load preferences");
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [canViewBilling]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    setStockThresholdWarning("");
    try {
      const userPrefsPayload = {
        notificationPreferences: prefs.notificationPreferences,
        language: prefs.language,
        region: prefs.region,
        preferences: {
          dashboardDefaultDateRange: prefs.dashboardDefaultDateRange,
          dashboardAutoRefresh: prefs.dashboardAutoRefresh,
          posDefaultPaymentMethod: prefs.posDefaultPaymentMethod,
          posAutoPrintReceipt: prefs.posAutoPrintReceipt,
          inventoryLowStockAlertEmail: prefs.inventoryLowStockAlertEmail,
          inventoryAllowNegativeStock: prefs.inventoryAllowNegativeStock,
          reportingDefaultExportFormat: prefs.reportingDefaultExportFormat,
          securitySessionTimeout: prefs.securitySessionTimeout,
        },
      };
      await apiPut("/user/me/preferences", userPrefsPayload);
      if (canEditBilling) {
        try {
          await apiPut("/tenant/configurations/stockThreshold", {
            value: String(prefs.stockThreshold),
            category: "general",
          });
        } catch (stockErr) {
          setStockThresholdWarning("Preferences saved. Low stock threshold could not be updated (requires billing permission).");
        }
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaCogs className="text-blue-600 dark:text-blue-400 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Preferences</h2>
        </div>
        <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">← All Settings</Link>
      </div>
      {success && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
          Preferences saved!
        </div>
      )}
      {stockThresholdWarning && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700 text-sm">
          {stockThresholdWarning}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSave} className="space-y-8">
        {/* General Preferences */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-10 w-full border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Notifications</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose how you want to receive important updates.</p>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notificationPreferences.email}
                  onChange={e => setPrefs(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, email: e.target.checked } }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Email notifications</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notificationPreferences.sms}
                  onChange={e => setPrefs(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, sms: e.target.checked } }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">SMS notifications</span>
              </label>
              <div className="mt-6">
                <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Low Stock Threshold</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Set the minimum stock level before a low stock alert is triggered.</p>
                <input
                  type="number"
                  min={1}
                  value={prefs.stockThreshold}
                  onChange={e => setPrefs(p => ({ ...p, stockThreshold: Number(e.target.value) }))}
                  className="border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 w-32"
                  readOnly={!canEditBilling}
                  title={!canEditBilling ? "Requires billing permission to change" : undefined}
                />
                {!canEditBilling && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Only users with billing permission can update this.</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Language</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Select your preferred language for the app interface.</p>
              <select
                value={prefs.language}
                onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                className="border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-200 mt-8">Region</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Set your region to localize content and features.</p>
              <select
                value={prefs.region}
                onChange={e => setPrefs(p => ({ ...p, region: e.target.value }))}
                className="border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Appearance Settings — changes save automatically */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-10 w-full relative border border-gray-100 dark:border-gray-700">
          {themeLoading && <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-50 flex justify-center items-center rounded-xl"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div></div>}
          <div className="flex items-center gap-3 mb-6">
            <FaPalette className="text-blue-600 dark:text-blue-400 text-xl" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Appearance</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Theme and accent color are saved automatically.</p>
          {themeError && <div className="mb-4 text-red-500 dark:text-red-400">Error loading theme: {themeError}</div>}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 ${themeLoading ? 'opacity-50' : ''}`}>
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Color Scheme</h4>
              <div className="flex gap-4">
                {(['light', 'dark', 'system'] as const).map(scheme => (
                  <label key={scheme} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="colorScheme"
                      value={scheme}
                      checked={theme.colorScheme === scheme}
                      onChange={() => setTheme({ ...theme, colorScheme: scheme })}
                      className="accent-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{scheme}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="relative">
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Accent Color</h4>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 cursor-pointer shadow-inner"
                  style={{ backgroundColor: theme.accentColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                <span className="text-gray-600 dark:text-gray-400">{theme.accentColor}</span>
              </div>
              {showColorPicker && (
                <div className="absolute z-10 mt-2" onMouseLeave={() => setShowColorPicker(false)}>
                  <SketchPicker
                    color={theme.accentColor}
                    onChange={(color: ColorResult) => setTheme({ ...theme, accentColor: color.hex })}
                  />
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Font Size</h4>
              <input
                type="range"
                min="12"
                max="20"
                step="1"
                value={theme.fontSize}
                onChange={e => setTheme({ ...theme, fontSize: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">{theme.fontSize}px</span>
            </div>
          </div>
        </div>

        {/* Dashboard Widgets — toggles save automatically */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-10 w-full relative border border-gray-100 dark:border-gray-700">
          {dashboardLoading && <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-50 flex justify-center items-center rounded-xl"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div></div>}
          <div className="flex items-center gap-3 mb-6">
            <FaTachometerAlt className="text-blue-600 dark:text-blue-400 text-xl" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Dashboard Widgets</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose which widgets appear on your dashboard. Changes save automatically.</p>
          {dashboardError && <div className="mb-4 text-red-500 dark:text-red-400">Error loading dashboard settings: {dashboardError}</div>}
          <div className={`${dashboardLoading ? 'opacity-50' : ''}`}>
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Visible Widgets</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {dashboardPrefs.widgets.map(widget => (
                <label key={widget.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widget.visible}
                    onChange={() => toggleWidgetVisibility(widget.id)}
                    className="accent-blue-600"
                    disabled={dashboardLoading}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{widget.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard date range & auto-refresh — saved with Save button below */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-10 w-full border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <FaChartLine className="text-blue-600 dark:text-blue-400 text-xl" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Dashboard Defaults</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Default Date Range</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Select the default time period for dashboard analytics.</p>
              <select
                value={prefs.dashboardDefaultDateRange}
                onChange={e => setPrefs(p => ({ ...p, dashboardDefaultDateRange: e.target.value }))}
                className="border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Auto-Refresh</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Enable to automatically refresh dashboard data.</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.dashboardAutoRefresh}
                  onChange={e => setPrefs(p => ({ ...p, dashboardAutoRefresh: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Enable Auto-Refresh</span>
              </label>
            </div>
          </div>
        </div>

        {/* Point of Sale (POS) Settings */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-10 w-full border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <FaCashRegister className="text-blue-600 dark:text-blue-400 text-xl" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Point of Sale (POS)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Default Payment Method</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose the default payment method for new sales.</p>
              <select
                value={prefs.posDefaultPaymentMethod}
                onChange={e => setPrefs(p => ({ ...p, posDefaultPaymentMethod: e.target.value }))}
                className="border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Automatic Receipt Printing</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Enable to automatically print receipts after a sale.</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.posAutoPrintReceipt}
                  onChange={e => setPrefs(p => ({ ...p, posAutoPrintReceipt: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Auto-print receipts</span>
              </label>
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-10 w-full border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <FaBoxes className="text-blue-600 dark:text-blue-400 text-xl" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Inventory</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Low Stock Alert Email</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Email address to receive low stock notifications.</p>
              <input
                type="email"
                placeholder="alerts@example.com"
                value={prefs.inventoryLowStockAlertEmail}
                onChange={e => setPrefs(p => ({ ...p, inventoryLowStockAlertEmail: e.target.value }))}
                className="border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 w-full"
              />
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Allow Negative Stock</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Permit product stock levels to fall below zero.</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.inventoryAllowNegativeStock}
                  onChange={e => setPrefs(p => ({ ...p, inventoryAllowNegativeStock: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Allow negative stock</span>
              </label>
            </div>
          </div>
        </div>

        {/* Reporting Settings */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-10 w-full border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <FaFileExport className="text-blue-600 dark:text-blue-400 text-xl" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Reporting</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Default Export Format</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Select the default file format for exported reports.</p>
              <select
                value={prefs.reportingDefaultExportFormat}
                onChange={e => setPrefs(p => ({ ...p, reportingDefaultExportFormat: e.target.value }))}
                className="border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {EXPORT_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-10 w-full border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <FaShieldAlt className="text-blue-600 dark:text-blue-400 text-xl" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Security</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Session Timeout (minutes)</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Automatically log out after a period of inactivity.</p>
              <input
                type="number"
                min={5}
                value={prefs.securitySessionTimeout}
                onChange={e => setPrefs(p => ({ ...p, securitySessionTimeout: Number(e.target.value) }))}
                className="border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 w-32"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="px-8 py-2.5 rounded-lg border border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500 text-white font-semibold text-base shadow hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}