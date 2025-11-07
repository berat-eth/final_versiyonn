import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { CartItem } from '../utils/types';
import { CartController } from '../controllers/CartController';
import { UserController } from '../controllers/UserController';
import { DiscountWheelController, DiscountCode } from '../controllers/DiscountWheelController';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { useAppContext } from '../contexts/AppContext';
import { CartShareButtons } from '../components/CartShareButtons';
import { behaviorAnalytics } from '../services/BehaviorAnalytics';
import FlashDealService, { FlashDeal } from '../services/FlashDealService';

interface CartScreenProps {
  navigation: any;
}

interface DeliveryAddress {
  id: number;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state?: string;
  postalCode: string;
  isDefault: boolean;
  addressType?: string;
}

export const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const { updateCart, state } = useAppContext();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    type: string;
    value: number;
  } | null>(null);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  

  useEffect(() => {
    loadCart();
    loadFlashDeals();
    const unsubscribe = navigation.addListener('focus', () => {
      loadCart();
      loadFlashDeals();
    });
    return unsubscribe;
  }, [navigation]);

  const loadFlashDeals = useCallback(async () => {
    try {
      const deals = await FlashDealService.getActiveFlashDeals();
      setFlashDeals(deals || []);
    } catch (error) {
      console.error('Error loading flash deals:', error);
      setFlashDeals([]);
    }
  }, []);

  // Helper function to get flash deal discount for a product
  const getFlashDealDiscount = useCallback((productId: number, productPrice?: number): { 
    discountType: 'percentage' | 'fixed' | null;
    discountValue: number;
    originalPrice: number;
    discountedPrice: number;
  } => {
    if (!flashDeals || flashDeals.length === 0) {
      return { discountType: null, discountValue: 0, originalPrice: 0, discountedPrice: 0 };
    }

    const nowTs = Date.now();
    
    for (const deal of flashDeals) {
      if (!deal.products || !Array.isArray(deal.products)) continue;
      
      const dealProduct = deal.products.find((p: any) => p.id === productId);
      if (!dealProduct) continue;

      // Check if deal is active
      const endDate = deal.end_date ? new Date(deal.end_date).getTime() : 0;
      const startDate = deal.start_date ? new Date(deal.start_date).getTime() : 0;
      
      if (nowTs < startDate || nowTs > endDate) continue;
      if (!deal.is_active) continue;

      const discountType = deal.discount_type || 'percentage';
      const discountValue = Number(deal.discount_value) || 0;
      // Use provided productPrice if available, otherwise use dealProduct.price
      const currentPrice = productPrice || dealProduct.price || 0;

      if (currentPrice <= 0) continue;

      let originalPrice = currentPrice;
      let discountedPrice = currentPrice;

      if (discountType === 'percentage') {
        if (discountValue > 0 && discountValue < 100) {
          discountedPrice = currentPrice * (1 - discountValue / 100);
          originalPrice = currentPrice;
        }
      } else if (discountType === 'fixed') {
        if (discountValue > 0) {
          discountedPrice = Math.max(0, currentPrice - discountValue);
          originalPrice = currentPrice;
        }
      }

      return { discountType, discountValue, originalPrice, discountedPrice };
    }

    return { discountType: null, discountValue: 0, originalPrice: 0, discountedPrice: 0 };
  }, [flashDeals]);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      const userIdValue = await UserController.getCurrentUserId(); // Get current user ID
      
      // Giriş durumunu kontrol et
      const loggedIn = await UserController.isLoggedIn();
      setIsAuthenticated(loggedIn);
      
      // Giriş yapmamış kullanıcılar için boş sepet göster
      if (!userIdValue || userIdValue <= 0) {
        setCartItems([]);
        setDiscountCodes([]);
        updateCart({
          items: [],
          total: 0,
          itemCount: 0,
          lastUpdated: new Date().toISOString(),
        });
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const [items, codes] = await Promise.all([
        CartController.getCartItems(userIdValue),
        DiscountWheelController.getUserDiscountCodes(userIdValue)
      ]);
      // CartScreen loadCart
      setCartItems(items || []);
      setDiscountCodes(codes || []);
      
      // Update global context
      const subtotal = CartController.calculateSubtotal(items || []);
      const itemCount = (items || []).reduce((total, item) => total + item.quantity, 0);
      // CartScreen updating context
      updateCart({
        items: items || [],
        total: subtotal,
        itemCount,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error loading cart:', error);
      Alert.alert('Hata', 'Sepet yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateCart]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCart();
  }, [loadCart]);

  // Discount code functions
  const handleApplyDiscountCode = async () => {
    if (!discountCode.trim()) {
      Alert.alert('Hata', 'Lütfen bir indirim kodu girin');
      return;
    }

    try {
      const userId = await UserController.getCurrentUserId();
      const subtotal = CartController.calculateSubtotal(cartItems);
      
      // Kupon deneme tracking
      behaviorAnalytics.trackPaymentAction('coupon_try', discountCode.trim());
      
      const result = await DiscountWheelController.validateDiscountCode(
        discountCode.trim(),
        userId,
        subtotal
      );

      if (result.success && result.data) {
        setAppliedDiscount({
          code: discountCode.trim(),
          amount: result.data.discountAmount,
          type: result.data.discountType,
          value: result.data.discountValue
        });
        
      // Kupon başarılı tracking
      behaviorAnalytics.trackPaymentAction('coupon_success', discountCode.trim(), 'success');
      
      // User segment güncelle - kupon kullanımı
      behaviorAnalytics.calculateUserSegments();
      
      Alert.alert('Başarılı', `${result.data.discountAmount.toFixed(2)} TL indirim uygulandı!`);
      } else {
        // Kupon başarısız tracking
        const failReason = result.message?.includes('geçersiz') ? 'invalid' : 
                          result.message?.includes('süresi') ? 'expired' : 'failed';
        behaviorAnalytics.trackPaymentAction('coupon_fail', discountCode.trim(), failReason);
        
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('Error applying discount code:', error);
      Alert.alert('Hata', 'İndirim kodu uygulanırken hata oluştu');
    }
  };

  const handleRemoveDiscountCode = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  const calculateTotal = () => {
    // Calculate subtotal with flash deal discounts
    let subtotal = 0;
    cartItems.forEach(item => {
      if (item.product) {
        const flashDiscount = getFlashDealDiscount(item.product.id, item.product.price);
        const itemPrice = flashDiscount.discountedPrice > 0 
          ? flashDiscount.discountedPrice 
          : item.product.price;
        subtotal += itemPrice * item.quantity;
      }
    });
    
    const discount = appliedDiscount ? appliedDiscount.amount : 0;
    return Math.max(0, subtotal - discount);
  };

  const handleUpdateQuantity = useCallback(async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    // ⚡ OPTIMIZASYON: Optimistik UI güncellemesi
    const oldItems = [...cartItems];
    const itemIndex = cartItems.findIndex(item => item.id === cartItemId);
    
    if (itemIndex === -1) return;
    
    const oldItem = oldItems[itemIndex];
    const oldQuantity = oldItem.quantity;
    
    // Önce UI'ı güncelle (anında tepki)
    const updatedItems = [...cartItems];
    if (newQuantity === 0) {
      updatedItems.splice(itemIndex, 1);
    } else {
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: newQuantity };
    }
    setCartItems(updatedItems);
    
    // Context'i hemen güncelle
    const subtotal = CartController.calculateSubtotal(updatedItems);
    const itemCount = updatedItems.reduce((total, item) => total + item.quantity, 0);
    updateCart({
      items: updatedItems,
      total: subtotal,
      itemCount,
      lastUpdated: new Date().toISOString(),
    });
    
    // Sepet davranışı tracking
    if (oldItem && oldItem.product) {
      const oldSubtotal = CartController.calculateSubtotal(oldItems);
      const oldItemCount = oldItems.reduce((total, item) => total + item.quantity, 0);
      behaviorAnalytics.trackCartAction(
        newQuantity === 0 ? 'remove' : 'update_quantity',
        oldItem.product.id,
        newQuantity,
        oldItemCount,
        oldSubtotal,
        oldQuantity
      );
    }
    
    setUpdatingItems(prev => new Set(prev.add(cartItemId)));
    
    try {
      // Arkaplanda API çağrısı yap
      const result = await CartController.updateQuantity(cartItemId, newQuantity);
      if (!result.success) {
        // Hata varsa geri al
        setCartItems(oldItems);
        const oldSubtotal = CartController.calculateSubtotal(oldItems);
        const oldItemCount = oldItems.reduce((total, item) => total + item.quantity, 0);
        updateCart({
          items: oldItems,
          total: oldSubtotal,
          itemCount: oldItemCount,
          lastUpdated: new Date().toISOString(),
        });
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      // Hata varsa geri al
      setCartItems(oldItems);
      const oldSubtotal = CartController.calculateSubtotal(oldItems);
      const oldItemCount = oldItems.reduce((total, item) => total + item.quantity, 0);
      updateCart({
        items: oldItems,
        total: oldSubtotal,
        itemCount: oldItemCount,
        lastUpdated: new Date().toISOString(),
      });
      console.error('Error updating quantity:', error);
      Alert.alert('Hata', 'Miktar güncellenirken bir hata oluştu');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(cartItemId);
        return newSet;
      });
    }
  }, [cartItems, updateCart]);

  const handleRemoveFromCart = useCallback(async (cartItemId: number, productName: string) => {
    Alert.alert(
      'Ürünü Kaldır',
      `"${productName}" ürününü sepetinizden kaldırmak istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            // ⚡ OPTIMIZASYON: Optimistik UI güncellemesi
            const oldItems = [...cartItems];
            const removedItem = cartItems.find(item => item.id === cartItemId);
            const updatedItems = cartItems.filter(item => item.id !== cartItemId);
            
            // Önce UI'ı güncelle (anında tepki)
            setCartItems(updatedItems);
            
            // Context'i hemen güncelle
            const subtotal = CartController.calculateSubtotal(updatedItems);
            const itemCount = updatedItems.reduce((total, item) => total + item.quantity, 0);
            updateCart({
              items: updatedItems,
              total: subtotal,
              itemCount,
              lastUpdated: new Date().toISOString(),
            });
            
            // Sepet davranışı tracking
            if (removedItem && removedItem.product) {
              const oldSubtotal = CartController.calculateSubtotal(oldItems);
              const oldItemCount = oldItems.reduce((total, item) => total + item.quantity, 0);
              behaviorAnalytics.trackCartAction(
                'remove',
                removedItem.product.id,
                0,
                oldItemCount,
                oldSubtotal,
                removedItem.quantity,
                undefined,
                undefined,
                'user_removed' // Varsayılan neden
              );
            }
            
            setUpdatingItems(prev => new Set(prev.add(cartItemId)));
            
            try {
              // Arkaplanda API çağrısı yap
              const result = await CartController.removeFromCart(cartItemId);
              if (result.success) {
                // Başarılı - UI zaten güncellenmiş
              } else {
                // Hata varsa geri al
                setCartItems(oldItems);
                const oldSubtotal = CartController.calculateSubtotal(oldItems);
                const oldItemCount = oldItems.reduce((total, item) => total + item.quantity, 0);
                updateCart({
                  items: oldItems,
                  total: oldSubtotal,
                  itemCount: oldItemCount,
                  lastUpdated: new Date().toISOString(),
                });
                Alert.alert('Hata', result.message);
              }
            } catch (error) {
              // Hata varsa geri al
              setCartItems(oldItems);
              const oldSubtotal = CartController.calculateSubtotal(oldItems);
              const oldItemCount = oldItems.reduce((total, item) => total + item.quantity, 0);
              updateCart({
                items: oldItems,
                total: oldSubtotal,
                itemCount: oldItemCount,
                lastUpdated: new Date().toISOString(),
              });
              console.error('Error removing from cart:', error);
              Alert.alert('Hata', 'Ürün kaldırılırken bir hata oluştu');
            } finally {
              setUpdatingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(cartItemId);
                return newSet;
              });
            }
          }
        }
      ]
    );
  }, [cartItems, updateCart]);


  const handleCheckout = useCallback(() => {
    if (cartItems.length === 0) return;
    
    const subtotal = CartController.calculateSubtotal(cartItems);
    const shipping = CartController.calculateShipping(subtotal);
    const total = CartController.calculateTotal(subtotal, shipping);
    
    navigation.navigate('Order', {
      cartItems,
      subtotal,
      shipping,
      total,
      checkoutStartTime: Date.now() // Checkout başlangıç zamanı
    });
  }, [cartItems, navigation]);

  const cartSummary = useCallback(() => {
    // Calculate subtotal with flash deal discounts
    let subtotal = 0;
    let flashDiscountTotal = 0;
    
    cartItems.forEach(item => {
      if (item.product) {
        const flashDiscount = getFlashDealDiscount(item.product.id, item.product.price);
        if (flashDiscount.discountedPrice > 0) {
          subtotal += flashDiscount.discountedPrice * item.quantity;
          flashDiscountTotal += (flashDiscount.originalPrice - flashDiscount.discountedPrice) * item.quantity;
        } else {
          subtotal += item.product.price * item.quantity;
        }
      }
    });
    
    const shipping = CartController.calculateShipping(subtotal);
    const discount = appliedDiscount ? appliedDiscount.amount : 0;
    const total = CartController.calculateTotal(subtotal, shipping) - discount;
    const hpayBonus = Math.max(0, Number((total * 0.03).toFixed(2)));
    return { subtotal, shipping, discount, total, hpayBonus, flashDiscountTotal };
  }, [cartItems, appliedDiscount, getFlashDealDiscount]);

  const renderCartItem = useCallback(({ item }: { item: CartItem }) => {
    const isUpdating = updatingItems.has(item.id);
    const flashDiscount = item.product ? getFlashDealDiscount(item.product.id, item.product.price) : null;
    const productPrice = item.product?.price || 0;
    const displayPrice = flashDiscount && flashDiscount.discountedPrice > 0 
      ? flashDiscount.discountedPrice 
      : productPrice;
    const originalPrice = flashDiscount && flashDiscount.originalPrice > 0 
      ? flashDiscount.originalPrice 
      : null;
    const itemHpay = Math.max(0, Number(((displayPrice * item.quantity) * 0.03).toFixed(2)));
    const hasFlashDiscount = flashDiscount && flashDiscount.discountedPrice > 0 && flashDiscount.discountedPrice < flashDiscount.originalPrice;
    
    return (
      <View style={styles.cartItemWrapper}>
        <View style={styles.cartItemRow}>
          {/* Product Image */}
          <View style={styles.productImageWrapper}>
            <Image 
              source={{ uri: item.product?.image || 'https://via.placeholder.com/150x150?text=No+Image' }} 
              style={styles.productImage}
              resizeMode="cover"
            />
            {isUpdating && (
              <View style={styles.loadingOverlay}>
                <Icon name="refresh" size={14} color={Colors.primary} />
              </View>
            )}
            {hasFlashDiscount && (
              <View style={styles.flashBadge}>
                <Text style={styles.flashBadgeText}>
                  {flashDiscount.discountType === 'percentage' 
                    ? `%${Math.round(flashDiscount.discountValue)}`
                    : `${flashDiscount.discountValue.toFixed(0)} TL`}
                </Text>
              </View>
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productDetails}>
            <View style={styles.productHeader}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.product?.name || 'Ürün'}
              </Text>
            </View>
            
            {item.variationString && (
              <Text style={styles.productVariation}>
                {item.variationString}
              </Text>
            )}
            
            <View style={styles.priceContainer}>
              {hasFlashDiscount && originalPrice && (
                <Text style={styles.originalPrice}>
                  {(Number(originalPrice) || 0).toFixed(0)} TL
                </Text>
              )}
              <Text style={[styles.productPrice, hasFlashDiscount && styles.discountedPrice]}>
                {(Number(displayPrice) || 0).toFixed(0)} TL
              </Text>
            </View>
            <Text style={styles.hpayItemNote}>
              Hpay+ kazanım: +{itemHpay.toFixed(2)} TL
            </Text>
          </View>

          {/* Quantity Controls */}
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.quantityBtn, item.quantity <= 1 && styles.quantityBtnDisabled]}
              onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
              disabled={isUpdating}
            >
              <Icon 
                name="remove" 
                size={16} 
                color={item.quantity <= 1 ? Colors.textMuted : Colors.primary} 
              />
            </TouchableOpacity>
            
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
              disabled={isUpdating}
            >
              <Icon name="add" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Delete Button (far right) */}
          <View style={styles.deleteWrapper}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFromCart(item.id, item.product?.name || 'Ürün')}
              disabled={isUpdating}
            >
              <Icon 
                name="delete-outline" 
                size={20} 
                color={isUpdating ? Colors.textMuted : '#FF6B6B'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [updatingItems, handleUpdateQuantity, getFlashDealDiscount]);


  const renderDiscountCodeSection = useCallback(() => {
    if (cartItems.length === 0) return null;

    return (
      <View style={styles.discountSection}>
        <View style={styles.discountHeader}>
          <Text style={styles.discountTitle}>🏷️ İndirim Kodu</Text>
          {discountCodes.length > 0 && (
            <TouchableOpacity
              style={styles.myCodesButton}
              onPress={() => setShowDiscountModal(true)}
            >
              <Text style={styles.myCodesText}>Kodlarım</Text>
            </TouchableOpacity>
          )}
        </View>

        {appliedDiscount ? (
          <View style={styles.appliedDiscountCard}>
            <View style={styles.appliedDiscountInfo}>
              <Icon name="check-circle" size={20} color="#28a745" />
              <Text style={styles.appliedDiscountCode}>{appliedDiscount.code}</Text>
              <Text style={styles.appliedDiscountAmount}>
                -{appliedDiscount.amount.toFixed(2)} TL
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeDiscountButton}
              onPress={handleRemoveDiscountCode}
            >
              <Icon name="close" size={16} color="#dc3545" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.discountInputContainer}>
            <View style={styles.discountInputWrapper}>
              <Icon name="local-offer" size={20} color="#666" style={styles.discountInputIcon} />
              <TextInput
                style={styles.discountInput}
                placeholder="İndirim kodunuzu girin"
                value={discountCode}
                onChangeText={setDiscountCode}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyDiscountCode}
            >
              <Text style={styles.applyButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [cartItems.length, discountCodes.length, appliedDiscount, discountCode, handleApplyDiscountCode, handleRemoveDiscountCode]);


  const renderSummary = useCallback(() => {
    const { subtotal, shipping, discount, total, hpayBonus, flashDiscountTotal } = cartSummary();

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ara Toplam</Text>
            <Text style={styles.summaryValue}>{(Number(subtotal) || 0).toFixed(0)} TL</Text>
          </View>
          
          {flashDiscountTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>Flash İndirim</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{(Number(flashDiscountTotal) || 0).toFixed(0)} TL
              </Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kargo</Text>
            <Text style={styles.summaryValue}>
              {Number(shipping) === 0 ? 'Ücretsiz' : `${(Number(shipping) || 0).toFixed(0)} TL`}
            </Text>
          </View>
          
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>İndirim Kodu</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{(Number(discount) || 0).toFixed(0)} TL
              </Text>
            </View>
          )}
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Hpay+ Kazanım (%3)</Text>
            <View style={styles.hpayBadgeRow}>
              <Icon name="star" size={16} color="#a855f7" />
              <Text style={[styles.summaryValue, styles.hpayValue]}>
                +{(Number(hpayBonus) || 0).toFixed(2)} TL
              </Text>
            </View>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalValue}>{(Number(total) || 0).toFixed(0)} TL</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.continueShoppingButton,
            (cartItems.length === 0) && styles.continueShoppingButtonDisabled
          ]}
          onPress={() => navigation.navigate('Products')}
          disabled={cartItems.length === 0}
        >
          <Text style={styles.continueShoppingButtonText}>Alışverişe Devam Et</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.checkoutButton,
            (cartItems.length === 0) && styles.checkoutButtonDisabled
          ]}
          onPress={handleCheckout}
          disabled={cartItems.length === 0}
        >
          <LinearGradient
            colors={(cartItems.length === 0) 
              ? ['#6c757d', '#495057'] 
              : ['#667eea', '#764ba2']
            }
            style={styles.checkoutButtonGradient}
          >
            <Text style={styles.checkoutButtonText}>Siparişi Tamamla</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }, [cartSummary, cartItems.length, handleCheckout, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="shopping-cart" size={80} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Sepetiniz Boş</Text>
            <Text style={styles.emptyMessage}>
              {isAuthenticated 
                ? 'Sepetinizde henüz ürün bulunmuyor.\nAlışverişe başlamak için ürünleri inceleyebilirsiniz.'
                : 'Alışveriş yapabilmek için lütfen giriş yapın veya üye olun.\nSepetinize ürün eklemek için önce hesabınıza giriş yapmalısınız.'}
            </Text>
            {!isAuthenticated && (
              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.shopButtonText}>Giriş Yap / Üye Ol</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.shopButton, 
                { 
                  backgroundColor: isAuthenticated ? Colors.primary : '#6c757d', 
                  marginTop: isAuthenticated ? 0 : 12 
                }
              ]}
              onPress={() => navigation.navigate('Products')}
            >
              <Text style={styles.shopButtonText}>Ürünleri İncele</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      />

      {renderDiscountCodeSection()}
      
      {/* Sepet Paylaşım Bölümü */}
      <CartShareButtons
        cartItems={cartItems.map(item => ({
          id: item.id,
          productName: item.product?.name || 'Ürün',
          price: item.product?.price || 0,
          quantity: item.quantity,
          image: item.product?.image,
        }))}
        totalAmount={calculateTotal()}
        onShareSuccess={(platform, expGained) => {
          console.log(`Sepet paylaşımı başarılı: ${platform}, +${expGained} EXP`);
        }}
      />
      
      {renderSummary()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  
  // Header Styles
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.small,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  couponsContainer: {
    marginTop: Spacing.sm,
  },
  couponsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    paddingLeft: 4,
  },
  couponsList: {
    paddingVertical: 6,
    paddingLeft: 4,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Shadows.small,
  },
  couponLeft: {
    flex: 1,
    paddingRight: 12,
  },
  couponRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  couponCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  couponDesc: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
    maxWidth: 160,
  },
  couponMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  couponMeta: {
    fontSize: 11,
    color: Colors.textLight,
  },
  couponValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
  },
  couponUseBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  couponUseText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  hpayItemNote: {
    marginTop: 2,
    fontSize: 11,
    color: '#a855f7',
    fontWeight: '600',
  },

  // List Content
  listContent: {
    paddingVertical: Spacing.md,
    paddingBottom: 200,
  },

  // Cart Item Styles
  cartItemWrapper: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.small,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  productDetails: {
    flex: 1,
    marginRight: Spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginRight: 8,
    flexWrap: 'nowrap',
  },
  removeButton: {
    padding: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productVariation: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },

  // Quantity Controls
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deleteWrapper: {
    marginLeft: 'auto',
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    ...Shadows.small,
  },
  quantityBtnDisabled: {
    opacity: 0.5,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    paddingHorizontal: Spacing.md,
    minWidth: 40,
    textAlign: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIconContainer: {
    backgroundColor: '#FFFFFF',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: Spacing.md,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxl,
  },
  shopButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    ...Shadows.medium,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Summary Styles
  summaryContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    ...Shadows.large,
    maxHeight: '60%',
  },
  
  // Address Section Styles
  addressSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginLeft: 8,
  },
  selectedAddressContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedAddressGradient: {
    padding: 16,
  },
  selectedAddressContent: {
    // No additional styles needed, content will be styled individually
  },
  selectedAddressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
    lineHeight: 18,
  },
  selectedAddressPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  noAddressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noAddressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  noAddressSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  summaryCard: {
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: Spacing.sm,
  },
  totalRow: {
    paddingVertical: Spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  hpayBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hpayValue: {
    color: '#a855f7',
    fontWeight: '700',
  },
  checkoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Discount Code Styles
  discountSection: {
    backgroundColor: 'white',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.small,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  myCodesButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  myCodesText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  appliedDiscountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  appliedDiscountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appliedDiscountCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
    marginLeft: 8,
    marginRight: 12,
  },
  appliedDiscountAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  removeDiscountButton: {
    padding: 4,
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  discountInputIcon: {
    marginRight: 8,
  },
  discountInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  applyButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  discountLabel: {
    color: '#28a745',
  },
  discountValue: {
    color: '#28a745',
    fontWeight: '600',
  },
  // Flash discount styles
  flashBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  flashBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    color: '#FF4444',
    fontWeight: '700',
  },
  // Continue shopping button
  continueShoppingButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  continueShoppingButtonDisabled: {
    opacity: 0.5,
  },
  continueShoppingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
});