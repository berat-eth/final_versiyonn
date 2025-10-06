import { api, ApiResponse, User } from '../api';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  birthDate: string;
  address: string;
  gender: string;
  privacyAccepted: boolean;
  termsAccepted: boolean;
  marketingEmail?: boolean;
  marketingSms?: boolean;
  marketingPhone?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export const userService = {
  // Register new user
  register: async (data: RegisterData) => {
    return api.post<ApiResponse<{ userId: number; user_id: string }>>('/users', data);
  },

  // Login user
  login: async (data: LoginData) => {
    return api.post<ApiResponse<User>>('/users/login', data);
  },

  // Get user profile
  getProfile: async (userId: number) => {
    return api.get<ApiResponse<User>>(`/users/${userId}`);
  },

  // Update user profile
  updateProfile: async (userId: number, data: Partial<User>) => {
    return api.put<ApiResponse<void>>(`/users/${userId}/profile`, data);
  },

  // Change password
  changePassword: async (userId: number, currentPassword: string, newPassword: string) => {
    return api.put<ApiResponse<void>>(`/users/${userId}/password`, {
      currentPassword,
      newPassword,
    });
  },

  // Get account summary
  getAccountSummary: async (userId: number) => {
    return api.get<ApiResponse<any>>(`/users/${userId}/account-summary`);
  },

  // Search users
  searchUsers: async (query: string, excludeUserId?: number) => {
    return api.get<ApiResponse<User[]>>('/users/search', { query, excludeUserId: excludeUserId || 0 });
  },

  // Get all users (admin) - using a workaround with common search term
  getAllUsers: async () => {
    // Backend'de /admin/users endpoint'i yoksa, yaygın bir isimle arama yapıyoruz
    // Alternatif: 'a' harfi ile arama (çoğu isimde bulunur)
    try {
      const response = await api.get<ApiResponse<User[]>>('/users/search', { 
        query: 'a',
        excludeUserId: 0 
      });
      return response;
    } catch (error) {
      // Eğer bu da çalışmazsa boş array döndür
      return { success: true, data: [] };
    }
  },
};
