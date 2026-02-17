'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaMagic, FaLayerGroup } from 'react-icons/fa';
import {
  ProductAttribute,
  ProductVariation,
  VariationAttributeInput,
} from '@/types/product-variations';
import {
  productAttributesApi,
  productVariationsApi,
} from '@/lib/api/product-variations';

// Helper function for cartesian product (pure function, no dependencies)
const cartesianProduct = (arrays: string[][]): string[][] => {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restCombinations = cartesianProduct(rest);
  return first.flatMap((value) =>
    restCombinations.map((combination) => [value, ...combination]),
  );
};

interface VariationManagerProps {
  productId: string;
  baseSku?: string;
  basePrice?: number;
  baseCost?: number;
  branchId?: string;
  onVariationsChange?: (variations: ProductVariation[]) => void;
}

export default function VariationManager({
  productId,
  baseSku = '',
  basePrice = 0,
  baseCost = 0,
  branchId,
  onVariationsChange,
}: VariationManagerProps) {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVariation, setEditingVariation] = useState<string | null>(null);

  // Generate variations state
  const [selectedAttributes, setSelectedAttributes] = useState<
    VariationAttributeInput[]
  >([]);
  const [variationMatrix, setVariationMatrix] = useState<
    Array<{
      attributes: Record<string, string>;
      sku: string;
      price: number;
      cost: number;
      stock: number;
    }>
  >([]);

  // Create single variation state
  const [newVariation, setNewVariation] = useState<{
    sku: string;
    attributes: Record<string, string>;
    price: number;
    cost: number;
    stock: number;
  }>({
    sku: '',
    attributes: {},
    price: basePrice,
    cost: baseCost,
    stock: 0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [attrs, vars] = await Promise.all([
        productAttributesApi.getAll(true),
        productVariationsApi.getByProduct(productId),
      ]);
      setAttributes(attrs);
      setVariations(vars);
      if (onVariationsChange) {
        onVariationsChange(vars);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [productId, onVariationsChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateVariations = async () => {
    try {
      setError('');
      const result = await productVariationsApi.generate(productId, {
        productId,
        attributes: selectedAttributes,
        skuPrefix: baseSku,
        branchId,
      });
      setVariations(result.variations);
      if (onVariationsChange) {
        onVariationsChange(result.variations);
      }
      setShowGenerateModal(false);
      setSelectedAttributes([]);
      setVariationMatrix([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate variations');
    }
  };

  const handleCreateVariation = async () => {
    try {
      setError('');
      await productVariationsApi.create(productId, {
        productId,
        ...newVariation,
        branchId,
      });
      await loadData();
      setShowCreateModal(false);
      setNewVariation({
        sku: '',
        attributes: {},
        price: basePrice,
        cost: baseCost,
        stock: 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create variation');
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    if (!confirm('Delete this variation?')) return;
    try {
      await productVariationsApi.delete(variationId);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete variation');
    }
  };

  const handleUpdateVariation = async (
    variationId: string,
    updates: Partial<ProductVariation>,
  ) => {
    try {
      await productVariationsApi.update(variationId, updates);
      await loadData();
      setEditingVariation(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update variation');
    }
  };

  // Generate variation matrix preview
  const generateMatrix = useCallback(() => {
    if (selectedAttributes.length === 0) {
      setVariationMatrix([]);
      return;
    }

    const combinations = cartesianProduct(
      selectedAttributes.map((attr) => attr.values),
    );

    const matrix = combinations.map((combination) => {
      const attrs: Record<string, string> = {};
      selectedAttributes.forEach((attr, idx) => {
        attrs[attr.attributeName] = combination[idx];
      });

      const skuSuffix = combination.join('-').replace(/\s+/g, '');
      const sku = baseSku ? `${baseSku}-${skuSuffix}` : `VAR-${skuSuffix}`;

      return {
        attributes: attrs,
        sku,
        price: basePrice,
        cost: baseCost,
        stock: 0,
      };
    });

    setVariationMatrix(matrix);
  }, [selectedAttributes, baseSku, basePrice, baseCost]);

  useEffect(() => {
    generateMatrix();
  }, [generateMatrix]);

  const addAttributeToGenerate = () => {
    setSelectedAttributes([
      ...selectedAttributes,
      { attributeName: '', values: [] },
    ]);
  };

  const updateAttributeInGenerate = (
    index: number,
    attributeName: string,
    values: string[],
  ) => {
    const updated = [...selectedAttributes];
    updated[index] = { attributeName, values };
    setSelectedAttributes(updated);
  };

  const removeAttributeFromGenerate = (index: number) => {
    setSelectedAttributes(selectedAttributes.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-sm text-gray-500">Loading variations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 m-4 rounded">
          {error}
        </div>
      )}

      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Variations</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {variations.length === 0 
              ? 'Create variations to offer different options for this product'
              : `${variations.length} variation${variations.length !== 1 ? 's' : ''} created`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <FaMagic className="w-3.5 h-3.5" />
            Generate
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            <FaPlus className="w-3.5 h-3.5" />
            Add One
          </button>
        </div>
      </div>

      {variations.length === 0 ? (
        <div className="p-12">
          <div className="text-center max-w-sm mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <FaLayerGroup className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No variations yet</h4>
            <p className="text-xs text-gray-500 mb-6">
              Create variations to offer different sizes, colors, or other options for this product.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Generate Variations
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Add Manually
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                {attributes
                  .filter((attr) =>
                    variations.some((v) => v.attributes[attr.name]),
                  )
                  .map((attr) => (
                    <th key={attr.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {attr.displayName || attr.name}
                    </th>
                  ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {variations.map((variation) => (
                <tr key={variation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{variation.sku}</td>
                  {attributes
                    .filter((attr) => variation.attributes[attr.name])
                    .map((attr) => (
                      <td key={attr.id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {variation.attributes[attr.name]}
                      </td>
                    ))}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {editingVariation === variation.id ? (
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={variation.price || basePrice}
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onBlur={(e) =>
                          handleUpdateVariation(variation.id, {
                            price: parseFloat(e.target.value),
                          })
                        }
                      />
                    ) : (
                      `Ksh ${(variation.price || basePrice).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {editingVariation === variation.id ? (
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={variation.cost || baseCost}
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onBlur={(e) =>
                          handleUpdateVariation(variation.id, {
                            cost: parseFloat(e.target.value),
                          })
                        }
                      />
                    ) : (
                      `Ksh ${(variation.cost || baseCost).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {editingVariation === variation.id ? (
                      <input
                        type="number"
                        defaultValue={variation.stock}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onBlur={(e) =>
                          handleUpdateVariation(variation.id, {
                            stock: parseInt(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <span className="font-medium">{variation.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() =>
                          setEditingVariation(
                            editingVariation === variation.id ? null : variation.id,
                          )
                        }
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Edit"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVariation(variation.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Variations Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold">Generate Variations</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create all combinations automatically (e.g., Black-39, Black-40, Grey-39, Grey-40)
                </p>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <p className="text-sm text-blue-900 font-semibold mb-2">
                💡 How to create combinations like &quot;Black Converse size 39, 40, 41, 42, 43&quot; and &quot;Grey Converse size 39, 40, 41, 42&quot;:
              </p>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Click &quot;Add Another Attribute&quot; below</li>
                <li>Select <strong>Color</strong> attribute, then check: <strong>Black, Grey</strong></li>
                <li>Click &quot;Add Another Attribute&quot; again</li>
                <li>Select <strong>Size</strong> attribute, then check: <strong>39, 40, 41, 42, 43</strong></li>
                <li>Review the preview - you&apos;ll see all 10 combinations (Black-39, Black-40, ..., Grey-43)</li>
                <li>Click &quot;Generate Variations&quot; to create them all!</li>
              </ol>
            </div>

            <div className="space-y-4">
              {selectedAttributes.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded">
                  <p className="mb-2">No attributes selected yet.</p>
                  <p className="text-sm">Click &quot;Add Attribute&quot; below to start generating combinations.</p>
                </div>
              )}

              {selectedAttributes.map((attr, idx) => (
                <div key={idx} className="border-2 border-blue-200 p-4 rounded-lg bg-white">
                  <div className="flex gap-2 mb-3">
                    <select
                      value={attr.attributeName}
                      onChange={(e) => {
                        const selectedAttr = attributes.find(
                          (a) => a.name === e.target.value,
                        );
                        updateAttributeInGenerate(
                          idx,
                          e.target.value,
                          selectedAttr?.values.map((v) => v.value) || [],
                        );
                      }}
                      className="flex-1 px-3 py-2 border rounded font-medium"
                    >
                      <option value="">Select Attribute (e.g., Color, Size)</option>
                      {attributes
                        .filter(a => !selectedAttributes.some(sa => sa.attributeName === a.name && sa.attributeName !== attr.attributeName))
                        .map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.displayName || a.name}
                        </option>
                      ))}
                    </select>
                    {selectedAttributes.length > 1 && (
                      <button
                        onClick={() => removeAttributeFromGenerate(idx)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        title="Remove this attribute"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                  {attr.attributeName && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2 font-medium">
                        Select values for <strong>{attributes.find(a => a.name === attr.attributeName)?.displayName || attr.attributeName}</strong>:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attributes
                          .find((a) => a.name === attr.attributeName)
                          ?.values.map((val) => (
                            <label
                              key={val.id}
                              className={`flex items-center gap-2 px-3 py-2 border-2 rounded cursor-pointer transition-all ${
                                attr.values.includes(val.value)
                                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                                  : 'bg-white border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={attr.values.includes(val.value)}
                                onChange={(e) => {
                                  const newValues = e.target.checked
                                    ? [...attr.values, val.value]
                                    : attr.values.filter((v) => v !== val.value);
                                  updateAttributeInGenerate(
                                    idx,
                                    attr.attributeName,
                                    newValues,
                                  );
                                }}
                                className="w-4 h-4"
                              />
                              <span className="font-medium">{val.displayName || val.value}</span>
                              {val.color && (
                                <span
                                  className="w-5 h-5 rounded border-2 border-gray-300"
                                  style={{ backgroundColor: val.color }}
                                />
                              )}
                            </label>
                          ))}
                      </div>
                      {attr.values.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2">
                          ⚠️ Select at least one value for this attribute
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={addAttributeToGenerate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 w-full justify-center"
              >
                <FaPlus /> Add Another Attribute (e.g., Color, Size, Storage)
              </button>

              {variationMatrix.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <h4 className="font-bold mb-3 text-green-800">
                    ✅ Preview: {variationMatrix.length} variation{variationMatrix.length !== 1 ? 's' : ''} will be created
                  </h4>
                  <div className="max-h-80 overflow-y-auto border rounded bg-white">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold border-b">SKU</th>
                          {selectedAttributes.map((attr) => (
                            <th key={attr.attributeName} className="px-3 py-2 text-left font-semibold border-b">
                              {attributes.find(a => a.name === attr.attributeName)?.displayName || attr.attributeName}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-left font-semibold border-b">Selling Price</th>
                          <th className="px-3 py-2 text-left font-semibold border-b">Buying Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variationMatrix.slice(0, 20).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border-b font-mono text-xs">{row.sku}</td>
                            {selectedAttributes.map((attr) => (
                              <td key={attr.attributeName} className="px-3 py-2 border-b">
                                {row.attributes[attr.attributeName]}
                              </td>
                            ))}
                            <td className="px-3 py-2 border-b">Ksh {row.price.toFixed(2)}</td>
                            <td className="px-3 py-2 border-b">Ksh {row.cost.toFixed(2)}</td>
                          </tr>
                        ))}
                        {variationMatrix.length > 20 && (
                          <tr>
                            <td
                              colSpan={selectedAttributes.length + 3}
                              className="px-3 py-2 text-center text-gray-500 bg-gray-50"
                            >
                              ... and {variationMatrix.length - 20} more variation{variationMatrix.length - 20 !== 1 ? 's' : ''}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    💡 Each row represents one unique combination. All will be created with the base price and cost.
                  </p>
                </div>
              )}

              {selectedAttributes.length > 0 && variationMatrix.length === 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded">
                  <p className="text-sm text-amber-800">
                    ⚠️ Please select at least one value for each attribute to generate variations.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateVariations}
                  disabled={selectedAttributes.length === 0 || variationMatrix.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold text-lg shadow-lg"
                >
                  ✨ Generate {variationMatrix.length} Variation{variationMatrix.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Single Variation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create Variation</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input
                  type="text"
                  value={newVariation.sku}
                  onChange={(e) =>
                    setNewVariation({ ...newVariation, sku: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., PROD-BLK-38"
                />
              </div>

              {attributes.map((attr) => (
                <div key={attr.id}>
                  <label className="block text-sm font-medium mb-1">
                    {attr.displayName || attr.name}
                  </label>
                  <select
                    value={newVariation.attributes[attr.name] || ''}
                    onChange={(e) =>
                      setNewVariation({
                        ...newVariation,
                        attributes: {
                          ...newVariation.attributes,
                          [attr.name]: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Select {attr.name}</option>
                    {attr.values.map((val) => (
                      <option key={val.id} value={val.value}>
                        {val.displayName || val.value}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newVariation.price}
                    onChange={(e) =>
                      setNewVariation({
                        ...newVariation,
                        price: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newVariation.cost}
                    onChange={(e) =>
                      setNewVariation({
                        ...newVariation,
                        cost: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <input
                    type="number"
                    value={newVariation.stock}
                    onChange={(e) =>
                      setNewVariation({
                        ...newVariation,
                        stock: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
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
                  onClick={handleCreateVariation}
                  disabled={!newVariation.sku}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  Create Variation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
