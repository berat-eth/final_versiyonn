const express = require('express');
const router = express.Router();

// Servisler - poolWrapper inject edilecek
let poolWrapper = null;
let cohortService = null;
let funnelService = null;
let geospatialService = null;
let anomalyDetector = null;
let predictiveService = null;
let dataRetentionService = null;
let healthMonitor = null;
let realtimeAnalytics = null;

// Processor'ı set et (server.js'den çağrılacak)
router.setServices = function(pool) {
  poolWrapper = pool;
  
  // Servisleri initialize et
  const CohortAnalysisService = require('../services/cohort-analysis');
  const FunnelAnalysisService = require('../services/funnel-analysis');
  const GeospatialAnalyticsService = require('../services/geospatial-analytics');
  const AnomalyDetectorService = require('../services/anomaly-detector');
  const PredictiveAnalyticsService = require('../services/predictive-analytics');
  const DataRetentionService = require('../services/data-retention');
  const HealthMonitorService = require('../services/health-monitor');
  const getRealtimeAnalytics = require('../services/realtime-analytics');
  
  cohortService = new CohortAnalysisService(pool);
  funnelService = new FunnelAnalysisService(pool);
  geospatialService = new GeospatialAnalyticsService(pool);
  anomalyDetector = new AnomalyDetectorService(pool);
  predictiveService = new PredictiveAnalyticsService(pool);
  dataRetentionService = new DataRetentionService(pool);
  healthMonitor = new HealthMonitorService(pool);
  realtimeAnalytics = getRealtimeAnalytics();
  
  // Health monitoring'i başlat
  healthMonitor.startMonitoring();
  
  console.log('✅ Advanced Analytics Services initialized');
};

// ==================== Cohort Analysis ====================

// GET /api/analytics/cohorts - Cohort'ları getir
router.get('/cohorts', async (req, res) => {
  try {
    if (!cohortService) {
      return res.status(503).json({ success: false, message: 'Cohort service not initialized' });
    }

    const { startDate, endDate, interval = 'month' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate ve endDate gerekli' });
    }

    const result = await cohortService.getCohortsByRegistrationDate(startDate, endDate, interval);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Cohorts error:', error);
    res.status(500).json({ success: false, message: 'Cohort analizi yapılamadı' });
  }
});

// GET /api/analytics/cohorts/:cohort/retention - Retention rate
router.get('/cohorts/:cohort/retention', async (req, res) => {
  try {
    if (!cohortService) {
      return res.status(503).json({ success: false, message: 'Cohort service not initialized' });
    }

    const { cohort } = req.params;
    const { periods = 12 } = req.query;

    const result = await cohortService.calculateRetentionRate(cohort, parseInt(periods));
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Retention error:', error);
    res.status(500).json({ success: false, message: 'Retention hesaplanamadı' });
  }
});

// GET /api/analytics/cohorts/:cohort/ltv - LTV analizi
router.get('/cohorts/:cohort/ltv', async (req, res) => {
  try {
    if (!cohortService) {
      return res.status(503).json({ success: false, message: 'Cohort service not initialized' });
    }

    const { cohort } = req.params;
    const { days = 90 } = req.query;

    const result = await cohortService.calculateLTV(cohort, parseInt(days));
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ LTV error:', error);
    res.status(500).json({ success: false, message: 'LTV hesaplanamadı' });
  }
});

// GET /api/analytics/cohorts/:cohort/conversion - Conversion rate
router.get('/cohorts/:cohort/conversion', async (req, res) => {
  try {
    if (!cohortService) {
      return res.status(503).json({ success: false, message: 'Cohort service not initialized' });
    }

    const { cohort } = req.params;
    const result = await cohortService.getCohortConversionRate(cohort);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Conversion rate error:', error);
    res.status(500).json({ success: false, message: 'Conversion rate hesaplanamadı' });
  }
});

// ==================== Funnel Analysis ====================

// POST /api/analytics/funnels/calculate - Funnel hesapla
router.post('/funnels/calculate', async (req, res) => {
  try {
    if (!funnelService) {
      return res.status(503).json({ success: false, message: 'Funnel service not initialized' });
    }

    const { steps, startDate, endDate, userId, deviceId } = req.body;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ success: false, message: 'Steps array gerekli' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate ve endDate gerekli' });
    }

    const result = await funnelService.calculateFunnel(steps, startDate, endDate, userId, deviceId);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Funnel calculation error:', error);
    res.status(500).json({ success: false, message: 'Funnel hesaplanamadı' });
  }
});

// POST /api/analytics/funnels/compare - Funnel karşılaştır
router.post('/funnels/compare', async (req, res) => {
  try {
    if (!funnelService) {
      return res.status(503).json({ success: false, message: 'Funnel service not initialized' });
    }

    const { steps, period1, period2 } = req.body;

    if (!steps || !period1 || !period2) {
      return res.status(400).json({ success: false, message: 'steps, period1 ve period2 gerekli' });
    }

    const result = await funnelService.compareFunnels(steps, period1, period2);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Funnel comparison error:', error);
    res.status(500).json({ success: false, message: 'Funnel karşılaştırılamadı' });
  }
});

// GET /api/analytics/funnels/dropoffs - Drop-off analizi
router.get('/funnels/dropoffs', async (req, res) => {
  try {
    if (!funnelService) {
      return res.status(503).json({ success: false, message: 'Funnel service not initialized' });
    }

    const { steps, startDate, endDate } = req.query;

    if (!steps) {
      return res.status(400).json({ success: false, message: 'steps gerekli' });
    }

    const stepsArray = JSON.parse(steps);
    const result = await funnelService.analyzeDropOffs(stepsArray, startDate, endDate);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Drop-off analysis error:', error);
    res.status(500).json({ success: false, message: 'Drop-off analizi yapılamadı' });
  }
});

// ==================== Geospatial Analytics ====================

// GET /api/analytics/geographic - Coğrafi dağılım
router.get('/geographic', async (req, res) => {
  try {
    if (!geospatialService) {
      return res.status(503).json({ success: false, message: 'Geospatial service not initialized' });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate ve endDate gerekli' });
    }

    const result = await geospatialService.getGeographicDistribution(startDate, endDate);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Geographic distribution error:', error);
    res.status(500).json({ success: false, message: 'Coğrafi dağılım analizi yapılamadı' });
  }
});

// GET /api/analytics/geographic/segments - Lokasyon bazlı segmentasyon
router.get('/geographic/segments', async (req, res) => {
  try {
    if (!geospatialService) {
      return res.status(503).json({ success: false, message: 'Geospatial service not initialized' });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate ve endDate gerekli' });
    }

    const result = await geospatialService.segmentByLocation(startDate, endDate);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Location segmentation error:', error);
    res.status(500).json({ success: false, message: 'Lokasyon segmentasyonu yapılamadı' });
  }
});

// ==================== Anomaly Detection ====================

// POST /api/analytics/anomalies/detect - Anomali tespit et
router.post('/anomalies/detect', async (req, res) => {
  try {
    if (!anomalyDetector) {
      return res.status(503).json({ success: false, message: 'Anomaly detector not initialized' });
    }

    const { deviceId, userId, timeWindow = 300 } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'deviceId gerekli' });
    }

    const result = await anomalyDetector.detectAnomalies(deviceId, userId, timeWindow);
    
    if (result.success) {
      // Fraud signal oluştur (eğer risk score yüksekse)
      if (result.hasAnomalies && result.riskScore >= 50) {
        await anomalyDetector.generateFraudSignal(deviceId, userId, result.anomalies);
      }
      
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Anomaly detection error:', error);
    res.status(500).json({ success: false, message: 'Anomali tespiti yapılamadı' });
  }
});

// ==================== Predictive Analytics ====================

// GET /api/analytics/predict/churn/:userId - Churn prediction
router.get('/predict/churn/:userId', async (req, res) => {
  try {
    if (!predictiveService) {
      return res.status(503).json({ success: false, message: 'Predictive service not initialized' });
    }

    const { userId } = req.params;
    const { days = 30 } = req.query;

    const result = await predictiveService.predictChurn(parseInt(userId), parseInt(days));
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Churn prediction error:', error);
    res.status(500).json({ success: false, message: 'Churn tahmini yapılamadı' });
  }
});

// GET /api/analytics/predict/purchase - Purchase probability
router.get('/predict/purchase', async (req, res) => {
  try {
    if (!predictiveService) {
      return res.status(503).json({ success: false, message: 'Predictive service not initialized' });
    }

    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: 'userId veya deviceId gerekli' });
    }

    const result = await predictiveService.predictPurchaseProbability(
      userId ? parseInt(userId) : null,
      deviceId
    );
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Purchase probability error:', error);
    res.status(500).json({ success: false, message: 'Purchase probability hesaplanamadı' });
  }
});

// ==================== Data Retention ====================

// POST /api/analytics/data/archive - Eski verileri archive et
router.post('/data/archive', async (req, res) => {
  try {
    if (!dataRetentionService) {
      return res.status(503).json({ success: false, message: 'Data retention service not initialized' });
    }

    const { days } = req.body;

    const result = await dataRetentionService.archiveOldData(days);
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Archive error:', error);
    res.status(500).json({ success: false, message: 'Archive işlemi başarısız' });
  }
});

// DELETE /api/analytics/data/user/:userId - Kullanıcı verisi sil (GDPR)
router.delete('/data/user/:userId', async (req, res) => {
  try {
    if (!dataRetentionService) {
      return res.status(503).json({ success: false, message: 'Data retention service not initialized' });
    }

    const { userId } = req.params;

    const result = await dataRetentionService.deleteUserData(parseInt(userId));
    
    if (result.success) {
      res.json({ success: true, message: 'Kullanıcı verisi silindi' });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Delete user data error:', error);
    res.status(500).json({ success: false, message: 'Veri silme işlemi başarısız' });
  }
});

// ==================== Health Monitoring ====================

// GET /api/analytics/health - Sistem sağlığı
router.get('/health', async (req, res) => {
  try {
    if (!healthMonitor) {
      return res.status(503).json({ success: false, message: 'Health monitor not initialized' });
    }

    const health = await healthMonitor.checkHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({ success: false, message: 'Health check başarısız' });
  }
});

// GET /api/analytics/metrics - Sistem metrikleri
router.get('/metrics', async (req, res) => {
  try {
    if (!healthMonitor) {
      return res.status(503).json({ success: false, message: 'Health monitor not initialized' });
    }

    const metrics = healthMonitor.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('❌ Metrics error:', error);
    res.status(500).json({ success: false, message: 'Metrikler getirilemedi' });
  }
});

// ==================== Real-time Analytics ====================

// GET /api/analytics/realtime/metrics - Real-time metrics
router.get('/realtime/metrics', async (req, res) => {
  try {
    if (!realtimeAnalytics) {
      return res.status(503).json({ success: false, message: 'Realtime analytics not initialized' });
    }

    const metrics = realtimeAnalytics.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('❌ Realtime metrics error:', error);
    res.status(500).json({ success: false, message: 'Real-time metrikler getirilemedi' });
  }
});

module.exports = router;

