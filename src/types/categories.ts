export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required: boolean;
  options?: string[]; // For select type
  placeholder?: string;
  categoryId?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  tenantId?: string;
  branchId?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  customFields?: CustomField[];
}

export interface ProductWithCategory extends Product {
  categoryId?: string;
  category?: Category;
  customFieldValues?: Record<string, string | number | boolean>;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
  customFields?: Record<string, string | number | boolean>;
  supplier?: {
    id: string;
    name: string;
  };
}
