import React from 'react';

interface PriceVariant {
  size: string;
  color: string;
  price: number;
}

interface ShoePricingProps {
  usePriceVariants: boolean;
  onUsePriceVariantsChange: (use: boolean) => void;
  priceVariants: PriceVariant[];
  onGeneratePriceVariants: () => void;
  onUpdatePriceVariant: (size: string, color: string, price: number) => void;
  availableColors: Array<{ id: string; name: string; hex: string }>;
}

export default function ShoePricing({
  usePriceVariants,
  onUsePriceVariantsChange,
  priceVariants,
  onGeneratePriceVariants,
  onUpdatePriceVariant,
  availableColors,
}: ShoePricingProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Price Variations</h2>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={usePriceVariants}
            onChange={(e) => onUsePriceVariantsChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Enable price variations</span>
        </label>
      </div>

      {usePriceVariants && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={onGeneratePriceVariants}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate Price Matrix
          </button>

          {priceVariants.length > 0 && (
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
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {priceVariants.map((variant) => (
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
                          value={variant.price}
                          onChange={(e) => onUpdatePriceVariant(variant.size, variant.color, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          step="0.01"
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
