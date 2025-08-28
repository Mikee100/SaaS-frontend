import { useState, useEffect } from 'react';


interface StripeConfig {
  id: string;
  publishableKey: string;
  isLiveMode: boolean;
  updatedAt: string;
  createdByUser?: {
    name: string | null;
    email: string | null;
  };
}

export function useStripeConfig() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stripe-config');
      
      if (!response.ok) {
        throw new Error('Failed to fetch Stripe configuration');
      }
      
      const data = await response.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Stripe config:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch configuration');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (publishableKey: string, secretKey: string, webhookSecret: string, isLiveMode: boolean) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stripe-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publishableKey,
          secretKey,
          webhookSecret,
          isLiveMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update Stripe configuration');
      }

      const data = await response.json();
      setConfig(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Error updating Stripe config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.isSuperadmin) {
      fetchConfig();
    } else {
      setLoading(false);
    }
  }, [session]);

  return {
    config,
    loading,
    error,
    refresh: fetchConfig,
    updateConfig,
  };
}
