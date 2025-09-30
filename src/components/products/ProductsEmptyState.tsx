import { FaBox } from 'react-icons/fa';
import { ProductsPageProps } from './types';

interface ProductsEmptyStateProps {
  canCreateProducts: ProductsPageProps['canCreateProducts'];
  setShowAddForm: ProductsPageProps['setShowAddForm'];
}

export default function ProductsEmptyState({ canCreateProducts, setShowAddForm }: ProductsEmptyStateProps) {
  return (
    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
      <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
      <p className="text-gray-500 mb-4">Get started by adding your first product.</p>
      {canCreateProducts && (
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Your First Product
        </button>
      )}
    </div>
  );
}
