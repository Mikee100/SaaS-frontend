import React from 'react';
import { INDUSTRY_TREE } from '@/lib/product-constants';

interface CategorySelectorProps {
  selectedIndustry: string | null;
  selectedCategory: string | null;
  onIndustryChange: (industry: string) => void;
  onCategoryChange: (category: string) => void;
}

export default function CategorySelector({
  selectedIndustry,
  selectedCategory,
  onIndustryChange,
  onCategoryChange,
}: CategorySelectorProps) {
  const industries = Object.keys(INDUSTRY_TREE);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Choose Industry & Category
        </h3>
        <p className="text-sm text-gray-600">
          Select the industry and category that best describes your product.
        </p>
      </div>

      {/* Industry Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Industry
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {industries.map((industry) => (
            <button
              key={industry}
              onClick={() => {
                onIndustryChange(industry);
                onCategoryChange(''); // Reset category when industry changes
              }}
              className={`p-3 text-left border rounded-lg transition-all ${
                selectedIndustry === industry
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="block text-sm font-medium">{industry}</span>
              <span className="block text-xs text-gray-500 mt-1">
                {INDUSTRY_TREE[industry].length} categories
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      {selectedIndustry && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Category
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {INDUSTRY_TREE[selectedIndustry].map((category) => (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`p-3 text-left border rounded-lg transition-all ${
                  selectedCategory === category
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="block text-sm font-medium">{category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Category Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Or enter a custom category
        </label>
        <input
          type="text"
          placeholder="Enter custom category..."
          value={selectedCategory && !INDUSTRY_TREE[selectedIndustry || '']?.includes(selectedCategory) ? selectedCategory : ''}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
