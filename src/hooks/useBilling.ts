import { useState, useCallback } from 'react';
import { apiPost, apiGet } from '@/utils/api';

interface BillingData {
  plans: any[];
  subscription: any;
  invoices: any[];
}

interface UseBillingReturn {
  billingData: BillingData | null;
  loading: boolean;
  error: string | null;
  loadingCheckout: boolean;
  loadingPortal: boolean;
  fetchBillingData: () => Promise<void>;
  createCheckoutSession: (priceId: string) => Promise<string | null>;
  createPortalSession: () => Promise<string | null>;
  cancelSubscription: () => Promise<boolean>;
}

export function useBilling(): UseBillingReturn {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [plans, subscription, invoices] = await Promise.all([
        apiGet('/billing/plans'),
        apiGet('/billing/subscription'),
        apiGet('/billing/invoices'),
      ]);

      setBillingData({ plans, subscription, invoices });
    } catch (err: any) {
      setError(err.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCheckoutSession = useCallback(async (priceId: string): Promise<string | null> => {
    try {
      setLoadingCheckout(true);
      setError(null);

      const response = await apiPost('/billing/create-checkout-session', {
        priceId,
        successUrl: `${window.location.origin}/settings/billing?success=true`,
        cancelUrl: `${window.location.origin}/settings/billing?canceled=true`,
      });

      return response.url || null;
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout session');
      return null;
    } finally {
      setLoadingCheckout(false);
    }
  }, []);

  const createPortalSession = useCallback(async (): Promise<string | null> => {
    try {
      setLoadingPortal(true);
      setError(null);

      const response = await apiPost('/billing/create-portal-session', {
        returnUrl: `${window.location.origin}/settings/billing`,
      });

      return response.url || null;
    } catch (err: any) {
      setError(err.message || 'Failed to create portal session');
      return null;
    } finally {
      setLoadingPortal(false);
    }
  }, []);

  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      await apiPost('/billing/cancel-subscription');
      await fetchBillingData(); // Refresh data
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
      return false;
    }
  }, [fetchBillingData]);

  return {
    billingData,
    loading,
    error,
    loadingCheckout,
    loadingPortal,
    fetchBillingData,
    createCheckoutSession,
    createPortalSession,
    cancelSubscription,
  };
} 