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

// Trendyol Product Research - Fetch search results
router.post('/trendyol/search', authenticateAdmin, async (req, res) => {
  try {
    const { query, page: pageNum = 1, sortBy = 'BEST_SELLER' } = req.body || {};
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Arama terimi gereklidir' 
      });
    }

    // Cheerio ve axios kullanarak Trendyol arama sonuçlarını çek
    let cheerio, axios;
    try {
      cheerio = require('cheerio');
      axios = require('axios');
    } catch (e) {
      return res.status(500).json({ 
        success: false, 
        message: 'Gerekli paketler yüklü değil. Lütfen cheerio ve axios paketlerini yükleyin.' 
      });
    }

    // Arama terimini URL encode et
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://www.trendyol.com/sr?q=${encodedQuery}&qt=${encodedQuery}&st=${encodedQuery}&os=${pageNum}&sst=${sortBy}&pi=${pageNum}`;

    console.log(`🔍 Trendyol arama başlatılıyor: ${query} (Sayfa: ${pageNum})`);

    try {
      // Cookie jar için axios instance oluştur
      const axiosInstance = axios.create({
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'DNT': '1',
          'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-ch-ua-platform-version': '"15.0.0"',
          'sec-ch-ua-arch': '"x86"',
          'sec-ch-ua-bitness': '"64"',
          'sec-ch-ua-model': '""',
          'sec-ch-ua-full-version': '"131.0.6778.85"',
          'sec-ch-ua-full-version-list': '"Google Chrome";v="131.0.6778.85", "Chromium";v="131.0.6778.85", "Not_A Brand";v="24.0.0.0"'
        }
      });

      // Cookie'leri saklamak için
      let cookieJar = '';

      // 1. Adım: Ana sayfaya git (cookie al)
      try {
        const homeResponse = await axiosInstance.get('https://www.trendyol.com', {
          headers: {
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
          }
        });
        
        if (homeResponse.headers['set-cookie']) {
          cookieJar = homeResponse.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        
        // Random delay (human-like behavior)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      } catch (e) {
        console.warn('Ana sayfa cookie alınamadı, devam ediliyor...');
      }

      // 2. Adım: Bir kategori sayfasına git (daha gerçekçi görün)
      try {
        const categoryResponse = await axiosInstance.get('https://www.trendyol.com/erkek-giyim-x-g2', {
          headers: {
            'Referer': 'https://www.trendyol.com/',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Cookie': cookieJar
          }
        });
        
        // Cookie'leri güncelle
        if (categoryResponse.headers['set-cookie']) {
          const newCookies = categoryResponse.headers['set-cookie'].map(c => c.split(';')[0]);
          const existingCookies = cookieJar ? cookieJar.split('; ') : [];
          cookieJar = [...new Set([...existingCookies, ...newCookies])].filter(Boolean).join('; ');
        }
        
        // Random delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      } catch (e) {
        console.warn('Kategori sayfası ziyaret edilemedi, devam ediliyor...');
      }

      // 3. Adım: Arama sayfasına git
      const response = await axiosInstance.get(url, {
        headers: {
          'Referer': 'https://www.trendyol.com/erkek-giyim-x-g2',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Cookie': cookieJar,
          'Viewport-Width': '1920',
          'Width': '1920'
        }
      });

      const $ = cheerio.load(response.data);
      const products = [];

      // Ürün kartlarını bul - Trendyol'un farklı selector'larını dene
      const productCards = $('[data-testid="product-card"], .p-card-wrppr, .product-card, .p-card-chldrn-cntnr, article').slice(0, 50);

      productCards.each((index, element) => {
        try {
          const $card = $(element);
          
          // Ürün adı
          const nameElement = $card.find('[data-testid="product-card-name"], .prdct-desc-cntnr-name, .product-name, a[href*="/"]').first();
          const name = nameElement.text().trim() || $card.find('a[href*="/"]').first().text().trim();

          // Ürün linki
          const linkElement = $card.find('a[href*="/"]').first();
          let link = linkElement.attr('href') || '';
          if (link && !link.startsWith('http')) {
            link = 'https://www.trendyol.com' + link;
          }

          // Fiyat
          const priceElement = $card.find('[data-testid="product-card-price"], .prc-box-dscntd, .price, .prc-box-sllng').first();
          const price = priceElement.text().trim();

          // Eski fiyat (varsa)
          const oldPriceElement = $card.find('.prc-box-orgnl, .old-price').first();
          const oldPrice = oldPriceElement.length ? oldPriceElement.text().trim() : null;

          // İndirim yüzdesi (varsa)
          const discountElement = $card.find('.prc-box-dscnt, .discount-badge, .discount-rate').first();
          const discount = discountElement.length ? discountElement.text().trim() : null;

          // Görsel
          const imageElement = $card.find('img').first();
          let image = imageElement.attr('src') || imageElement.attr('data-src') || imageElement.attr('data-lazy') || '';
          if (image && !image.startsWith('http')) {
            image = 'https:' + image;
          }

          // Marka
          const brandElement = $card.find('[data-testid="product-card-brand"], .product-brand, .brand-name').first();
          const brand = brandElement.length ? brandElement.text().trim() : '';

          // Değerlendirme (varsa)
          const ratingElement = $card.find('[data-testid="product-card-rating"], .rating, .rating-score').first();
          const rating = ratingElement.length ? ratingElement.text().trim() : null;

          // Yorum sayısı (varsa)
          const reviewCountElement = $card.find('[data-testid="product-card-review-count"], .review-count, .rating-count').first();
          const reviewCount = reviewCountElement.length ? reviewCountElement.text().trim() : null;

          if (name && link) {
            products.push({
              name,
              link,
              price: price || 'Fiyat bilgisi yok',
              oldPrice,
              discount,
              image: image || '',
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
      console.error('❌ Trendyol arama hatası:', error.message);
      
      // 403 hatası için özel mesaj
      if (error.response && error.response.status === 403) {
        return res.status(403).json({ 
          success: false, 
          message: 'Trendyol bot koruması nedeniyle erişim engellendi. Lütfen daha sonra tekrar deneyin veya farklı bir arama terimi kullanın.' 
        });
      }
      
      // 429 (Rate Limit) hatası için özel mesaj
      if (error.response && error.response.status === 429) {
        return res.status(429).json({ 
          success: false, 
          message: 'Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.' 
        });
      }
      
      return res.status(error.response?.status || 500).json({ 
        success: false, 
        message: error.response?.status === 403 
          ? 'Trendyol bot koruması nedeniyle erişim engellendi.' 
          : (error.message || 'Trendyol arama sırasında hata oluştu. Sayfa yapısı değişmiş olabilir.') 
      });
    }

  } catch (error) {
    console.error('❌ Trendyol arama hatası:', error);
    
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ 
        success: false, 
        message: 'Trendyol bot koruması nedeniyle erişim engellendi.' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Trendyol arama sırasında hata oluştu' 
    });
  }
});

module.exports = router;


