// Trendyol API Service
// Trendyol Marketplace API entegrasyonu için servis

const https = require('https');

const TRENDYOL_API_BASE_URL = 'https://api.trendyol.com/sapigw/suppliers';

// Rate limiting için son istek zamanını takip et
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // İstekler arası minimum bekleme süresi (ms) - 500ms = 2 istek/saniye
const MAX_REQUESTS_PER_SECOND = 2; // Saniyede maksimum istek sayısı

// Cache mekanizması - sipariş detaylarını cache'le
const orderDetailCache = new Map();
const orderListCache = new Map();
const ORDER_CACHE_TTL = 5 * 60 * 1000; // 5 dakika cache süresi
const ORDER_LIST_CACHE_TTL = 2 * 60 * 1000; // 2 dakika sipariş listesi cache

// HTTP connection pooling için agent
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 5
});

class TrendyolAPIService {
  /**
   * Rate limiting kontrolü - istekler arasında minimum bekleme süresi
   */
  static async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      // Sadece uzun bekleme sürelerinde log (performans için)
      if (waitTime > 200) {
        console.log(`⏳ Rate limit için ${waitTime}ms bekleniyor...`);
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTime = Date.now();
  }

  /**
   * Cache'i temizle (eski cache'leri kaldır)
   */
  static clearExpiredCache() {
    const now = Date.now();
    
    // Sipariş detay cache'ini temizle
    for (const [key, value] of orderDetailCache.entries()) {
      if (now - value.timestamp > ORDER_CACHE_TTL) {
        orderDetailCache.delete(key);
      }
    }
    
    // Sipariş listesi cache'ini temizle
    for (const [key, value] of orderListCache.entries()) {
      if (now - value.timestamp > ORDER_LIST_CACHE_TTL) {
        orderListCache.delete(key);
      }
    }
  }

  /**
   * Tüm cache'i temizle
   */
  static clearAllCache() {
    orderDetailCache.clear();
    orderListCache.clear();
  }
  /**
   * Trendyol API için Basic Auth header oluştur
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @returns {string} Base64 encoded authorization header
   */
  static createAuthHeader(apiKey, apiSecret) {
    if (!apiKey || !apiSecret) {
      throw new Error('API Key ve API Secret gereklidir');
    }
    // API Key ve Secret'ı temizle
    // - Başında/sonunda boşluk, newline, carriage return gibi karakterleri kaldır
    // - İçindeki özel karakterleri koru (API Key/Secret'ın kendisi özel karakter içerebilir)
    let cleanApiKey = String(apiKey || '').trim();
    let cleanApiSecret = String(apiSecret || '').trim();
    
    // Görünmez karakterleri temizle (newline, carriage return, tab vb.)
    cleanApiKey = cleanApiKey.replace(/[\r\n\t]/g, '');
    cleanApiSecret = cleanApiSecret.replace(/[\r\n\t]/g, '');
    
    if (!cleanApiKey || !cleanApiSecret) {
      throw new Error('API Key ve API Secret boş olamaz');
    }
    
    // Trendyol API formatı: apiKey:apiSecret (UTF-8 encoding ile Base64)
    // Format: Basic base64(apiKey:apiSecret)
    // NOT: Bazı Trendyol API versiyonlarında Secret:Key formatı da kullanılabilir
    // Ancak standart format Key:Secret'tır
    const credentials = `${cleanApiKey}:${cleanApiSecret}`;
    // UTF-8 encoding ile Base64 encode et
    const encodedCredentials = Buffer.from(credentials, 'utf8').toString('base64');
    
    // Debug için (her zaman log - authentication sorunlarını tespit etmek için)
    console.log('🔐 Trendyol Auth Debug:');
    console.log('  API Key uzunluk:', cleanApiKey.length);
    console.log('  API Secret uzunluk:', cleanApiSecret.length);
    console.log('  API Key (ilk 8 karakter):', cleanApiKey.substring(0, 8) + '***');
    console.log('  API Secret (son 4 karakter):', '***' + cleanApiSecret.substring(cleanApiSecret.length - 4));
    console.log('  Credentials format:', 'apiKey:apiSecret');
    console.log('  Encoded (ilk 30 karakter):', encodedCredentials.substring(0, 30) + '...');
    
    return `Basic ${encodedCredentials}`;
  }

  /**
   * Trendyol API'ye HTTP isteği gönder
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} endpoint - API endpoint (örn: /suppliers/{supplierId}/orders)
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} data - Request body (POST/PUT için)
   * @param {object} queryParams - Query parameters
   * @param {string} supplierId - Trendyol Supplier ID (User-Agent için)
   * @returns {Promise<object>} API response
   */
  static async makeRequest(method, endpoint, apiKey, apiSecret, data = null, queryParams = {}, supplierId = null) {
    // Rate limiting kontrolü
    await this.waitForRateLimit();
    
    return new Promise((resolve, reject) => {
      // API Key ve Secret'ı temizle
      const cleanApiKey = String(apiKey || '').trim();
      const cleanApiSecret = String(apiSecret || '').trim();
      
      if (!cleanApiKey || !cleanApiSecret) {
        return reject({
          success: false,
          error: 'API Key veya API Secret boş veya geçersiz',
          statusCode: 400
        });
      }
      
      const authHeader = this.createAuthHeader(cleanApiKey, cleanApiSecret);
      
      // Query parameters ekle
      let url = `${TRENDYOL_API_BASE_URL}${endpoint}`;
      const queryString = Object.keys(queryParams)
        .filter(key => queryParams[key] !== null && queryParams[key] !== undefined)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
        .join('&');
      if (queryString) {
        url += `?${queryString}`;
      }

      const urlObj = new URL(url);
      // User-Agent'ı supplierId ile oluştur - ASCII karakterlerle
      const userAgent = supplierId ? `${supplierId} - SelfIntegration` : 'SelfIntegration';
      // User-Agent header'ını temizle - sadece ASCII karakterler
      const cleanUserAgent = userAgent.replace(/[^\x20-\x7E]/g, '');
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        agent: httpsAgent, // Connection pooling için
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': cleanUserAgent,
          'Connection': 'keep-alive' // Connection reuse için
        }
      };

      // Console log - İstek detayları (sadece önemli istekler için)
      const isImportantRequest = endpoint.includes('/orders') && !endpoint.includes('/orders/');
      if (isImportantRequest || process.env.DEBUG_TRENDYOL === 'true') {
        console.log('📤 Trendyol API İsteği:');
        console.log('  Method:', method);
        console.log('  Endpoint:', endpoint);
        console.log('  Supplier ID:', supplierId);
        console.log('  API Key (ilk 4 karakter):', cleanApiKey.substring(0, 4) + '***');
        console.log('  API Secret (var mı):', cleanApiSecret ? 'Evet (' + cleanApiSecret.length + ' karakter)' : 'Hayır');
        console.log('  Auth Header (ilk 30 karakter):', authHeader.substring(0, 30) + '...');
      }

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            
            // Console log - Yanıt detayları (sadece hatalar ve önemli istekler için)
            const isImportantRequest = endpoint.includes('/orders') && !endpoint.includes('/orders/');
            if (!isImportantRequest && res.statusCode >= 200 && res.statusCode < 300) {
              // Başarılı detay istekleri için log yok (performans için)
            } else {
              console.log('📥 Trendyol API Yanıtı:');
              console.log('  Status Code:', res.statusCode);
              if (res.statusCode >= 200 && res.statusCode < 300) {
                if (isImportantRequest) {
                  const content = jsonData.content || jsonData;
                  const count = Array.isArray(content) ? content.length : (content?.totalElements || 0);
                  console.log(`  ✅ Başarılı - ${count} kayıt`);
                }
              } else {
                console.log('  Error:', jsonData.message || jsonData.error || 'API request failed');
                if (res.statusCode === 401) {
                  console.log('  ❌ 401 Unauthorized - Authentication hatası');
                }
                if (res.statusCode === 429) {
                  console.log('  ⚠️ 429 Too Many Requests - Rate limit aşıldı');
                }
              }
            }
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                success: true,
                data: jsonData,
                statusCode: res.statusCode
              });
            } else {
              // 401 ve 429 hataları için daha açıklayıcı mesaj
              let errorMessage = jsonData.message || jsonData.error || 'API request failed';
              if (res.statusCode === 401) {
                errorMessage = 'Trendyol API kimlik doğrulama hatası. Lütfen API Key ve API Secret bilgilerinizi kontrol edin.';
                if (jsonData.errors && Array.isArray(jsonData.errors) && jsonData.errors.length > 0) {
                  const firstError = jsonData.errors[0];
                  if (firstError.message) {
                    errorMessage += ` Detay: ${firstError.message}`;
                  }
                }
              } else if (res.statusCode === 429) {
                errorMessage = 'Trendyol API rate limit aşıldı. İstekler yavaşlatılıyor, lütfen tekrar deneyin.';
                // Retry-After header'ı varsa kullan
                const retryAfter = res.headers['retry-after'] || res.headers['Retry-After'];
                if (retryAfter) {
                  errorMessage += ` Önerilen bekleme süresi: ${retryAfter} saniye`;
                }
              }
              
              reject({
                success: false,
                error: errorMessage,
                statusCode: res.statusCode,
                data: jsonData,
                retryAfter: res.headers['retry-after'] || res.headers['Retry-After']
              });
            }
          } catch (error) {
            console.log('❌ Trendyol API JSON Parse Hatası:', error.message);
            console.log('  Raw Response:', responseData.substring(0, 500));
            reject({
              success: false,
              error: 'Invalid JSON response',
              statusCode: res.statusCode,
              rawResponse: responseData
            });
          }
        });
      });

      req.on('error', (error) => {
        console.log('❌ Trendyol API Network Hatası:', error.message);
        reject({
          success: false,
          error: error.message || 'Network error',
          statusCode: 0
        });
      });

      // Request body gönder (POST/PUT için)
      if (data && (method === 'POST' || method === 'PUT')) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Trendyol siparişlerini çek (cache ile optimize edilmiş)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} options - Query options (startDate, endDate, page, size, orderByField, orderByDirection, status)
   * @param {boolean} useCache - Cache kullanılsın mı (varsayılan: true)
   * @returns {Promise<object>} Sipariş listesi
   */
  static async getOrders(supplierId, apiKey, apiSecret, options = {}, useCache = true) {
    try {
      const {
        startDate,
        endDate,
        page = 0,
        size = 200,
        orderByField = 'PackageLastModifiedDate',
        orderByDirection = 'DESC',
        status
      } = options;

      const queryParams = {
        page,
        size,
        orderByField,
        orderByDirection
      };

      if (startDate) {
        queryParams.startDate = startDate;
      }
      if (endDate) {
        queryParams.endDate = endDate;
      }
      if (status) {
        queryParams.status = status;
      }

      // Cache kontrolü (sadece sayfa 0 ve cache kullanılıyorsa)
      if (useCache && page === 0 && !startDate && !endDate) {
        const cacheKey = `${supplierId}_${status || 'all'}_${size}`;
        if (orderListCache.has(cacheKey)) {
          const cached = orderListCache.get(cacheKey);
          if (Date.now() - cached.timestamp < ORDER_LIST_CACHE_TTL) {
            return cached.data;
          } else {
            orderListCache.delete(cacheKey);
          }
        }
      }

      const endpoint = `/${supplierId}/orders`;
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, queryParams, supplierId),
        3, // maxRetries
        2000 // initial delay (2 saniye)
      );

      // Cache'e kaydet (sadece sayfa 0 ve başarılı ise)
      if (useCache && page === 0 && !startDate && !endDate && response.success) {
        const cacheKey = `${supplierId}_${status || 'all'}_${size}`;
        orderListCache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getOrders error:', error);
      throw error;
    }
  }

  /**
   * Trendyol sipariş detayını çek (cache ile optimize edilmiş)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} orderNumber - Sipariş numarası
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {boolean} useCache - Cache kullanılsın mı (varsayılan: true)
   * @returns {Promise<object>} Sipariş detayı
   */
  static async getOrderDetail(supplierId, orderNumber, apiKey, apiSecret, useCache = true) {
    try {
      // Cache kontrolü
      const cacheKey = `${supplierId}_${orderNumber}`;
      if (useCache && orderDetailCache.has(cacheKey)) {
        const cached = orderDetailCache.get(cacheKey);
        if (Date.now() - cached.timestamp < ORDER_CACHE_TTL) {
          return cached.data;
        } else {
          orderDetailCache.delete(cacheKey);
        }
      }

      const endpoint = `/${supplierId}/orders/${orderNumber}`;
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, {}, supplierId),
        3, // maxRetries
        2000 // initial delay (2 saniye)
      );

      // Cache'e kaydet
      if (useCache && response.success) {
        orderDetailCache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
      }

      return response;
    } catch (error) {
      console.error('❌ Trendyol API getOrderDetail error:', error);
      throw error;
    }
  }

  /**
   * Birden fazla sipariş detayını batch olarak çek (optimize edilmiş)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string[]} orderNumbers - Sipariş numaraları dizisi
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {number} batchSize - Her batch'te kaç sipariş çekilecek (varsayılan: 5)
   * @returns {Promise<Array>} Sipariş detayları
   */
  static async getOrderDetailsBatch(supplierId, orderNumbers, apiKey, apiSecret, batchSize = 5) {
    const results = [];
    const uniqueOrderNumbers = [...new Set(orderNumbers)]; // Duplicate'leri kaldır

    // Önce cache'den kontrol et
    const uncachedOrders = [];
    const cachedResults = [];

    for (const orderNumber of uniqueOrderNumbers) {
      const cacheKey = `${supplierId}_${orderNumber}`;
      if (orderDetailCache.has(cacheKey)) {
        const cached = orderDetailCache.get(cacheKey);
        if (Date.now() - cached.timestamp < ORDER_CACHE_TTL) {
          cachedResults.push(cached.data);
          continue;
        } else {
          orderDetailCache.delete(cacheKey);
        }
      }
      uncachedOrders.push(orderNumber);
    }

    // Cache'den gelen sonuçları ekle
    results.push(...cachedResults);

    // Cache'de olmayan siparişleri batch'ler halinde çek
    for (let i = 0; i < uncachedOrders.length; i += batchSize) {
      const batch = uncachedOrders.slice(i, i + batchSize);
      
      // Batch içindeki siparişleri sıralı çek (rate limiting için)
      for (const orderNumber of batch) {
        try {
          const detail = await this.getOrderDetail(supplierId, orderNumber, apiKey, apiSecret, true);
          if (detail.success) {
            results.push(detail);
          }
        } catch (error) {
          console.error(`❌ Sipariş detayı çekilemedi: ${orderNumber}`, error.message);
        }
      }

      // Batch'ler arasında bekleme (son batch değilse)
      if (i + batchSize < uncachedOrders.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Trendyol API bağlantısını test et
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @returns {Promise<object>} Test sonucu
   */
  static async testConnection(supplierId, apiKey, apiSecret) {
    try {
      // Basit bir sipariş listesi sorgusu ile test et (size=1)
      const response = await this.getOrders(supplierId, apiKey, apiSecret, { size: 1, page: 0 });
      return {
        success: true,
        message: 'Trendyol API bağlantısı başarılı'
      };
    } catch (error) {
      return {
        success: false,
        message: error.error || error.message || 'Trendyol API bağlantısı başarısız',
        error: error
      };
    }
  }

  /**
   * Retry mekanizması ile API isteği gönder
   * @param {Function} requestFn - İstek fonksiyonu
   * @param {number} maxRetries - Maksimum deneme sayısı (varsayılan: 3)
   * @param {number} delay - Retry arası bekleme süresi (ms, varsayılan: 1000)
   * @returns {Promise<object>} API response
   */
  static async makeRequestWithRetry(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // 429 (Rate Limit) hatası için özel retry mekanizması
        if (error.statusCode === 429) {
          // Retry-After header'ı varsa onu kullan, yoksa exponential backoff
          const retryAfter = error.retryAfter ? parseInt(error.retryAfter) * 1000 : null;
          const waitTime = retryAfter || (delay * Math.pow(2, i)); // Exponential backoff: 1s, 2s, 4s
          
          console.log(`⏳ Rate limit nedeniyle ${waitTime}ms bekleniyor (deneme ${i + 1}/${maxRetries})...`);
          
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            // Rate limit bekleme süresini artır
            lastRequestTime = Date.now() + waitTime;
            continue; // Tekrar dene
          }
        }
        
        // 401, 403, 404 gibi hatalar için retry yapma (429 hariç)
        if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }
        
        // Son deneme değilse bekle ve tekrar dene (5xx hataları için)
        if (i < maxRetries - 1 && error.statusCode >= 500) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        } else if (i < maxRetries - 1 && error.statusCode !== 429) {
          // Diğer hatalar için kısa bekleme
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Trendyol'a ürün aktar (v2 API)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} productData - Ürün verisi (Trendyol formatında)
   * @returns {Promise<object>} API response
   */
  static async createProduct(supplierId, apiKey, apiSecret, productData) {
    try {
      const endpoint = `/${supplierId}/v2/products`;
      
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('POST', endpoint, apiKey, apiSecret, productData, {}, supplierId),
        3, // maxRetries
        2000 // initial delay (2 saniye)
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API createProduct error:', error);
      throw error;
    }
  }

  /**
   * Trendyol'a toplu ürün aktar (v2 API)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {Array<object>} productsData - Ürün verileri dizisi (Trendyol formatında)
   * @returns {Promise<object>} API response
   */
  static async createProductsBatch(supplierId, apiKey, apiSecret, productsData) {
    try {
      const endpoint = `/${supplierId}/v2/products`;
      
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('POST', endpoint, apiKey, apiSecret, productsData, {}, supplierId),
        3, // maxRetries
        2000 // initial delay (2 saniye)
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API createProductsBatch error:', error);
      throw error;
    }
  }

  /**
   * Trendyol'dan ürün listesini çek (Ürün Filtreleme API)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} options - Query options (page, size, approved, barcode, stockCode, startDate, endDate, supplierId, categoryId, brandId, etc.)
   * @returns {Promise<object>} Ürün listesi
   * @see https://developers.trendyol.com/docs/marketplace/urun-entegrasyonu/urun-filtreleme
   */
  static async getProducts(supplierId, apiKey, apiSecret, options = {}) {
    try {
      const {
        page = 0,
        size = 200,
        approved = null,
        barcode = null,
        stockCode = null,
        startDate = null,
        endDate = null,
        categoryId = null,
        brandId = null,
        productMainId = null,
        onSale = null,
        rejected = null,
        blacklisted = null,
        active = null
      } = options;

      // Trendyol Ürün Filtreleme API endpoint'i
      const endpoint = `/${supplierId}/products`;

      const queryParams = {
        page,
        size
      };

      // Filtreleme parametreleri (Trendyol API dokümantasyonuna göre)
      if (approved !== null && approved !== undefined) {
        queryParams.approved = approved;
      }
      if (barcode) {
        queryParams.barcode = barcode;
      }
      if (stockCode) {
        queryParams.stockCode = stockCode;
      }
      if (startDate) {
        queryParams.startDate = startDate;
      }
      if (endDate) {
        queryParams.endDate = endDate;
      }
      if (categoryId) {
        queryParams.categoryId = categoryId;
      }
      if (brandId) {
        queryParams.brandId = brandId;
      }
      if (productMainId) {
        queryParams.productMainId = productMainId;
      }
      if (onSale !== null && onSale !== undefined) {
        queryParams.onSale = onSale;
      }
      if (rejected !== null && rejected !== undefined) {
        queryParams.rejected = rejected;
      }
      if (blacklisted !== null && blacklisted !== undefined) {
        queryParams.blacklisted = blacklisted;
      }
      if (active !== null && active !== undefined) {
        queryParams.active = active;
      }
      
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, queryParams, supplierId),
        3, // maxRetries
        2000 // initial delay (2 saniye)
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getProducts error:', error);
      throw error;
    }
  }

  /**
   * Trendyol ürün bilgisini güncelle
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {string} barcode - Ürün barcode'u
   * @param {object} productData - Güncellenmiş ürün verisi (Trendyol formatında)
   * @returns {Promise<object>} API response
   */
  static async updateProduct(supplierId, apiKey, apiSecret, barcode, productData) {
    try {
      const endpoint = `/${supplierId}/v2/products`;
      
      // Trendyol ürün güncelleme için barcode ile birlikte gönder
      const updateData = {
        ...productData,
        barcode: barcode
      };
      
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('PUT', endpoint, apiKey, apiSecret, updateData, {}, supplierId),
        3, // maxRetries
        2000 // initial delay (2 saniye)
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API updateProduct error:', error);
      throw error;
    }
  }
}

module.exports = TrendyolAPIService;

