import React from 'react';
import { CustomField } from '@/types/categories';

interface CustomFieldRendererProps {
  field: CustomField;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
  error?: string;
}

export const CustomFieldRenderer: React.FC<CustomFieldRendererProps> = ({
  field,
  value,
  onChange,
  error
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    let newValue: string | number | boolean;

    if (field.type === 'number') {
      newValue = target.value === '' ? 0 : Number(target.value);
    } else if (field.type === 'boolean') {
      newValue = (target as HTMLInputElement).checked;
    } else {
      newValue = target.value;
    }

    onChange(newValue);
  };

  const renderField = () => {
    const baseClasses = "w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    const errorClasses = error ? "border-red-300 focus:ring-red-500" : "border-gray-300";

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            className={`${baseClasses} ${errorClasses}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value as number || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            className={`${baseClasses} ${errorClasses}`}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              {field.name}
            </label>
          </div>
        );

      case 'select':
        return (
          <select
            value={value as string || ''}
            onChange={handleChange}
            required={field.required}
            className={`${baseClasses} ${errorClasses}`}
          >
            <option value="">
              {field.placeholder || `Select ${field.name.toLowerCase()}`}
            </option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {field.placeholder && field.type !== 'select' && field.type !== 'boolean' && (
        <p className="mt-1 text-xs text-gray-500">{field.placeholder}</p>
      )}
    </div>
  );
};
