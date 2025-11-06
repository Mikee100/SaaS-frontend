"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaPlus, FaArrowLeft, FaSave, FaTimes, FaTrash, FaEdit } from 'react-icons/fa';
import { Category, CustomField } from '@/types/categories';
import { Product, ProductVariation, CreateProductRequest, CreateVariationRequest } from '@/types/products';
import { categoryStorage } from '@/utils/categoryStorage';
import { productStorage } from '@/utils/productStorage';
import AuthGuard from '@/components/AuthGuard';
import { BranchSelector } from '@/components/dashboard/BranchSelector';
import { useUser } from '@/components/UserContext';

export default function AddProductPage() {
  const { user } = useUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product form state
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCost, setProductCost] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | boolean>>({});

  // Product state
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);

  // Variations state
  const [variations] = useState<ProductVariation[]>([]);
  const [showVariationForm, setShowVariationForm] = useState(false);
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null);

  // Variation form state
  const [variationName, setVariationName] = useState('');
  const [variationSku, setVariationSku] = useState('');
  const [variationPrice, setVariationPrice] = useState('');
  const [variationCost, setVariationCost] = useState('');
  const [variationStock, setVariationStock] = useState('');
  const [variationAttributes, setVariationAttributes] = useState<Record<string, string>>({});

  // Step management
  const [currentStep, setCurrentStep] = useState<'product' | 'variations'>('product');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const stored = await categoryStorage.getCategories();
      // Load fields for each category
      const categoriesWithFields = await Promise.all(
        stored.map(async (category) => {
          const customFields = await categoryStorage.getCategoryFields(category.id);
          return { ...category, customFields };
        })
      );
      setCategories(categoriesWithFields);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategory(category || null);
    // Reset custom field values when category changes
    setCustomFieldValues({});
  };

  const handleCustomFieldChange = (fieldId: string, value: string | number | boolean) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateProductForm = (): boolean => {
    if (!productName.trim()) {
      setError('Product name is required.');
      return false;
    }
    if (!productSku.trim()) {
      setError('Product SKU is required.');
      return false;
    }
    if (!selectedCategory) {
      setError('Please select a category.');
      return false;
    }
    if (!productPrice || isNaN(Number(productPrice))) {
      setError('Valid product price is required.');
      return false;
    }
    if (!productCost || isNaN(Number(productCost))) {
      setError('Valid product cost is required.');
      return false;
    }

    // Validate required custom fields
    const requiredFields = selectedCategory?.customFields?.filter(f => f.required) || [];
    for (const field of requiredFields) {
      const value = customFieldValues[field.id];
      if (value === undefined || value === null || value === '') {
        setError(`Field "${field.name}" is required.`);
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleCreateProduct = async () => {
    if (!validateProductForm()) return;

    setSaving(true);
    try {
      const productData: CreateProductRequest = {
        name: productName.trim(),
        sku: productSku.trim(),
        price: Number(productPrice),
        cost: Number(productCost),
        description: productDescription.trim() || undefined,
        categoryId: selectedCategory!.id,
        customFieldValues,
        branchId: user?.branchId || 'default-branch',
      };

      const createdProduct = await productStorage.createProduct(productData);
      setCreatedProduct(createdProduct);

      // Move to variations step
      setCurrentStep('variations');
      setError(null);
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Failed to create product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetVariationForm = () => {
    setVariationName('');
    setVariationSku('');
    setVariationPrice('');
    setVariationCost('');
    setVariationStock('');
    setVariationAttributes({});
    setEditingVariation(null);
    setShowVariationForm(false);
  };

  const handleAddVariation = () => {
    resetVariationForm();
    setShowVariationForm(true);
  };

  const handleEditVariation = (variation: ProductVariation) => {
    setEditingVariation(variation);
    setVariationName(variation.name);
    setVariationSku(variation.sku);
    setVariationPrice(variation.price?.toString() || '');
    setVariationCost(variation.cost?.toString() || '');
    setVariationStock(variation.stock.toString());
    setVariationAttributes(variation.attributes);
    setShowVariationForm(true);
  };

  const handleSaveVariation = async () => {
    if (!variationName.trim() || !variationSku.trim() || !variationStock || isNaN(Number(variationStock))) {
      setError('Please fill in all required variation fields.');
      return;
    }

    setSaving(true);
    try {
      const variationData: CreateVariationRequest = {
        productId: 'temp-product-id', // This would be the actual product ID
        name: variationName.trim(),
        sku: variationSku.trim(),
        price: variationPrice ? Number(variationPrice) : undefined,
        cost: variationCost ? Number(variationCost) : undefined,
        stock: Number(variationStock),
        attributes: variationAttributes,
      };

      if (editingVariation) {
        await productStorage.updateVariation(editingVariation.id, variationData);
      } else {
        const variationDataWithProductId = {
          ...variationData,
          productId: createdProduct?.id || 'temp-product-id',
        };
        await productStorage.createVariation(variationDataWithProductId);
      }

      resetVariationForm();
      // Reload variations
      // const updatedVariations = await productStorage.getProductVariations(productId);
      // setVariations(updatedVariations);
      setError(null);
    } catch (error) {
      console.error('Error saving variation:', error);
      setError('Failed to save variation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    if (!confirm('Are you sure you want to delete this variation?')) return;

    try {
      await productStorage.deleteVariation(variationId);
      // Reload variations
      // const updatedVariations = await productStorage.getProductVariations(productId);
      // setVariations(updatedVariations);
    } catch (error) {
      console.error('Error deleting variation:', error);
      setError('Failed to delete variation. Please try again.');
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.id];

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value as number || ''}
            onChange={(e) => handleCustomFieldChange(field.id, Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            value={value as string || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.required}
          >
            <option value="">Select {field.name.toLowerCase()}</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean || false}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">{field.name}</span>
          </label>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/products"
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
              <p className="text-gray-600">Create a product with custom fields and variations</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          <div className={`flex items-center ${currentStep === 'product' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'product' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className="ml-2 font-medium">Product Details</span>
          </div>
          <div className={`flex-1 h-px mx-4 ${currentStep === 'variations' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center ${currentStep === 'variations' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'variations' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Variations</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {currentStep === 'product' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Information</h2>

            <div className="space-y-6">
              {/* Branch Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch *
                </label>
                <BranchSelector />
              </div>
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Converse All Star"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={productSku}
                    onChange={(e) => setProductSku(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., CONV-ALLSTAR"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productCost}
                    onChange={(e) => setProductCost(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Product description..."
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={selectedCategory?.id || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Fields */}
              {selectedCategory && selectedCategory.customFields && selectedCategory.customFields.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Fields</h3>
                  <div className="space-y-4">
                    {selectedCategory.customFields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.name} {field.required && '*'}
                        </label>
                        {renderCustomField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleCreateProduct}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      Create Product & Continue to Variations
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'variations' && (
          <div className="space-y-6">
            {/* Variations List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Product Variations</h2>
                <button
                  onClick={handleAddVariation}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Add Variation
                </button>
              </div>

              {variations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaEdit className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No variations added yet</p>
                  <p className="text-sm">Click &quot;Add Variation&quot; to create product variations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variations.map((variation) => (
                    <div key={variation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{variation.name}</h3>
                          <p className="text-sm text-gray-600">SKU: {variation.sku}</p>
                          <p className="text-sm text-gray-600">Stock: {variation.stock}</p>
                          <div className="mt-2">
                            {Object.entries(variation.attributes).map(([key, value]) => (
                              <span key={key} className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mr-2">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditVariation(variation)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVariation(variation.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variation Form Modal */}
            {showVariationForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {editingVariation ? 'Edit Variation' : 'Add Variation'}
                      </h2>
                      <button
                        onClick={resetVariationForm}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                      >
                        <FaTimes className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Variation Name *
                          </label>
                          <input
                            type="text"
                            value={variationName}
                            onChange={(e) => setVariationName(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Black - Size 8"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SKU *
                          </label>
                          <input
                            type="text"
                            value={variationSku}
                            onChange={(e) => setVariationSku(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., CONV-BLK-8"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price (optional)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={variationPrice}
                            onChange={(e) => setVariationPrice(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Override base price"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cost (optional)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={variationCost}
                            onChange={(e) => setVariationCost(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Override base cost"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock *
                          </label>
                          <input
                            type="number"
                            value={variationStock}
                            onChange={(e) => setVariationStock(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                            required
                          />
                        </div>
                      </div>

                      {/* Variation Attributes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Attributes
                        </label>
                        <div className="space-y-2">
                          {Object.entries(variationAttributes).map(([key, value], index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Attribute name (e.g., Color)"
                                value={key}
                                onChange={(e) => {
                                  const newAttributes = { ...variationAttributes };
                                  delete newAttributes[key];
                                  newAttributes[e.target.value] = value;
                                  setVariationAttributes(newAttributes);
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                placeholder="Value (e.g., Black)"
                                value={value}
                                onChange={(e) => setVariationAttributes(prev => ({ ...prev, [key]: e.target.value }))}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                onClick={() => {
                                  const newAttributes = { ...variationAttributes };
                                  delete newAttributes[key];
                                  setVariationAttributes(newAttributes);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <FaTimes className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setVariationAttributes(prev => ({ ...prev, '': '' }))}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + Add Attribute
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
                      <button
                        onClick={handleSaveVariation}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <FaSave className="w-4 h-4" />
                            {editingVariation ? 'Update Variation' : 'Add Variation'}
                          </>
                        )}
                      </button>
                      <button
                        onClick={resetVariationForm}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
