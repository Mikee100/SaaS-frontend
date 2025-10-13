import React from 'react';
import { ProductClassification } from '@/types/product';
import { CLASSIFICATIONS } from '@/lib/product-constants';

interface ClassificationSelectorProps {
  selectedClassification: ProductClassification | null;
  onClassificationChange: (classification: ProductClassification) => void;
}

export default function ClassificationSelector({
  selectedClassification,
  onClassificationChange,
}: ClassificationSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Choose Product Classification
        </h3>
        <p className="text-sm text-gray-600">
          Select the type of product you want to create. This will determine what options are available.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CLASSIFICATIONS.map((classification) => (
          <div
            key={classification.id}
            onClick={() => onClassificationChange(classification.id)}
            className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
              selectedClassification === classification.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  checked={selectedClassification === classification.id}
                  onChange={() => {}}
                />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{classification.icon}</span>
                  <span className="block text-sm font-medium text-gray-900">
                    {classification.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {classification.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {classification.hasInventory && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Inventory
                    </span>
                  )}
                  {classification.hasShipping && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Shipping
                    </span>
                  )}
                  {classification.hasVariants && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Variants
                    </span>
                  )}
                  {classification.hasFiles && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      Files
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
