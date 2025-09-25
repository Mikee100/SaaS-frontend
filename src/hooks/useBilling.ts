import { useState, useEffect } from 'react';

// Basic Billing hook stub to prevent build errors
export function useBilling() {
	const [billingData, setBillingData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error] = useState(null);

	useEffect(() => {
		// Simulate loading billing data
		setLoading(true);
		setTimeout(() => {
			setBillingData({ plans: [], subscription: null, invoices: [] });
			setLoading(false);
		}, 500);
	}, []);

	return {
		billingData,
		loading,
		error,
		fetchBillingData: async () => {},
		createCheckoutSession: async () => null,
		createPortalSession: async () => null,
		cancelSubscription: async () => false,
	};
}
