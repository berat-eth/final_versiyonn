const express = require('express');
const router = express.Router();
const mlService = require('../services/ml-service');
const { authenticateAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * Get ML predictions
 * GET /api/admin/ml/predictions?userId=1&limit=10
 */
router.get('/predictions', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const predictions = await mlService.getPredictions(userId, tenantId, limit);

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('❌ Error getting predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting predictions'
    });
  }
});

/**
 * Get ML recommendations
 * GET /api/admin/ml/recommendations?userId=1
 */
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const recommendations = await mlService.getRecommendations(userId, tenantId);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('❌ Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting recommendations'
    });
  }
});

/**
 * Get ML anomalies
 * GET /api/admin/ml/anomalies?anomalyType=bot&limit=100&offset=0
 */
router.get('/anomalies', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : null,
      anomalyType: req.query.anomalyType || null,
      minScore: req.query.minScore ? parseFloat(req.query.minScore) : null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const result = await mlService.getAnomalies(tenantId, filters, limit, offset);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error getting anomalies:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting anomalies'
    });
  }
});

/**
 * Get ML segments
 * GET /api/admin/ml/segments?segmentId=1
 */
router.get('/segments', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const filters = {
      segmentId: req.query.segmentId ? parseInt(req.query.segmentId) : null
    };

    const segments = await mlService.getSegments(tenantId, filters);

    res.json({
      success: true,
      data: segments
    });
  } catch (error) {
    console.error('❌ Error getting segments:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting segments'
    });
  }
});

/**
 * Get user segment
 * GET /api/admin/ml/segments/user?userId=1
 */
router.get('/segments/user', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const segment = await mlService.getUserSegment(userId, tenantId);

    res.json({
      success: true,
      data: segment
    });
  } catch (error) {
    console.error('❌ Error getting user segment:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user segment'
    });
  }
});

/**
 * Get ML models status
 * GET /api/admin/ml/models
 */
router.get('/models', async (req, res) => {
  try {
    const models = await mlService.getModelsStatus();

    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error('❌ Error getting models status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting models status'
    });
  }
});

/**
 * Get ML statistics
 * GET /api/admin/ml/statistics?timeRange=7d
 */
router.get('/statistics', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';

    const statistics = await mlService.getStatistics(tenantId, timeRange);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('❌ Error getting ML statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting ML statistics'
    });
  }
});

/**
 * Trigger model training
 * POST /api/admin/ml/train
 */
router.post('/train', async (req, res) => {
  try {
    const { modelType } = req.body;

    if (!modelType) {
      return res.status(400).json({
        success: false,
        message: 'modelType is required'
      });
    }

    // TODO: Trigger training via ML service API
    // For now, just return success
    res.json({
      success: true,
      message: `Training started for ${modelType}`,
      jobId: `train_${Date.now()}`
    });
  } catch (error) {
    console.error('❌ Error triggering training:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering training'
    });
  }
});

module.exports = router;

