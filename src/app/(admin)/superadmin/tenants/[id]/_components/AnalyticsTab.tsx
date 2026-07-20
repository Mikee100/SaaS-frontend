import React from "react";
import type { TenantDetails } from "../types";
import { formatSpace } from "../utils";

export default function AnalyticsTab({ tenant }: { tenant: TenantDetails }) {
  const resourceUsage = tenant.resourceSpaceUsage || {};
  const entries = Object.entries(resourceUsage);
  const maxValue = entries.length > 0 ? Math.max(...entries.map(([, v]) => v)) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Space Usage</h3>
        <p className="text-2xl font-bold text-gray-900">{formatSpace(parseFloat(tenant.spaceUsedMB || "0"))}</p>
        <p className="mt-1 text-xs text-gray-500">Current snapshot, not a historical trend.</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Resource Distribution</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No resource breakdown available.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(([resource, value]) => (
              <div key={resource}>
                <div className="mb-1 flex justify-between text-xs text-gray-600">
                  <span>{resource}</span>
                  <span>{formatSpace(value)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: maxValue > 0 ? `${(value / maxValue) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
