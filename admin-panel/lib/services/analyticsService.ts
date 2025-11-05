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

export interface DeviceInfo {
  id: number;
  deviceId: string;
  platform: string;
  osVersion: string;
  screenSize: string;
  browser: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  totalEvents?: number;
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

  // Behavior Analytics - Get screen view times
  getScreenViews: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/screen-views');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting screen views:', error);
      return { success: true, data: [] };
    }
  },

  // Behavior Analytics - Get scroll depth
  getScrollDepth: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/scroll-depth');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting scroll depth:', error);
      return { success: true, data: [] };
    }
  },

  // Behavior Analytics - Get navigation paths
  getNavigationPaths: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/navigation-paths');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting navigation paths:', error);
      return { success: true, data: [] };
    }
  },

  // Behavior Analytics - Get filter usage
  getFilterUsage: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/filter-usage');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting filter usage:', error);
      return { success: true, data: [] };
    }
  },

  // Behavior Analytics - Get sort preferences
  getSortPreferences: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/sort-preferences');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting sort preferences:', error);
      return { success: true, data: [] };
    }
  },

  // Behavior Analytics - Get heatmap data
  getHeatmap: async (screenName?: string) => {
    try {
      const url = screenName 
        ? `/user-data/behavior/heatmap?screenName=${encodeURIComponent(screenName)}`
        : '/user-data/behavior/heatmap';
      const res = await api.get<any>(url);
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting heatmap:', error);
      return { success: true, data: [] };
    }
  },

  // Behavior Analytics - Get back navigation
  getBackNavigation: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/back-navigation');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting back navigation:', error);
      return { success: true, data: [] };
    }
  },

  // Behavior Analytics - Get product interactions
  getProductInteractions: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/product-interactions');
      if (res && res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting product interactions:', error);
      return { success: true, data: [] };
    }
  },

  // Behavior Analytics - Get cart behavior
  getCartBehavior: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/cart-behavior');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting cart behavior:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get payment behavior
  getPaymentBehavior: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/payment-behavior');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting payment behavior:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get user segments
  getUserSegments: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/user-segments');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting user segments:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get performance metrics
  getPerformanceMetrics: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/performance');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get device info
  getDeviceInfo: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/device-info');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting device info:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get notifications
  getNotifications: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/notifications');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get wishlist
  getWishlist: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/wishlist');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting wishlist:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get sessions
  getSessions: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/sessions');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting sessions:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get LTV
  getLTV: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/ltv');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting LTV:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get campaigns
  getCampaigns: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/campaigns');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting campaigns:', error);
      return { success: true, data: {} };
    }
  },

  // Behavior Analytics - Get fraud signals
  getFraudSignals: async () => {
    try {
      const res = await api.get<any>('/user-data/behavior/fraud-signals');
      return res && res.success ? { success: true, data: res.data } : { success: true, data: {} };
    } catch (error) {
      console.error('Error getting fraud signals:', error);
      return { success: true, data: {} };
    }
  },

  // Device Management - Get all devices
  getDevices: async (limit: number = 100, offset: number = 0) => {
    try {
      const res = await api.get<ApiResponse<DeviceInfo[]>>('/user-data/devices', {
        limit,
        offset
      });
      return res && res.success ? { success: true, data: res.data || [] } : { success: true, data: [] };
    } catch (error) {
      console.error('Error getting devices:', error);
      return { success: true, data: [] };
    }
  },

  // Device Analytics - Get device analytics
  getDeviceAnalytics: async (deviceId: string, days: number = 30) => {
    try {
      const res = await api.get<ApiResponse<any>>(`/user-data/behavior/device/${deviceId}`, {
        days
      });
      return res && res.success ? { success: true, data: res.data } : { success: true, data: null };
    } catch (error) {
      console.error('Error getting device analytics:', error);
      return { success: false, data: null };
    }
  },

  // Device Linking - Link device to user
  linkDeviceToUser: async (deviceId: string, userId: number) => {
    try {
      const res = await api.post<ApiResponse<any>>('/user-data/behavior/link-device', {
        deviceId,
        userId
      });
      return res && res.success ? { success: true } : { success: false };
    } catch (error) {
      console.error('Error linking device to user:', error);
      return { success: false };
    }
  },

  // Advanced Analytics - Cohort Analysis
  getCohorts: async (startDate: string, endDate: string, interval: string = 'month') => {
    try {
      const res = await api.get<ApiResponse<any>>('/analytics/cohorts', {
        startDate,
        endDate,
        interval
      });
      return res && res.success ? { success: true, data: res.data || [] } : { success: true, data: [] };
    } catch (error) {
      console.error('Error getting cohorts:', error);
      return { success: true, data: [] };
    }
  },

  getCohortRetention: async (cohort: string, periods: number = 12) => {
    try {
      const res = await api.get<ApiResponse<any>>(`/analytics/cohorts/${cohort}/retention`, {
        periods
      });
      return res && res.success ? { success: true, data: res.data || [] } : { success: true, data: [] };
    } catch (error) {
      console.error('Error getting retention:', error);
      return { success: true, data: [] };
    }
  },

  // Funnel Analysis
  calculateFunnel: async (steps: any[], startDate: string, endDate: string, userId?: number, deviceId?: string) => {
    try {
      const res = await api.post<ApiResponse<any>>('/analytics/funnels/calculate', {
        steps,
        startDate,
        endDate,
        userId,
        deviceId
      });
      return res && res.success ? { success: true, data: res.data || [] } : { success: true, data: [] };
    } catch (error) {
      console.error('Error calculating funnel:', error);
      return { success: true, data: [] };
    }
  },

  // Geospatial Analytics
  getGeographicDistribution: async (startDate: string, endDate: string) => {
    try {
      const res = await api.get<ApiResponse<any>>('/analytics/geographic', {
        startDate,
        endDate
      });
      return res && res.success ? { success: true, data: res.data } : { success: true, data: null };
    } catch (error) {
      console.error('Error getting geographic distribution:', error);
      return { success: false, data: null };
    }
  },

  // Predictive Analytics
  predictChurn: async (userId: number, days: number = 30) => {
    try {
      const res = await api.get<ApiResponse<any>>(`/analytics/predict/churn/${userId}`, {
        days
      });
      return res && res.success ? { success: true, data: res.data } : { success: false, data: null };
    } catch (error) {
      console.error('Error predicting churn:', error);
      return { success: false, data: null };
    }
  },

  predictPurchase: async (userId?: number, deviceId?: string) => {
    try {
      const params: Record<string, string | number | boolean> = {};
      if (userId !== undefined) {
        params.userId = userId;
      }
      if (deviceId !== undefined) {
        params.deviceId = deviceId;
      }
      const res = await api.get<ApiResponse<any>>('/analytics/predict/purchase', params);
      return res && res.success ? { success: true, data: res.data } : { success: false, data: null };
    } catch (error) {
      console.error('Error predicting purchase:', error);
      return { success: false, data: null };
    }
  },

  // Health Monitoring
  getHealthStatus: async () => {
    try {
      const res = await api.get<ApiResponse<any>>('/analytics/health');
      return res && res.success ? { success: true, data: res.data } : { success: false, data: null };
    } catch (error) {
      console.error('Error getting health status:', error);
      return { success: false, data: null };
    }
  },

  getMetrics: async () => {
    try {
      const res = await api.get<ApiResponse<any>>('/analytics/metrics');
      return res && res.success ? { success: true, data: res.data } : { success: false, data: null };
    } catch (error) {
      console.error('Error getting metrics:', error);
      return { success: false, data: null };
    }
  },

  // Real-time Analytics
  getRealtimeMetrics: async () => {
    try {
      const res = await api.get<ApiResponse<any>>('/analytics/realtime/metrics');
      return res && res.success ? { success: true, data: res.data } : { success: false, data: null };
    } catch (error) {
      console.error('Error getting realtime metrics:', error);
      return { success: false, data: null };
    }
  },
};
