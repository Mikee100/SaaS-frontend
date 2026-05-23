import { useMemo } from "react";

interface Branch {
  id: string;
  name: string;
}

interface BranchSalesData {
  [branchId: string]: Record<string, number>;
}

interface BranchComparisonProps {
  branches: Branch[];
  branchSalesByMonth: BranchSalesData;
}

const compactAmount = (amount: number) => {
  const absolute = Math.abs(amount);
  if (absolute >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
};

export default function RevenueBranchComparison({ branches, branchSalesByMonth }: BranchComparisonProps) {
  // Get all months in the data
  const allMonths = useMemo(() => {
    const months = new Set<string>();
    Object.values(branchSalesByMonth).forEach((sales) => {
      Object.keys(sales).forEach((month) => months.add(month));
    });
    return Array.from(months).sort();
  }, [branchSalesByMonth]);

  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">Branch Revenue Comparison</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="py-1.5 pr-2 font-medium">Branch</th>
              {allMonths.map((month) => (
                <th key={month} className="py-1.5 pr-2 font-medium">{month}</th>
              ))}
              <th className="py-1.5 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => {
              const sales = branchSalesByMonth[branch.id] || {};
              const total = Object.values(sales).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
              return (
                <tr key={branch.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-1.5 pr-2 text-gray-800">{branch.name}</td>
                  {allMonths.map((month) => (
                    <td key={month} className="py-1.5 pr-2 text-gray-900">KES {compactAmount(sales[month] || 0)}</td>
                  ))}
                  <td className="py-1.5 font-medium text-gray-900">KES {compactAmount(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
