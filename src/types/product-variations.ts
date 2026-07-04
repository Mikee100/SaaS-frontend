// Type for AddAttributeValueRequest
export interface AddAttributeValueRequest {
  value: string;
  displayName?: string;
  color?: string;
  image?: string;
  sortOrder?: number;
}
// Product Variation Types

export interface ProductAttribute {
  id: string;
  name: string;
  displayName?: string;
  type: 'text' | 'number' | 'color' | 'image';
  tenantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  values: ProductAttributeValue[];
}

export interface ProductAttributeValue {
  id: string;
  attributeId: string;
  value: string;
  displayName?: string;
  color?: string; // Hex color for color attributes
  image?: string; // Image URL for image-based attributes
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariation {
  id: string;
  productId: string;
  sku: string;
  price?: number;
  cost?: number;
  stock: number;
  images?: string[];
  attributes: Record<string, string>; // e.g., { "Color": "Black", "Size": "38" }
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  branchId?: string;
  barcode?: string;
  barcodes?: Array<{
    id: string;
    code: string;
    isPrimary: boolean;
    type: string;
  }>;
  weight?: number;
}

export interface VariationAttributeInput {
  attributeName: string;
  values: string[];
}

export interface GenerateVariationsRequest {
  productId: string;
  attributes: VariationAttributeInput[];
  skuPrefix?: string;
  branchId?: string;
}

export interface CreateVariationRequest {
  productId: string;
  sku: string;
  price?: number;
  cost?: number;
  stock: number;
  attributes: Record<string, string>;
  barcode?: string;
  alternateBarcodes?: string[];
  weight?: number;
  branchId?: string;
}

export interface UpdateVariationRequest {
  sku?: string;
  price?: number;
  cost?: number;
  stock?: number;
  images?: string[];
  attributes?: Record<string, string>;
  barcode?: string;
  alternateBarcodes?: string[];
  weight?: number;
  isActive?: boolean;
}

// For UI display
export interface VariationMatrixRow {
  variation: ProductVariation;
  attributeValues: Array<{ attributeName: string; value: string }>;
  isSelected?: boolean;
}

export interface VariationAttributeOption {
  attribute: ProductAttribute;
  selectedValues: string[];
}
