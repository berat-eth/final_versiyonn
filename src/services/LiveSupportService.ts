import apiService from '../utils/api-service';
import { UserController } from '../controllers/UserController';

export interface LiveSupportMessage {
  id: number;
  message: string;
  sender: 'user' | 'admin';
  timestamp: string;
  read?: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  message?: string;
  data?: LiveSupportMessage;
}

export class LiveSupportService {
  /**
   * Canlı destek için mesaj gönder
   */
  static async sendMessage(message: string): Promise<SendMessageResponse> {
    try {
      const userId = await UserController.getCurrentUserId();
      
      if (!userId || userId <= 0) {
        return {
          success: false,
          message: 'Kullanıcı girişi gerekli'
        };
      }

      if (!message || !message.trim()) {
        return {
          success: false,
          message: 'Mesaj boş olamaz'
        };
      }

      const response = await apiService.post<SendMessageResponse>(
        '/chatbot/live-support/message',
        {
          userId,
          message: message.trim()
        }
      );

      return response;
    } catch (error: any) {
      console.error('❌ Live support mesaj gönderme hatası:', error);
      return {
        success: false,
        message: error?.message || 'Mesaj gönderilemedi'
      };
    }
  }

  /**
   * Admin mesajlarını getir (polling için)
   */
  static async getAdminMessages(userId: number, lastMessageId?: number): Promise<LiveSupportMessage[]> {
    try {
      if (!userId || userId <= 0) {
        return [];
      }

      let url = `/chatbot/admin-messages/${userId}`;
      if (lastMessageId) {
        url += `?lastMessageId=${lastMessageId}`;
      }

      const response = await apiService.get<{ success: boolean; data: any[] }>(url);

      if (response.success && response.data && Array.isArray(response.data)) {
        return response.data.map((msg: any) => ({
          id: msg.id,
          message: msg.message || 'Mesaj içeriği yok',
          sender: 'admin' as const,
          timestamp: msg.timestamp || new Date().toISOString(),
          read: msg.read || false
        }));
      }

      return [];
    } catch (error: any) {
      console.error('❌ Admin mesajları getirme hatası:', error);
      return [];
    }
  }

  /**
   * Mesajı okundu olarak işaretle
   */
  static async markMessageAsRead(messageId: number): Promise<boolean> {
    try {
      const response = await apiService.post<{ success: boolean }>(
        `/chatbot/admin-messages/${messageId}/read`,
        {}
      );

      return response.success || false;
    } catch (error: any) {
      console.error('❌ Mesaj okundu işaretleme hatası:', error);
      return false;
    }
  }

  /**
   * Kullanıcının canlı destek mesaj geçmişini getir
   */
  static async getMessageHistory(userId: number): Promise<LiveSupportMessage[]> {
    try {
      if (!userId || userId <= 0) {
        return [];
      }

      const response = await apiService.get<{ success: boolean; data: any[] }>(
        `/chatbot/live-support/history/${userId}`
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        return response.data.map((msg: any) => ({
          id: msg.id,
          message: msg.message || 'Mesaj içeriği yok',
          sender: msg.intent === 'admin_message' ? 'admin' : 'user',
          timestamp: msg.timestamp || new Date().toISOString(),
          read: msg.read || false
        }));
      }

      return [];
    } catch (error: any) {
      console.error('❌ Mesaj geçmişi getirme hatası:', error);
      return [];
    }
  }
}

