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
