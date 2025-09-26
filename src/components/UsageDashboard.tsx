"use client";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FaUsers, FaBox, FaShoppingCart, FaExclamationTriangle, FaCrown } from 'react-icons/fa';
import { useEffect, useState } from 'react';

export default function UsageDashboard() {
  const { limits, loading, getUsagePercentage } = usePlanLimits();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Usage Dashboard</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Usage Dashboard</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!limits) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Usage Dashboard</h3>
        <p className="text-gray-500 text-sm">Loading usage information...</p>
      </div>
    );
  }

  const usersPercentage = getUsagePercentage();
  const productsPercentage = getUsagePercentage();
  const salesPercentage = getUsagePercentage();

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-100';
    if (percentage >= 80) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-2 mb-6">
        <FaCrown className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Usage Dashboard</h3>
      </div>

      <div className="space-y-6">
        {/* Users */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FaUsers className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Users</span>
            </div>
            <span className="text-sm text-gray-500">
              {limits.usage?.users?.current || 0}/{limits.usage?.users?.limit || 1}
            </span>
          </div>
          <div className={`h-2 rounded-full ${getProgressBgColor(usersPercentage)}`}>
            <div
              className={`h-2 rounded-full ${getProgressColor(usersPercentage)} transition-all duration-300`}
              style={{ width: `${usersPercentage}%` }}
            />
          </div>
          {usersPercentage >= 80 && (
            <div className="flex items-center gap-2 mt-2 text-amber-600 text-xs">
              <FaExclamationTriangle className="w-3 h-3" />
              <span>Approaching user limit</span>
            </div>
          )}
        </div>

        {/* Products */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FaBox className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Products</span>
            </div>
            <span className="text-sm text-gray-500">
              {limits.usage?.products?.current || 0}/{limits.usage?.products?.limit || 10}
            </span>
          </div>
          <div className={`h-2 rounded-full ${getProgressBgColor(productsPercentage)}`}>
            <div
              className={`h-2 rounded-full ${getProgressColor(productsPercentage)} transition-all duration-300`}
              style={{ width: `${productsPercentage}%` }}
            />
          </div>
          {productsPercentage >= 80 && (
            <div className="flex items-center gap-2 mt-2 text-amber-600 text-xs">
              <FaExclamationTriangle className="w-3 h-3" />
              <span>Approaching product limit</span>
            </div>
          )}
        </div>

        {/* Sales */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FaShoppingCart className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Monthly Sales</span>
            </div>
            <span className="text-sm text-gray-500">
              {limits.usage?.sales?.current || 0}/{limits.usage?.sales?.limit || 100}
            </span>
          </div>
          <div className={`h-2 rounded-full ${getProgressBgColor(salesPercentage)}`}>
            <div
              className={`h-2 rounded-full ${getProgressColor(salesPercentage)} transition-all duration-300`}
              style={{ width: `${salesPercentage}%` }}
            />
          </div>
          {salesPercentage >= 80 && (
            <div className="flex items-center gap-2 mt-2 text-amber-600 text-xs">
              <FaExclamationTriangle className="w-3 h-3" />
              <span>Approaching sales limit</span>
            </div>
          )}
        </div>

        {/* Current Plan */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Current Plan</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {limits.currentPlan || 'Basic'}
            </span>
          </div>
        </div>

        {/* Upgrade CTA */}
        {(usersPercentage >= 80 || productsPercentage >= 80 || salesPercentage >= 80) && (
          <div className="pt-4 border-t border-gray-200">
            <a
              href="/settings/billing"
              className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Upgrade Plan
            </a>
          </div>
        )}
      </div>
    </div>
  );
} 