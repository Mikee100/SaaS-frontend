import React from "react";
import type { CrmPackageKey, CrmCapabilityKey, CrmLimits, CrmAllowedProviders, TenantCrmEntitlementTimelineEntry } from "../types";
import { CRM_PROVIDER_OPTIONS } from "../types";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-700";

const LIMIT_FIELDS: [keyof CrmLimits, string][] = [
  ["pipelines", "Pipelines"],
  ["automationRules", "Automation Rules"],
  ["documentStorageGb", "Storage (GB)"],
  ["integrationConnections", "Integrations"],
  ["telephonyMinutesMonthly", "Telephony Minutes"],
  ["proposalsMonthly", "Proposals / Month"],
  ["contractsMonthly", "Contracts / Month"],
];

export default function CrmEntitlementsTab({
  availableCrmPackages,
  availableCrmCapabilities,
  crmPackageKey,
  setCrmPackageKey,
  crmCapabilities,
  toggleCrmCapability,
  crmDependencyErrors,
  crmLimits,
  updateCrmLimit,
  crmProviders,
  toggleCrmProvider,
  savingCrmEntitlements,
  saveCrmEntitlements,
  crmTimeline,
  loadingCrmTimeline,
}: {
  availableCrmPackages: CrmPackageKey[];
  availableCrmCapabilities: CrmCapabilityKey[];
  crmPackageKey: CrmPackageKey;
  setCrmPackageKey: (value: CrmPackageKey) => void;
  crmCapabilities: CrmCapabilityKey[];
  toggleCrmCapability: (capability: CrmCapabilityKey) => void;
  crmDependencyErrors: string[];
  crmLimits: CrmLimits;
  updateCrmLimit: (key: keyof CrmLimits, rawValue: string) => void;
  crmProviders: CrmAllowedProviders;
  toggleCrmProvider: (group: keyof CrmAllowedProviders, provider: string) => void;
  savingCrmEntitlements: boolean;
  saveCrmEntitlements: () => Promise<void>;
  crmTimeline: TenantCrmEntitlementTimelineEntry[];
  loadingCrmTimeline: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">CRM Package and Capabilities</h3>
        <p className="mt-1 text-xs text-gray-500">Assign package and fine tune CRM features for this tenant.</p>

        <div className="mt-3">
          <label className={labelClass}>Package</label>
          <select className={inputClass} value={crmPackageKey} onChange={(e) => setCrmPackageKey(e.target.value as CrmPackageKey)}>
            {availableCrmPackages.map((pkg) => (
              <option key={pkg} value={pkg}>
                {pkg}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-gray-700">Capabilities</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {availableCrmCapabilities.map((capability) => {
              const checked = crmCapabilities.includes(capability);
              return (
                <label
                  key={capability}
                  className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs ${
                    checked ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <span>{capability}</span>
                  <input type="checkbox" checked={checked} onChange={() => toggleCrmCapability(capability)} />
                </label>
              );
            })}
          </div>

          {crmDependencyErrors.length > 0 && (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
              <p className="font-semibold">Dependency issues</p>
              <ul className="ml-4 list-disc">
                {crmDependencyErrors.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">CRM Limits</h3>
          <div className="grid grid-cols-2 gap-3">
            {LIMIT_FIELDS.map(([key, label]) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input
                  type="number"
                  min={0}
                  value={crmLimits[key] ?? ""}
                  onChange={(e) => updateCrmLimit(key, e.target.value)}
                  placeholder="unlimited"
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Allowed Providers</h3>
          <div className="space-y-3">
            {(Object.keys(CRM_PROVIDER_OPTIONS) as (keyof CrmAllowedProviders)[]).map((group) => (
              <div key={group}>
                <p className="mb-1 text-xs font-semibold capitalize text-gray-700">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CRM_PROVIDER_OPTIONS[group].map((provider) => {
                    const checked = (crmProviders[group] || []).includes(provider);
                    return (
                      <label
                        key={`${group}-${provider}`}
                        className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${
                          checked ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                        }`}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleCrmProvider(group, provider)} />
                        {provider}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void saveCrmEntitlements()}
            disabled={savingCrmEntitlements}
            className="mt-4 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {savingCrmEntitlements ? "Saving..." : "Save CRM Entitlements"}
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Entitlement Timeline</h3>
          {loadingCrmTimeline ? (
            <p className="text-xs text-gray-500">Loading timeline...</p>
          ) : crmTimeline.length === 0 ? (
            <p className="text-xs text-gray-500">No CRM entitlement changes recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {crmTimeline.map((item) => (
                <div key={item.id} className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs">
                  <p className="font-semibold text-gray-900">{item.source || "manual_override"}</p>
                  <p className="text-gray-600">{item.reason || "No reason provided"}</p>
                  <p className="text-gray-400">
                    {new Date(item.createdAt).toLocaleString()} • {item.actor?.email || item.actor?.name || "unknown actor"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
