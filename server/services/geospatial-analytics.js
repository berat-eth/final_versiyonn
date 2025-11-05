/**
 * Geospatial Analytics Service
 * IP-based location tracking ve coğrafi dağılım analizi
 */
class GeospatialAnalyticsService {
  constructor(pool) {
    this.pool = pool;
    // MaxMind GeoIP2 database path (opsiyonel)
    this.geoIPEnabled = false;
  }

  /**
   * IP'den lokasyon bilgisi al (basit versiyon - MaxMind entegrasyonu için hazır)
   */
  async getLocationFromIP(ipAddress) {
    try {
      // IP'yi temizle (IPv6, localhost vs.)
      const cleanIP = this._cleanIP(ipAddress);
      if (!cleanIP) {
        return null;
      }

      // Database'den daha önce kaydedilmiş lokasyon var mı kontrol et
      const [cached] = await this.pool.execute(
        `SELECT country, city, region, timezone
         FROM user_behavior_events
         WHERE ipAddress = ?
         LIMIT 1`,
        [cleanIP]
      );

      if (cached.length > 0 && cached[0].country) {
        return {
          country: cached[0].country,
          city: cached[0].city,
          region: cached[0].region,
          timezone: cached[0].timezone
        };
      }

      // MaxMind GeoIP2 entegrasyonu buraya eklenebilir
      // Şimdilik basit bir mapping kullanıyoruz
      return this._simpleIPMapping(cleanIP);
    } catch (error) {
      console.error('❌ Location from IP error:', error);
      return null;
    }
  }

  /**
   * IP'yi temizle
   */
  _cleanIP(ipAddress) {
    if (!ipAddress) return null;
    
    // IPv6 localhost
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
      return null;
    }
    
    // IPv6'yı IPv4'e çevir
    if (ipAddress.startsWith('::ffff:')) {
      return ipAddress.replace('::ffff:', '');
    }
    
    // Local IP'ler
    if (ipAddress.startsWith('127.') || 
        ipAddress.startsWith('192.168.') ||
        ipAddress.startsWith('10.') ||
        ipAddress.startsWith('172.')) {
      return null;
    }
    
    return ipAddress;
  }

  /**
   * Basit IP mapping (production'da MaxMind kullanılmalı)
   */
  _simpleIPMapping(ipAddress) {
    // Bu basit bir örnek - production'da MaxMind GeoIP2 kullanılmalı
    return {
      country: 'TR', // Default
      city: null,
      region: null,
      timezone: 'Europe/Istanbul'
    };
  }

  /**
   * Coğrafi dağılım analizi
   */
  async getGeographicDistribution(startDate, endDate) {
    try {
      const [distribution] = await this.pool.execute(
        `SELECT 
          COUNT(DISTINCT deviceId) as deviceCount,
          COUNT(DISTINCT userId) as userCount,
          COUNT(*) as eventCount,
          ipAddress
         FROM user_behavior_events
         WHERE timestamp >= ? AND timestamp <= ?
           AND ipAddress IS NOT NULL
         GROUP BY ipAddress
         ORDER BY eventCount DESC
         LIMIT 1000`,
        [startDate, endDate]
      );

      // IP'leri lokasyona çevir
      const locations = [];
      for (const row of distribution) {
        const location = await this.getLocationFromIP(row.ipAddress);
        if (location) {
          locations.push({
            ...location,
            deviceCount: row.deviceCount,
            userCount: row.userCount,
            eventCount: row.eventCount
          });
        }
      }

      // Ülke bazında aggregate
      const countryStats = {};
      for (const loc of locations) {
        if (!countryStats[loc.country]) {
          countryStats[loc.country] = {
            country: loc.country,
            deviceCount: 0,
            userCount: 0,
            eventCount: 0,
            cities: {}
          };
        }
        countryStats[loc.country].deviceCount += loc.deviceCount;
        countryStats[loc.country].userCount += loc.userCount;
        countryStats[loc.country].eventCount += loc.eventCount;
        
        if (loc.city) {
          if (!countryStats[loc.country].cities[loc.city]) {
            countryStats[loc.country].cities[loc.city] = 0;
          }
          countryStats[loc.country].cities[loc.city] += loc.deviceCount;
        }
      }

      return {
        success: true,
        data: {
          byCountry: Object.values(countryStats),
          totalLocations: locations.length
        }
      };
    } catch (error) {
      console.error('❌ Geographic distribution error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Şehir/bölge bazlı kullanıcı segmentasyonu
   */
  async segmentByLocation(startDate, endDate) {
    try {
      const distribution = await this.getGeographicDistribution(startDate, endDate);
      
      if (!distribution.success) {
        return distribution;
      }

      // Segment oluştur
      const segments = distribution.data.byCountry.map(country => ({
        segment: `location_${country.country.toLowerCase()}`,
        name: `Ülke: ${country.country}`,
        deviceCount: country.deviceCount,
        userCount: country.userCount,
        eventCount: country.eventCount,
        cities: Object.keys(country.cities).length
      }));

      return { success: true, data: segments };
    } catch (error) {
      console.error('❌ Location segmentation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Timezone bazlı analiz
   */
  async getTimezoneAnalysis(startDate, endDate) {
    try {
      const [timezoneData] = await this.pool.execute(
        `SELECT 
          HOUR(CONVERT_TZ(timestamp, '+00:00', timezone)) as hour,
          COUNT(*) as eventCount,
          COUNT(DISTINCT deviceId) as deviceCount
         FROM user_behavior_events
         WHERE timestamp >= ? AND timestamp <= ?
           AND timezone IS NOT NULL
         GROUP BY hour, timezone
         ORDER BY hour ASC`,
        [startDate, endDate]
      );

      return { success: true, data: timezoneData };
    } catch (error) {
      console.error('❌ Timezone analysis error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GeospatialAnalyticsService;

