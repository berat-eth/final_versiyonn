const { getClient } = require('../redis');

/**
 * Health Monitoring Service
 * Sistem sağlığını izleme ve metrik toplama
 */
class HealthMonitorService {
  constructor(pool) {
    this.pool = pool;
    this.metrics = {
      eventProcessingRate: 0,
      queueSize: 0,
      databaseConnections: 0,
      redisLatency: 0,
      lastUpdate: Date.now()
    };
    this.updateInterval = 10000; // 10 saniyede bir güncelle
  }

  /**
   * Sistem sağlığını kontrol et
   */
  async checkHealth() {
    try {
      const checks = await Promise.allSettled([
        this._checkDatabase(),
        this._checkRedis(),
        this._checkEventQueue(),
        this._checkProcessingRate()
      ]);

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy', error: checks[0].reason },
          redis: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unhealthy', error: checks[1].reason },
          eventQueue: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'unhealthy', error: checks[2].reason },
          processingRate: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'unhealthy', error: checks[3].reason }
        },
        metrics: this.metrics
      };

      // Genel durum belirleme
      const unhealthyCount = Object.values(health.checks).filter(c => c.status === 'unhealthy').length;
      if (unhealthyCount > 0) {
        health.status = unhealthyCount >= 2 ? 'critical' : 'degraded';
      }

      return health;
    } catch (error) {
      console.error('❌ Health check error:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Database sağlığını kontrol et
   */
  async _checkDatabase() {
    try {
      const start = Date.now();
      await this.pool.execute('SELECT 1');
      const latency = Date.now() - start;

      // Connection pool bilgisi
      const poolInfo = this.pool.config || {};
      const activeConnections = poolInfo.connectionLimit || 0;

      this.metrics.databaseConnections = activeConnections;
      this.metrics.databaseLatency = latency;

      return {
        status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
        latency,
        activeConnections
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Redis sağlığını kontrol et
   */
  async _checkRedis() {
    try {
      const client = getClient();
      if (!client) {
        return { status: 'unavailable', message: 'Redis client not available' };
      }

      const start = Date.now();
      await client.ping();
      const latency = Date.now() - start;

      this.metrics.redisLatency = latency;

      return {
        status: latency < 10 ? 'healthy' : latency < 50 ? 'degraded' : 'unhealthy',
        latency
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Event queue durumunu kontrol et
   */
  async _checkEventQueue() {
    try {
      const getEventQueue = require('./event-queue');
      const queue = getEventQueue();
      
      const queueSize = await queue.getQueueSize();
      const pending = await queue.getPendingMessages();

      this.metrics.queueSize = queueSize;
      this.metrics.pendingMessages = pending.length || 0;

      // Queue size threshold
      const isHealthy = queueSize < 1000;
      const isDegraded = queueSize < 5000;

      return {
        status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
        queueSize,
        pendingMessages: pending.length || 0
      };
    } catch (error) {
      return { status: 'unavailable', error: error.message };
    }
  }

  /**
   * Event processing rate'i kontrol et
   */
  async _checkProcessingRate() {
    try {
      // Son 1 dakikadaki event sayısını hesapla
      const [events] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM user_behavior_events
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)`
      );

      const rate = events[0]?.count || 0;
      this.metrics.eventProcessingRate = rate;

      return {
        status: rate < 1000 ? 'healthy' : rate < 5000 ? 'degraded' : 'unhealthy',
        rate: `${rate} events/minute`
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Metrikleri getir
   */
  getMetrics() {
    return {
      ...this.metrics,
      lastUpdate: new Date(this.metrics.lastUpdate).toISOString()
    };
  }

  /**
   * Periyodik güncelleme başlat
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.checkHealth();
      this.metrics.lastUpdate = Date.now();
    }, this.updateInterval);

    console.log('✅ Health Monitoring started');
  }

  /**
   * Monitoring'i durdur
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('✅ Health Monitoring stopped');
    }
  }
}

module.exports = HealthMonitorService;

