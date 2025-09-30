import { FaExclamationTriangle } from 'react-icons/fa';

interface ProductLimits {
  usage: {
    products: {
      current: number;
      limit: number;
    };
  };
}

interface UsageWarningProps {
  isNearLimit: boolean;
  usagePercentage: number;
  limits: ProductLimits;
}
// ...existing code...
export default function UsageWarning({ isNearLimit, limits }: UsageWarningProps) {
  if (!isNearLimit) return null;

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-3">
        <FaExclamationTriangle className="text-amber-600 w-5 h-5" />
        <div>
          <h4 className="font-medium text-amber-800">Approaching Product Limit</h4>
          <p className="text-sm text-amber-700">
            You&apos;ve used {limits?.usage.products.current} of {limits?.usage.products.limit} products.
            Consider upgrading to add more products.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <a
          href="/settings/billing"
          className="inline-flex items-center px-3 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 transition-colors"
        >
          Upgrade Plan
        </a>
      </div>
    </div>
  );
}
