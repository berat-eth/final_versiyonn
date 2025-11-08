const Redis = require('ioredis');
const { poolWrapper } = require('../database-schema');

class MLService {
  constructor() {
    this.redis = null;
    this.queueName = 'ml:events';
    this.initRedis();
  }

  async initRedis() {
    try {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false
      });

      this.redis.on('error', (err) => {
        console.warn('⚠️ ML Service Redis error:', err.message);
      });

      this.redis.on('ready', () => {
        console.log('✅ ML Service Redis connected');
      });
    } catch (error) {
      console.error('❌ ML Service Redis initialization error:', error);
      this.redis = null;
    }
  }

  /**
   * Send event to ML queue for processing
   */
  async sendEventToML(event) {
    try {
      if (!this.redis) {
        await this.initRedis();
      }

      if (!this.redis) {
        console.warn('⚠️ Redis not available, skipping ML event');
        return false;
      }

      const eventJson = JSON.stringify({
        id: event.id,
        userId: event.userId,
        deviceId: event.deviceId,
        eventType: event.eventType,
        screenName: event.screenName,
        eventData: event.eventData,
        sessionId: event.sessionId,
        timestamp: event.timestamp || new Date().toISOString()
      });

      await this.redis.lpush(this.queueName, eventJson);
      return true;
    } catch (error) {
      console.error('❌ Error sending event to ML queue:', error);
      return false;
    }
  }

  /**
   * Get ML predictions for user
   */
  async getPredictions(userId, tenantId = 1, limit = 10) {
    try {
      const [rows] = await poolWrapper.execute(`
        SELECT 
          id,
          userId,
          predictionType,
          probability,
          metadata,
          createdAt
        FROM ml_predictions
        WHERE userId = ? AND tenantId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `, [userId, tenantId, limit]);

      return rows.map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata
      }));
    } catch (error) {
      console.error('❌ Error getting predictions:', error);
      throw error;
    }
  }

  /**
   * Get ML recommendations for user
   */
  async getRecommendations(userId, tenantId = 1) {
    try {
      const [rows] = await poolWrapper.execute(`
        SELECT 
          id,
          userId,
          productIds,
          scores,
          metadata,
          createdAt,
          updatedAt
        FROM ml_recommendations
        WHERE userId = ? AND tenantId = ?
        ORDER BY updatedAt DESC
        LIMIT 1
      `, [userId, tenantId]);

      if (rows.length === 0) {
        return null;
      }

      const rec = rows[0];
      return {
        ...rec,
        productIds: rec.productIds.split(',').map(id => parseInt(id)),
        scores: rec.scores.split(',').map(score => parseFloat(score)),
        metadata: typeof rec.metadata === 'string' ? JSON.parse(rec.metadata || '{}') : rec.metadata
      };
    } catch (error) {
      console.error('❌ Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Get ML anomalies
   */
  async getAnomalies(tenantId = 1, filters = {}, limit = 100, offset = 0) {
    try {
      let query = `
        SELECT 
          a.id,
          a.eventId,
          a.userId,
          u.name as userName,
          a.anomalyScore,
          a.anomalyType,
          a.metadata,
          a.createdAt
        FROM ml_anomalies a
        LEFT JOIN users u ON a.userId = u.id
        WHERE a.tenantId = ?
      `;
      const params = [tenantId];

      if (filters.userId) {
        query += ` AND a.userId = ?`;
        params.push(filters.userId);
      }

      if (filters.anomalyType) {
        query += ` AND a.anomalyType = ?`;
        params.push(filters.anomalyType);
      }

      if (filters.minScore) {
        query += ` AND a.anomalyScore >= ?`;
        params.push(filters.minScore);
      }

      if (filters.startDate) {
        query += ` AND a.createdAt >= ?`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND a.createdAt <= ?`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await poolWrapper.execute(query, params);

      // Total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM ml_anomalies a
        WHERE a.tenantId = ?
      `;
      const countParams = [tenantId];

      if (filters.userId) {
        countQuery += ` AND a.userId = ?`;
        countParams.push(filters.userId);
      }

      if (filters.anomalyType) {
        countQuery += ` AND a.anomalyType = ?`;
        countParams.push(filters.anomalyType);
      }

      if (filters.minScore) {
        countQuery += ` AND a.anomalyScore >= ?`;
        countParams.push(filters.minScore);
      }

      if (filters.startDate) {
        countQuery += ` AND a.createdAt >= ?`;
        countParams.push(filters.startDate);
      }

      if (filters.endDate) {
        countQuery += ` AND a.createdAt <= ?`;
        countParams.push(filters.endDate);
      }

      const [countResult] = await poolWrapper.execute(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      return {
        anomalies: rows.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata
        })),
        total,
        limit,
        offset
      };
    } catch (error) {
      console.error('❌ Error getting anomalies:', error);
      throw error;
    }
  }

  /**
   * Get ML segments
   */
  async getSegments(tenantId = 1, filters = {}) {
    try {
      let query = `
        SELECT 
          segmentId,
          segmentName,
          COUNT(*) as userCount,
          AVG(confidence) as avgConfidence
        FROM ml_segments
        WHERE tenantId = ?
      `;
      const params = [tenantId];

      if (filters.segmentId) {
        query += ` AND segmentId = ?`;
        params.push(filters.segmentId);
      }

      query += ` GROUP BY segmentId, segmentName ORDER BY userCount DESC`;

      const [rows] = await poolWrapper.execute(query, params);

      return rows;
    } catch (error) {
      console.error('❌ Error getting segments:', error);
      throw error;
    }
  }

  /**
   * Get user segment
   */
  async getUserSegment(userId, tenantId = 1) {
    try {
      const [rows] = await poolWrapper.execute(`
        SELECT 
          segmentId,
          segmentName,
          confidence,
          metadata,
          updatedAt
        FROM ml_segments
        WHERE userId = ? AND tenantId = ?
        ORDER BY updatedAt DESC
        LIMIT 1
      `, [userId, tenantId]);

      if (rows.length === 0) {
        return null;
      }

      return {
        ...rows[0],
        metadata: typeof rows[0].metadata === 'string' ? JSON.parse(rows[0].metadata || '{}') : rows[0].metadata
      };
    } catch (error) {
      console.error('❌ Error getting user segment:', error);
      throw error;
    }
  }

  /**
   * Get ML models status
   */
  async getModelsStatus() {
    try {
      const [rows] = await poolWrapper.execute(`
        SELECT 
          id,
          modelName,
          modelType,
          version,
          status,
          accuracy,
          precision,
          recall,
          f1Score,
          trainingDataSize,
          trainingDuration,
          deployedAt,
          createdAt,
          updatedAt
        FROM ml_models
        ORDER BY updatedAt DESC
      `);

      return rows.map(row => ({
        ...row,
        hyperparameters: typeof row.hyperparameters === 'string' ? JSON.parse(row.hyperparameters || '{}') : row.hyperparameters,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata
      }));
    } catch (error) {
      console.error('❌ Error getting models status:', error);
      throw error;
    }
  }

  /**
   * Get ML statistics
   */
  async getStatistics(tenantId = 1, timeRange = '7d') {
    try {
      const dateFilter = this.getDateFilter(timeRange);

      const [
        totalPredictions,
        totalRecommendations,
        totalAnomalies,
        avgPredictionProbability,
        topAnomalyTypes
      ] = await Promise.all([
        this.getTotalPredictions(tenantId, dateFilter),
        this.getTotalRecommendations(tenantId, dateFilter),
        this.getTotalAnomalies(tenantId, dateFilter),
        this.getAvgPredictionProbability(tenantId, dateFilter),
        this.getTopAnomalyTypes(tenantId, dateFilter)
      ]);

      return {
        totalPredictions,
        totalRecommendations,
        totalAnomalies,
        avgPredictionProbability,
        topAnomalyTypes
      };
    } catch (error) {
      console.error('❌ Error getting ML statistics:', error);
      throw error;
    }
  }

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
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return `>= '${startDate.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }

  async getTotalPredictions(tenantId, dateFilter) {
    const [rows] = await poolWrapper.execute(`
      SELECT COUNT(*) as count
      FROM ml_predictions
      WHERE tenantId = ? AND createdAt ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getTotalRecommendations(tenantId, dateFilter) {
    const [rows] = await poolWrapper.execute(`
      SELECT COUNT(*) as count
      FROM ml_recommendations
      WHERE tenantId = ? AND updatedAt ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getTotalAnomalies(tenantId, dateFilter) {
    const [rows] = await poolWrapper.execute(`
      SELECT COUNT(*) as count
      FROM ml_anomalies
      WHERE tenantId = ? AND createdAt ${dateFilter}
    `, [tenantId]);
    return rows[0]?.count || 0;
  }

  async getAvgPredictionProbability(tenantId, dateFilter) {
    const [rows] = await poolWrapper.execute(`
      SELECT AVG(probability) as avg
      FROM ml_predictions
      WHERE tenantId = ? AND createdAt ${dateFilter}
    `, [tenantId]);
    return parseFloat(rows[0]?.avg || 0);
  }

  async getTopAnomalyTypes(tenantId, dateFilter, limit = 5) {
    const [rows] = await poolWrapper.execute(`
      SELECT 
        anomalyType,
        COUNT(*) as count
      FROM ml_anomalies
      WHERE tenantId = ? AND createdAt ${dateFilter}
      GROUP BY anomalyType
      ORDER BY count DESC
      LIMIT ?
    `, [tenantId, limit]);
    return rows;
  }
}

module.exports = new MLService();

