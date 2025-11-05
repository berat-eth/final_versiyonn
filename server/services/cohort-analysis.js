/**
 * Cohort Analysis Service
 * Kullanıcı gruplarının davranışlarını analiz etme
 */
class CohortAnalysisService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Kayıt tarihine göre cohort'lar oluştur
   */
  async getCohortsByRegistrationDate(startDate, endDate, cohortInterval = 'month') {
    try {
      // Interval'a göre format belirle
      let dateFormat;
      let intervalSql;
      
      switch (cohortInterval) {
        case 'week':
          dateFormat = '%Y-%u';
          intervalSql = 'WEEK';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          intervalSql = 'MONTH';
          break;
        case 'quarter':
          dateFormat = '%Y-Q%q';
          intervalSql = 'QUARTER';
          break;
        default:
          dateFormat = '%Y-%m';
          intervalSql = 'MONTH';
      }

      // Cohort'ları oluştur (kayıt tarihine göre)
      const [cohorts] = await this.pool.execute(
        `SELECT 
          DATE_FORMAT(u.createdAt, ?) as cohort,
          COUNT(DISTINCT u.id) as totalUsers,
          COUNT(DISTINCT CASE WHEN ube.userId IS NOT NULL THEN u.id END) as activeUsers,
          COUNT(DISTINCT o.userId) as purchasers,
          SUM(o.total) as totalRevenue
         FROM users u
         LEFT JOIN user_behavior_events ube ON u.id = ube.userId AND ube.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         LEFT JOIN orders o ON u.id = o.userId
         WHERE u.createdAt >= ? AND u.createdAt <= ?
         GROUP BY cohort
         ORDER BY cohort ASC`,
        [dateFormat, startDate, endDate]
      );

      return { success: true, data: cohorts };
    } catch (error) {
      console.error('❌ Cohort analysis error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retention rate hesapla
   */
  async calculateRetentionRate(cohort, periods = 12) {
    try {
      const retentionData = [];

      for (let period = 0; period <= periods; period++) {
        // Her period için aktif kullanıcı sayısını hesapla
        const [retention] = await this.pool.execute(
          `SELECT COUNT(DISTINCT ube.userId) as activeUsers
           FROM users u
           INNER JOIN user_behavior_events ube ON u.id = ube.userId
           WHERE DATE_FORMAT(u.createdAt, '%Y-%m') = ?
             AND ube.timestamp >= DATE_ADD(u.createdAt, INTERVAL ? MONTH)
             AND ube.timestamp < DATE_ADD(u.createdAt, INTERVAL ? MONTH)
           GROUP BY u.createdAt`,
          [cohort, period, period + 1]
        );

        const [cohortSize] = await this.pool.execute(
          `SELECT COUNT(*) as total
           FROM users
           WHERE DATE_FORMAT(createdAt, '%Y-%m') = ?`,
          [cohort]
        );

        const retentionRate = cohortSize[0]?.total > 0
          ? (retention[0]?.activeUsers || 0) / cohortSize[0].total * 100
          : 0;

        retentionData.push({
          period,
          activeUsers: retention[0]?.activeUsers || 0,
          cohortSize: cohortSize[0]?.total || 0,
          retentionRate: parseFloat(retentionRate.toFixed(2))
        });
      }

      return { success: true, data: retentionData };
    } catch (error) {
      console.error('❌ Retention calculation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lifetime Value (LTV) analizi
   */
  async calculateLTV(cohort, days = 90) {
    try {
      const [ltvData] = await this.pool.execute(
        `SELECT 
          u.id,
          u.createdAt,
          COUNT(DISTINCT o.id) as totalOrders,
          SUM(o.total) as totalRevenue,
          AVG(o.total) as avgOrderValue,
          DATEDIFF(NOW(), u.createdAt) as daysSinceRegistration
         FROM users u
         LEFT JOIN orders o ON u.id = o.userId
         WHERE DATE_FORMAT(u.createdAt, '%Y-%m') = ?
           AND DATEDIFF(NOW(), u.createdAt) <= ?
         GROUP BY u.id
         ORDER BY totalRevenue DESC`,
        [cohort, days]
      );

      const stats = {
        totalUsers: ltvData.length,
        totalRevenue: ltvData.reduce((sum, u) => sum + (parseFloat(u.totalRevenue) || 0), 0),
        avgLTV: ltvData.length > 0
          ? ltvData.reduce((sum, u) => sum + (parseFloat(u.totalRevenue) || 0), 0) / ltvData.length
          : 0,
        avgOrderValue: ltvData.length > 0
          ? ltvData.reduce((sum, u) => sum + (parseFloat(u.avgOrderValue) || 0), 0) / ltvData.length
          : 0,
        avgOrdersPerUser: ltvData.length > 0
          ? ltvData.reduce((sum, u) => sum + (parseInt(u.totalOrders) || 0), 0) / ltvData.length
          : 0
      };

      return { success: true, data: { users: ltvData, stats } };
    } catch (error) {
      console.error('❌ LTV calculation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cohort bazlı conversion rate
   */
  async getCohortConversionRate(cohort) {
    try {
      const [conversion] = await this.pool.execute(
        `SELECT 
          COUNT(DISTINCT u.id) as totalUsers,
          COUNT(DISTINCT o.userId) as purchasers,
          COUNT(DISTINCT o.id) as totalOrders,
          SUM(o.total) as totalRevenue
         FROM users u
         LEFT JOIN orders o ON u.id = o.userId
         WHERE DATE_FORMAT(u.createdAt, '%Y-%m') = ?`,
        [cohort]
      );

      const data = conversion[0];
      const conversionRate = data.totalUsers > 0
        ? (data.purchasers / data.totalUsers) * 100
        : 0;

      return {
        success: true,
        data: {
          totalUsers: data.totalUsers,
          purchasers: data.purchasers,
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          totalOrders: data.totalOrders,
          totalRevenue: parseFloat(data.totalRevenue || 0)
        }
      };
    } catch (error) {
      console.error('❌ Conversion rate calculation error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CohortAnalysisService;

