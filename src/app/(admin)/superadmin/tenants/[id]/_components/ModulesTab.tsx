import React from "react";
import type {
  AppModuleKey,
  ModulePresetDefinition,
  BlueprintCatalogEntry,
  TenantBlueprintPreviewResponse,
  ModulePermissionMatrixEntry,
} from "../types";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-700";

const MODULE_LABELS: Record<AppModuleKey, string> = {
  dashboard: "Dashboard",
  payroll: "Payroll",
  sales: "Sales",
  credits: "Credits",
  inventory: "Inventory",
  accounts: "Accounts",
  analytics: "Analytics",
  reports: "Reports",
  expenses: "Expenses",
  crm: "CRM",
  ai: "AI",
  settings: "Settings",
  billing: "Billing",
};

export default function ModulesTab({
  availableModules,
  enabledModules,
  toggleModule,
  savingModules,
  saveTenantModules,
  modulePresets,
  selectedModulePreset,
  setSelectedModulePreset,
  applyingModulePreset,
  applyModulePreset,
  availableBusinessTypes,
  selectedBusinessType,
  setSelectedBusinessType,
  blueprintCatalog,
  selectedBlueprintKey,
  setSelectedBlueprintKey,
  selectedBlueprintVersion,
  setSelectedBlueprintVersion,
  installedAppsInput,
  setInstalledAppsInput,
  featureFlagsInput,
  setFeatureFlagsInput,
  availableNavigationOptions,
  selectedNavigationKeys,
  toggleNavigationKey,
  savingBlueprint,
  saveTenantBlueprint,
  previewingBlueprint,
  previewTenantBlueprint,
  rollingBackBlueprint,
  rollbackTenantBlueprint,
  blueprintPreview,
  modulePermissionMatrix,
  moduleMatrixRoles,
  loadingModuleMatrix,
}: {
  availableModules: AppModuleKey[];
  enabledModules: AppModuleKey[];
  toggleModule: (moduleKey: AppModuleKey) => void;
  savingModules: boolean;
  saveTenantModules: () => Promise<void>;
  modulePresets: ModulePresetDefinition[];
  selectedModulePreset: string;
  setSelectedModulePreset: (value: string) => void;
  applyingModulePreset: boolean;
  applyModulePreset: () => Promise<void>;
  availableBusinessTypes: string[];
  selectedBusinessType: string;
  setSelectedBusinessType: (value: string) => void;
  blueprintCatalog: BlueprintCatalogEntry[];
  selectedBlueprintKey: string;
  setSelectedBlueprintKey: (value: string) => void;
  selectedBlueprintVersion: string;
  setSelectedBlueprintVersion: (value: string) => void;
  installedAppsInput: string;
  setInstalledAppsInput: (value: string) => void;
  featureFlagsInput: string;
  setFeatureFlagsInput: (value: string) => void;
  availableNavigationOptions: BlueprintCatalogEntry["navigation"];
  selectedNavigationKeys: string[];
  toggleNavigationKey: (navKey: string) => void;
  savingBlueprint: boolean;
  saveTenantBlueprint: () => Promise<void>;
  previewingBlueprint: boolean;
  previewTenantBlueprint: () => Promise<void>;
  rollingBackBlueprint: boolean;
  rollbackTenantBlueprint: () => void;
  blueprintPreview: TenantBlueprintPreviewResponse | null;
  modulePermissionMatrix: ModulePermissionMatrixEntry[];
  moduleMatrixRoles: string[];
  loadingModuleMatrix: boolean;
}) {
  const blueprintsForType = blueprintCatalog.filter((entry) => entry.businessType === selectedBusinessType);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Blueprint Configuration</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className={labelClass}>Business Type</label>
            <select className={inputClass} value={selectedBusinessType} onChange={(e) => setSelectedBusinessType(e.target.value)}>
              {availableBusinessTypes.length === 0 && <option value={selectedBusinessType}>{selectedBusinessType}</option>}
              {availableBusinessTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Blueprint</label>
            <select className={inputClass} value={selectedBlueprintKey} onChange={(e) => setSelectedBlueprintKey(e.target.value)}>
              <option value="">Select blueprint</option>
              {blueprintsForType.map((entry) => (
                <option key={entry.blueprintKey} value={entry.blueprintKey}>
                  {entry.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Version</label>
            <input className={inputClass} value={selectedBlueprintVersion} onChange={(e) => setSelectedBlueprintVersion(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Installed Apps (comma-separated)</label>
            <input className={inputClass} value={installedAppsInput} onChange={(e) => setInstalledAppsInput(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Feature Flags (JSON)</label>
            <textarea
              className={`${inputClass} font-mono`}
              rows={4}
              value={featureFlagsInput}
              onChange={(e) => setFeatureFlagsInput(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className={labelClass}>Navigation Items</label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {availableNavigationOptions.map((nav) => {
              const key = String(nav.key || "").toLowerCase();
              const checked = selectedNavigationKeys.includes(key);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
                    checked ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleNavigationKey(key)} />
                  {nav.label || key}
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void previewTenantBlueprint()}
            disabled={previewingBlueprint}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {previewingBlueprint ? "Previewing..." : "Preview"}
          </button>
          <button
            type="button"
            onClick={() => void saveTenantBlueprint()}
            disabled={savingBlueprint}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {savingBlueprint ? "Saving..." : "Save Blueprint"}
          </button>
          <button
            type="button"
            onClick={rollbackTenantBlueprint}
            disabled={rollingBackBlueprint}
            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            {rollingBackBlueprint ? "Rolling back..." : "Rollback"}
          </button>
        </div>

        {blueprintPreview && (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold">Preview Summary</p>
            <p className="mt-1">
              Nav items: {blueprintPreview.effectivePreview?.manifest?.navigation?.length ?? 0} • Dashboard widgets:{" "}
              {blueprintPreview.effectivePreview?.manifest?.dashboard?.length ?? 0} • Quick actions:{" "}
              {blueprintPreview.effectivePreview?.manifest?.quickActions?.length ?? 0}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Module Presets</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px]">
            <label className={labelClass}>Preset</label>
            <select className={inputClass} value={selectedModulePreset} onChange={(e) => setSelectedModulePreset(e.target.value)}>
              <option value="">Select preset</option>
              {modulePresets.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void applyModulePreset()}
            disabled={applyingModulePreset}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {applyingModulePreset ? "Applying..." : "Apply Preset"}
          </button>
        </div>
        {selectedModulePreset && (
          <p className="mt-2 text-xs text-gray-500">
            {modulePresets.find((p) => p.key === selectedModulePreset)?.description}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Enabled Modules</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {availableModules.map((moduleKey) => {
            const checked = enabledModules.includes(moduleKey);
            return (
              <label
                key={moduleKey}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${
                  checked ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleModule(moduleKey)} />
                {MODULE_LABELS[moduleKey] || moduleKey}
              </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => void saveTenantModules()}
          disabled={savingModules}
          className="mt-4 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {savingModules ? "Saving..." : "Save Modules"}
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Module Permission Matrix</h3>
        {loadingModuleMatrix ? (
          <p className="text-sm text-gray-500">Loading matrix...</p>
        ) : modulePermissionMatrix.length === 0 ? (
          <p className="text-sm text-gray-500">No matrix data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Module</th>
                  {moduleMatrixRoles.map((role) => (
                    <th key={role} className="px-3 py-2 font-semibold">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modulePermissionMatrix.map((entry) => (
                  <tr key={entry.module}>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {MODULE_LABELS[entry.module] || entry.module} {!entry.enabled && <span className="text-gray-400">(disabled)</span>}
                    </td>
                    {entry.roleChecks.map((check) => (
                      <td key={check.roleName} className={`px-3 py-2 ${check.allowed ? "text-emerald-700" : "text-rose-700"}`}>
                        {check.allowed ? "ok" : check.missing.length > 0 ? `missing: ${check.missing.join(", ")}` : "n/a"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
