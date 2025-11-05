/**
 * Data Retention Service
 * Otomatik archiving ve data management
 */
class DataRetentionService {
  constructor(pool) {
    this.pool = pool;
    this.retentionDays = {
      events: 90, // 90 gün
      sessions: 180, // 180 gün
      aggregates: 365, // 1 yıl
      archived: 730 // 2 yıl (archive)
    };
  }

  /**
   * Eski verileri archive et
   */
  async archiveOldData(days = null) {
    try {
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - (days || this.retentionDays.events));

      // Archive tablosu var mı kontrol et
      const [tables] = await this.pool.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_behavior_events_archive'`
      );

      if (tables.length > 0) {
        // Eski event'leri archive et
        const [archivedEvents] = await this.pool.execute(
          `INSERT INTO user_behavior_events_archive
           (id, userId, deviceId, eventType, screenName, eventData, sessionId, timestamp, ipAddress, userAgent)
           SELECT id, userId, deviceId, eventType, screenName, eventData, sessionId, timestamp, ipAddress, userAgent
           FROM user_behavior_events
           WHERE timestamp < ?
           ON DUPLICATE KEY UPDATE id = id`,
          [archiveDate]
        );

        // Archive edilen event'leri sil
        await this.pool.execute(
          `DELETE FROM user_behavior_events
           WHERE timestamp < ?`,
          [archiveDate]
        );

        return {
          success: true,
          archived: {
            events: archivedEvents.affectedRows || 0,
            date: archiveDate.toISOString()
          }
        };
      } else {
        // Archive tablosu yok - direkt sil
        const [deleted] = await this.pool.execute(
          `DELETE FROM user_behavior_events
           WHERE timestamp < ?`,
          [archiveDate]
        );

        return {
          success: true,
          archived: {
            events: deleted.affectedRows || 0,
            date: archiveDate.toISOString(),
            note: 'Archive table not found, events deleted directly'
          }
        };
      }
    } catch (error) {
      console.error('❌ Archive error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kullanıcı verisi sil (GDPR compliance)
   */
  async deleteUserData(userId) {
    try {
      // Tüm kullanıcı verilerini sil
      await this.pool.execute(
        'DELETE FROM user_behavior_events WHERE userId = ?',
        [userId]
      );

      await this.pool.execute(
        'DELETE FROM user_sessions WHERE userId = ?',
        [userId]
      );

      await this.pool.execute(
        'DELETE FROM device_analytics_aggregates WHERE userId = ?',
        [userId]
      );

      // Device bilgilerini de temizle (eğer sadece bu user'a aitse)
      await this.pool.execute(
        `DELETE FROM anonymous_devices
         WHERE deviceId IN (
           SELECT DISTINCT deviceId FROM user_behavior_events WHERE userId = ?
         )
         AND deviceId NOT IN (
           SELECT DISTINCT deviceId FROM user_behavior_events WHERE userId IS NOT NULL AND userId != ?
         )`,
        [userId, userId]
      );

      return { success: true };
    } catch (error) {
      console.error('❌ Delete user data error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Device verisi sil
   */
  async deleteDeviceData(deviceId) {
    try {
      await this.pool.execute(
        'DELETE FROM user_behavior_events WHERE deviceId = ?',
        [deviceId]
      );

      await this.pool.execute(
        'DELETE FROM user_sessions WHERE deviceId = ?',
        [deviceId]
      );

      await this.pool.execute(
        'DELETE FROM device_analytics_aggregates WHERE deviceId = ?',
        [deviceId]
      );

      await this.pool.execute(
        'DELETE FROM anonymous_devices WHERE deviceId = ?',
        [deviceId]
      );

      return { success: true };
    } catch (error) {
      console.error('❌ Delete device data error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retention policy'yi uygula (cron job için)
   */
  async applyRetentionPolicy() {
    try {
      const results = {
        events: await this.archiveOldData(this.retentionDays.events),
        sessions: await this._cleanOldSessions(),
        aggregates: await this._cleanOldAggregates()
      };

      return { success: true, results };
    } catch (error) {
      console.error('❌ Retention policy error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eski session'ları temizle
   */
  async _cleanOldSessions() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays.sessions);

      const [result] = await this.pool.execute(
        `DELETE FROM user_sessions
         WHERE endTime < ? AND endTime IS NOT NULL`,
        [cutoffDate]
      );

      return { deleted: result.affectedRows || 0 };
    } catch (error) {
      return { deleted: 0, error: error.message };
    }
  }

  /**
   * Eski aggregate'leri temizle
   */
  async _cleanOldAggregates() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays.aggregates);

      const [result] = await this.pool.execute(
        `DELETE FROM device_analytics_aggregates
         WHERE date < ?`,
        [cutoffDate.toISOString().split('T')[0]]
      );

      return { deleted: result.affectedRows || 0 };
    } catch (error) {
      return { deleted: 0, error: error.message };
    }
  }
}

module.exports = DataRetentionService;

