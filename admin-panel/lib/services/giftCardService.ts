import { api, ApiResponse } from '../api';

export interface GiftCard {
  id: number;
  code: string;
  fromUserId?: number;
  recipient?: string;
  recipientUserId?: number;
  amount: number;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  expiresAt: string;
  usedAt?: string | null;
}

export const giftCardService = {
  list: async () => {
    return api.get<ApiResponse<GiftCard[]>>('/admin/gift-cards');
  },
  create: async (data: { code: string; amount: number; recipient?: string; expiresAt: string }) => {
    return api.post<ApiResponse<{ id: number }>>('/admin/gift-cards', data);
  },
  updateStatus: async (id: number, status: GiftCard['status']) => {
    return api.put<ApiResponse<void>>(`/admin/gift-cards/${id}/status`, { status });
  },
};


