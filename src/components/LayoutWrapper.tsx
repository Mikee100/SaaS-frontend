"use client";

import { usePathname } from "next/navigation";
import PlanBasedNav from "@/components/PlanBasedNav";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { useUser } from "@/components/UserContext";
import { useBillingAccessStatus } from "@/hooks/useBillingAccessStatus";
import { inferCrmCapabilityFromPath, inferCrmProviderFromPath, inferModuleFromPath, isCrmCapabilityEnabled, isCrmProviderAllowed, isModuleEnabled } from '@/utils/moduleAccess';

import { SidebarProvider, useSidebar } from "@/components/SidebarContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useSidebar();
  const { user } = useUser();
  const { data: accessStatus, isLoading: accessStatusLoading } =
    useBillingAccessStatus();

  // Check if current path is in a route group (auth, admin, settings)
  const isInRouteGroup = pathname && (
    pathname.startsWith('/(auth)') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/settings')
  );

  const showImpersonationBanner = !isInRouteGroup && pathname && !pathname.startsWith('/superadmin');
  const showAccessRestrictionBanner =
    !isInRouteGroup &&
    !accessStatusLoading &&
    !!user &&
    !user.isSuperadmin &&
    accessStatus.restricted;

  const isAIAssistant = pathname === '/ai-assistant';
  const requiredModule = inferModuleFromPath(pathname || '');
  const requiredCrmCapability = inferCrmCapabilityFromPath(pathname || '');
  const requiredCrmProvider = inferCrmProviderFromPath(pathname || '');
  const crmTemporarilyDisabled = requiredModule === 'crm';
  const allowModuleSettingsRoute = pathname?.startsWith('/settings/modules');
  const moduleBlocked =
    !!user &&
    !allowModuleSettingsRoute &&
    (crmTemporarilyDisabled ||
      !isModuleEnabled(user.enabledModules, requiredModule));
  const crmCapabilityBlocked =
    !!user &&
    !user.isSuperadmin &&
    !allowModuleSettingsRoute &&
    requiredModule === 'crm' &&
    !isCrmCapabilityEnabled(user.crmEntitlements, requiredCrmCapability);
  const crmProviderBlocked =
    !!user &&
    !user.isSuperadmin &&
    !allowModuleSettingsRoute &&
    !!requiredCrmProvider &&
    !isCrmProviderAllowed(
      user.crmEntitlements,
      requiredCrmProvider.group,
      requiredCrmProvider.provider,
    );

  const blockedModuleLabel = requiredModule
    ? requiredModule.charAt(0).toUpperCase() + requiredModule.slice(1)
    : 'This';
  const blockedCrmCapabilityLabel = requiredCrmCapability
    ? requiredCrmCapability.replace('crm.', '').replaceAll('_', ' ')
    : 'requested CRM capability';
  const blockedCrmProviderLabel = requiredCrmProvider?.provider || 'requested provider';

  return (
    <>
      {showImpersonationBanner && <ImpersonationBanner />}
      {showAccessRestrictionBanner && (
        <div className={`mx-2 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 lg:mr-4 lg:mt-3 transition-[margin-left] duration-250 ease-in-out ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">Subscription Access Restricted</p>
              <p className="text-amber-800">
                {accessStatus.reason ||
                  "Your subscription has expired and your account is currently restricted. Renew to continue using all features."}
              </p>
            </div>
            <a
              href={accessStatus.renewalPath || '/account/billing'}
              className="inline-flex items-center justify-center rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Open Billing
            </a>
          </div>
        </div>
      )}
      {!isInRouteGroup && <PlanBasedNav />}
      <main className={`${isAIAssistant ? 'min-h-screen' : 'min-h-screen'} bg-gray-50 transition-[margin-left] duration-250 ease-in-out ${!isInRouteGroup
        ? sidebarCollapsed
          ? 'lg:ml-16'
          : 'lg:ml-64'
        : ''
        }`}>
        {moduleBlocked || crmCapabilityBlocked || crmProviderBlocked ? (
          <div className="mx-auto max-w-3xl p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h1 className="text-xl font-semibold text-amber-900">Access Disabled</h1>
              {moduleBlocked ? (
                <p className="mt-2 text-sm text-amber-800">
                  {blockedModuleLabel} module is currently disabled for your tenant. Contact your admin to enable it.
                </p>
              ) : crmProviderBlocked ? (
                <p className="mt-2 text-sm text-amber-800">
                  CRM integration provider "{blockedCrmProviderLabel}" is not enabled for your tenant package.
                </p>
              ) : (
                <p className="mt-2 text-sm text-amber-800">
                  CRM capability "{blockedCrmCapabilityLabel}" is currently disabled for your tenant. Contact your admin to enable it.
                </p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <a
                  href="/settings/modules"
                  className="rounded bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
                >
                  Open Module Settings
                </a>
                <a
                  href="/account/billing"
                  className="rounded border border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                >
                  Open Billing
                </a>
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
      {!isAIAssistant && (
        <footer className="bg-white border-t border-gray-200 py-2 px-4 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Adeera Company. All rights reserved. | Software by Adeera Company | <a href="https://www.adeeraunitech.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Visit our website</a>
        </footer>
      )}
    </>
  );
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

