import React, { useState } from 'react';
import { ProductClassification } from '@/types/product';
import { FORM_STEPS } from '@/lib/product-constants';
import ClassificationSelector from './ClassificationSelector';
import CategorySelector from './CategorySelector';
import DynamicFormSection from './DynamicFormSection';
import { FiChevronLeft, FiChevronRight, FiCheck } from 'react-icons/fi';

// ...existing code...
interface MultiStepFormProps {
  classification: ProductClassification | null;
  industry: string | null;
  category: string | null;
  formData: Record<string, string | number | boolean | null>;
  errors: Record<string, string>;
  onClassificationChange: (classification: ProductClassification) => void;
  onIndustryChange: (industry: string) => void;
  onCategoryChange: (category: string) => void;
  onFormDataChange: (fieldId: string, value: string | number | boolean | FileList | string[] | null) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}
// ...existing code...
export default function MultiStepForm({
  classification,
  industry,
  category,
  formData,
  errors,
  onClassificationChange,
  onIndustryChange,
  onCategoryChange,
  onFormDataChange,
  onNext,
  onPrevious,
  onSubmit,
  isSubmitting,
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepData = FORM_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      onNext();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      onPrevious();
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'classification':
        return (
          <div className="space-y-8">
            <ClassificationSelector
              selectedClassification={classification}
              onClassificationChange={onClassificationChange}
            />
            {(classification) && (
              <CategorySelector
                selectedIndustry={industry}
                selectedCategory={category}
                onIndustryChange={onIndustryChange}
                onCategoryChange={onCategoryChange}
              />
            )}
          </div>
        );

      case 'basic':
        return (
          <DynamicFormSection
            section={{
              id: 'basic',
              title: 'Basic Information',
              description: 'Essential product details',
              icon: '📝',
              fields: ['name', 'description', 'sku'],
              is_visible: true,
            }}
            fields={{
              name: {
                id: 'name',
                type: 'text',
                label: 'Product Name',
                required: true,
                visible: true,
              },
              description: {
                id: 'description',
                type: 'rich_text',
                label: 'Description',
                required: false,
                visible: true,
              },
              sku: {
                id: 'sku',
                type: 'text',
                label: 'SKU',
                required: false,
                visible: true,
              },
            }}
            values={formData}
            errors={errors}
            onFieldChange={onFormDataChange}
          />
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            <DynamicFormSection
              section={{
                id: 'pricing',
                title: 'Pricing',
                description: 'Set your product pricing',
                icon: '💰',
                fields: ['price', 'cost'],
                is_visible: true,
              }}
              fields={{
                price: {
                  id: 'price',
                  type: 'number',
                  label: 'Price',
                  required: true,
                  visible: true,
                  min: 0,
                  step: 0.01,
                },
                cost: {
                  id: 'cost',
                  type: 'number',
                  label: 'Cost',
                  required: false,
                  visible: true,
                  min: 0,
                  step: 0.01,
                },
              }}
              values={formData}
              errors={errors}
              onFieldChange={onFormDataChange}
            />

            {classification && ['physical', 'bundle'].includes(classification) && (
              <DynamicFormSection
                section={{
                  id: 'inventory',
                  title: 'Inventory',
                  description: 'Manage stock and availability',
                  icon: '📦',
                  fields: ['stock', 'manage_stock'],
                  is_visible: true,
                }}
                fields={{
                  stock: {
                    id: 'stock',
                    type: 'number',
                    label: 'Stock Quantity',
                    required: false,
                    visible: true,
                    min: 0,
                  },
                  manage_stock: {
                    id: 'manage_stock',
                    type: 'checkbox',
                    label: 'Track inventory for this product',
                    required: false,
                    visible: true,
                  },
                }}
                values={formData}
                errors={errors}
                onFieldChange={onFormDataChange}
              />
            )}
          </div>
        );

      case 'attributes':
        return (
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attributes & Variants</h3>
            <p className="text-sm text-gray-600 mb-6">
              Configure product attributes and variations. This step is optional.
            </p>
            {/* Placeholder for attributes component */}
            <div className="text-center py-8 text-gray-500">
              Attributes configuration will be implemented here
            </div>
          </div>
        );

      case 'media':
        return (
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Media & Content</h3>
            <p className="text-sm text-gray-600 mb-6">
              Add images, videos, and other media to showcase your product.
            </p>
            {/* Placeholder for media upload */}
            <div className="text-center py-8 text-gray-500">
              Media upload will be implemented here
            </div>
          </div>
        );

      case 'seo':
        return (
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">SEO & Metadata</h3>
            <p className="text-sm text-gray-600 mb-6">
              Optimize your product for search engines and social sharing.
            </p>
            {/* Placeholder for SEO fields */}
            <div className="text-center py-8 text-gray-500">
              SEO configuration will be implemented here
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Review & Save</h3>
            <p className="text-sm text-gray-600 mb-6">
              Review your product information before saving.
            </p>
            {/* Placeholder for review */}
            <div className="text-center py-8 text-gray-500">
              Product review will be implemented here
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (currentStepData.id === 'classification') {
      return classification && industry && category;
    }
    if (currentStepData.id === 'basic') {
      return (
        typeof formData.name === 'string' &&
        formData.name.trim().length > 0
      );
    }
    if (currentStepData.id === 'pricing') {
      return typeof formData.price === 'number' && formData.price > 0;
    }
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {FORM_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index < currentStep ? <FiCheck className="w-4 h-4" /> : index + 1}
              </div>
              {index < FORM_STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm">
          {FORM_STEPS.map((step, index) => (
            <div key={step.id} className="text-center max-w-24">
              <div className={`font-medium ${index === currentStep ? 'text-blue-600' : 'text-gray-600'}`}>
                {step.title}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </button>

        {currentStep === FORM_STEPS.length - 1 ? (
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !canProceed()}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Product'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <FiChevronRight className="w-4 h-4 ml-2" />
          </button>
        )}
      </div>
    </div>
  );
}
