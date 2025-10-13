import React from 'react';

interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

interface ShoeColorsProps {
  availableColors: ColorOption[];
  selectedColors: string[];
  onColorToggle: (colorId: string) => void;
  errors: Record<string, string>;
}

export default function ShoeColors({ availableColors, selectedColors, onColorToggle, errors }: ShoeColorsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Available Colors *</h2>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
        {availableColors.map((color) => (
          <button
            key={color.id}
            type="button"
            onClick={() => onColorToggle(color.id)}
            className={`relative p-3 border-2 rounded-lg transition-all ${
              selectedColors.includes(color.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div
              className="w-6 h-6 rounded-full mx-auto mb-1 border border-gray-300"
              style={{ backgroundColor: color.hex }}
            />
            <span className="block text-xs text-center">{color.name}</span>
            {selectedColors.includes(color.id) && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
      {errors.colors && (
        <p className="mt-2 text-sm text-red-600">{errors.colors}</p>
      )}
    </div>
  );
}
