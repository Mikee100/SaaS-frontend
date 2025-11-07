import { Product, ProductVariation, CreateProductRequest, CreateVariationRequest } from '@/types/products';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

export const productStorage = {
  // Get all products
  async getProducts(): Promise<Product[]> {
    try {
      const response = await apiGet<Product[]>('/products');
      return response || [];
    } catch (error) {
      console.error('Error loading products:', error);
      return [];
    }
  },

  // Get a single product by ID
  async getProduct(id: string): Promise<Product | null> {
    try {
      const response = await apiGet<Product>(`/products/${id}`);
      return response;
    } catch (error) {
      console.error('Error loading product:', error);
      return null;
    }
  },

  // Create a new product
  async createProduct(productData: CreateProductRequest): Promise<Product> {
    try {
      const response = await apiPost<Product>('/products', productData);
      return response;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Update a product
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    try {
      const response = await apiPut<Product>(`/products/${id}`, updates);
      return response;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete a product
  async deleteProduct(id: string): Promise<boolean> {
    try {
      await apiDelete(`/products/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  },

  // Get product variations
  async getProductVariations(productId: string): Promise<ProductVariation[]> {
    try {
      const response = await apiGet<ProductVariation[]>(`/products/${productId}/variations`);
      return response || [];
    } catch (error) {
      console.error('Error loading product variations:', error);
      return [];
    }
  },

  // Create a product variation
  async createVariation(variationData: CreateVariationRequest): Promise<ProductVariation> {
    try {
      const response = await apiPost<ProductVariation>(`/products/${variationData.productId}/variations`, variationData);
      return response;
    } catch (error) {
      console.error('Error creating variation:', error);
      throw error;
    }
  },

  // Update a variation
  async updateVariation(id: string, updates: Partial<ProductVariation>): Promise<ProductVariation | null> {
    try {
      const response = await apiPut<ProductVariation>(`/products/variations/${id}`, updates);
      return response;
    } catch (error) {
      console.error('Error updating variation:', error);
      throw error;
    }
  },

  // Delete a variation
  async deleteVariation(id: string): Promise<boolean> {
    try {
      await apiDelete(`/products/variations/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting variation:', error);
      return false;
    }
  },
};