"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import Link from "next/link";
import { FaCogs, FaPalette, FaTachometerAlt, FaChartLine, FaCashRegister, FaBoxes, FaFileExport, FaShieldAlt } from 'react-icons/fa';
import { useTheme } from "@/contexts/ThemeContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { SketchPicker, ColorResult } from "react-color";

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

export default function PreferencesSettings() {
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { theme, setTheme, loading: themeLoading, error: themeError } = useTheme();
  const { preferences: dashboardPrefs, updatePreferences: updateDashboardPrefs, toggleWidgetVisibility, loading: dashboardLoading, error: dashboardError } = useDashboard();
  
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
    // General preferences are fetched here, theme/dashboard are handled by their contexts
    Promise.all([
      apiGet("/user/me"),
      apiGet("/tenant/configurations/stockThreshold")
    ]).then(([user, config]: [any, any]) => {
      setPrefs({
        notificationPreferences: {
          email: user.notificationPreferences?.email ?? true,
          sms: user.notificationPreferences?.sms ?? false,
        },
        language: user.language || "en",
        region: user.region || "ke",
        stockThreshold: config?.value ? Number(config.value) : 15,
        dashboardDefaultDateRange: "last_30_days",
        dashboardAutoRefresh: false,
        posDefaultPaymentMethod: "cash",
        posAutoPrintReceipt: true,
        inventoryLowStockAlertEmail: "",
        inventoryAllowNegativeStock: false,
        reportingDefaultExportFormat: "pdf",
        securitySessionTimeout: 30,
      });
    }).catch(() => setError("Failed to load preferences"))
      .finally(() => setPageLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const { 
        stockThreshold, 
        dashboardDefaultDateRange, 
        dashboardAutoRefresh, 
        posDefaultPaymentMethod, 
        posAutoPrintReceipt,
        inventoryLowStockAlertEmail,
        inventoryAllowNegativeStock,
        reportingDefaultExportFormat,
        securitySessionTimeout, 
        ...userPrefs 
      } = prefs;
      await Promise.all([
        apiPut("/user/me/preferences", userPrefs),
        apiPut("/tenant/configurations/stockThreshold", { value: String(prefs.stockThreshold), category: "general" })
        // TODO: Add API calls for new preferences later
      ]);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaCogs className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Preferences</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>
      {success && <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 border border-green-200">Preferences saved!</div>}
      {error && <div className="mb-4 px-4 py-2 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}
      
      <form onSubmit={handleSave} className="space-y-8">
        {/* General Preferences */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold mb-2 text-gray-700">Notifications</h3>
              <p className="text-xs text-gray-400 mb-4">Choose how you want to receive important updates.</p>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notificationPreferences.email}
                  onChange={e => setPrefs(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, email: e.target.checked } }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">Email notifications</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notificationPreferences.sms}
                  onChange={e => setPrefs(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, sms: e.target.checked } }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">SMS notifications</span>
              </label>
              <div className="mt-6">
                <h3 className="font-semibold mb-2 text-gray-700">Low Stock Threshold</h3>
                <p className="text-xs text-gray-400 mb-2">Set the minimum stock level before a low stock alert is triggered.</p>
                <input
                  type="number"
                  min={1}
                  value={prefs.stockThreshold}
                  onChange={e => setPrefs(p => ({ ...p, stockThreshold: Number(e.target.value) }))}
                  className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 w-32"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold mb-2 text-gray-700">Language</h3>
              <p className="text-xs text-gray-400 mb-4">Select your preferred language for the app interface.</p>
              <select
                value={prefs.language}
                onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <h3 className="font-semibold mb-2 text-gray-700 mt-8">Region</h3>
              <p className="text-xs text-gray-400 mb-4">Set your region to localize content and features.</p>
              <select
                value={prefs.region}
                onChange={e => setPrefs(p => ({ ...p, region: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white rounded-xl shadow p-10 w-full relative">
          {themeLoading && <div className="absolute inset-0 bg-white bg-opacity-50 flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}
          <div className="flex items-center gap-3 mb-6">
            <FaPalette className="text-blue-600 text-xl" />
            <h3 className="text-xl font-bold text-gray-800">Appearance</h3>
          </div>
          {themeError && <div className="mb-4 text-red-500">Error loading theme: {themeError}</div>}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 ${themeLoading ? 'opacity-50' : ''}`}>
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">Color Scheme</h4>
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
                    <span className="text-gray-700 capitalize">{scheme}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="relative">
              <h4 className="font-semibold mb-2 text-gray-700">Accent Color</h4>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer"
                  style={{ backgroundColor: theme.accentColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                ></div>
                <span className="text-gray-600">{theme.accentColor}</span>
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
              <h4 className="font-semibold mb-2 text-gray-700">Font Size</h4>
              <input
                type="range"
                min="12"
                max="20"
                step="1"
                value={theme.fontSize}
                onChange={e => setTheme({ ...theme, fontSize: Number(e.target.value) })}
                className="w-full"
              />
              <span className="text-sm text-gray-500">{theme.fontSize}px</span>
            </div>
          </div>
        </div>

        {/* Dashboard Settings */}
        <div className="bg-white rounded-xl shadow p-10 w-full relative">
          {dashboardLoading && <div className="absolute inset-0 bg-white bg-opacity-50 flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}
          <div className="flex items-center gap-3 mb-6">
            <FaTachometerAlt className="text-blue-600 text-xl" />
            <h3 className="text-xl font-bold text-gray-800">Dashboard</h3>
          </div>
          {dashboardError && <div className="mb-4 text-red-500">Error loading dashboard settings: {dashboardError}</div>}
          <div className={`${dashboardLoading ? 'opacity-50' : ''}`}>
            <h4 className="font-semibold mb-2 text-gray-700">Visible Widgets</h4>
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
                  <span className="text-gray-700">{widget.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* New Dashboard Settings */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <FaChartLine className="text-blue-600 text-xl" />
            <h3 className="text-xl font-bold text-gray-800">Dashboard Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">Default Date Range</h4>
              <p className="text-xs text-gray-400 mb-4">Select the default time period for dashboard analytics.</p>
              <select
                value={prefs.dashboardDefaultDateRange}
                onChange={e => setPrefs(p => ({ ...p, dashboardDefaultDateRange: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">Auto-Refresh</h4>
              <p className="text-xs text-gray-400 mb-4">Enable to automatically refresh dashboard data.</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.dashboardAutoRefresh}
                  onChange={e => setPrefs(p => ({ ...p, dashboardAutoRefresh: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">Enable Auto-Refresh</span>
              </label>
            </div>
          </div>
        </div>

        {/* New Point of Sale (POS) Settings */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <FaCashRegister className="text-blue-600 text-xl" />
            <h3 className="text-xl font-bold text-gray-800">Point of Sale (POS) Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">Default Payment Method</h4>
              <p className="text-xs text-gray-400 mb-4">Choose the default payment method for new sales.</p>
              <select
                value={prefs.posDefaultPaymentMethod}
                onChange={e => setPrefs(p => ({ ...p, posDefaultPaymentMethod: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">Automatic Receipt Printing</h4>
              <p className="text-xs text-gray-400 mb-4">Enable to automatically print receipts after a sale.</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.posAutoPrintReceipt}
                  onChange={e => setPrefs(p => ({ ...p, posAutoPrintReceipt: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">Auto-print receipts</span>
              </label>
            </div>
          </div>
        </div>

        {/* New Inventory Settings */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <FaBoxes className="text-blue-600 text-xl" />
            <h3 className="text-xl font-bold text-gray-800">Inventory Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">Low Stock Alert Email</h4>
              <p className="text-xs text-gray-400 mb-4">Email address to receive low stock notifications.</p>
              <input
                type="email"
                placeholder="alerts@example.com"
                value={prefs.inventoryLowStockAlertEmail}
                onChange={e => setPrefs(p => ({ ...p, inventoryLowStockAlertEmail: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 w-full"
              />
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">Allow Negative Stock</h4>
              <p className="text-xs text-gray-400 mb-4">Permit product stock levels to fall below zero.</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.inventoryAllowNegativeStock}
                  onChange={e => setPrefs(p => ({ ...p, inventoryAllowNegativeStock: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">Allow negative stock</span>
              </label>
            </div>
          </div>
        </div>

        {/* New Reporting Settings */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <FaFileExport className="text-blue-600 text-xl" />
            <h3 className="text-xl font-bold text-gray-800">Reporting Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">Default Export Format</h4>
              <p className="text-xs text-gray-400 mb-4">Select the default file format for exported reports.</p>
              <select
                value={prefs.reportingDefaultExportFormat}
                onChange={e => setPrefs(p => ({ ...p, reportingDefaultExportFormat: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {EXPORT_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* New Security Settings */}
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <FaShieldAlt className="text-blue-600 text-xl" />
            <h3 className="text-xl font-bold text-gray-800">Security Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">Session Timeout (minutes)</h4>
              <p className="text-xs text-gray-400 mb-4">Automatically log out after a period of inactivity.</p>
              <input
                type="number"
                min={5}
                value={prefs.securitySessionTimeout}
                onChange={e => setPrefs(p => ({ ...p, securitySessionTimeout: Number(e.target.value) }))}
                className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 w-32"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-2 rounded-lg border border-blue-200 bg-blue-600 text-white font-semibold text-base shadow hover:bg-blue-700 transition disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save General Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}