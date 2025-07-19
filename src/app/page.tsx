
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-2xl w-full bg-white/90 rounded-2xl shadow-xl p-10 flex flex-col items-center">
        <h1 className="text-4xl font-extrabold text-blue-700 mb-2 text-center">Welcome to SaaS POS</h1>
        <p className="text-gray-600 text-lg mb-8 text-center">
          Your all-in-one Point of Sale and business management platform. Easily manage products, inventory, sales, and reports—all in one place.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          <a href="/products" className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl shadow p-6 flex flex-col items-center hover:shadow-lg transition">
            <span className="text-2xl font-bold text-blue-700 mb-2">Products</span>
            <span className="text-gray-500 text-sm text-center">Manage your product catalog</span>
          </a>
          <a href="/sales" className="bg-gradient-to-r from-purple-100 to-purple-200 rounded-xl shadow p-6 flex flex-col items-center hover:shadow-lg transition">
            <span className="text-2xl font-bold text-purple-700 mb-2">Sales/POS</span>
            <span className="text-gray-500 text-sm text-center">Process sales and print receipts</span>
          </a>
          <a href="/reports" className="bg-gradient-to-r from-pink-100 to-pink-200 rounded-xl shadow p-6 flex flex-col items-center hover:shadow-lg transition">
            <span className="text-2xl font-bold text-pink-700 mb-2">Reports</span>
            <span className="text-gray-500 text-sm text-center">View business analytics</span>
          </a>
        </div>
        <div className="mt-10 text-xs text-gray-400 text-center">&copy; {new Date().getFullYear()} SaaS POS. All rights reserved.</div>
      </div>
    </div>
  );
}
