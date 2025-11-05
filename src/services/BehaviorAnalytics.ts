import { userDataService } from './UserDataService';
import { sendTrackingEvent, getOrCreateDeviceId, startTrackingSession, endTrackingSession, linkDeviceToUser } from '../utils/device-tracking';

export interface ScreenViewData {
  userId: number;
  screenName: string;
  category?: string;
  startTime: number;
  endTime?: number;
  duration?: number; // milliseconds
  timestamp: number;
}

export interface ScrollDepthData {
  userId: number;
  screenName: string;
  scrollDepth: number; // percentage (0-100)
  maxScrollDepth: number;
  scrollEvents: number;
  timestamp: number;
}

export interface NavigationPathData {
  userId: number;
  sessionId: string;
  path: string[]; // Array of screen names in order
  pathDuration: number; // Total time in path (milliseconds)
  timestamp: number;
}

export interface FilterUsageData {
  userId: number;
  screenName: string;
  filterType: string; // 'category', 'price', 'brand', 'rating', etc.
  filterValue: string;
  filterCount: number; // How many times this filter was used
  timestamp: number;
}

export interface SortPreferenceData {
  userId: number;
  screenName: string;
  sortType: string; // 'price_asc', 'price_desc', 'name_asc', 'popularity', etc.
  usageCount: number;
  timestamp: number;
}

export interface HeatMapData {
  userId: number;
  screenName: string;
  elementType: string; // 'button', 'link', 'product', 'image', etc.
  elementId?: string;
  x: number; // X coordinate (0-100 percentage or absolute)
  y: number; // Y coordinate (0-100 percentage or absolute)
  clickCount: number;
  timestamp: number;
}

export interface BackNavigationData {
  userId: number;
  fromScreen: string;
  toScreen: string;
  backCount: number; // How many times user went back to this screen
  timestamp: number;
}

export interface ProductInteractionData {
  userId: number;
  productId: number;
  screenName: string;
  duration?: number; // milliseconds spent on product detail
  zoomCount: number; // Number of zoom actions
  carouselSwipes: number; // Number of carousel image swipes
  descriptionViewed: boolean; // Whether description tab was viewed
  variantSelected: string; // Selected variant (e.g., "Size: L, Color: Red")
  timestamp: number;
}

// 4. Sepet Davranışı
export interface CartBehaviorData {
  userId: number;
  action: 'add' | 'remove' | 'update_quantity' | 'change_size';
  productId: number;
  quantity: number;
  previousQuantity?: number;
  size?: string;
  previousSize?: string;
  reason?: string; // Neden çıkarma (opsiyonel)
  cartItemCount: number; // Sepetteki toplam item sayısı
  cartTotal: number; // Sepet toplam tutarı
  timestamp: number;
}

// 5. Ödeme Davranışı
export interface PaymentBehaviorData {
  userId: number;
  action: 'coupon_try' | 'coupon_success' | 'coupon_fail' | 'installment_select' | 'cart_abandon';
  couponCode?: string;
  couponResult?: 'success' | 'failed' | 'invalid' | 'expired';
  installmentCount?: number;
  abandonStep?: 'cart' | 'checkout' | 'payment' | 'shipping';
  timestamp: number;
}

// 6. Kullanıcı Segment Etiketleri
export interface UserSegmentData {
  userId: number;
  priceSensitivityScore: number; // 0-100
  isQuickDecision: boolean;
  isDiscountHunter: boolean;
  mostCategoryDependency: string;
  isPremiumShopper: boolean;
  timestamp: number;
}

// 7. Performans Ölçümleri
export interface PerformanceData {
  userId: number;
  apiEndpoint: string;
  responseTime: number; // milliseconds
  loadingSpinnerCount: number;
  loadingSpinnerDuration: number; // total milliseconds
  imageLoadTime?: number; // LCP için
  uiFreezeCount: number;
  uiFreezeDuration: number; // total milliseconds
  timestamp: number;
}

// 8. Cihaz & Kullanım Koşulları
export interface DeviceData {
  userId: number;
  ramCapacity?: number; // MB (mobil API ile sınırlı)
  batteryLevel?: number; // 0-100 percent
  networkType: 'wifi' | 'lte' | '5g' | '3g' | '2g' | 'unknown';
  connectionSpeed?: number; // Estimated speed in Mbps
  timestamp: number;
}

// 9. Bildirim Etkileşimleri
export interface NotificationData {
  userId: number;
  action: 'opened' | 'dismissed' | 'swiped_away';
  notificationId?: string;
  notificationType?: string;
  hour: number; // 0-23
  timestamp: number;
}

// 10. Favori / Wishlist Analitiği
export interface WishlistData {
  userId: number;
  action: 'add' | 'remove' | 'purchase';
  productId: number;
  timeToPurchase?: number; // milliseconds from add to purchase
  sizeVariationCount?: number; // Farklı beden arama sayısı
  timestamp: number;
}

// 11. Oturum Analitiği
export interface SessionData {
  userId: number;
  sessionId: string;
  sessionDuration: number; // milliseconds
  pageCount: number;
  totalScrollDepth: number;
  returnFrequency: number; // Haftalık geri geliş sayısı
  timestamp: number;
}

// 12. Kullanıcı Yaşam Döngüsü (LTV)
export interface LTVData {
  userId: number;
  firstPurchaseTime?: number; // milliseconds from registration
  repeatPurchaseInterval?: number; // milliseconds between purchases
  averageBasketValue: number;
  totalPurchases: number;
  timestamp: number;
}

// 13. Kampanya Etkisi
export interface CampaignData {
  userId: number;
  campaignId?: string;
  campaignType: 'banner' | 'voucher' | 'flash_deal';
  action: 'view' | 'click' | 'redeem';
  viewDuration?: number; // milliseconds
  timestamp: number;
}

// 14. Güvenlik & Dolandırıcılık
export interface FraudSignalData {
  userId: number;
  signalType: 'fast_checkout' | 'failed_payment_attempts' | 'ip_location_change';
  value: number; // Count or speed
  ipAddress?: string;
  location?: string;
  previousLocation?: string;
  timestamp: number;
}

class BehaviorAnalytics {
  private static instance: BehaviorAnalytics;
  private screenViews: Map<string, ScreenViewData> = new Map();
  private scrollDepths: Map<string, ScrollDepthData> = new Map();
  private navigationPaths: Map<number, NavigationPathData> = new Map();
  private filterUsage: Map<string, FilterUsageData> = new Map();
  private sortPreferences: Map<string, SortPreferenceData> = new Map();
  private heatMapData: HeatMapData[] = [];
  private backNavigations: Map<string, BackNavigationData> = new Map();
  private productInteractions: Map<string, ProductInteractionData> = new Map();
  private cartBehaviors: CartBehaviorData[] = [];
  private paymentBehaviors: PaymentBehaviorData[] = [];
  private userSegments: Map<number, UserSegmentData> = new Map();
  private performanceMetrics: PerformanceData[] = [];
  private deviceInfo: Map<number, DeviceData> = new Map();
  private notifications: NotificationData[] = [];
  private wishlistData: WishlistData[] = [];
  private sessionData: Map<string, SessionData> = new Map();
  private ltvData: Map<number, LTVData> = new Map();
  private campaignData: CampaignData[] = [];
  private fraudSignals: FraudSignalData[] = [];
  private userId: number | null = null;
  private deviceId: string | null = null;
  private currentSessionId: string | null = null;
  private currentPath: string[] = [];
  private sessionStartTime: number = 0;
  private sessionPageCount: number = 0;

  static getInstance(): BehaviorAnalytics {
    if (!BehaviorAnalytics.instance) {
      BehaviorAnalytics.instance = new BehaviorAnalytics();
      // DeviceId'yi initialize et
      getOrCreateDeviceId().then(deviceId => {
        BehaviorAnalytics.instance.deviceId = deviceId;
      });
    }
    return BehaviorAnalytics.instance;
  }

  async setUserId(userId: number) {
    this.userId = userId;
    
    // DeviceId'yi al veya oluştur
    if (!this.deviceId) {
      this.deviceId = await getOrCreateDeviceId();
    }
    
    // Session başlat
    this.currentSessionId = await startTrackingSession(userId, {
      startTime: Date.now()
    });
    
    this.currentPath = [];
    this.sessionStartTime = Date.now();
    this.sessionPageCount = 0;
    
    // Device'ı user'a bağla (login sonrası)
    if (userId && this.deviceId) {
      linkDeviceToUser(userId).catch(err => {
        console.warn('Device linking hatası:', err);
      });
    }
  }

  // 1. Ekran görüntüleme süreleri
  async startScreenView(screenName: string, category?: string): Promise<void> {
    // DeviceId olmadan çalışmaz - async initialize et
    if (!this.deviceId) {
      getOrCreateDeviceId().then(deviceId => {
        this.deviceId = deviceId;
        this.startScreenView(screenName, category);
      });
      return;
    }

    const key = `${this.deviceId}-${screenName}-${Date.now()}`;
    const screenView: ScreenViewData = {
      userId: this.userId || 0, // 0 anonymous için
      screenName,
      category,
      startTime: Date.now(),
      timestamp: Date.now()
    };

    this.screenViews.set(key, screenView);

    // Navigation path'e ekle
    this.currentPath.push(screenName);
    this.sessionPageCount++;
    this.updateNavigationPath();
  }

  endScreenView(screenName: string): void {
    if (!this.deviceId) return;

    // Son ekran görüntüleme kaydını bul
    let foundKey: string | null = null;
    for (const [key, view] of this.screenViews.entries()) {
      if (key.startsWith(`${this.deviceId}-${screenName}`) && !view.endTime) {
        foundKey = key;
        break;
      }
    }

    if (foundKey) {
      const view = this.screenViews.get(foundKey)!;
      view.endTime = Date.now();
      view.duration = view.endTime - view.startTime;

      // Veriyi kaydet
      this.logScreenView(view);
      this.screenViews.delete(foundKey);
    }
  }

  // 2. Scroll derinliği
  trackScrollDepth(screenName: string, scrollDepth: number): void {
    if (!this.deviceId) {
      getOrCreateDeviceId().then(deviceId => {
        this.deviceId = deviceId;
        this.trackScrollDepth(screenName, scrollDepth);
      });
      return;
    }

    const key = `${this.deviceId}-${screenName}`;
    let scrollData = this.scrollDepths.get(key);

    if (!scrollData) {
      scrollData = {
        userId: this.userId || 0, // 0 anonymous için
        screenName,
        scrollDepth: 0,
        maxScrollDepth: 0,
        scrollEvents: 0,
        timestamp: Date.now()
      };
      this.scrollDepths.set(key, scrollData);
    }

    scrollData.scrollDepth = scrollDepth;
    scrollData.maxScrollDepth = Math.max(scrollData.maxScrollDepth, scrollDepth);
    scrollData.scrollEvents++;
    scrollData.timestamp = Date.now();
  }

  // Scroll derinliğini kaydet (sayfa değiştiğinde)
  flushScrollDepth(screenName: string): void {
    if (!this.userId) return;

    const key = `${this.userId}-${screenName}`;
    const scrollData = this.scrollDepths.get(key);

    if (scrollData && scrollData.maxScrollDepth > 0) {
      this.logScrollDepth(scrollData);
      this.scrollDepths.delete(key);
    }
  }

  // 3. Sayfa geçiş yolları (navigation path)
  private updateNavigationPath(): void {
    if (!this.userId || !this.currentSessionId) return;

    const pathData: NavigationPathData = {
      userId: this.userId,
      sessionId: this.currentSessionId,
      path: [...this.currentPath],
      pathDuration: Date.now() - (this.navigationPaths.get(this.userId)?.timestamp || Date.now()),
      timestamp: Date.now()
    };

    this.navigationPaths.set(this.userId, pathData);
  }

  trackNavigation(fromScreen: string, toScreen: string): void {
    if (!this.userId) return;

    this.currentPath.push(toScreen);
    this.updateNavigationPath();
  }

  // 4. Filtre kullanım oranı
  trackFilterUsage(screenName: string, filterType: string, filterValue: string): void {
    if (!this.userId) return;

    const key = `${this.userId}-${screenName}-${filterType}-${filterValue}`;
    let filterData = this.filterUsage.get(key);

    if (!filterData) {
      filterData = {
        userId: this.userId,
        screenName,
        filterType,
        filterValue,
        filterCount: 0,
        timestamp: Date.now()
      };
      this.filterUsage.set(key, filterData);
    }

    filterData.filterCount++;
    filterData.timestamp = Date.now();

    // Anında kaydet
    this.logFilterUsage(filterData);
  }

  // 5. Sıralama seçenekleri tercihleri
  trackSortPreference(screenName: string, sortType: string): void {
    if (!this.userId) return;

    const key = `${this.userId}-${screenName}-${sortType}`;
    let sortData = this.sortPreferences.get(key);

    if (!sortData) {
      sortData = {
        userId: this.userId,
        screenName,
        sortType,
        usageCount: 0,
        timestamp: Date.now()
      };
      this.sortPreferences.set(key, sortData);
    }

    sortData.usageCount++;
    sortData.timestamp = Date.now();

    // Anında kaydet
    this.logSortPreference(sortData);
  }

  // 6. Tıklama ısı yoğunluğu (heat mapping)
  trackClickHeatMap(
    screenName: string,
    elementType: string,
    x: number,
    y: number,
    elementId?: string
  ): void {
    if (!this.userId) return;

    // Mevcut heatmap kaydını bul veya yeni oluştur
    const existingIndex = this.heatMapData.findIndex(
      (h) =>
        h.userId === this.userId &&
        h.screenName === screenName &&
        h.elementType === elementType &&
        h.elementId === elementId &&
        Math.abs(h.x - x) < 5 && // Aynı bölgeye yakın tıklamalar
        Math.abs(h.y - y) < 5
    );

    if (existingIndex >= 0) {
      this.heatMapData[existingIndex].clickCount++;
      this.heatMapData[existingIndex].timestamp = Date.now();
    } else {
      const heatMapData: HeatMapData = {
        userId: this.userId,
        screenName,
        elementType,
        elementId,
        x,
        y,
        clickCount: 1,
        timestamp: Date.now()
      };
      this.heatMapData.push(heatMapData);
    }

    // Her 10 tıklamada bir batch gönder
    if (this.heatMapData.length >= 10) {
      this.flushHeatMapData();
    }
  }

  // Heatmap verilerini toplu gönder
  flushHeatMapData(): void {
    if (this.heatMapData.length === 0) return;

    const dataToSend = [...this.heatMapData];
    this.heatMapData = [];

    dataToSend.forEach((data) => {
      this.logHeatMap(data);
    });
  }

  // 7. Geri dönülen sayfalar
  trackBackNavigation(fromScreen: string, toScreen: string): void {
    if (!this.userId) return;

    const key = `${this.userId}-${fromScreen}-${toScreen}`;
    let backNavData = this.backNavigations.get(key);

    if (!backNavData) {
      backNavData = {
        userId: this.userId,
        fromScreen,
        toScreen,
        backCount: 0,
        timestamp: Date.now()
      };
      this.backNavigations.set(key, backNavData);
    }

    backNavData.backCount++;
    backNavData.timestamp = Date.now();

    // Anında kaydet
    this.logBackNavigation(backNavData);

    // Navigation path'ten çıkar
    const toScreenIndex = this.currentPath.lastIndexOf(toScreen);
    if (toScreenIndex >= 0) {
      this.currentPath = this.currentPath.slice(0, toScreenIndex + 1);
      this.updateNavigationPath();
    }
  }

  // 8. Ürün etkileşim derinliği
  startProductInteraction(productId: number, screenName: string = 'ProductDetail'): void {
    if (!this.userId) return;

    const key = `${this.userId}-${productId}`;
    const interaction: ProductInteractionData = {
      userId: this.userId,
      productId,
      screenName,
      zoomCount: 0,
      carouselSwipes: 0,
      descriptionViewed: false,
      variantSelected: '',
      timestamp: Date.now()
    };

    this.productInteractions.set(key, interaction);
  }

  trackProductZoom(productId: number): void {
    if (!this.userId) return;

    const key = `${this.userId}-${productId}`;
    const interaction = this.productInteractions.get(key);

    if (interaction) {
      interaction.zoomCount++;
      interaction.timestamp = Date.now();
    } else {
      // Eğer başlangıç kaydı yoksa, yeni oluştur
      this.startProductInteraction(productId);
      const newInteraction = this.productInteractions.get(key);
      if (newInteraction) {
        newInteraction.zoomCount = 1;
      }
    }
  }

  trackProductCarouselSwipe(productId: number): void {
    if (!this.userId) return;

    const key = `${this.userId}-${productId}`;
    const interaction = this.productInteractions.get(key);

    if (interaction) {
      interaction.carouselSwipes++;
      interaction.timestamp = Date.now();
    } else {
      // Eğer başlangıç kaydı yoksa, yeni oluştur
      this.startProductInteraction(productId);
      const newInteraction = this.productInteractions.get(key);
      if (newInteraction) {
        newInteraction.carouselSwipes = 1;
      }
    }
  }

  trackProductDescriptionView(productId: number, viewed: boolean = true): void {
    if (!this.userId) return;

    const key = `${this.userId}-${productId}`;
    const interaction = this.productInteractions.get(key);

    if (interaction) {
      interaction.descriptionViewed = viewed;
      interaction.timestamp = Date.now();
    } else {
      // Eğer başlangıç kaydı yoksa, yeni oluştur
      this.startProductInteraction(productId);
      const newInteraction = this.productInteractions.get(key);
      if (newInteraction) {
        newInteraction.descriptionViewed = viewed;
      }
    }
  }

  trackProductVariantSelection(productId: number, variantString: string): void {
    if (!this.userId) return;

    const key = `${this.userId}-${productId}`;
    const interaction = this.productInteractions.get(key);

    if (interaction) {
      interaction.variantSelected = variantString;
      interaction.timestamp = Date.now();
    } else {
      // Eğer başlangıç kaydı yoksa, yeni oluştur
      this.startProductInteraction(productId);
      const newInteraction = this.productInteractions.get(key);
      if (newInteraction) {
        newInteraction.variantSelected = variantString;
      }
    }
  }

  endProductInteraction(productId: number, duration?: number): void {
    if (!this.userId) return;

    const key = `${this.userId}-${productId}`;
    const interaction = this.productInteractions.get(key);

    if (interaction) {
      if (duration !== undefined) {
        interaction.duration = duration;
      }
      interaction.timestamp = Date.now();

      // Veriyi kaydet
      this.logProductInteraction(interaction);
      this.productInteractions.delete(key);
    }
  }

  // Session bitişinde tüm verileri gönder
  flushAllData(): void {
    // Tüm scroll depth verilerini kaydet
    this.scrollDepths.forEach((data) => {
      this.logScrollDepth(data);
    });
    this.scrollDepths.clear();

    // Navigation path'i kaydet
    this.navigationPaths.forEach((data) => {
      this.logNavigationPath(data);
    });
    this.navigationPaths.clear();

    // Heatmap verilerini gönder
    this.flushHeatMapData();
  }

  // Backend'e veri gönderme fonksiyonları
  private async logScreenView(data: ScreenViewData) {
    try {
      // Yeni tracking sistemi ile gönder
      if (this.deviceId) {
        await sendTrackingEvent('screen_view', {
          screenName: data.screenName,
          category: data.category,
          duration: data.duration || 0,
          startTime: data.startTime,
          endTime: data.endTime
        }, this.userId || null, this.currentSessionId);
      }
      
      // Eski sistem (backward compatibility)
      if (data.userId && data.userId > 0) {
        await userDataService.logUserActivity({
          userId: data.userId,
          activityType: 'screen_view',
          activityData: data
        });
      }
    } catch (error) {
      console.warn('⚠️ Screen view logging failed:', error);
    }
  }

  private async logScrollDepth(data: ScrollDepthData) {
    try {
      // Yeni tracking sistemi ile gönder
      if (this.deviceId) {
        await sendTrackingEvent('scroll_depth', {
          screenName: data.screenName,
          maxScrollDepth: data.maxScrollDepth,
          scrollEvents: data.scrollEvents
        }, this.userId || null, this.currentSessionId);
      }
      
      // Eski sistem (backward compatibility)
      if (data.userId && data.userId > 0) {
        await userDataService.logUserActivity({
          userId: data.userId,
          activityType: 'scroll_depth',
          activityData: data
        });
      }
    } catch (error) {
      console.warn('⚠️ Scroll depth logging failed:', error);
    }
  }

  private async logNavigationPath(data: NavigationPathData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'navigation_path',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Navigation path logging failed:', error);
    }
  }

  private async logFilterUsage(data: FilterUsageData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'filter_usage',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Filter usage logging failed:', error);
    }
  }

  private async logSortPreference(data: SortPreferenceData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'sort_preference',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Sort preference logging failed:', error);
    }
  }

  private async logHeatMap(data: HeatMapData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'heatmap_click',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Heatmap logging failed:', error);
    }
  }

  private async logBackNavigation(data: BackNavigationData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'back_navigation',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Back navigation logging failed:', error);
    }
  }

  private async logProductInteraction(data: ProductInteractionData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'product_interaction',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Product interaction logging failed:', error);
    }
  }

  // 4. Sepet Davranışı
  trackCartAction(
    action: 'add' | 'remove' | 'update_quantity' | 'change_size',
    productId: number,
    quantity: number,
    cartItemCount: number,
    cartTotal: number,
    previousQuantity?: number,
    size?: string,
    previousSize?: string,
    reason?: string
  ): void {
    if (!this.userId) return;

    const cartData: CartBehaviorData = {
      userId: this.userId,
      action,
      productId,
      quantity,
      previousQuantity,
      size,
      previousSize,
      reason,
      cartItemCount,
      cartTotal,
      timestamp: Date.now()
    };

    this.cartBehaviors.push(cartData);
    this.logCartBehavior(cartData);
  }

  // 5. Ödeme Davranışı
  trackPaymentAction(
    action: 'coupon_try' | 'coupon_success' | 'coupon_fail' | 'installment_select' | 'cart_abandon',
    couponCode?: string,
    couponResult?: 'success' | 'failed' | 'invalid' | 'expired',
    installmentCount?: number,
    abandonStep?: 'cart' | 'checkout' | 'payment' | 'shipping'
  ): void {
    if (!this.userId) return;

    const paymentData: PaymentBehaviorData = {
      userId: this.userId,
      action,
      couponCode,
      couponResult,
      installmentCount,
      abandonStep,
      timestamp: Date.now()
    };

    this.paymentBehaviors.push(paymentData);
    this.logPaymentBehavior(paymentData);
  }

  // 6. Kullanıcı Segment Etiketleri
  updateUserSegment(data: Partial<UserSegmentData>): void {
    if (!this.userId) return;

    const key = this.userId;
    let segment = this.userSegments.get(key);

    if (!segment) {
      segment = {
        userId: this.userId,
        priceSensitivityScore: 50,
        isQuickDecision: false,
        isDiscountHunter: false,
        mostCategoryDependency: '',
        isPremiumShopper: false,
        timestamp: Date.now()
      };
    }

    Object.assign(segment, data);
    segment.timestamp = Date.now();
    this.userSegments.set(key, segment);
    this.logUserSegment(segment);
  }

  // Otomatik user segment scoring - davranışlara göre hesapla
  calculateUserSegments(): void {
    if (!this.userId) return;

    // Fiyat duyarlılık skoru hesapla
    const couponTries = this.paymentBehaviors.filter(p => p.action === 'coupon_try').length;
    const couponSuccesses = this.paymentBehaviors.filter(p => p.action === 'coupon_success').length;
    const flashDealViews = this.campaignData.filter(c => c.campaignType === 'flash_deal' && c.action === 'view').length;
    
    // Fiyat duyarlılık: kupon kullanımı ve flash deal görüntüleme artırır
    let priceSensitivity = 50;
    priceSensitivity += Math.min(30, couponTries * 5); // Her kupon denemesi +5
    priceSensitivity += Math.min(20, couponSuccesses * 10); // Her başarılı kupon +10
    priceSensitivity += Math.min(20, flashDealViews * 2); // Her flash deal görüntüleme +2
    priceSensitivity = Math.min(100, Math.max(0, priceSensitivity));

    // Hızlı karar veren kullanıcı - kısa sürede sepete ekleme
    const quickAdds = this.cartBehaviors.filter(c => {
      // Son 10 dakikada sepete eklenen ürünler
      return c.action === 'add' && (Date.now() - c.timestamp) < 600000;
    }).length;
    const isQuickDecision = quickAdds >= 3; // 10 dakikada 3+ ürün ekleme

    // İndirim avcısı - sık kupon deneme ve flash deal görüntüleme
    const isDiscountHunter = couponTries >= 3 || flashDealViews >= 5;

    // Premium alışveriş eğilimi - yüksek fiyatlı ürün satın alma
    const highValueOrders = this.ltvData.get(this.userId);
    const avgBasketValue = highValueOrders?.averageBasketValue || 0;
    const isPremiumShopper = avgBasketValue > 1000; // Ortalama sepet değeri 1000 TL üzeri

    // Kategori bağımlılığı - en çok görüntülenen kategori
    const categoryViews = new Map<string, number>();
    this.screenViews.forEach((view) => {
      if (view.category) {
        categoryViews.set(view.category, (categoryViews.get(view.category) || 0) + 1);
      }
    });
    let mostCategory = '';
    let maxViews = 0;
    categoryViews.forEach((views, category) => {
      if (views > maxViews) {
        maxViews = views;
        mostCategory = category;
      }
    });

    this.updateUserSegment({
      priceSensitivityScore: priceSensitivity,
      isQuickDecision,
      isDiscountHunter,
      mostCategoryDependency: mostCategory,
      isPremiumShopper
    });
  }

  // 7. Performans Ölçümleri
  trackPerformance(
    apiEndpoint: string,
    responseTime: number,
    loadingSpinnerCount: number = 0,
    loadingSpinnerDuration: number = 0,
    imageLoadTime?: number,
    uiFreezeCount: number = 0,
    uiFreezeDuration: number = 0
  ): void {
    if (!this.userId) return;

    const perfData: PerformanceData = {
      userId: this.userId,
      apiEndpoint,
      responseTime,
      loadingSpinnerCount,
      loadingSpinnerDuration,
      imageLoadTime,
      uiFreezeCount,
      uiFreezeDuration,
      timestamp: Date.now()
    };

    this.performanceMetrics.push(perfData);
    // Her 10 metrikte bir batch gönder
    if (this.performanceMetrics.length >= 10) {
      this.flushPerformanceMetrics();
    }
  }

  // 8. Cihaz & Kullanım Koşulları
  updateDeviceInfo(data: Partial<DeviceData>): void {
    if (!this.userId) return;

    const key = this.userId;
    let device = this.deviceInfo.get(key);

    if (!device) {
      device = {
        userId: this.userId,
        networkType: 'unknown',
        timestamp: Date.now()
      };
    }

    Object.assign(device, data);
    device.timestamp = Date.now();
    this.deviceInfo.set(key, device);
    this.logDeviceInfo(device);
  }

  // 9. Bildirim Etkileşimleri
  trackNotification(
    action: 'opened' | 'dismissed' | 'swiped_away',
    notificationId?: string,
    notificationType?: string
  ): void {
    if (!this.userId) return;

    const notifData: NotificationData = {
      userId: this.userId,
      action,
      notificationId,
      notificationType,
      hour: new Date().getHours(),
      timestamp: Date.now()
    };

    this.notifications.push(notifData);
    this.logNotification(notifData);
  }

  // 10. Favori / Wishlist Analitiği
  trackWishlist(
    action: 'add' | 'remove' | 'purchase',
    productId: number,
    timeToPurchase?: number,
    sizeVariationCount?: number
  ): void {
    if (!this.userId) return;

    const wishlistData: WishlistData = {
      userId: this.userId,
      action,
      productId,
      timeToPurchase,
      sizeVariationCount,
      timestamp: Date.now()
    };

    this.wishlistData.push(wishlistData);
    this.logWishlist(wishlistData);
  }

  // 11. Oturum Analitiği
  async endSession(totalScrollDepth: number = 0): Promise<void> {
    if (!this.currentSessionId) return;

    const sessionDuration = Date.now() - this.sessionStartTime;

    // Yeni tracking sistemi ile session bitir
    if (this.deviceId && this.currentSessionId) {
      await endTrackingSession(
        this.currentSessionId,
        sessionDuration,
        this.sessionPageCount,
        totalScrollDepth,
        {
          userId: this.userId,
          timestamp: Date.now()
        }
      );
    }

    // Eski sistem (backward compatibility)
    if (this.userId) {
      const sessionData: SessionData = {
        userId: this.userId,
        sessionId: this.currentSessionId || '',
        sessionDuration,
        pageCount: this.sessionPageCount,
        totalScrollDepth,
        returnFrequency: 0,
        timestamp: Date.now()
      };

      this.sessionData.set(this.currentSessionId || '', sessionData);
      this.logSession(sessionData);
    }

    // Session'ı temizle
    this.currentSessionId = null;
    this.sessionStartTime = 0;
    this.sessionPageCount = 0;
  }

  // 12. Kullanıcı Yaşam Döngüsü (LTV)
  updateLTV(
    averageBasketValue: number,
    totalPurchases: number,
    firstPurchaseTime?: number,
    repeatPurchaseInterval?: number
  ): void {
    if (!this.userId) return;

    const key = this.userId;
    const ltvData: LTVData = {
      userId: this.userId,
      firstPurchaseTime,
      repeatPurchaseInterval,
      averageBasketValue,
      totalPurchases,
      timestamp: Date.now()
    };

    this.ltvData.set(key, ltvData);
    this.logLTV(ltvData);
  }

  // 13. Kampanya Etkisi
  trackCampaign(
    campaignType: 'banner' | 'voucher' | 'flash_deal',
    action: 'view' | 'click' | 'redeem',
    campaignId?: string,
    viewDuration?: number
  ): void {
    if (!this.userId) return;

    const campaignData: CampaignData = {
      userId: this.userId,
      campaignId,
      campaignType,
      action,
      viewDuration,
      timestamp: Date.now()
    };

    this.campaignData.push(campaignData);
    this.logCampaign(campaignData);
  }

  // 14. Güvenlik & Dolandırıcılık
  trackFraudSignal(
    signalType: 'fast_checkout' | 'failed_payment_attempts' | 'ip_location_change',
    value: number,
    ipAddress?: string,
    location?: string,
    previousLocation?: string
  ): void {
    if (!this.userId) return;

    const fraudData: FraudSignalData = {
      userId: this.userId,
      signalType,
      value,
      ipAddress,
      location,
      previousLocation,
      timestamp: Date.now()
    };

    this.fraudSignals.push(fraudData);
    this.logFraudSignal(fraudData);
  }

  // Session bitişinde tüm verileri gönder
  flushAllData(): void {
    // Tüm scroll depth verilerini kaydet
    this.scrollDepths.forEach((data) => {
      this.logScrollDepth(data);
    });
    this.scrollDepths.clear();

    // Navigation path'i kaydet
    this.navigationPaths.forEach((data) => {
      this.logNavigationPath(data);
    });
    this.navigationPaths.clear();

    // Heatmap verilerini gönder
    this.flushHeatMapData();

    // Session verilerini gönder
    if (this.currentSessionId && this.sessionStartTime > 0) {
      this.endSession();
    }

    // Performance metrics'i gönder
    this.flushPerformanceMetrics();
  }

  // Performance metrics batch gönderimi
  private flushPerformanceMetrics(): void {
    if (this.performanceMetrics.length === 0) return;

    const dataToSend = [...this.performanceMetrics];
    this.performanceMetrics = [];

    dataToSend.forEach((data) => {
      this.logPerformance(data);
    });
  }

  // Backend'e veri gönderme fonksiyonları
  private async logCartBehavior(data: CartBehaviorData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'cart_behavior',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Cart behavior logging failed:', error);
    }
  }

  private async logPaymentBehavior(data: PaymentBehaviorData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'payment_behavior',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Payment behavior logging failed:', error);
    }
  }

  private async logUserSegment(data: UserSegmentData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'user_segment',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ User segment logging failed:', error);
    }
  }

  private async logPerformance(data: PerformanceData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'performance',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Performance logging failed:', error);
    }
  }

  private async logDeviceInfo(data: DeviceData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'device_info',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Device info logging failed:', error);
    }
  }

  private async logNotification(data: NotificationData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'notification',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Notification logging failed:', error);
    }
  }

  private async logWishlist(data: WishlistData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'wishlist',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Wishlist logging failed:', error);
    }
  }

  private async logSession(data: SessionData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'session',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Session logging failed:', error);
    }
  }

  private async logLTV(data: LTVData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'ltv',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ LTV logging failed:', error);
    }
  }

  private async logCampaign(data: CampaignData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'campaign',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Campaign logging failed:', error);
    }
  }

  private async logFraudSignal(data: FraudSignalData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'fraud_signal',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Fraud signal logging failed:', error);
    }
  }
}

export const behaviorAnalytics = BehaviorAnalytics.getInstance();

