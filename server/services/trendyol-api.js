// Trendyol API Service
// Trendyol Marketplace API entegrasyonu için servis

const https = require('https');

const TRENDYOL_API_BASE_URL = 'https://api.trendyol.com/sapigw/suppliers';

// Rate limiting için son istek zamanını takip et
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // İstekler arası minimum bekleme süresi (ms) - 500ms = 2 istek/saniye
const MAX_REQUESTS_PER_SECOND = 2; // Saniyede maksimum istek sayısı

class TrendyolAPIService {
  /**
   * Rate limiting kontrolü - istekler arasında minimum bekleme süresi
   */
  static async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏳ Rate limit için ${waitTime}ms bekleniyor...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTime = Date.now();
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
    // API Key ve Secret'ı temizle (başında/sonunda boşluk varsa kaldır)
    const cleanApiKey = String(apiKey).trim();
    const cleanApiSecret = String(apiSecret).trim();
    
    if (!cleanApiKey || !cleanApiSecret) {
      throw new Error('API Key ve API Secret boş olamaz');
    }
    
    const credentials = Buffer.from(`${cleanApiKey}:${cleanApiSecret}`).toString('base64');
    return `Basic ${credentials}`;
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
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': cleanUserAgent
        }
      };

      // Console log - İstek detayları
      console.log('📤 Trendyol API İsteği:');
      console.log('  Method:', method);
      console.log('  URL:', url);
      console.log('  Endpoint:', endpoint);
      console.log('  Supplier ID:', supplierId);
      console.log('  User-Agent:', userAgent);
      console.log('  API Key (ilk 4 karakter):', cleanApiKey.substring(0, 4) + '***');
      console.log('  API Secret (var mı):', cleanApiSecret ? 'Evet' : 'Hayır');
      console.log('  Query Params:', JSON.stringify(queryParams, null, 2));
      if (data) {
        console.log('  Request Body:', JSON.stringify(data, null, 2));
      }

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            
            // Console log - Yanıt detayları
            console.log('📥 Trendyol API Yanıtı:');
            console.log('  Status Code:', res.statusCode);
            console.log('  Success:', res.statusCode >= 200 && res.statusCode < 300);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log('  Response Data:', JSON.stringify(jsonData, null, 2).substring(0, 500));
            } else {
              console.log('  Error:', jsonData.message || jsonData.error || 'API request failed');
              if (res.statusCode === 401) {
                console.log('  ❌ 401 Unauthorized - Authentication hatası:');
                console.log('     - API Key ve Secret kontrol edin');
                console.log('     - Trendyol Entegrasyon ayarlarını kontrol edin');
                console.log('     - API Key ve Secret doğru mu?');
                if (jsonData.errors && Array.isArray(jsonData.errors)) {
                  console.log('     - Trendyol Hata Detayları:', JSON.stringify(jsonData.errors, null, 2));
                }
              }
              if (res.statusCode === 429) {
                console.log('  ⚠️ 429 Too Many Requests - Rate limit aşıldı:');
                console.log('     - İstekler arasında bekleme süresi artırılıyor');
                console.log('     - Retry mekanizması devreye girecek');
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
   * Trendyol siparişlerini çek
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} options - Query options (startDate, endDate, page, size, orderByField, orderByDirection, status)
   * @returns {Promise<object>} Sipariş listesi
   */
  static async getOrders(supplierId, apiKey, apiSecret, options = {}) {
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

      const endpoint = `/${supplierId}/orders`;
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, queryParams, supplierId),
        3, // maxRetries
        2000 // initial delay (2 saniye)
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getOrders error:', error);
      throw error;
    }
  }

  /**
   * Trendyol sipariş detayını çek
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} orderNumber - Sipariş numarası
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @returns {Promise<object>} Sipariş detayı
   */
  static async getOrderDetail(supplierId, orderNumber, apiKey, apiSecret) {
    try {
      const endpoint = `/${supplierId}/orders/${orderNumber}`;
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, {}, supplierId),
        3, // maxRetries
        2000 // initial delay (2 saniye)
      );
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getOrderDetail error:', error);
      throw error;
    }
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
}

module.exports = TrendyolAPIService;

