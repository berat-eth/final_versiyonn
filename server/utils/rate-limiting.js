/**
 * Rate Limiting Utilities
 * Yüksek trafikli e-ticaret sitesi için optimize edilmiş rate limiting
 * Tüm limitler environment variable'lardan yapılandırılabilir
 */

const rateLimit = require('express-rate-limit');

/**
 * Private IP kontrolü
 */
const isPrivateIP = (ip) => {
  if (!ip) return false;
  return /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(ip);
};

/**
 * IP'yi güvenli şekilde al
 * Key generator'larda unknown yerine IP kullan
 */
const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         '0.0.0.0'; // unknown yerine default IP
};

/**
 * Kullanıcı ID'sini request'ten güvenli şekilde al
 * Authenticated kullanıcılar için userId, guest'ler için null döner
 */
const getUserIdFromRequest = (req) => {
  return req.authenticatedUserId || 
         req.user?.userId || 
         req.user?.id || 
         req.headers['x-user-id'] || 
         null;
};

/**
 * Wallet transfer endpoint için rate limiter
 * Finansal işlem - Finansal saldırılara karşı koruma
 */
const createWalletTransferLimiter = () => rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: parseInt(process.env.RATE_LIMIT_WALLET_TRANSFER || '20', 10), // 10'dan 20'ye çıkarıldı
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    // req.body middleware sırasında erişilemeyebilir, alternatif yöntemler kullan
    const userId = req.authenticatedUserId || req.user?.userId || req.headers['x-user-id'] || 'guest';
    return `${ip}:${userId}`;
  },
  message: 'Too many wallet transfer requests. Please try again later.',
  skip: (req) => isPrivateIP(req.ip)
});

/**
 * Payment processing endpoint için rate limiter
 * Ödeme işlemi - Ödeme saldırılarına karşı koruma
 */
const createPaymentLimiter = () => rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: parseInt(process.env.RATE_LIMIT_PAYMENT || '15', 10), // 5'ten 15'e çıkarıldı
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    // req.body middleware sırasında erişilemeyebilir
    const orderId = req.headers['x-order-id'] || req.authenticatedUserId || 'guest';
    return `${ip}:${orderId}`;
  },
  message: 'Too many payment requests. Please try again later.',
  skip: (req) => isPrivateIP(req.ip)
});

/**
 * Gift card endpoint için rate limiter
 * Finansal işlem
 */
const createGiftCardLimiter = () => rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: parseInt(process.env.RATE_LIMIT_GIFT_CARD || '20', 10), // 10'dan 20'ye çıkarıldı
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const userId = req.authenticatedUserId || req.user?.userId || req.headers['x-user-id'] || 'guest';
    return `${ip}:${userId}`;
  },
  message: 'Too many gift card requests. Please try again later.',
  skip: (req) => isPrivateIP(req.ip)
});

/**
 * Admin wallet transfer endpoint için rate limiter
 * Admin finansal işlem - Admin finansal saldırılarına karşı koruma
 */
const createAdminWalletTransferLimiter = () => rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: parseInt(process.env.RATE_LIMIT_ADMIN_WALLET || '10', 10), // 5'ten 10'a çıkarıldı
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const adminId = req.user?.id || req.headers['x-admin-id'] || 'guest';
    return `${ip}:${adminId}`;
  },
  message: 'Too many admin wallet transfer requests. Please try again later.',
  skip: (req) => isPrivateIP(req.ip)
});

/**
 * Şüpheli IP'ler için global rate limiter
 * OPTİMİZASYON: Yüksek trafik için limit artırıldı veya devre dışı bırakıldı
 * Diğer limiter'lar yeterli olduğu için bu limiter opsiyonel
 */
const createSuspiciousIPLimiter = () => {
  // Environment variable ile devre dışı bırakılabilir
  if (process.env.DISABLE_SUSPICIOUS_IP_LIMITER === 'true') {
    return (req, res, next) => next(); // Passthrough middleware
  }
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: parseInt(process.env.RATE_LIMIT_SUSPICIOUS_IP || '500', 10), // 50'den 500'e çıkarıldı
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return getClientIP(req);
    },
    skip: (req) => isPrivateIP(req.ip),
    message: 'Too many requests from this IP. Please try again later.'
  });
};

/**
 * Login endpoint için rate limiter
 * Brute-force saldırılarına karşı koruma
 */
const createLoginLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: parseInt(process.env.RATE_LIMIT_LOGIN || '10', 10), // 5'ten 10'a çıkarıldı (başarısız deneme)
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again after 15 minutes'
});

/**
 * Admin endpoint'leri için rate limiter
 * OPTİMİZASYON: Yüksek trafik için limit artırıldı
 */
const createAdminLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: parseInt(process.env.RATE_LIMIT_ADMIN || '500', 10), // 100'den 500'e çıkarıldı
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many admin requests, please try again later'
});

/**
 * Kritik endpoint'ler için rate limiter
 * OPTİMİZASYON: Yüksek trafik için limit artırıldı
 * Mobil uygulamalar için daha esnek
 * GEVŞETİLDİ: Mobil için 200 istek/dakika, web için 100 istek/dakika
 */
const createCriticalLimiter = () => rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: (req) => {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const clientType = (req.headers['x-client-type'] || '').toLowerCase();
    const isMobile = userAgent.includes('reactnative') || 
                     userAgent.includes('mobile') || 
                     userAgent.includes('huglu-mobile') ||
                     userAgent.includes('expo') ||
                     clientType === 'mobile';
    // Mobil için 200, web için 100
    return isMobile ? parseInt(process.env.RATE_LIMIT_CRITICAL_MOBILE || '200', 10) : 
                     parseInt(process.env.RATE_LIMIT_CRITICAL || '100', 10);
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const userId = getUserIdFromRequest(req);
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const clientType = (req.headers['x-client-type'] || '').toLowerCase();
    const isMobile = userAgent.includes('reactnative') || 
                     userAgent.includes('mobile') || 
                     userAgent.includes('huglu-mobile') ||
                     userAgent.includes('expo') ||
                     clientType === 'mobile';
    
    // Kullanıcı bazlı: authenticated ise userId, değilse IP
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    return isMobile ? `mobile:${identifier}` : `web:${identifier}`;
  },
  message: 'Rate limit exceeded for this endpoint'
});

/**
 * Mobil uygulama için özel rate limiter
 * Mobil uygulamalar için daha esnek limitler
 * GEVŞETİLDİ: 2000'den 10000'e çıkarıldı
 */
const createMobileAPILimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: parseInt(process.env.MOBILE_RATE_LIMIT || '10000', 10), // Mobil için 10000 istek/15 dakika (gevşetildi)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const userId = getUserIdFromRequest(req);
    
    // User-Agent veya X-Client-Type header'ına göre mobil tespiti
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const clientType = (req.headers['x-client-type'] || '').toLowerCase();
    const isMobile = userAgent.includes('reactnative') || 
                     userAgent.includes('mobile') || 
                     userAgent.includes('huglu-mobile') ||
                     userAgent.includes('expo') ||
                     clientType === 'mobile';
    
    // Kullanıcı bazlı: authenticated ise userId, değilse IP
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    return isMobile ? `mobile:${identifier}` : `web:${identifier}`;
  },
  message: 'Too many requests from mobile app, please try again later',
  skip: (req) => isPrivateIP(req.ip)
});

/**
 * Genel API endpoint'leri için rate limiter
 * OPTİMİZASYON: Yüksek trafik için limit artırıldı
 * KULLANICI BAZLI: Her kullanıcı kendi rate limit'ini kullanır
 */
const createGeneralAPILimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: parseInt(process.env.API_RATE_LIMIT || '1500', 10), // 1000'den 1500'e çıkarıldı
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const userId = getUserIdFromRequest(req);
    // Kullanıcı bazlı: authenticated ise userId, değilse IP
    return userId ? `user:${userId}` : `ip:${ip}`;
  },
  message: 'Too many requests from this IP, please try again later'
});

module.exports = {
  createWalletTransferLimiter,
  createPaymentLimiter,
  createGiftCardLimiter,
  createAdminWalletTransferLimiter,
  createSuspiciousIPLimiter,
  createLoginLimiter,
  createAdminLimiter,
  createCriticalLimiter,
  createGeneralAPILimiter,
  createMobileAPILimiter,
  isPrivateIP,
  getClientIP
};

