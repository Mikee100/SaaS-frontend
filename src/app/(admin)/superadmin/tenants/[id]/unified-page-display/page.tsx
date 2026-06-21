"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import { apiGet, apiPut } from "@/utils/api";
import { FaArrowLeft, FaCheckCircle, FaSlidersH } from "react-icons/fa";

type BusinessType = "fashion" | "restaurant" | "spa_barber";

interface UnifiedProductsDisplayConfig {
  version: "v1";
  global: {
    showWorkflowPanel: boolean;
    showDescription: boolean;
    showImages: boolean;
    showCategory: boolean;
  };
  restaurant: {
    showAllergens: boolean;
    showPrepStation: boolean;
    showTaxClass: boolean;
  };
  fashion: {
    showBrand: boolean;
    showSeason: boolean;
    showSupplier: boolean;
    enableVariationTypeSelector: boolean;
  };
  spa: {
    showDurationMinutes: boolean;
    showStaffSkillLevel: boolean;
    showCommissionProfile: boolean;
    showConsumables: boolean;
  };
}

interface TenantDisplayResponse {
  tenantId: string;
  key: string;
  businessType: BusinessType;
  config: UnifiedProductsDisplayConfig;
}

interface TenantInfo {
  id: string;
  name: string;
  businessType?: string;
}

function ToggleRow({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded border border-slate-200 bg-white px-3 py-2">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4"
      />
    </label>
  );
}

export default function TenantUnifiedPageDisplaySettingsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const params = useParams();
  const tenantId = String(params?.id || "");

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>("fashion");
  const [config, setConfig] = useState<UnifiedProductsDisplayConfig | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      setLoadingData(true);
      try {
        const [tenantInfo, display] = await Promise.all([
          apiGet<TenantInfo>(`/admin/tenants/${tenantId}`),
          apiGet<TenantDisplayResponse>(`/admin/tenants/${tenantId}/unified-products-display`),
        ]);
        setTenant(tenantInfo);
        setBusinessType(display.businessType);
        setConfig(display.config);
      } catch (error) {
        console.error("Failed to load unified page display config", error);
        alert("Failed to load unified page display settings");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [tenantId]);

  const businessLabel = useMemo(() => {
    if (businessType === "restaurant") return "Restaurant";
    if (businessType === "spa_barber") return "Spa & Barber";
    return "Fashion";
  }, [businessType]);

  if (loading || !user) return null;

  if (loadingData || !config) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-4">
        <p className="text-sm text-slate-600">Loading unified page display settings...</p>
      </main>
    );
  }

  const save = async () => {
    try {
      setSaving(true);
      await apiPut(`/admin/tenants/${tenantId}/unified-products-display`, { config });
      alert("Unified page display settings saved successfully.");
    } catch (error) {
      console.error("Failed to save unified page display settings", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <button
          onClick={() => router.push(`/superadmin/tenants/${tenantId}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700"
        >
          <FaArrowLeft /> Back to Tenant
        </button>

        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Unified Page Display Settings</h1>
              <p className="text-sm text-slate-600">
                Tenant: <span className="font-semibold">{tenant?.name || tenantId}</span> • Active business: {businessLabel}
              </p>
            </div>
            <FaSlidersH className="h-5 w-5 text-slate-500" />
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Global</h2>
          <ToggleRow
            label="Show workflow guidance panel"
            checked={config.global.showWorkflowPanel}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, global: { ...prev.global, showWorkflowPanel: next } } : prev))
            }
          />
          <ToggleRow
            label="Show description field"
            checked={config.global.showDescription}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, global: { ...prev.global, showDescription: next } } : prev))
            }
          />
          <ToggleRow
            label="Show product images section"
            checked={config.global.showImages}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, global: { ...prev.global, showImages: next } } : prev))
            }
          />
          <ToggleRow
            label="Show category field"
            checked={config.global.showCategory}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, global: { ...prev.global, showCategory: next } } : prev))
            }
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Restaurant Inputs</h2>
          <ToggleRow
            label="Show allergens"
            checked={config.restaurant.showAllergens}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, restaurant: { ...prev.restaurant, showAllergens: next } } : prev))
            }
          />
          <ToggleRow
            label="Show prep station"
            checked={config.restaurant.showPrepStation}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, restaurant: { ...prev.restaurant, showPrepStation: next } } : prev))
            }
          />
          <ToggleRow
            label="Show tax class"
            checked={config.restaurant.showTaxClass}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, restaurant: { ...prev.restaurant, showTaxClass: next } } : prev))
            }
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Fashion Inputs</h2>
          <ToggleRow
            label="Show brand"
            checked={config.fashion.showBrand}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, fashion: { ...prev.fashion, showBrand: next } } : prev))
            }
          />
          <ToggleRow
            label="Show season"
            checked={config.fashion.showSeason}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, fashion: { ...prev.fashion, showSeason: next } } : prev))
            }
          />
          <ToggleRow
            label="Show supplier"
            checked={config.fashion.showSupplier}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, fashion: { ...prev.fashion, showSupplier: next } } : prev))
            }
          />
          <ToggleRow
            label="Enable variation type selector"
            checked={config.fashion.enableVariationTypeSelector}
            onChange={(next) =>
              setConfig((prev) =>
                prev
                  ? {
                      ...prev,
                      fashion: {
                        ...prev.fashion,
                        enableVariationTypeSelector: next,
                      },
                    }
                  : prev,
              )
            }
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Spa & Barber Inputs</h2>
          <ToggleRow
            label="Show duration (minutes)"
            checked={config.spa.showDurationMinutes}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, spa: { ...prev.spa, showDurationMinutes: next } } : prev))
            }
          />
          <ToggleRow
            label="Show staff skill level"
            checked={config.spa.showStaffSkillLevel}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, spa: { ...prev.spa, showStaffSkillLevel: next } } : prev))
            }
          />
          <ToggleRow
            label="Show commission profile"
            checked={config.spa.showCommissionProfile}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, spa: { ...prev.spa, showCommissionProfile: next } } : prev))
            }
          />
          <ToggleRow
            label="Show consumables"
            checked={config.spa.showConsumables}
            onChange={(next) =>
              setConfig((prev) => (prev ? { ...prev, spa: { ...prev.spa, showConsumables: next } } : prev))
            }
          />
        </section>

        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaCheckCircle /> {saving ? "Saving..." : "Save Display Settings"}
          </button>
        </div>
      </div>
    </main>
  );
}
