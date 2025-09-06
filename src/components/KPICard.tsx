"use client";

import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  chartData?: number[];
  loading?: boolean;
}

export default function KPICard({ 
  title, 
  value, 
  change, 
  icon, 
  chartData = [],
  loading = false 
}: KPICardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  const trendColor = isNeutral 
    ? 'text-gray-500' 
    : isPositive 
      ? 'text-green-600' 
      : 'text-red-600';
      
  const bgColor = isNeutral 
    ? 'bg-gray-50' 
    : isPositive 
      ? 'bg-green-50' 
      : 'bg-red-50';

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-5 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="flex items-center">
          <div className="h-4 w-4 bg-gray-200 rounded-full mr-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-semibold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          {icon}
        </div>
      </div>
      
      <div className={`mt-4 flex items-center text-sm ${trendColor}`}>
        {isNeutral ? (
          <FiMinus className="mr-1" />
        ) : isPositive ? (
          <FiTrendingUp className="mr-1" />
        ) : (
          <FiTrendingDown className="mr-1" />
        )}
        <span>
          {Math.abs(change)}% {isNeutral ? 'no change' : isPositive ? 'increase' : 'decrease'} from last period
        </span>
      </div>
      
      {chartData.length > 0 && (
        <div className="mt-3 h-12 w-full">
          <div className="h-full flex items-end gap-px">
            {chartData.map((value, index) => (
              <div 
                key={index}
                className={`flex-1 ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}
                style={{ height: `${Math.min(100, Math.max(10, value))}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
