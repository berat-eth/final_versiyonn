import { apiService } from '../utils/api-service';
import { UserController } from '../controllers/UserController';

export interface PurchaseVerification {
  hasPurchased: boolean;
  orderId?: number;
  purchaseDate?: string;
  orderStatus?: string;
  productVariations?: any[];
}

export class PurchaseVerificationService {
  /**
   * Kullanıcının belirli bir ürünü satın alıp almadığını kontrol eder
   */
  static async verifyPurchase(productId: number): Promise<PurchaseVerification> {
    try {
      const userId = await UserController.getCurrentUserId();
      if (!userId) {
        return { hasPurchased: false };
      }

      // API'den kullanıcının siparişlerini kontrol et
      const response = await apiService.get(`/users/${userId}/purchases/${productId}`);
      
      if (response.success && response.data) {
        return {
          hasPurchased: true,
          orderId: response.data.orderId,
          purchaseDate: response.data.purchaseDate,
          orderStatus: response.data.orderStatus,
          productVariations: response.data.productVariations || []
        };
      }

      return { hasPurchased: false };
    } catch (error) {
      console.error('Error verifying purchase:', error);
      return { hasPurchased: false };
    }
  }

  /**
   * Kullanıcının tüm satın aldığı ürünleri getirir
   */
  static async getUserPurchases(): Promise<number[]> {
    try {
      const userId = await UserController.getCurrentUserId();
      if (!userId) {
        return [];
      }

      const response = await apiService.get(`/users/${userId}/purchases`);
      
      if (response.success && response.data) {
        return response.data.map((purchase: any) => purchase.productId);
      }

      return [];
    } catch (error) {
      console.error('Error getting user purchases:', error);
      return [];
    }
  }

  /**
   * Kullanıcının belirli bir ürün için yorum yapıp yapamayacağını kontrol eder
   */
  static async canUserReview(productId: number): Promise<{
    canReview: boolean;
    reason?: string;
    purchaseInfo?: PurchaseVerification;
  }> {
    try {
      const purchaseInfo = await this.verifyPurchase(productId);
      
      if (!purchaseInfo.hasPurchased) {
        return {
          canReview: false,
          reason: 'Bu ürünü satın almadığınız için yorum yapamazsınız.',
          purchaseInfo
        };
      }

      // Sipariş durumu kontrolü
      if (purchaseInfo.orderStatus && !['delivered', 'completed'].includes(purchaseInfo.orderStatus)) {
        return {
          canReview: false,
          reason: 'Siparişiniz henüz teslim edilmediği için yorum yapamazsınız.',
          purchaseInfo
        };
      }

      return {
        canReview: true,
        purchaseInfo
      };
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return {
        canReview: false,
        reason: 'Yorum yapma yetkinizi kontrol ederken bir hata oluştu.'
      };
    }
  }

  /**
   * Offline modda cache'den satın alma bilgilerini kontrol eder
   */
  static async getCachedPurchases(): Promise<number[]> {
    try {
      // Offline modda basit bir cache sistemi
      // Gerçek implementasyon için AsyncStorage kullanılabilir
      return [];
    } catch (error) {
      console.error('Error getting cached purchases:', error);
      return [];
    }
  }

  /**
   * Satın alma bilgilerini cache'e kaydeder
   */
  static async cachePurchases(productIds: number[]): Promise<void> {
    try {
      // Offline modda basit bir cache sistemi
      // Gerçek implementasyon için AsyncStorage kullanılabilir
      console.log('Caching purchases:', productIds);
    } catch (error) {
      console.error('Error caching purchases:', error);
    }
  }
}
