'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiTag } from 'react-icons/fi';
import { ProductAttribute, AttributeType } from '@/types/product';
import DynamicField from './DynamicField';
// Update the import path and filename to match the actual file in your project.
// For example, if the file is named 'categoryConfigsFixed.ts' in the same folder:
import {  CategoryConfig, getCategoryAttributes, getCategoryConfig } from '../../lib/category-configs';

interface CategoryBasedFormProps {
  selectedCategory: string;
  formData: Record<string, string | number | boolean | string[] | null>;
  errors: Record<string, string>;
  onFormDataChange: (fieldId: string, value: string | number | boolean | string[] | null) => void;
  onAttributeChange: (attributeId: string, valueIds: string[]) => void;
  selectedAttributes: Record<string, string[]>;
}

export default function CategoryBasedForm({
  selectedCategory,
  formData,
  errors,
  onFormDataChange,
  onAttributeChange,
  selectedAttributes,
}: CategoryBasedFormProps) {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfig | null>(null);

  // Update attributes when category changes
  useEffect(() => {
    if (selectedCategory) {
      const categoryAttrs = getCategoryAttributes(selectedCategory);
      const config = getCategoryConfig(selectedCategory);

      setAttributes(categoryAttrs);
      setCategoryConfig(config);

      // Initialize selected attributes for new category
      const initialSelected: Record<string, string[]> = {};
      categoryAttrs.forEach((attr: ProductAttribute) => {
        initialSelected[attr.id] = [];
      });
      // Note: We don't call onAttributeChange here to avoid overriding existing selections
    }
  }, [selectedCategory]);

  const handleAddAttribute = () => {
    const newAttribute: ProductAttribute = {
      id: `attr_${Date.now()}`,
      name: 'New Attribute',
      slug: `attr_${Date.now()}`,
      type: 'select' as AttributeType,
      values: [],
      required: false,
      visible: true,
      variation: true,
      filterable: true,
      sortable: true,
      searchable: true,
    };
    setAttributes(prev => [...prev, newAttribute]);
  };

  const handleRemoveAttribute = (attributeId: string) => {
    setAttributes(prev => prev.filter(attr => attr.id !== attributeId));
    const newSelected = { ...selectedAttributes };
    delete newSelected[attributeId];
    // Note: We don't call onAttributeChange here as it's handled by the parent
  };

  if (!selectedCategory) {
    return (
      <div className="text-center py-12">
        <FiTag className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No category selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please select a category to see the relevant attributes and form fields.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Category Header */}
      {categoryConfig && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center">
            <span className="text-3xl mr-4">{categoryConfig.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{categoryConfig.name}</h3>
              <p className="text-sm text-gray-600">{categoryConfig.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Product Attributes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <FiTag className="mr-3 h-6 w-6" />
            Product Attributes
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {attributes.map((attribute) => (
              <div key={attribute.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{attribute.name}</h3>
                    <p className="text-sm text-gray-600">
                      Select available {attribute.name.toLowerCase()}
                      {attribute.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                  </div>
                  {!categoryConfig?.requiredFields.includes(attribute.id) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttribute(attribute.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {attribute.values.map((value) => {
                    const isSelected = selectedAttributes[attribute.id]?.includes(value.id);
                    return (
                      <button
                        key={value.id}
                        type="button"
                        onClick={() => {
                          const currentSelected = selectedAttributes[attribute.id] || [];
                          const newSelected = isSelected
                            ? currentSelected.filter(id => id !== value.id)
                            : [...currentSelected, value.id];
                          onAttributeChange(attribute.id, newSelected);
                        }}
                        className={`p-3 border rounded-lg text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {attribute.type === 'color' && value.color && (
                          <div
                            className="w-6 h-6 rounded-full border-2 border-gray-300 mb-2"
                            style={{ backgroundColor: value.color }}
                          />
                        )}
                        <span className="text-sm font-medium">{value.name}</span>
                      </button>
                    );
                  })}
                </div>

                {attribute.required && selectedAttributes[attribute.id]?.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    Please select at least one {attribute.name.toLowerCase()} option.
                  </p>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddAttribute}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <FiPlus className="mr-2 h-5 w-5" />
              Add Custom Attribute
            </button>
          </div>
        </div>
      </div>

      {/* Category-specific additional fields */}
      {selectedCategory === 'Dresses' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-pink-600">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FiTag className="mr-3 h-6 w-6" />
              Dress Specifications
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DynamicField
                field={{
                  id: 'dress_length',
                  type: 'select',
                  label: 'Dress Length',
                  required: false,
                  visible: true,
                  options: [
                    { value: 'mini', label: 'Mini (above knee)' },
                    { value: 'knee', label: 'Knee length' },
                    { value: 'midi', label: 'Midi (below knee)' },
                    { value: 'maxi', label: 'Maxi (ankle length)' },
                    { value: 'floor', label: 'Floor length' },
                  ],
                }}
                value={formData.dress_length}
                onChange={(value) => {
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    Array.isArray(value) ||
                    value === null
                  ) {
                    onFormDataChange('dress_length', value);
                  }
                }}
                error={errors.dress_length}
              />
              <DynamicField
                field={{
                  id: 'occasion',
                  type: 'multiselect',
                  label: 'Suitable Occasions',
                  required: false,
                  visible: true,
                  options: [
                    { value: 'casual', label: 'Casual' },
                    { value: 'work', label: 'Work/Office' },
                    { value: 'party', label: 'Party' },
                    { value: 'wedding', label: 'Wedding' },
                    { value: 'formal', label: 'Formal' },
                    { value: 'beach', label: 'Beach' },
                  ],
                }}
                value={formData.occasion}
                onChange={(value) => {
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    Array.isArray(value) ||
                    value === null
                  ) {
                    onFormDataChange('occasion', value);
                  }
                }}
                error={errors.occasion}
              />
            </div>
          </div>
        </div>
      )}

      {selectedCategory === 'T-Shirts' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FiTag className="mr-3 h-6 w-6" />
              T-Shirt Specifications
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DynamicField
                field={{
                  id: 'brand',
                  type: 'select',
                  label: 'Brand/Collection',
                  required: false,
                  visible: true,
                  options: [
                    { value: 'basic', label: 'Basic Collection' },
                    { value: 'premium', label: 'Premium Collection' },
                    { value: 'designer', label: 'Designer' },
                    { value: 'vintage', label: 'Vintage' },
                    { value: 'limited', label: 'Limited Edition' },
                  ],
                }}
                value={formData.brand}
                onChange={(value) => {
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    Array.isArray(value) ||
                    value === null
                  ) {
                    onFormDataChange('brand', value);
                  }
                }}
                error={errors.brand}
              />
              <DynamicField
                field={{
                  id: 'care_instructions',
                  type: 'multiselect',
                  label: 'Care Instructions',
                  required: false,
                  visible: true,
                  options: [
                    { value: 'machine_wash', label: 'Machine Wash' },
                    { value: 'hand_wash', label: 'Hand Wash Only' },
                    { value: 'dry_clean', label: 'Dry Clean Only' },
                    { value: 'tumble_dry', label: 'Tumble Dry' },
                    { value: 'hang_dry', label: 'Hang Dry' },
                    { value: 'iron_low', label: 'Iron on Low Heat' },
                  ],
                }}
                value={formData.care_instructions}
                onChange={(value) => {
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    Array.isArray(value) ||
                    value === null
                  ) {
                    onFormDataChange('care_instructions', value);
                  }
                }}
                error={errors.care_instructions}
              />
            </div>
          </div>
        </div>
      )}

      {(selectedCategory === 'Women\'s Shoes' || selectedCategory === 'Men\'s Shoes') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FiTag className="mr-3 h-6 w-6" />
              Shoe Specifications
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DynamicField
                field={{
                  id: 'shoe_width',
                  type: 'select',
                  label: 'Shoe Width',
                  required: false,
                  visible: true,
                  options: [
                    { value: 'narrow', label: 'Narrow (AA/B)' },
                    { value: 'medium', label: 'Medium (C/D)' },
                    { value: 'wide', label: 'Wide (E/EE)' },
                    { value: 'extra_wide', label: 'Extra Wide (EEE+)' },
                  ],
                }}
                value={formData.shoe_width}
                onChange={(value) => {
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    Array.isArray(value) ||
                    value === null
                  ) {
                    onFormDataChange('shoe_width', value);
                  }
                }}
                error={errors.shoe_width}
              />
              <DynamicField
                field={{
                  id: 'arch_support',
                  type: 'select',
                  label: 'Arch Support',
                  required: false,
                  visible: true,
                  options: [
                    { value: 'none', label: 'No Arch Support' },
                    { value: 'light', label: 'Light Arch Support' },
                    { value: 'moderate', label: 'Moderate Arch Support' },
                    { value: 'strong', label: 'Strong Arch Support' },
                    { value: 'orthotic', label: 'Orthotic Friendly' },
                  ],
                }}
                value={formData.arch_support}
                onChange={(value) => {
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    Array.isArray(value) ||
                    value === null
                  ) {
                    onFormDataChange('arch_support', value);
                  }
                }}
                error={errors.arch_support}
              />
            </div>
          </div>
        </div>
      )}

      {selectedCategory === 'Jeans' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FiTag className="mr-3 h-6 w-6" />
              Jeans Specifications
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DynamicField
                field={{
                  id: 'inseam',
                  type: 'select',
                  label: 'Inseam Length',
                  required: false,
                  visible: true,
                  options: [
                    { value: '28', label: '28 inches' },
                    { value: '30', label: '30 inches' },
                    { value: '32', label: '32 inches' },
                    { value: '34', label: '34 inches' },
                    { value: '36', label: '36 inches' },
                    { value: '38', label: '38 inches' },
                    { value: 'custom', label: 'Custom Length' },
                  ],
                }}
                value={formData.inseam}
                onChange={(value) => {
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    Array.isArray(value) ||
                    value === null
                  ) {
                    onFormDataChange('inseam', value);
                  }
                }}
                error={errors.inseam}
              />
              <DynamicField
                field={{
                  id: 'stretch_level',
                  type: 'select',
                  label: 'Stretch Level',
                  required: false,
                  visible: true,
                  options: [
                    { value: 'rigid', label: 'Rigid (No Stretch)' },
                    { value: 'light', label: 'Light Stretch' },
                    { value: 'medium', label: 'Medium Stretch' },
                    { value: 'high', label: 'High Stretch' },
                    { value: 'super', label: 'Super Stretch' },
                  ],
                }}
                value={formData.stretch_level}
                onChange={(value) => {
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    Array.isArray(value) ||
                    value === null
                  ) {
                    onFormDataChange('stretch_level', value);
                  }
                }}
                error={errors.stretch_level}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
