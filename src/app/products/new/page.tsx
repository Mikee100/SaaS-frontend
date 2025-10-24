'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { apiPost } from '@/utils/api';
import { FaArrowLeft, FaSave, FaSpinner, FaBox, FaTag } from 'react-icons/fa';
import Link from 'next/link';
import BranchSwitcher from '@/components/BranchSwitcher';

export default function NewCategoryPage() {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<Record<string, string | number | string[] | null>>({
    name: '',
    description: '',
  });
  const [customFields, setCustomFields] = useState<Array<{key: string, values: string[]}>>([]);
  const [newCustomFieldKey, setNewCustomFieldKey] = useState('');
  const [newCustomFieldValues, setNewCustomFieldValues] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle form data changes
  const handleFormDataChange = useCallback((fieldId: string, value: string | number | string[] | null) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  }, [errors]);

  // Validate form data
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.name || typeof formData.name !== 'string' || formData.name.trim().length === 0) {
      newErrors.name = 'Category name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.name]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare custom fields from the UI state
      const preparedCustomFields: Record<string, string[]> = {};
      customFields.forEach(field => {
        preparedCustomFields[field.key] = field.values;
      });

      // Create category
      const categoryData = {
        name: formData.name,
        description: formData.description || '',
        customFields: preparedCustomFields,
      };

      const createdCategory = await apiPost('/products/categories', categoryData);

      // Redirect to the variations page of the automatically created base product
      router.push(`/products/${(createdCategory as { baseProductId: string }).baseProductId}/variations`);

    } catch (error: unknown) {
      console.error('Error creating category:', error);
      setSubmitError((error as { message?: string })?.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, formData, customFields, router]);



  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/products"
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FaArrowLeft className="w-4 h-4 mr-2" />
                  Back to Products
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Create New Category</h1>
                  <p className="text-gray-600 mt-1">
                    Create a category with custom fields to generate products
                  </p>
                </div>
              </div>
              <BranchSwitcher />
            </div>
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{submitError}</p>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <FaBox className="mr-3 h-6 w-6" />
                    Category Details
                  </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={typeof formData.name === 'string' || typeof formData.name === 'number' ? formData.name : ''}
                      onChange={(e) => handleFormDataChange('name', e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Electronics, Clothing, Shoes"
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleFormDataChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the category"
                  />
                </div>
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <FaTag className="mr-3 h-6 w-6" />
                  Custom Fields (for Variations)
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Add custom fields that will be used to automatically generate individual products.
                  For example: Color: [Red, Black], Size: [40, 41, 42] will create products like &quot;Kensie red size 40&quot;, &quot;Kensie black size 41&quot;, etc.
                </p>

                {/* Existing Custom Fields */}
                {customFields.map((field, index) => (
                  <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{field.key}</span>
                      <button
                        type="button"
                        onClick={() => setCustomFields(prev => prev.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      Values: {field.values.join(', ')}
                    </div>
                  </div>
                ))}

                {/* Add New Custom Field */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Field Name
                      </label>
                      <input
                        type="text"
                        value={newCustomFieldKey}
                        onChange={(e) => setNewCustomFieldKey(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., Storage, Color, Size"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Values (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={newCustomFieldValues}
                        onChange={(e) => setNewCustomFieldValues(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 64GB, 128GB, 256GB"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (newCustomFieldKey.trim() && newCustomFieldValues.trim()) {
                            const values = newCustomFieldValues.split(',').map(v => v.trim()).filter(v => v);
                            if (values.length > 0) {
                              setCustomFields(prev => [...prev, { key: newCustomFieldKey.trim(), values }]);
                              setNewCustomFieldKey('');
                              setNewCustomFieldValues('');
                            }
                          }
                        }}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Add Field
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Step Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <FaBox className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Next Step: Generate Variations</h3>
                  <p className="text-blue-700">
                    After creating this category, you&apos;ll be redirected to the variations page where you can generate different product variations from your custom fields.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="w-5 h-5 mr-3 animate-spin" />
                    Creating Category...
                  </>
                ) : (
                  <>
                    <FaSave className="w-5 h-5 mr-3" />
                    Create Category
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
