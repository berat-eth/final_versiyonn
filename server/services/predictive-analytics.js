/**
 * Predictive Analytics Service
 * Gelecek davranışları tahmin etme (churn, purchase probability, etc.)
 */
class PredictiveAnalyticsService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Churn prediction (kullanıcı ayrılma tahmini)
   */
  async predictChurn(userId, days = 30) {
    try {
      // Kullanıcı aktivite verilerini al
      const [activity] = await this.pool.execute(
        `SELECT 
          COUNT(*) as totalEvents,
          COUNT(DISTINCT DATE(timestamp)) as activeDays,
          MAX(timestamp) as lastActivity,
          AVG(TIMESTAMPDIFF(HOUR, 
            (SELECT timestamp FROM user_behavior_events 
             WHERE userId = ? AND timestamp < ube.timestamp 
             ORDER BY timestamp DESC LIMIT 1),
            timestamp)) as avgSessionInterval
         FROM user_behavior_events ube
         WHERE userId = ?
           AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [userId, userId, days]
      );

      const stats = activity[0];
      const daysSinceLastActivity = stats.lastActivity
        ? Math.floor((Date.now() - new Date(stats.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : days;

      // Churn score hesapla (basit model)
      let churnScore = 0;

      // Son aktiviteden geçen süre
      if (daysSinceLastActivity > 7) churnScore += 30;
      if (daysSinceLastActivity > 14) churnScore += 20;
      if (daysSinceLastActivity > 30) churnScore += 30;

      // Aktif gün sayısı
      const activeDaysRatio = stats.activeDays / days;
      if (activeDaysRatio < 0.1) churnScore += 20;
      if (activeDaysRatio < 0.3) churnScore += 10;

      // Session interval
      if (stats.avgSessionInterval > 72) churnScore += 20; // 3 günden fazla

      const churnProbability = Math.min(churnScore, 100);

      return {
        success: true,
        data: {
          userId,
          churnProbability,
          riskLevel: churnProbability > 70 ? 'high' : churnProbability > 40 ? 'medium' : 'low',
          daysSinceLastActivity,
          activeDays: stats.activeDays,
          totalEvents: stats.totalEvents,
          recommendations: this._getChurnRecommendations(churnProbability, stats)
        }
      };
    } catch (error) {
      console.error('❌ Churn prediction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Purchase probability scoring
   */
  async predictPurchaseProbability(userId, deviceId = null) {
    try {
      const filter = userId
        ? 'WHERE userId = ?'
        : 'WHERE deviceId = ?';
      const params = userId ? [userId] : [deviceId];

      // Kullanıcı davranış verilerini al
      const [behavior] = await this.pool.execute(
        `SELECT 
          COUNT(CASE WHEN eventType = 'product_interaction' THEN 1 END) as productViews,
          COUNT(CASE WHEN eventType = 'cart_add' THEN 1 END) as cartAdds,
          COUNT(CASE WHEN eventType = 'cart_remove' THEN 1 END) as cartRemoves,
          AVG(CASE WHEN eventType = 'product_interaction' 
            THEN JSON_EXTRACT(eventData, '$.duration') END) as avgProductViewDuration,
          MAX(timestamp) as lastActivity
         FROM user_behavior_events
         ${filter}
           AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        params
      );

      const stats = behavior[0] || {};

      // Purchase probability score
      let score = 0;

      // Product views
      if (stats.productViews > 10) score += 20;
      if (stats.productViews > 5) score += 10;

      // Cart activity
      if (stats.cartAdds > stats.cartRemoves) score += 30;
      if (stats.cartAdds > 0) score += 20;

      // Engagement
      if (stats.avgProductViewDuration > 30000) score += 20; // 30 saniyeden fazla

      // Recent activity
      const hoursSinceLastActivity = stats.lastActivity
        ? Math.floor((Date.now() - new Date(stats.lastActivity).getTime()) / (1000 * 60 * 60))
        : 168; // 7 days
      
      if (hoursSinceLastActivity < 24) score += 10;

      const purchaseProbability = Math.min(score, 100);

      return {
        success: true,
        data: {
          userId,
          deviceId,
          purchaseProbability,
          confidence: purchaseProbability > 50 ? 'high' : purchaseProbability > 30 ? 'medium' : 'low',
          factors: {
            productViews: stats.productViews,
            cartAdds: stats.cartAdds,
            cartRemoves: stats.cartRemoves,
            avgProductViewDuration: stats.avgProductViewDuration
          }
        }
      };
    } catch (error) {
      console.error('❌ Purchase probability error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Session duration prediction
   */
  async predictSessionDuration(userId, deviceId) {
    try {
      // Geçmiş session verilerini al
      const [sessions] = await this.pool.execute(
        `SELECT 
          AVG(duration) as avgDuration,
          STDDEV(duration) as stdDev,
          COUNT(*) as sessionCount
         FROM user_sessions
         WHERE (userId = ? OR deviceId = ?)
           AND duration > 0
           AND startTime >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [userId, deviceId]
      );

      const stats = sessions[0] || {};
      const predictedDuration = stats.avgDuration || 0;
      const confidence = stats.sessionCount > 10 ? 'high' : stats.sessionCount > 5 ? 'medium' : 'low';

      return {
        success: true,
        data: {
          predictedDuration,
          confidence,
          stats: {
            avgDuration: stats.avgDuration,
            stdDev: stats.stdDev,
            sessionCount: stats.sessionCount
          }
        }
      };
    } catch (error) {
      console.error('❌ Session duration prediction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Churn önerileri
   */
  _getChurnRecommendations(churnProbability, stats) {
    const recommendations = [];

    if (churnProbability > 70) {
      recommendations.push('Kullanıcıya özel teklif gönder');
      recommendations.push('E-posta kampanyası başlat');
    }

    if (stats.activeDays < 5) {
      recommendations.push('Onboarding sürecini gözden geçir');
    }

    if (stats.avgSessionInterval > 72) {
      recommendations.push('Push notification gönder');
    }

    return recommendations;
  }
}

module.exports = PredictiveAnalyticsService;

