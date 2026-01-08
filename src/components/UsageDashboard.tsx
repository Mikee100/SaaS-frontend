"use client";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FaUsers, FaBox, FaShoppingCart, FaExclamationTriangle, FaCrown, FaChartLine, FaArrowUp } from 'react-icons/fa';
import { useEffect, useState } from 'react';

// Helper function to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

// Helper function to format numbers with commas
const formatNumberWithCommas = (num: number): string => {
  return num.toLocaleString('en-US');
};

interface UsageMetricProps {
  title: string;
  icon: React.ReactNode;
  current: number;
  limit: number;
  percentage: number;
  color: 'blue' | 'green' | 'purple';
  isExceeded: boolean;
  exceededBy?: number;
}

function UsageMetricCard({ title, icon, current, limit, percentage, color, isExceeded, exceededBy }: UsageMetricProps) {
  const getColorClasses = (colorType: string, exceeded: boolean) => {
    const baseColors = {
      blue: {
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        normalProgress: 'bg-blue-500',
        normalProgressBg: 'bg-blue-100',
        normalBorder: 'border-blue-200',
      },
      green: {
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        normalProgress: 'bg-green-500',
        normalProgressBg: 'bg-green-100',
        normalBorder: 'border-green-200',
      },
      purple: {
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        normalProgress: 'bg-purple-500',
        normalProgressBg: 'bg-purple-100',
        normalBorder: 'border-purple-200',
      },
    };

    const base = baseColors[colorType as keyof typeof baseColors];

    if (exceeded) {
      return {
        bg: 'bg-red-50',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        progress: 'bg-red-600',
        progressBg: 'bg-red-100',
        warning: 'text-red-700',
        warningBg: 'bg-red-50',
        border: 'border-red-300',
        ...base,
      };
    }

    if (percentage >= 90) {
      return {
        bg: 'bg-orange-50',
        iconBg: base.iconBg,
        iconColor: base.iconColor,
        progress: 'bg-orange-500',
        progressBg: 'bg-orange-100',
        warning: 'text-orange-700',
        warningBg: 'bg-orange-50',
        border: 'border-orange-300',
        ...base,
      };
    }

    if (percentage >= 80) {
      return {
        bg: 'bg-amber-50',
        iconBg: base.iconBg,
        iconColor: base.iconColor,
        progress: 'bg-amber-500',
        progressBg: 'bg-amber-100',
        warning: 'text-amber-700',
        warningBg: 'bg-amber-50',
        border: 'border-amber-300',
        ...base,
      };
    }

    return {
      bg: 'bg-white',
      iconBg: base.iconBg,
      iconColor: base.iconColor,
      progress: base.normalProgress,
      progressBg: base.normalProgressBg,
      warning: 'text-gray-600',
      warningBg: 'bg-gray-50',
      border: base.normalBorder,
      ...base,
    };
  };

  const colors = getColorClasses(color, isExceeded);
  const displayPercentage = Math.min(percentage, 100);
  const remaining = limit - current;

  return (
    <div className={`bg-white rounded-2xl border-2 ${colors.border} p-6 hover:shadow-lg transition-all duration-200 ${isExceeded ? 'ring-2 ring-red-200' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`${colors.iconBg} p-3 rounded-xl`}>
            <div className={colors.iconColor}>
              {icon}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {isExceeded ? 'Limit exceeded' : 'Current usage'}
            </p>
          </div>
        </div>
        {(isExceeded || percentage >= 80) && (
          <div className={`${colors.warningBg} px-2.5 py-1 rounded-lg border ${colors.border}`}>
            <FaExclamationTriangle className={`${colors.warning} w-3.5 h-3.5`} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-3xl font-bold tabular-nums ${isExceeded ? 'text-red-600' : 'text-gray-900'}`}>
            {formatNumberWithCommas(current)}
          </span>
          <span className="text-lg text-gray-400">/</span>
          <span className="text-xl text-gray-500 tabular-nums">
            {formatNumberWithCommas(limit)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isExceeded ? (
            <>
              <span className="font-semibold text-red-600">Exceeded by {formatNumber(exceededBy || 0)}</span>
              <span className="text-gray-400">•</span>
              <span className="text-red-600 font-medium">100%+</span>
            </>
          ) : (
            <>
              <span className={`font-medium ${percentage >= 80 ? colors.warning : 'text-gray-600'}`}>
                {displayPercentage}%
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">
                {formatNumberWithCommas(Math.max(0, remaining))} remaining
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className={`h-3 rounded-full overflow-hidden ${colors.progressBg} relative`}>
          <div
            className={`h-full rounded-full ${colors.progress} transition-all duration-500 ease-out`}
            style={{ width: `${displayPercentage}%` }}
          />
          {isExceeded && (
            <div className="absolute inset-0 h-full bg-red-600 opacity-50 rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Warning/Exceeded Message */}
      {isExceeded ? (
        <div className={`${colors.warningBg} border-2 ${colors.border} rounded-lg p-3 mt-3`}>
          <div className="flex items-start gap-2">
            <FaExclamationTriangle className={`${colors.warning} w-4 h-4 mt-0.5 flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${colors.warning} mb-1`}>
                Limit Exceeded - Action Required
              </p>
              <p className="text-xs text-gray-700">
                Your usage has exceeded the plan limit by {formatNumber(exceededBy || 0)} {title.toLowerCase()}. 
                Please upgrade your plan immediately to restore full functionality and avoid service restrictions.
              </p>
            </div>
          </div>
        </div>
      ) : percentage >= 80 ? (
        <div className={`${colors.warningBg} border ${colors.border} rounded-lg p-3 mt-3`}>
          <div className="flex items-start gap-2">
            <FaExclamationTriangle className={`${colors.warning} w-4 h-4 mt-0.5 flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${colors.warning} mb-1`}>
                {percentage >= 90 ? 'Approaching Limit' : 'Getting Close'}
              </p>
              <p className="text-xs text-gray-600">
                {percentage >= 90 
                  ? `You've used ${displayPercentage}% of your ${title.toLowerCase()} limit. Consider upgrading soon to avoid restrictions.` 
                  : `You've used ${displayPercentage}% of your ${title.toLowerCase()} limit. ${formatNumberWithCommas(Math.max(0, remaining))} remaining.`
                }
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function UsageDashboard() {
const { data: limits, loading } = usePlanLimits();
const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // Don't render until client-side hydration is complete
  if (!isClient || loading) {
    return <LoadingSkeleton />;
  }

  if (!limits) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <FaChartLine className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Unable to load usage information</p>
        </div>
      </div>
    );
  }

  const currentProducts = limits.usage?.products?.current || 0;
  const limitProducts = limits.usage?.products?.limit || 10;
  const currentUsers = limits.usage?.users?.current || 0;
  const limitUsers = limits.usage?.users?.limit || 1;
  const currentSales = limits.usage?.sales?.current || 0;
  const limitSales = limits.usage?.sales?.limit || 100;

  // Calculate percentages and handle exceeded limits
  const calculateUsage = (current: number, limit: number) => {
    const isExceeded = current > limit;
    const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0;
    const exceededBy = isExceeded ? current - limit : 0;
    const displayPercentage = isExceeded ? 100 : percentage;
    
    return {
      percentage: displayPercentage,
      isExceeded,
      exceededBy,
    };
  };

  const usersUsage = calculateUsage(currentUsers, limitUsers);
  const productsUsage = calculateUsage(currentProducts, limitProducts);
  const salesUsage = calculateUsage(currentSales, limitSales);

  const usersPercentage = usersUsage.percentage;
  const productsPercentage = productsUsage.percentage;
  const salesPercentage = salesUsage.percentage;

  const hasWarnings = usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded || 
                      usersPercentage >= 80 || productsPercentage >= 80 || salesPercentage >= 80;
  const currentPlan = limits.currentPlan || 'Basic';

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <FaCrown className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-1">Usage Dashboard</h3>
              <p className="text-blue-100 text-sm">
                Monitor your plan usage and capacity
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-100 mb-1">Current Plan</div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl font-semibold text-lg">
              {currentPlan}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <UsageMetricCard
          title="Users"
          icon={<FaUsers className="w-5 h-5" />}
          current={currentUsers}
          limit={limitUsers}
          percentage={usersPercentage}
          color="blue"
          isExceeded={usersUsage.isExceeded}
          exceededBy={usersUsage.exceededBy}
        />
        <UsageMetricCard
          title="Products"
          icon={<FaBox className="w-5 h-5" />}
          current={currentProducts}
          limit={limitProducts}
          percentage={productsPercentage}
          color="green"
          isExceeded={productsUsage.isExceeded}
          exceededBy={productsUsage.exceededBy}
        />
        <UsageMetricCard
          title="Monthly Sales"
          icon={<FaShoppingCart className="w-5 h-5" />}
          current={currentSales}
          limit={limitSales}
          percentage={salesPercentage}
          color="purple"
          isExceeded={salesUsage.isExceeded}
          exceededBy={salesUsage.exceededBy}
        />
      </div>

      {/* Upgrade CTA - Enhanced */}
      {hasWarnings && (
        <div className={`${usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded 
          ? 'bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-2 border-red-300' 
          : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200'
        } rounded-2xl p-6`}>
          <div className="flex items-start gap-4">
            <div className={`${usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded 
              ? 'bg-red-100' 
              : 'bg-amber-100'
            } p-3 rounded-xl flex-shrink-0`}>
              <FaExclamationTriangle className={`w-6 h-6 ${usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded 
                ? 'text-red-600' 
                : 'text-amber-600'
              }`} />
            </div>
            <div className="flex-1">
              <h4 className={`font-bold mb-1 text-lg ${usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded 
                ? 'text-red-900' 
                : 'text-gray-900'
              }`}>
                {usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded 
                  ? 'Immediate Action Required' 
                  : 'Upgrade Your Plan'
                }
              </h4>
              <p className={`text-sm mb-4 ${usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded 
                ? 'text-red-800' 
                : 'text-gray-700'
              }`}>
                {usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded
                  ? 'Your usage has exceeded plan limits. Upgrade immediately to restore full functionality and avoid service restrictions.'
                  : 'You\'re approaching your usage limits. Upgrade now to unlock more capacity and features.'
                }
              </p>
              <a
                href="/settings/billing"
                className={`inline-flex items-center gap-2 px-6 py-3 ${
                  usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                } text-white rounded-xl transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
              >
                <FaArrowUp className="w-4 h-4" />
                {usersUsage.isExceeded || productsUsage.isExceeded || salesUsage.isExceeded 
                  ? 'Upgrade Now' 
                  : 'Upgrade Plan'
                }
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 