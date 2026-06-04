import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface Branch {
  id: string;
  name: string;
}

interface BranchSalesData {
  [branchId: string]: Record<string, number>;
}

interface BranchComparisonGraphProps {
  branches: Branch[];
  branchSalesByPeriod: BranchSalesData;
  periodType: "day" | "week" | "month" | "year";
}

const COLORS = [
  "#2563eb", "#059669", "#f59e42", "#e11d48", "#a21caf", "#0ea5e9", "#f43f5e", "#facc15", "#10b981", "#6366f1"
];

export default function BranchComparisonGraph({ branches, branchSalesByPeriod, periodType }: BranchComparisonGraphProps) {
  // Get all periods in the data
  const allPeriods = useMemo(() => {
    const periods = new Set<string>();
    Object.values(branchSalesByPeriod).forEach((sales) => {
      Object.keys(sales).forEach((period) => periods.add(period));
    });
    return Array.from(periods).sort();
  }, [branchSalesByPeriod]);

  // Prepare chart data: [{ period, branch1: value, branch2: value, ... }]
  const chartData = useMemo(() => {
    return allPeriods.map((period) => {
      const row: Record<string, any> = { period };
      branches.forEach((branch) => {
        row[branch.id] = branchSalesByPeriod[branch.id]?.[period] || 0;
      });
      return row;
    });
  }, [allPeriods, branches, branchSalesByPeriod]);

  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">Branch Revenue Trend ({periodType.charAt(0).toUpperCase() + periodType.slice(1)})</h2>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 10, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#6b7280" }} minTickGap={18} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Tooltip formatter={(value) => [`KES ${Number(value ?? 0).toLocaleString()}`, "Revenue"]} />
            <Legend />
            {branches.map((branch, idx) => (
              <Line
                key={branch.id}
                type="monotone"
                dataKey={branch.id}
                name={branch.name}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2.2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
