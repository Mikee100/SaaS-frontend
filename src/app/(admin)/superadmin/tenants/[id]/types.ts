export type AppModuleKey =
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

export interface TenantModulesResponse {
  tenantId: string;
  key: string;
  enabledModules: AppModuleKey[];
  availableModules: AppModuleKey[];
}

export interface ModulePresetDefinition {
  key: string;
  label: string;
  description: string;
  enabledModules: AppModuleKey[];
}

export interface ModulePresetsResponse {
  presets: ModulePresetDefinition[];
}

export interface ModulePermissionRoleCheck {
  roleName: string;
  allowed: boolean;
  missing: string[];
}

export interface ModulePermissionMatrixEntry {
  module: AppModuleKey;
  enabled: boolean;
  requiredPermissions: string[];
  roleChecks: ModulePermissionRoleCheck[];
}

export interface ModulePermissionMatrixResponse {
  tenantId: string;
  enabledModules: AppModuleKey[];
  roles: string[];
  matrix: ModulePermissionMatrixEntry[];
}

export interface BlueprintCatalogEntry {
  businessType: string;
  blueprintKey: string;
  blueprintVersion: string;
  displayName: string;
  description: string;
  enabledModules: AppModuleKey[];
  navigation: Array<{
    key: string;
    label: string;
    path: string;
    requiredModule?: AppModuleKey;
  }>;
  apps: Array<{ key: string; label: string; enabledByDefault?: boolean }>;
  features: string[];
}

export interface BlueprintCatalogResponse {
  version: string;
  total: number;
  blueprints: BlueprintCatalogEntry[];
  navigationCatalog?: BlueprintCatalogEntry['navigation'];
}

export interface TenantBlueprintConfigured {
  businessType: string;
  blueprintKey: string;
  blueprintVersion: string;
  installedApps: string[];
  featureFlags: Record<string, boolean>;
  enabledModules: AppModuleKey[];
  navigationKeys: string[];
}

export interface TenantBlueprintResponse {
  tenantId: string;
  configuredNavigationKeysSet?: boolean;
  configured: TenantBlueprintConfigured;
}

export interface TenantBlueprintPreviewResponse {
  tenantId: string;
  mode: 'preview';
  current: TenantBlueprintConfigured;
  proposed: TenantBlueprintConfigured;
  effectivePreview: {
    manifest: {
      navigation?: Array<{ key?: string; label?: string; path?: string }>;
      dashboard?: Array<unknown>;
      quickActions?: Array<unknown>;
      enabledModules?: AppModuleKey[];
    };
  };
}

export type CrmPackageKey = 'starter' | 'growth' | 'pro' | 'enterprise';

export type CrmCapabilityKey =
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

export interface CrmLimits {
  pipelines: number | null;
  automationRules: number | null;
  documentStorageGb: number | null;
  integrationConnections: number | null;
  telephonyMinutesMonthly: number | null;
  proposalsMonthly: number | null;
  contractsMonthly: number | null;
}

export interface CrmAllowedProviders {
  calendar: string[];
  email: string[];
  telephony: string[];
  integrations: string[];
}

export interface CrmEntitlements {
  packageKey: CrmPackageKey;
  enabledCapabilities: CrmCapabilityKey[];
  limits: CrmLimits;
  allowedProviders: CrmAllowedProviders;
}

export interface TenantCrmEntitlementsResponse {
  tenantId: string;
  key: string;
  entitlements: CrmEntitlements;
  availablePackages: CrmPackageKey[];
  availableCapabilities: CrmCapabilityKey[];
}

export interface TenantCrmEntitlementTimelineEntry {
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

export interface TenantCrmEntitlementTimelineResponse {
  tenantId: string;
  total: number;
  items: TenantCrmEntitlementTimelineEntry[];
}

export const EAST_AFRICAN_COUNTRIES = [
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

export const CRM_PROVIDER_OPTIONS: CrmAllowedProviders = {
  calendar: ['google', 'microsoft'],
  email: ['gmail', 'outlook'],
  telephony: ['twilio', 'africa_talking'],
  integrations: ['zapier', 'zoom', 'slack', 'shopify'],
};

export interface TenantDetails {
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

export interface ClassificationOption {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
}

export interface MpesaConfigApiResponse {
  consumerKey?: string;
  consumerSecret?: string;
  shortCode?: string;
  passkey?: string;
  callbackUrl?: string;
  environment?: string;
  isActive?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  hasVariations?: boolean;
}

export interface Transaction {
  id: string;
  total: number;
  createdAt: string;
}

export interface Branch {
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

export interface TenantUserSummary {
  id: string;
  name: string;
  email: string;
  isDisabled: boolean;
  createdAt: string;
}

export type TabKey =
  | 'overview'
  | 'products'
  | 'transactions'
  | 'branches'
  | 'analytics'
  | 'integrations'
  | 'business-kra'
  | 'modules'
  | 'crm-entitlements'
  | 'password-reset';

export type Notice = { type: 'success' | 'error'; message: string } | null;

export interface ConfirmActionState {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}
