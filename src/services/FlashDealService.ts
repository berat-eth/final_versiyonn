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
      const res: ApiResponse<FlashDeal[]> = await apiService.get('/flash-deals');
      if (res && res.success && Array.isArray(res.data)) {
        return res.data as FlashDeal[];
      }
      return [];
    } catch (error) {
      console.error('Flash deal yükleme hatası:', error);
      return [];
    }
  }
}

export default FlashDealService;

