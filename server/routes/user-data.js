const express = require('express');
const router = express.Router();
const UserDataLogger = require('../services/user-data-logger');

const userDataLogger = new UserDataLogger();


// Kullanıcı verilerini kaydet
router.post('/save-user', async (req, res) => {
  try {
    const { userId, name, surname } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId gerekli'
      });
    }

    const result = userDataLogger.saveUser(userId, name, surname);

    if (result) {
      res.json({
        success: true,
        message: 'Kullanıcı kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Kullanıcı kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı kaydedilemedi'
    });
  }
});

// Kullanıcı verilerini getir
router.get('/users', async (req, res) => {
  try {
    const result = userDataLogger.getUsersData();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Kullanıcı verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı verileri getirilemedi'
    });
  }
});

// Aktivite verilerini kaydet
router.post('/save-activity', async (req, res) => {
  try {
    const { userId, activityType, activityData } = req.body;

    if (!userId || !activityType) {
      return res.status(400).json({
        success: false,
        message: 'userId ve activityType gerekli'
      });
    }

    const result = userDataLogger.saveActivity(userId, activityType, activityData);

    if (result) {
      res.json({
        success: true,
        message: 'Aktivite kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Aktivite kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Aktivite kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite kaydedilemedi'
    });
  }
});

// Aktivite verilerini getir
router.get('/activities', async (req, res) => {
  try {
    const result = userDataLogger.getActivitiesData();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Aktivite verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite verileri getirilemedi'
    });
  }
});

// Tüm verileri temizle
router.delete('/clear-all', async (req, res) => {
  try {
    const result = userDataLogger.clearAllData();
    
    if (result) {
      res.json({
        success: true,
        message: 'Tüm veriler temizlendi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Veriler temizlenemedi'
      });
    }
  } catch (error) {
    console.error('❌ Veri temizleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Veriler temizlenemedi'
    });
  }
});

// Behavior Tracking Endpoints
// Lazy load poolWrapper to avoid initialization order issues
function getPoolWrapper() {
  if (global.poolWrapper) {
    return global.poolWrapper;
  }
  const { poolWrapper } = require('../database-schema');
  return poolWrapper;
}
const mlService = require('../services/ml-service');

/**
 * Event tracking endpoint
 * POST /api/user-data/behavior/track
 */
router.post('/behavior/track', async (req, res) => {
  try {
    const { userId, deviceId, eventType, screenName, eventData, sessionId } = req.body;

    if (!deviceId || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'deviceId ve eventType gerekli'
      });
    }

    // Tenant ID'yi userId'den al veya default kullan
    let tenantId = 1;
    const poolWrapper = getPoolWrapper();
    if (userId) {
      try {
        const [users] = await poolWrapper.execute(
          'SELECT tenantId FROM users WHERE id = ?',
          [userId]
        );
        if (users.length > 0) {
          tenantId = users[0].tenantId;
        }
      } catch (e) {
        // Hata durumunda default tenantId kullan
      }
    }

    // IP adresi ve user agent
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    // Event'i veritabanına kaydet
    const [result] = await poolWrapper.execute(`
      INSERT INTO user_behavior_events 
      (userId, deviceId, eventType, screenName, eventData, sessionId, timestamp, ipAddress, userAgent)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
    `, [
      userId || null,
      deviceId,
      eventType,
      screenName || null,
      JSON.stringify(eventData || {}),
      sessionId || null,
      ipAddress,
      userAgent
    ]);

    const eventId = result.insertId;

    // Send to ML queue for processing
    try {
      await mlService.sendEventToML({
        id: eventId,
        userId: userId || null,
        deviceId,
        eventType,
        screenName: screenName || null,
        eventData: eventData || {},
        sessionId: sessionId || null,
        timestamp: new Date().toISOString()
      });
    } catch (mlError) {
      // Don't fail the request if ML queue fails
      console.warn('⚠️ Failed to send event to ML queue:', mlError.message);
    }

    res.json({
      success: true,
      message: 'Event kaydedildi'
    });
  } catch (error) {
    console.error('❌ Error tracking event:', error);
    res.status(500).json({
      success: false,
      message: 'Event kaydedilemedi'
    });
  }
});

/**
 * Session başlatma endpoint
 * POST /api/user-data/behavior/session/start
 */
router.post('/behavior/session/start', async (req, res) => {
  try {
    const { userId, deviceId, sessionId, metadata } = req.body;

    if (!deviceId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId ve sessionId gerekli'
      });
    }

    // Tenant ID'yi userId'den al veya default kullan
    let tenantId = 1;
    if (userId) {
      try {
        const poolWrapper = getPoolWrapper();
        const [users] = await poolWrapper.execute(
          'SELECT tenantId FROM users WHERE id = ?',
          [userId]
        );
        if (users.length > 0) {
          tenantId = users[0].tenantId;
        }
      } catch (e) {
        // Hata durumunda default tenantId kullan
      }
    }

    // Session'ı veritabanına kaydet
    const poolWrapper = getPoolWrapper();
    await poolWrapper.execute(`
      INSERT INTO user_sessions 
      (userId, deviceId, sessionId, startTime, metadata)
      VALUES (?, ?, ?, NOW(), ?)
      ON DUPLICATE KEY UPDATE startTime = NOW(), metadata = ?
    `, [
      userId || null,
      deviceId,
      sessionId,
      JSON.stringify(metadata || {}),
      JSON.stringify(metadata || {})
    ]);

    res.json({
      success: true,
      message: 'Session başlatıldı',
      sessionId
    });
  } catch (error) {
    console.error('❌ Error starting session:', error);
    res.status(500).json({
      success: false,
      message: 'Session başlatılamadı'
    });
  }
});

/**
 * Session bitirme endpoint
 * POST /api/user-data/behavior/session/end
 */
router.post('/behavior/session/end', async (req, res) => {
  try {
    const { sessionId, duration, pageCount, scrollDepth, metadata } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId gerekli'
      });
    }

    // Session'ı güncelle
    const poolWrapper = getPoolWrapper();
    const [result] = await poolWrapper.execute(`
      UPDATE user_sessions 
      SET endTime = NOW(),
          duration = ?,
          pageCount = ?,
          scrollDepth = ?,
          metadata = JSON_MERGE_PATCH(COALESCE(metadata, '{}'), ?)
      WHERE sessionId = ?
    `, [
      duration || 0,
      pageCount || 0,
      scrollDepth || 0,
      JSON.stringify(metadata || {}),
      sessionId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Session sonlandırıldı'
    });
  } catch (error) {
    console.error('❌ Error ending session:', error);
    res.status(500).json({
      success: false,
      message: 'Session sonlandırılamadı'
    });
  }
});

/**
 * Device-user bağlama endpoint
 * POST /api/user-data/behavior/link-device
 */
router.post('/behavior/link-device', async (req, res) => {
  try {
    const { deviceId, userId } = req.body;

    if (!deviceId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId ve userId gerekli'
      });
    }

    // Tenant ID'yi userId'den al
    const poolWrapper = getPoolWrapper();
    const [users] = await poolWrapper.execute(
      'SELECT tenantId FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const tenantId = users[0].tenantId;

    // Device'ı user'a bağla - mevcut event'lerdeki userId'leri güncelle
    await poolWrapper.execute(`
      UPDATE user_behavior_events 
      SET userId = ?
      WHERE deviceId = ? AND userId IS NULL
    `, [userId, deviceId]);

    // Session'lardaki userId'leri güncelle
    await poolWrapper.execute(`
      UPDATE user_sessions 
      SET userId = ?
      WHERE deviceId = ? AND userId IS NULL
    `, [userId, deviceId]);

    res.json({
      success: true,
      message: 'Device kullanıcıya bağlandı'
    });
  } catch (error) {
    console.error('❌ Error linking device:', error);
    res.status(500).json({
      success: false,
      message: 'Device bağlanamadı'
    });
  }
});

module.exports = router;
