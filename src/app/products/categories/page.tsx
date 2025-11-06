"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSave, FaTimes, FaList, FaCog } from 'react-icons/fa';
import { Category, CustomField } from '@/types/categories';
import { categoryStorage } from '@/utils/categoryStorage';
import AuthGuard from '@/components/AuthGuard';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
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

  const resetForm = () => {
    setCategoryName('');
    setCategoryDescription('');
    setCustomFields([]);
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const handleAddCategory = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setCustomFields(category.customFields || []);
    setShowAddForm(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This will affect products using this category.')) return;
    try {
      await categoryStorage.deleteCategory(id);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category. Please try again.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    if (customFields.length === 0) {
      setError('At least one custom field is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        categoryStorage.updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDescription.trim(),
          customFields,
        });
      } else {
        categoryStorage.addCategory({
          name: categoryName.trim(),
          description: categoryDescription.trim(),
          customFields,
        });
      }
      loadCategories();
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Failed to save category. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    const newField: CustomField = {
      id: Date.now().toString(),
      name: '',
      type: 'text',
      required: false,
      placeholder: '',
    };
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...updates };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const addSelectOption = (fieldIndex: number) => {
    const field = customFields[fieldIndex];
    const options = field.options || [];
    updateCustomField(fieldIndex, { options: [...options, ''] });
  };

  const updateSelectOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const field = customFields[fieldIndex];
    const options = [...(field.options || [])];
    options[optionIndex] = value;
    updateCustomField(fieldIndex, { options });
  };

  const removeSelectOption = (fieldIndex: number, optionIndex: number) => {
    const field = customFields[fieldIndex];
    const options = (field.options || []).filter((_, i) => i !== optionIndex);
    updateCustomField(fieldIndex, { options });
  };

  // (Removed redundant categories variable declaration)

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <h1 className="text-3xl font-bold text-gray-900">Product Categories</h1>
              <p className="text-gray-600">Manage product categories and their custom fields</p>
            </div>
          </div>
          <button
            onClick={handleAddCategory}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus className="w-4 h-4" />
            Add Category
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading categories...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="text-red-600 font-medium">Error:</div>
              <div className="ml-2 text-red-700">{error}</div>
              <button
                onClick={loadCategories}
                className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Categories Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit category"
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete category"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaList className="w-4 h-4" />
                    <span>{(category.customFields || []).length} custom fields</span>
                  </div>

                  {(category.customFields || []).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Fields:</p>
                      <div className="space-y-1">
                        {(category.customFields || []).slice(0, 3).map((field) => (
                          <div key={field.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{field.name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              field.type === 'text' ? 'bg-blue-100 text-blue-800' :
                              field.type === 'number' ? 'bg-green-100 text-green-800' :
                              field.type === 'select' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {field.type}
                            </span>
                          </div>
                        ))}
                        {(category.customFields || []).length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{(category.customFields || []).length - 3} more fields
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Shoes, Phones"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={categoryDescription}
                        onChange={(e) => setCategoryDescription(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional description"
                      />
                    </div>
                  </div>

                  {/* Custom Fields */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Custom Fields</h3>
                      <button
                        type="button"
                        onClick={addCustomField}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                      >
                        <FaPlus className="w-3 h-3" />
                        Add Field
                      </button>
                    </div>

                    <div className="space-y-4">
                      {customFields.map((field, index) => (
                        <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">Field #{index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeCustomField(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Field Name *
                              </label>
                              <input
                                type="text"
                                value={field.name}
                                onChange={(e) => updateCustomField(index, { name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Size, Color, Brand"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Field Type *
                              </label>
                              <select
                                value={field.type}
                                onChange={(e) => updateCustomField(index, { type: e.target.value as CustomField['type'] })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="select">Select (Dropdown)</option>
                                <option value="boolean">Yes/No</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Placeholder
                              </label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => updateCustomField(index, { placeholder: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Help text for users"
                              />
                            </div>
                            <div className="flex items-center">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Required field</span>
                              </label>
                            </div>
                          </div>

                          {/* Select Options */}
                          {field.type === 'select' && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Select Options *
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addSelectOption(index)}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                >
                                  + Add Option
                                </button>
                              </div>
                              <div className="space-y-2">
                                {(field.options || []).map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex gap-2">
                                    <input
                                      type="text"
                                      value={option}
                                      onChange={(e) => updateSelectOption(index, optionIndex, e.target.value)}
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                      placeholder={`Option ${optionIndex + 1}`}
                                      required
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeSelectOption(index, optionIndex)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      disabled={(field.options || []).length <= 1}
                                    >
                                      <FaTimes className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {customFields.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <FaCog className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No custom fields added yet</p>
                          <p className="text-sm">Click &quot;Add Field&quot; to create custom fields for this category</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={saving || !categoryName.trim()}
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
                          {editingCategory ? 'Update Category' : 'Create Category'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
