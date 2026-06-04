import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import API_BASE_URL from '@/config/apiConfig';
import type {
  ProductAttribute,
  ProductAttributeValue,
  ProductVariation,
  GenerateVariationsRequest,
  CreateVariationRequest,
  UpdateVariationRequest,
} from '@/types/product-variations';

// Product Attributes API
export const productAttributesApi = {
  // Get all attributes
  async getAll(includeValues: boolean = true): Promise<ProductAttribute[]> {
    return apiGet<ProductAttribute[]>(
      `/product-attributes?includeValues=${includeValues}`,
    );
  },

  // Get common attributes (creates if they don't exist)
  async getOrCreateCommon(): Promise<ProductAttribute[]> {
    return apiGet<ProductAttribute[]>('/product-attributes/common');
  },

  // Get single attribute
  async getOne(id: string): Promise<ProductAttribute> {
    return apiGet<ProductAttribute>(`/product-attributes/${id}`);
  },

  // Create attribute
  async create(data: {
    name: string;
    displayName?: string;
    type?: string;
    values?: Array<{
      value: string;
      displayName?: string;
      color?: string;
      image?: string;
      sortOrder?: number;
    }>;
  }): Promise<ProductAttribute> {
    return apiPost<ProductAttribute>('/product-attributes', data);
  },

  // Update attribute
  async update(
    id: string,
    data: {
      displayName?: string;
      type?: string;
      isActive?: boolean;
    },
  ): Promise<ProductAttribute> {
    return apiPut<ProductAttribute>(`/product-attributes/${id}`, data);
  },

  // Delete attribute
  async delete(id: string): Promise<void> {
    return apiDelete(`/product-attributes/${id}`);
  },

  // Add value to attribute
  async addValue(
    attributeId: string,
    data: {
      value: string;
      displayName?: string;
      color?: string;
      image?: string;
      sortOrder?: number;
    },
  ): Promise<ProductAttributeValue> {
    return apiPost<ProductAttributeValue>(
      `/product-attributes/${attributeId}/values`,
      data,
    );
  },

  // Update attribute value
  async updateValue(
    valueId: string,
    data: {
      value?: string;
      displayName?: string;
      color?: string;
      image?: string;
      sortOrder?: number;
    },
  ): Promise<ProductAttributeValue> {
    return apiPut<ProductAttributeValue>(
      `/product-attributes/values/${valueId}`,
      data,
    );
  },

  // Delete attribute value
  async deleteValue(valueId: string): Promise<void> {
    return apiDelete(`/product-attributes/values/${valueId}`);
  },
};

// Product Variations API
export const productVariationsApi = {
  // Get variations for a product
  async getByProduct(productId: string): Promise<ProductVariation[]> {
    return apiGet<ProductVariation[]>(`/products/${productId}/variations`);
  },

  // Create a single variation
  async create(
    productId: string,
    data: CreateVariationRequest,
  ): Promise<ProductVariation> {
    return apiPost<ProductVariation>(
      `/products/${productId}/variations`,
      data,
    );
  },

  // Generate variations from attributes
  async generate(
    productId: string,
    data: GenerateVariationsRequest,
  ): Promise<{
    productId: string;
    generated: number;
    variations: ProductVariation[];
  }> {
    return apiPost(
      `/products/${productId}/generate-variations`,
      data,
    );
  },

  // Update variation
  async update(
    variationId: string,
    data: UpdateVariationRequest,
  ): Promise<ProductVariation> {
    return apiPut<ProductVariation>(
      `/products/variations/${variationId}`,
      data,
    );
  },

  // Delete variation
  async delete(variationId: string): Promise<void> {
    return apiDelete(`/products/variations/${variationId}`);
  },

  async uploadImages(
    variationId: string,
    files: File[],
    branchId?: string,
  ): Promise<ProductVariation> {
    const payload = new FormData();
    files.forEach((file) => payload.append('images', file));

    const response = await fetch(
      `${API_BASE_URL}/products/variations/${variationId}/upload-images`,
      {
        method: 'POST',
        credentials: 'include',
        headers: branchId ? { 'x-branch-id': branchId } : undefined,
        body: payload,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to upload variation images');
    }

    return response.json() as Promise<ProductVariation>;
  },

  async deleteImage(
    variationId: string,
    imageUrl: string,
    branchId?: string,
  ): Promise<ProductVariation> {
    const response = await fetch(
      `${API_BASE_URL}/products/variations/${variationId}/delete-image`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(branchId ? { 'x-branch-id': branchId } : {}),
        },
        body: JSON.stringify({ imageUrl }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete variation image');
    }

    return response.json() as Promise<ProductVariation>;
  },

  async setPrimaryImage(
    variationId: string,
    imageUrl: string,
    currentImages: string[],
    branchId?: string,
  ): Promise<ProductVariation> {
    const reordered = [imageUrl, ...currentImages.filter((item) => item !== imageUrl)];
    return apiPut<ProductVariation>(`/products/variations/${variationId}`, {
      images: reordered,
    }, branchId ? { 'x-branch-id': branchId } : undefined);
  },
};

