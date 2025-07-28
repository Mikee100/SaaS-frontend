"use client";
import { useUser } from './UserContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FaHome, FaBox, FaShoppingCart, FaChartLine, FaCog, FaCrown, FaUsers } from 'react-icons/fa';
import { useEffect, useState } from 'react';

export default function PlanBasedNav() {
  const userContext = useUser();
  const { limits, hasFeature } = usePlanLimits();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render navigation if not on client yet (prevents hydration mismatch)
  if (!isClient) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-1">
              <FaCrown className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">SaaS Platform</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Don't render navigation if user is not loaded yet
  if (userContext?.loading) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-1">
              <FaCrown className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">SaaS Platform</span>
            </div>
            <div className="animate-pulse bg-gray-200 h-6 w-32 rounded"></div>
          </div>
        </div>
      </nav>
    );
  }

  // Don't render navigation if no user (for public pages)
  if (!userContext?.user) {
    return null;
  }

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: FaHome, requiredPlan: null },
    { name: 'Products', href: '/products', icon: FaBox, requiredPlan: 'Basic' },
    { name: 'Inventory', href: '/inventory', icon: FaBox, requiredPlan: 'Basic' },
    { name: 'Sales', href: '/sales', icon: FaShoppingCart, requiredPlan: null },
    { name: 'Analytics', href: '/analytics', icon: FaChartLine, requiredPlan: 'Pro' },
    { name: 'Reports', href: '/reports', icon: FaChartLine, requiredPlan: 'Enterprise' },
    { name: 'Settings', href: '/settings', icon: FaCog, requiredPlan: null },
  ];

  const canAccess = (item: any) => {
    if (!item.requiredPlan) return true;
    if (!limits) return true; // Default to allowing if limits not loaded
    
    const planHierarchy: Record<string, number> = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
    const currentPlan = limits.currentPlan || 'Basic';
    const currentLevel = planHierarchy[currentPlan] || 0;
    const requiredLevel = planHierarchy[item.requiredPlan] || 0;
    
    return currentLevel >= requiredLevel;
  };

  const accessibleItems = navigationItems.filter(canAccess);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-1">
              <FaCrown className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">SaaS Platform</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              {accessibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {limits && (
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <FaUsers className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {limits.usage?.users?.current || 0}/{limits.usage?.users?.limit || 1}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaBox className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {limits.usage?.products?.current || 0}/{limits.usage?.products?.limit || 10}
                  </span>
                </div>
                <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {limits.currentPlan || 'Basic'}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userContext.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 