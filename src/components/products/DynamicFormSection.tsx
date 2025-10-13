import React from 'react';
import { FormSection, FormField } from '@/types/product';
import DynamicField from './DynamicField';

interface DynamicFormSectionProps {
  section: FormSection;
  fields: Record<string, FormField>;
  values: Record<string, string | string[] | number | boolean | FileList | null>;
  errors: Record<string, string>;
  onFieldChange: (fieldId: string, value: string | string[] | number | boolean | FileList | null) => void;
}

export default function DynamicFormSection({
  section,
  fields,
  values,
  errors,
  onFieldChange,
}: DynamicFormSectionProps) {
  if (!section.is_visible) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        {section.icon && <span className="text-2xl mr-3">{section.icon}</span>}
        <div>
          <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
          {section.description && (
            <p className="text-sm text-gray-600 mt-1">{section.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {section.fields.map((fieldId) => {
          const field = fields[fieldId];
          if (!field || !field.visible) return null;

          return (
            <DynamicField
              key={fieldId}
              field={field}
              value={values[fieldId]}
              onChange={(value) => onFieldChange(fieldId, value)}
              error={errors[fieldId]}
            />
          );
        })}
      </div>
    </div>
  );
}
