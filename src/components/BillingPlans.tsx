import React from 'react';

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  isCurrent?: boolean;
}

interface BillingPlansProps {
  plans: BillingPlan[];
  currentPlanId?: string;
  onUpgrade?: (planId: string) => void;
}

const BillingPlans: React.FC<BillingPlansProps> = ({ plans, onUpgrade }) => {
  return (
    <div className="space-y-8">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Available Plans</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`border rounded-xl shadow-sm p-6 bg-white flex flex-col justify-between ${plan.isCurrent ? 'border-blue-600' : 'border-gray-200'}`}>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">{plan.name}</h4>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {plan.price === 0 ? 'Free' : `${plan.price} ${plan.currency.toUpperCase()}/mo`}
              </p>
              <ul className="list-disc pl-5 text-gray-700 mb-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
            {plan.isCurrent ? (
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium mt-4">Current Plan</span>
            ) : (
              <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                onClick={() => onUpgrade && onUpgrade(plan.id)}
              >
                Upgrade to {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillingPlans;
