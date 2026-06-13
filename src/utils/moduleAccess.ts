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

export type CrmLimitKey = keyof CrmLimits;

export interface CrmLimitStatus {
  key: CrmLimitKey;
  limit: number | null;
  usage: number;
  usagePercent: number | null;
  warning: boolean;
  blocked: boolean;
}

export const DEFAULT_ENABLED_MODULES: AppModuleKey[] = [
  'dashboard',
  'payroll',
  'sales',
  'credits',
  'inventory',
  'accounts',
  'analytics',
  'reports',
  'expenses',
  'crm',
  'ai',
  'settings',
  'billing',
];

export const DEFAULT_CRM_CAPABILITIES: CrmCapabilityKey[] = [
  'crm.pipeline',
  'crm.tasks',
  'crm.reporting',
  'crm.email_integration',
];

export const ALL_CRM_CAPABILITIES: CrmCapabilityKey[] = [
  'crm.pipeline',
  'crm.tasks',
  'crm.documents',
  'crm.calendar_integration',
  'crm.meeting_scheduler',
  'crm.email_integration',
  'crm.reporting',
  'crm.workflow_automation',
  'crm.lead_scoring',
  'crm.telephony',
  'crm.proposal_management',
  'crm.contract_management',
  'crm.third_party_integrations',
];

export const DEFAULT_CRM_ENTITLEMENTS: CrmEntitlements = {
  packageKey: 'starter',
  enabledCapabilities: [...DEFAULT_CRM_CAPABILITIES],
  limits: {
    pipelines: 1,
    automationRules: 0,
    documentStorageGb: 2,
    integrationConnections: 2,
    telephonyMinutesMonthly: 0,
    proposalsMonthly: 0,
    contractsMonthly: 0,
  },
  allowedProviders: {
    calendar: [],
    email: ['gmail', 'outlook'],
    telephony: [],
    integrations: ['zapier'],
  },
};

export function normalizeEnabledModules(input: unknown): AppModuleKey[] {
  if (!Array.isArray(input)) {
    return [...DEFAULT_ENABLED_MODULES];
  }

  const allowed = new Set(DEFAULT_ENABLED_MODULES);
  const normalized = input
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry): entry is AppModuleKey => allowed.has(entry as AppModuleKey));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : [...DEFAULT_ENABLED_MODULES];
}

export function isModuleEnabled(
  enabledModules: AppModuleKey[] | undefined,
  requiredModule: AppModuleKey | null | undefined,
): boolean {
  if (!requiredModule) {
    return true;
  }

  const effective = Array.isArray(enabledModules) && enabledModules.length > 0
    ? enabledModules
    : DEFAULT_ENABLED_MODULES;

  return effective.includes(requiredModule);
}

export function normalizeCrmEntitlements(input: unknown): CrmEntitlements {
  const source = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};

  const packageKey = String(source.packageKey || '').trim().toLowerCase();
  const normalizedPackageKey: CrmPackageKey =
    packageKey === 'growth' || packageKey === 'pro' || packageKey === 'enterprise'
      ? (packageKey as CrmPackageKey)
      : 'starter';

  const rawCapabilities = Array.isArray(source.enabledCapabilities)
    ? source.enabledCapabilities
    : DEFAULT_CRM_CAPABILITIES;

  const capabilitySet = new Set(ALL_CRM_CAPABILITIES);
  const enabledCapabilities = rawCapabilities
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry): entry is CrmCapabilityKey => capabilitySet.has(entry as CrmCapabilityKey));

  const limitsSource =
    typeof source.limits === 'object' && source.limits !== null
      ? (source.limits as Record<string, unknown>)
      : {};

  const parseLimit = (value: unknown, fallback: number | null) => {
    if (value === null) return null;
    if (value === undefined) return fallback;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return fallback;
    return Math.floor(num);
  };

  const providersSource =
    typeof source.allowedProviders === 'object' && source.allowedProviders !== null
      ? (source.allowedProviders as Record<string, unknown>)
      : {};

  const parseProviderGroup = (key: keyof CrmAllowedProviders) => {
    const current = providersSource[key];
    if (!Array.isArray(current)) {
      return [...DEFAULT_CRM_ENTITLEMENTS.allowedProviders[key]];
    }
    return Array.from(new Set(current.map((entry) => String(entry || '').trim().toLowerCase())));
  };

  return {
    packageKey: normalizedPackageKey,
    enabledCapabilities:
      enabledCapabilities.length > 0 ? enabledCapabilities : [...DEFAULT_CRM_CAPABILITIES],
    limits: {
      pipelines: parseLimit(limitsSource.pipelines, DEFAULT_CRM_ENTITLEMENTS.limits.pipelines),
      automationRules: parseLimit(limitsSource.automationRules, DEFAULT_CRM_ENTITLEMENTS.limits.automationRules),
      documentStorageGb: parseLimit(limitsSource.documentStorageGb, DEFAULT_CRM_ENTITLEMENTS.limits.documentStorageGb),
      integrationConnections: parseLimit(limitsSource.integrationConnections, DEFAULT_CRM_ENTITLEMENTS.limits.integrationConnections),
      telephonyMinutesMonthly: parseLimit(limitsSource.telephonyMinutesMonthly, DEFAULT_CRM_ENTITLEMENTS.limits.telephonyMinutesMonthly),
      proposalsMonthly: parseLimit(limitsSource.proposalsMonthly, DEFAULT_CRM_ENTITLEMENTS.limits.proposalsMonthly),
      contractsMonthly: parseLimit(limitsSource.contractsMonthly, DEFAULT_CRM_ENTITLEMENTS.limits.contractsMonthly),
    },
    allowedProviders: {
      calendar: parseProviderGroup('calendar'),
      email: parseProviderGroup('email'),
      telephony: parseProviderGroup('telephony'),
      integrations: parseProviderGroup('integrations'),
    },
  };
}

export function isCrmCapabilityEnabled(
  crmEntitlements: CrmEntitlements | undefined,
  requiredCapability: CrmCapabilityKey | null | undefined,
): boolean {
  if (!requiredCapability) {
    return true;
  }

  const effective = crmEntitlements || DEFAULT_CRM_ENTITLEMENTS;
  return effective.enabledCapabilities.includes(requiredCapability);
}

export function inferCrmCapabilityFromPath(pathname: string): CrmCapabilityKey | null {
  const path = String(pathname || '').toLowerCase();

  if (path.startsWith('/crm/pipeline') || path.startsWith('/pipeline') || path.startsWith('/deals')) {
    return 'crm.pipeline';
  }
  if (path.startsWith('/crm/tasks') || path.startsWith('/tasks')) return 'crm.tasks';
  if (path.startsWith('/crm/documents') || path.startsWith('/documents')) return 'crm.documents';
  if (path.startsWith('/crm/calendar') || path.startsWith('/calendar')) return 'crm.calendar_integration';
  if (path.startsWith('/crm/scheduler') || path.startsWith('/scheduler') || path.startsWith('/meetings')) {
    return 'crm.meeting_scheduler';
  }
  if (path.startsWith('/crm/email')) return 'crm.email_integration';
  if (path.startsWith('/crm/reports') || path.startsWith('/crm/analytics')) return 'crm.reporting';
  if (path.startsWith('/crm/automation') || path.startsWith('/automation')) return 'crm.workflow_automation';
  if (path.startsWith('/crm/lead-scoring') || path.startsWith('/lead-scoring')) return 'crm.lead_scoring';
  if (path.startsWith('/crm/telephony') || path.startsWith('/telephony')) return 'crm.telephony';
  if (path.startsWith('/crm/proposals') || path.startsWith('/proposals')) return 'crm.proposal_management';
  if (path.startsWith('/crm/contracts') || path.startsWith('/contracts')) return 'crm.contract_management';
  if (path.startsWith('/crm/integrations') || path.startsWith('/integrations/crm')) {
    return 'crm.third_party_integrations';
  }

  return null;
}

export function inferCrmProviderFromPath(pathname: string):
  | { group: keyof CrmAllowedProviders; provider: string }
  | null {
  const path = String(pathname || '').toLowerCase();
  const integrationsPrefix = '/crm/integrations/';

  if (path.startsWith(integrationsPrefix)) {
    const provider = path.slice(integrationsPrefix.length).split('/')[0];
    if (provider) {
      return { group: 'integrations', provider };
    }
  }

  return null;
}

export function isCrmProviderAllowed(
  crmEntitlements: CrmEntitlements | undefined,
  group: keyof CrmAllowedProviders,
  provider: string,
): boolean {
  const effective = crmEntitlements || DEFAULT_CRM_ENTITLEMENTS;
  return (effective.allowedProviders[group] || []).includes(
    String(provider || '').trim().toLowerCase(),
  );
}

export function evaluateCrmLimitStatus(
  crmEntitlements: CrmEntitlements | undefined,
  usage: Partial<Record<CrmLimitKey, number>>,
  key: CrmLimitKey,
): CrmLimitStatus {
  const effective = crmEntitlements || DEFAULT_CRM_ENTITLEMENTS;
  const limit = effective.limits[key];
  const current = Number(usage[key] ?? 0);

  if (limit === null) {
    return {
      key,
      limit,
      usage: current,
      usagePercent: null,
      warning: false,
      blocked: false,
    };
  }

  if (limit <= 0) {
    return {
      key,
      limit,
      usage: current,
      usagePercent: 100,
      warning: true,
      blocked: true,
    };
  }

  const usagePercent = Math.round((current / limit) * 100);
  return {
    key,
    limit,
    usage: current,
    usagePercent,
    warning: usagePercent >= 80,
    blocked: current >= limit,
  };
}

export function inferModuleFromPath(pathname: string): AppModuleKey | null {
  const path = String(pathname || '').toLowerCase();

  if (!path || path === '/') return 'dashboard';
  if (path.startsWith('/payroll') || path.startsWith('/hr') || path.startsWith('/salary-schemes')) {
    return 'payroll';
  }
  if (path.startsWith('/sales/credits') || path.startsWith('/credit')) return 'credits';
  if (path.startsWith('/sales')) return 'sales';
  if (path.startsWith('/restaurant')) return 'sales';
  if (
    path.startsWith('/products') ||
    path.startsWith('/product') ||
    path.startsWith('/inventory') ||
    path.startsWith('/suppliers') ||
    path.startsWith('/supplier')
  ) {
    return 'inventory';
  }
  if (path.startsWith('/accounts')) return 'accounts';
  if (path.startsWith('/analytics')) return 'analytics';
  if (path.startsWith('/reports')) return 'reports';
  if (path.startsWith('/expenses')) return 'expenses';
  if (
    path.startsWith('/crm') ||
    path.startsWith('/pipeline') ||
    path.startsWith('/contacts') ||
    path.startsWith('/deals') ||
    path.startsWith('/tasks') ||
    path.startsWith('/proposals') ||
    path.startsWith('/contracts')
  ) {
    return 'crm';
  }
  if (path.startsWith('/ai-assistant')) return 'ai';
  if (path.startsWith('/settings')) return 'settings';
  if (path.startsWith('/account/billing') || path.startsWith('/billing')) return 'billing';

  return null;
}
