import React from "react";
import type { TenantDetails } from "../types";
import { EAST_AFRICAN_COUNTRIES } from "../types";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-700";

export default function BusinessKraTab({
  businessKra,
  setBusinessKra,
  savingBusinessKra,
  saveBusinessKra,
  availableBusinessTypes,
}: {
  businessKra: Partial<TenantDetails>;
  setBusinessKra: React.Dispatch<React.SetStateAction<Partial<TenantDetails>>>;
  savingBusinessKra: boolean;
  saveBusinessKra: () => Promise<void>;
  availableBusinessTypes: string[];
}) {
  const businessTypeOptions = React.useMemo(() => {
    const set = new Set(availableBusinessTypes);
    if (businessKra.businessType) set.add(businessKra.businessType);
    return Array.from(set);
  }, [availableBusinessTypes, businessKra.businessType]);

  return (
    <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Business & KRA Details</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>Business Name</label>
          <input
            className={inputClass}
            value={businessKra.name || ""}
            onChange={(e) => setBusinessKra((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Business Type</label>
          <select
            className={inputClass}
            value={businessKra.businessType || ""}
            onChange={(e) => setBusinessKra((prev) => ({ ...prev, businessType: e.target.value }))}
          >
            <option value="">Select business type</option>
            {businessTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Contact Email</label>
          <input
            className={inputClass}
            value={businessKra.contactEmail || ""}
            onChange={(e) => setBusinessKra((prev) => ({ ...prev, contactEmail: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Contact Phone</label>
          <input
            className={inputClass}
            value={businessKra.contactPhone || ""}
            onChange={(e) => setBusinessKra((prev) => ({ ...prev, contactPhone: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Address</label>
          <input
            className={inputClass}
            value={businessKra.address || ""}
            onChange={(e) => setBusinessKra((prev) => ({ ...prev, address: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Country</label>
          <select
            className={inputClass}
            value={businessKra.country || ""}
            onChange={(e) => setBusinessKra((prev) => ({ ...prev, country: e.target.value }))}
          >
            <option value="">Select country</option>
            {EAST_AFRICAN_COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={!!businessKra.kraEnabled}
          onChange={(e) => setBusinessKra((prev) => ({ ...prev, kraEnabled: e.target.checked }))}
        />
        KRA compliance enabled
      </label>

      {businessKra.kraEnabled && (
        <div className="mt-3 grid gap-3 rounded-md bg-gray-50 p-3 md:grid-cols-2">
          <div>
            <label className={labelClass}>KRA PIN</label>
            <input
              className={inputClass}
              value={businessKra.kraPin || ""}
              onChange={(e) => setBusinessKra((prev) => ({ ...prev, kraPin: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>VAT Number</label>
            <input
              className={inputClass}
              value={businessKra.vatNumber || ""}
              onChange={(e) => setBusinessKra((prev) => ({ ...prev, vatNumber: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>eTIMS QR Code URL</label>
            <input
              className={inputClass}
              value={businessKra.etimsQrUrl || ""}
              onChange={(e) => setBusinessKra((prev) => ({ ...prev, etimsQrUrl: e.target.value }))}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void saveBusinessKra()}
        disabled={savingBusinessKra}
        className="mt-4 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {savingBusinessKra ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
