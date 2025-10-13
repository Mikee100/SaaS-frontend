import React from 'react';
import { FormField } from '@/types/product';

type FieldValue = string | number | boolean | string[] | FileList | null;

interface DynamicFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  error?: string;
}

export default function DynamicField({ field, value, onChange, error }: DynamicFieldProps) {
  const baseInputClasses = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";
  const inputClasses = `${baseInputClasses} ${error ? 'border-red-300' : 'border-gray-300'}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    let newValue: FieldValue = target.value;

    if (field.type === 'number') {
      newValue = target.valueAsNumber || 0;
    } else if (field.type === 'checkbox') {
      newValue = target.checked;
    }

    onChange(newValue);
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            minLength={field.validation?.min_length}
            maxLength={field.validation?.max_length}
            className={inputClasses}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            min={field.min}
            max={field.max}
            step={field.step}
            className={inputClasses}
          />
        );

      case 'select':
        return (
          <select
            value={
              typeof value === 'string' || typeof value === 'number'
                ? value
                : ''
            }
            onChange={handleChange}
            required={field.required}
            className={inputClasses}
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        // For simplicity, using a basic multi-select. In production, use a proper multi-select component
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              onChange(selected);
            }}
            required={field.required}
            className={`${inputClasses} h-32`}
          >
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={typeof value === 'boolean' ? value : false}
              onChange={handleChange}
              required={field.required}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              {field.label}
            </label>
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
            onChange={handleChange}
            required={field.required}
            className={inputClasses}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
            onChange={handleChange}
            required={field.required}
            className={inputClasses}
          />
        );

      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => onChange(e.target.files)}
            required={field.required}
            multiple
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        );

      case 'rich_text':
        // For simplicity, using textarea. In production, use a rich text editor
        return (
          <textarea
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            minLength={field.validation?.min_length}
            maxLength={field.validation?.max_length}
            className={inputClasses}
          />
        );

      default:
        return (
          <input
            type="text"
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            className={inputClasses}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
      {renderField()}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
