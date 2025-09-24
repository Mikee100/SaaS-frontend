import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface MonthlySalesTrend {
  year: number;
  month: number;
  monthName: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
}

export const useMonthlySalesTrends = () => {
  const { tenantId } = useAuth();
  const [data, setData] = useState<MonthlySalesTrend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonthlySalesTrends = async () => {
      if (!tenantId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/sales-trends/${tenantId}/monthly`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch monthly sales trends');
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch monthly sales trends');
        }
      } catch (err) {
        console.error('Error fetching monthly sales trends:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlySalesTrends();
  }, [tenantId]);

  return { data, loading, error };
};

export default useMonthlySalesTrends;
