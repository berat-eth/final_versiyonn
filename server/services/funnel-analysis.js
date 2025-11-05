/**
 * Funnel Analysis Service
 * Conversion funnel'lerini görselleştirme ve analiz
 */
class FunnelAnalysisService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Funnel tanımla ve hesapla
   */
  async calculateFunnel(funnelSteps, startDate, endDate, userId = null, deviceId = null) {
    try {
      const results = [];
      let previousCount = null;

      for (let i = 0; i < funnelSteps.length; i++) {
        const step = funnelSteps[i];
        const count = await this._getStepCount(step, startDate, endDate, userId, deviceId);

        const stepResult = {
          step: i + 1,
          name: step.name,
          count,
          conversionRate: previousCount !== null && previousCount > 0
            ? (count / previousCount) * 100
            : 100,
          dropOff: previousCount !== null
            ? previousCount - count
            : 0,
          dropOffRate: previousCount !== null && previousCount > 0
            ? ((previousCount - count) / previousCount) * 100
            : 0
        };

        results.push(stepResult);
        previousCount = count;
      }

      return { success: true, data: results };
    } catch (error) {
      console.error('❌ Funnel calculation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Step için count hesapla
   */
  async _getStepCount(step, startDate, endDate, userId, deviceId) {
    try {
      let query;
      let params;

      switch (step.type) {
        case 'screen_view':
          query = `SELECT COUNT(DISTINCT deviceId) as count
                   FROM user_behavior_events
                   WHERE eventType = 'screen_view'
                     AND screenName = ?
                     AND timestamp >= ? AND timestamp <= ?`;
          params = [step.screenName, startDate, endDate];
          break;

        case 'product_view':
          query = `SELECT COUNT(DISTINCT deviceId) as count
                   FROM user_behavior_events
                   WHERE eventType = 'product_interaction'
                     AND JSON_EXTRACT(eventData, '$.productId') = ?
                     AND timestamp >= ? AND timestamp <= ?`;
          params = [step.productId, startDate, endDate];
          break;

        case 'add_to_cart':
          query = `SELECT COUNT(DISTINCT deviceId) as count
                   FROM user_behavior_events
                   WHERE eventType = 'cart_add'
                     AND timestamp >= ? AND timestamp <= ?`;
          params = [startDate, endDate];
          break;

        case 'checkout':
          query = `SELECT COUNT(DISTINCT userId) as count
                   FROM orders
                   WHERE createdAt >= ? AND createdAt <= ?`;
          params = [startDate, endDate];
          break;

        case 'purchase':
          query = `SELECT COUNT(DISTINCT userId) as count
                   FROM orders
                   WHERE status = 'completed'
                     AND createdAt >= ? AND createdAt <= ?`;
          params = [startDate, endDate];
          break;

        default:
          return 0;
      }

      // User/Device filter ekle
      if (userId) {
        query += ' AND userId = ?';
        params.push(userId);
      } else if (deviceId) {
        query += ' AND deviceId = ?';
        params.push(deviceId);
      }

      const [result] = await this.pool.execute(query, params);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('❌ Step count error:', error);
      return 0;
    }
  }

  /**
   * Funnel comparison (zaman bazlı)
   */
  async compareFunnels(funnelSteps, period1, period2) {
    try {
      const [funnel1, funnel2] = await Promise.all([
        this.calculateFunnel(funnelSteps, period1.start, period1.end),
        this.calculateFunnel(funnelSteps, period2.start, period2.end)
      ]);

      if (!funnel1.success || !funnel2.success) {
        return { success: false, error: 'Funnel calculation failed' };
      }

      // Comparison data oluştur
      const comparison = funnel1.data.map((step1, index) => {
        const step2 = funnel2.data[index];
        return {
          step: step1.step,
          name: step1.name,
          period1: {
            count: step1.count,
            conversionRate: step1.conversionRate
          },
          period2: {
            count: step2.count,
            conversionRate: step2.conversionRate
          },
          change: {
            count: step2.count - step1.count,
            conversionRate: step2.conversionRate - step1.conversionRate,
            percentChange: step1.count > 0
              ? ((step2.count - step1.count) / step1.count) * 100
              : 0
          }
        };
      });

      return { success: true, data: comparison };
    } catch (error) {
      console.error('❌ Funnel comparison error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Drop-off point analizi
   */
  async analyzeDropOffs(funnelSteps, startDate, endDate) {
    try {
      const funnel = await this.calculateFunnel(funnelSteps, startDate, endDate);

      if (!funnel.success) {
        return { success: false, error: 'Funnel calculation failed' };
      }

      const dropOffs = funnel.data
        .filter(step => step.dropOff > 0)
        .sort((a, b) => b.dropOff - a.dropOff)
        .map(step => ({
          step: step.step,
          name: step.name,
          dropOff: step.dropOff,
          dropOffRate: step.dropOffRate
        }));

      return { success: true, data: dropOffs };
    } catch (error) {
      console.error('❌ Drop-off analysis error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = FunnelAnalysisService;

