// Customer/behavior analytics kaldırıldı: tüm servisler devre dışı

export interface AnalyticsConfig {
  enableBehaviorAnalytics: boolean;
  enableEcommerceAnalytics: boolean;
  enablePerformanceAnalytics: boolean;
  enableSocialContentAnalytics: boolean;
  enableDetailedLogging: boolean;
  flushInterval: number; // milliseconds
  batchSize: number;
  enableOfflineMode: boolean;
  enableDebugMode: boolean;
}

export interface UserSession {
  userId: number;
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalEvents: number;
  screensVisited: string[];
  totalClicks: number;
  totalScrolls: number;
  totalErrors: number;
  totalCrashes: number;
}

class AnalyticsCoordinator {
  private static instance: AnalyticsCoordinator;
  private config: AnalyticsConfig;
  private currentSession: UserSession | null = null;
  private eventQueue: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enableBehaviorAnalytics: false,
      enableEcommerceAnalytics: false,
      enablePerformanceAnalytics: false,
      enableSocialContentAnalytics: false,
      enableDetailedLogging: false,
      flushInterval: 30000, // 30 saniye
      batchSize: 50,
      enableOfflineMode: true,
      enableDebugMode: false
    };
  }

  static getInstance(): AnalyticsCoordinator {
    if (!AnalyticsCoordinator.instance) {
      AnalyticsCoordinator.instance = new AnalyticsCoordinator();
    }
    return AnalyticsCoordinator.instance;
  }

  // Konfigürasyon ayarlama
  configure(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Kullanıcı oturumu başlatma
  startUserSession(userId: number): void {
    // GÜVENLİK: Kriptografik olarak güvenli session ID
    let sessionId: string;
    try {
      const cryptoUtils = require('../utils/crypto-utils');
      if (cryptoUtils && typeof cryptoUtils.generateSecureSessionId === 'function') {
        sessionId = cryptoUtils.generateSecureSessionId();
      } else {
        // Fallback: basit session ID
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    } catch (error) {
      // Fallback: basit session ID
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    this.currentSession = {
      userId,
      sessionId,
      startTime: Date.now(),
      totalEvents: 0,
      screensVisited: [],
      totalClicks: 0,
      totalScrolls: 0,
      totalErrors: 0,
      totalCrashes: 0
    };

    // Tüm analytics servislerini başlat
    // Tüm analytics servisleri devre dışı

    // Periyodik veri gönderimini başlat
    this.startPeriodicFlush();
  }

  // Kullanıcı oturumu bitirme
  endUserSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();

      // Tüm analytics servislerini durdur
      // Servis yok

      // Son veri gönderimini yap
      this.flushAllData();

      this.currentSession = null;
    }

    // Periyodik veri gönderimini durdur
    this.stopPeriodicFlush();
  }

  // Ekran görüntüleme
  trackScreenView(screenName: string): void {
    if (!this.currentSession) return;

    this.currentSession.screensVisited.push(screenName);
    this.currentSession.totalEvents++;

    // no-op
  }

  // Ekran görüntüleme bitirme
  endScreenView(screenName: string): void {
    // no-op
  }

  // Tıklama takibi
  trackClick(elementType: string, elementId?: string, elementText?: string, x?: number, y?: number): void {
    if (!this.currentSession) return;

    this.currentSession.totalClicks++;
    this.currentSession.totalEvents++;

    // no-op
  }

  // Scroll takibi
  trackScroll(): void {
    if (!this.currentSession) return;

    this.currentSession.totalScrolls++;
    this.currentSession.totalEvents++;

    // no-op
  }

  // Hata takibi
  trackError(errorType: string, errorMessage: string, errorStack?: string, screenName?: string, userAction?: string): void {
    if (!this.currentSession) return;

    this.currentSession.totalErrors++;
    this.currentSession.totalEvents++;

    // no-op
  }

  // Çökme takibi
  trackCrash(crashInfo: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalCrashes++;
    this.currentSession.totalEvents++;

    // no-op
  }

  // E-ticaret olayları
  trackEcommerceEvent(eventType: string, eventData: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalEvents++;

    // no-op
  }

  // Sosyal medya olayları
  trackSocialEvent(eventType: string, eventData: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalEvents++;

    // no-op
  }

  // Performans olayları
  trackPerformanceEvent(eventType: string, eventData: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalEvents++;

    // no-op
  }

  // Özel olay takibi
  trackCustomEvent(eventName: string, eventData: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalEvents++;

    // DetailedActivityLogger kullanımı kaldırıldı - artık gerekli değil
    // Detaylı loglama gerekirse, ilgili screen'lerde doğrudan kullanılmalı
  }

  // Veri gönderimi
  private startPeriodicFlush(): void {
    // devre dışı
  }

  private stopPeriodicFlush(): void {
    // devre dışı
  }

  private flushAllData(): void {
    // devre dışı
  }

  // Debug modu
  enableDebugMode(): void {
    this.config.enableDebugMode = true;
    console.log('🔍 Analytics Debug Mode Enabled');
  }

  disableDebugMode(): void {
    this.config.enableDebugMode = false;
    console.log('🔍 Analytics Debug Mode Disabled');
  }

  // Mevcut oturum bilgilerini al
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  // Konfigürasyon bilgilerini al
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }
}

export const analyticsCoordinator = AnalyticsCoordinator.getInstance();
