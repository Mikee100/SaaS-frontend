"use client";
import { useEffect, useState } from 'react';
import { FaUsers, FaChartPie, FaUserFriends, FaUserClock, FaUserCheck, FaUserShield } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


interface Segment {
  name: string;
  value: number;
  count: number;
  color: string;
  icon: React.ReactNode;
}

export default function CustomerSegmentation() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // TODO: Replace with actual API call
    const fetchSegments = async () => {
      try {
        // Mock data - replace with actual API call
        const mockSegments: Segment[] = [
          { name: 'Champions', value: 15, count: 45, color: 'bg-emerald-500', icon: <FaUserCheck className="text-emerald-500" /> },
          { name: 'Loyal', value: 22, count: 66, color: 'bg-blue-500', icon: <FaUserFriends className="text-blue-500" /> },
          { name: 'Potential', value: 30, count: 90, color: 'bg-amber-400', icon: <FaUserClock className="text-amber-400" /> },
          { name: 'At Risk', value: 18, count: 54, color: 'bg-rose-500', icon: <FaUserShield className="text-rose-500" /> },
          { name: 'Lost', value: 15, count: 45, color: 'bg-gray-400', icon: <FaUsers className="text-gray-400" /> },
        ];
        
        setSegments(mockSegments);
      } catch (error) {
        console.error('Error fetching customer segments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
  }, []);

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Customer Segmentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-1">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-8"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Customer Segmentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Customer Segmentation</CardTitle>
          <div className="p-2 rounded-full bg-primary/10">
            <FaChartPie className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {segments.map((segment) => (
            <div key={segment.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-md bg-opacity-10">
                    {segment.icon}
                  </div>
                  <span className="font-medium text-gray-700">{segment.name}</span>
                </div>
                <span className="text-gray-500">{segment.value}%</span>
              </div>
              <div className="relative pt-1">
                <div className="flex h-2 overflow-hidden text-xs rounded bg-gray-100">
                  <div
                    style={{ width: `${segment.value}%` }}
                    className={`flex flex-col justify-center text-center text-white shadow-none whitespace-nowrap ${segment.color}`}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">{segment.count} customers</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
