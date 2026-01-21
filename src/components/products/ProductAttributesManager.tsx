'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaTimes, FaPalette, FaEdit } from 'react-icons/fa';
import { ProductAttribute } from '@/types/product-variations';
import { productAttributesApi } from '@/lib/api/product-variations';

export default function ProductAttributesManager() {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newAttribute, setNewAttribute] = useState({
    name: '',
    displayName: '',
    type: 'text' as 'text' | 'number' | 'color' | 'image',
    values: [] as Array<{ value: string; displayName?: string; color?: string; image?: string }>,
  });

  useEffect(() => {
    loadAttributes();
  }, []);

  const loadAttributes = async () => {
    try {
      setLoading(true);
      const data = await productAttributesApi.getAll(true);
      setAttributes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAttribute = async () => {
    try {
      setError('');
      await productAttributesApi.create(newAttribute);
      await loadAttributes();
      setShowCreateModal(false);
      setNewAttribute({
        name: '',
        displayName: '',
        type: 'text',
        values: [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create attribute');
    }
  };

  const handleDeleteAttribute = async (id: string) => {
    if (!confirm('Delete this attribute? This will affect all products using it.')) return;
    try {
      await productAttributesApi.delete(id);
      await loadAttributes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete attribute');
    }
  };

  const handleAddValue = async (attributeId: string, value: string) => {
    try {
      setError('');
      await productAttributesApi.addValue(attributeId, { value });
      await loadAttributes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add value');
    }
  };

  const handleDeleteValue = async (valueId: string) => {
    if (!confirm('Delete this value?')) return;
    try {
      await productAttributesApi.deleteValue(valueId);
      await loadAttributes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete value');
    }
  };

  const addValueToNewAttribute = () => {
    setNewAttribute({
      ...newAttribute,
      values: [...newAttribute.values, { value: '', displayName: '' }],
    });
  };

  const removeValueFromNewAttribute = (index: number) => {
    setNewAttribute({
      ...newAttribute,
      values: newAttribute.values.filter((_, i) => i !== index),
    });
  };

  const updateValueInNewAttribute = (
    index: number,
    field: 'value' | 'displayName' | 'color' | 'image',
    value: string,
  ) => {
    const updated = [...newAttribute.values];
    updated[index] = { ...updated[index], [field]: value };
    setNewAttribute({ ...newAttribute, values: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attributes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded shadow-sm">
          <div className="flex items-center gap-2">
            <FaTimes className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Attributes List</h3>
          <p className="text-sm text-gray-500 mt-1">
            {attributes.length === 0 
              ? 'No attributes created yet'
              : `${attributes.length} ${attributes.length === 1 ? 'attribute' : 'attributes'} available`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all transform hover:scale-105"
        >
          <FaPlus className="w-4 h-4" />
          Create Attribute
        </button>
      </div>

      {attributes.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
            <FaPalette className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Attributes Yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create attributes like &quot;Color&quot;, &quot;Size&quot;, &quot;Storage&quot; to use in product variations. 
            These attributes help you create multiple variants of the same product.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all inline-flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            Create Your First Attribute
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {attributes.map((attribute) => (
            <div 
              key={attribute.id} 
              className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FaPalette className="w-4 h-4 text-gray-600" />
                    </div>
                    <h4 className="font-bold text-lg text-gray-900">
                      {attribute.displayName || attribute.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 ml-12">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium capitalize">
                      {attribute.type}
                    </span>
                    <span className="text-gray-500">
                      {attribute.values.length} {attribute.values.length === 1 ? 'value' : 'values'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAttribute(attribute.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Attribute"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Values Display */}
                <div className="flex flex-wrap gap-2 min-h-[60px]">
                  {attribute.values.length === 0 ? (
                    <div className="w-full text-center py-4 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                      No values yet. Add values below.
                    </div>
                  ) : (
                    attribute.values.map((value) => (
                      <div
                        key={value.id}
                        className="group flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        {value.color && (
                          <span
                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: value.color }}
                          />
                        )}
                        <span className="text-sm font-medium text-gray-700">{value.displayName || value.value}</span>
                        <button
                          onClick={() => handleDeleteValue(value.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                          title="Delete Value"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Value Input */}
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <input
                    type="text"
                    placeholder="Type value and press Enter..."
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          handleAddValue(attribute.id, input.value.trim());
                          input.value = '';
                        }
                      }
                    }}
                  />
                  {attribute.type === 'color' && (
                    <input
                      type="color"
                      className="w-12 h-10 border-2 border-gray-200 rounded-lg cursor-pointer"
                      onChange={(e) => {
                        const input = e.target.previousElementSibling as HTMLInputElement;
                        if (input.value.trim()) {
                          // You can enhance this to add color value with color picker
                        }
                      }}
                      title="Pick Color"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Attribute Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FaPlus className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Create Product Attribute</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newAttribute.name}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g., Color, Size, Storage"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name</label>
                <input
                  type="text"
                  value={newAttribute.displayName}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, displayName: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Optional display name (shown to customers)"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use the name above</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                <select
                  value={newAttribute.type}
                  onChange={(e) =>
                    setNewAttribute({
                      ...newAttribute,
                      type: e.target.value as 'text' | 'number' | 'color' | 'image',
                    })
                  }
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="color">Color</option>
                  <option value="image">Image</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose how this attribute is displayed</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Values</label>
                  <button
                    onClick={addValueToNewAttribute}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    <FaPlus className="w-3.5 h-3.5" />
                    Add Value
                  </button>
                </div>
                {newAttribute.values.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-500 mb-2">No values added yet</p>
                    <p className="text-xs text-gray-400">Click "Add Value" above to create values for this attribute</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {newAttribute.values.map((val, idx) => (
                      <div key={idx} className="flex gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="text"
                          value={val.value}
                          onChange={(e) =>
                            updateValueInNewAttribute(idx, 'value', e.target.value)
                          }
                          placeholder="Value *"
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                        />
                        <input
                          type="text"
                          value={val.displayName || ''}
                          onChange={(e) =>
                            updateValueInNewAttribute(idx, 'displayName', e.target.value)
                          }
                          placeholder="Display Name"
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                        />
                        {newAttribute.type === 'color' && (
                          <input
                            type="color"
                            value={val.color || '#000000'}
                            onChange={(e) =>
                              updateValueInNewAttribute(idx, 'color', e.target.value)
                            }
                            className="w-12 h-10 border-2 border-gray-200 rounded-lg cursor-pointer"
                            title="Pick Color"
                          />
                        )}
                        <button
                          onClick={() => removeValueFromNewAttribute(idx)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Value"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAttribute}
                  disabled={!newAttribute.name || newAttribute.values.length === 0}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                >
                  Create Attribute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
