import { FaBox, FaEdit, FaQrcode, FaTrash, FaLock } from 'react-icons/fa';
import Tooltip from '@/components/Tooltip';
import FeatureGuard from '@/components/FeatureGuard';
import { ProductsPageProps } from './types';

interface ProductsGridViewProps {
  currentProducts: ProductsPageProps['currentProducts'];
  canEditProducts: ProductsPageProps['canEditProducts'];
  canDeleteProducts: ProductsPageProps['canDeleteProducts'];
  openEditModal: ProductsPageProps['openEditModal'];
  handleDelete: ProductsPageProps['handleDelete'];
  setQrCodeProductId: ProductsPageProps['setQrCodeProductId'];
}

export default function ProductsGridView({
  currentProducts,
  canEditProducts,
  canDeleteProducts,
  openEditModal,
  handleDelete,
  setQrCodeProductId,
}: ProductsGridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {currentProducts.map((product) => (
        <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaBox className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
                <p className="text-sm text-gray-500">SKU: {product.sku}</p>
              </div>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              product.stock > 10 ? 'bg-green-100 text-green-800' : 
              product.stock > 0 ? 'bg-amber-100 text-amber-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {product.stock} in stock
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Price:</span>
              <span className="font-semibold text-gray-800">${product.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cost:</span>
              <span className="font-semibold text-gray-800">${product.cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Margin:</span>
              <span className={`font-semibold ${product.price > 0 ? (product.price - product.cost) / product.price * 100 >= 20 ? 'text-green-600' : 'text-amber-600' : 'text-gray-800'}`}>
                {product.price > 0 ? `${((product.price - product.cost) / product.price * 100).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            {product.description && (
              <div className="text-sm text-gray-600 line-clamp-2">
                {product.description}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-100">
            {canEditProducts ? (
              <button 
                onClick={() => openEditModal(product)} 
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 text-sm font-medium transition"
              >
                <FaEdit className="w-3 h-3" />
                Edit
              </button>
            ) : (
              <Tooltip content="You don't have permission to edit products. Contact your administrator.">
                <button 
                  disabled
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-400 text-sm font-medium cursor-not-allowed"
                >
                  <FaEdit className="w-3 h-3" />
                  Edit
                </button>
              </Tooltip>
            )}

            <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
              <button disabled className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-300 text-sm font-medium cursor-not-allowed">
                <FaQrcode className="w-3 h-3" />
                QR
                <FaLock className="w-2 h-2" />
              </button>
            }>
              <button 
                onClick={() => setQrCodeProductId(product.id)} 
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 text-sm font-medium text-green-700 transition"
              >
                <FaQrcode className="w-3 h-3" />
                QR
              </button>
            </FeatureGuard>

            {canDeleteProducts ? (
              <button 
                onClick={() => handleDelete(product.id)} 
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-sm font-medium text-red-700 transition"
              >
                <FaTrash className="w-3 h-3" />
              </button>
            ) : (
              <Tooltip content="You don't have permission to delete products. Contact your administrator.">
                <button 
                  disabled
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-300 text-sm font-medium cursor-not-allowed"
                >
                  <FaTrash className="w-3 h-3" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
