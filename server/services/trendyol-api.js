// Trendyol API Service
// Trendyol Marketplace API entegrasyonu için servis

const https = require('https');

const TRENDYOL_API_BASE_URL = 'https://api.trendyol.com/sapigw/suppliers';

class TrendyolAPIService {
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
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
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
   * @returns {Promise<object>} API response
   */
  static async makeRequest(method, endpoint, apiKey, apiSecret, data = null, queryParams = {}) {
    return new Promise((resolve, reject) => {
      const authHeader = this.createAuthHeader(apiKey, apiSecret);
      
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
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huğlu-Outdoor/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                success: true,
                data: jsonData,
                statusCode: res.statusCode
              });
            } else {
              reject({
                success: false,
                error: jsonData.message || jsonData.error || 'API request failed',
                statusCode: res.statusCode,
                data: jsonData
              });
            }
          } catch (error) {
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

      const endpoint = `/suppliers/${supplierId}/orders`;
      const response = await this.makeRequest('GET', endpoint, apiKey, apiSecret, null, queryParams);
      
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
      const endpoint = `/suppliers/${supplierId}/orders/${orderNumber}`;
      const response = await this.makeRequest('GET', endpoint, apiKey, apiSecret);
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
        // 4xx hataları için retry yapma
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        // Son deneme değilse bekle ve tekrar dene
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    throw lastError;
  }
}

module.exports = TrendyolAPIService;

