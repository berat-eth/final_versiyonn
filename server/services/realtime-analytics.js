const { getJson, setJsonEx, CACHE_TTL } = require('../redis');

/**
 * Real-time Analytics Service
 * WebSocket ile canlı event stream ve aktif kullanıcı sayısı
 */
class RealtimeAnalyticsService {
  constructor() {
    this.activeConnections = new Map(); // WebSocket connections
    this.activeUsers = new Map(); // Active user tracking (last 5 minutes)
    this.currentSessions = new Map(); // Current active sessions
    this.eventBuffer = []; // Son 100 event (real-time feed için)
    this.maxBufferSize = 100;
    this.updateInterval = 5000; // 5 saniyede bir güncelle
  }

  /**
   * Active user kaydet (son 5 dakika)
   */
  async trackActiveUser(deviceId, userId = null) {
    try {
      const key = userId || deviceId;
      const now = Date.now();
      
      // In-memory tracking
      this.activeUsers.set(key, {
        deviceId,
        userId,
        lastSeen: now
      });

      // Redis'te de kaydet (5 dakika TTL)
      const cacheKey = `active:user:${key}`;
      await setJsonEx(cacheKey, CACHE_TTL.SHORT, {
        deviceId,
        userId,
        lastSeen: now
      });

      // 5 dakikadan eski kayıtları temizle
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      for (const [key, user] of this.activeUsers.entries()) {
        if (user.lastSeen < fiveMinutesAgo) {
          this.activeUsers.delete(key);
        }
      }
    } catch (error) {
      console.error('❌ Active user tracking error:', error);
    }
  }

  /**
   * Active users count (son 5 dakika)
   */
  getActiveUsersCount() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    let count = 0;
    
    for (const user of this.activeUsers.values()) {
      if (user.lastSeen >= fiveMinutesAgo) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Current session count
   */
  getCurrentSessionCount() {
    return this.currentSessions.size;
  }

  /**
   * Event'i buffer'a ekle (real-time feed için)
   */
  addEvent(event) {
    this.eventBuffer.push({
      ...event,
      timestamp: Date.now()
    });

    // Buffer size kontrolü
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift(); // En eski event'i sil
    }

    // Tüm bağlı client'lara broadcast et
    this.broadcastEvent(event);
  }

  /**
   * Event'i tüm bağlı client'lara gönder
   */
  broadcastEvent(event) {
    const message = JSON.stringify({
      type: 'event',
      data: event
    });

    for (const [connectionId, ws] of this.activeConnections.entries()) {
      try {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        } else {
          // Bağlantı kapalı - listeden çıkar
          this.activeConnections.delete(connectionId);
        }
      } catch (error) {
        console.error(`❌ WebSocket send error for ${connectionId}:`, error);
        this.activeConnections.delete(connectionId);
      }
    }
  }

  /**
   * WebSocket connection ekle
   */
  addConnection(connectionId, ws) {
    this.activeConnections.set(connectionId, ws);
    
    // İlk bağlantıda mevcut durumu gönder
    const initialData = {
      type: 'initial',
      data: {
        activeUsers: this.getActiveUsersCount(),
        currentSessions: this.getCurrentSessionCount(),
        recentEvents: this.eventBuffer.slice(-10) // Son 10 event
      }
    };

    try {
      ws.send(JSON.stringify(initialData));
    } catch (error) {
      console.error('❌ Initial data send error:', error);
    }
  }

  /**
   * WebSocket connection'ı kaldır
   */
  removeConnection(connectionId) {
    this.activeConnections.delete(connectionId);
  }

  /**
   * Real-time metrics'i getir
   */
  getMetrics() {
    return {
      activeUsers: this.getActiveUsersCount(),
      currentSessions: this.getCurrentSessionCount(),
      activeConnections: this.activeConnections.size,
      recentEvents: this.eventBuffer.slice(-20) // Son 20 event
    };
  }

  /**
   * Periyodik güncelleme başlat
   */
  startPeriodicUpdates() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      const metrics = this.getMetrics();
      const updateMessage = JSON.stringify({
        type: 'metrics',
        data: metrics
      });

      // Tüm client'lara metrics gönder
      for (const [connectionId, ws] of this.activeConnections.entries()) {
        try {
          if (ws.readyState === 1) {
            ws.send(updateMessage);
          }
        } catch (error) {
          this.activeConnections.delete(connectionId);
        }
      }
    }, this.updateInterval);
  }

  /**
   * Periyodik güncellemeyi durdur
   */
  stopPeriodicUpdates() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
}

// Singleton instance
let instance = null;

module.exports = function getRealtimeAnalytics() {
  if (!instance) {
    instance = new RealtimeAnalyticsService();
    instance.startPeriodicUpdates();
  }
  return instance;
};

module.exports.RealtimeAnalyticsService = RealtimeAnalyticsService;

