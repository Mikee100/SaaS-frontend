import React from "react";
import StatusBadge from "./StatusBadge";

interface MpesaConfigState {
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  mpesaShortCode: string;
  mpesaPasskey: string;
  mpesaCallbackUrl: string;
  mpesaEnvironment: string;
  mpesaIsActive: boolean;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-700";

export default function IntegrationsTab({
  mpesaConfig,
  setMpesaConfig,
  savingMpesa,
  testingMpesa,
  mpesaStatus,
  saveMpesaConfig,
  verifyMpesaConfig,
  restaurantAddonEnabled,
  setRestaurantAddonEnabled,
  savingRestaurantAddon,
  saveRestaurantAddon,
}: {
  mpesaConfig: MpesaConfigState;
  setMpesaConfig: React.Dispatch<React.SetStateAction<MpesaConfigState>>;
  savingMpesa: boolean;
  testingMpesa: boolean;
  mpesaStatus: "disconnected" | "connected";
  saveMpesaConfig: () => Promise<void>;
  verifyMpesaConfig: () => Promise<void>;
  restaurantAddonEnabled: boolean;
  setRestaurantAddonEnabled: (value: boolean) => void;
  savingRestaurantAddon: boolean;
  saveRestaurantAddon: () => Promise<void>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">M-Pesa Integration</h3>
          <StatusBadge tone={mpesaStatus === "connected" ? "success" : "neutral"}>
            {mpesaStatus === "connected" ? "Connected" : "Disconnected"}
          </StatusBadge>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Consumer Key</label>
            <input
              className={inputClass}
              value={mpesaConfig.mpesaConsumerKey}
              onChange={(e) => setMpesaConfig((prev) => ({ ...prev, mpesaConsumerKey: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Consumer Secret</label>
            <input
              type="password"
              className={inputClass}
              value={mpesaConfig.mpesaConsumerSecret}
              onChange={(e) => setMpesaConfig((prev) => ({ ...prev, mpesaConsumerSecret: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Short Code</label>
            <input
              className={inputClass}
              value={mpesaConfig.mpesaShortCode}
              onChange={(e) => setMpesaConfig((prev) => ({ ...prev, mpesaShortCode: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Passkey</label>
            <input
              type="password"
              className={inputClass}
              value={mpesaConfig.mpesaPasskey}
              onChange={(e) => setMpesaConfig((prev) => ({ ...prev, mpesaPasskey: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Callback URL</label>
            <input
              className={inputClass}
              value={mpesaConfig.mpesaCallbackUrl}
              onChange={(e) => setMpesaConfig((prev) => ({ ...prev, mpesaCallbackUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Environment</label>
            <select
              className={inputClass}
              value={mpesaConfig.mpesaEnvironment}
              onChange={(e) => setMpesaConfig((prev) => ({ ...prev, mpesaEnvironment: e.target.value }))}
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={mpesaConfig.mpesaIsActive}
              onChange={(e) => setMpesaConfig((prev) => ({ ...prev, mpesaIsActive: e.target.checked }))}
            />
            Enable M-Pesa
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => void saveMpesaConfig()}
              disabled={savingMpesa}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingMpesa ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void verifyMpesaConfig()}
              disabled={testingMpesa}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              title="Confirms the saved config matches this form — not a live Safaricom connectivity test."
            >
              {testingMpesa ? "Verifying..." : "Verify Saved Config"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Integration Status</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">M-Pesa</span>
            <StatusBadge tone={mpesaStatus === "connected" ? "success" : "neutral"}>
              {mpesaStatus === "connected" ? "Connected" : "Disconnected"}
            </StatusBadge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Restaurant Add-on</span>
            <StatusBadge tone={restaurantAddonEnabled ? "success" : "neutral"}>
              {restaurantAddonEnabled ? "Enabled" : "Disabled"}
            </StatusBadge>
          </div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={restaurantAddonEnabled}
              onChange={(e) => setRestaurantAddonEnabled(e.target.checked)}
            />
            Enable Restaurant POS add-on
          </label>
          <button
            type="button"
            onClick={() => void saveRestaurantAddon()}
            disabled={savingRestaurantAddon}
            className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {savingRestaurantAddon ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
