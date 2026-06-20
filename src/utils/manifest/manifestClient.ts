import { apiGet } from '@/utils/api';
import { normalizeEnabledModules } from '@/utils/moduleAccess';
import {
  BlueprintManifestV1,
  EffectiveTenantManifestResponse,
} from '@/types/blueprintManifest';

const DEFAULT_MANIFEST: BlueprintManifestV1 = {
  schemaVersion: '1.0.0',
  businessType: 'fashion',
  blueprintKey: 'legacy-fallback',
  blueprintVersion: 'v1',
  displayName: 'Legacy Fallback',
  description: 'Fallback manifest generated from enabled modules.',
  enabledModules: normalizeEnabledModules(undefined),
  navigation: [],
  dashboard: [],
  quickActions: [],
  settings: [],
  reports: [],
  entities: [],
  permissions: [],
  features: [],
  apps: [],
};

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}

function asStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0);
}

function normalizeManifest(input: unknown): BlueprintManifestV1 {
  if (!isRecord(input)) {
    return { ...DEFAULT_MANIFEST };
  }

  const raw = input as Partial<BlueprintManifestV1>;

  return {
    schemaVersion: raw.schemaVersion === '1.0.0' ? raw.schemaVersion : '1.0.0',
    businessType:
      raw.businessType === 'restaurant' || raw.businessType === 'spa_barber'
        ? raw.businessType
        : 'fashion',
    blueprintKey: String(raw.blueprintKey || DEFAULT_MANIFEST.blueprintKey),
    blueprintVersion: raw.blueprintVersion === 'v1' ? 'v1' : 'v1',
    displayName: String(raw.displayName || DEFAULT_MANIFEST.displayName),
    description: String(raw.description || DEFAULT_MANIFEST.description),
    enabledModules: normalizeEnabledModules(raw.enabledModules),
    navigation: Array.isArray(raw.navigation) ? raw.navigation : [],
    dashboard: Array.isArray(raw.dashboard) ? raw.dashboard : [],
    quickActions: Array.isArray(raw.quickActions) ? raw.quickActions : [],
    settings: Array.isArray(raw.settings) ? raw.settings : [],
    reports: Array.isArray(raw.reports) ? raw.reports : [],
    entities: Array.isArray(raw.entities) ? raw.entities : [],
    permissions: asStringArray(raw.permissions),
    features: asStringArray(raw.features),
    apps: Array.isArray(raw.apps) ? raw.apps : [],
    featureFlags: isRecord(raw.featureFlags)
      ? Object.fromEntries(
          Object.entries(raw.featureFlags).filter(([, value]) => typeof value === 'boolean'),
        )
      : undefined,
  };
}

export async function getEffectiveTenantManifest(): Promise<EffectiveTenantManifestResponse> {
  const payload = await apiGet<unknown>('/tenant/configurations/manifest/effective', {
    'x-suppress-error-log': 'true',
  });

  if (!isRecord(payload)) {
    return {
      manifest: { ...DEFAULT_MANIFEST },
      source: {
        blueprintKey: DEFAULT_MANIFEST.blueprintKey,
        blueprintVersion: DEFAULT_MANIFEST.blueprintVersion,
        businessType: DEFAULT_MANIFEST.businessType,
        fallbackFromEnabledModules: true,
      },
    };
  }

  const source = isRecord(payload.source) ? payload.source : {};

  return {
    manifest: normalizeManifest(payload.manifest),
    source: {
      blueprintKey: String(source.blueprintKey || DEFAULT_MANIFEST.blueprintKey),
      blueprintVersion: String(
        source.blueprintVersion || DEFAULT_MANIFEST.blueprintVersion,
      ),
      businessType: String(source.businessType || DEFAULT_MANIFEST.businessType),
      fallbackFromEnabledModules: Boolean(source.fallbackFromEnabledModules),
    },
  };
}
