import { api, ApiResponse, CartItem } from '../api';

export interface AddToCartData {
  userId: number;
  productId: number;
  quantity: number;
  variationString?: string;
  selectedVariations?: Record<string, string>;
  deviceId?: string;
}

export const cartService = {
  // Get all carts (admin)
  getAllCarts: async () => {
    // Backend'de admin endpoint'i yoksa, kullanıcı listesini alıp her birinin sepetini çekebiliriz
    return api.get<ApiResponse<Array<{
      userId: number;
      userName: string;
      userEmail: string;
      items: CartItem[];
      total: number;
    }>>>('/admin/carts');
  },

  // Get cart items (server route: GET /api/cart/:userId)
  getCart: async (userId: number, deviceId?: string) => {
    try {
      return await api.get<ApiResponse<CartItem[]>>(`/cart/${userId}`, deviceId ? { deviceId } : {});
    } catch (e) {
      // backward compatibility: older path
      return api.get<ApiResponse<CartItem[]>>(`/cart/user/${userId}`, deviceId ? { deviceId } : {});
    }
  },

  // Add to cart
  addToCart: async (data: AddToCartData) => {
    return api.post<ApiResponse<{ cartItemId: number; quantity: number }>>('/cart', data);
  },

  // Update cart item
  updateCartItem: async (cartItemId: number, quantity: number) => {
    return api.put<ApiResponse<void>>(`/cart/${cartItemId}`, { quantity });
  },

  // Remove from cart
  removeFromCart: async (cartItemId: number) => {
    return api.delete<ApiResponse<void>>(`/cart/${cartItemId}`);
  },

  // Clear cart
  clearCart: async (userId: number, deviceId?: string) => {
    return api.delete<ApiResponse<void>>(`/cart/user/${userId}${deviceId ? `?deviceId=${deviceId}` : ''}`);
  },

  // Get cart total (server route: GET /api/cart/user/:userId/total)
  getCartTotal: async (userId: number, deviceId?: string) => {
    return api.get<ApiResponse<number>>(`/cart/user/${userId}/total`, deviceId ? { deviceId } : {});
  },

  // Get cart total detailed
  getCartTotalDetailed: async (userId: number, deviceId?: string) => {
    return api.get<ApiResponse<{
      subtotal: number;
      discount: number;
      shipping: number;
      total: number;
    }>>(`/cart/user/${userId}/total-detailed`, deviceId ? { deviceId } : {});
  },
};
