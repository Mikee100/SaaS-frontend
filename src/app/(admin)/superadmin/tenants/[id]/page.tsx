"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter, useParams } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/utils/api";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { FaArrowLeft, FaStore, FaUsers, FaBuilding, FaReceipt, FaDatabase, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import type {
  AppModuleKey,
  TenantModulesResponse,
  ModulePresetDefinition,
  ModulePresetsResponse,
  ModulePermissionMatrixEntry,
  ModulePermissionMatrixResponse,
  BlueprintCatalogEntry,
  BlueprintCatalogResponse,
  TenantBlueprintPreviewResponse,
  TenantBlueprintResponse,
  CrmPackageKey,
  CrmCapabilityKey,
  CrmLimits,
  CrmAllowedProviders,
  TenantCrmEntitlementsResponse,
  TenantCrmEntitlementTimelineEntry,
  TenantCrmEntitlementTimelineResponse,
  TenantDetails,
  ClassificationOption,
  MpesaConfigApiResponse,
  Product,
  Transaction,
  Branch,
  TenantUserSummary,
  TabKey,
  Notice,
  ConfirmActionState,
} from "./types";
import OverviewTab from "./_components/OverviewTab";
import ProductsTab from "./_components/ProductsTab";
import TransactionsTab from "./_components/TransactionsTab";
import BranchesTab from "./_components/BranchesTab";
import AnalyticsTab from "./_components/AnalyticsTab";
import IntegrationsTab from "./_components/IntegrationsTab";
import BusinessKraTab from "./_components/BusinessKraTab";
import ModulesTab from "./_components/ModulesTab";
import CrmEntitlementsTab from "./_components/CrmEntitlementsTab";
import ProvisionModal from "./_components/ProvisionModal";
import PasswordResetTab from "./_components/PasswordResetTab";
import { formatDate, formatCurrency, formatSpace } from "./utils";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "products", label: "Products" },
  { key: "transactions", label: "Transactions" },
  { key: "branches", label: "Branches" },
  { key: "analytics", label: "Analytics" },
  { key: "integrations", label: "Integrations" },
  { key: "business-kra", label: "Business & KRA" },
  { key: "modules", label: "Modules" },
  { key: "crm-entitlements", label: "CRM Entitlements" },
  { key: "password-reset", label: "Password Reset" },
];

const DEFAULT_CRM_LIMITS: CrmLimits = {
  pipelines: 1,
  automationRules: 0,
  documentStorageGb: 2,
  integrationConnections: 2,
  telephonyMinutesMonthly: 0,
  proposalsMonthly: 0,
  contractsMonthly: 0,
};

const DEFAULT_CRM_PROVIDERS: CrmAllowedProviders = {
  calendar: [],
  email: [],
  telephony: [],
  integrations: [],
};

export default function TenantDetailsPage() {
  const { user, loading, refreshUser } = useUser();
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id as string;

  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUserSummary[]>([]);
  const [loadingTenantUsers, setLoadingTenantUsers] = useState(false);
  const [tenantUsersLoadError, setTenantUsersLoadError] = useState<string | null>(null);
  const [selectedPasswordResetUserId, setSelectedPasswordResetUserId] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [tenantLoadError, setTenantLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [availableModules, setAvailableModules] = useState<AppModuleKey[]>([]);
  const [enabledModules, setEnabledModules] = useState<AppModuleKey[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [modulePresets, setModulePresets] = useState<ModulePresetDefinition[]>([]);
  const [selectedModulePreset, setSelectedModulePreset] = useState("");
  const [applyingModulePreset, setApplyingModulePreset] = useState(false);
  const [blueprintCatalog, setBlueprintCatalog] = useState<BlueprintCatalogEntry[]>([]);
  const [blueprintNavigationCatalog, setBlueprintNavigationCatalog] = useState<BlueprintCatalogEntry["navigation"]>([]);
  const [selectedBusinessType, setSelectedBusinessType] = useState("fashion");
  const [selectedBlueprintKey, setSelectedBlueprintKey] = useState("");
  const [selectedBlueprintVersion, setSelectedBlueprintVersion] = useState("v1");
  const [selectedNavigationKeys, setSelectedNavigationKeys] = useState<string[]>([]);
  const [installedAppsInput, setInstalledAppsInput] = useState("");
  const [featureFlagsInput, setFeatureFlagsInput] = useState("{}");
  const [savingBlueprint, setSavingBlueprint] = useState(false);
  const [previewingBlueprint, setPreviewingBlueprint] = useState(false);
  const [rollingBackBlueprint, setRollingBackBlueprint] = useState(false);
  const [blueprintPreview, setBlueprintPreview] = useState<TenantBlueprintPreviewResponse | null>(null);
  const [modulePermissionMatrix, setModulePermissionMatrix] = useState<ModulePermissionMatrixEntry[]>([]);
  const [moduleMatrixRoles, setModuleMatrixRoles] = useState<string[]>([]);
  const [loadingModuleMatrix, setLoadingModuleMatrix] = useState(false);

  const [availableCrmPackages, setAvailableCrmPackages] = useState<CrmPackageKey[]>(["starter", "growth", "pro", "enterprise"]);
  const [availableCrmCapabilities, setAvailableCrmCapabilities] = useState<CrmCapabilityKey[]>([]);
  const [crmPackageKey, setCrmPackageKey] = useState<CrmPackageKey>("starter");
  const [crmCapabilities, setCrmCapabilities] = useState<CrmCapabilityKey[]>([]);
  const [crmLimits, setCrmLimits] = useState<CrmLimits>(DEFAULT_CRM_LIMITS);
  const [crmProviders, setCrmProviders] = useState<CrmAllowedProviders>(DEFAULT_CRM_PROVIDERS);
  const [savingCrmEntitlements, setSavingCrmEntitlements] = useState(false);
  const [crmTimeline, setCrmTimeline] = useState<TenantCrmEntitlementTimelineEntry[]>([]);
  const [loadingCrmTimeline, setLoadingCrmTimeline] = useState(false);

  const [businessKra, setBusinessKra] = useState<Partial<TenantDetails>>({});
  const [savingBusinessKra, setSavingBusinessKra] = useState(false);
  const [restaurantAddonEnabled, setRestaurantAddonEnabled] = useState(false);
  const [savingRestaurantAddon, setSavingRestaurantAddon] = useState(false);

  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [classificationOptions, setClassificationOptions] = useState<ClassificationOption[]>([]);
  const [loadingClassifications, setLoadingClassifications] = useState(false);
  const [selectedClassificationId, setSelectedClassificationId] = useState("");
  const [savingProvisioning, setSavingProvisioning] = useState(false);

  const [mpesaConfig, setMpesaConfig] = useState({
    mpesaConsumerKey: "",
    mpesaConsumerSecret: "",
    mpesaShortCode: "",
    mpesaPasskey: "",
    mpesaCallbackUrl: "",
    mpesaEnvironment: "sandbox",
    mpesaIsActive: false,
  });
  const [savingMpesa, setSavingMpesa] = useState(false);
  const [testingMpesa, setTestingMpesa] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<"disconnected" | "connected">("disconnected");

  const [notice, setNotice] = useState<Notice>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const showSuccess = useCallback((message: string) => setNotice({ type: "success", message }), []);
  const showError = useCallback((message: string) => setNotice({ type: "error", message }), []);
  const requestConfirm = useCallback((state: ConfirmActionState) => setConfirmAction(state), []);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const refreshModulePermissionMatrix = useCallback(async () => {
    const latestMatrix = await apiGet<ModulePermissionMatrixResponse>(
      `/admin/tenants/${tenantId}/module-permission-matrix?t=${Date.now()}`,
    );
    setModulePermissionMatrix(Array.isArray(latestMatrix?.matrix) ? latestMatrix.matrix : []);
    setModuleMatrixRoles(Array.isArray(latestMatrix?.roles) ? latestMatrix.roles : []);
  }, [tenantId]);

  const fetchTenantData = useCallback(async () => {
    try {
      setLoadingData(true);
      setTenantLoadError(null);

      const tenantDetails = await apiGet<TenantDetails>(`/admin/tenants/${tenantId}`);
      setLoadingTenantUsers(true);
      setTenantUsersLoadError(null);
      const [tenantProductsResult, tenantTransactionsResult, tenantBranchesResult, tenantUsersResult] = await Promise.allSettled([
        apiGet<Product[]>(`/admin/tenants/${tenantId}/products`),
        apiGet<Transaction[]>(`/admin/tenants/${tenantId}/transactions`),
        apiGet<Branch[]>(`/admin/tenants/${tenantId}/branches`),
        apiGet<TenantUserSummary[]>(`/admin/tenants/${tenantId}/users`),
      ]);

      setTenant(tenantDetails);
      setRestaurantAddonEnabled(!!tenantDetails.restaurantFeaturesEnabled);
      setBusinessKra({
        name: tenantDetails.name,
        businessType: tenantDetails.businessType,
        contactEmail: tenantDetails.contactEmail,
        contactPhone: tenantDetails.contactPhone ?? "",
        address: tenantDetails.address ?? "",
        country: tenantDetails.country ?? "",
        kraEnabled: tenantDetails.kraEnabled ?? false,
        kraPin: tenantDetails.kraPin ?? "",
        vatNumber: tenantDetails.vatNumber ?? "",
        etimsQrUrl: tenantDetails.etimsQrUrl ?? "",
      });
      setProducts(tenantProductsResult.status === "fulfilled" ? tenantProductsResult.value : []);
      setTransactions(tenantTransactionsResult.status === "fulfilled" ? tenantTransactionsResult.value : []);
      setBranches(tenantBranchesResult.status === "fulfilled" ? tenantBranchesResult.value : []);
      let loadedUsers: TenantUserSummary[] = [];
      if (tenantUsersResult.status === "fulfilled" && Array.isArray(tenantUsersResult.value)) {
        loadedUsers = tenantUsersResult.value;
      }

      // Some environments return an empty tenant users list even when users exist.
      // Fall back to the global admin users endpoint when the direct lookup is empty or fails.
      if (loadedUsers.length === 0) {
        try {
          const allUsers = await apiGet<Array<{
            id: string;
            name: string;
            email: string;
            isDisabled: boolean;
            createdAt: string;
            tenantId?: string | null;
            tenant?: { id?: string } | null;
            userRoles?: Array<{ tenantId?: string | null }>;
          }>>("/admin/users");
          loadedUsers = (Array.isArray(allUsers) ? allUsers : [])
            .filter(
              (u) =>
                u?.tenant?.id === tenantId ||
                u?.tenantId === tenantId ||
                (Array.isArray(u?.userRoles) &&
                  u.userRoles.some((roleLink) => roleLink?.tenantId === tenantId)),
            )
            .map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              isDisabled: !!u.isDisabled,
              createdAt: u.createdAt,
            }));

          if (loadedUsers.length === 0 && tenantDetails?.contactEmail) {
            const normalizedContactEmail = tenantDetails.contactEmail.toLowerCase().trim();
            const byEmail = (Array.isArray(allUsers) ? allUsers : []).find(
              (u) => (u?.email || "").toLowerCase().trim() === normalizedContactEmail,
            );

            if (byEmail) {
              loadedUsers = [
                {
                  id: byEmail.id,
                  name: byEmail.name,
                  email: byEmail.email,
                  isDisabled: !!byEmail.isDisabled,
                  createdAt: byEmail.createdAt,
                },
              ];
            }
          }
        } catch {
          setTenantUsersLoadError("Could not load tenant users. Reload after backend restart.");
        }
      }

      setTenantUsers(loadedUsers);
      setSelectedPasswordResetUserId((prev) => {
        if (prev && loadedUsers.some((u) => u.id === prev)) return prev;
        return loadedUsers[0]?.id || "";
      });

      const modules = await apiGet<TenantModulesResponse>(`/admin/tenants/${tenantId}/modules?t=${Date.now()}`);
      setAvailableModules(Array.isArray(modules?.availableModules) ? modules.availableModules : []);
      setEnabledModules(Array.isArray(modules?.enabledModules) ? modules.enabledModules : []);

      setLoadingModuleMatrix(true);
      try {
        await refreshModulePermissionMatrix();
      } finally {
        setLoadingModuleMatrix(false);
      }

      try {
        const presets = await apiGet<ModulePresetsResponse>("/admin/module-presets", { "x-suppress-error-log": "true" });
        setModulePresets(Array.isArray(presets?.presets) ? presets.presets : []);
      } catch (presetError) {
        console.warn("Failed to load module presets:", presetError);
        setModulePresets([]);
      }

      try {
        const [catalog, blueprint] = await Promise.all([
          apiGet<BlueprintCatalogResponse>("/admin/blueprints", { "x-suppress-error-log": "true" }),
          apiGet<TenantBlueprintResponse>(`/admin/tenants/${tenantId}/blueprint?t=${Date.now()}`, { "x-suppress-error-log": "true" }),
        ]);

        const blueprints = Array.isArray(catalog?.blueprints) ? catalog.blueprints : [];
        const navigationCatalog = Array.isArray(catalog?.navigationCatalog) ? catalog.navigationCatalog : [];
        const configured = blueprint?.configured;

        setBlueprintCatalog(blueprints);
        setBlueprintNavigationCatalog(navigationCatalog);
        setSelectedBusinessType(configured?.businessType || blueprints[0]?.businessType || "fashion");
        setSelectedBlueprintVersion(configured?.blueprintVersion || "v1");

        const preferredKey =
          configured?.blueprintKey ||
          blueprints.find((entry) => entry.businessType === (configured?.businessType || "fashion"))?.blueprintKey ||
          blueprints[0]?.blueprintKey ||
          "";

        setSelectedBlueprintKey(preferredKey);
        const preferredBlueprint = blueprints.find((entry) => entry.blueprintKey === preferredKey);
        const defaultNavigationKeys = Array.isArray(preferredBlueprint?.navigation)
          ? preferredBlueprint.navigation.map((item) => String(item?.key || "").trim().toLowerCase()).filter((item) => item.length > 0)
          : [];
        const configuredNavigationKeys = Array.isArray(configured?.navigationKeys)
          ? configured.navigationKeys.map((entry) => String(entry || "").trim().toLowerCase()).filter((entry) => entry.length > 0)
          : [];
        setSelectedNavigationKeys(blueprint?.configuredNavigationKeysSet ? configuredNavigationKeys : defaultNavigationKeys);
        setInstalledAppsInput((configured?.installedApps || []).join(", "));
        setFeatureFlagsInput(JSON.stringify(configured?.featureFlags || {}, null, 2));
      } catch (blueprintError) {
        console.warn("Failed to load blueprint configuration:", blueprintError);
        setBlueprintCatalog([]);
        setBlueprintNavigationCatalog([]);
        setSelectedNavigationKeys([]);
        setSelectedBusinessType("fashion");
        setSelectedBlueprintKey("");
        setSelectedBlueprintVersion("v1");
      }

      const crm = await apiGet<TenantCrmEntitlementsResponse>(`/admin/tenants/${tenantId}/crm-entitlements`);
      if (crm?.entitlements) {
        setAvailableCrmPackages(Array.isArray(crm.availablePackages) ? crm.availablePackages : ["starter", "growth", "pro", "enterprise"]);
        setAvailableCrmCapabilities(Array.isArray(crm.availableCapabilities) ? crm.availableCapabilities : []);
        setCrmPackageKey(crm.entitlements.packageKey || "starter");
        setCrmCapabilities(Array.isArray(crm.entitlements.enabledCapabilities) ? crm.entitlements.enabledCapabilities : []);
        setCrmLimits(crm.entitlements.limits || DEFAULT_CRM_LIMITS);
        setCrmProviders(crm.entitlements.allowedProviders || DEFAULT_CRM_PROVIDERS);
      }

      setLoadingCrmTimeline(true);
      try {
        const timeline = await apiGet<TenantCrmEntitlementTimelineResponse>(`/admin/tenants/${tenantId}/crm-entitlements/timeline?limit=20`);
        setCrmTimeline(Array.isArray(timeline?.items) ? timeline.items : []);
      } finally {
        setLoadingCrmTimeline(false);
      }
    } catch (error) {
      console.error("Failed to fetch tenant data:", error);
      const message = error instanceof Error ? error.message : "Failed to load tenant data.";
      setTenantLoadError(message);
      showError(message || "Failed to load tenant data.");
    } finally {
      setLoadingTenantUsers(false);
      setLoadingData(false);
    }
  }, [tenantId, refreshModulePermissionMatrix, showError]);

  const fetchMpesaConfig = useCallback(async () => {
    try {
      const config = (await apiGet(`/mpesa/config?tenantId=${encodeURIComponent(tenantId)}`)) as MpesaConfigApiResponse;
      if (config) {
        setMpesaConfig({
          mpesaConsumerKey: config.consumerKey || "",
          mpesaConsumerSecret: config.consumerSecret || "",
          mpesaShortCode: config.shortCode || "",
          mpesaPasskey: config.passkey || "",
          mpesaCallbackUrl: config.callbackUrl || "",
          mpesaEnvironment: config.environment || "sandbox",
          mpesaIsActive: config.isActive || false,
        });
        setMpesaStatus(config.isActive ? "connected" : "disconnected");
      }
    } catch (error) {
      console.error("Failed to fetch M-Pesa config:", error);
    }
  }, [tenantId]);

  useEffect(() => {
    if (user?.isSuperadmin && tenantId) {
      fetchTenantData();
      fetchMpesaConfig();
    }
  }, [user, tenantId, fetchTenantData, fetchMpesaConfig]);

  const toggleModule = (moduleKey: AppModuleKey) => {
    setEnabledModules((prev) => (prev.includes(moduleKey) ? prev.filter((entry) => entry !== moduleKey) : [...prev, moduleKey]));
  };

  const toggleNavigationKey = (navKey: string) => {
    setSelectedNavigationKeys((prev) => (prev.includes(navKey) ? prev.filter((entry) => entry !== navKey) : [...prev, navKey]));
  };

  const selectedBlueprintDefinition = React.useMemo(
    () => blueprintCatalog.find((entry) => entry.blueprintKey === selectedBlueprintKey),
    [blueprintCatalog, selectedBlueprintKey],
  );
  const availableNavigationOptions = React.useMemo(
    () =>
      Array.isArray(blueprintNavigationCatalog) && blueprintNavigationCatalog.length > 0
        ? blueprintNavigationCatalog
        : selectedBlueprintDefinition?.navigation || [],
    [blueprintNavigationCatalog, selectedBlueprintDefinition],
  );
  const availableBusinessTypes = React.useMemo(
    () => Array.from(new Set(blueprintCatalog.map((entry) => entry.businessType))).filter(Boolean),
    [blueprintCatalog],
  );

  const saveTenantModules = async () => {
    try {
      setSavingModules(true);
      await apiPut(`/admin/tenants/${tenantId}/modules`, { enabledModules });
      const latestModules = await apiGet<TenantModulesResponse>(`/admin/tenants/${tenantId}/modules?t=${Date.now()}`);
      setAvailableModules(Array.isArray(latestModules?.availableModules) ? latestModules.availableModules : []);
      setEnabledModules(Array.isArray(latestModules?.enabledModules) ? latestModules.enabledModules : []);
      await refreshModulePermissionMatrix();
      showSuccess("Tenant modules updated successfully.");
    } catch (error) {
      console.error("Failed to update tenant modules:", error);
      showError("Failed to update tenant modules.");
    } finally {
      setSavingModules(false);
    }
  };

  const applyModulePreset = async () => {
    if (!selectedModulePreset) {
      showError("Select a module preset first.");
      return;
    }
    const preset = modulePresets.find((entry) => entry.key === selectedModulePreset);
    if (!preset || !Array.isArray(preset.enabledModules) || preset.enabledModules.length === 0) {
      showError("Selected preset is invalid. Reload the page and try again.");
      return;
    }
    try {
      setApplyingModulePreset(true);
      await apiPut<TenantModulesResponse>(`/admin/tenants/${tenantId}/modules`, { enabledModules: preset.enabledModules });
      const latestModules = await apiGet<TenantModulesResponse>(`/admin/tenants/${tenantId}/modules?t=${Date.now()}`);
      setAvailableModules(Array.isArray(latestModules?.availableModules) ? latestModules.availableModules : []);
      setEnabledModules(Array.isArray(latestModules?.enabledModules) ? latestModules.enabledModules : []);
      await refreshModulePermissionMatrix();
      setSelectedModulePreset("");
      await refreshUser();
      showSuccess(`Module preset applied successfully: ${preset.label}.`);
    } catch (error) {
      console.error("Failed to apply module preset:", error);
      showError("Failed to apply module preset.");
    } finally {
      setApplyingModulePreset(false);
    }
  };

  const saveTenantBlueprint = async () => {
    if (!selectedBlueprintKey) {
      showError("Select a blueprint first.");
      return;
    }
    let parsedFeatureFlags: Record<string, boolean> = {};
    try {
      const parsed = JSON.parse(featureFlagsInput || "{}");
      if (typeof parsed === "object" && parsed !== null) {
        parsedFeatureFlags = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).filter(([, value]) => typeof value === "boolean"),
        ) as Record<string, boolean>;
      }
    } catch {
      showError("Feature flags must be valid JSON (object with boolean values).");
      return;
    }
    const installedApps = installedAppsInput.split(",").map((entry) => entry.trim().toLowerCase()).filter((entry) => entry.length > 0);

    try {
      setSavingBlueprint(true);
      const updated = await apiPut<TenantBlueprintResponse>(`/admin/tenants/${tenantId}/blueprint`, {
        businessType: selectedBusinessType,
        blueprintKey: selectedBlueprintKey,
        blueprintVersion: selectedBlueprintVersion || "v1",
        installedApps,
        featureFlags: parsedFeatureFlags,
        navigationKeys: selectedNavigationKeys,
      });

      const configured = updated?.configured;
      if (configured) {
        setSelectedBusinessType(configured.businessType || selectedBusinessType);
        setSelectedBlueprintKey(configured.blueprintKey || selectedBlueprintKey);
        setSelectedBlueprintVersion(configured.blueprintVersion || "v1");
        setInstalledAppsInput((configured.installedApps || []).join(", "));
        setFeatureFlagsInput(JSON.stringify(configured.featureFlags || {}, null, 2));
        setSelectedNavigationKeys(Array.isArray(configured.navigationKeys) ? configured.navigationKeys : []);
        setEnabledModules(Array.isArray(configured.enabledModules) ? configured.enabledModules : enabledModules);
      }

      await refreshModulePermissionMatrix();
      setBlueprintPreview(null);
      showSuccess("Tenant blueprint configuration updated successfully.");
    } catch (error) {
      console.error("Failed to update tenant blueprint:", error);
      showError("Failed to update tenant blueprint configuration.");
    } finally {
      setSavingBlueprint(false);
    }
  };

  const previewTenantBlueprint = async () => {
    if (!selectedBlueprintKey) {
      showError("Select a blueprint first.");
      return;
    }
    let parsedFeatureFlags: Record<string, boolean> = {};
    try {
      const parsed = JSON.parse(featureFlagsInput || "{}");
      if (typeof parsed === "object" && parsed !== null) {
        parsedFeatureFlags = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).filter(([, value]) => typeof value === "boolean"),
        ) as Record<string, boolean>;
      }
    } catch {
      showError("Feature flags must be valid JSON (object with boolean values).");
      return;
    }
    const installedApps = installedAppsInput.split(",").map((entry) => entry.trim().toLowerCase()).filter((entry) => entry.length > 0);

    try {
      setPreviewingBlueprint(true);
      const preview = await apiPost<TenantBlueprintPreviewResponse>(`/admin/tenants/${tenantId}/blueprint/preview`, {
        businessType: selectedBusinessType,
        blueprintKey: selectedBlueprintKey,
        blueprintVersion: selectedBlueprintVersion || "v1",
        installedApps,
        featureFlags: parsedFeatureFlags,
        navigationKeys: selectedNavigationKeys,
      });
      setBlueprintPreview(preview || null);
      showSuccess("Blueprint preview generated successfully.");
    } catch (error) {
      console.error("Failed to preview tenant blueprint:", error);
      showError("Failed to preview tenant blueprint configuration.");
    } finally {
      setPreviewingBlueprint(false);
    }
  };

  const doRollbackTenantBlueprint = async () => {
    try {
      setRollingBackBlueprint(true);
      const rolledBack = await apiPost<TenantBlueprintResponse>(`/admin/tenants/${tenantId}/blueprint/rollback`, {});
      const configured = rolledBack?.configured;
      if (configured) {
        setSelectedBusinessType(configured.businessType || "fashion");
        setSelectedBlueprintKey(configured.blueprintKey || "");
        setSelectedBlueprintVersion(configured.blueprintVersion || "v1");
        setInstalledAppsInput((configured.installedApps || []).join(", "));
        setFeatureFlagsInput(JSON.stringify(configured.featureFlags || {}, null, 2));
        setSelectedNavigationKeys(Array.isArray(configured.navigationKeys) ? configured.navigationKeys : []);
        setEnabledModules(Array.isArray(configured.enabledModules) ? configured.enabledModules : []);
      }
      await refreshModulePermissionMatrix();
      setBlueprintPreview(null);
      showSuccess("Tenant blueprint rolled back successfully.");
    } catch (error) {
      console.error("Failed to rollback tenant blueprint:", error);
      showError("Failed to rollback tenant blueprint configuration.");
    } finally {
      setRollingBackBlueprint(false);
    }
  };

  const rollbackTenantBlueprint = () => {
    requestConfirm({
      title: "Rollback blueprint configuration?",
      body: "This restores the previous blueprint snapshot from audit history.",
      confirmLabel: "Rollback",
      onConfirm: doRollbackTenantBlueprint,
    });
  };

  const toggleCrmCapability = (capability: CrmCapabilityKey) => {
    setCrmCapabilities((prev) => (prev.includes(capability) ? prev.filter((entry) => entry !== capability) : [...prev, capability]));
  };

  const updateCrmLimit = (key: keyof CrmLimits, rawValue: string) => {
    const parsed = rawValue.trim() === "" ? null : Number(rawValue);
    setCrmLimits((prev) => ({
      ...prev,
      [key]: parsed !== null && Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null,
    }));
  };

  const toggleCrmProvider = (group: keyof CrmAllowedProviders, provider: string) => {
    setCrmProviders((prev) => {
      const groupProviders = prev[group] || [];
      const updated = groupProviders.includes(provider) ? groupProviders.filter((entry) => entry !== provider) : [...groupProviders, provider];
      return { ...prev, [group]: updated };
    });
  };

  const crmDependencyErrors = React.useMemo(() => {
    const set = new Set(crmCapabilities);
    const errors: string[] = [];
    if (set.has("crm.meeting_scheduler") && !set.has("crm.calendar_integration")) errors.push("Meeting scheduler requires calendar integration.");
    if (set.has("crm.lead_scoring") && !set.has("crm.pipeline")) errors.push("Lead scoring requires visual pipeline.");
    if (set.has("crm.proposal_management") && !set.has("crm.documents")) errors.push("Proposal management requires document management.");
    if (set.has("crm.contract_management") && !set.has("crm.documents")) errors.push("Contract management requires document management.");
    if (set.has("crm.telephony") && !set.has("crm.third_party_integrations")) errors.push("Built-in telephony requires third-party integrations.");
    return errors;
  }, [crmCapabilities]);

  const saveCrmEntitlements = async () => {
    if (crmDependencyErrors.length > 0) {
      showError(`Please fix dependency issues before saving: ${crmDependencyErrors.join(" ")}`);
      return;
    }
    try {
      setSavingCrmEntitlements(true);
      await apiPut(`/admin/tenants/${tenantId}/crm-entitlements`, {
        packageKey: crmPackageKey,
        enabledCapabilities: crmCapabilities,
        limits: crmLimits,
        allowedProviders: crmProviders,
        source: "manual_override",
        reason: "superadmin ui update",
      });
      setLoadingCrmTimeline(true);
      try {
        const timeline = await apiGet<TenantCrmEntitlementTimelineResponse>(`/admin/tenants/${tenantId}/crm-entitlements/timeline?limit=20`);
        setCrmTimeline(Array.isArray(timeline?.items) ? timeline.items : []);
      } finally {
        setLoadingCrmTimeline(false);
      }
      showSuccess("CRM entitlements updated successfully.");
    } catch (error: any) {
      console.error("Failed to update CRM entitlements:", error);
      showError(error?.message || "Failed to update CRM entitlements.");
    } finally {
      setSavingCrmEntitlements(false);
    }
  };

  const normalizeBusinessToken = (input?: string | null) =>
    (input ?? "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  const resolveClassificationByBusinessType = (businessType: string | undefined, options: ClassificationOption[]) => {
    const normalized = normalizeBusinessToken(businessType);
    if (!normalized) return "";
    const exact = options.find((c) => normalizeBusinessToken(c.slug) === normalized || normalizeBusinessToken(c.name) === normalized);
    if (exact) return exact.id;
    const partial = options.find((c) => {
      const slug = normalizeBusinessToken(c.slug);
      const name = normalizeBusinessToken(c.name);
      return normalized.includes(slug) || slug.includes(normalized) || normalized.includes(name);
    });
    return partial?.id || "";
  };

  const openProvisionModal = async () => {
    if (!tenant) return;
    try {
      setLoadingClassifications(true);
      let data: ClassificationOption[] = [];
      try {
        data = await apiGet<ClassificationOption[]>("/admin/classifications", { "x-suppress-error-log": "true" });
      } catch {
        // Hosted environments may temporarily miss admin classification routes.
        data = await apiGet<ClassificationOption[]>("/classifications/public", { "x-suppress-error-log": "true" });
      }
      const active = Array.isArray(data) ? data.filter((c) => c.isActive !== false) : [];
      setClassificationOptions(active);
      const preselected = tenant.classificationId || resolveClassificationByBusinessType(tenant.businessType, active);
      setSelectedClassificationId(preselected || "");
      setShowProvisionModal(true);
    } catch (error) {
      console.error("Failed to load classifications:", error);
      showError("Failed to load classifications.");
    } finally {
      setLoadingClassifications(false);
    }
  };

  const assignAndProvisionMetrics = async () => {
    if (!tenant || !selectedClassificationId) return;
    try {
      setSavingProvisioning(true);
      const result = await apiPost<{ defaultsProvisioning?: { provisionedAttributes?: string[]; allowedUnits?: string[]; defaultUnit?: string | null } }>(
        `/admin/tenants/${tenant.id}/classification`,
        { classificationId: selectedClassificationId, provisionDefaults: true },
      );
      const defaults = result?.defaultsProvisioning;
      const attrs = defaults?.provisionedAttributes?.length ? defaults.provisionedAttributes.join(", ") : "none";
      const units = defaults?.allowedUnits?.length ? defaults.allowedUnits.join(", ") : "none";
      const defaultUnit = defaults?.defaultUnit || "not set";
      showSuccess(`Metrics provisioned. Attrs: ${attrs}. Units: ${units}. Default: ${defaultUnit}.`);
      setShowProvisionModal(false);
      await fetchTenantData();
    } catch (error: any) {
      console.error("Failed to assign and provision metrics:", error);
      showError(error?.message || "Failed to provision metrics.");
    } finally {
      setSavingProvisioning(false);
    }
  };

  const saveMpesaConfig = async () => {
    try {
      setSavingMpesa(true);
      await apiPost(`/mpesa/config`, {
        tenantId,
        mpesaConsumerKey: mpesaConfig.mpesaConsumerKey,
        mpesaConsumerSecret: mpesaConfig.mpesaConsumerSecret,
        mpesaShortCode: mpesaConfig.mpesaShortCode,
        mpesaPasskey: mpesaConfig.mpesaPasskey,
        mpesaCallbackUrl: mpesaConfig.mpesaCallbackUrl,
        mpesaIsActive: mpesaConfig.mpesaIsActive,
        mpesaEnvironment: mpesaConfig.mpesaEnvironment,
      });
      setMpesaStatus("connected");
      showSuccess("M-Pesa configuration saved successfully.");
    } catch (error) {
      console.error("Failed to save M-Pesa config:", error);
      showError("Failed to save M-Pesa configuration.");
    } finally {
      setSavingMpesa(false);
    }
  };

  /** Not a live Safaricom connectivity test — re-fetches the saved config and confirms the round-trip matches. */
  const verifyMpesaConfig = async () => {
    try {
      setTestingMpesa(true);
      const config = (await apiGet(`/mpesa/config?tenantId=${encodeURIComponent(tenantId)}`)) as MpesaConfigApiResponse;
      const matches =
        !!config &&
        config.shortCode === mpesaConfig.mpesaShortCode &&
        config.environment === mpesaConfig.mpesaEnvironment &&
        !!config.isActive === mpesaConfig.mpesaIsActive;
      setMpesaStatus(config?.isActive ? "connected" : "disconnected");
      if (matches) {
        showSuccess("Saved M-Pesa configuration verified.");
      } else {
        showError("Saved configuration does not match the form. Save again.");
      }
    } catch (error) {
      console.error("Failed to verify M-Pesa config:", error);
      showError("Failed to verify M-Pesa configuration.");
    } finally {
      setTestingMpesa(false);
    }
  };

  const resetTemporaryPassword = async () => {
    if (!tenantId || !selectedPasswordResetUserId) return;
    try {
      setResettingPassword(true);
      setTemporaryPassword("");
      const result = await apiPost<{ temporaryPassword: string; userName?: string; email?: string }>(
        `/admin/tenants/${tenantId}/users/${selectedPasswordResetUserId}/reset-temporary-password`,
        {},
      );
      setTemporaryPassword(result?.temporaryPassword || "");
      showSuccess(`Default password reset${result?.email ? ` for ${result.email}` : ""}.`);
    } catch (error: any) {
      console.error("Failed to reset temporary password:", error);
      showError(error?.message || "Failed to reset default password.");
    } finally {
      setResettingPassword(false);
    }
  };

  const resetTemporaryPasswordByContact = async () => {
    if (!tenantId || !tenant?.contactEmail) return;
    try {
      setResettingPassword(true);
      setTemporaryPassword("");
      const result = await apiPost<{ temporaryPassword: string; userName?: string; email?: string }>(
        `/admin/tenants/${tenantId}/reset-contact-temporary-password`,
        { email: tenant.contactEmail },
      );
      setTemporaryPassword(result?.temporaryPassword || "");
      showSuccess(`Default password reset${result?.email ? ` for ${result.email}` : ""}.`);

      // Reload users after potential auto-relink.
      const reloaded = await apiGet<TenantUserSummary[]>(`/admin/tenants/${tenantId}/users`);
      const loaded = Array.isArray(reloaded) ? reloaded : [];
      setTenantUsers(loaded);
      setSelectedPasswordResetUserId((prev) => {
        if (prev && loaded.some((u) => u.id === prev)) return prev;
        return loaded[0]?.id || "";
      });
    } catch (error: any) {
      console.error("Failed to reset temporary password by contact email:", error);
      showError(error?.message || "Failed to reset default password.");
    } finally {
      setResettingPassword(false);
    }
  };

  const doImpersonate = async () => {
    if (!tenant) return;
    try {
      await apiPost("/admin/impersonate/start", { tenantId: tenant.id });
      await refreshUser();
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to impersonate tenant:", error);
      showError("Failed to impersonate tenant.");
    }
  };

  const handleImpersonate = () => {
    if (!tenant) return;
    requestConfirm({
      title: "Impersonate this tenant?",
      body: `You'll be logged in as ${tenant.name} until you end the session.`,
      confirmLabel: "Impersonate",
      onConfirm: doImpersonate,
    });
  };

  const saveBusinessKra = async () => {
    if (!tenantId) return;
    try {
      setSavingBusinessKra(true);
      await apiPut(`/admin/tenants/${tenantId}`, {
        name: businessKra.name,
        businessType: businessKra.businessType,
        contactEmail: businessKra.contactEmail,
        contactPhone: businessKra.contactPhone || null,
        address: businessKra.address || null,
        country: businessKra.country || null,
        kraEnabled: !!businessKra.kraEnabled,
        kraPin: businessKra.kraPin || null,
        vatNumber: businessKra.vatNumber || null,
        etimsQrUrl: businessKra.etimsQrUrl || null,
      });
      await fetchTenantData();
      showSuccess("Business & KRA details saved.");
    } catch (error) {
      console.error("Failed to save:", error);
      showError("Failed to save Business & KRA details.");
    } finally {
      setSavingBusinessKra(false);
    }
  };

  const saveRestaurantAddon = async () => {
    if (!tenantId) return;
    try {
      setSavingRestaurantAddon(true);
      await apiPut(`/admin/tenants/${tenantId}`, { restaurantFeaturesEnabled: restaurantAddonEnabled });
      await fetchTenantData();
      showSuccess(`Restaurant add-on ${restaurantAddonEnabled ? "enabled" : "disabled"} for this tenant.`);
    } catch (error) {
      console.error("Failed to update restaurant add-on setting:", error);
      showError("Failed to update restaurant add-on setting.");
    } finally {
      setSavingRestaurantAddon(false);
    }
  };

  if (loading || !user) return null;

  if (loadingData) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <FaSpinner className="h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-700">Loading tenant data...</p>
          <p className="text-xs text-gray-500">Please wait while we fetch tenant details.</p>
        </div>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="p-4 text-center text-sm text-gray-500">{tenantLoadError || "Tenant not found"}</div>
      </main>
    );
  }

  const statCards = [
    { icon: <FaUsers className="h-4 w-4" />, label: "Users", value: tenant.userCount },
    { icon: <FaStore className="h-4 w-4" />, label: "Physical Items", value: tenant.productCount },
    { icon: <FaReceipt className="h-4 w-4" />, label: "Transactions", value: tenant.salesCount },
    { icon: <FaBuilding className="h-4 w-4" />, label: "Branches", value: tenant.branchCount },
    { icon: <FaDatabase className="h-4 w-4" />, label: "DB Space", value: formatSpace(parseFloat(tenant.spaceUsedMB || "0")) },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      {notice && (
        <div
          className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            notice.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-rose-300 bg-rose-50 text-rose-800"
          }`}
        >
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} className="ml-4 text-xs font-medium opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => router.push("/superadmin/tenants")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <FaArrowLeft className="h-3 w-3" /> Back
      </button>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{tenant.businessType}</p>
          <p className="mt-1 text-xs text-gray-500">
            {tenant.contactEmail} • {tenant.contactPhone}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/superadmin/tenants/${tenantId}/unified-page-display`)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Product Display Settings
            </button>
            <button
              type="button"
              onClick={() => void openProvisionModal()}
              disabled={loadingClassifications}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Assign Classification
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleImpersonate}
          className="inline-flex items-center gap-1.5 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Impersonate <span aria-hidden>→</span>
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              {card.icon}
              {card.label}
            </div>
            <p className="mt-1 text-lg font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <TabsPrimitive.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsPrimitive.List className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
          {TABS.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab.key}
              value={tab.key}
              className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
            >
              {tab.label}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>

        <TabsPrimitive.Content value="overview">
          <OverviewTab products={products} transactions={transactions} formatCurrency={formatCurrency} formatDate={formatDate} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="products">
          <ProductsTab products={products} formatCurrency={formatCurrency} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="transactions">
          <TransactionsTab transactions={transactions} formatCurrency={formatCurrency} formatDate={formatDate} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="branches">
          <BranchesTab branches={branches} formatDate={formatDate} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="analytics">
          <AnalyticsTab tenant={tenant} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="integrations">
          <IntegrationsTab
            mpesaConfig={mpesaConfig}
            setMpesaConfig={setMpesaConfig}
            savingMpesa={savingMpesa}
            testingMpesa={testingMpesa}
            mpesaStatus={mpesaStatus}
            saveMpesaConfig={saveMpesaConfig}
            verifyMpesaConfig={verifyMpesaConfig}
            restaurantAddonEnabled={restaurantAddonEnabled}
            setRestaurantAddonEnabled={setRestaurantAddonEnabled}
            savingRestaurantAddon={savingRestaurantAddon}
            saveRestaurantAddon={saveRestaurantAddon}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="business-kra">
          <BusinessKraTab
            businessKra={businessKra}
            setBusinessKra={setBusinessKra}
            savingBusinessKra={savingBusinessKra}
            saveBusinessKra={saveBusinessKra}
            availableBusinessTypes={availableBusinessTypes}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="modules">
          <ModulesTab
            availableModules={availableModules}
            enabledModules={enabledModules}
            toggleModule={toggleModule}
            savingModules={savingModules}
            saveTenantModules={saveTenantModules}
            modulePresets={modulePresets}
            selectedModulePreset={selectedModulePreset}
            setSelectedModulePreset={setSelectedModulePreset}
            applyingModulePreset={applyingModulePreset}
            applyModulePreset={applyModulePreset}
            availableBusinessTypes={availableBusinessTypes}
            selectedBusinessType={selectedBusinessType}
            setSelectedBusinessType={setSelectedBusinessType}
            blueprintCatalog={blueprintCatalog}
            selectedBlueprintKey={selectedBlueprintKey}
            setSelectedBlueprintKey={setSelectedBlueprintKey}
            selectedBlueprintVersion={selectedBlueprintVersion}
            setSelectedBlueprintVersion={setSelectedBlueprintVersion}
            installedAppsInput={installedAppsInput}
            setInstalledAppsInput={setInstalledAppsInput}
            featureFlagsInput={featureFlagsInput}
            setFeatureFlagsInput={setFeatureFlagsInput}
            availableNavigationOptions={availableNavigationOptions}
            selectedNavigationKeys={selectedNavigationKeys}
            toggleNavigationKey={toggleNavigationKey}
            savingBlueprint={savingBlueprint}
            saveTenantBlueprint={saveTenantBlueprint}
            previewingBlueprint={previewingBlueprint}
            previewTenantBlueprint={previewTenantBlueprint}
            rollingBackBlueprint={rollingBackBlueprint}
            rollbackTenantBlueprint={rollbackTenantBlueprint}
            blueprintPreview={blueprintPreview}
            modulePermissionMatrix={modulePermissionMatrix}
            moduleMatrixRoles={moduleMatrixRoles}
            loadingModuleMatrix={loadingModuleMatrix}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="crm-entitlements">
          <CrmEntitlementsTab
            availableCrmPackages={availableCrmPackages}
            availableCrmCapabilities={availableCrmCapabilities}
            crmPackageKey={crmPackageKey}
            setCrmPackageKey={setCrmPackageKey}
            crmCapabilities={crmCapabilities}
            toggleCrmCapability={toggleCrmCapability}
            crmDependencyErrors={crmDependencyErrors}
            crmLimits={crmLimits}
            updateCrmLimit={updateCrmLimit}
            crmProviders={crmProviders}
            toggleCrmProvider={toggleCrmProvider}
            savingCrmEntitlements={savingCrmEntitlements}
            saveCrmEntitlements={saveCrmEntitlements}
            crmTimeline={crmTimeline}
            loadingCrmTimeline={loadingCrmTimeline}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="password-reset">
          <PasswordResetTab
            users={tenantUsers}
            loadingUsers={loadingTenantUsers}
            selectedUserId={selectedPasswordResetUserId}
            setSelectedUserId={setSelectedPasswordResetUserId}
            resettingPassword={resettingPassword}
            temporaryPassword={temporaryPassword}
            resetTemporaryPassword={resetTemporaryPassword}
            resetByContactEmail={resetTemporaryPasswordByContact}
            tenantContactEmail={tenant?.contactEmail}
            onCreateUser={() => router.push(`/superadmin/create-user?tenantId=${tenantId}`)}
            loadError={tenantUsersLoadError}
          />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      {showProvisionModal && tenant && (
        <ProvisionModal
          tenant={tenant}
          classificationOptions={classificationOptions}
          selectedClassificationId={selectedClassificationId}
          setSelectedClassificationId={setSelectedClassificationId}
          savingProvisioning={savingProvisioning}
          onCancel={() => setShowProvisionModal(false)}
          onConfirm={assignAndProvisionMetrics}
        />
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start gap-2">
              <FaExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <h3 className="text-base font-semibold text-slate-900">{confirmAction.title}</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">{confirmAction.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={confirmBusy}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmBusy(true);
                  try {
                    await confirmAction.onConfirm();
                  } finally {
                    setConfirmBusy(false);
                    setConfirmAction(null);
                  }
                }}
                disabled={confirmBusy}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {confirmBusy ? "Working..." : confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
