interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
}

const seedDefaultCategories = async () => {
  try {
    const selectedBranchId = typeof window !== 'undefined' ? localStorage.getItem('selectedBranchId') : null;
    const headers: Record<string, string> = selectedBranchId ? { 'x-branch-id': selectedBranchId } : {};
    
    // Helper function to make API requests
    const apiRequest = async <T>(url: string, method: string, data?: any): Promise<T> => {
      const fullUrl = `http://localhost:4000${url}`;
      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return response.json();
    };
    
    // Top-level categories
    const shoesCategory = await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Shoes',
      description: 'Footwear for all occasions'
    });

    const bagsCategory = await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Bags',
      description: 'Various types of bags and accessories'
    });

    // Subcategories for Shoes
    const converseCategory = await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Converse',
      description: 'Classic Converse shoes',
      parentId: shoesCategory.id
    });

    const nikeCategory = await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Nike',
      description: 'Nike athletic shoes',
      parentId: shoesCategory.id
    });

    // Create bag subcategories
    await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Backpacks',
      description: 'Casual and travel backpacks',
      parentId: bagsCategory.id
    });

    await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Handbags',
      description: 'Elegant handbags and purses',
      parentId: bagsCategory.id
    });

    await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Tote Bags',
      description: 'Casual tote bags',
      parentId: bagsCategory.id
    });

    // Create variations for Converse
    await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Converse Black',
      description: 'Black Converse shoes',
      parentId: converseCategory.id
    });

    await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Converse White',
      description: 'White Converse shoes',
      parentId: converseCategory.id
    });

    // Create variations for Nike
    await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Nike Air',
      description: 'Nike Air series',
      parentId: nikeCategory.id
    });

    await apiRequest<Category>('/products/categories', 'POST', {
      name: 'Nike Jordan',
      description: 'Air Jordan collection',
      parentId: nikeCategory.id
    });

    console.log('Successfully seeded default categories!');
    return true;
  } catch (error) {
    console.error('Error seeding categories:', error);
    return false;
  }
};

// Export for testing
export { seedDefaultCategories };

// Run the script
seedDefaultCategories();
