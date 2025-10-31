// API Client for Backend Communication
// UZAK SUNUCU: Tüm istekler https://api.plaxsy.com/api'ye gider

import type { ApiResponse, User, Order, CartItem, UserAddress, LoginResponse } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.plaxsy.com/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private getUserId(): string | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id?.toString() || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    let url = `${this.baseUrl}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return url;
  }

  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { params, requiresAuth = false, headers = {}, ...fetchOptions } = options;

    const url = this.buildUrl(endpoint, params);
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': API_KEY, // Backend tenant authentication için gerekli
      ...(headers as Record<string, string>),
    };

    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.message || 'API request failed');
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  async get<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Auth-specific methods
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const client = new ApiClient(API_BASE_URL);
    return client.post<LoginResponse>('/users/login', { email, password });
  },

  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    const client = new ApiClient(API_BASE_URL);
    return client.post<LoginResponse>('/auth/google/verify', { idToken });
  },

  register: async (userData: { name: string; email: string; password: string; phone?: string }): Promise<LoginResponse> => {
    const client = new ApiClient(API_BASE_URL);
    return client.post<LoginResponse>('/users', userData);
  },
};

// User API methods
export const userApi = {
  getProfile: async (userId: number): Promise<ApiResponse<User>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.get<ApiResponse<User>>(`/users/${userId}`, { requiresAuth: true });
  },

  updateProfile: async (userId: number, data: Partial<{ name: string; email: string; phone: string; address: string; currentPassword?: string; newPassword?: string }>): Promise<ApiResponse<User>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.put<ApiResponse<User>>(`/users/${userId}`, data, { requiresAuth: true });
  },
};

// Orders API methods
export const ordersApi = {
  getUserOrders: async (userId: number): Promise<ApiResponse<Order[]>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.get<ApiResponse<Order[]>>(`/orders/user/${userId}`, { requiresAuth: true });
  },

  createOrder: async (orderData: {
    userId: number;
    totalAmount: number;
    status: string;
    shippingAddress: string;
    paymentMethod: string;
    items: Array<{ productId: number; quantity: number; price: number }>;
    city?: string;
    district?: string;
    fullAddress?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }): Promise<ApiResponse<Order>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.post<ApiResponse<Order>>('/orders', orderData, { requiresAuth: true });
  },
};

// Cart API methods
export const cartApi = {
  getCart: async (userId: number): Promise<ApiResponse<CartItem[]>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.get<ApiResponse<CartItem[]>>(`/cart/user/${userId}`, { requiresAuth: true });
  },

  addToCart: async (cartData: {
    userId: number;
    productId: number;
    quantity: number;
  }): Promise<ApiResponse<CartItem>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.post<ApiResponse<CartItem>>('/cart', cartData, { requiresAuth: true });
  },

  updateCartItem: async (cartItemId: number, quantity: number): Promise<ApiResponse<CartItem>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.put<ApiResponse<CartItem>>(`/cart/${cartItemId}`, { quantity }, { requiresAuth: true });
  },

  removeFromCart: async (cartItemId: number): Promise<ApiResponse<void>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.delete<ApiResponse<void>>(`/cart/${cartItemId}`, { requiresAuth: true });
  },

  clearCart: async (userId: number): Promise<ApiResponse<void>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.delete<ApiResponse<void>>(`/cart/user/${userId}`, { requiresAuth: true });
  },
};

// Address API methods
export const addressApi = {
  getAddresses: async (userId: number, addressType?: 'shipping' | 'billing'): Promise<ApiResponse<UserAddress[]>> => {
    const client = new ApiClient(API_BASE_URL);
    const params: Record<string, string | number | boolean> = { userId: userId.toString() };
    if (addressType) {
      params.addressType = addressType;
    }
    return client.get<ApiResponse<UserAddress[]>>('/user-addresses', { params, requiresAuth: true });
  },

  createAddress: async (addressData: {
    userId: number;
    addressType: 'shipping' | 'billing';
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district?: string;
    postalCode?: string;
    isDefault?: boolean;
  }): Promise<ApiResponse<{ id: number }>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.post<ApiResponse<{ id: number }>>('/user-addresses', addressData, { requiresAuth: true });
  },

  updateAddress: async (addressId: number, addressData: Partial<{
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode: string;
    isDefault: boolean;
  }>): Promise<ApiResponse<UserAddress>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.put<ApiResponse<UserAddress>>(`/user-addresses/${addressId}`, addressData, { requiresAuth: true });
  },

  deleteAddress: async (addressId: number): Promise<ApiResponse<void>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.delete<ApiResponse<void>>(`/user-addresses/${addressId}`, { requiresAuth: true });
  },

  setDefaultAddress: async (addressId: number): Promise<ApiResponse<void>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.put<ApiResponse<void>>(`/user-addresses/${addressId}/set-default`, {}, { requiresAuth: true });
  },
};

// Favorites API methods
export const favoritesApi = {
  getUserFavorites: async (userId: number): Promise<ApiResponse<any[]>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.get<ApiResponse<any[]>>(`/favorites/user/${userId}`, { requiresAuth: true });
  },

  addToFavorites: async (userId: number, productId: number): Promise<ApiResponse<{ id: number }>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.post<ApiResponse<{ id: number }>>('/favorites', { userId, productId }, { requiresAuth: true });
  },

  removeFromFavorites: async (favoriteId: number, userId: number): Promise<ApiResponse<void>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.delete<ApiResponse<void>>(`/favorites/${favoriteId}`, { params: { userId }, requiresAuth: true });
  },

  removeFromFavoritesByProduct: async (productId: number, userId: number): Promise<ApiResponse<void>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.delete<ApiResponse<void>>(`/favorites/product/${productId}`, { params: { userId }, requiresAuth: true });
  },
};

// Support Tickets API methods
export const supportApi = {
  getUserTickets: async (userId: number): Promise<ApiResponse<any[]>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.get<ApiResponse<any[]>>(`/support-tickets/user/${userId}`, { requiresAuth: true });
  },

  createTicket: async (ticketData: {
    userId: number;
    subject: string;
    category?: string;
    message: string;
  }): Promise<ApiResponse<{ id: number }>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.post<ApiResponse<{ id: number }>>('/support-tickets', ticketData, { requiresAuth: true });
  },
};

// Custom Production API methods
export const customProductionApi = {
  createRequest: async (requestData: {
    userId: number;
    items: Array<{
      productId: number;
      quantity: number;
      customizations: any;
      productPrice?: number;
    }>;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    companyName?: string;
    taxNumber?: string;
    taxAddress?: string;
    companyAddress?: string;
    notes?: string;
  }): Promise<ApiResponse<{ id: number; requestNumber: string; status: string; totalQuantity: number; totalAmount: number }>> => {
    const client = new ApiClient(API_BASE_URL);
    return client.post<ApiResponse<{ id: number; requestNumber: string; status: string; totalQuantity: number; totalAmount: number }>>('/custom-production-requests', requestData, { requiresAuth: true });
  },
};

// Products API methods
export const productsApi = {
  getProducts: async (page = 1, limit = 20, category?: string): Promise<ApiResponse<{ products: any[]; total: number; hasMore: boolean }>> => {
    const client = new ApiClient(API_BASE_URL);
    const params: Record<string, string | number | boolean> = { page: page.toString(), limit: limit.toString() };
    if (category) {
      params.category = category;
    }
    return client.get<ApiResponse<{ products: any[]; total: number; hasMore: boolean }>>('/products', { params, requiresAuth: true });
  },

  searchProducts: async (query: string, page = 1, limit = 50): Promise<ApiResponse<any[]>> => {
    const client = new ApiClient(API_BASE_URL);
    const params: Record<string, string | number | boolean> = { q: query, page: page.toString(), limit: limit.toString() };
    return client.get<ApiResponse<any[]>>('/products/search', { params, requiresAuth: true });
  },

  getProductById: async (productId: number): Promise<ApiResponse<any>> => {
    const client = new ApiClient(API_BASE_URL);
    // Ürün detayı için user authentication gerekli değil, sadece tenant authentication (API key) yeterli
    return client.get<ApiResponse<any>>(`/products/${productId}`, { requiresAuth: false });
  },

  filterProducts: async (filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
    search?: string;
    tekstilOnly?: boolean;
  }): Promise<ApiResponse<any[]>> => {
    const client = new ApiClient(API_BASE_URL);
    // Ürün listesi için user authentication gerekli değil, sadece tenant authentication (API key) yeterli
    return client.post<ApiResponse<any[]>>('/products/filter', filters, { requiresAuth: false });
  },
};

// Export default client instance
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

