import { FaEdit, FaQrcode, FaTrash, FaBox } from 'react-icons/fa';
import Tooltip from '@/components/Tooltip';
import FeatureGuard from '@/components/FeatureGuard';
import { ProductsPageProps } from './types';

interface ProductsTableViewProps {
  currentProducts: ProductsPageProps['currentProducts'];
  canEditProducts: ProductsPageProps['canEditProducts'];
  canDeleteProducts: ProductsPageProps['canDeleteProducts'];
  openEditModal: ProductsPageProps['openEditModal'];
  handleDelete: ProductsPageProps['handleDelete'];
  setQrCodeProductId: ProductsPageProps['setQrCodeProductId'];
  visibleColumns: ProductsPageProps['visibleColumns'];
  allColumns: ProductsPageProps['allColumns'];
  flattenProduct: (product: ProductsPageProps['currentProducts'][0]) => { [key: string]: string | number | boolean | undefined; margin: string };
  handleSort: ProductsPageProps['handleSort'];
  sortField: ProductsPageProps['sortField'];
  sortDirection: ProductsPageProps['sortDirection'];
}

export default function ProductsTableView({
  currentProducts,
  canEditProducts,
  canDeleteProducts,
  openEditModal,
  handleDelete,
  setQrCodeProductId,
  visibleColumns,
  allColumns,
  flattenProduct,
  handleSort,
  sortField,
  sortDirection,
}: ProductsTableViewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {allColumns.filter(col => visibleColumns.includes(col)).map(col => (
                <th
                  key={col}
                  className="px-4 py-3 font-semibold text-gray-600 text-left cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                    {sortField === col && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentProducts.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="text-center py-8 text-gray-400">
                  <div className="flex flex-col items-center justify-center py-8">
                    <FaBox className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">No products found.</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                  </div>
                </td>
              </tr>
            ) : (
              currentProducts.map((product) => {
                const flat = flattenProduct(product);
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    {allColumns.filter(col => visibleColumns.includes(col)).map(col => {
                      let displayValue: string | number | boolean | undefined = flat[col] ?? '-';
                      let className = '';
                      if (col === 'price' || col === 'cost') {
                        displayValue = `$${typeof flat[col] === 'number' ? flat[col].toFixed(2) : flat[col]}`;
                      } else if (col === 'margin') {
                        const marginValue = typeof flat[col] === 'string' && flat[col] !== 'N/A' ? parseFloat(flat[col]) : 0;
                        className = marginValue >= 20 ? 'text-green-600 font-semibold' : marginValue >= 0 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold';
                        displayValue = flat[col] === 'N/A' ? 'N/A' : `${flat[col]}%`;
                      }
                      return (
                        <td key={col} className={`px-4 py-3 whitespace-nowrap ${className}`}>
                          {displayValue}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canEditProducts ? (
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                        ) : (
                          <Tooltip content="You don't have permission to edit products. Contact your administrator.">
                            <button
                              disabled
                              className="p-2 text-gray-400 rounded-lg cursor-not-allowed"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        )}

                        <FeatureGuard requiredFeature="api_access" showUpgradePrompt={false} fallback={
                          <button disabled className="p-2 text-gray-400 rounded-lg cursor-not-allowed" title="QR Code (Upgrade required)">
                            <FaQrcode className="w-4 h-4" />
                          </button>
                        }>
                          <button
                            onClick={() => setQrCodeProductId(product.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="QR Code"
                          >
                            <FaQrcode className="w-4 h-4" />
                          </button>
                        </FeatureGuard>

                        {canDeleteProducts ? (
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        ) : (
                          <Tooltip content="You don't have permission to delete products. Contact your administrator.">
                            <button
                              disabled
                              className="p-2 text-gray-400 rounded-lg cursor-not-allowed"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
