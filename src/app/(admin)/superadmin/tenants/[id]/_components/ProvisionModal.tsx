import React from "react";
import type { TenantDetails, ClassificationOption } from "../types";

export default function ProvisionModal({
  tenant,
  classificationOptions,
  selectedClassificationId,
  setSelectedClassificationId,
  savingProvisioning,
  onCancel,
  onConfirm,
}: {
  tenant: TenantDetails;
  classificationOptions: ClassificationOption[];
  selectedClassificationId: string;
  setSelectedClassificationId: (value: string) => void;
  savingProvisioning: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">Assign Classification</h3>
        <p className="mt-1 text-sm text-gray-500">
          {tenant.name} • {tenant.businessType}
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-700">Classification</label>
          <select
            value={selectedClassificationId}
            onChange={(e) => setSelectedClassificationId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select classification</option>
            {classificationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={savingProvisioning || !selectedClassificationId}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProvisioning ? "Provisioning..." : "Assign + Provision"}
          </button>
        </div>
      </div>
    </div>
  );
}
