import React, { useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';

interface ShoeSizesProps {
  availableSizes: string[];
  selectedSizes: string[];
  customSizes: string[];
  onSizeToggle: (size: string) => void;
  onAddCustomSize: (size: string) => void;
  onRemoveCustomSize: (size: string) => void;
  onSelectAllSizes: () => void;
  onClearAllSizes: () => void;
  onSelectSizeRange: (start: string, end: string) => void;
  errors: Record<string, string>;
}

export default function ShoeSizes({
  availableSizes,
  selectedSizes,
  customSizes,
  onSizeToggle,
  onAddCustomSize,
  onRemoveCustomSize,
  onSelectAllSizes,
  onClearAllSizes,
  onSelectSizeRange,
  errors,
}: ShoeSizesProps) {
  const [newSizeInput, setNewSizeInput] = useState<string>('');

  const handleAddCustomSize = () => {
    if (newSizeInput.trim() && !customSizes.includes(newSizeInput.trim()) && !availableSizes.includes(newSizeInput.trim())) {
      onAddCustomSize(newSizeInput.trim());
      setNewSizeInput('');
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Available Sizes *</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAllSizes}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={onClearAllSizes}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={() => onSelectSizeRange('7', '12')}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            7-12
          </button>
          <button
            type="button"
            onClick={() => onSelectSizeRange('39', '45')}
            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            EU 39-45
          </button>
        </div>
      </div>

      {/* Custom Size Input */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newSizeInput}
          onChange={(e) => setNewSizeInput(e.target.value)}
          placeholder="Add custom size (e.g., 39, 40, 41)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSize())}
        />
        <button
          type="button"
          onClick={handleAddCustomSize}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FiPlus className="h-4 w-4" />
          Add Size
        </button>
      </div>

      {/* Size Selection Grid */}
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-4">
        {availableSizes.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onSizeToggle(size)}
            className={`p-3 border rounded-lg text-sm font-medium transition-all ${
              selectedSizes.includes(size)
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      {/* Custom Sizes */}
      {customSizes.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Sizes:</h3>
          <div className="flex flex-wrap gap-2">
            {customSizes.map((size) => (
              <div
                key={size}
                className={`relative px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
                  selectedSizes.includes(size)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                {size}
                <button
                  type="button"
                  onClick={() => onRemoveCustomSize(size)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiX className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.sizes && (
        <p className="mt-2 text-sm text-red-600">{errors.sizes}</p>
      )}
    </div>
  );
}
