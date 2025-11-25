const express = require('express');
const { queue } = require('../services/queue');
const { GmapsJob, GmapsLead } = require('../orm/models');
const { v4: uuidv4 } = require('uuid');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/google-maps', async (req, res) => {
  try {
    const { query, city, limit } = req.body || {};
    if (!query || !city) return res.status(400).json({ success: false, message: 'query and city required' });
    const jobId = uuidv4();

    await GmapsJob.create({ jobId, query, city, status: 'queued', total: 0, processed: 0 });
    await queue.add('scrape', { jobId, query, city, limit: Math.min(Number(limit || 100), 300) }, {
      removeOnComplete: 1000,
      removeOnFail: 1000
    });
    return res.json({ success: true, jobId });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/google-maps/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = await GmapsJob.findOne({ where: { jobId } });
  if (!job) return res.status(404).json({ success: false, message: 'job not found' });
  return res.json({ success: true, data: { status: job.status, total: job.total, processed: job.processed, error: job.error || null } });
});

router.get('/google-maps/result/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const items = await GmapsLead.findAll({ where: { jobId }, limit: 5000 });
  return res.json({ success: true, data: items });
});

// Trendyol Product Research - Scrape search results
router.post('/trendyol/search', authenticateAdmin, async (req, res) => {
  try {
    const { query, page: pageNum = 1, sortBy = 'BEST_SELLER' } = req.body || {};
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Arama terimi gereklidir' 
      });
    }

    // Playwright kullanarak Trendyol arama sonuçlarını çek
    let playwright;
    try {
      playwright = require('playwright');
    } catch (e) {
      return res.status(500).json({ 
        success: false, 
        message: 'Playwright paketi gerekli. Lütfen yükleyin: npm install playwright' 
      });
    }

    // Arama terimini URL encode et
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://www.trendyol.com/sr?q=${encodedQuery}&qt=${encodedQuery}&st=${encodedQuery}&os=${pageNum}&sst=${sortBy}&pi=${pageNum}`;

    console.log(`🔍 Trendyol arama başlatılıyor: ${query} (Sayfa: ${pageNum})`);

    // Browser başlat
    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    try {
      // Sayfayı yükle
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Sayfanın yüklenmesini bekle
      await page.waitForTimeout(2000);

      // Ürün kartlarını çek
      const products = await page.evaluate(() => {
        const productCards = document.querySelectorAll('[data-testid="product-card"]') || 
                           document.querySelectorAll('.p-card-wrppr') ||
                           document.querySelectorAll('.product-card');

        const results = [];

        productCards.forEach((card, index) => {
          try {
            // Ürün adı
            const nameElement = card.querySelector('[data-testid="product-card-name"]') ||
                               card.querySelector('.prdct-desc-cntnr-name') ||
                               card.querySelector('.product-name') ||
                               card.querySelector('a[href*="/"]');
            const name = nameElement ? nameElement.textContent.trim() : '';

            // Ürün linki
            const linkElement = card.querySelector('a[href*="/"]');
            const link = linkElement ? linkElement.href : '';

            // Fiyat
            const priceElement = card.querySelector('[data-testid="product-card-price"]') ||
                                card.querySelector('.prc-box-dscntd') ||
                                card.querySelector('.price');
            const price = priceElement ? priceElement.textContent.trim() : '';

            // Eski fiyat (varsa)
            const oldPriceElement = card.querySelector('.prc-box-orgnl') ||
                                  card.querySelector('.old-price');
            const oldPrice = oldPriceElement ? oldPriceElement.textContent.trim() : null;

            // İndirim yüzdesi (varsa)
            const discountElement = card.querySelector('.prc-box-dscnt') ||
                                  card.querySelector('.discount-badge');
            const discount = discountElement ? discountElement.textContent.trim() : null;

            // Görsel
            const imageElement = card.querySelector('img');
            const image = imageElement ? (imageElement.src || imageElement.getAttribute('data-src') || '') : '';

            // Marka
            const brandElement = card.querySelector('[data-testid="product-card-brand"]') ||
                               card.querySelector('.product-brand');
            const brand = brandElement ? brandElement.textContent.trim() : '';

            // Değerlendirme (varsa)
            const ratingElement = card.querySelector('[data-testid="product-card-rating"]') ||
                                 card.querySelector('.rating');
            const rating = ratingElement ? ratingElement.textContent.trim() : null;

            // Yorum sayısı (varsa)
            const reviewCountElement = card.querySelector('[data-testid="product-card-review-count"]') ||
                                      card.querySelector('.review-count');
            const reviewCount = reviewCountElement ? reviewCountElement.textContent.trim() : null;

            if (name && link) {
              results.push({
                name,
                link,
                price,
                oldPrice,
                discount,
                image,
                brand,
                rating,
                reviewCount,
                position: index + 1
              });
            }
          } catch (err) {
            console.error('Ürün parse hatası:', err);
          }
        });

        return results;
      });

      await browser.close();

      console.log(`✅ Trendyol arama tamamlandı: ${products.length} ürün bulundu`);

      return res.json({
        success: true,
        data: {
          query: query.trim(),
          page: pageNum,
          sortBy,
          totalResults: products.length,
          products
        }
      });

    } catch (error) {
      await browser.close();
      throw error;
    }

  } catch (error) {
    console.error('❌ Trendyol scraper hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Trendyol arama sırasında hata oluştu' 
    });
  }
});

module.exports = router;


