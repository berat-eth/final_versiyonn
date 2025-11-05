/**
 * Anomaly Detection Service
 * Şüpheli aktiviteleri tespit etme ve fraud detection
 */
class AnomalyDetectorService {
  constructor(pool) {
    this.pool = pool;
    this.thresholds = {
      eventsPerSecond: 10, // Saniyede 10'dan fazla event
      eventsPerMinute: 100, // Dakikada 100'den fazla event
      sessionDuration: 3600000, // 1 saatten fazla session
      suspiciousPatterns: ['rapid_clicks', 'automated_scrolling', 'rapid_navigation']
    };
  }

  /**
   * Event pattern'i analiz et ve anomali tespit et
   */
  async detectAnomalies(deviceId, userId = null, timeWindow = 300) {
    try {
      const anomalies = [];
      const now = new Date();
      const windowStart = new Date(now.getTime() - timeWindow * 1000);

      // 1. Event rate check
      const eventRate = await this._checkEventRate(deviceId, userId, windowStart, now);
      if (eventRate.isAnomalous) {
        anomalies.push({
          type: 'high_event_rate',
          severity: 'high',
          message: `Anormal event rate: ${eventRate.rate} events/second`,
          details: eventRate
        });
      }

      // 2. Bot detection
      const botDetection = await this._detectBot(deviceId, userId, windowStart, now);
      if (botDetection.isBot) {
        anomalies.push({
          type: 'bot_detected',
          severity: 'critical',
          message: 'Bot aktivitesi tespit edildi',
          details: botDetection
        });
      }

      // 3. Suspicious patterns
      const patterns = await this._detectSuspiciousPatterns(deviceId, userId, windowStart, now);
      if (patterns.length > 0) {
        anomalies.push({
          type: 'suspicious_patterns',
          severity: 'medium',
          message: `${patterns.length} şüpheli pattern tespit edildi`,
          details: { patterns }
        });
      }

      // 4. Session anomalies
      const sessionAnomalies = await this._checkSessionAnomalies(deviceId, userId);
      if (sessionAnomalies.length > 0) {
        anomalies.push(...sessionAnomalies);
      }

      return {
        success: true,
        hasAnomalies: anomalies.length > 0,
        anomalies,
        riskScore: this._calculateRiskScore(anomalies)
      };
    } catch (error) {
      console.error('❌ Anomaly detection error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Event rate kontrolü
   */
  async _checkEventRate(deviceId, userId, start, end) {
    try {
      const filter = userId
        ? 'WHERE (userId = ? OR deviceId = ?) AND timestamp >= ? AND timestamp <= ?'
        : 'WHERE deviceId = ? AND timestamp >= ? AND timestamp <= ?';
      
      const params = userId
        ? [userId, deviceId, start, end]
        : [deviceId, start, end];

      const [result] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM user_behavior_events
         ${filter}`,
        params
      );

      const count = result[0]?.count || 0;
      const duration = (end.getTime() - start.getTime()) / 1000; // seconds
      const rate = count / duration;

      return {
        count,
        duration,
        rate: parseFloat(rate.toFixed(2)),
        isAnomalous: rate > this.thresholds.eventsPerSecond
      };
    } catch (error) {
      return { count: 0, duration: 0, rate: 0, isAnomalous: false };
    }
  }

  /**
   * Bot detection
   */
  async _detectBot(deviceId, userId, start, end) {
    try {
      // Bot göstergeleri:
      // 1. Çok hızlı tıklama (humanly impossible)
      // 2. Mükemmel scroll pattern (too regular)
      // 3. İnsan olmayan navigation pattern

      const filter = userId
        ? 'WHERE (userId = ? OR deviceId = ?) AND timestamp >= ? AND timestamp <= ?'
        : 'WHERE deviceId = ? AND timestamp >= ? AND timestamp <= ?';
      
      const params = userId
        ? [userId, deviceId, start, end]
        : [deviceId, start, end];

      // Rapid clicks check
      const [clicks] = await this.pool.execute(
        `SELECT COUNT(*) as count,
                MIN(TIMESTAMPDIFF(MICROSECOND, timestamp, 
                    (SELECT timestamp FROM user_behavior_events 
                     WHERE eventType = 'click' AND timestamp > ube.timestamp 
                     ORDER BY timestamp LIMIT 1))) as minInterval
         FROM user_behavior_events ube
         WHERE eventType = 'click'
           ${filter.replace('WHERE', 'AND')}
         GROUP BY deviceId`,
        params
      );

      // Mükemmel scroll pattern check
      const [scrolls] = await this.pool.execute(
        `SELECT AVG(JSON_EXTRACT(eventData, '$.scrollDepth')) as avgDepth,
                STDDEV(JSON_EXTRACT(eventData, '$.scrollDepth')) as stdDev
         FROM user_behavior_events
         WHERE eventType = 'scroll_depth'
           ${filter.replace('WHERE', 'AND')}`,
        params
      );

      const isBot = (
        (clicks[0]?.minInterval < 100000) || // 100ms'den az click interval
        (scrolls[0]?.stdDev < 5) // Çok düzenli scroll pattern
      );

      return {
        isBot,
        indicators: {
          rapidClicks: clicks[0]?.minInterval < 100000,
          regularScroll: scrolls[0]?.stdDev < 5
        }
      };
    } catch (error) {
      return { isBot: false, indicators: {} };
    }
  }

  /**
   * Şüpheli pattern'leri tespit et
   */
  async _detectSuspiciousPatterns(deviceId, userId, start, end) {
    try {
      const patterns = [];

      // Rapid navigation check
      const [navigation] = await this.pool.execute(
        `SELECT COUNT(*) as count,
                AVG(TIMESTAMPDIFF(SECOND, timestamp, 
                    (SELECT timestamp FROM user_behavior_events 
                     WHERE eventType = 'navigation_path' AND timestamp > ube.timestamp 
                     ORDER BY timestamp LIMIT 1))) as avgNavigationTime
         FROM user_behavior_events ube
         WHERE eventType = 'navigation_path'
           AND deviceId = ?
           AND timestamp >= ? AND timestamp <= ?`,
        [deviceId, start, end]
      );

      if (navigation[0]?.avgNavigationTime < 2) {
        patterns.push('rapid_navigation');
      }

      // Automated scrolling
      const [scrollEvents] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM user_behavior_events
         WHERE eventType = 'scroll_depth'
           AND deviceId = ?
           AND timestamp >= ? AND timestamp <= ?`,
        [deviceId, start, end]
      );

      const scrollRate = scrollEvents[0]?.count / ((end.getTime() - start.getTime()) / 1000);
      if (scrollRate > 5) { // Saniyede 5'ten fazla scroll
        patterns.push('automated_scrolling');
      }

      return patterns;
    } catch (error) {
      return [];
    }
  }

  /**
   * Session anomali kontrolü
   */
  async _checkSessionAnomalies(deviceId, userId) {
    try {
      const anomalies = [];

      const [sessions] = await this.pool.execute(
        `SELECT duration, pageCount, scrollDepth
         FROM user_sessions
         WHERE deviceId = ?
           AND endTime IS NOT NULL
         ORDER BY startTime DESC
         LIMIT 10`,
        [deviceId]
      );

      // Uzun session kontrolü
      const longSessions = sessions.filter(s => s.duration > this.thresholds.sessionDuration);
      if (longSessions.length > 0) {
        anomalies.push({
          type: 'long_session',
          severity: 'low',
          message: `${longSessions.length} uzun session tespit edildi`,
          details: { sessions: longSessions }
        });
      }

      return anomalies;
    } catch (error) {
      return [];
    }
  }

  /**
   * Risk score hesapla
   */
  _calculateRiskScore(anomalies) {
    let score = 0;

    for (const anomaly of anomalies) {
      switch (anomaly.severity) {
        case 'critical':
          score += 50;
          break;
        case 'high':
          score += 25;
          break;
        case 'medium':
          score += 10;
          break;
        case 'low':
          score += 5;
          break;
      }
    }

    return Math.min(score, 100); // Max 100
  }

  /**
   * Fraud signal oluştur
   */
  async generateFraudSignal(deviceId, userId, anomalies) {
    try {
      const riskScore = this._calculateRiskScore(anomalies);

      if (riskScore >= 50) {
        // Fraud signal kaydet
        await this.pool.execute(
          `INSERT INTO user_behavior_events
           (deviceId, userId, eventType, eventData, timestamp)
           VALUES (?, ?, 'fraud_signal', ?, NOW())`,
          [
            deviceId,
            userId,
            JSON.stringify({
              riskScore,
              anomalies,
              timestamp: new Date().toISOString()
            })
          ]
        );

        return { success: true, fraudDetected: true, riskScore };
      }

      return { success: true, fraudDetected: false, riskScore };
    } catch (error) {
      console.error('❌ Fraud signal generation error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = AnomalyDetectorService;

