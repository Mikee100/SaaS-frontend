import React from 'react';

interface ShoeDetailsFormData {
  shoe_brand: string;
  shoe_material: string;
  shoe_type: string;
  weight: number;
  length: number;
  width: number;
  height: number;
}

interface ShoeDetailsProps {
  formData: ShoeDetailsFormData;
  onFormDataChange: (fieldId: keyof ShoeDetailsFormData, value: string | number) => void;
}

export default function ShoeDetails({ formData, onFormDataChange }: ShoeDetailsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand
          </label>
          <input
            type="text"
            value={formData.shoe_brand}
            onChange={(e) => onFormDataChange('shoe_brand', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Nike, Adidas"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Material
          </label>
          <input
            type="text"
            value={formData.shoe_material}
            onChange={(e) => onFormDataChange('shoe_material', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Leather, Synthetic"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shoe Type
          </label>
          <select
            value={formData.shoe_type}
            onChange={(e) => onFormDataChange('shoe_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select type</option>
            <option value="sneakers">Sneakers</option>
            <option value="boots">Boots</option>
            <option value="sandals">Sandals</option>
            <option value="dress_shoes">Dress Shoes</option>
            <option value="casual">Casual</option>
            <option value="sports">Sports</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Weight (kg)
          </label>
          <input
            type="number"
            value={formData.weight}
            onChange={(e) => onFormDataChange('weight', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.5"
            min="0"
            step="0.01"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dimensions (L x W x H in cm)
          </label>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              value={formData.length}
              onChange={(e) => onFormDataChange('length', parseFloat(e.target.value) || 0)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Length"
              min="0"
              step="0.1"
            />
            <input
              type="number"
              value={formData.width}
              onChange={(e) => onFormDataChange('width', parseFloat(e.target.value) || 0)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Width"
              min="0"
              step="0.1"
            />
            <input
              type="number"
              value={formData.height}
              onChange={(e) => onFormDataChange('height', parseFloat(e.target.value) || 0)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Height"
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
