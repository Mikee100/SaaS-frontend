"use client";
import { FaMapMarkerAlt, FaChartPie } from 'react-icons/fa';

interface AdvancedSegmentsProps {
  segments: {
    byLocation?: Array<{ location: string; revenue: number; customers: number }>;
  };
}

export default function AdvancedSegments({ segments }: AdvancedSegmentsProps) {
  const getSegmentColor = (index: number) => {
    const colors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-red-600'];
    return colors[index % colors.length];
  };

  const getSegmentBgColor = (index: number) => {
    const colors = ['bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-orange-50', 'bg-red-50'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <FaChartPie className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Revenue by Location</h2>
      </div>

      {segments.byLocation && segments.byLocation.length > 0 ? (
        <>
          <div className="space-y-3">
            {segments.byLocation.map((location, index) => (
              <div key={index} className={`p-3 ${getSegmentBgColor(index)} rounded-lg border`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">{location.location}</span>
                  </div>
                  <span className={`text-xs font-medium ${getSegmentColor(index)}`}>
                    {location.customers} customers
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  Ksh {location.revenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  Revenue
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Total Locations: </span>
            <span className="text-sm font-medium">{segments.byLocation.length}</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">Not enough branch sales data yet to break down revenue by location.</p>
      )}
    </div>
  );
}
