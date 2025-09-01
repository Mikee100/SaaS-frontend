import { FaCrown, FaLock, FaArrowUp } from 'react-icons/fa';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface BillingFeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  requiredPlan: 'Basic' | 'Pro' | 'Enterprise';
  currentPlan?: string;
  onUpgrade?: () => void;
  children?: React.ReactNode;
}

export default function BillingFeatureCard({
  title,
  description,
  icon,
  requiredPlan,
  currentPlan,
  onUpgrade,
  children
}: BillingFeatureCardProps) {
  const { limits } = usePlanLimits();
  
  const planOrder = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
  const currentPlanLevel = planOrder[currentPlan as keyof typeof planOrder] || 0;
  const requiredPlanLevel = planOrder[requiredPlan];
  const hasAccess = currentPlanLevel >= requiredPlanLevel;

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-gray-400">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {requiredPlan === 'Enterprise' && <FaCrown className="h-4 w-4 text-yellow-500" />}
            <FaLock className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-3">
            This feature requires the {requiredPlan} plan or higher.
          </p>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              <FaArrowUp className="h-3 w-3" />
              Upgrade to {requiredPlan}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-indigo-600">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      
      {children}
    </div>
  );
} 