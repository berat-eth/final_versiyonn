
const { getJson, setJsonEx, getOrSet, CACHE_TTL, delPattern } = require('../redis');

/**
 * User Behavior Processor Service
 * Real-time veri işleme motoru - hem logged-in hem anonymous kullanıcıları işler
 */
class UserBehaviorProcessor {
  constructor(pool) {
    this.pool = pool;
    this.batchQueue = [];
    this.batchSize = 50;
    this.batchInterval = 5000; // 5 saniyede bir batch insert
    this.processingBatch = false;
    this.inMemoryCache = new Map(); // Hot data için in-memory cache (son 1000 event)
    this.maxMemoryCacheSize = 1000;
    this.startBatchProcessor();
  }

  // poolWrapper'ı set et
  setPoolWrapper(pool) {
    this.pool = pool;
  }

  /**
   * Batch processor'ı başlat
   */
  startBatchProcessor() {
    setInterval(() => {
      if (this.batchQueue.length > 0 && !this.processingBatch) {
        this.processBatch();
      }
    }, this.batchInterval);
  }

  /**
   * Event'i işle ve database'e kaydet (real-time)
   */
  async processEvent(eventData) {
    try {
      const {
        userId = null,
        deviceId,
        eventType,
        screenName = null,
        eventData: eventPayload = {},
        sessionId = null,
        ipAddress = null,
        userAgent = null,
        timestamp = new Date()
      } = eventData;

      if (!deviceId) {
        console.error('❌ DeviceId gerekli');
        return { success: false, error: 'DeviceId gerekli' };
      }

      // Device bilgisini cache'den kontrol et
      let cachedDevice = await this._getCachedDeviceInfo(deviceId);
      
      // Anonymous device kaydını güncelle veya oluştur
      const deviceInfo = {
        platform: eventPayload.platform || eventPayload.deviceInfo?.platform,
        osVersion: eventPayload.osVersion || eventPayload.deviceInfo?.osVersion,
        screenSize: eventPayload.screenSize || eventPayload.deviceInfo?.screenSize,
        browser: eventPayload.browser || eventPayload.deviceInfo?.browser,
        metadata: {
          userAgent,
          ipAddress,
          ...eventPayload.deviceInfo
        }
      };
      
      await this.ensureAnonymousDevice(deviceId, deviceInfo);
      
      // Device bilgisini cache'le
      await this._cacheDeviceInfo(deviceId, deviceInfo);

      // In-memory cache'e ekle (hot data için)
      if (this.inMemoryCache.size >= this.maxMemoryCacheSize) {
        // En eski entry'yi sil (FIFO)
        const firstKey = this.inMemoryCache.keys().next().value;
        this.inMemoryCache.delete(firstKey);
      }
      this.inMemoryCache.set(`${deviceId}:${Date.now()}`, {
        userId,
        deviceId,
        eventType,
        screenName,
        eventData: eventPayload,
        timestamp
      });

      // Event'i batch queue'ya ekle (real-time için batch insert optimizasyonu)
      this.batchQueue.push({
        userId,
        deviceId,
        eventType,
        screenName,
        eventData: JSON.stringify(eventPayload),
        sessionId,
        ipAddress,
        userAgent,
        timestamp
      });

      // Batch size'a ulaşırsa hemen işle
      if (this.batchQueue.length >= this.batchSize) {
        await this.processBatch();
      }

      // Cache invalidation - analytics cache'ini temizle
      delPattern(`analytics:${deviceId}:*`).catch(() => {});

      return { success: true };
    } catch (error) {
      console.error('❌ Event işleme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch queue'yu işle ve database'e kaydet
   */
  async processBatch() {
    if (this.processingBatch || this.batchQueue.length === 0) {
      return;
    }

    this.processingBatch = true;
    const batch = this.batchQueue.splice(0, this.batchSize);

    try {
      if (batch.length === 0) {
        this.processingBatch = false;
        return;
      }

      // Batch insert için prepared statement
      const values = batch.map(event => [
        event.userId,
        event.deviceId,
        event.eventType,
        event.screenName,
        event.eventData,
        event.sessionId,
        event.timestamp || new Date(),
        event.ipAddress,
        event.userAgent
      ]);

      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      
      await this.pool.execute(
        `INSERT INTO user_behavior_events 
         (userId, deviceId, eventType, screenName, eventData, sessionId, timestamp, ipAddress, userAgent)
         VALUES ${placeholders}`,
        values.flat()
      );

      console.log(`✅ ${batch.length} event batch olarak kaydedildi`);
    } catch (error) {
      console.error('❌ Batch insert hatası:', error);
      // Hata durumunda event'leri queue'ya geri ekle
      this.batchQueue.unshift(...batch);
    } finally {
      this.processingBatch = false;
    }
  }

  /**
   * Anonymous device kaydını oluştur veya güncelle
   */
  async ensureAnonymousDevice(deviceId, deviceInfo = {}) {
    try {
      const [existing] = await this.pool.execute(
        'SELECT id FROM anonymous_devices WHERE deviceId = ?',
        [deviceId]
      );

      if (existing.length > 0) {
        // Güncelle
        await this.pool.execute(
          `UPDATE anonymous_devices 
           SET platform = COALESCE(?, platform),
               osVersion = COALESCE(?, osVersion),
               screenSize = COALESCE(?, screenSize),
               browser = COALESCE(?, browser),
               lastSeen = CURRENT_TIMESTAMP,
               metadata = COALESCE(?, metadata)
           WHERE deviceId = ?`,
          [
            deviceInfo.platform,
            deviceInfo.osVersion,
            deviceInfo.screenSize,
            deviceInfo.browser,
            deviceInfo.metadata ? JSON.stringify(deviceInfo.metadata) : null,
            deviceId
          ]
        );
      } else {
        // Yeni kayıt oluştur
        await this.pool.execute(
          `INSERT INTO anonymous_devices 
           (deviceId, platform, osVersion, screenSize, browser, metadata)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            deviceId,
            deviceInfo.platform || null,
            deviceInfo.osVersion || null,
            deviceInfo.screenSize || null,
            deviceInfo.browser || null,
            deviceInfo.metadata ? JSON.stringify(deviceInfo.metadata) : null
          ]
        );
      }
    } catch (error) {
      console.error('❌ Anonymous device kaydetme hatası:', error);
    }
  }

  /**
   * Session başlat
   */
  async startSession(sessionData) {
    try {
      const {
        userId = null,
        deviceId,
        sessionId,
        metadata = {}
      } = sessionData;

      if (!deviceId || !sessionId) {
        return { success: false, error: 'DeviceId ve sessionId gerekli' };
      }

      await this.pool.execute(
        `INSERT INTO user_sessions 
         (userId, deviceId, sessionId, startTime, metadata)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
         ON DUPLICATE KEY UPDATE startTime = CURRENT_TIMESTAMP`,
        [
          userId,
          deviceId,
          sessionId,
          JSON.stringify(metadata)
        ]
      );

      // Anonymous device'ın session sayısını artır
      await this.pool.execute(
        'UPDATE anonymous_devices SET totalSessions = totalSessions + 1 WHERE deviceId = ?',
        [deviceId]
      );

      return { success: true };
    } catch (error) {
      console.error('❌ Session başlatma hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Session bitir
   */
  async endSession(sessionId, sessionData = {}) {
    try {
      const {
        duration = 0,
        pageCount = 0,
        scrollDepth = 0,
        metadata = {}
      } = sessionData;

      await this.pool.execute(
        `UPDATE user_sessions 
         SET endTime = CURRENT_TIMESTAMP,
             duration = ?,
             pageCount = ?,
             scrollDepth = ?,
             metadata = JSON_MERGE_PATCH(COALESCE(metadata, '{}'), ?)
         WHERE sessionId = ?`,
        [
          duration,
          pageCount,
          scrollDepth,
          JSON.stringify(metadata),
          sessionId
        ]
      );

      return { success: true };
    } catch (error) {
      console.error('❌ Session bitirme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Device'ı kullanıcıya bağla (login sonrası)
   */
  async linkDeviceToUser(deviceId, userId) {
    try {
      if (!deviceId || !userId) {
        return { success: false, error: 'DeviceId ve userId gerekli' };
      }

      // Cache'i temizle (non-blocking)
      delPattern(`analytics:${deviceId}:*`).catch(() => {});
      delPattern(`device:${deviceId}`).catch(() => {});

      // Tüm anonymous event'lerini user'a bağla
      await this.pool.execute(
        'UPDATE user_behavior_events SET userId = ? WHERE deviceId = ? AND userId IS NULL',
        [userId, deviceId]
      );

      // Tüm anonymous session'ları user'a bağla
      await this.pool.execute(
        'UPDATE user_sessions SET userId = ? WHERE deviceId = ? AND userId IS NULL',
        [userId, deviceId]
      );

      // Aggregate verilerini güncelle
      await this.pool.execute(
        'UPDATE device_analytics_aggregates SET userId = ? WHERE deviceId = ? AND userId IS NULL',
        [userId, deviceId]
      );

      return { success: true };
    } catch (error) {
      console.error('❌ Device-to-user linking hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kullanıcı verilerini aggregate et
   */
  async aggregateUserData(deviceId, userId = null, date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Event'leri filtrele
      const dateFilter = userId 
        ? 'WHERE (userId = ? OR deviceId = ?) AND DATE(timestamp) = ?'
        : 'WHERE deviceId = ? AND DATE(timestamp) = ?';
      
      const params = userId 
        ? [userId, deviceId, targetDate]
        : [deviceId, targetDate];

      // Screen views
      const [screenViews] = await this.pool.execute(
        `SELECT screenName, COUNT(*) as totalViews, 
                AVG(JSON_EXTRACT(eventData, '$.duration')) as avgDuration,
                MIN(JSON_EXTRACT(eventData, '$.duration')) as minDuration,
                MAX(JSON_EXTRACT(eventData, '$.duration')) as maxDuration
         FROM user_behavior_events
         ${dateFilter} AND eventType = 'screen_view'
         GROUP BY screenName`,
        params
      );

      // Scroll depth
      const [scrollDepth] = await this.pool.execute(
        `SELECT screenName, 
                AVG(JSON_EXTRACT(eventData, '$.maxScrollDepth')) as avgMaxDepth,
                COUNT(*) as totalSessions
         FROM user_behavior_events
         ${dateFilter} AND eventType = 'scroll_depth'
         GROUP BY screenName`,
        params
      );

      // Navigation paths
      const [navigationPaths] = await this.pool.execute(
        `SELECT JSON_EXTRACT(eventData, '$.path') as path, COUNT(*) as count
         FROM user_behavior_events
         ${dateFilter} AND eventType = 'navigation_path'
         GROUP BY path
         ORDER BY count DESC
         LIMIT 20`,
        params
      );

      // Product interactions
      const [productInteractions] = await this.pool.execute(
        `SELECT JSON_EXTRACT(eventData, '$.productId') as productId,
                COUNT(*) as totalViews,
                AVG(JSON_EXTRACT(eventData, '$.duration')) as avgDuration
         FROM user_behavior_events
         ${dateFilter} AND eventType = 'product_interaction'
         GROUP BY productId`,
        params
      );

      // Sessions
      const [sessions] = await this.pool.execute(
        `SELECT COUNT(*) as totalSessions,
                AVG(duration) as avgSessionDuration,
                AVG(pageCount) as avgPageCount,
                AVG(scrollDepth) as avgScrollDepth
         FROM user_sessions
         WHERE deviceId = ? AND DATE(startTime) = ?`,
        [deviceId, targetDate]
      );

      // Aggregate veriyi kaydet
      const aggregateData = {
        screenViews: screenViews || [],
        scrollDepth: scrollDepth || [],
        navigationPaths: navigationPaths || [],
        productInteractions: productInteractions || [],
        sessions: sessions[0] || {}
      };

      await this.pool.execute(
        `INSERT INTO device_analytics_aggregates 
         (deviceId, userId, date, screenViews, scrollDepth, navigationPaths, 
          productInteractions, sessions, lastUpdated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
         screenViews = VALUES(screenViews),
         scrollDepth = VALUES(scrollDepth),
         navigationPaths = VALUES(navigationPaths),
         productInteractions = VALUES(productInteractions),
         sessions = VALUES(sessions),
         lastUpdated = CURRENT_TIMESTAMP`,
        [
          deviceId,
          userId,
          targetDate,
          JSON.stringify(aggregateData.screenViews),
          JSON.stringify(aggregateData.scrollDepth),
          JSON.stringify(aggregateData.navigationPaths),
          JSON.stringify(aggregateData.productInteractions),
          JSON.stringify(aggregateData.sessions)
        ]
      );

      return { success: true, data: aggregateData };
    } catch (error) {
      console.error('❌ Aggregate hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kullanıcı analitik verilerini getir (Redis cache ile)
   */
  async getUserAnalytics(deviceId, userId = null, days = 30) {
    try {
      const cacheKey = `analytics:${deviceId}:${userId || 'anon'}:${days}`;
      
      // Redis cache'den kontrol et
      const cached = await getOrSet(
        cacheKey,
        CACHE_TTL.MEDIUM, // 10 dakika cache
        async () => {
          return await this._fetchUserAnalytics(deviceId, userId, days);
        },
        { backgroundRefresh: true }
      );

      return cached || { success: false, error: 'Data fetch failed' };
    } catch (error) {
      console.error('❌ Analytics getirme hatası:', error);
      // Fallback to direct fetch
      return await this._fetchUserAnalytics(deviceId, userId, days);
    }
  }

  /**
   * Kullanıcı analitik verilerini database'den getir (internal method)
   */
  async _fetchUserAnalytics(deviceId, userId = null, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Aggregate verilerini getir
      const [aggregates] = await this.pool.execute(
        `SELECT * FROM device_analytics_aggregates
         WHERE deviceId = ? AND date >= ?
         ORDER BY date DESC`,
        [deviceId, startDateStr]
      );

      // Event bazlı veriler (aggregate yoksa)
      const dateFilter = userId
        ? 'WHERE (userId = ? OR deviceId = ?) AND timestamp >= ?'
        : 'WHERE deviceId = ? AND timestamp >= ?';
      
      const params = userId
        ? [userId, deviceId, startDate]
        : [deviceId, startDate];

      // Screen views
      const [screenViews] = await this.pool.execute(
        `SELECT screenName, COUNT(*) as totalViews,
                AVG(JSON_EXTRACT(eventData, '$.duration')) as avgDuration
         FROM user_behavior_events
         ${dateFilter} AND eventType = 'screen_view'
         GROUP BY screenName
         ORDER BY totalViews DESC
         LIMIT 20`,
        params
      );

      // Scroll depth
      const [scrollDepth] = await this.pool.execute(
        `SELECT screenName,
                AVG(JSON_EXTRACT(eventData, '$.maxScrollDepth')) as avgMaxDepth,
                COUNT(*) as totalSessions
         FROM user_behavior_events
         ${dateFilter} AND eventType = 'scroll_depth'
         GROUP BY screenName
         ORDER BY totalSessions DESC
         LIMIT 20`,
        params
      );

      // Navigation paths
      const [navigationPaths] = await this.pool.execute(
        `SELECT JSON_EXTRACT(eventData, '$.path') as path, COUNT(*) as count
         FROM user_behavior_events
         ${dateFilter} AND eventType = 'navigation_path'
         GROUP BY path
         ORDER BY count DESC
         LIMIT 20`,
        params
      );

      // Product interactions
      const [productInteractions] = await this.pool.execute(
        `SELECT JSON_EXTRACT(eventData, '$.productId') as productId,
                COUNT(*) as totalViews,
                AVG(JSON_EXTRACT(eventData, '$.duration')) as avgDuration,
                SUM(JSON_EXTRACT(eventData, '$.zoomCount')) as totalZoomCount,
                SUM(JSON_EXTRACT(eventData, '$.carouselSwipes')) as totalCarouselSwipes
         FROM user_behavior_events
         ${dateFilter} AND eventType = 'product_interaction'
         GROUP BY productId
         ORDER BY totalViews DESC
         LIMIT 50`,
        params
      );

      // Sessions
      const [sessions] = await this.pool.execute(
        `SELECT COUNT(*) as totalSessions,
                AVG(duration) as avgSessionDuration,
                AVG(pageCount) as avgPageCount,
                AVG(scrollDepth) as avgScrollDepth
         FROM user_sessions
         WHERE deviceId = ? AND startTime >= ?`,
        [deviceId, startDate]
      );

      return {
        success: true,
        data: {
          screenViews: screenViews || [],
          scrollDepth: scrollDepth || [],
          navigationPaths: navigationPaths || [],
          productInteractions: productInteractions || [],
          sessions: sessions[0] || {},
          aggregates: aggregates || []
        }
      };
    } catch (error) {
      console.error('❌ Analytics getirme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Tüm anonymous device'ları listele
   */
  async getAnonymousDevices(limit = 100, offset = 0) {
    try {
      const [devices] = await this.pool.execute(
        `SELECT * FROM anonymous_devices
         ORDER BY lastSeen DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return { success: true, data: devices };
    } catch (error) {
      console.error('❌ Anonymous devices getirme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Device bilgilerini cache'le
   */
  async _cacheDeviceInfo(deviceId, deviceInfo) {
    try {
      const cacheKey = `device:${deviceId}`;
      await setJsonEx(cacheKey, CACHE_TTL.VERY_LONG, deviceInfo); // 2 saat cache
    } catch (error) {
      // Cache fail durumunda sessizce devam et
    }
  }

  /**
   * Device bilgisini cache'den getir
   */
  async _getCachedDeviceInfo(deviceId) {
    try {
      const cacheKey = `device:${deviceId}`;
      return await getJson(cacheKey);
    } catch (error) {
      return null;
    }
  }

  /**
   * Tüm device'ları listele (hem anonymous hem logged-in) - Cache ile
   */
  async getAllDevices(limit = 100, offset = 0) {
    try {
      const cacheKey = `devices:list:${limit}:${offset}`;
      
      // Cache'den kontrol et (5 dakika TTL)
      const cached = await getOrSet(
        cacheKey,
        CACHE_TTL.SHORT,
        async () => {
          return await this._fetchAllDevices(limit, offset);
        }
      );

      return cached || { success: false, error: 'Data fetch failed' };
    } catch (error) {
      console.error('❌ Devices getirme hatası:', error);
      return await this._fetchAllDevices(limit, offset);
    }
  }

  /**
   * Tüm device'ları database'den getir (internal method)
   */
  async _fetchAllDevices(limit = 100, offset = 0) {
    try {
      const [devices] = await this.pool.execute(
        `SELECT 
           ad.id,
           ad.deviceId,
           ad.platform,
           ad.osVersion,
           ad.screenSize,
           ad.browser,
           ad.firstSeen,
           ad.lastSeen,
           ad.totalSessions,
           u.id as userId,
           u.name as userName,
           u.email as userEmail,
           (SELECT COUNT(*) FROM user_behavior_events WHERE deviceId = ad.deviceId) as totalEvents
         FROM anonymous_devices ad
         LEFT JOIN user_behavior_events ube ON ad.deviceId = ube.deviceId AND ube.userId IS NOT NULL
         LEFT JOIN users u ON ube.userId = u.id
         GROUP BY ad.id, ad.deviceId
         ORDER BY ad.lastSeen DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return { success: true, data: devices };
    } catch (error) {
      console.error('❌ Devices getirme hatası:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
let instance = null;

module.exports = function getProcessor(pool) {
  if (!instance && pool) {
    instance = new UserBehaviorProcessor(pool);
  } else if (!instance) {
    throw new Error('UserBehaviorProcessor requires pool. Call getProcessor(pool) first.');
  }
  return instance;
};

module.exports.UserBehaviorProcessor = UserBehaviorProcessor;

