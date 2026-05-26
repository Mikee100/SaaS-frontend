import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, ApiError } from '@/utils/api';

// Define types for Plan, Subscription, and Invoice
type Plan = {
	id: string;
	name: string;
	price: number;
	currency: string;
	features: string[];
};

type Subscription = {
	id: string;
	planId: string;
	status: string;
	currentPeriodEnd: string;
};

type Invoice = {
	id: string;
	amount: number;
	status: string;
	createdAt: string;
};

// BillingData type now includes specific types for plans, subscription, and invoices
type BillingData = {
	plans: Plan[];
	subscription: Subscription | null;
	invoices: Invoice[];
} | null;

function isSubscription(obj: unknown): obj is Subscription {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof (obj as Record<string, unknown>).id === 'string' &&
        typeof (obj as Record<string, unknown>).planId === 'string' &&
        typeof (obj as Record<string, unknown>).status === 'string' &&
        typeof (obj as Record<string, unknown>).currentPeriodEnd === 'string'
    );
}

export function useBilling() {
	const [billingData, setBillingData] = useState<BillingData>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchBillingData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [plansResponse, subscriptionResponse, invoicesResponse] = await Promise.all([
				apiGet('/billing/plans'),
				apiGet('/billing/subscription-with-permissions'),
				apiGet('/billing/invoices'),
			]);

			setBillingData({
				plans: Array.isArray(plansResponse) ? plansResponse : [],
				subscription: isSubscription(subscriptionResponse) ? subscriptionResponse : null,
				invoices: Array.isArray(invoicesResponse) ? invoicesResponse : [],
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch billing data');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchBillingData();
	}, [fetchBillingData]);

	const createCheckoutSession = async (planId?: string) => {
		if (!planId) {
			setError('Please select a plan before checkout');
			return null;
		}

		try {
			const origin = typeof window !== 'undefined' ? window.location.origin : '';
			const response = await apiPost<{ url: string }>('/billing/create-checkout-session', {
				planId,
				successUrl: `${origin}/settings/billing/success?session_id={CHECKOUT_SESSION_ID}`,
				cancelUrl: `${origin}/settings/billing/subscription?checkout=cancelled`,
			});
			return response?.url || null;
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				try {
					const fallbackResponse = await apiPost<{ url?: string }>(
						'/billing/create-subscription',
						{ planId },
					);
					return fallbackResponse?.url || null;
				} catch (fallbackErr) {
					setError(
						fallbackErr instanceof Error
							? fallbackErr.message
							: 'Failed to create subscription checkout session',
					);
					return null;
				}
			}

			setError(err instanceof Error ? err.message : 'Failed to create checkout session');
			return null;
		}
	};

	const createPortalSession = async () => {
		try {
			const origin = typeof window !== 'undefined' ? window.location.origin : '';
			const response = await apiPost<{ url: string }>('/billing/create-portal-session', {
				returnUrl: `${origin}/settings/billing/subscription`,
			});
			return response?.url || null;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create portal session');
			return null;
		}
	};

	const cancelSubscription = async () => {
		try {
			await apiPost('/billing/cancel-subscription', {});
			await fetchBillingData(); // Refresh data
			return true;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
			return false;
		}
	};

	return {
		billingData,
		loading,
		error,
		fetchBillingData,
		createCheckoutSession,
		createPortalSession,
		cancelSubscription,
	};
}
