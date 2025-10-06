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
  revenue: number;
  orders: number;
  customers: number;
}

export const analyticsService = {
  // Get dashboard stats
  getStats: async () => {
    // Backend'de analytics endpoint'i yoksa, mevcut endpoint'lerden veri toplayabiliriz
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get<ApiResponse<{ total: number }>>('/products', { page: 1, limit: 1 }),
        api.get<ApiResponse<any[]>>('/orders/user/1') // Geçici: uygun admin endpoint yoksa kullanıcı 1
      ]);

      const stats: AnalyticsStats = {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: productsRes.data?.total || 0,
      };

      if (ordersRes.success && ordersRes.data) {
        stats.totalOrders = ordersRes.data.length;
        stats.totalRevenue = ordersRes.data.reduce((sum, order) => sum + order.totalAmount, 0);
      }

      return { success: true, data: stats };
    } catch (error) {
      throw error;
    }
  },

  // Get monthly data
  getMonthlyData: async () => {
    try {
      // Varsayılan bir analytics endpoint'i denenir; yoksa boş döner
      const res = await api.get<ApiResponse<MonthlyData[]>>('/analytics/monthly');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch {
      return { success: true, data: [] };
    }
  },
};
