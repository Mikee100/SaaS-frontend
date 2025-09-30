import { FaSearch, FaLayerGroup, FaDownload, FaUpload, FaTrash } from 'react-icons/fa';
import { ProductsPageProps } from './types';

interface ProductsSearchAndActionsProps {
  search: ProductsPageProps['search'];
  showFilters: ProductsPageProps['showFilters'];
  priceMin: ProductsPageProps['priceMin'];
  priceMax: ProductsPageProps['priceMax'];
  stockMin: ProductsPageProps['stockMin'];
  stockMax: ProductsPageProps['stockMax'];
  categoryFilter: ProductsPageProps['categoryFilter'];
  uploading: ProductsPageProps['uploading'];
  uploadResult: ProductsPageProps['uploadResult'];
  uploadError: ProductsPageProps['uploadError'];
  clearMsg: ProductsPageProps['clearMsg'];
  uploadProgress: ProductsPageProps['uploadProgress'];
  filteredProducts: ProductsPageProps['filteredProducts'];
  products: ProductsPageProps['products'];
  setSearch: ProductsPageProps['setSearch'];
  setShowFilters: ProductsPageProps['setShowFilters'];
  setPriceMin: ProductsPageProps['setPriceMin'];
  setPriceMax: ProductsPageProps['setPriceMax'];
  setStockMin: ProductsPageProps['setStockMin'];
  setStockMax: ProductsPageProps['setStockMax'];
  setCategoryFilter: ProductsPageProps['setCategoryFilter'];
  handleBulkUpload: ProductsPageProps['handleBulkUpload'];
  downloadTemplate: ProductsPageProps['downloadTemplate'];
  handleClearAll: ProductsPageProps['handleClearAll'];
}

export default function ProductsSearchAndActions({
  search,
  showFilters,
  priceMin,
  priceMax,
  stockMin,
  stockMax,
  categoryFilter,
  uploading,
  uploadResult,
  uploadError,
  clearMsg,
  uploadProgress,
  filteredProducts,
  products,
  setSearch,
  setShowFilters,
  setPriceMin,
  setPriceMax,
  setStockMin,
  setStockMax,
  setCategoryFilter,
  handleBulkUpload,
  downloadTemplate,
  handleClearAll,
}: ProductsSearchAndActionsProps) {
  return (
    <div className="mb-6 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or description..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <FaLayerGroup className="w-4 h-4" />
            Filters
          </button>

          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 font-medium text-sm transition">
            <FaDownload className="w-4 h-4" />
            Template
          </button>

          <form onSubmit={handleBulkUpload} className="flex items-center gap-2">
            <input
              type="file"
              name="file"
              accept=".xlsx,.xls,.csv"
              className="text-xs border border-gray-300 rounded p-1"
            />
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-100 border border-blue-200 hover:bg-blue-200 font-medium text-sm text-blue-700 transition disabled:opacity-50"
            >
              <FaUpload className="w-4 h-4" />
              Bulk Upload
            </button>
          </form>

          <button onClick={handleClearAll} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 font-medium text-sm text-red-700 transition">
            <FaTrash className="w-3 h-3" />
            Clear All
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
              <input
                type="number"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
              <input
                type="number"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder="999.99"
                step="0.01"
                min="0"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
              <input
                type="number"
                value={stockMin}
                onChange={e => setStockMin(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
              <input
                type="number"
                value={stockMax}
                onChange={e => setStockMax(e.target.value)}
                placeholder="1000"
                min="0"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              placeholder="Filter by category..."
              className="w-full max-w-md px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setPriceMin('');
                setPriceMax('');
                setStockMin('');
                setStockMax('');
                setCategoryFilter('');
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
            >
              Clear Filters
            </button>
            <span className="text-sm text-gray-500 self-center">
              {filteredProducts.length} of {products.length} products match filters
            </span>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress !== null && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">Upload completed: {uploadResult.length} products processed</p>
        </div>
      )}

      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{uploadError}</p>
        </div>
      )}

      {clearMsg && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{clearMsg}</p>
        </div>
      )}
    </div>
  );
}
