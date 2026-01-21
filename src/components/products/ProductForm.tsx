import { FaTimes } from 'react-icons/fa';
import FeatureGuard from '@/components/FeatureGuard';
import { ProductsPageProps } from './types';

interface ProductFormProps {
  showAddForm: ProductsPageProps['showAddForm'];
  editProduct: ProductsPageProps['editProduct'];
  saving: ProductsPageProps['saving'];
  error: ProductsPageProps['error'];
  setShowAddForm: ProductsPageProps['setShowAddForm'];
  setEditProduct: ProductsPageProps['setEditProduct'];
  handleAddProduct: ProductsPageProps['handleAddProduct'];
  handleEditProduct: ProductsPageProps['handleEditProduct'];
}

export default function ProductForm({
  showAddForm,
  editProduct,
  saving,
  error,
  setShowAddForm,
  setEditProduct,
  handleAddProduct,
  handleEditProduct,
}: ProductFormProps) {
  if (!showAddForm) return null;

  return (
    <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {editProduct ? 'Edit Product' : 'Add New Product'}
        </h2>
        <button
          onClick={() => {
            setShowAddForm(false);
            setEditProduct(null);
          }}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
        >
          <FaTimes className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={editProduct ? handleEditProduct : handleAddProduct} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              defaultValue={editProduct?.name || ''}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input
              type="text"
              name="sku"
              defaultValue={editProduct?.sku || ''}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
            <input
              type="number"
              name="price"
              step="0.01"
              min="0"
              defaultValue={editProduct?.price || ''}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buying Price</label>
            <input
              type="number"
              name="cost"
              step="0.01"
              min="0"
              defaultValue={editProduct?.cost || ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
            <input
              type="number"
              name="stock"
              min="0"
              defaultValue={editProduct?.stock || ''}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            defaultValue={editProduct?.description || ''}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Custom Fields Section - Only for Pro+ */}
        <FeatureGuard requiredFeature="custom_fields" fallback={
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FaTimes className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Custom Fields</span>
            </div>
            <p className="text-xs text-gray-500">
              Add custom fields to your products with Pro plan or higher.
            </p>
          </div>
        }>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Fields</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Field name (e.g., Brand, Category)"
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Field value"
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </FeatureGuard>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                {editProduct ? 'Update Product' : 'Create Product'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setEditProduct(null);
            }}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
