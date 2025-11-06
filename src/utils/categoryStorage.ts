import { Category, CustomField } from '@/types/categories';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

export const categoryStorage = {
  // Get all categories from API
  async getCategories(): Promise<Category[]> {
    try {
      const response = await apiGet<Category[]>('/categories');
      return response || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  },

  // Add a new category via API
  async addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    try {
      const response = await apiPost<Category>('/categories', {
        name: category.name,
        description: category.description,
        customFields: category.customFields,
      });
      return response;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  // Update an existing category via API
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    try {
      const response = await apiPut<Category>(`/categories/${id}`, {
        name: updates.name,
        description: updates.description,
        customFields: updates.customFields,
      });
      return response;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  // Delete a category via API
  async deleteCategory(id: string): Promise<boolean> {
    try {
      await apiDelete(`/categories/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  },

  // Get a single category by ID via API
  async getCategory(id: string): Promise<Category | null> {
    try {
      const response = await apiGet<Category>(`/categories/${id}`);
      return response;
    } catch (error) {
      console.error('Error loading category:', error);
      return null;
    }
  },

  // Get category fields
  async getCategoryFields(categoryId: string): Promise<CustomField[]> {
    try {
      const response = await apiGet<CustomField[]>(`/categories/${categoryId}/fields`);
      return response || [];
    } catch (error) {
      console.error('Error loading category fields:', error);
      return [];
    }
  },
};
