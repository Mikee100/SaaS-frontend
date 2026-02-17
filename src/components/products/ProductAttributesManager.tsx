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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Attributes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {attributes.length === 0 
              ? 'No attributes yet'
              : `${attributes.length} attribute${attributes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          <FaPlus className="w-4 h-4" />
          Create Attribute
        </button>
      </div>

      {attributes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center max-w-md mx-auto">
            <FaPalette className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No attributes yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              Create attributes like Color, Size, or Storage to use when creating product variations.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
            >
              <FaPlus className="w-4 h-4" />
              Create Attribute
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {attributes.map((attribute) => (
            <div 
              key={attribute.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {attribute.displayName || attribute.name}
                    </h4>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded capitalize">
                      {attribute.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {attribute.values.length} {attribute.values.length === 1 ? 'value' : 'values'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAttribute(attribute.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Values Display */}
                {attribute.values.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attribute.values.map((value) => (
                      <div
                        key={value.id}
                        className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100"
                      >
                        {value.color && (
                          <span
                            className="w-4 h-4 rounded border border-gray-300"
                            style={{ backgroundColor: value.color }}
                          />
                        )}
                        <span className="text-sm text-gray-700">{value.displayName || value.value}</span>
                        <button
                          onClick={() => handleDeleteValue(value.id)}
                          className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 text-gray-400 hover:text-red-600 rounded transition-all"
                          title="Delete"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Value Input */}
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <input
                    type="text"
                    placeholder="Add value..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
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
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create Attribute</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={newAttribute.name}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Color, Size, Storage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={newAttribute.displayName}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, displayName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional (shown to customers)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select
                  value={newAttribute.type}
                  onChange={(e) =>
                    setNewAttribute({
                      ...newAttribute,
                      type: e.target.value as 'text' | 'number' | 'color' | 'image',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="color">Color</option>
                  <option value="image">Image</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Values</label>
                  <button
                    onClick={addValueToNewAttribute}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded font-medium transition-colors"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add Value
                  </button>
                </div>
                {newAttribute.values.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-500">No values added</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {newAttribute.values.map((val, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={val.value}
                          onChange={(e) =>
                            updateValueInNewAttribute(idx, 'value', e.target.value)
                          }
                          placeholder="Value *"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <input
                          type="text"
                          value={val.displayName || ''}
                          onChange={(e) =>
                            updateValueInNewAttribute(idx, 'displayName', e.target.value)
                          }
                          placeholder="Display name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        {newAttribute.type === 'color' && (
                          <input
                            type="color"
                            value={val.color || '#000000'}
                            onChange={(e) =>
                              updateValueInNewAttribute(idx, 'color', e.target.value)
                            }
                            className="w-10 h-9 border border-gray-300 rounded cursor-pointer"
                            title="Pick Color"
                          />
                        )}
                        <button
                          onClick={() => removeValueFromNewAttribute(idx)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAttribute}
                  disabled={!newAttribute.name || newAttribute.values.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
