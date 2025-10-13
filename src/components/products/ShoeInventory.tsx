import React from 'react';

interface InventoryVariant {
  size: string;
  color: string;
  stock: number;
  sku: string;
}

interface ShoeInventoryProps {
  useInventoryVariants: boolean;
  onUseInventoryVariantsChange: (use: boolean) => void;
  inventoryVariants: InventoryVariant[];
  onGenerateInventoryVariants: () => void;
  onUpdateInventoryVariant: (size: string, color: string, field: 'stock' | 'sku', value: string | number) => void;
  availableColors: Array<{ id: string; name: string; hex: string }>;
}

export default function ShoeInventory({
  useInventoryVariants,
  onUseInventoryVariantsChange,
  inventoryVariants,
  onGenerateInventoryVariants,
  onUpdateInventoryVariant,
  availableColors,
}: ShoeInventoryProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Inventory Per Variant</h2>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={useInventoryVariants}
            onChange={(e) => onUseInventoryVariantsChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Track inventory per variant</span>
        </label>
      </div>

      {useInventoryVariants && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={onGenerateInventoryVariants}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate Inventory Matrix
          </button>

          {inventoryVariants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryVariants.map((variant) => (
                    <tr key={`${variant.size}-${variant.color}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {variant.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {availableColors.find(c => c.id === variant.color)?.name || variant.color}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => onUpdateInventoryVariant(variant.size, variant.color, 'stock', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => onUpdateInventoryVariant(variant.size, variant.color, 'sku', e.target.value)}
                          className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
