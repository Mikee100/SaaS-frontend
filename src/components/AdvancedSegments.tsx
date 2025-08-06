"use client";
import { FaMapMarkerAlt, FaUsers, FaMobile, FaDesktop, FaTablet, FaChartPie } from 'react-icons/fa';

interface AdvancedSegmentsProps {
  segments: {
    byLocation?: Array<{ location: string; revenue: number; customers: number }>;
    byAge?: Array<{ age: string; revenue: number; customers: number }>;
    byDevice?: Array<{ device: string; revenue: number; customers: number }>;
  };
}

export default function AdvancedSegments({ segments }: AdvancedSegmentsProps) {
  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <FaMobile className="w-4 h-4" />;
      case 'desktop': return <FaDesktop className="w-4 h-4" />;
      case 'tablet': return <FaTablet className="w-4 h-4" />;
      default: return <FaDesktop className="w-4 h-4" />;
    }
  };

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
        <h2 className="text-lg font-semibold text-gray-800">Advanced Customer Segments</h2>
        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Enterprise</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Location */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaMapMarkerAlt className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-800">By Location</h3>
          </div>
          <div className="space-y-3">
            {segments.byLocation?.map((location, index) => (
              <div key={index} className={`p-3 ${getSegmentBgColor(index)} rounded-lg border`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{location.location}</span>
                  <span className={`text-xs font-medium ${getSegmentColor(index)}`}>
                    {location.customers} customers
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  ${location.revenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  Revenue
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Age */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaUsers className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-800">By Age Group</h3>
          </div>
          <div className="space-y-3">
            {segments.byAge?.map((age, index) => (
              <div key={index} className={`p-3 ${getSegmentBgColor(index)} rounded-lg border`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{age.age}</span>
                  <span className={`text-xs font-medium ${getSegmentColor(index)}`}>
                    {age.customers} customers
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  ${age.revenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  Revenue
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Device */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaMobile className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-800">By Device</h3>
          </div>
          <div className="space-y-3">
            {segments.byDevice?.map((device, index) => (
              <div key={index} className={`p-3 ${getSegmentBgColor(index)} rounded-lg border`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device.device)}
                    <span className="text-sm font-medium text-gray-700">{device.device}</span>
                  </div>
                  <span className={`text-xs font-medium ${getSegmentColor(index)}`}>
                    {device.customers} customers
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  ${device.revenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  Revenue
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Segment Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Locations: </span>
            <span className="font-medium">{segments.byLocation?.length || 0}</span>
          </div>
          <div>
            <span className="text-gray-600">Age Groups: </span>
            <span className="font-medium">{segments.byAge?.length || 0}</span>
          </div>
          <div>
            <span className="text-gray-600">Device Types: </span>
            <span className="font-medium">{segments.byDevice?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 