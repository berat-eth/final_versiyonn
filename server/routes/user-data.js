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
        message: 'Kullanıcı ID gerekli'
      });
    }

    const result = await userDataLogger.saveUserData(userId, name, surname);
    
    if (result) {
      res.json({
        success: true,
        message: 'Kullanıcı verisi başarıyla kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Kullanıcı verisi kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı verisi kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı aktivitesini kaydet
router.post('/log-activity', async (req, res) => {
  try {
    const { userId, activityType, activityData } = req.body;

    if (!userId || !activityType) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID ve aktivite türü gerekli'
      });
    }

    const result = await userDataLogger.logUserActivity(userId, activityType, activityData);
    
    if (result) {
      res.json({
        success: true,
        message: 'Aktivite başarıyla kaydedildi'
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
      message: 'Sunucu hatası'
    });
  }
});

// Tüm kullanıcı verilerini getir
router.get('/users', (req, res) => {
  try {
    const usersData = userDataLogger.getUsersData();
    res.json({
      success: true,
      data: usersData
    });
  } catch (error) {
    console.error('❌ Kullanıcı verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı verileri getirilemedi'
    });
  }
});

// Tüm aktivite verilerini getir
router.get('/activities', (req, res) => {
  try {
    const activitiesData = userDataLogger.getActivitiesData();
    res.json({
      success: true,
      data: activitiesData
    });
  } catch (error) {
    console.error('❌ Aktivite verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite verileri getirilemedi'
    });
  }
});

// Belirli kullanıcının aktivitelerini getir
router.get('/user-activities/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const activities = userDataLogger.getUserActivities(parseInt(userId));
    
    res.json({
      success: true,
      data: {
        userId: parseInt(userId),
        activities: activities
      }
    });
  } catch (error) {
    console.error('❌ Kullanıcı aktiviteleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı aktiviteleri getirilemedi'
    });
  }
});

// Günlük rapor oluştur
router.get('/daily-report/:date?', (req, res) => {
  try {
    const { date } = req.params;
    const report = userDataLogger.generateDailyReport(date);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('❌ Günlük rapor oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Günlük rapor oluşturulamadı'
    });
  }
});

// Veri dosyalarını indir
router.get('/download/users', (req, res) => {
  try {
    const usersData = userDataLogger.getUsersData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=users.json');
    res.json(usersData);
  } catch (error) {
    console.error('❌ Kullanıcı verileri indirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı verileri indirilemedi'
    });
  }
});

router.get('/download/activities', (req, res) => {
  try {
    const activitiesData = userDataLogger.getActivitiesData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=user-activities.json');
    res.json(activitiesData);
  } catch (error) {
    console.error('❌ Aktivite verileri indirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite verileri indirilemedi'
    });
  }
});

// Veri dosyalarını temizle (sadece admin)
router.delete('/clear-data', (req, res) => {
  try {
    const { adminKey } = req.body;
    
    // Basit admin kontrolü (gerçek uygulamada daha güvenli olmalı)
    if (adminKey !== 'admin123') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim'
      });
    }

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

// Behavior Analytics - Get screen view times
router.get('/behavior/screen-views', async (req, res) => {
  try {
    const activities = userDataLogger.getActivitiesData();
    const screenViews = activities.activities.filter(
      (a) => a.activityType === 'screen_view' && a.activityData
    );

    // Screen başına ortalama süre hesapla
    const screenStats = {};
    screenViews.forEach((view) => {
      const screenName = view.activityData.screenName;
      const duration = view.activityData.duration || 0;

      if (!screenStats[screenName]) {
        screenStats[screenName] = {
          screenName,
          totalViews: 0,
          totalDuration: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0
        };
      }

      screenStats[screenName].totalViews++;
      screenStats[screenName].totalDuration += duration;
      screenStats[screenName].minDuration = Math.min(screenStats[screenName].minDuration, duration);
      screenStats[screenName].maxDuration = Math.max(screenStats[screenName].maxDuration, duration);
    });

    // Ortalama hesapla
    Object.keys(screenStats).forEach((screen) => {
      const stats = screenStats[screen];
      stats.avgDuration = stats.totalDuration / stats.totalViews;
      if (stats.minDuration === Infinity) stats.minDuration = 0;
    });

    res.json({
      success: true,
      data: Object.values(screenStats)
    });
  } catch (error) {
    console.error('❌ Screen views getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Screen views getirilemedi' });
  }
});

// Behavior Analytics - Get scroll depth
router.get('/behavior/scroll-depth', async (req, res) => {
  try {
    const activities = userDataLogger.getActivitiesData();
    const scrollData = activities.activities.filter(
      (a) => a.activityType === 'scroll_depth' && a.activityData
    );

    // Screen başına scroll derinliği
    const screenStats = {};
    scrollData.forEach((scroll) => {
      const screenName = scroll.activityData.screenName;
      const maxDepth = scroll.activityData.maxScrollDepth || 0;

      if (!screenStats[screenName]) {
        screenStats[screenName] = {
          screenName,
          totalSessions: 0,
          totalMaxDepth: 0,
          avgMaxDepth: 0,
          scrollEvents: 0
        };
      }

      screenStats[screenName].totalSessions++;
      screenStats[screenName].totalMaxDepth += maxDepth;
      screenStats[screenName].scrollEvents += scroll.activityData.scrollEvents || 0;
    });

    // Ortalama hesapla
    Object.keys(screenStats).forEach((screen) => {
      const stats = screenStats[screen];
      stats.avgMaxDepth = stats.totalMaxDepth / stats.totalSessions;
    });

    res.json({
      success: true,
      data: Object.values(screenStats)
    });
  } catch (error) {
    console.error('❌ Scroll depth getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Scroll depth getirilemedi' });
  }
});

// Behavior Analytics - Get navigation paths
router.get('/behavior/navigation-paths', async (req, res) => {
  try {
    const activities = userDataLogger.getActivitiesData();
    const paths = activities.activities.filter(
      (a) => a.activityType === 'navigation_path' && a.activityData
    );

    // En sık kullanılan path'leri bul
    const pathCounts = {};
    paths.forEach((path) => {
      const pathStr = path.activityData.path ? path.activityData.path.join(' → ') : '';
      if (pathStr) {
        pathCounts[pathStr] = (pathCounts[pathStr] || 0) + 1;
      }
    });

    const pathStats = Object.entries(pathCounts)
      .map(([path, count]) => ({
        path,
        count,
        percentage: 0 // Will be calculated
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20

    const total = pathStats.reduce((sum, p) => sum + p.count, 0);
    pathStats.forEach((p) => {
      p.percentage = total > 0 ? (p.count / total) * 100 : 0;
    });

    res.json({
      success: true,
      data: pathStats
    });
  } catch (error) {
    console.error('❌ Navigation paths getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Navigation paths getirilemedi' });
  }
});

// Behavior Analytics - Get filter usage
router.get('/behavior/filter-usage', async (req, res) => {
  try {
    const activities = userDataLogger.getActivitiesData();
    const filters = activities.activities.filter(
      (a) => a.activityType === 'filter_usage' && a.activityData
    );

    // Filter type başına kullanım
    const filterStats = {};
    filters.forEach((filter) => {
      const filterType = filter.activityData.filterType || 'unknown';
      const filterValue = filter.activityData.filterValue || '';
      const count = filter.activityData.filterCount || 1;

      if (!filterStats[filterType]) {
        filterStats[filterType] = {
          filterType,
          totalUsage: 0,
          uniqueValues: new Set(),
          values: {}
        };
      }

      filterStats[filterType].totalUsage += count;
      filterStats[filterType].uniqueValues.add(filterValue);
      
      if (!filterStats[filterType].values[filterValue]) {
        filterStats[filterType].values[filterValue] = 0;
      }
      filterStats[filterType].values[filterValue] += count;
    });

    // Format
    const formattedStats = Object.entries(filterStats).map(([type, stats]) => ({
      filterType: type,
      totalUsage: stats.totalUsage,
      uniqueValuesCount: stats.uniqueValues.size,
      topValues: Object.entries(stats.values)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }))
    }));

    res.json({
      success: true,
      data: formattedStats.sort((a, b) => b.totalUsage - a.totalUsage)
    });
  } catch (error) {
    console.error('❌ Filter usage getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Filter usage getirilemedi' });
  }
});

// Behavior Analytics - Get sort preferences
router.get('/behavior/sort-preferences', async (req, res) => {
  try {
    const activities = userDataLogger.getActivitiesData();
    const sorts = activities.activities.filter(
      (a) => a.activityType === 'sort_preference' && a.activityData
    );

    // Sort type başına kullanım
    const sortStats = {};
    sorts.forEach((sort) => {
      const sortType = sort.activityData.sortType || 'unknown';
      const count = sort.activityData.usageCount || 1;

      if (!sortStats[sortType]) {
        sortStats[sortType] = {
          sortType,
          totalUsage: 0,
          screenUsage: {}
        };
      }

      sortStats[sortType].totalUsage += count;
      const screenName = sort.activityData.screenName || 'unknown';
      sortStats[sortType].screenUsage[screenName] = (sortStats[sortType].screenUsage[screenName] || 0) + count;
    });

    const formattedStats = Object.entries(sortStats)
      .map(([type, stats]) => ({
        sortType: type,
        totalUsage: stats.totalUsage,
        screenUsage: Object.entries(stats.screenUsage)
          .map(([screen, count]) => ({ screen, count }))
          .sort((a, b) => b.count - a.count)
      }))
      .sort((a, b) => b.totalUsage - a.totalUsage);

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('❌ Sort preferences getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sort preferences getirilemedi' });
  }
});

// Behavior Analytics - Get heatmap data
router.get('/behavior/heatmap', async (req, res) => {
  try {
    const { screenName } = req.query;
    const activities = userDataLogger.getActivitiesData();
    let heatmapData = activities.activities.filter(
      (a) => a.activityType === 'heatmap_click' && a.activityData
    );

    // Screen'e göre filtrele
    if (screenName) {
      heatmapData = heatmapData.filter((a) => a.activityData.screenName === screenName);
    }

    // X, Y koordinatlarına göre grupla
    const heatmapPoints = {};
    heatmapData.forEach((click) => {
      const x = Math.round(click.activityData.x / 10) * 10; // 10px grid
      const y = Math.round(click.activityData.y / 10) * 10;
      const key = `${x},${y}`;

      if (!heatmapPoints[key]) {
        heatmapPoints[key] = {
          x,
          y,
          count: 0,
          elementTypes: {}
        };
      }

      heatmapPoints[key].count += click.activityData.clickCount || 1;
      const elementType = click.activityData.elementType || 'unknown';
      heatmapPoints[key].elementTypes[elementType] = (heatmapPoints[key].elementTypes[elementType] || 0) + 1;
    });

    res.json({
      success: true,
      data: Object.values(heatmapPoints)
    });
  } catch (error) {
    console.error('❌ Heatmap getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Heatmap getirilemedi' });
  }
});

// Behavior Analytics - Get back navigation
router.get('/behavior/back-navigation', async (req, res) => {
  try {
    const activities = userDataLogger.getActivitiesData();
    const backNavs = activities.activities.filter(
      (a) => a.activityType === 'back_navigation' && a.activityData
    );

    // From screen başına back count
    const backStats = {};
    backNavs.forEach((nav) => {
      const fromScreen = nav.activityData.fromScreen || 'unknown';
      const count = nav.activityData.backCount || 1;

      if (!backStats[fromScreen]) {
        backStats[fromScreen] = {
          fromScreen,
          totalBacks: 0,
          toScreens: {}
        };
      }

      backStats[fromScreen].totalBacks += count;
      const toScreen = nav.activityData.toScreen || 'unknown';
      backStats[fromScreen].toScreens[toScreen] = (backStats[fromScreen].toScreens[toScreen] || 0) + count;
    });

    const formattedStats = Object.entries(backStats)
      .map(([screen, stats]) => ({
        fromScreen: screen,
        totalBacks: stats.totalBacks,
        toScreens: Object.entries(stats.toScreens)
          .map(([to, count]) => ({ toScreen: to, count }))
          .sort((a, b) => b.count - a.count)
      }))
      .sort((a, b) => b.totalBacks - a.totalBacks);

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('❌ Back navigation getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Back navigation getirilemedi' });
  }
});

// Behavior Analytics - Get product interaction depth
router.get('/behavior/product-interactions', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const interactions = activities.activities.filter(
      (a) => a.activityType === 'product_interaction' && a.activityData
    );

    // Product bazında istatistikler
    const productStats = {};
    interactions.forEach((interaction) => {
      const data = interaction.activityData;
      const productId = data.productId || 0;

      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          totalViews: 0,
          avgDuration: 0,
          totalZoomCount: 0,
          totalCarouselSwipes: 0,
          descriptionViewRate: 0,
          variantSelectionRate: 0,
          totalDescriptionViews: 0,
          totalVariantSelections: 0
        };
      }

      const stats = productStats[productId];
      stats.totalViews++;

      if (data.duration) {
        stats.avgDuration = (stats.avgDuration * (stats.totalViews - 1) + data.duration) / stats.totalViews;
      }

      stats.totalZoomCount += data.zoomCount || 0;
      stats.totalCarouselSwipes += data.carouselSwipes || 0;

      if (data.descriptionViewed) {
        stats.totalDescriptionViews++;
      }

      if (data.variantSelected && data.variantSelected.trim() !== '') {
        stats.totalVariantSelections++;
      }
    });

    // Yüzde hesaplamaları
    const formattedStats = Object.values(productStats).map((stats) => ({
      productId: stats.productId,
      totalViews: stats.totalViews,
      avgDuration: Math.round(stats.avgDuration),
      totalZoomCount: stats.totalZoomCount,
      avgZoomPerView: stats.totalViews > 0 ? (stats.totalZoomCount / stats.totalViews).toFixed(2) : 0,
      totalCarouselSwipes: stats.totalCarouselSwipes,
      avgCarouselSwipesPerView: stats.totalViews > 0 ? (stats.totalCarouselSwipes / stats.totalViews).toFixed(2) : 0,
      descriptionViewRate: stats.totalViews > 0 ? ((stats.totalDescriptionViews / stats.totalViews) * 100).toFixed(1) : 0,
      variantSelectionRate: stats.totalViews > 0 ? ((stats.totalVariantSelections / stats.totalViews) * 100).toFixed(1) : 0
    })).sort((a, b) => b.totalViews - a.totalViews);

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('❌ Product interactions getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Product interactions getirilemedi' });
  }
});

// Behavior Analytics - Get cart behavior
router.get('/behavior/cart-behavior', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const cartActions = activities.activities.filter(
      (a) => a.activityType === 'cart_behavior' && a.activityData
    );

    const stats = {
      totalAdds: 0,
      totalRemoves: 0,
      totalSizeChanges: 0,
      removeReasons: {},
      avgCartItemCount: 0,
      avgCartTotal: 0,
      sizeChangeCount: 0
    };

    let totalCartItemCount = 0;
    let totalCartTotal = 0;
    let cartActionCount = 0;

    cartActions.forEach((action) => {
      const data = action.activityData;
      if (data.action === 'add') stats.totalAdds++;
      if (data.action === 'remove') {
        stats.totalRemoves++;
        if (data.reason) {
          stats.removeReasons[data.reason] = (stats.removeReasons[data.reason] || 0) + 1;
        }
      }
      if (data.action === 'change_size') {
        stats.totalSizeChanges++;
        stats.sizeChangeCount++;
      }

      if (data.cartItemCount !== undefined) {
        totalCartItemCount += data.cartItemCount;
        totalCartTotal += data.cartTotal || 0;
        cartActionCount++;
      }
    });

    stats.avgCartItemCount = cartActionCount > 0 ? (totalCartItemCount / cartActionCount).toFixed(2) : 0;
    stats.avgCartTotal = cartActionCount > 0 ? (totalCartTotal / cartActionCount).toFixed(2) : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Cart behavior getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Cart behavior getirilemedi' });
  }
});

// Behavior Analytics - Get payment behavior
router.get('/behavior/payment-behavior', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const paymentActions = activities.activities.filter(
      (a) => a.activityType === 'payment_behavior' && a.activityData
    );

    const stats = {
      couponTries: 0,
      couponSuccesses: 0,
      couponFailures: 0,
      couponFailureReasons: {},
      installmentSelections: {},
      cartAbandons: {},
      totalAbandons: 0
    };

    paymentActions.forEach((action) => {
      const data = action.activityData;
      if (data.action === 'coupon_try') stats.couponTries++;
      if (data.action === 'coupon_success') stats.couponSuccesses++;
      if (data.action === 'coupon_fail') {
        stats.couponFailures++;
        const reason = data.couponResult || 'unknown';
        stats.couponFailureReasons[reason] = (stats.couponFailureReasons[reason] || 0) + 1;
      }
      if (data.action === 'installment_select' && data.installmentCount) {
        stats.installmentSelections[data.installmentCount] = (stats.installmentSelections[data.installmentCount] || 0) + 1;
      }
      if (data.action === 'cart_abandon') {
        stats.totalAbandons++;
        const step = data.abandonStep || 'unknown';
        stats.cartAbandons[step] = (stats.cartAbandons[step] || 0) + 1;
      }
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Payment behavior getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Payment behavior getirilemedi' });
  }
});

// Behavior Analytics - Get user segments
router.get('/behavior/user-segments', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const segments = activities.activities.filter(
      (a) => a.activityType === 'user_segment' && a.activityData
    );

    // Son segment verilerini al (her kullanıcı için en son)
    const userSegmentsMap = {};
    segments.forEach((seg) => {
      const data = seg.activityData;
      const userId = data.userId;
      if (!userSegmentsMap[userId] || userSegmentsMap[userId].timestamp < data.timestamp) {
        userSegmentsMap[userId] = data;
      }
    });

    const stats = {
      totalUsers: Object.keys(userSegmentsMap).length,
      avgPriceSensitivity: 0,
      quickDecisionCount: 0,
      discountHunterCount: 0,
      premiumShopperCount: 0,
      categoryDependencies: {}
    };

    let totalSensitivity = 0;
    let userCount = 0;

    Object.values(userSegmentsMap).forEach((seg) => {
      totalSensitivity += seg.priceSensitivityScore || 50;
      userCount++;
      if (seg.isQuickDecision) stats.quickDecisionCount++;
      if (seg.isDiscountHunter) stats.discountHunterCount++;
      if (seg.isPremiumShopper) stats.premiumShopperCount++;
      if (seg.mostCategoryDependency) {
        stats.categoryDependencies[seg.mostCategoryDependency] = (stats.categoryDependencies[seg.mostCategoryDependency] || 0) + 1;
      }
    });

    stats.avgPriceSensitivity = userCount > 0 ? (totalSensitivity / userCount).toFixed(2) : 50;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ User segments getirme hatası:', error);
    res.status(500).json({ success: false, message: 'User segments getirilemedi' });
  }
});

// Behavior Analytics - Get performance metrics
router.get('/behavior/performance', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const perfMetrics = activities.activities.filter(
      (a) => a.activityType === 'performance' && a.activityData
    );

    const stats = {
      avgApiResponseTime: 0,
      avgLoadingSpinnerDuration: 0,
      avgImageLoadTime: 0,
      totalUiFreezes: 0,
      totalUiFreezeDuration: 0,
      apiEndpoints: {}
    };

    let totalResponseTime = 0;
    let totalSpinnerDuration = 0;
    let totalImageLoadTime = 0;
    let imageLoadCount = 0;
    let metricCount = 0;

    perfMetrics.forEach((metric) => {
      const data = metric.activityData;
      totalResponseTime += data.responseTime || 0;
      totalSpinnerDuration += data.loadingSpinnerDuration || 0;
      if (data.imageLoadTime) {
        totalImageLoadTime += data.imageLoadTime;
        imageLoadCount++;
      }
      stats.totalUiFreezes += data.uiFreezeCount || 0;
      stats.totalUiFreezeDuration += data.uiFreezeDuration || 0;
      metricCount++;

      if (data.apiEndpoint) {
        if (!stats.apiEndpoints[data.apiEndpoint]) {
          stats.apiEndpoints[data.apiEndpoint] = { count: 0, totalTime: 0 };
        }
        stats.apiEndpoints[data.apiEndpoint].count++;
        stats.apiEndpoints[data.apiEndpoint].totalTime += data.responseTime || 0;
      }
    });

    stats.avgApiResponseTime = metricCount > 0 ? (totalResponseTime / metricCount).toFixed(2) : 0;
    stats.avgLoadingSpinnerDuration = metricCount > 0 ? (totalSpinnerDuration / metricCount).toFixed(2) : 0;
    stats.avgImageLoadTime = imageLoadCount > 0 ? (totalImageLoadTime / imageLoadCount).toFixed(2) : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Performance metrics getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Performance metrics getirilemedi' });
  }
});

// Behavior Analytics - Get session analytics
router.get('/behavior/sessions', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const sessions = activities.activities.filter(
      (a) => a.activityType === 'session' && a.activityData
    );

    const stats = {
      totalSessions: sessions.length,
      avgSessionDuration: 0,
      avgPageCount: 0,
      avgScrollDepth: 0,
      returnFrequency: 0
    };

    let totalDuration = 0;
    let totalPages = 0;
    let totalScrollDepth = 0;

    sessions.forEach((session) => {
      const data = session.activityData;
      totalDuration += data.sessionDuration || 0;
      totalPages += data.pageCount || 0;
      totalScrollDepth += data.totalScrollDepth || 0;
    });

    stats.avgSessionDuration = sessions.length > 0 ? (totalDuration / sessions.length).toFixed(2) : 0;
    stats.avgPageCount = sessions.length > 0 ? (totalPages / sessions.length).toFixed(2) : 0;
    stats.avgScrollDepth = sessions.length > 0 ? (totalScrollDepth / sessions.length).toFixed(2) : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Session analytics getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Session analytics getirilemedi' });
  }
});

// Behavior Analytics - Get device info
router.get('/behavior/device-info', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const deviceInfos = activities.activities.filter(
      (a) => a.activityType === 'device_info' && a.activityData
    );

    // Son device info'yu al (her kullanıcı için)
    const userDeviceMap = {};
    deviceInfos.forEach((info) => {
      const data = info.activityData;
      const userId = data.userId;
      if (!userDeviceMap[userId] || userDeviceMap[userId].timestamp < data.timestamp) {
        userDeviceMap[userId] = data;
      }
    });

    const stats = {
      totalUsers: Object.keys(userDeviceMap).length,
      networkTypes: {},
      avgBatteryLevel: 0,
      avgConnectionSpeed: 0
    };

    let totalBattery = 0;
    let totalSpeed = 0;
    let batteryCount = 0;
    let speedCount = 0;

    Object.values(userDeviceMap).forEach((device) => {
      const networkType = device.networkType || 'unknown';
      stats.networkTypes[networkType] = (stats.networkTypes[networkType] || 0) + 1;
      if (device.batteryLevel !== undefined) {
        totalBattery += device.batteryLevel;
        batteryCount++;
      }
      if (device.connectionSpeed !== undefined) {
        totalSpeed += device.connectionSpeed;
        speedCount++;
      }
    });

    stats.avgBatteryLevel = batteryCount > 0 ? (totalBattery / batteryCount).toFixed(2) : 0;
    stats.avgConnectionSpeed = speedCount > 0 ? (totalSpeed / speedCount).toFixed(2) : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Device info getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Device info getirilemedi' });
  }
});

// Behavior Analytics - Get notification interactions
router.get('/behavior/notifications', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const notifications = activities.activities.filter(
      (a) => a.activityType === 'notification' && a.activityData
    );

    const stats = {
      totalOpened: 0,
      totalDismissed: 0,
      totalSwipedAway: 0,
      openRate: 0,
      hourDistribution: {}
    };

    notifications.forEach((notif) => {
      const data = notif.activityData;
      if (data.action === 'opened') stats.totalOpened++;
      if (data.action === 'dismissed') stats.totalDismissed++;
      if (data.action === 'swiped_away') stats.totalSwipedAway++;

      const hour = data.hour !== undefined ? data.hour : new Date().getHours();
      if (!stats.hourDistribution[hour]) {
        stats.hourDistribution[hour] = { opened: 0, total: 0 };
      }
      stats.hourDistribution[hour].total++;
      if (data.action === 'opened') stats.hourDistribution[hour].opened++;
    });

    const total = notifications.length;
    stats.openRate = total > 0 ? ((stats.totalOpened / total) * 100).toFixed(2) : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Notification analytics getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Notification analytics getirilemedi' });
  }
});

// Behavior Analytics - Get wishlist analytics
router.get('/behavior/wishlist', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const wishlistActions = activities.activities.filter(
      (a) => a.activityType === 'wishlist' && a.activityData
    );

    const stats = {
      totalAdds: 0,
      totalRemoves: 0,
      totalPurchases: 0,
      avgTimeToPurchase: 0,
      notPurchasedRate: 0,
      sizeVariationCount: 0
    };

    let totalTimeToPurchase = 0;
    let purchaseCount = 0;
    let addCount = 0;
    let totalSizeVariations = 0;
    let sizeVariationUsers = 0;

    wishlistActions.forEach((action) => {
      const data = action.activityData;
      if (data.action === 'add') {
        addCount++;
        stats.totalAdds++;
      }
      if (data.action === 'remove') stats.totalRemoves++;
      if (data.action === 'purchase') {
        stats.totalPurchases++;
        if (data.timeToPurchase) {
          totalTimeToPurchase += data.timeToPurchase;
          purchaseCount++;
        }
      }
      if (data.sizeVariationCount) {
        totalSizeVariations += data.sizeVariationCount;
        sizeVariationUsers++;
      }
    });

    stats.avgTimeToPurchase = purchaseCount > 0 ? (totalTimeToPurchase / purchaseCount).toFixed(2) : 0;
    stats.notPurchasedRate = addCount > 0 ? (((addCount - stats.totalPurchases) / addCount) * 100).toFixed(2) : 0;
    stats.sizeVariationCount = sizeVariationUsers > 0 ? (totalSizeVariations / sizeVariationUsers).toFixed(2) : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Wishlist analytics getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Wishlist analytics getirilemedi' });
  }
});

// Behavior Analytics - Get LTV data
router.get('/behavior/ltv', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const ltvData = activities.activities.filter(
      (a) => a.activityType === 'ltv' && a.activityData
    );

    // Son LTV verilerini al (her kullanıcı için en son)
    const userLTVMap = {};
    ltvData.forEach((ltv) => {
      const data = ltv.activityData;
      const userId = data.userId;
      if (!userLTVMap[userId] || userLTVMap[userId].timestamp < data.timestamp) {
        userLTVMap[userId] = data;
      }
    });

    const stats = {
      totalUsers: Object.keys(userLTVMap).length,
      avgFirstPurchaseTime: 0,
      avgRepeatInterval: 0,
      avgBasketValue: 0,
      avgTotalPurchases: 0
    };

    let totalFirstPurchase = 0;
    let totalInterval = 0;
    let totalBasket = 0;
    let totalPurchases = 0;
    let firstPurchaseCount = 0;
    let intervalCount = 0;
    let userCount = 0;

    Object.values(userLTVMap).forEach((ltv) => {
      userCount++;
      if (ltv.firstPurchaseTime) {
        totalFirstPurchase += ltv.firstPurchaseTime;
        firstPurchaseCount++;
      }
      if (ltv.repeatPurchaseInterval) {
        totalInterval += ltv.repeatPurchaseInterval;
        intervalCount++;
      }
      totalBasket += ltv.averageBasketValue || 0;
      totalPurchases += ltv.totalPurchases || 0;
    });

    stats.avgFirstPurchaseTime = firstPurchaseCount > 0 ? (totalFirstPurchase / firstPurchaseCount).toFixed(2) : 0;
    stats.avgRepeatInterval = intervalCount > 0 ? (totalInterval / intervalCount).toFixed(2) : 0;
    stats.avgBasketValue = userCount > 0 ? (totalBasket / userCount).toFixed(2) : 0;
    stats.avgTotalPurchases = userCount > 0 ? (totalPurchases / userCount).toFixed(2) : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ LTV analytics getirme hatası:', error);
    res.status(500).json({ success: false, message: 'LTV analytics getirilemedi' });
  }
});

// Behavior Analytics - Get campaign analytics
router.get('/behavior/campaigns', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const campaigns = activities.activities.filter(
      (a) => a.activityType === 'campaign' && a.activityData
    );

    const stats = {
      bannerViews: 0,
      bannerClicks: 0,
      bannerViewToClickRate: 0,
      voucherRedemptions: 0,
      flashDealViews: 0,
      flashDealClicks: 0,
      avgViewDuration: 0,
      campaignTypes: {}
    };

    let totalViewDuration = 0;
    let viewCount = 0;

    campaigns.forEach((campaign) => {
      const data = campaign.activityData;
      const type = data.campaignType || 'unknown';
      if (!stats.campaignTypes[type]) {
        stats.campaignTypes[type] = { views: 0, clicks: 0, redeems: 0 };
      }

      if (data.action === 'view') {
        stats.campaignTypes[type].views++;
        if (type === 'banner') stats.bannerViews++;
        if (type === 'flash_deal') stats.flashDealViews++;
        if (data.viewDuration) {
          totalViewDuration += data.viewDuration;
          viewCount++;
        }
      }
      if (data.action === 'click') {
        stats.campaignTypes[type].clicks++;
        if (type === 'banner') stats.bannerClicks++;
        if (type === 'flash_deal') stats.flashDealClicks++;
      }
      if (data.action === 'redeem') {
        stats.campaignTypes[type].redeems++;
        if (type === 'voucher') stats.voucherRedemptions++;
      }
    });

    stats.bannerViewToClickRate = stats.bannerViews > 0 ? ((stats.bannerClicks / stats.bannerViews) * 100).toFixed(2) : 0;
    stats.avgViewDuration = viewCount > 0 ? (totalViewDuration / viewCount).toFixed(2) : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Campaign analytics getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Campaign analytics getirilemedi' });
  }
});

// Behavior Analytics - Get fraud signals
router.get('/behavior/fraud-signals', async (req, res) => {
  try {
    const activities = await loadUserActivities();
    const fraudSignals = activities.activities.filter(
      (a) => a.activityType === 'fraud_signal' && a.activityData
    );

    const stats = {
      fastCheckouts: 0,
      failedPaymentAttempts: 0,
      ipLocationChanges: 0,
      suspiciousUsers: []
    };

    const userSignals = {};

    fraudSignals.forEach((signal) => {
      const data = signal.activityData;
      const userId = data.userId;

      if (!userSignals[userId]) {
        userSignals[userId] = {
          userId,
          fastCheckouts: 0,
          failedPaymentAttempts: 0,
          ipLocationChanges: 0
        };
      }

      if (data.signalType === 'fast_checkout') {
        stats.fastCheckouts++;
        userSignals[userId].fastCheckouts += data.value || 1;
      }
      if (data.signalType === 'failed_payment_attempts') {
        stats.failedPaymentAttempts += data.value || 1;
        userSignals[userId].failedPaymentAttempts += data.value || 1;
      }
      if (data.signalType === 'ip_location_change') {
        stats.ipLocationChanges++;
        userSignals[userId].ipLocationChanges++;
      }
    });

    // Şüpheli kullanıcıları belirle (3+ sinyal)
    Object.values(userSignals).forEach((user) => {
      const totalSignals = user.fastCheckouts + user.failedPaymentAttempts + user.ipLocationChanges;
      if (totalSignals >= 3) {
        stats.suspiciousUsers.push({
          userId: user.userId,
          signalCount: totalSignals,
          fastCheckouts: user.fastCheckouts,
          failedPaymentAttempts: user.failedPaymentAttempts,
          ipLocationChanges: user.ipLocationChanges
        });
      }
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Fraud signals getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Fraud signals getirilemedi' });
  }
});

module.exports = router;
