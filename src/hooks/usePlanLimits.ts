"use client";
import { useState } from 'react';

export function usePlanLimits() {
	const [limits] = useState({
		currentPlan: 'Basic',
		usage: {
			users: { current: 1, limit: 1 },
			products: { current: 0, limit: 10 },
			sales: { current: 0, limit: 100 }
		},
		features: {
			analytics: false,
			advanced_reports: false,
			custom_branding: false,
			api_access: false,
			bulk_operations: true,
			data_export: false,
			custom_fields: false
		}
	});

	return {
		limits,
		loading: false,
		error: null,
		hasFeature: () => false,
		canCreate: () => true,
		getUsagePercentage: () => 0,
		isPlanAtLeast: (plan: 'Basic' | 'Pro' | 'Enterprise') => plan === 'Basic',
	};
}
