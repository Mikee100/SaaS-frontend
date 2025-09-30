import { FaPlus, FaBox, FaLayerGroup, FaSortAmountDown } from 'react-icons/fa';
import PlanGuard from '@/components/PlanGuard';
import Tooltip from '@/components/Tooltip';
import { ProductsPageProps } from './types';

interface ProductsHeaderProps {
  branches: ProductsPageProps['branches'];
  branchesLoading: ProductsPageProps['branchesLoading'];
  selectedBranchId: ProductsPageProps['selectedBranchId'];
  canChangeBranch: ProductsPageProps['canChangeBranch'];
  viewMode: ProductsPageProps['viewMode'];
  canCreateProducts: ProductsPageProps['canCreateProducts'];
  canCreate: ProductsPageProps['canCreate'];
  handleBranchChange: ProductsPageProps['handleBranchChange'];
  setViewMode: ProductsPageProps['setViewMode'];
  setShowAddForm: ProductsPageProps['setShowAddForm'];
}

export default function ProductsHeader({
  branches,
  branchesLoading,
  selectedBranchId,
  canChangeBranch,
  viewMode,
  canCreateProducts,
  canCreate,
  handleBranchChange,
  setViewMode,
  setShowAddForm,
}: ProductsHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <FaBox className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600">Manage your product catalog</p>
          </div>
        </div>

        {/* Branch Selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
          {branchesLoading ? (
            <div className="text-gray-500 text-sm">Loading branches...</div>
          ) : (
            <div className="flex items-center gap-3">
              <select
                value={selectedBranchId || ''}
                onChange={e => handleBranchChange(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                style={{ minWidth: 200 }}
                disabled={!canChangeBranch}
              >
                <option value="" disabled>Select a branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FaBox className="w-4 h-4" />
                <span>{branches.find(b => b.id === selectedBranchId)?.name || 'No branch selected'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <PlanGuard requiredPlan="Basic" fallback={
        <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">Product management requires Basic plan or higher</p>
        </div>
      }>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            {viewMode === 'grid' ? (
              <>
                <FaSortAmountDown className="w-4 h-4" />
                Table View
              </>
            ) : (
              <>
                <FaLayerGroup className="w-4 h-4" />
                Grid View
              </>
            )}
          </button>
          {canCreateProducts ? (
            <button
              onClick={() => setShowAddForm(true)}
              disabled={!canCreate()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                canCreate()
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaPlus className="w-4 h-4" />
              Add Product
            </button>
          ) : (
            <Tooltip content="You don't have permission to create products. Contact your administrator.">
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
              >
                <FaPlus className="w-4 h-4" />
                Add Product
              </button>
            </Tooltip>
          )}
        </div>
      </PlanGuard>
    </div>
  );
}
