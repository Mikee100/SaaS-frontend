import Link from 'next/link';
import { FaChartBar } from 'react-icons/fa';

export default function ProductsAnalyticsNav() {
  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-blue-800">Product Management</h2>
        <Link
          href="/products/analytics"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaChartBar className="w-4 h-4" />
          View Analytics
        </Link>
      </div>
    </div>
  );
}
