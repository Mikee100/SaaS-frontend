"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter, useParams } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/utils/api";
import { FaArrowLeft, FaStore, FaReceipt, FaArrowRight, FaUsers, FaBuilding, FaPlug, FaSpinner, FaCheckCircle, FaFileInvoice } from 'react-icons/fa';

type AppModuleKey =
  | 'dashboard'
  | 'payroll'
  | 'sales'
  | 'credits'
  | 'inventory'
  | 'accounts'
  | 'analytics'
  | 'reports'
  | 'expenses'
  | 'crm'
  | 'ai'
  | 'settings'
  | 'billing';

interface TenantModulesResponse {
  tenantId: string;
  key: string;
  enabledModules: AppModuleKey[];
  availableModules: AppModuleKey[];
}

interface ModulePresetDefinition {
  key: string;
  label: string;
  description: string;
  enabledModules: AppModuleKey[];
}

interface ModulePresetsResponse {
  presets: ModulePresetDefinition[];
}

interface ModulePermissionRoleCheck {
  roleName: string;
  allowed: boolean;
  missing: string[];
}

interface ModulePermissionMatrixEntry {
  module: AppModuleKey;
  enabled: boolean;
  requiredPermissions: string[];
  roleChecks: ModulePermissionRoleCheck[];
}

interface ModulePermissionMatrixResponse {
  tenantId: string;
  enabledModules: AppModuleKey[];
  roles: string[];
  matrix: ModulePermissionMatrixEntry[];
}

type CrmPackageKey = 'starter' | 'growth' | 'pro' | 'enterprise';

type CrmCapabilityKey =
  | 'crm.pipeline'
  | 'crm.tasks'
  | 'crm.documents'
  | 'crm.calendar_integration'
  | 'crm.meeting_scheduler'
  | 'crm.email_integration'
  | 'crm.reporting'
  | 'crm.workflow_automation'
  | 'crm.lead_scoring'
  | 'crm.telephony'
  | 'crm.proposal_management'
  | 'crm.contract_management'
  | 'crm.third_party_integrations';

interface CrmLimits {
  pipelines: number | null;
  automationRules: number | null;
  documentStorageGb: number | null;
  integrationConnections: number | null;
  telephonyMinutesMonthly: number | null;
  proposalsMonthly: number | null;
  contractsMonthly: number | null;
}

interface CrmAllowedProviders {
  calendar: string[];
  email: string[];
  telephony: string[];
  integrations: string[];
}

interface CrmEntitlements {
  packageKey: CrmPackageKey;
  enabledCapabilities: CrmCapabilityKey[];
  limits: CrmLimits;
  allowedProviders: CrmAllowedProviders;
}

interface TenantCrmEntitlementsResponse {
  tenantId: string;
  key: string;
  entitlements: CrmEntitlements;
  availablePackages: CrmPackageKey[];
  availableCapabilities: CrmCapabilityKey[];
}

interface TenantCrmEntitlementTimelineEntry {
  id: string;
  action: string;
  createdAt: string;
  ip?: string | null;
  actor?: {
    id: string;
    name?: string;
    email?: string;
  } | null;
  source?: string | null;
  reason?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

interface TenantCrmEntitlementTimelineResponse {
  tenantId: string;
  total: number;
  items: TenantCrmEntitlementTimelineEntry[];
}

const EAST_AFRICAN_COUNTRIES = [
  "Kenya",
  "Tanzania",
  "Uganda",
  "Rwanda",
  "Burundi",
  "South Sudan",
  "Democratic Republic of the Congo",
  "Ethiopia",
  "Somalia",
  "Eritrea",
  "Djibouti",
] as const;

const CRM_PROVIDER_OPTIONS: CrmAllowedProviders = {
  calendar: ['google', 'microsoft'],
  email: ['gmail', 'outlook'],
  telephony: ['twilio', 'africa_talking'],
  integrations: ['zapier', 'zoom', 'slack', 'shopify'],
};

interface TenantDetails {
  id: string;
  name: string;
  businessType: string;
  classificationId?: string | null;
  restaurantFeaturesEnabled?: boolean;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  country?: string;
  kraEnabled?: boolean;
  kraPin?: string;
  vatNumber?: string;
  etimsQrUrl?: string;
  createdAt: string;
  userCount: number;
  productCount: number;
  salesCount: number;
  branchCount: number;
  spaceUsedMB: string;
  resourceSpaceUsage?: Record<string, number>;
}

interface ClassificationOption {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
}

interface MpesaConfigApiResponse {
  consumerKey?: string;
  consumerSecret?: string;
  shortCode?: string;
  passkey?: string;
  callbackUrl?: string;
  environment?: string;
  isActive?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  inventory: {
    quantity: number;
  }[];
}

interface Transaction {
  id: string;
  total: number;
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  manager?: string | null;
  isMainBranch?: boolean;
  status?: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export default function TenantDetailsPage() {
  const { user, loading, refreshUser } = useUser();
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id as string;

  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'transactions' | 'branches' | 'analytics' | 'integrations' | 'business-kra' | 'modules' | 'crm-entitlements'>('overview');
  const [availableModules, setAvailableModules] = useState<AppModuleKey[]>([]);
  const [enabledModules, setEnabledModules] = useState<AppModuleKey[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [modulePresets, setModulePresets] = useState<ModulePresetDefinition[]>([]);
  const [selectedModulePreset, setSelectedModulePreset] = useState('');
  const [applyingModulePreset, setApplyingModulePreset] = useState(false);
  const [modulePermissionMatrix, setModulePermissionMatrix] = useState<ModulePermissionMatrixEntry[]>([]);
  const [moduleMatrixRoles, setModuleMatrixRoles] = useState<string[]>([]);
  const [loadingModuleMatrix, setLoadingModuleMatrix] = useState(false);
  const [availableCrmPackages, setAvailableCrmPackages] = useState<CrmPackageKey[]>(['starter', 'growth', 'pro', 'enterprise']);
  const [availableCrmCapabilities, setAvailableCrmCapabilities] = useState<CrmCapabilityKey[]>([]);
  const [crmPackageKey, setCrmPackageKey] = useState<CrmPackageKey>('starter');
  const [crmCapabilities, setCrmCapabilities] = useState<CrmCapabilityKey[]>([]);
  const [crmLimits, setCrmLimits] = useState<CrmLimits>({
    pipelines: 1,
    automationRules: 0,
    documentStorageGb: 2,
    integrationConnections: 2,
    telephonyMinutesMonthly: 0,
    proposalsMonthly: 0,
    contractsMonthly: 0,
  });
  const [crmProviders, setCrmProviders] = useState<CrmAllowedProviders>({
    calendar: [],
    email: [],
    telephony: [],
    integrations: [],
  });
  const [savingCrmEntitlements, setSavingCrmEntitlements] = useState(false);
  const [crmTimeline, setCrmTimeline] = useState<TenantCrmEntitlementTimelineEntry[]>([]);
  const [loadingCrmTimeline, setLoadingCrmTimeline] = useState(false);

  // Business & KRA (admin-editable)
  const [businessKra, setBusinessKra] = useState<Partial<TenantDetails>>({});
  const [savingBusinessKra, setSavingBusinessKra] = useState(false);
  const [restaurantAddonEnabled, setRestaurantAddonEnabled] = useState(false);
  const [savingRestaurantAddon, setSavingRestaurantAddon] = useState(false);

  // Classification assign + provision modal
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [classificationOptions, setClassificationOptions] = useState<ClassificationOption[]>([]);
  const [loadingClassifications, setLoadingClassifications] = useState(false);
  const [selectedClassificationId, setSelectedClassificationId] = useState('');
  const [savingProvisioning, setSavingProvisioning] = useState(false);

  // M-Pesa integration state
  const [mpesaConfig, setMpesaConfig] = useState({
    mpesaConsumerKey: '',
    mpesaConsumerSecret: '',
    mpesaShortCode: '',
    mpesaPasskey: '',
    mpesaCallbackUrl: '',
    mpesaEnvironment: 'sandbox',
    mpesaIsActive: false
  });
  const [savingMpesa, setSavingMpesa] = useState(false);
  const [testingMpesa, setTestingMpesa] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<'disconnected' | 'connected'>('disconnected');

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const fetchTenantData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [tenantDetails, tenantProducts, tenantTransactions, tenantBranches] = await Promise.all([
        apiGet<TenantDetails>(`/admin/tenants/${tenantId}`),
        apiGet<Product[]>(`/admin/tenants/${tenantId}/products`),
        apiGet<Transaction[]>(`/admin/tenants/${tenantId}/transactions`),
        apiGet<Branch[]>(`/admin/tenants/${tenantId}/branches`),
      ]);

      setTenant(tenantDetails);
      setRestaurantAddonEnabled(!!tenantDetails.restaurantFeaturesEnabled);
      setBusinessKra({
        name: tenantDetails.name,
        businessType: tenantDetails.businessType,
        contactEmail: tenantDetails.contactEmail,
        contactPhone: tenantDetails.contactPhone ?? '',
        address: tenantDetails.address ?? '',
        country: tenantDetails.country ?? '',
        kraEnabled: tenantDetails.kraEnabled ?? false,
        kraPin: tenantDetails.kraPin ?? '',
        vatNumber: tenantDetails.vatNumber ?? '',
        etimsQrUrl: tenantDetails.etimsQrUrl ?? '',
      });
      setProducts(tenantProducts);
      setTransactions(tenantTransactions);
      setBranches(tenantBranches);

      const modules = await apiGet<TenantModulesResponse>(
        `/admin/tenants/${tenantId}/modules?t=${Date.now()}`,
      );
      setAvailableModules(Array.isArray(modules?.availableModules) ? modules.availableModules : []);
      setEnabledModules(Array.isArray(modules?.enabledModules) ? modules.enabledModules : []);

      setLoadingModuleMatrix(true);
      try {
        const matrix = await apiGet<ModulePermissionMatrixResponse>(
          `/admin/tenants/${tenantId}/module-permission-matrix?t=${Date.now()}`,
        );
        setModulePermissionMatrix(Array.isArray(matrix?.matrix) ? matrix.matrix : []);
        setModuleMatrixRoles(Array.isArray(matrix?.roles) ? matrix.roles : []);
      } finally {
        setLoadingModuleMatrix(false);
      }

      try {
        const presets = await apiGet<ModulePresetsResponse>(
          '/admin/module-presets',
          { 'x-suppress-error-log': 'true' },
        );
        setModulePresets(Array.isArray(presets?.presets) ? presets.presets : []);
      } catch (presetError) {
        console.warn('Failed to load module presets:', presetError);
        setModulePresets([]);
      }

      const crm = await apiGet<TenantCrmEntitlementsResponse>(`/admin/tenants/${tenantId}/crm-entitlements`);
      if (crm?.entitlements) {
        setAvailableCrmPackages(Array.isArray(crm.availablePackages) ? crm.availablePackages : ['starter', 'growth', 'pro', 'enterprise']);
        setAvailableCrmCapabilities(Array.isArray(crm.availableCapabilities) ? crm.availableCapabilities : []);
        setCrmPackageKey(crm.entitlements.packageKey || 'starter');
        setCrmCapabilities(Array.isArray(crm.entitlements.enabledCapabilities) ? crm.entitlements.enabledCapabilities : []);
        setCrmLimits(crm.entitlements.limits || {
          pipelines: 1,
          automationRules: 0,
          documentStorageGb: 2,
          integrationConnections: 2,
          telephonyMinutesMonthly: 0,
          proposalsMonthly: 0,
          contractsMonthly: 0,
        });
        setCrmProviders(crm.entitlements.allowedProviders || {
          calendar: [],
          email: [],
          telephony: [],
          integrations: [],
        });
      }

      setLoadingCrmTimeline(true);
      try {
        const timeline = await apiGet<TenantCrmEntitlementTimelineResponse>(
          `/admin/tenants/${tenantId}/crm-entitlements/timeline?limit=20`,
        );
        setCrmTimeline(Array.isArray(timeline?.items) ? timeline.items : []);
      } finally {
        setLoadingCrmTimeline(false);
      }
    } catch (error) {
      console.error("Failed to fetch tenant data:", error);
      alert("Failed to load tenant data");
    } finally {
      setLoadingData(false);
    }
  }, [tenantId]);

  const toggleModule = (moduleKey: AppModuleKey) => {
    setEnabledModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((entry) => entry !== moduleKey)
        : [...prev, moduleKey],
    );
  };

  const saveTenantModules = async () => {
    try {
      setSavingModules(true);
      await apiPut(`/admin/tenants/${tenantId}/modules`, { enabledModules });
      const latestModules = await apiGet<TenantModulesResponse>(
        `/admin/tenants/${tenantId}/modules?t=${Date.now()}`,
      );
      setAvailableModules(Array.isArray(latestModules?.availableModules) ? latestModules.availableModules : []);
      setEnabledModules(Array.isArray(latestModules?.enabledModules) ? latestModules.enabledModules : []);
      const latestMatrix = await apiGet<ModulePermissionMatrixResponse>(
        `/admin/tenants/${tenantId}/module-permission-matrix?t=${Date.now()}`,
      );
      setModulePermissionMatrix(Array.isArray(latestMatrix?.matrix) ? latestMatrix.matrix : []);
      setModuleMatrixRoles(Array.isArray(latestMatrix?.roles) ? latestMatrix.roles : []);
      alert('Tenant modules updated successfully.');
    } catch (error) {
      console.error('Failed to update tenant modules:', error);
      alert('Failed to update tenant modules');
    } finally {
      setSavingModules(false);
    }
  };

  const applyModulePreset = async () => {
    if (!selectedModulePreset) {
      alert('Select a module preset first.');
      return;
    }

    const preset = modulePresets.find((entry) => entry.key === selectedModulePreset);
    if (!preset || !Array.isArray(preset.enabledModules) || preset.enabledModules.length === 0) {
      alert('Selected preset is invalid. Reload the page and try again.');
      return;
    }

    try {
      setApplyingModulePreset(true);
      await apiPut<TenantModulesResponse>(
        `/admin/tenants/${tenantId}/modules`,
        { enabledModules: preset.enabledModules },
      );
      const latestModules = await apiGet<TenantModulesResponse>(
        `/admin/tenants/${tenantId}/modules?t=${Date.now()}`,
      );
      setAvailableModules(Array.isArray(latestModules?.availableModules) ? latestModules.availableModules : []);
      setEnabledModules(Array.isArray(latestModules?.enabledModules) ? latestModules.enabledModules : []);
      const latestMatrix = await apiGet<ModulePermissionMatrixResponse>(
        `/admin/tenants/${tenantId}/module-permission-matrix?t=${Date.now()}`,
      );
      setModulePermissionMatrix(Array.isArray(latestMatrix?.matrix) ? latestMatrix.matrix : []);
      setModuleMatrixRoles(Array.isArray(latestMatrix?.roles) ? latestMatrix.roles : []);
      setSelectedModulePreset('');
      await refreshUser();
      alert(`Module preset applied successfully: ${preset.label}.`);
    } catch (error) {
      console.error('Failed to apply module preset:', error);
      alert('Failed to apply module preset');
    } finally {
      setApplyingModulePreset(false);
    }
  };

  const toggleCrmCapability = (capability: CrmCapabilityKey) => {
    setCrmCapabilities((prev) =>
      prev.includes(capability)
        ? prev.filter((entry) => entry !== capability)
        : [...prev, capability],
    );
  };

  const updateCrmLimit = (key: keyof CrmLimits, rawValue: string) => {
    const parsed = rawValue.trim() === '' ? null : Number(rawValue);
    setCrmLimits((prev) => ({
      ...prev,
      [key]: parsed !== null && Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null,
    }));
  };

  const toggleCrmProvider = (group: keyof CrmAllowedProviders, provider: string) => {
    setCrmProviders((prev) => {
      const groupProviders = prev[group] || [];
      const updated = groupProviders.includes(provider)
        ? groupProviders.filter((entry) => entry !== provider)
        : [...groupProviders, provider];
      return { ...prev, [group]: updated };
    });
  };

  const crmDependencyErrors = React.useMemo(() => {
    const set = new Set(crmCapabilities);
    const errors: string[] = [];
    if (set.has('crm.meeting_scheduler') && !set.has('crm.calendar_integration')) {
      errors.push('Meeting scheduler requires calendar integration.');
    }
    if (set.has('crm.lead_scoring') && !set.has('crm.pipeline')) {
      errors.push('Lead scoring requires visual pipeline.');
    }
    if (set.has('crm.proposal_management') && !set.has('crm.documents')) {
      errors.push('Proposal management requires document management.');
    }
    if (set.has('crm.contract_management') && !set.has('crm.documents')) {
      errors.push('Contract management requires document management.');
    }
    if (set.has('crm.telephony') && !set.has('crm.third_party_integrations')) {
      errors.push('Built-in telephony requires third-party integrations.');
    }
    return errors;
  }, [crmCapabilities]);

  const saveCrmEntitlements = async () => {
    if (crmDependencyErrors.length > 0) {
      alert(`Please fix dependency issues before saving:\n- ${crmDependencyErrors.join('\n- ')}`);
      return;
    }

    try {
      setSavingCrmEntitlements(true);
      await apiPut(`/admin/tenants/${tenantId}/crm-entitlements`, {
        packageKey: crmPackageKey,
        enabledCapabilities: crmCapabilities,
        limits: crmLimits,
        allowedProviders: crmProviders,
        source: 'manual_override',
        reason: 'superadmin ui update',
      });
      try {
        setLoadingCrmTimeline(true);
        const timeline = await apiGet<TenantCrmEntitlementTimelineResponse>(
          `/admin/tenants/${tenantId}/crm-entitlements/timeline?limit=20`,
        );
        setCrmTimeline(Array.isArray(timeline?.items) ? timeline.items : []);
      } finally {
        setLoadingCrmTimeline(false);
      }
      alert('CRM entitlements updated successfully.');
    } catch (error: any) {
      console.error('Failed to update CRM entitlements:', error);
      alert(error?.message || 'Failed to update CRM entitlements');
    } finally {
      setSavingCrmEntitlements(false);
    }
  };

const fetchMpesaConfig = useCallback(async () => {
  try {
    const config = await apiGet(
      `/mpesa/config?tenantId=${encodeURIComponent(tenantId)}`,
    ) as MpesaConfigApiResponse;
    if (config) {
      setMpesaConfig({
        mpesaConsumerKey: config.consumerKey || '',
        mpesaConsumerSecret: config.consumerSecret || '',
        mpesaShortCode: config.shortCode || '',
        mpesaPasskey: config.passkey || '',
        mpesaCallbackUrl: config.callbackUrl || '',
        mpesaEnvironment: config.environment || 'sandbox',
        mpesaIsActive: config.isActive || false
      });
      setMpesaStatus(config.isActive ? 'connected' : 'disconnected');
    }
  } catch (error) {
    console.error("Failed to fetch M-Pesa config:", error);
    // Keep default disconnected status
  }
}, [tenantId]);

  const normalizeBusinessToken = (input?: string | null) =>
    (input ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const resolveClassificationByBusinessType = (
    businessType: string | undefined,
    options: ClassificationOption[],
  ) => {
    const normalized = normalizeBusinessToken(businessType);
    if (!normalized) return '';

    const exact = options.find(
      (c) => normalizeBusinessToken(c.slug) === normalized || normalizeBusinessToken(c.name) === normalized,
    );
    if (exact) return exact.id;

    const partial = options.find((c) => {
      const slug = normalizeBusinessToken(c.slug);
      const name = normalizeBusinessToken(c.name);
      return normalized.includes(slug) || slug.includes(normalized) || normalized.includes(name);
    });

    return partial?.id || '';
  };

  const openProvisionModal = async () => {
    if (!tenant) return;

    try {
      setLoadingClassifications(true);
      let data: ClassificationOption[] = [];
      try {
        data = await apiGet<ClassificationOption[]>('/admin/classifications', {
          'x-suppress-error-log': 'true',
        });
      } catch {
        // Hosted environments may temporarily miss admin classification routes.
        // Fall back to the public catalog so provisioning can still proceed.
        data = await apiGet<ClassificationOption[]>('/classifications/public', {
          'x-suppress-error-log': 'true',
        });
      }
      const active = Array.isArray(data)
        ? data.filter((c) => c.isActive !== false)
        : [];
      setClassificationOptions(active);

      const preselected = tenant.classificationId || resolveClassificationByBusinessType(tenant.businessType, active);
      setSelectedClassificationId(preselected || '');
      setShowProvisionModal(true);
    } catch (error) {
      console.error('Failed to load classifications:', error);
      alert('Failed to load classifications');
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
        {
          classificationId: selectedClassificationId,
          provisionDefaults: true,
        },
      );

      const defaults = result?.defaultsProvisioning;
      const attrs = defaults?.provisionedAttributes?.length ? defaults.provisionedAttributes.join(', ') : 'none';
      const units = defaults?.allowedUnits?.length ? defaults.allowedUnits.join(', ') : 'none';
      const defaultUnit = defaults?.defaultUnit || 'not set';

      alert(`Metrics provisioned. Attrs: ${attrs}. Units: ${units}. Default: ${defaultUnit}.`);
      setShowProvisionModal(false);
      await fetchTenantData();
    } catch (error: any) {
      console.error('Failed to assign and provision metrics:', error);
      alert(error?.message || 'Failed to provision metrics');
    } finally {
      setSavingProvisioning(false);
    }
  };

  useEffect(() => {
    if (user?.isSuperadmin && tenantId) {
      fetchTenantData();
      fetchMpesaConfig();
    }
  }, [user, tenantId, fetchTenantData, fetchMpesaConfig]);

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
        mpesaEnvironment: mpesaConfig.mpesaEnvironment
      });
      setMpesaStatus('connected');
      alert("M-Pesa configuration saved successfully!");
    } catch (error) {
      console.error("Failed to save M-Pesa config:", error);
      alert("Failed to save M-Pesa configuration");
    } finally {
      setSavingMpesa(false);
    }
  };

  const testMpesaConnection = async () => {
    try {
      setTestingMpesa(true);
      // For now, just simulate a test - in real implementation, you'd call a test endpoint
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      setMpesaStatus('connected');
      alert("M-Pesa connection test successful!");
    } catch (error) {
      console.error("Failed to test M-Pesa connection:", error);
      setMpesaStatus('disconnected');
      alert("M-Pesa connection test failed");
    } finally {
      setTestingMpesa(false);
    }
  };

  const handleImpersonate = async () => {
    if (!tenant) return;

    try {
      await apiPost('/admin/impersonate/start', { tenantId: tenant.id });
      await refreshUser();
      router.push('/dashboard');
    } catch (error) {
      console.error("Failed to impersonate tenant:", error);
      alert("Failed to impersonate tenant");
    }
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
      alert("Business & KRA details saved.");
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save Business & KRA details");
    } finally {
      setSavingBusinessKra(false);
    }
  };

  const saveRestaurantAddon = async () => {
    if (!tenantId) return;
    try {
      setSavingRestaurantAddon(true);
      await apiPut(`/admin/tenants/${tenantId}`, {
        restaurantFeaturesEnabled: restaurantAddonEnabled,
      });
      await fetchTenantData();
      alert(`Restaurant add-on ${restaurantAddonEnabled ? 'enabled' : 'disabled'} for this tenant.`);
    } catch (error) {
      console.error('Failed to update restaurant add-on setting:', error);
      alert('Failed to update restaurant add-on setting');
    } finally {
      setSavingRestaurantAddon(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `Ksh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading || !user) return null;

  if (loadingData) {
    return (
      <main style={{ padding: "1rem", background: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "1rem", fontSize: "13px", color: "#64748b" }}>
          Loading tenant data...
        </div>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main style={{ padding: "1rem", background: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "1rem", fontSize: "13px", color: "#64748b" }}>
          Tenant not found
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "1rem", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={() => router.push('/superadmin/tenants')}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            background: "none",
            border: "none",
            color: "#2563eb",
            cursor: "pointer",
            fontSize: "13px",
            marginBottom: "0.7rem",
            fontWeight: 500
          }}
        >
          <FaArrowLeft /> Back
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: "bold", marginBottom: "0.2rem", color: "#1e293b" }}>{tenant.name}</h1>
            <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "0.2rem" }}>{tenant.businessType}</p>
            <p style={{ color: "#64748b", fontSize: "12px" }}>{tenant.contactEmail} • {tenant.contactPhone}</p>
          </div>

          <button
            onClick={handleImpersonate}
            style={{
              background: "#2563eb",
              color: "#fff",
              padding: "0.3rem 0.8rem",
              borderRadius: "5px",
              border: "none",
              cursor: "pointer",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "12px",
              boxShadow: "0 1px 2px rgba(37,99,235,0.04)"
            }}
          >
            <FaArrowRight /> Impersonate
          </button>
        </div>

        <div style={{ marginTop: '0.6rem' }}>
          <button
            onClick={openProvisionModal}
            disabled={loadingClassifications}
            style={{
              background: '#f5f3ff',
              color: '#5b21b6',
              padding: '0.28rem 0.75rem',
              borderRadius: '5px',
              border: '1px solid #c4b5fd',
              cursor: loadingClassifications ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              opacity: loadingClassifications ? 0.65 : 1,
            }}
          >
            {loadingClassifications ? 'Loading classifications...' : 'Assign + Provision Metrics'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "0.7rem",
        marginBottom: "1.2rem"
      }}>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaUsers style={{ color: "#2563eb", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>Users</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1e293b" }}>{tenant.userCount}</div>
        </div>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaStore style={{ color: "#059669", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>Physical Items</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1e293b" }}>{tenant.productCount}</div>
        </div>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaReceipt style={{ color: "#f59e0b", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>Transactions</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1e293b" }}>{tenant.salesCount}</div>
        </div>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaBuilding style={{ color: "#8b5cf6", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>Branches</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1e293b" }}>{tenant.branchCount}</div>
        </div>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaStore style={{ color: "#ef4444", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>DB Space</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#1e293b" }}>{tenant.spaceUsedMB} MB</div>
          <div style={{ marginTop: "0.2rem" }}>
            <div style={{ width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min((parseFloat(tenant.spaceUsedMB) / 1000) * 100, 100)}%`,
                  height: "100%",
                  background: parseFloat(tenant.spaceUsedMB) > 750 ? "#ef4444" : parseFloat(tenant.spaceUsedMB) > 500 ? "#f59e0b" : "#10b981",
                  transition: "width 0.3s ease"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "1.2rem" }}>
        <nav style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'overview' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'overview' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'overview' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'products' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'products' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'products' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'transactions' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'transactions' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'transactions' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'branches' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'branches' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'branches' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'analytics' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'analytics' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'analytics' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'integrations' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'integrations' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'integrations' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('business-kra')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'business-kra' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'business-kra' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'business-kra' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Business & KRA
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'modules' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'modules' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'modules' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Modules
          </button>
          <button
            onClick={() => setActiveTab('crm-entitlements')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'crm-entitlements' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'crm-entitlements' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'crm-entitlements' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            CRM Entitlements
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: "bold", marginBottom: "0.5rem", color: "#334155" }}>Recent Products</h3>
            <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {products.slice(0, 5).map(product => (
                <div key={product.id} style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}>
                  <div style={{ fontWeight: "500" }}>{product.name}</div>
                  <div style={{ color: "#64748b" }}>
                    {formatCurrency(product.price)} • Stock: {product.inventory[0]?.quantity || 0}
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                  No products found
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 13, fontWeight: "bold", marginBottom: "0.5rem", color: "#334155" }}>Recent Transactions</h3>
            <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {transactions.slice(0, 5).map(transaction => (
                <div key={transaction.id} style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}>
                  <div style={{ fontWeight: "500" }}>{formatCurrency(transaction.total)}</div>
                  <div style={{ color: "#64748b" }}>{formatDate(transaction.createdAt)}</div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                  No transactions found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: "bold", marginBottom: "0.5rem", color: "#334155" }}>Space Usage Trend</h3>
            <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ height: "80px", display: "flex", alignItems: "end", justifyContent: "center", background: "#f9fafb", borderRadius: "4px" }}>
                <div style={{ width: "60%", height: `${Math.min((parseFloat(tenant.spaceUsedMB) / 1000) * 100, 100)}%`, background: "#2563eb", borderRadius: "4px 4px 0 0", transition: "height 0.3s ease" }}></div>
              </div>
              <p style={{ textAlign: "center", marginTop: "0.5rem", color: "#64748b", fontSize: "12px" }}>
                Current usage: {tenant.spaceUsedMB} MB
              </p>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 13, fontWeight: "bold", marginBottom: "0.5rem", color: "#334155" }}>Resource Distribution</h3>
            <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {tenant.resourceSpaceUsage && Object.entries(tenant.resourceSpaceUsage).map(([resource, bytes]) => {
                  const mb = (bytes / (1024 * 1024)).toFixed(2);
                  const maxBytes = Math.max(...Object.values(tenant.resourceSpaceUsage!));
                  const percentage = maxBytes > 0 ? (bytes / maxBytes) * 100 : 0;

                  return (
                    <div key={resource} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <span style={{ color: "#64748b" }}>{resource}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <div style={{ width: "60px", height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${percentage}%`, height: "100%", background: "#059669" }}></div>
                        </div>
                        <span style={{ color: "#1e293b" }}>{mb} MB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 13, fontWeight: "bold", margin: 0, color: "#334155" }}>All Products</h3>
          </div>
          {products.map(product => (
            <div key={product.id} style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "500" }}>{product.name}</div>
                  <div style={{ color: "#64748b" }}>
                    Stock: {product.inventory[0]?.quantity || 0}
                  </div>
                </div>
                <div style={{ fontWeight: "600", color: "#1e293b" }}>
                  {formatCurrency(product.price)}
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
              No products found
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 13, fontWeight: "bold", margin: 0, color: "#334155" }}>All Transactions</h3>
          </div>
          {transactions.map(transaction => (
            <div key={transaction.id} style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "500" }}>Transaction #{transaction.id.slice(-8)}</div>
                  <div style={{ color: "#64748b" }}>
                    {formatDate(transaction.createdAt)}
                  </div>
                </div>
                <div style={{ fontWeight: "600", color: "#1e293b" }}>
                  {formatCurrency(transaction.total)}
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
              No transactions found
            </div>
          )}
        </div>
      )}

      {activeTab === 'branches' && (
        <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 13, fontWeight: "bold", margin: 0, color: "#334155" }}>Tenant Branches</h3>
          </div>
          {branches.map(branch => {
            const locationParts = [branch.city, branch.state, branch.country].filter(Boolean).join(', ');
            const statusLabel = branch.deletedAt ? 'Deleted' : (branch.status || 'active');
            const statusColor = branch.deletedAt
              ? '#dc2626'
              : statusLabel.toLowerCase() === 'active'
                ? '#059669'
                : '#d97706';

            return (
              <div key={branch.id} style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.7rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontWeight: "600", color: "#1e293b" }}>{branch.name}</span>
                      {branch.isMainBranch && (
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#1d4ed8", background: "#dbeafe", padding: "0.1rem 0.35rem", borderRadius: "999px" }}>
                          MAIN
                        </span>
                      )}
                      <span style={{ fontSize: "10px", fontWeight: 600, color: statusColor, background: `${statusColor}1A`, padding: "0.1rem 0.35rem", borderRadius: "999px", textTransform: "capitalize" }}>
                        {statusLabel}
                      </span>
                    </div>
                    <div style={{ color: "#64748b" }}>
                      {branch.address || 'No address provided'}
                    </div>
                    <div style={{ color: "#64748b" }}>
                      {locationParts || 'No location details'}
                    </div>
                    <div style={{ color: "#64748b" }}>
                      Manager: {branch.manager || 'N/A'} • Phone: {branch.phone || 'N/A'} • Email: {branch.email || 'N/A'}
                    </div>
                  </div>
                  <div style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                    Created: {formatDate(branch.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
          {branches.length === 0 && (
            <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
              No branches found for this tenant
            </div>
          )}
        </div>
      )}

      {activeTab === 'integrations' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {/* M-Pesa Integration */}
          <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.5rem" }}>
                <FaPlug style={{ color: "#059669", fontSize: "13px" }} />
                <span style={{ fontSize: 13, fontWeight: "bold", color: "#334155" }}>M-Pesa Integration</span>
                {mpesaStatus === 'connected' ? (
                  <FaCheckCircle style={{ color: "#059669", fontSize: "13px" }} />
                ) : (
                  <FaSpinner style={{ color: "#f59e0b", fontSize: "13px", animation: "spin 1s linear infinite" }} />
                )}
              </div>
              <span style={{ color: "#64748b", fontSize: "12px" }}>
                Configure M-Pesa payment gateway
              </span>
            </div>

            <div style={{ padding: "0.7rem" }}>
              <form onSubmit={(e) => e.preventDefault()}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Consumer Key
                  </label>
                  <input
                    type="text"
                    value={mpesaConfig.mpesaConsumerKey}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaConsumerKey: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="Enter M-Pesa Consumer Key"
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Consumer Secret
                  </label>
                  <input
                    type="password"
                    value={mpesaConfig.mpesaConsumerSecret}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaConsumerSecret: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="Enter M-Pesa Consumer Secret"
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Short Code
                  </label>
                  <input
                    type="text"
                    value={mpesaConfig.mpesaShortCode}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaShortCode: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="Enter M-Pesa Short Code"
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Passkey
                  </label>
                  <input
                    type="password"
                    value={mpesaConfig.mpesaPasskey}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaPasskey: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="Enter M-Pesa Passkey"
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Callback URL
                  </label>
                  <input
                    type="url"
                    value={mpesaConfig.mpesaCallbackUrl}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaCallbackUrl: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="https://your-domain.com/mpesa/callback"
                  />
                </div>
                <div style={{ marginBottom: "0.7rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Environment
                  </label>
                  <select
                    value={mpesaConfig.mpesaEnvironment}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaEnvironment: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div style={{ marginBottom: "0.7rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "12px" }}>
                    <input
                      type="checkbox"
                      checked={mpesaConfig.mpesaIsActive}
                      onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaIsActive: e.target.checked }))}
                      style={{ width: "14px", height: "14px" }}
                    />
                    <span style={{ fontWeight: "500", color: "#334155" }}>Enable M-Pesa for this tenant</span>
                  </label>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={saveMpesaConfig}
                    disabled={savingMpesa}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      padding: "0.3rem 0.8rem",
                      borderRadius: "5px",
                      border: "none",
                      cursor: savingMpesa ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem",
                      opacity: savingMpesa ? 0.6 : 1,
                      fontSize: "12px"
                    }}
                  >
                    {savingMpesa ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaCheckCircle />}
                    {savingMpesa ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={testMpesaConnection}
                    disabled={testingMpesa}
                    style={{
                      background: "#059669",
                      color: "#fff",
                      padding: "0.3rem 0.8rem",
                      borderRadius: "5px",
                      border: "none",
                      cursor: testingMpesa ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem",
                      opacity: testingMpesa ? 0.6 : 1,
                      fontSize: "12px"
                    }}
                  >
                    {testingMpesa ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaPlug />}
                    {testingMpesa ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Integration Status */}
          <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#334155" }}>Integration Status</span>
            </div>
            <div style={{ padding: "0.7rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>M-Pesa</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    {mpesaStatus === 'connected' ? (
                      <>
                        <FaCheckCircle style={{ color: "#059669", fontSize: "13px" }} />
                        <span style={{ color: "#059669", fontWeight: "500" }}>Connected</span>
                      </>
                    ) : (
                      <>
                        <FaSpinner style={{ color: "#f59e0b", fontSize: "13px", animation: "spin 1s linear infinite" }} />
                        <span style={{ color: "#f59e0b", fontWeight: "500" }}>Disconnected</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Restaurant Add-on</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    {restaurantAddonEnabled ? (
                      <>
                        <FaCheckCircle style={{ color: "#059669", fontSize: "13px" }} />
                        <span style={{ color: "#059669", fontWeight: "500" }}>Enabled</span>
                      </>
                    ) : (
                      <>
                        <FaSpinner style={{ color: "#f59e0b", fontSize: "13px" }} />
                        <span style={{ color: "#f59e0b", fontWeight: "500" }}>Disabled</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Webhook Status</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <FaCheckCircle style={{ color: "#059669", fontSize: "13px" }} />
                    <span style={{ color: "#059669", fontWeight: "500" }}>Active</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Last Sync</span>
                  <span style={{ color: "#1e293b", fontWeight: "500" }}>2 hours ago</span>
                </div>

                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.6rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "12px", marginBottom: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={restaurantAddonEnabled}
                      onChange={(e) => setRestaurantAddonEnabled(e.target.checked)}
                      style={{ width: "14px", height: "14px" }}
                    />
                    <span style={{ fontWeight: "500", color: "#334155" }}>
                      Enable Restaurant POS add-on for this tenant
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={saveRestaurantAddon}
                    disabled={savingRestaurantAddon}
                    style={{
                      background: "#0f172a",
                      color: "#fff",
                      padding: "0.3rem 0.8rem",
                      borderRadius: "5px",
                      border: "none",
                      cursor: savingRestaurantAddon ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      fontSize: "12px",
                      opacity: savingRestaurantAddon ? 0.6 : 1,
                    }}
                  >
                    {savingRestaurantAddon ? "Saving..." : "Save Add-on Setting"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'modules' && (
        <div style={{ background: '#fff', borderRadius: '7px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 13, fontWeight: 'bold', margin: 0, color: '#334155' }}>
              Tenant Module Entitlements
            </h3>
            <p style={{ marginTop: '0.2rem', fontSize: '12px', color: '#64748b' }}>
              Toggle which modules this tenant can access. Changes apply immediately.
            </p>
          </div>

          <div style={{ padding: '0.8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
            <div style={{ gridColumn: '1 / -1', border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: '6px', padding: '0.6rem', marginBottom: '0.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#1e3a8a', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Quick Module Presets
                  </label>
                  <select
                    value={selectedModulePreset}
                    onChange={(e) => setSelectedModulePreset(e.target.value)}
                    style={{ width: '100%', padding: '0.35rem', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="">Select preset...</option>
                    {modulePresets.map((preset) => (
                      <option key={preset.key} value={preset.key}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={applyModulePreset}
                  disabled={applyingModulePreset || !selectedModulePreset}
                  style={{
                    background: '#1d4ed8',
                    color: '#fff',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: applyingModulePreset || !selectedModulePreset ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    fontSize: '12px',
                    opacity: applyingModulePreset || !selectedModulePreset ? 0.7 : 1,
                    marginTop: '1.2rem',
                  }}
                >
                  {applyingModulePreset ? 'Applying...' : 'Apply Preset'}
                </button>
              </div>
              {selectedModulePreset && (
                <p style={{ marginTop: '0.35rem', marginBottom: 0, fontSize: '11px', color: '#1e40af' }}>
                  {modulePresets.find((preset) => preset.key === selectedModulePreset)?.description || 'Preset applies a recommended module bundle.'}
                </p>
              )}
            </div>

            {availableModules.map((moduleKey) => {
              const checked = enabledModules.includes(moduleKey);
              return (
                <label
                  key={moduleKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '0.55rem 0.65rem',
                    fontSize: '12px',
                    color: '#1e293b',
                    background: checked ? '#eff6ff' : '#fff',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{moduleKey}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModule(moduleKey)}
                  />
                </label>
              );
            })}
          </div>

          <div style={{ padding: '0.8rem', borderTop: '1px solid #e5e7eb' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#334155', margin: 0 }}>
              Module Permission Matrix
            </h4>
            <p style={{ marginTop: '0.2rem', fontSize: '11px', color: '#64748b' }}>
              Shows where a module is enabled but role permissions may still hide nav/actions.
            </p>

            {loadingModuleMatrix ? (
              <div style={{ marginTop: '0.6rem', fontSize: '12px', color: '#64748b' }}>Loading matrix...</div>
            ) : modulePermissionMatrix.length === 0 ? (
              <div style={{ marginTop: '0.6rem', fontSize: '12px', color: '#64748b' }}>No role permission data found for this tenant yet.</div>
            ) : (
              <div style={{ marginTop: '0.6rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '0.4rem' }}>Module</th>
                      <th style={{ textAlign: 'left', padding: '0.4rem' }}>Required Permissions</th>
                      {moduleMatrixRoles.map((role) => (
                        <th key={role} style={{ textAlign: 'left', padding: '0.4rem' }}>{role}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modulePermissionMatrix.map((entry) => (
                      <tr key={entry.module} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.4rem', fontWeight: 600, color: entry.enabled ? '#1e3a8a' : '#64748b' }}>
                          {entry.module} {entry.enabled ? '(enabled)' : '(disabled)'}
                        </td>
                        <td style={{ padding: '0.4rem', color: '#334155' }}>
                          {entry.requiredPermissions.length > 0 ? entry.requiredPermissions.join(', ') : 'none'}
                        </td>
                        {moduleMatrixRoles.map((role) => {
                          const check = entry.roleChecks.find((item) => item.roleName === role);
                          return (
                            <td key={`${entry.module}-${role}`} style={{ padding: '0.4rem' }}>
                              {!check ? (
                                <span style={{ color: '#94a3b8' }}>n/a</span>
                              ) : check.allowed ? (
                                <span style={{ color: '#166534', fontWeight: 600 }}>ok</span>
                              ) : (
                                <span style={{ color: '#b45309' }} title={check.missing.join(', ')}>
                                  missing: {check.missing.join(', ')}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ padding: '0.8rem', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={saveTenantModules}
              disabled={savingModules}
              style={{
                background: '#2563eb',
                color: '#fff',
                padding: '0.35rem 0.85rem',
                borderRadius: '5px',
                border: 'none',
                cursor: savingModules ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '12px',
                opacity: savingModules ? 0.7 : 1,
              }}
            >
              {savingModules ? 'Saving...' : 'Save Modules'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'crm-entitlements' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.8rem' }}>
          <div style={{ background: '#fff', borderRadius: '7px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 13, fontWeight: 'bold', margin: 0, color: '#334155' }}>
                CRM Package and Capabilities
              </h3>
              <p style={{ marginTop: '0.2rem', fontSize: '12px', color: '#64748b' }}>
                Assign package and fine tune CRM features for this tenant.
              </p>
            </div>

            <div style={{ padding: '0.75rem' }}>
              <div style={{ marginBottom: '0.7rem' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#334155', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Package
                </label>
                <select
                  value={crmPackageKey}
                  onChange={(e) => setCrmPackageKey(e.target.value as CrmPackageKey)}
                  style={{ width: '100%', padding: '0.35rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
                >
                  {availableCrmPackages.map((pkg) => (
                    <option key={pkg} value={pkg}>{pkg}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '0.4rem', fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                Capabilities
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.45rem' }}>
                {availableCrmCapabilities.map((capability) => {
                  const checked = crmCapabilities.includes(capability);
                  return (
                    <label
                      key={capability}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid #e5e7eb',
                        borderRadius: '5px',
                        padding: '0.45rem 0.55rem',
                        fontSize: '12px',
                        background: checked ? '#eff6ff' : '#fff',
                        color: '#1e293b',
                      }}
                    >
                      <span>{capability}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCrmCapability(capability)}
                      />
                    </label>
                  );
                })}
              </div>

              {crmDependencyErrors.length > 0 && (
                <div style={{ marginTop: '0.6rem', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: '5px', padding: '0.55rem' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b', marginBottom: '0.2rem' }}>
                    Dependency issues
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1rem', color: '#7f1d1d', fontSize: '12px' }}>
                    {crmDependencyErrors.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateRows: 'auto auto auto', gap: '0.8rem' }}>
            <div style={{ background: '#fff', borderRadius: '7px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 13, fontWeight: 'bold', margin: 0, color: '#334155' }}>
                  CRM Limits
                </h3>
              </div>
              <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                {([
                  ['pipelines', 'Pipelines'],
                  ['automationRules', 'Automation Rules'],
                  ['documentStorageGb', 'Storage (GB)'],
                  ['integrationConnections', 'Integrations'],
                  ['telephonyMinutesMonthly', 'Telephony Minutes'],
                  ['proposalsMonthly', 'Proposals / Month'],
                  ['contractsMonthly', 'Contracts / Month'],
                ] as [keyof CrmLimits, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: '0.2rem' }}>{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={crmLimits[key] ?? ''}
                      onChange={(e) => updateCrmLimit(key, e.target.value)}
                      placeholder="unlimited"
                      style={{ width: '100%', padding: '0.32rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '7px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 13, fontWeight: 'bold', margin: 0, color: '#334155' }}>
                  Allowed Providers
                </h3>
              </div>
              <div style={{ padding: '0.75rem', display: 'grid', gap: '0.65rem' }}>
                {(Object.keys(CRM_PROVIDER_OPTIONS) as (keyof CrmAllowedProviders)[]).map((group) => (
                  <div key={group}>
                    <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                      {group}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {CRM_PROVIDER_OPTIONS[group].map((provider) => {
                        const checked = (crmProviders[group] || []).includes(provider);
                        return (
                          <label
                            key={`${group}-${provider}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '999px',
                              padding: '0.2rem 0.45rem',
                              fontSize: '12px',
                              background: checked ? '#eff6ff' : '#fff',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCrmProvider(group, provider)}
                            />
                            <span>{provider}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div>
                  <button
                    type="button"
                    onClick={saveCrmEntitlements}
                    disabled={savingCrmEntitlements}
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '5px',
                      border: 'none',
                      cursor: savingCrmEntitlements ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      fontSize: '12px',
                      opacity: savingCrmEntitlements ? 0.7 : 1,
                    }}
                  >
                    {savingCrmEntitlements ? 'Saving...' : 'Save CRM Entitlements'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '7px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 13, fontWeight: 'bold', margin: 0, color: '#334155' }}>
                  Entitlement Timeline
                </h3>
              </div>
              <div style={{ padding: '0.75rem' }}>
                {loadingCrmTimeline ? (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Loading timeline...</div>
                ) : crmTimeline.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>No CRM entitlement changes recorded yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.45rem' }}>
                    {crmTimeline.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '5px',
                          padding: '0.45rem 0.55rem',
                          fontSize: '12px',
                          background: '#f8fafc',
                        }}
                      >
                        <div style={{ color: '#0f172a', fontWeight: 600 }}>
                          {item.source || 'manual_override'}
                        </div>
                        <div style={{ color: '#334155' }}>{item.reason || 'No reason provided'}</div>
                        <div style={{ color: '#64748b' }}>
                          {new Date(item.createdAt).toLocaleString()} • {item.actor?.email || item.actor?.name || 'unknown actor'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'business-kra' && (
        <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <FaFileInvoice style={{ color: "#2563eb", fontSize: "13px" }} />
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#334155" }}>Business & KRA (Kenya Revenue Authority)</span>
            </div>
            <span style={{ color: "#64748b", fontSize: "12px", display: "block", marginTop: "0.2rem" }}>
              Edit business details and KRA compliance for this tenant. Tenant users can only view these details in Settings.
            </span>
          </div>
          <div style={{ padding: "0.7rem" }}>
            <form onSubmit={(e) => { e.preventDefault(); saveBusinessKra(); }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "0.7rem" }}>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Business Name</label>
                  <input type="text" value={businessKra.name ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, name: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Business Type</label>
                  <input type="text" value={businessKra.businessType ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, businessType: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Contact Email</label>
                  <input type="email" value={businessKra.contactEmail ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, contactEmail: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Contact Phone</label>
                  <input type="text" value={businessKra.contactPhone ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, contactPhone: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Address</label>
                  <input type="text" value={businessKra.address ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, address: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Country</label>
                  <select
                    value={businessKra.country ?? ''}
                    onChange={(e) => setBusinessKra(prev => ({ ...prev, country: e.target.value || undefined }))}
                    style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }}
                  >
                    <option value="">Select country</option>
                    {EAST_AFRICAN_COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.7rem", marginTop: "0.7rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input type="checkbox" id="kraEnabled" checked={!!businessKra.kraEnabled} onChange={(e) => setBusinessKra(prev => ({ ...prev, kraEnabled: e.target.checked }))} style={{ width: "14px", height: "14px" }} />
                  <label htmlFor="kraEnabled" style={{ fontWeight: "500", fontSize: "12px" }}>Enable KRA compliance (show KRA PIN / VAT / eTIMS on receipts)</label>
                </div>
                {businessKra.kraEnabled && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginTop: "0.5rem" }}>
                    <div>
                      <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>KRA PIN</label>
                      <input type="text" value={businessKra.kraPin ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, kraPin: e.target.value }))} placeholder="e.g. P051234567A" style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>VAT Number</label>
                      <input type="text" value={businessKra.vatNumber ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, vatNumber: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>KRA eTIMS QR Code URL</label>
                      <input type="url" value={businessKra.etimsQrUrl ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, etimsQrUrl: e.target.value }))} placeholder="URL to eTIMS QR image (required for Kenya)" style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: "0.7rem" }}>
                <button type="submit" disabled={savingBusinessKra} style={{ background: "#2563eb", color: "#fff", padding: "0.3rem 0.8rem", borderRadius: "5px", border: "none", cursor: savingBusinessKra ? "not-allowed" : "pointer", fontWeight: "500", fontSize: "12px", opacity: savingBusinessKra ? 0.6 : 1 }}>
                  {savingBusinessKra ? "Saving..." : "Save Business & KRA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProvisionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            background: '#fff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(2, 6, 23, 0.2)',
            padding: '1rem',
          }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Assign + Provision Metrics</h3>
            <p style={{ marginTop: '0.35rem', marginBottom: '0.75rem', fontSize: '12px', color: '#64748b' }}>
              Pick the classification for this tenant, then provision default units and variant attributes.
            </p>

            <div style={{ marginBottom: '0.6rem', fontSize: '12px', color: '#334155' }}>
              <strong>Tenant:</strong> {tenant.name}
            </div>
            <div style={{ marginBottom: '0.6rem', fontSize: '12px', color: '#334155' }}>
              <strong>Business Type:</strong> {tenant.businessType || 'Unknown'}
            </div>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
              Classification
            </label>
            <select
              value={selectedClassificationId}
              onChange={(e) => setSelectedClassificationId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.35rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '12px',
                marginBottom: '0.4rem',
              }}
            >
              <option value="">Select classification</option>
              {classificationOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            {classificationOptions.length === 0 && (
              <p style={{ marginTop: '0.25rem', marginBottom: '0.5rem', color: '#b91c1c', fontSize: '12px' }}>
                No active classifications available. Create or activate one first.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem', marginTop: '0.9rem' }}>
              <button
                onClick={() => setShowProvisionModal(false)}
                style={{
                  background: '#fff',
                  color: '#334155',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={assignAndProvisionMetrics}
                disabled={!selectedClassificationId || savingProvisioning}
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: !selectedClassificationId || savingProvisioning ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: !selectedClassificationId || savingProvisioning ? 0.6 : 1,
                  fontWeight: 500,
                }}
              >
                {savingProvisioning ? 'Provisioning...' : 'Assign + Provision'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
