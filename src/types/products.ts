export interface ProductVariation {
  id: string;
  productId: string;
  name: string; // e.g., "Black - Size 8"
  sku: string; // e.g., "CONVERSE-BLK-8"
  price?: number; // Override base price if different
  cost?: number; // Override base cost if different
  stock: number;
  attributes: Record<string, string>; // e.g., { color: "Black", size: "8" }
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number; // Total stock across all variations
  description?: string;
  categoryId: string;
  customFieldValues: Record<string, string | number | boolean>; // Values for category custom fields
  variations: ProductVariation[];
  supplier?: {
    id: string;
    name: string;
  };
  tenantId?: string;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  price: number;
  cost: number;
  description?: string;
  categoryId: string;
  customFieldValues: Record<string, string | number | boolean>;
  supplierId?: string;
  branchId?: string;
}

export interface CreateVariationRequest {
  productId: string;
  name: string;
  sku: string;
  price?: number;
  cost?: number;
  stock: number;
  attributes: Record<string, string>;
}
