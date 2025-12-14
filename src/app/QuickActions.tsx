"use client";

import { FiPlusCircle, FiUserPlus, FiFileText, FiShoppingCart, FiPackage, FiTag } from "react-icons/fi";
import { useRouter } from "next/navigation";

export default function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: "New Sale",
      icon: <FiShoppingCart className="h-5 w-5" />,
      onClick: () => router.push("/sales/new"),
      color: "bg-blue-100 text-blue-600 hover:bg-blue-200"
    },
    {
      label: "Add Product",
      icon: <FiPlusCircle className="h-5 w-5" />,
      onClick: () => router.push("/inventory/new"),
      color: "bg-green-100 text-green-600 hover:bg-green-200"
    },
    {
      label: "New Invoice",
      icon: <FiFileText className="h-5 w-5" />,
      onClick: () => router.push("/invoices/new"),
      color: "bg-purple-100 text-purple-600 hover:bg-purple-200"
    },
    {
      label: "Add Customer",
      icon: <FiUserPlus className="h-5 w-5" />,
      onClick: () => router.push("/customers/new"),
      color: "bg-amber-100 text-amber-600 hover:bg-amber-200"
    },
    {
      label: "Manage Inventory",
      icon: <FiPackage className="h-5 w-5" />,
      onClick: () => router.push("/products/unified"),
      color: "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
    },
    {
      label: "Create Discount",
      icon: <FiTag className="h-5 w-5" />,
      onClick: () => router.push("/discounts/new"),
      color: "bg-rose-100 text-rose-600 hover:bg-rose-200"
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 hover:shadow-md ${action.color} hover:scale-105`}
          >
            <div className="p-3 rounded-full bg-white/50 mb-2">
              {action.icon}
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
