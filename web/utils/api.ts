// API Client for Backend Communication
// UZAK SUNUCU: Tüm istekler https://api.plaxsy.com/api'ye gider

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.plaxsy.com/api';

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
    
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
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
  login: async (email: string, password: string) => {
    const client = new ApiClient(API_BASE_URL);
    return client.post('/users/login', { email, password });
  },

  googleLogin: async (idToken: string) => {
    const client = new ApiClient(API_BASE_URL);
    return client.post('/auth/google/verify', { idToken });
  },

  register: async (userData: { name: string; email: string; password: string; phone?: string }) => {
    const client = new ApiClient(API_BASE_URL);
    return client.post('/users', userData);
  },
};

// User API methods
export const userApi = {
  getProfile: async (userId: number) => {
    const client = new ApiClient(API_BASE_URL);
    return client.get(`/users/${userId}`, { requiresAuth: true });
  },

  updateProfile: async (userId: number, data: Partial<{ name: string; email: string; phone: string; address: string; currentPassword?: string; newPassword?: string }>) => {
    const client = new ApiClient(API_BASE_URL);
    return client.put(`/users/${userId}`, data, { requiresAuth: true });
  },
};

// Orders API methods
export const ordersApi = {
  getUserOrders: async (userId: number) => {
    const client = new ApiClient(API_BASE_URL);
    return client.get(`/orders/user/${userId}`, { requiresAuth: true });
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
  }) => {
    const client = new ApiClient(API_BASE_URL);
    return client.post('/orders', orderData, { requiresAuth: true });
  },
};

// Cart API methods
export const cartApi = {
  getCart: async (userId: number) => {
    const client = new ApiClient(API_BASE_URL);
    return client.get(`/cart/user/${userId}`, { requiresAuth: true });
  },

  addToCart: async (cartData: {
    userId: number;
    productId: number;
    quantity: number;
  }) => {
    const client = new ApiClient(API_BASE_URL);
    return client.post('/cart', cartData, { requiresAuth: true });
  },

  updateCartItem: async (cartItemId: number, quantity: number) => {
    const client = new ApiClient(API_BASE_URL);
    return client.put(`/cart/${cartItemId}`, { quantity }, { requiresAuth: true });
  },

  removeFromCart: async (cartItemId: number) => {
    const client = new ApiClient(API_BASE_URL);
    return client.delete(`/cart/${cartItemId}`, { requiresAuth: true });
  },

  clearCart: async (userId: number) => {
    const client = new ApiClient(API_BASE_URL);
    return client.delete(`/cart/user/${userId}`, { requiresAuth: true });
  },
};

// Address API methods
export const addressApi = {
  getAddresses: async (userId: number, addressType?: 'shipping' | 'billing') => {
    const client = new ApiClient(API_BASE_URL);
    const params = addressType ? { userId: userId.toString(), addressType } : { userId: userId.toString() };
    return client.get('/user-addresses', { params, requiresAuth: true });
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
  }) => {
    const client = new ApiClient(API_BASE_URL);
    return client.post('/user-addresses', addressData, { requiresAuth: true });
  },

  updateAddress: async (addressId: number, addressData: Partial<{
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode: string;
    isDefault: boolean;
  }>) => {
    const client = new ApiClient(API_BASE_URL);
    return client.put(`/user-addresses/${addressId}`, addressData, { requiresAuth: true });
  },

  deleteAddress: async (addressId: number) => {
    const client = new ApiClient(API_BASE_URL);
    return client.delete(`/user-addresses/${addressId}`, { requiresAuth: true });
  },

  setDefaultAddress: async (addressId: number) => {
    const client = new ApiClient(API_BASE_URL);
    return client.put(`/user-addresses/${addressId}/set-default`, {}, { requiresAuth: true });
  },
};

// Export default client instance
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

