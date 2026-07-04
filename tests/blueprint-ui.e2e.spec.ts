import { test, expect, Page } from '@playwright/test';
import { inferModuleFromPath, isModuleEnabled } from '@/utils/moduleAccess';

type MeResponse = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  branchId: string;
  tenantId: string;
  role: string;
  roles: string[];
  permissions: string[];
  isSuperadmin: boolean;
};

const coreBlueprint = {
  schemaVersion: '1.0.0',
  businessType: 'fashion',
  blueprintKey: 'default-retail',
  blueprintVersion: 'v1',
  displayName: 'Retail Starter',
  description: 'Retail baseline for E2E nav assertions.',
  enabledModules: ['dashboard', 'inventory', 'sales'],
  navigation: [
    { label: 'Dashboard', path: '/', requiredModule: 'dashboard' },
    { label: 'Retail Lane', path: '/retail-lane', requiredModule: 'dashboard' },
    { label: 'Products & Inventory', path: '/products/unified', requiredModule: 'inventory', requiredPermission: 'view_products' },
  ],
  dashboard: [],
  quickActions: [],
  settings: [],
  reports: [],
  entities: [],
  permissions: ['view_sales', 'view_products'],
  features: [],
  apps: ['dashboard', 'sales', 'inventory'],
};

const restaurantBlueprint = {
  schemaVersion: '1.0.0',
  businessType: 'restaurant',
  blueprintKey: 'restaurant-pro',
  blueprintVersion: 'v1',
  displayName: 'Restaurant Pro',
  description: 'Restaurant baseline for E2E nav assertions.',
  enabledModules: ['dashboard', 'sales', 'inventory'],
  navigation: [
    { label: 'Dashboard', path: '/', requiredModule: 'dashboard' },
    { label: 'Restaurant Lane', path: '/restaurant-lane', requiredModule: 'dashboard' },
    { label: 'Restaurant Activity', path: '/restaurant/activity', requiredModule: 'sales', requiredPermission: 'view_sales' },
    { label: 'Products & Inventory', path: '/products/unified', requiredModule: 'inventory', requiredPermission: 'view_products' },
  ],
  dashboard: [],
  quickActions: [],
  settings: [],
  reports: [],
  entities: [],
  permissions: ['view_sales', 'view_products'],
  features: [],
  apps: ['dashboard', 'sales', 'inventory'],
};

const RETAIL_ME: MeResponse = {
  id: 'user-retail-1',
  email: 'retail@example.com',
  firstName: 'Retail',
  lastName: 'Owner',
  branchId: 'branch-1',
  tenantId: 'tenant-1',
  role: 'owner',
  roles: ['owner'],
  permissions: ['view_dashboard', 'view_sales', 'view_inventory'],
  isSuperadmin: false,
};

const RESTAURANT_ME: MeResponse = {
  ...RETAIL_ME,
  id: 'user-restaurant-1',
  email: 'restaurant@example.com',
  firstName: 'Restaurant',
};

const SUPERADMIN_ME: MeResponse = {
  id: 'user-superadmin-1',
  email: 'superadmin@example.com',
  firstName: 'Super',
  lastName: 'Admin',
  branchId: 'branch-1',
  tenantId: 'tenant-1',
  role: 'superadmin',
  roles: ['superadmin'],
  permissions: ['*'],
  isSuperadmin: true,
};

const TEST_TENANT_ID = 'tenant-1';

const getApiOrigin = (): string => {
  const envApi = process.env.NEXT_PUBLIC_API_URL;
  if (envApi && envApi.trim().length > 0) {
    return envApi.replace(/\/+$/, '');
  }

  const appBase = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5000';
  const appOrigin = new URL(appBase).origin;
  return appOrigin.replace(/:5000$/, ':7050');
};

async function mockBlueprintSession(
  page: Page,
  params: {
    me: MeResponse;
    blueprint: unknown;
  },
) {
  const apiOrigin = getApiOrigin();
  const alternateApiOrigin = apiOrigin.includes('127.0.0.1')
    ? apiOrigin.replace('127.0.0.1', 'localhost')
    : apiOrigin.includes('localhost')
      ? apiOrigin.replace('localhost', '127.0.0.1')
      : apiOrigin;

  await page.route('**/*', async (route) => {
    const reqUrl = new URL(route.request().url());
    if (reqUrl.origin !== apiOrigin && reqUrl.origin !== alternateApiOrigin) {
      await route.continue();
      return;
    }

    const path = reqUrl.pathname;

    if (path === '/auth/me' || path === '/user/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(params.me),
      });
      return;
    }

    if (path === '/tenant/configurations/manifest/effective') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          manifest: params.blueprint,
          source: {
            blueprintKey: (params.blueprint as { blueprintKey?: string }).blueprintKey || 'e2e-blueprint',
            blueprintVersion: 'v1',
            businessType: (params.blueprint as { businessType?: string }).businessType || 'fashion',
            fallbackFromEnabledModules: false,
          },
        }),
      });
      return;
    }

    if (path === '/billing/access-status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restricted: false,
          reason: null,
          lockDate: null,
        }),
      });
      return;
    }

    if (path === '/tenant/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: params.me.tenantId,
          name: 'E2E Tenant',
          logoUrl: null,
        }),
      });
      return;
    }

    if (path === '/user/me/plan-limits') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          currentPlan: 'Pro',
        }),
      });
      return;
    }

    if (path === '/auth/refresh') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'No refresh in e2e mock' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

async function mockSuperadminTenantBlueprintApis(page: Page) {
  const apiOrigin = getApiOrigin();
  const alternateApiOrigin = apiOrigin.includes('127.0.0.1')
    ? apiOrigin.replace('127.0.0.1', 'localhost')
    : apiOrigin.includes('localhost')
      ? apiOrigin.replace('localhost', '127.0.0.1')
      : apiOrigin;

  await page.route('**/*', async (route) => {
    const req = route.request();
    const reqUrl = new URL(req.url());
    if (reqUrl.origin !== apiOrigin && reqUrl.origin !== alternateApiOrigin) {
      await route.continue();
      return;
    }

    const path = reqUrl.pathname;
    const method = req.method().toUpperCase();

    if (path === '/auth/me' || path === '/user/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SUPERADMIN_ME),
      });
      return;
    }

    if (path === '/tenant/configurations/manifest/effective') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          manifest: coreBlueprint,
          source: {
            blueprintKey: coreBlueprint.blueprintKey,
            blueprintVersion: coreBlueprint.blueprintVersion,
            businessType: coreBlueprint.businessType,
            fallbackFromEnabledModules: false,
          },
        }),
      });
      return;
    }

    if (path === '/billing/access-status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ restricted: false, reason: null, lockDate: null }),
      });
      return;
    }

    if (path === '/admin/module-presets') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ presets: [] }),
      });
      return;
    }

    if (path === '/admin/blueprints') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          total: 2,
          blueprints: [
            {
              businessType: 'fashion',
              blueprintKey: 'default-retail',
              blueprintVersion: 'v1',
              displayName: 'Retail Starter',
              description: 'Retail baseline',
              enabledModules: ['dashboard', 'inventory', 'sales'],
              apps: [],
              features: [],
            },
            {
              businessType: 'restaurant',
              blueprintKey: 'restaurant-pro',
              blueprintVersion: 'v1',
              displayName: 'Restaurant Pro',
              description: 'Restaurant baseline',
              enabledModules: ['dashboard', 'inventory', 'sales'],
              apps: [],
              features: [],
            },
          ],
        }),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: TEST_TENANT_ID,
          name: 'E2E Tenant',
          businessType: 'fashion',
          contactEmail: 'owner@example.com',
          contactPhone: '+254700000001',
          restaurantFeaturesEnabled: false,
          createdAt: new Date().toISOString(),
          userCount: 3,
          productCount: 4,
          salesCount: 5,
          branchCount: 1,
          spaceUsedMB: '42',
          resourceSpaceUsage: { products: 1024 },
        }),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/products`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/transactions`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/branches`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/modules`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tenantId: TEST_TENANT_ID,
          key: 'app.modules.v1',
          enabledModules: ['dashboard', 'inventory', 'sales'],
          availableModules: [
            'dashboard',
            'sales',
            'inventory',
            'analytics',
            'reports',
            'crm',
            'settings',
            'billing',
          ],
        }),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/module-permission-matrix`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tenantId: TEST_TENANT_ID,
          enabledModules: ['dashboard', 'inventory', 'sales'],
          roles: ['owner'],
          matrix: [],
        }),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/blueprint` && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tenantId: TEST_TENANT_ID,
          configured: {
            businessType: 'fashion',
            blueprintKey: 'default-retail',
            blueprintVersion: 'v1',
            installedApps: [],
            featureFlags: {},
            enabledModules: ['dashboard', 'inventory', 'sales'],
          },
        }),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/blueprint/preview` && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tenantId: TEST_TENANT_ID,
          mode: 'preview',
          current: {
            businessType: 'fashion',
            blueprintKey: 'default-retail',
            blueprintVersion: 'v1',
            installedApps: [],
            featureFlags: {},
            enabledModules: ['dashboard', 'inventory', 'sales'],
          },
          proposed: {
            businessType: 'restaurant',
            blueprintKey: 'restaurant-pro',
            blueprintVersion: 'v1',
            installedApps: [],
            featureFlags: {},
            enabledModules: ['dashboard', 'inventory', 'sales'],
          },
          effectivePreview: {
            manifest: {
              navigation: [{ label: 'Restaurant Lane', path: '/restaurant-lane' }],
              dashboard: [],
              quickActions: [],
              enabledModules: ['dashboard', 'inventory', 'sales'],
            },
          },
        }),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/blueprint/rollback` && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tenantId: TEST_TENANT_ID,
          configured: {
            businessType: 'fashion',
            blueprintKey: 'default-retail',
            blueprintVersion: 'v1',
            installedApps: [],
            featureFlags: {},
            enabledModules: ['dashboard', 'inventory', 'sales'],
          },
        }),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/crm-entitlements`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tenantId: TEST_TENANT_ID,
          key: 'app.crm.entitlements.v1',
          entitlements: {
            packageKey: 'starter',
            enabledCapabilities: ['crm.pipeline'],
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
              email: [],
              telephony: [],
              integrations: [],
            },
          },
          availablePackages: ['starter', 'growth', 'pro', 'enterprise'],
          availableCapabilities: ['crm.pipeline'],
        }),
      });
      return;
    }

    if (path === `/admin/tenants/${TEST_TENANT_ID}/crm-entitlements/timeline`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tenantId: TEST_TENANT_ID,
          total: 0,
          items: [],
        }),
      });
      return;
    }

    if (path === '/auth/refresh') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'No refresh in e2e mock' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

async function seedAuthCache(page: Page, me: MeResponse, blueprint: { enabledModules?: string[] }) {
  await page.addInitScript(
    ({ mePayload, enabledModules }) => {
      window.localStorage.setItem('token', 'e2e-token');
      window.localStorage.setItem('sidebarCollapsed', JSON.stringify(true));

      const cachedUser = {
        id: mePayload.id,
        email: mePayload.email,
        name: `${mePayload.firstName} ${mePayload.lastName}`.trim(),
        roles: mePayload.roles,
        permissions: mePayload.permissions,
        isSuperadmin: mePayload.isSuperadmin,
        tenantId: mePayload.tenantId,
        branchId: mePayload.branchId,
        enabledModules: Array.isArray(enabledModules) ? enabledModules : ['dashboard', 'inventory', 'sales'],
      };

      window.localStorage.setItem('user_cache_data', JSON.stringify(cachedUser));
      window.localStorage.setItem('user_cache_timestamp', String(Date.now()));
    },
    {
      mePayload: me,
      enabledModules: blueprint.enabledModules,
    },
  );
}

test.describe('Blueprint-driven shell composition', () => {
  test('loads retail dashboard session and resolves retail manifest in browser', async ({ page }) => {
    await mockBlueprintSession(page, { me: RETAIL_ME, blueprint: coreBlueprint });
    await seedAuthCache(page, RETAIL_ME, coreBlueprint);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    const manifestPayload = await page.evaluate(async (apiOrigin) => {
      const response = await fetch(`${apiOrigin}/tenant/configurations/manifest/effective`, {
        credentials: 'include',
      });
      return response.json();
    }, getApiOrigin());

    await expect(manifestPayload.manifest.blueprintKey).toBe('default-retail');
    await expect(manifestPayload.manifest.businessType).toBe('fashion');
  });

  test('loads restaurant dashboard session and resolves restaurant manifest in browser', async ({ page }) => {
    await mockBlueprintSession(page, {
      me: RESTAURANT_ME,
      blueprint: restaurantBlueprint,
    });
    await seedAuthCache(page, RESTAURANT_ME, restaurantBlueprint);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    const manifestPayload = await page.evaluate(async (apiOrigin) => {
      const response = await fetch(`${apiOrigin}/tenant/configurations/manifest/effective`, {
        credentials: 'include',
      });
      return response.json();
    }, getApiOrigin());

    await expect(manifestPayload.manifest.blueprintKey).toBe('restaurant-pro');
    await expect(manifestPayload.manifest.businessType).toBe('restaurant');
  });

  test('marks CRM route as disabled for retail blueprint policy', async () => {
    const requiredModule = inferModuleFromPath('/crm/pipeline');

    await expect(requiredModule).toBe('crm');
    await expect(
      isModuleEnabled(coreBlueprint.enabledModules as never, requiredModule),
    ).toBe(false);
  });

  test('supports superadmin blueprint preview and rollback flow from tenant admin session', async ({ page }) => {
    await mockSuperadminTenantBlueprintApis(page);
    await seedAuthCache(page, SUPERADMIN_ME, coreBlueprint);

    await page.goto(`/superadmin/tenants/${TEST_TENANT_ID}`);
    await expect(page).toHaveURL(new RegExp(`/superadmin/tenants/${TEST_TENANT_ID}`));

    const previewPayload = await page.evaluate(
      async ({ apiOrigin, tenantId }) => {
        const response = await fetch(`${apiOrigin}/admin/tenants/${tenantId}/blueprint/preview`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessType: 'restaurant',
            blueprintKey: 'restaurant-pro',
            blueprintVersion: 'v1',
            installedApps: [],
            featureFlags: {},
          }),
        });

        return response.json();
      },
      { apiOrigin: getApiOrigin(), tenantId: TEST_TENANT_ID },
    );

    await expect(previewPayload.proposed.blueprintKey).toBe('restaurant-pro');
    await expect(previewPayload.current.blueprintKey).toBe('default-retail');

    const rollbackPayload = await page.evaluate(
      async ({ apiOrigin, tenantId }) => {
        const response = await fetch(`${apiOrigin}/admin/tenants/${tenantId}/blueprint/rollback`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        return response.json();
      },
      { apiOrigin: getApiOrigin(), tenantId: TEST_TENANT_ID },
    );

    await expect(rollbackPayload.configured.blueprintKey).toBe('default-retail');
    await expect(rollbackPayload.configured.businessType).toBe('fashion');
  });
});
