// HepsiBurada API Service
// HepsiBurada Marketplace API entegrasyonu için servis

const https = require('https');

const HEPSIBURADA_API_BASE_URL = 'https://oms-external.hepsiburada.com';

class HepsiBuradaAPIService {
  /**
   * HepsiBurada API için Authorization header oluştur
   * @param {string} apiKey - HepsiBurada API Key
   * @param {string} apiSecret - HepsiBurada API Secret
   * @returns {string} Authorization header
   */
  static createAuthHeader(apiKey, apiSecret) {
    if (!apiKey || !apiSecret) {
      throw new Error('API Key ve API Secret gereklidir');
    }
    // HepsiBurada genellikle Basic Auth veya Bearer token kullanır
    // Burada Basic Auth kullanıyoruz
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * HepsiBurada API'ye HTTP isteği gönder
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} endpoint - API endpoint
   * @param {string} apiKey - HepsiBurada API Key
   * @param {string} apiSecret - HepsiBurada API Secret
   * @param {object} data - Request body (POST/PUT için)
   * @param {object} queryParams - Query parameters
   * @returns {Promise<object>} API response
   */
  static async makeRequest(method, endpoint, apiKey, apiSecret, data = null, queryParams = {}) {
    return new Promise((resolve, reject) => {
      const authHeader = this.createAuthHeader(apiKey, apiSecret);
      
      // Query parameters ekle
      let url = `${HEPSIBURADA_API_BASE_URL}${endpoint}`;
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
   * HepsiBurada siparişlerini çek
   * @param {string} merchantId - HepsiBurada Merchant ID
   * @param {string} apiKey - HepsiBurada API Key
   * @param {string} apiSecret - HepsiBurada API Secret
   * @param {object} options - Query options (startDate, endDate, page, size, status)
   * @returns {Promise<object>} Sipariş listesi
   */
  static async getOrders(merchantId, apiKey, apiSecret, options = {}) {
    try {
      const {
        startDate,
        endDate,
        page = 0,
        size = 200,
        status
      } = options;

      const queryParams = {
        page,
        size
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

      // HepsiBurada API endpoint'i (örnek - gerçek endpoint dokümantasyondan alınmalı)
      const endpoint = `/merchants/${merchantId}/orders`;
      const response = await this.makeRequest('GET', endpoint, apiKey, apiSecret, null, queryParams);
      
      return response;
    } catch (error) {
      console.error('❌ HepsiBurada API getOrders error:', error);
      throw error;
    }
  }

  /**
   * HepsiBurada sipariş detayını çek
   * @param {string} merchantId - HepsiBurada Merchant ID
   * @param {string} orderNumber - Sipariş numarası
   * @param {string} apiKey - HepsiBurada API Key
   * @param {string} apiSecret - HepsiBurada API Secret
   * @returns {Promise<object>} Sipariş detayı
   */
  static async getOrderDetail(merchantId, orderNumber, apiKey, apiSecret) {
    try {
      const endpoint = `/merchants/${merchantId}/orders/${orderNumber}`;
      const response = await this.makeRequest('GET', endpoint, apiKey, apiSecret);
      return response;
    } catch (error) {
      console.error('❌ HepsiBurada API getOrderDetail error:', error);
      throw error;
    }
  }

  /**
   * HepsiBurada API bağlantısını test et
   * @param {string} merchantId - HepsiBurada Merchant ID
   * @param {string} apiKey - HepsiBurada API Key
   * @param {string} apiSecret - HepsiBurada API Secret
   * @returns {Promise<object>} Test sonucu
   */
  static async testConnection(merchantId, apiKey, apiSecret) {
    try {
      // Basit bir sipariş listesi sorgusu ile test et (size=1)
      const response = await this.getOrders(merchantId, apiKey, apiSecret, { size: 1, page: 0 });
      return {
        success: true,
        message: 'HepsiBurada API bağlantısı başarılı'
      };
    } catch (error) {
      return {
        success: false,
        message: error.error || error.message || 'HepsiBurada API bağlantısı başarısız',
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

module.exports = HepsiBuradaAPIService;

