// API Configuration and Utilities
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.zerodaysoftware.tr/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';

interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private getHeaders(customHeaders?: HeadersInit): HeadersInit {
    const base: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      base['X-API-Key'] = this.apiKey;
    }
    return {
      ...base,
      ...customHeaders,
    };
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { params, headers, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: this.getHeaders(headers),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      try {
        const logEntry = {
          method: (fetchOptions.method || 'GET'),
          url,
          status: response.status,
          ok: response.ok,
          time: new Date().toISOString(),
          requestBody: fetchOptions.body ? JSON.parse(String(fetchOptions.body)) : undefined,
          responseBody: data
        };
        if (typeof window !== 'undefined') {
          const logs = JSON.parse(localStorage.getItem('apiLogs') || '[]');
          logs.unshift(logEntry);
          localStorage.setItem('apiLogs', JSON.stringify(logs.slice(0, 200)));
          window.dispatchEvent(new CustomEvent('api-log-updated'));
        }
      } catch {}
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL, API_KEY);

// Type definitions
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  brand: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  stock?: number;
  sku?: string;
}

export interface Order {
  id: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  shippingAddress?: string;
  paymentMethod?: string;
  city?: string;
  district?: string;
  fullAddress?: string;
  items: OrderItem[];
  // Optional fields used by UI
  customer?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: string;
  date?: string;
  payment?: string;
  total?: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  taxNumber?: string;
  trackingNumber?: string;
  cargoCompany?: string;
  cargoStatus?: 'preparing' | 'shipped' | 'in-transit' | 'delivered';
}

export interface OrderItem {
  quantity: number;
  price: number;
  productName: string;
  productImage: string;
}

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
  variationString?: string;
}

export interface WalletTransaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  status: string;
  date: string;
}
