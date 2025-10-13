import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { ProductAttribute } from '@/types/product';

interface ProductAttributesProps {
  attributes: ProductAttribute[];
  selectedAttributes: Record<string, string[]>;
  onAttributeChange: (attributeId: string, valueIds: string[]) => void;
  onAddAttribute: () => void;
  onRemoveAttribute: (attributeId: string) => void;
}

const ProductAttributes: React.FC<ProductAttributesProps> = ({
  attributes,
  selectedAttributes,
  onAttributeChange,
  onAddAttribute,
  onRemoveAttribute,
}) => {
  const [expandedAttribute, setExpandedAttribute] = useState<string | null>(null);

  const toggleAttribute = (attributeId: string) => {
    setExpandedAttribute(expandedAttribute === attributeId ? null : attributeId);
  };

  const handleValueToggle = (attributeId: string, valueId: string) => {
    const currentValues = selectedAttributes[attributeId] || [];
    const newValues = currentValues.includes(valueId)
      ? currentValues.filter(id => id !== valueId)
      : [...currentValues, valueId];
    
    onAttributeChange(attributeId, newValues);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Attributes</h3>
        <button
          type="button"
          onClick={onAddAttribute}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FiPlus className="-ml-0.5 mr-1.5 h-4 w-4" />
          Add Attribute
        </button>
      </div>

      {attributes.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No attributes added. Add an attribute to start creating variations.
        </div>
      ) : (
        <div className="space-y-2">
          {attributes.map((attr) => (
            <div key={attr.id} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 focus:outline-none"
                onClick={() => toggleAttribute(attr.id)}
              >
                <div className="flex items-center">
                  <span className="font-medium">{attr.name}</span>
                  {selectedAttributes[attr.id]?.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedAttributes[attr.id].length} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  {expandedAttribute === attr.id ? (
                    <FiChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <FiChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>
              
              {expandedAttribute === attr.id && (
                <div className="p-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-600">
                      Select values for this attribute
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveAttribute(attr.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      <FiTrash2 className="h-4 w-4 inline mr-1" />
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {attr.values.map((value) => (
                      <label
                        key={value.id}
                        className={`flex items-center p-2 border rounded-md cursor-pointer hover:bg-gray-50 ${
                          selectedAttributes[attr.id]?.includes(value.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={selectedAttributes[attr.id]?.includes(value.id) || false}
                          onChange={() => handleValueToggle(attr.id, value.id)}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {value.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductAttributes;
