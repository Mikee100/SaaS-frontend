'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaMagic, FaCheck, FaTimes } from 'react-icons/fa';
import { productAttributesApi, productVariationsApi } from '@/lib/api/product-variations';
import type { ProductAttribute, ProductVariation } from '@/types/product-variations';

interface ProductVariationsFormProps {
  productId?: string; // If editing existing product
  baseSku: string;
  basePrice: number;
  baseCost: number;
  onVariationsReady?: (variations: Array<{
    sku: string;
    attributes: Record<string, string>;
    price: number;
    cost: number;
    stock: number;
  }>) => void;
}

/**
 * Unified component for managing product variations
 * - Create attributes on the fly
 * - Generate variations easily
 * - All in one place, no separate pages needed
 */
export default function ProductVariationsForm({
  productId,
  baseSku,
  basePrice,
  baseCost,
  onVariationsReady,
}: ProductVariationsFormProps) {
  const [step, setStep] = useState<'attributes' | 'variations'>('attributes');
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [existingVariations, setExistingVariations] = useState<ProductVariation[]>([]);
  
  // Attribute creation (inline)
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeValues, setNewAttributeValues] = useState<string[]>(['']);
  
  // Variation generation
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const [generatedVariations, setGeneratedVariations] = useState<Array<{
    sku: string;
    attributes: Record<string, string>;
    price: number;
    cost: number;
    stock: number;
  }>>([]);

  useEffect(() => {
    loadAttributes();
    if (productId) {
      loadVariations();
    }
  }, [productId]);

  const loadAttributes = async () => {
    try {
      const data = await productAttributesApi.getAll(true);
      setAttributes(data);
    } catch (err) {
      console.error('Failed to load attributes:', err);
    }
  };

  const loadVariations = async () => {
    if (!productId) return;
    try {
      const data = await productVariationsApi.getByProduct(productId);
      setExistingVariations(data);
    } catch (err) {
      console.error('Failed to load variations:', err);
    }
  };

  // Quick create attribute inline
  const handleQuickCreateAttribute = async () => {
    if (!newAttributeName.trim()) return;
    
    try {
      const attribute = await productAttributesApi.create({
        name: newAttributeName.trim(),
        displayName: newAttributeName.trim(),
        type: 'text',
        values: newAttributeValues
          .filter(v => v.trim())
          .map((v, idx) => ({ value: v.trim(), sortOrder: idx })),
      });
      
      setAttributes([...attributes, attribute]);
      setNewAttributeName('');
      setNewAttributeValues(['']);
      
      // Auto-select the new attribute for variation generation
      setSelectedAttributes({
        ...selectedAttributes,
        [attribute.name]: attribute.values.map(v => v.value),
      });
    } catch (err: any) {
      alert(err.message || 'Failed to create attribute');
    }
  };

  const addAttributeValue = () => {
    setNewAttributeValues([...newAttributeValues, '']);
  };

  const removeAttributeValue = (index: number) => {
    setNewAttributeValues(newAttributeValues.filter((_, i) => i !== index));
  };

  const updateAttributeValue = (index: number, value: string) => {
    const updated = [...newAttributeValues];
    updated[index] = value;
    setNewAttributeValues(updated);
  };

  // Toggle attribute value selection
  const toggleAttributeValue = (attributeName: string, value: string) => {
    const current = selectedAttributes[attributeName] || [];
    const isSelected = current.includes(value);
    
    setSelectedAttributes({
      ...selectedAttributes,
      [attributeName]: isSelected
        ? current.filter(v => v !== value)
        : [...current, value],
    });
  };

  // Generate all combinations
  const generateVariations = () => {
    const attributeNames = Object.keys(selectedAttributes);
    const selectedValues = attributeNames.map(name => selectedAttributes[name] || []);
    
    if (attributeNames.length === 0 || selectedValues.some(v => v.length === 0)) {
      alert('Please select at least one attribute with values');
      return;
    }

    // Cartesian product
    const combinations = cartesianProduct(selectedValues);
    
    const variations = combinations.map(combination => {
      const attrs: Record<string, string> = {};
      attributeNames.forEach((name, idx) => {
        attrs[name] = combination[idx];
      });
      
      const skuSuffix = combination.join('-').replace(/\s+/g, '');
      return {
        sku: `${baseSku}-${skuSuffix}`,
        attributes: attrs,
        price: basePrice,
        cost: baseCost,
        stock: 0,
      };
    });

    setGeneratedVariations(variations);
    setStep('variations');
    if (onVariationsReady) {
      onVariationsReady(variations);
    }
  };

  const cartesianProduct = (arrays: string[][]): string[][] => {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCombinations = cartesianProduct(rest);
    return first.flatMap(value =>
      restCombinations.map(combination => [value, ...combination])
    );
  };

  const updateVariation = (index: number, field: 'price' | 'cost' | 'stock', value: number) => {
    const updated = [...generatedVariations];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedVariations(updated);
    if (onVariationsReady) {
      onVariationsReady(updated);
    }
  };

  // Save variations to backend (if productId exists)
  const saveVariations = async () => {
    if (!productId) {
      // If no productId, just notify parent
      if (onVariationsReady) {
        onVariationsReady(generatedVariations);
      }
      return;
    }

    try {
      const attributeArray = Object.keys(selectedAttributes).map(name => ({
        attributeName: name,
        values: selectedAttributes[name],
      }));

      await productVariationsApi.generate(productId, {
        productId,
        attributes: attributeArray,
        skuPrefix: baseSku,
      });

      await loadVariations();
      alert(`Successfully created ${generatedVariations.length} variations!`);
    } catch (err: any) {
      alert(err.message || 'Failed to save variations');
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Attributes */}
      {step === 'attributes' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Step 1: Set Up Attributes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create attributes like Color, Size, Storage, etc. Then select which values to use for variations.
            </p>
          </div>

          {/* Quick Create Attribute */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-3">Quick Create Attribute</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Attribute name (e.g., Color, Size, Storage)"
                value={newAttributeName}
                onChange={(e) => setNewAttributeName(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Values (one per line or comma-separated)</label>
                {newAttributeValues.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Value ${idx + 1}`}
                      value={val}
                      onChange={(e) => updateAttributeValue(idx, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded"
                    />
                    {newAttributeValues.length > 1 && (
                      <button
                        onClick={() => removeAttributeValue(idx)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addAttributeValue}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add another value
                </button>
              </div>
              <button
                onClick={handleQuickCreateAttribute}
                disabled={!newAttributeName.trim() || newAttributeValues.every(v => !v.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Create Attribute
              </button>
            </div>
          </div>

          {/* Existing Attributes - Select Values */}
          <div>
            <h4 className="font-medium mb-3">Select Attribute Values for Variations</h4>
            <div className="space-y-4">
              {attributes.map((attr) => (
                <div key={attr.id} className="border rounded-lg p-4">
                  <h5 className="font-medium mb-2">{attr.displayName || attr.name}</h5>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((val) => {
                      const isSelected = (selectedAttributes[attr.name] || []).includes(val.value);
                      return (
                        <button
                          key={val.id}
                          onClick={() => toggleAttributeValue(attr.name, val.value)}
                          className={`px-3 py-1 rounded border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {val.displayName || val.value}
                          {val.color && (
                            <span
                              className="ml-2 w-3 h-3 inline-block rounded border border-gray-300"
                              style={{ backgroundColor: val.color }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={generateVariations}
              disabled={Object.keys(selectedAttributes).length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              <FaMagic /> Generate Variations
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review & Edit Variations */}
      {step === 'variations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Step 2: Review Variations</h3>
              <p className="text-sm text-gray-600">
                {generatedVariations.length} variations will be created. Edit prices, costs, and stock as needed.
              </p>
            </div>
            <button
              onClick={() => setStep('attributes')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Attributes
            </button>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">SKU</th>
                  {Object.keys(selectedAttributes).map((name) => (
                    <th key={name} className="px-4 py-2 text-left">
                      {name}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-left">Price</th>
                  <th className="px-4 py-2 text-left">Cost</th>
                  <th className="px-4 py-2 text-left">Stock</th>
                </tr>
              </thead>
              <tbody>
                {generatedVariations.map((variation, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-sm">{variation.sku}</td>
                    {Object.keys(selectedAttributes).map((name) => (
                      <td key={name} className="px-4 py-2">
                        {variation.attributes[name]}
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={variation.price}
                        onChange={(e) => updateVariation(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={variation.cost}
                        onChange={(e) => updateVariation(idx, 'cost', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={variation.stock}
                        onChange={(e) => updateVariation(idx, 'stock', parseInt(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStep('attributes')}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={saveVariations}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save {generatedVariations.length} Variations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
