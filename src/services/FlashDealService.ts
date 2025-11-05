import { apiService, ApiResponse } from '../utils/api-service';

export interface FlashDealProduct {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  description?: string;
  stock?: number;
}

export interface FlashDeal {
  id: number;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  products: FlashDealProduct[];
}

export class FlashDealService {
  static async getActiveFlashDeals(): Promise<FlashDeal[]> {
    try {
      console.log('🔄 Calling /api/flash-deals endpoint...');
      const res: ApiResponse<FlashDeal[]> = await apiService.get('/flash-deals');
      console.log('📦 Flash deals API response:', {
        success: res?.success,
        hasData: !!res?.data,
        dataIsArray: Array.isArray(res?.data),
        dataLength: Array.isArray(res?.data) ? res.data.length : 'N/A'
      });
      
      // API response format: { success: true, data: [...] }
      if (res && res.success && res.data) {
        // Eğer res.data bir array ise direkt döndür
        if (Array.isArray(res.data)) {
          console.log('✅ Flash deals loaded:', res.data.length, 'deals');
          if (res.data.length > 0) {
            console.log('📦 First deal:', {
              id: res.data[0].id,
              name: res.data[0].name,
              productsCount: res.data[0].products?.length || 0
            });
          }
          return res.data as FlashDeal[];
        }
        // Eğer res.data içinde data varsa (nested)
        if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray((res.data as any).data)) {
          console.log('✅ Flash deals loaded (nested):', (res.data as any).data.length);
          return (res.data as any).data as FlashDeal[];
        }
      }
      console.warn('⚠️ Flash deals data formatı beklenmedik:', {
        success: res?.success,
        hasData: !!res?.data,
        dataType: typeof res?.data
      });
      return [];
    } catch (error: any) {
      console.error('❌ Flash deal yükleme hatası:', error?.message || error);
      console.error('❌ Error details:', error);
      return [];
    }
  }
}

export default FlashDealService;

