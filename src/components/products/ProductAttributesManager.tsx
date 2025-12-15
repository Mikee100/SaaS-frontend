'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaTimes } from 'react-icons/fa';
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
    return <div className="p-4">Loading attributes...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Product Attributes</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <FaPlus /> Create Attribute
        </button>
      </div>

      {attributes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No attributes yet. Create attributes like &quot;Color&quot;, &quot;Size&quot;, &quot;Storage&quot; to use in product variations.
        </div>
      ) : (
        <div className="space-y-4">
          {attributes.map((attribute) => (
            <div key={attribute.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-lg">
                    {attribute.displayName || attribute.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Type: {attribute.type} | {attribute.values.length} values
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAttribute(attribute.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FaTrash />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {attribute.values.map((value) => (
                    <div
                      key={value.id}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded border"
                    >
                      {value.color && (
                        <span
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: value.color }}
                        />
                      )}
                      <span>{value.displayName || value.value}</span>
                      <button
                        onClick={() => handleDeleteValue(value.id)}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new value..."
                    className="flex-1 px-3 py-1 border rounded text-sm"
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
                      className="w-10 h-8 border rounded"
                      onChange={(e) => {
                        const input = e.target.previousElementSibling as HTMLInputElement;
                        if (input.value.trim()) {
                          // You can enhance this to add color value with color picker
                        }
                      }}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create Product Attribute</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={newAttribute.name}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Color, Size, Storage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={newAttribute.displayName}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, displayName: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Optional display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={newAttribute.type}
                  onChange={(e) =>
                    setNewAttribute({
                      ...newAttribute,
                      type: e.target.value as 'text' | 'number' | 'color' | 'image',
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="color">Color</option>
                  <option value="image">Image</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Values</label>
                  <button
                    onClick={addValueToNewAttribute}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <FaPlus /> Add Value
                  </button>
                </div>
                <div className="space-y-2">
                  {newAttribute.values.map((val, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={val.value}
                        onChange={(e) =>
                          updateValueInNewAttribute(idx, 'value', e.target.value)
                        }
                        placeholder="Value"
                        className="flex-1 px-3 py-2 border rounded"
                      />
                      <input
                        type="text"
                        value={val.displayName || ''}
                        onChange={(e) =>
                          updateValueInNewAttribute(idx, 'displayName', e.target.value)
                        }
                        placeholder="Display Name (optional)"
                        className="flex-1 px-3 py-2 border rounded"
                      />
                      {newAttribute.type === 'color' && (
                        <input
                          type="color"
                          value={val.color || '#000000'}
                          onChange={(e) =>
                            updateValueInNewAttribute(idx, 'color', e.target.value)
                          }
                          className="w-12 h-10 border rounded"
                        />
                      )}
                      <button
                        onClick={() => removeValueFromNewAttribute(idx)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAttribute}
                  disabled={!newAttribute.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
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
