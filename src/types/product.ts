// ======================
// Core Product Types
// ======================

export type ProductClassification = 'physical' | 'digital' | 'service' | 'subscription' | 'rental' | 'event' | 'bundle';

export type ProductStatus = 'draft' | 'active' | 'archived' | 'out_of_stock';

export type StockStatus = 'in_stock' | 'out_of_stock' | 'on_backorder' | 'preorder';

export type BackorderStatus = 'no' | 'notify' | 'allow';

export type TaxStatus = 'taxable' | 'shipping' | 'none';

export type AttributeType = 'text' | 'number' | 'select' | 'multiselect' | 'color' | 'image' | 'boolean' | 'date' | 'file';

// ======================
// Product Classification
// ======================

export interface ProductClassificationType {
  id: ProductClassification;
  label: string;
  description: string;
  icon: string;
  fields: string[];
  hasInventory: boolean;
  hasShipping: boolean;
  hasVariants: boolean;
  hasFiles: boolean;
  hasSubscription: boolean;
  hasRental: boolean;
  hasEvents: boolean;
}

// ======================
// Attribute System
// ======================

export interface AttributeValue {
  id: string;
  name: string;
  description?: string;
  color?: string;       // For color swatches
  image?: string;       // For image swatches
  meta?: unknown; // Additional metadata
}

export interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
  values: AttributeValue[];
  required: boolean;
  visible: boolean;
  variation: boolean;
  filterable: boolean;
  sortable: boolean;
  searchable: boolean;
  default_value?: string | number | boolean | string[] | null;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // For select/multiselect options
  meta?: unknown; // Additional configuration
}

// ======================
// Categories & Taxonomy
// ======================

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description?: string;
  image?: string;
  icon?: string;
  attributes: string[]; // Attribute IDs
  children?: ProductCategory[];
  meta?:unknown;
}

export interface ProductTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

// ======================
// Pricing & Inventory
// ======================

export interface PriceTier {
  min_quantity: number;
  max_quantity?: number;
  price: number;
  discount?: number;
}

export interface RegionPrice {
  region: string;
  currency: string;
  price: number;
  sale_price?: number;
  cost?: number;
  tax_class?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string;
  quantity: number;
  location?: string; // Warehouse/location ID
  status: StockStatus;
  low_stock_threshold?: number;
  last_stock_update?: string;
  meta?: unknown;
}

// ======================
// Media & Files
// ======================

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document' | '3d_model' | 'audio' | 'archive';
  mime_type: string;
  file_name: string;
  file_size: number;
  alt_text?: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  duration?: number;
  is_primary: boolean;
  position: number;
  meta?: unknown;
}

// ======================
// Product Variants
// ======================

export interface ProductVariant {
  id: string;
  sku: string;
  barcode?: string;
  prices: RegionPrice[];
  inventory: InventoryItem[];
  attributes: Record<string, string | string[]>; // attribute_slug: value_id or value_ids
  images: string[]; // MediaItem IDs
  is_default: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  meta?: unknown;
}

// ======================
// Product Types
// ======================

export interface BaseProduct {
  // Core Identifiers
  id: string;
  sku?: string;
  name: string;
  slug: string;
  type: ProductClassification;
  status: ProductStatus;
  
  // Descriptions
  description?: string;
  short_description?: string;
  
  // Categories & Tags
  categories: string[]; // Category IDs
  tags: string[]; // Tag IDs
  
  // Media
  media: string[]; // MediaItem IDs
  featured_image?: string; // MediaItem ID
  
  // Attributes
  attributes: {
    id: string; // Attribute ID
    values: string[]; // Value IDs
    visible: boolean;
    variation: boolean;
  }[];
  
  // Pricing
  prices: RegionPrice[];
  
  // Inventory
  inventory: InventoryItem[];
  manage_stock: boolean;
  stock_status: StockStatus;
  backorders: BackorderStatus;
  
  // Shipping
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  
  // Tax
  tax_status: TaxStatus;
  tax_class?: string;
  
  // SEO
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  
  // Organization
  branch_id: string;
  created_at: string;
  updated_at: string;
  
  // System
  meta?: unknown;
}

export interface PhysicalProduct extends BaseProduct {
  type: 'physical';
  has_dimensions: boolean;
  has_weight: boolean;
  is_fragile: boolean;
  is_dangerous: boolean;
}

export interface DigitalProduct extends BaseProduct {
  type: 'digital';
  download_limit?: number;
  download_expiry_days?: number;
  download_files: Array<{
    id: string;
    name: string;
    file: string; // URL or file path
    access_type: 'download' | 'stream' | 'external';
  }>;
}

export interface ServiceProduct extends BaseProduct {
  type: 'service';
  duration?: number; // in minutes
  is_remote: boolean;
  location?: {
    type: 'physical' | 'virtual';
    address?: string;
    coordinates?: [number, number];
    url?: string;
  };
  availability?: {
    days: number[]; // 0-6 (Sunday-Saturday)
    time_slots: Array<{
      start: string; // HH:MM
      end: string; // HH:MM
    }>;
  };
}

export interface SubscriptionProduct extends BaseProduct {
  type: 'subscription';
  billing_cycle: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  billing_interval: number;
  trial_period_days?: number;
  signup_fee?: number;
  cancellation_period_days?: number;
}

export interface RentalProduct extends BaseProduct {
  type: 'rental';
  min_rental_days: number;
  max_rental_days?: number;
  requires_deposit: boolean;
  deposit_amount?: number;
  is_deposit_refundable: boolean;
  booking_lead_time?: number; // in hours
}

export interface EventProduct extends BaseProduct {
  type: 'event';
  start_date: string; // ISO date
  end_date: string; // ISO date
  timezone: string;
  location: {
    name: string;
    address: string;
    coordinates?: [number, number];
    is_virtual: boolean;
    url?: string;
  };
  capacity?: number;
  is_recurring: boolean;
  recurrence_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    end_date?: string; // ISO date
    occurrences?: number;
    by_day?: string[]; // For weekly/monthly patterns
  };
}

export interface BundleProduct extends BaseProduct {
  type: 'bundle';
  bundled_products: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    discount?: number;
    is_optional: boolean;
  }>;
  bundle_price_type: 'fixed' | 'dynamic';
  bundle_discount?: number;
}

export type Product = PhysicalProduct | DigitalProduct | ServiceProduct | SubscriptionProduct | RentalProduct | EventProduct | BundleProduct;

// ======================
// Form Schemas
// ======================

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'time' | 'datetime' | 'file' | 'color' | 'rich_text' | 'switch' | 'slider';
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  visible: boolean;
  default_value?: unknown;
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  validation?: {
    pattern?: string;
    min_length?: number;
    max_length?: number;
    custom_message?: string;
  };
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
    value: unknown;
  };
  depends_on?: string[];
  meta?: unknown;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: string[]; // Field IDs
  is_visible: boolean;
  depends_on?: unknown;
}

export interface ProductFormSchema {
  id: string;
  name: string;
  description?: string;
  fields: Record<string, FormField>;
  sections: FormSection[];
  field_order: string[];
  created_at: string;
  updated_at: string;
}

// ======================
// Product Creation/Edit
// ======================

export interface ProductFormData {
  classification: ProductClassification;
  category_id?: string;
  subcategory_id?: string;
  attributes: unknown;
  pricing: {
    base_price: number;
    sale_price?: number;
    cost?: number;
    tax_status: TaxStatus;
    tax_class?: string;
  };
  inventory: {
    sku?: string;
    barcode?: string;
    manage_stock: boolean;
    stock_quantity?: number;
    stock_status: StockStatus;
    backorders: BackorderStatus;
    low_stock_threshold?: number;
  };
  shipping: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    shipping_class?: string;
  };
  seo: {
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
    meta_robots?: string;
    canonical_url?: string;
  };
  media: string[]; // MediaItem IDs
  variations?: unknown;
  custom_fields?:unknown;
}
