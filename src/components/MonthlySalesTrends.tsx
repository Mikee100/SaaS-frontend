import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMonthlySalesTrends } from '@/hooks/useMonthlySalesTrends';
import { formatCurrency } from '@/utils/format';

const MonthlySalesTrends: React.FC = () => {
  const { data: monthlyTrends, error } = useMonthlySalesTrends();

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-red-600">Error loading monthly sales trends: {error}</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals for the summary
  const totals = monthlyTrends.reduce((acc, trend) => ({
    totalSales: acc.totalSales + trend.totalSales,
    totalOrders: acc.totalOrders + trend.totalOrders,
    avgOrderValue: acc.avgOrderValue + trend.averageOrderValue
  }), { totalSales: 0, totalOrders: 0, avgOrderValue: 0 });

  const avgOrderValue = monthlyTrends.length > 0
    ? totals.avgOrderValue / monthlyTrends.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Sales Trends</CardTitle>
        <p className="text-sm text-muted-foreground">Historical sales data by month</p>
      </CardHeader>
      <CardContent>
        {monthlyTrends.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Sales</div>
                <div className="text-2xl font-bold">{formatCurrency(totals.totalSales)}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Orders</div>
                <div className="text-2xl font-bold">{totals.totalOrders.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Avg. Order Value</div>
                <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Month</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Total Sales</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Total Orders</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Avg. Order Value</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTrends.map((trend, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2">
                        {trend.monthName} {trend.year}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 font-mono">
                        {formatCurrency(trend.totalSales)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 font-mono">
                        {trend.totalOrders.toLocaleString()}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 font-mono">
                        {formatCurrency(trend.averageOrderValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-gray-500">No monthly sales data available</div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlySalesTrends;
