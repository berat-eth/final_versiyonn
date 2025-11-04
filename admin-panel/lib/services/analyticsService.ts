import { api, ApiResponse } from '../api';

export interface AnalyticsStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth?: number;
  ordersGrowth?: number;
  customersGrowth?: number;
}

export interface MonthlyData {
  month: string;
  monthLabel?: string;
  gelir: number;
  gider: number;
  kar: number;
  orders?: number;
  customers?: number;
}

export interface CustomerBehavior {
  category: string;
  value: number;
}

export interface CategoryPerformance {
  name: string;
  satis: number;
  siparisler: number;
  kar: number;
  stok: number;
}

export interface CustomerSegment {
  segment: string;
  count: number;
  revenue: number;
  avgOrder: number;
  color: string;
}

export interface ConversionMetrics {
  conversionRate: string;
  lastMonthConversionRate: string;
  avgCartValue: string;
  lastMonthAvgCartValue: string;
  avgCLV: string;
  lastMonthAvgCLV: string;
}

export const analyticsService = {
  // Get dashboard stats (admin endpoints)
  getStats: async () => {
    try {
      const [ordersRes, usersRes] = await Promise.all([
        api.get<ApiResponse<any[]>>('/admin/orders', { page: 1, limit: 1000 }),
        api.get<ApiResponse<any[]>>('/admin/users', { page: 1, limit: 1000 })
      ]);

      const stats: AnalyticsStats = {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: 0,
      };

      if (ordersRes && (ordersRes as any).success && (ordersRes as any).data) {
        const orders = (ordersRes as any).data as any[];
        stats.totalOrders = orders.length;
        stats.totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      }

      if (usersRes && (usersRes as any).success && (usersRes as any).data) {
        const users = (usersRes as any).data as any[];
        stats.totalCustomers = users.length;
      }

      return { success: true, data: stats };
    } catch (error) {
      // Admin uçları okunamazsa güvenli defaults
      const fallback: AnalyticsStats = {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: 0,
      };
      return { success: true, data: fallback };
    }
  },

  // Get monthly revenue and expenses data
  getMonthlyData: async (months: number = 12) => {
    try {
      const res = await api.get<ApiResponse<MonthlyData[]>>(`/admin/analytics/monthly?months=${months}`);
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting monthly data:', error);
      return { success: true, data: [] };
    }
  },

  // Get customer behavior analytics
  getCustomerBehavior: async () => {
    try {
      const res = await api.get<ApiResponse<CustomerBehavior[]>>('/admin/analytics/customer-behavior');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting customer behavior:', error);
      return { success: true, data: [] };
    }
  },

  // Get category performance
  getCategoryPerformance: async (months: number = 6) => {
    try {
      const res = await api.get<ApiResponse<CategoryPerformance[]>>(`/admin/analytics/category-performance?months=${months}`);
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting category performance:', error);
      return { success: true, data: [] };
    }
  },

  // Get customer segments
  getCustomerSegments: async () => {
    try {
      const res = await api.get<ApiResponse<CustomerSegment[]>>('/admin/analytics/customer-segments');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting customer segments:', error);
      return { success: true, data: [] };
    }
  },

  // Get conversion metrics
  getConversionMetrics: async () => {
    try {
      const res = await api.get<ApiResponse<ConversionMetrics>>('/admin/analytics/conversion');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { 
        success: true, 
        data: {
          conversionRate: '0',
          lastMonthConversionRate: '0',
          avgCartValue: '0',
          lastMonthAvgCartValue: '0',
          avgCLV: '0',
          lastMonthAvgCLV: '0'
        }
      };
    } catch (error) {
      console.error('Error getting conversion metrics:', error);
      return { 
        success: true, 
        data: {
          conversionRate: '0',
          lastMonthConversionRate: '0',
          avgCartValue: '0',
          lastMonthAvgCartValue: '0',
          avgCLV: '0',
          lastMonthAvgCLV: '0'
        }
      };
    }
  },
};
