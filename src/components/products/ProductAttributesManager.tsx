'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaTimes, FaPalette } from 'react-icons/fa';
import { ProductAttribute } from '@/types/product-variations';
import { productAttributesApi } from '@/lib/api/product-variations';

export default function ProductAttributesManager() {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newValuesByAttribute, setNewValuesByAttribute] = useState<Record<string, string>>({});
  const [isBootstrappingCommon, setIsBootstrappingCommon] = useState(false);

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

  const handleBootstrapCommonAttributes = async () => {
    try {
      setError('');
      setNotice('');
      setIsBootstrappingCommon(true);
      await productAttributesApi.getOrCreateCommon();
      await loadAttributes();
      setNotice('Common attributes added. You can now create variations faster.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add common attributes');
    } finally {
      setIsBootstrappingCommon(false);
    }
  };

  const submitQuickValue = async (attributeId: string) => {
    const value = (newValuesByAttribute[attributeId] || '').trim();
    if (!value) return;
    await handleAddValue(attributeId, value);
    setNewValuesByAttribute((prev) => ({ ...prev, [attributeId]: '' }));
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
    <div className="space-y-2.5">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      <div className="rounded border border-blue-200 bg-blue-50 px-2.5 py-2">
        <p className="text-[11px] font-medium text-blue-800">Quick start: Add attributes here first, then go to Variations and assign stock per variation.</p>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-gray-900">Attributes</h2>
            {attributes.length > 0 && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Step 2 complete</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {attributes.length === 0 
              ? 'No attributes yet'
              : `${attributes.length} attribute${attributes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleBootstrapCommonAttributes}
            disabled={isBootstrappingCommon}
            className="rounded border border-blue-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBootstrappingCommon ? 'Adding...' : 'Add Common'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <FaPlus className="h-3.5 w-3.5" />
            Create Attribute
          </button>
        </div>
      </div>

      {attributes.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white p-6">
          <div className="text-center max-w-md mx-auto">
            <FaPalette className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <h3 className="mb-1 text-sm font-medium text-gray-900">No attributes yet</h3>
            <p className="mb-3 text-xs text-gray-500">
              Create attributes like Color, Size, or Storage to use when creating product variations.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <FaPlus className="h-3.5 w-3.5" />
              Create Attribute
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {attributes.map((attribute) => (
            <div 
              key={attribute.id} 
              className="rounded border border-gray-200 bg-white p-2.5 transition-colors hover:border-gray-300"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {attribute.displayName || attribute.name}
                    </h4>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-gray-600">
                      {attribute.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {attribute.values.length} {attribute.values.length === 1 ? 'value' : 'values'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAttribute(attribute.id)}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <FaTrash className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Values Display */}
                {attribute.values.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {attribute.values.map((value) => (
                      <div
                        key={value.id}
                        className="group flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1"
                      >
                        {value.color && (
                          <span
                            className="h-3.5 w-3.5 rounded border border-gray-300"
                            style={{ backgroundColor: value.color }}
                          />
                        )}
                        <span className="text-xs text-gray-700">{value.displayName || value.value}</span>
                        <button
                          onClick={() => handleDeleteValue(value.id)}
                          className="ml-0.5 rounded p-0.5 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:text-red-600"
                          title="Delete"
                        >
                          <FaTimes className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Value Input */}
                <div className="flex gap-1.5 border-t border-gray-200 pt-2">
                  <input
                    type="text"
                    placeholder="Add value..."
                    value={newValuesByAttribute[attribute.id] || ''}
                    onChange={(e) =>
                      setNewValuesByAttribute((prev) => ({ ...prev, [attribute.id]: e.target.value }))
                    }
                    className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        void submitQuickValue(attribute.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => void submitQuickValue(attribute.id)}
                    className="rounded border border-gray-300 bg-white px-2 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Add
                  </button>
                  {attribute.type === 'color' && (
                    <input
                      type="color"
                      className="h-8 w-9 cursor-pointer rounded border border-gray-300"
                      onChange={(e) => {
                        setNewValuesByAttribute((prev) => ({ ...prev, [attribute.id]: e.target.value }));
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/80 p-4 backdrop-blur-[1px]">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded border border-gray-200 bg-white p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Create Attribute</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={newAttribute.name}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, name: e.target.value })
                  }
                  className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Color, Size, Storage"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Display Name</label>
                <input
                  type="text"
                  value={newAttribute.displayName}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, displayName: e.target.value })
                  }
                  className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional (shown to customers)"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
                <select
                  value={newAttribute.type}
                  onChange={(e) =>
                    setNewAttribute({
                      ...newAttribute,
                      type: e.target.value as 'text' | 'number' | 'color' | 'image',
                    })
                  }
                  className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="color">Color</option>
                  <option value="image">Image</option>
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700">Values</label>
                  <button
                    onClick={addValueToNewAttribute}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add Value
                  </button>
                </div>
                {newAttribute.values.length === 0 ? (
                  <div className="rounded border border-dashed border-gray-300 bg-gray-50 py-3 text-center">
                    <p className="text-xs text-gray-500">No values added</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {newAttribute.values.map((val, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={val.value}
                          onChange={(e) =>
                            updateValueInNewAttribute(idx, 'value', e.target.value)
                          }
                          placeholder="Value *"
                          className="flex-1 rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={val.displayName || ''}
                          onChange={(e) =>
                            updateValueInNewAttribute(idx, 'displayName', e.target.value)
                          }
                          placeholder="Display name"
                          className="flex-1 rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                        {newAttribute.type === 'color' && (
                          <input
                            type="color"
                            value={val.color || '#000000'}
                            onChange={(e) =>
                              updateValueInNewAttribute(idx, 'color', e.target.value)
                            }
                            className="h-8 w-9 cursor-pointer rounded border border-gray-300"
                            title="Pick Color"
                          />
                        )}
                        <button
                          onClick={() => removeValueFromNewAttribute(idx)}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Remove"
                        >
                          <FaTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-200 pt-2.5">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAttribute}
                  disabled={!newAttribute.name || newAttribute.values.length === 0}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
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
