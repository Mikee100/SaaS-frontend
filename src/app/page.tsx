"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import UsageDashboard from "@/components/UsageDashboard";
import PlanGuard from "@/components/PlanGuard";
import { FaChartLine, FaBox, FaShoppingCart, FaUsers, FaCrown, FaStar } from 'react-icons/fa';

interface DashboardStats {
  totalSales: number;
  totalProducts: number;
  totalCustomers: number;
  monthlyRevenue: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/sales/stats")
      .then((data: any) => setStats(data))
      .catch(() => setStats({
        totalSales: 0,
        totalProducts: 0,
        totalCustomers: 0,
        monthlyRevenue: 0
      }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <FaShoppingCart className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">Total Sales</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalSales || 0}</p>
              <p className="text-sm text-green-600">+12% from last month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <FaBox className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-800">Products</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
              <p className="text-sm text-green-600">+5% from last month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <FaUsers className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-800">Customers</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalCustomers || 0}</p>
              <p className="text-sm text-green-600">+8% from last month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <FaChartLine className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-800">Revenue</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">${stats?.monthlyRevenue?.toLocaleString() || 0}</p>
              <p className="text-sm text-green-600">+15% from last month</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/sales')}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaShoppingCart className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-700">New Sale</span>
              </button>

              <PlanGuard requiredPlan="Basic" showUpgradePrompt={false}>
                <button
                  onClick={() => router.push('/products')}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaBox className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Add Product</span>
                </button>
              </PlanGuard>

              <PlanGuard requiredPlan="Basic" showUpgradePrompt={false}>
                <button
                  onClick={() => router.push('/inventory')}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaBox className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-gray-700">Manage Inventory</span>
                </button>
              </PlanGuard>

              <PlanGuard requiredPlan="Pro" showUpgradePrompt={false}>
                <button
                  onClick={() => router.push('/analytics')}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaChartLine className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-700">View Analytics</span>
                </button>
              </PlanGuard>

              <PlanGuard requiredPlan="Enterprise" showUpgradePrompt={false}>
                <button
                  onClick={() => router.push('/reports')}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaCrown className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-gray-700">Advanced Reports</span>
                </button>
              </PlanGuard>

              <button
                onClick={() => router.push('/settings')}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaUsers className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Settings</span>
              </button>
            </div>
          </div>

          {/* Plan Features Showcase */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Plan Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <FaStar className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-gray-800">Basic Plan</h3>
                </div>
                <p className="text-sm text-gray-600">Essential features for small businesses</p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                  <li>• Up to 10 products</li>
                  <li>• Basic sales tracking</li>
                  <li>• 1 user</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <FaStar className="w-4 h-4 text-purple-600" />
                  <h3 className="font-medium text-gray-800">Pro Plan</h3>
                </div>
                <p className="text-sm text-gray-600">Advanced features for growing businesses</p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                  <li>• Up to 100 products</li>
                  <li>• Advanced analytics</li>
                  <li>• Up to 5 users</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <FaCrown className="w-4 h-4 text-yellow-600" />
                  <h3 className="font-medium text-gray-800">Enterprise</h3>
                </div>
                <p className="text-sm text-gray-600">Full features for large organizations</p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                  <li>• Unlimited products</li>
                  <li>• Custom branding</li>
                  <li>• Unlimited users</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <UsageDashboard />
          
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-800">New sale completed</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Product added</p>
                  <p className="text-xs text-gray-500">15 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Inventory updated</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
