import { api, ApiResponse, Product } from '../api';

export const productService = {
  // Get categories (string[])
  getCategories: async () => {
    return api.get<ApiResponse<string[]>>('/categories');
  },
  // Get products with pagination
  getProducts: async (page = 1, limit = 20) => {
    return api.get<ApiResponse<{ products: Product[]; total: number; hasMore: boolean }>>(
      '/products',
      { page, limit }
    );
  },

  // Search products
  searchProducts: async (query: string, page = 1, limit = 50) => {
    return api.get<ApiResponse<Product[]>>('/products/search', { q: query, page, limit });
  },

  // Get product by ID
  getProductById: async (productId: number) => {
    return api.get<ApiResponse<Product>>(`/products/${productId}`);
  },

  // Get products by category
  getProductsByCategory: async (category: string, page = 1, limit = 40) => {
    return api.get<ApiResponse<{ products: Product[]; total: number; hasMore: boolean }>>(
      `/products/category/${category}`,
      { page, limit }
    );
  },

  // Get product variations
  getProductVariations: async (productId: number) => {
    return api.get<ApiResponse<any[]>>(`/products/${productId}/variations`);
  },

  // Filter products
  filterProducts: async (filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
    search?: string;
  }) => {
    return api.post<ApiResponse<Product[]>>('/products/filter', filters);
  },

  // Get price range
  getPriceRange: async () => {
    return api.get<ApiResponse<{ min: number; max: number }>>('/products/price-range');
  },
};
