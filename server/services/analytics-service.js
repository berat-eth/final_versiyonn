const { poolWrapper } = require('../database-schema');

class AnalyticsService {
  constructor() {
    this.pool = poolWrapper;
  }

  /**
   * Genel özet metrikler
   */
  async getOverview(tenantId, timeRange = '7d') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const [
        totalUsers,
        activeUsers,
        totalSessions,
        totalEvents,
        totalRevenue,
        avgSessionDuration,
        bounceRate
      ] = await Promise.all([
        this.getTotalUsers(tenantId, dateFilter),
        this.getActiveUsers(tenantId, dateFilter),
        this.getTotalSessions(tenantId, dateFilter),
        this.getTotalEvents(tenantId, dateFilter),
        this.getTotalRevenue(tenantId, dateFilter),
        this.getAvgSessionDuration(tenantId, dateFilter),
        this.getBounceRate(tenantId, dateFilter)
      ]);

      return {
        totalUsers,
        activeUsers,
        totalSessions,
        totalEvents,
        totalRevenue,
        avgSessionDuration,
        bounceRate,
        timeRange
      };
    } catch (error) {
      console.error('❌ Error getting overview:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı analitikleri
   */
  async getUserAnalytics(tenantId, timeRange = '7d') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const [
        dau,
        wau,
        mau,
        newUsers,
        returningUsers,
        retentionRate,
        churnRate
      ] = await Promise.all([
        this.getDAU(tenantId, dateFilter),
        this.getWAU(tenantId, dateFilter),
        this.getMAU(tenantId, dateFilter),
        this.getNewUsers(tenantId, dateFilter),
        this.getReturningUsers(tenantId, dateFilter),
        this.getRetentionRate(tenantId, dateFilter),
        this.getChurnRate(tenantId, dateFilter)
      ]);

      return {
        dau,
        wau,
        mau,
        newUsers,
        returningUsers,
        retentionRate,
        churnRate
      };
    } catch (error) {
      console.error('❌ Error getting user analytics:', error);
      throw error;
    }
  }

  /**
   * Davranış analitikleri
   */
  async getBehaviorAnalytics(tenantId, timeRange = '7d') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const [
        screenViews,
        topScreens,
        avgTimeOnScreen,
        navigationPaths,
        scrollDepth
      ] = await Promise.all([
        this.getScreenViews(tenantId, dateFilter),
        this.getTopScreens(tenantId, dateFilter),
        this.getAvgTimeOnScreen(tenantId, dateFilter),
        this.getNavigationPaths(tenantId, dateFilter),
        this.getScrollDepth(tenantId, dateFilter)
      ]);

      return {
        screenViews,
        topScreens,
        avgTimeOnScreen,
        navigationPaths,
        scrollDepth
      };
    } catch (error) {
      console.error('❌ Error getting behavior analytics:', error);
      throw error;
    }
  }

  /**
   * Funnel analizi
   */
  async getFunnelAnalysis(tenantId, timeRange = '7d') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const [
        productViews,
        addToCart,
        checkout,
        purchase
      ] = await Promise.all([
        this.getProductViews(tenantId, dateFilter),
        this.getAddToCart(tenantId, dateFilter),
        this.getCheckout(tenantId, dateFilter),
        this.getPurchase(tenantId, dateFilter)
      ]);

      const viewToCartRate = productViews > 0 ? (addToCart / productViews) * 100 : 0;
      const cartToCheckoutRate = addToCart > 0 ? (checkout / addToCart) * 100 : 0;
      const checkoutToPurchaseRate = checkout > 0 ? (purchase / checkout) * 100 : 0;
      const overallConversionRate = productViews > 0 ? (purchase / productViews) * 100 : 0;

      return {
        funnel: {
          productViews,
          addToCart,
          checkout,
          purchase
        },
        conversionRates: {
          viewToCart: viewToCartRate,
          cartToCheckout: cartToCheckoutRate,
          checkoutToPurchase: checkoutToPurchaseRate,
          overall: overallConversionRate
        },
        dropOffPoints: {
          viewToCart: productViews - addToCart,
          cartToCheckout: addToCart - checkout,
          checkoutToPurchase: checkout - purchase
        }
      };
    } catch (error) {
      console.error('❌ Error getting funnel analysis:', error);
      throw error;
    }
  }

  /**
   * Performans metrikleri
   */
  async getPerformanceMetrics(tenantId, timeRange = '7d') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const [
        avgPageLoadTime,
        p95PageLoadTime,
        p99PageLoadTime,
        avgApiResponseTime,
        errorRate,
        crashRate
      ] = await Promise.all([
        this.getAvgPageLoadTime(tenantId, dateFilter),
        this.getP95PageLoadTime(tenantId, dateFilter),
        this.getP99PageLoadTime(tenantId, dateFilter),
        this.getAvgApiResponseTime(tenantId, dateFilter),
        this.getErrorRate(tenantId, dateFilter),
        this.getCrashRate(tenantId, dateFilter)
      ]);

      return {
        pageLoadTime: {
          avg: avgPageLoadTime,
          p95: p95PageLoadTime,
          p99: p99PageLoadTime
        },
        apiResponseTime: {
          avg: avgApiResponseTime
        },
        errorRate,
        crashRate
      };
    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Segment bazlı analiz
   */
  async getSegmentAnalytics(tenantId, segmentId = null, timeRange = '7d') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      const segmentFilter = segmentId ? `AND us.segmentId = ${segmentId}` : '';
      
      const [rows] = await this.pool.execute(`
        SELECT 
          s.id as segmentId,
          s.name as segmentName,
          COUNT(DISTINCT us.userId) as userCount,
          COUNT(DISTINCT o.id) as orderCount,
          COALESCE(SUM(o.totalAmount), 0) as totalRevenue,
          COALESCE(AVG(o.totalAmount), 0) as avgOrderValue
        FROM segments s
        LEFT JOIN user_segments us ON s.id = us.segmentId AND s.tenantId = us.tenantId
        LEFT JOIN orders o ON us.userId = o.userId AND s.tenantId = o.tenantId ${dateFilter}
        WHERE s.tenantId = ? ${segmentFilter}
        GROUP BY s.id, s.name
      `, [tenantId]);

      return rows;
    } catch (error) {
      console.error('❌ Error getting segment analytics:', error);
      throw error;
    }
  }

  /**
   * Event detayları (filtreleme ile)
   */
  async getEvents(tenantId, filters = {}, limit = 100, offset = 0) {
    try {
      let query = `
        SELECT 
          ube.id,
          ube.userId,
          u.name as userName,
          ube.deviceId,
          ube.eventType,
          ube.screenName,
          ube.eventData,
          ube.sessionId,
          ube.timestamp,
          ube.ipAddress
        FROM user_behavior_events ube
        LEFT JOIN users u ON ube.userId = u.id
        WHERE (u.tenantId = ? OR ube.userId IS NULL)
      `;
      const params = [tenantId];

      if (filters.userId) {
        query += ` AND ube.userId = ?`;
        params.push(filters.userId);
      }

      if (filters.eventType) {
        query += ` AND ube.eventType = ?`;
        params.push(filters.eventType);
      }

      if (filters.screenName) {
        query += ` AND ube.screenName = ?`;
        params.push(filters.screenName);
      }

      if (filters.startDate) {
        query += ` AND ube.timestamp >= ?`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND ube.timestamp <= ?`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY ube.timestamp DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await this.pool.execute(query, params);

      // Total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM user_behavior_events ube
        LEFT JOIN users u ON ube.userId = u.id
        WHERE (u.tenantId = ? OR ube.userId IS NULL)
      `;
      const countParams = [tenantId];

      if (filters.userId) {
        countQuery += ` AND ube.userId = ?`;
        countParams.push(filters.userId);
      }

      if (filters.eventType) {
        countQuery += ` AND ube.eventType = ?`;
        countParams.push(filters.eventType);
      }

      if (filters.screenName) {
        countQuery += ` AND ube.screenName = ?`;
        countParams.push(filters.screenName);
      }

      if (filters.startDate) {
        countQuery += ` AND ube.timestamp >= ?`;
        countParams.push(filters.startDate);
      }

      if (filters.endDate) {
        countQuery += ` AND ube.timestamp <= ?`;
        countParams.push(filters.endDate);
      }

      const [countResult] = await this.pool.execute(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      return {
        events: rows,
        total,
        limit,
        offset
      };
    } catch (error) {
      console.error('❌ Error getting events:', error);
      throw error;
    }
  }

  /**
   * Session analizleri
   */
  async getSessionAnalytics(tenantId, timeRange = '7d') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const [
        totalSessions,
        avgSessionDuration,
        avgPageViewsPerSession,
        sessionsPerUser,
        returningVsNew
      ] = await Promise.all([
        this.getTotalSessions(tenantId, dateFilter),
        this.getAvgSessionDuration(tenantId, dateFilter),
        this.getAvgPageViewsPerSession(tenantId, dateFilter),
        this.getSessionsPerUser(tenantId, dateFilter),
        this.getReturningVsNew(tenantId, dateFilter)
      ]);

      return {
        totalSessions,
        avgSessionDuration,
        avgPageViewsPerSession,
        sessionsPerUser,
        returningVsNew
      };
    } catch (error) {
      console.error('❌ Error getting session analytics:', error);
      throw error;
    }
  }

  /**
   * Ürün etkileşim analizleri
   */
  async getProductAnalytics(tenantId, timeRange = '7d', limit = 20) {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      // En çok görüntülenen ürünler
      const [topViewed] = await this.pool.execute(`
        SELECT 
          p.id,
          p.name,
          COUNT(*) as viewCount
        FROM user_behavior_events ube
        JOIN products p ON JSON_EXTRACT(ube.eventData, '$.productId') = p.id
        LEFT JOIN users u ON ube.userId = u.id
        WHERE ube.eventType = 'product_view' 
          AND ube.timestamp ${dateFilter}
          AND p.tenantId = ?
          AND (u.tenantId = ? OR ube.userId IS NULL)
        GROUP BY p.id, p.name
        ORDER BY viewCount DESC
        LIMIT ?
      `, [tenantId, tenantId, limit]);

      // En çok sepete eklenen ürünler
      const [topAddedToCart] = await this.pool.execute(`
        SELECT 
          p.id,
          p.name,
          COUNT(*) as addToCartCount
        FROM user_behavior_events ube
        JOIN products p ON JSON_EXTRACT(ube.eventData, '$.productId') = p.id
        LEFT JOIN users u ON ube.userId = u.id
        WHERE ube.eventType = 'add_to_cart' 
          AND ube.timestamp ${dateFilter}
          AND p.tenantId = ?
          AND (u.tenantId = ? OR ube.userId IS NULL)
        GROUP BY p.id, p.name
        ORDER BY addToCartCount DESC
        LIMIT ?
      `, [tenantId, tenantId, limit]);

      // En çok satın alınan ürünler
      const [topPurchased] = await this.pool.execute(`
        SELECT 
          p.id,
          p.name,
          COUNT(DISTINCT oi.orderId) as purchaseCount,
          SUM(oi.quantity) as totalQuantity,
          SUM(oi.price * oi.quantity) as totalRevenue
        FROM order_items oi
        JOIN products p ON oi.productId = p.id
        JOIN orders o ON oi.orderId = o.id
        WHERE o.createdAt ${dateFilter}
          AND p.tenantId = ?
        GROUP BY p.id, p.name
        ORDER BY purchaseCount DESC
        LIMIT ?
      `, [tenantId, limit]);

      return {
        topViewed,
        topAddedToCart,
        topPurchased
      };
    } catch (error) {
      console.error('❌ Error getting product analytics:', error);
      throw error;
    }
  }

  /**
   * Zaman serisi verileri
   */
  async getTimeSeries(tenantId, metric = 'users', timeRange = '7d', interval = 'day') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      const dateFormat = interval === 'hour' ? '%Y-%m-%d %H:00:00' : 
                         interval === 'day' ? '%Y-%m-%d' : 
                         interval === 'week' ? '%Y-%u' : '%Y-%m';

      let query;
      const params = [tenantId];

      switch (metric) {
        case 'users':
          query = `
            SELECT 
              DATE_FORMAT(ube.timestamp, ?) as date,
              COUNT(DISTINCT ube.userId) as value
            FROM user_behavior_events ube
            LEFT JOIN users u ON ube.userId = u.id
            WHERE ube.timestamp ${dateFilter}
              AND (u.tenantId = ? OR ube.userId IS NULL)
            GROUP BY DATE_FORMAT(ube.timestamp, ?)
            ORDER BY date ASC
          `;
          params.push(dateFormat, tenantId, dateFormat);
          break;

        case 'sessions':
          query = `
            SELECT 
              DATE_FORMAT(us.startTime, ?) as date,
              COUNT(*) as value
            FROM user_sessions us
            LEFT JOIN users u ON us.userId = u.id
            WHERE us.startTime ${dateFilter}
              AND (u.tenantId = ? OR us.userId IS NULL)
            GROUP BY DATE_FORMAT(us.startTime, ?)
            ORDER BY date ASC
          `;
          params.push(dateFormat, tenantId, dateFormat);
          break;

        case 'events':
          query = `
            SELECT 
              DATE_FORMAT(ube.timestamp, ?) as date,
              COUNT(*) as value
            FROM user_behavior_events ube
            LEFT JOIN users u ON ube.userId = u.id
            WHERE ube.timestamp ${dateFilter}
              AND (u.tenantId = ? OR ube.userId IS NULL)
            GROUP BY DATE_FORMAT(ube.timestamp, ?)
            ORDER BY date ASC
          `;
          params.push(dateFormat, tenantId, dateFormat);
          break;

        case 'revenue':
          query = `
            SELECT 
              DATE_FORMAT(createdAt, ?) as date,
              COALESCE(SUM(totalAmount), 0) as value
            FROM orders
            WHERE createdAt ${dateFilter}
              AND tenantId = ?
            GROUP BY DATE_FORMAT(createdAt, ?)
            ORDER BY date ASC
          `;
          params.push(dateFormat, tenantId, dateFormat);
          break;

        default:
          throw new Error(`Unknown metric: ${metric}`);
      }

      const [rows] = await this.pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('❌ Error getting time series:', error);
      throw error;
    }
  }

  // Helper methods

  getDateFilter(timeRange) {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      case '1m':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
      case '3m':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return `>= '${startDate.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }

  async getTotalUsers(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(DISTINCT ube.userId) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL) AND ube.timestamp ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getActiveUsers(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(DISTINCT us.userId) as count
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getTotalSessions(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getTotalEvents(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL) AND ube.timestamp ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getTotalRevenue(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COALESCE(SUM(totalAmount), 0) as total
      FROM orders
      WHERE tenantId = ? AND createdAt ${dateFilter}
    `, [tenantId]);
    return parseFloat(rows[0]?.total || 0);
  }

  async getAvgSessionDuration(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT AVG(us.duration) as avg
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime ${dateFilter} AND us.duration > 0
    `, [tenantId]);
    return Math.round(rows[0]?.avg || 0);
  }

  async getBounceRate(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN us.pageCount = 1 THEN 1 ELSE 0 END) as bounced
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime ${dateFilter}
    `, [tenantId]);
    
    const total = rows[0]?.total || 0;
    const bounced = rows[0]?.bounced || 0;
    return total > 0 ? (bounced / total) * 100 : 0;
  }

  async getDAU(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(DISTINCT us.userId) as count
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND DATE(us.startTime) = CURDATE()
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getWAU(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(DISTINCT us.userId) as count
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getMAU(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(DISTINCT us.userId) as count
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getNewUsers(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      WHERE u.tenantId = ? AND u.createdAt ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getReturningUsers(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(DISTINCT us.userId) as count
      FROM user_sessions us
      WHERE us.tenantId = ? 
        AND us.startTime ${dateFilter}
        AND us.userId IN (
          SELECT DISTINCT userId 
          FROM user_sessions 
          WHERE tenantId = ? 
            AND startTime < DATE_SUB(NOW(), INTERVAL 1 DAY)
        )
    `, [tenantId, tenantId]);
    return rows[0]?.count || 0;
  }

  async getRetentionRate(tenantId, dateFilter) {
    // Basit retention hesaplama - gerçek retention daha karmaşık olabilir
    const newUsers = await this.getNewUsers(tenantId, dateFilter);
    const returningUsers = await this.getReturningUsers(tenantId, dateFilter);
    const totalActive = newUsers + returningUsers;
    return totalActive > 0 ? (returningUsers / totalActive) * 100 : 0;
  }

  async getChurnRate(tenantId, dateFilter) {
    // Churn rate hesaplama - son 30 günde aktif olan ama son 7 günde aktif olmayan kullanıcılar
    const [rows] = await this.pool.execute(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      WHERE u.tenantId = ?
        AND u.id IN (
          SELECT DISTINCT userId 
          FROM user_sessions 
          WHERE tenantId = ? 
            AND startTime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            AND startTime < DATE_SUB(NOW(), INTERVAL 7 DAY)
        )
        AND u.id NOT IN (
          SELECT DISTINCT userId 
          FROM user_sessions 
          WHERE tenantId = ? 
            AND startTime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        )
    `, [tenantId, tenantId, tenantId]);
    return rows[0]?.count || 0;
  }

  async getScreenViews(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'screen_view' 
        AND ube.timestamp ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getTopScreens(tenantId, dateFilter, limit = 10) {
    const [rows] = await this.pool.execute(`
      SELECT 
        ube.screenName,
        COUNT(*) as viewCount
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'screen_view' 
        AND ube.timestamp ${dateFilter}
        AND ube.screenName IS NOT NULL
      GROUP BY ube.screenName
      ORDER BY viewCount DESC
      LIMIT ?
    `, [tenantId, limit]);
    return rows;
  }

  async getAvgTimeOnScreen(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT AVG(JSON_EXTRACT(ube.eventData, '$.timeOnScreen')) as avg
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'screen_view' 
        AND ube.timestamp ${dateFilter}
        AND JSON_EXTRACT(ube.eventData, '$.timeOnScreen') IS NOT NULL
    `, [tenantId]);
    return Math.round(rows[0]?.avg || 0);
  }

  async getNavigationPaths(tenantId, dateFilter, limit = 10) {
    // Basit navigation path analizi
    const [rows] = await this.pool.execute(`
      SELECT 
        JSON_EXTRACT(ube.eventData, '$.navigationPath') as path,
        COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'navigation' 
        AND ube.timestamp ${dateFilter}
        AND JSON_EXTRACT(ube.eventData, '$.navigationPath') IS NOT NULL
      GROUP BY JSON_EXTRACT(ube.eventData, '$.navigationPath')
      ORDER BY count DESC
      LIMIT ?
    `, [tenantId, limit]);
    return rows;
  }

  async getScrollDepth(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT 
        AVG(JSON_EXTRACT(ube.eventData, '$.scrollDepth')) as avg,
        MAX(JSON_EXTRACT(ube.eventData, '$.scrollDepth')) as max
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'scroll' 
        AND ube.timestamp ${dateFilter}
        AND JSON_EXTRACT(ube.eventData, '$.scrollDepth') IS NOT NULL
    `, [tenantId]);
    return {
      avg: Math.round(rows[0]?.avg || 0),
      max: Math.round(rows[0]?.max || 0)
    };
  }

  async getProductViews(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'product_view' 
        AND ube.timestamp ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getAddToCart(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'add_to_cart' 
        AND ube.timestamp ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getCheckout(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'checkout_start' 
        AND ube.timestamp ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getPurchase(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE tenantId = ? 
        AND createdAt ${dateFilter}
        AND status = 'completed'
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getAvgPageLoadTime(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT AVG(JSON_EXTRACT(ube.eventData, '$.pageLoadTime')) as avg
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'performance' 
        AND ube.timestamp ${dateFilter}
        AND JSON_EXTRACT(ube.eventData, '$.pageLoadTime') IS NOT NULL
    `, [tenantId]);
    return Math.round(rows[0]?.avg || 0);
  }

  async getP95PageLoadTime(tenantId, dateFilter) {
    // P95 hesaplama için tüm değerleri alıp sıralayacağız
    const [rows] = await this.pool.execute(`
      SELECT JSON_EXTRACT(ube.eventData, '$.pageLoadTime') as loadTime
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'performance' 
        AND ube.timestamp ${dateFilter}
        AND JSON_EXTRACT(ube.eventData, '$.pageLoadTime') IS NOT NULL
      ORDER BY JSON_EXTRACT(ube.eventData, '$.pageLoadTime')
    `, [tenantId]);
    
    if (rows.length === 0) return 0;
    const index = Math.floor(rows.length * 0.95);
    return Math.round(rows[index]?.loadTime || 0);
  }

  async getP99PageLoadTime(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT JSON_EXTRACT(ube.eventData, '$.pageLoadTime') as loadTime
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'performance' 
        AND ube.timestamp ${dateFilter}
        AND JSON_EXTRACT(ube.eventData, '$.pageLoadTime') IS NOT NULL
      ORDER BY JSON_EXTRACT(ube.eventData, '$.pageLoadTime')
    `, [tenantId]);
    
    if (rows.length === 0) return 0;
    const index = Math.floor(rows.length * 0.99);
    return Math.round(rows[index]?.loadTime || 0);
  }

  async getAvgApiResponseTime(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT AVG(JSON_EXTRACT(ube.eventData, '$.apiResponseTime')) as avg
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'performance' 
        AND ube.timestamp ${dateFilter}
        AND JSON_EXTRACT(ube.eventData, '$.apiResponseTime') IS NOT NULL
    `, [tenantId]);
    return Math.round(rows[0]?.avg || 0);
  }

  async getErrorRate(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ube.eventType = 'error' THEN 1 ELSE 0 END) as errors
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.timestamp ${dateFilter}
    `, [tenantId]);
    
    const total = rows[0]?.total || 0;
    const errors = rows[0]?.errors || 0;
    return total > 0 ? (errors / total) * 100 : 0;
  }

  async getCrashRate(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'crash' 
        AND ube.timestamp ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getAvgPageViewsPerSession(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT AVG(us.pageCount) as avg
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime ${dateFilter} AND us.pageCount > 0
    `, [tenantId]);
    return Math.round(rows[0]?.avg || 0);
  }

  async getSessionsPerUser(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT 
        COUNT(DISTINCT us.userId) as users,
        COUNT(*) as sessions
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime ${dateFilter} AND us.userId IS NOT NULL
    `, [tenantId]);
    
    const users = rows[0]?.users || 0;
    const sessions = rows[0]?.sessions || 0;
    return users > 0 ? (sessions / users).toFixed(2) : 0;
  }

  async getReturningVsNew(tenantId, dateFilter) {
    const [rows] = await this.pool.execute(`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN us.userId IN (
            SELECT DISTINCT us2.userId 
            FROM user_sessions us2
            LEFT JOIN users u2 ON us2.userId = u2.id
            WHERE (u2.tenantId = ? OR us2.userId IS NULL)
              AND us2.startTime < DATE_SUB(NOW(), INTERVAL 1 DAY)
          ) THEN us.userId 
        END) as returning,
        COUNT(DISTINCT CASE 
          WHEN us.userId NOT IN (
            SELECT DISTINCT us2.userId 
            FROM user_sessions us2
            LEFT JOIN users u2 ON us2.userId = u2.id
            WHERE (u2.tenantId = ? OR us2.userId IS NULL)
              AND us2.startTime < DATE_SUB(NOW(), INTERVAL 1 DAY)
          ) THEN us.userId 
        END) as new
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime ${dateFilter} AND us.userId IS NOT NULL
    `, [tenantId, tenantId, tenantId]);
    
    return {
      returning: rows[0]?.returning || 0,
      new: rows[0]?.new || 0
    };
  }
}

module.exports = AnalyticsService;

