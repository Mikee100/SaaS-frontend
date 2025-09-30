import { FaEye, FaChevronDown } from 'react-icons/fa';
import { ProductsPageProps } from './types';

interface ProductsDisplayHeaderProps {
  filteredProducts: ProductsPageProps['filteredProducts'];
  selectedBranchId: ProductsPageProps['selectedBranchId'];
  branches: ProductsPageProps['branches'];
  viewMode: ProductsPageProps['viewMode'];
  showColumnSelector: ProductsPageProps['showColumnSelector'];
  visibleColumns: ProductsPageProps['visibleColumns'];
  allColumns: ProductsPageProps['allColumns'];
  setShowColumnSelector: ProductsPageProps['setShowColumnSelector'];
  toggleColumnVisibility: ProductsPageProps['toggleColumnVisibility'];
}

export default function ProductsDisplayHeader({
  filteredProducts,
  selectedBranchId,
  branches,
  viewMode,
  showColumnSelector,
  visibleColumns,
  allColumns,
  setShowColumnSelector,
  toggleColumnVisibility,
}: ProductsDisplayHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">
          {filteredProducts.length} Product{filteredProducts.length !== 1 ? 's' : ''}
        </h3>
        <p className="text-sm text-gray-500">
          {selectedBranchId ? `Showing products for ${branches.find(b => b.id === selectedBranchId)?.name}` : 'Select a branch to view products'}
        </p>
      </div>

      {viewMode === 'table' && (
        <div className="relative">
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <FaEye className="w-4 h-4" />
            Columns
            <FaChevronDown className="w-3 h-3" />
          </button>

          {showColumnSelector && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <div className="p-3 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-800">Visible Columns</h4>
              </div>
              <div className="p-2 max-h-60 overflow-y-auto">
                {allColumns.map(column => (
                  <label key={column} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column)}
                      onChange={() => toggleColumnVisibility(column)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {column.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
