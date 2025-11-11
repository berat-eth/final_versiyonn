/**
 * Rate Limiting Utilities
 * Kritik endpoint'ler için özel rate limiting konfigürasyonları
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
 * SQL Query endpoint için rate limiter
 * Çok kritik endpoint - SQL injection saldırılarına karşı koruma
 */
const createSQLQueryLimiter = () => rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 5, // Çok düşük limit
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const adminId = req.user?.id || req.headers['x-admin-id'] || 'unknown';
    return `${req.ip}:${adminId}`;
  },
  message: 'Too many SQL queries. Please try again later.',
  skip: (req) => isPrivateIP(req.ip)
});

/**
 * Wallet transfer endpoint için rate limiter
 * Finansal işlem - Finansal saldırılara karşı koruma
 */
const createWalletTransferLimiter = () => rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 10, // Düşük limit
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.body?.fromUserId || req.authenticatedUserId || 'unknown';
    return `${req.ip}:${userId}`;
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
  max: 5, // Çok düşük limit
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const orderId = req.body?.orderId || 'unknown';
    return `${req.ip}:${orderId}`;
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
  max: 10, // Düşük limit
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.body?.fromUserId || req.authenticatedUserId || 'unknown';
    return `${req.ip}:${userId}`;
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
  max: 5, // Çok düşük limit
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const adminId = req.user?.id || req.headers['x-admin-id'] || 'unknown';
    return `${req.ip}:${adminId}`;
  },
  message: 'Too many admin wallet transfer requests. Please try again later.',
  skip: (req) => isPrivateIP(req.ip)
});

/**
 * Şüpheli IP'ler için global rate limiter
 * IP bazlı rate limiting güçlendirme
 */
const createSuspiciousIPLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 50, // Şüpheli IP'ler için çok düşük limit
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },
  skip: (req) => isPrivateIP(req.ip),
  message: 'Too many requests from this IP. Please try again later.'
});

/**
 * Login endpoint için rate limiter
 * Brute-force saldırılarına karşı koruma
 */
const createLoginLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 5 başarısız deneme
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again after 15 minutes'
});

/**
 * Admin endpoint'leri için rate limiter
 */
const createAdminLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // Admin endpoint'leri için daha yüksek limit
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many admin requests, please try again later'
});

/**
 * Kritik endpoint'ler için rate limiter
 */
const createCriticalLimiter = () => rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 10, // Kritik endpoint'ler için düşük limit
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Rate limit exceeded for this endpoint'
});

module.exports = {
  createSQLQueryLimiter,
  createWalletTransferLimiter,
  createPaymentLimiter,
  createGiftCardLimiter,
  createAdminWalletTransferLimiter,
  createSuspiciousIPLimiter,
  createLoginLimiter,
  createAdminLimiter,
  createCriticalLimiter,
  isPrivateIP
};

