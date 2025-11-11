const express = require('express');
// Load environment variables from envai file
try {
  require('dotenv').config({ path: '../.env' });
  console.log('✅ Environment variables loaded from envai file');
} catch (error) {
  console.warn('⚠️ Could not load envai file, using defaults:', error.message);
}
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const XmlSyncService = require('./services/xml-sync-service');
const IyzicoService = require('./services/iyzico-service');
const { createDatabaseSchema } = require('./database-schema');
const userDataRoutes = require('./routes/user-data');
const userSpecificDataRoutes = require('./routes/user-specific-data');
const chatSessionsRoutes = require('./routes/chat-sessions');
const segmentsRoutes = require('./routes/segments');
const { RecommendationService } = require('./services/recommendation-service');
const { authenticateTenant } = require('./middleware/auth');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { OAuth2Client } = require('google-auth-library');
const compression = require('compression');

// Security modules
const DatabaseSecurity = require('./security/database-security');
const InputValidation = require('./security/input-validation');
const AdvancedSecurity = require('./security/advanced-security');
const csrfProtection = require('./security/csrf-protection');
const { requireUserOwnership, validateUserIdMatch, enforceTenantIsolation } = require('./middleware/authorization');
const { createSafeErrorResponse, logError, handleDatabaseError } = require('./utils/error-handler');
const { isPathInside, createSafePath, sanitizeFileName } = require('./utils/path-security');
const { xssProtectionMiddleware } = require('./middleware/xss-protection');

// Ollama integration
const axios = require('axios');

// Security utilities
const SALT_ROUNDS = 12;

// Password hashing
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
}

// Password verification
async function verifyPassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('❌ Error verifying password:', error);
    return false;
  }
}


// Generate secure API key
function generateSecureApiKey() {
  return 'huglu_' + crypto.randomBytes(32).toString('hex');
}
// In-memory FTP backup settings (persist simple in DB if needed later)
let __ftpBackupConfig = { enabled: false, host: '', port: 21, user: '', password: '', remoteDir: '/', schedule: '0 3 * * *' };

// Helper: run full backup and upload to FTP
async function runFtpBackupNow() {
  try {
    // 1) Build backup JSON via internal call
    const [tenantRows] = await poolWrapper.execute('SELECT id FROM tenants WHERE isActive = true ORDER BY id ASC LIMIT 1');
    if (tenantRows.length === 0) throw new Error('Aktif tenant yok');
    const tenantId = tenantRows[0].id;

    const tables = [
      'tenants', 'users', 'categories', 'products', 'product_variations', 'product_variation_options', 'orders', 'order_items', 'cart', 'user_wallets', 'wallet_transactions', 'wallet_recharge_requests', 'custom_production_requests', 'custom_production_items', 'reviews', 'security_events', 'chatbot_analytics', 'referral_earnings', 'recommendations', 'customer_segments', 'customer_segment_assignments', 'campaigns', 'campaign_usage', 'customer_analytics', 'discount_wheel_spins'
    ];
    const data = {};
    // SQL Injection koruması: Table name whitelist kontrolü
    for (const t of tables) {
      try {
        let rows;
        if (t === 'tenants') {
          [rows] = await poolWrapper.execute('SELECT * FROM tenants WHERE id = ?', [tenantId]);
        } else {
          // GÜVENLİK: Güvenli table identifier kullan - Güçlendirilmiş whitelist kontrolü ile
          try {
            // 1. Table name validasyonu (whitelist, format, SQL keyword kontrolü)
            const safeTableName = DatabaseSecurity.safeTableIdentifier(t);
            
            // 2. SQL query validation (ekstra güvenlik katmanı)
            const sqlQuery = `SELECT * FROM ${safeTableName} WHERE tenantId = ?`;
            DatabaseSecurity.validateQuery(sqlQuery, [tenantId]);
            
            // 3. Prepared statement kullan - Template literal sadece whitelist'teki table name için
            // MySQL'de table name'ler için prepared statement kullanılamaz, bu yüzden whitelist kontrolü kritik
            [rows] = await poolWrapper.execute(sqlQuery, [tenantId]);
          } catch (tableError) {
            // Table whitelist'te değilse, format geçersizse veya hata varsa boş array döndür
            console.warn(`⚠️ Table "${t}" validation failed:`, tableError.message);
            [rows] = [];
          }
        }
        data[t] = rows;
      } catch { data[t] = []; }
    }
    const payload = JSON.stringify({ success: true, tenantId, exportedAt: new Date().toISOString(), data });

    // 2) Save temp file
    const tmpDir = path.join(__dirname, '..', 'tmp');
    try { if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true }); } catch { }
    const fileName = `huglu-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    const filePath = path.join(tmpDir, fileName);
    fs.writeFileSync(filePath, payload);

    // 3) Upload via FTP
    const client = new ftp.Client(15000);
    client.ftp.verbose = false;
    try {
      await client.access({
        host: __ftpBackupConfig.host,
        port: __ftpBackupConfig.port || 21,
        user: __ftpBackupConfig.user,
        password: __ftpBackupConfig.password,
        secure: false
      });
      if (__ftpBackupConfig.remoteDir && __ftpBackupConfig.remoteDir !== '/') {
        try { await client.ensureDir(__ftpBackupConfig.remoteDir); } catch { }
        await client.cd(__ftpBackupConfig.remoteDir);
      }
      await client.uploadFrom(filePath, fileName);
    } finally {
      client.close();
      try { fs.unlinkSync(filePath); } catch { }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// Admin FTP backup config routes are registered AFTER app initialization (see below)

// HTML entity decoder utility
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return text;

  const htmlEntities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&hellip;': '...',
    '&mdash;': '—',
    '&ndash;': '–',
    '&bull;': '•',
    '&middot;': '·',
    '&laquo;': '«',
    '&raquo;': '»',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&deg;': '°',
    '&plusmn;': '±',
    '&times;': '×',
    '&divide;': '÷',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢'
  };

  let decodedText = text;

  // Replace HTML entities
  Object.keys(htmlEntities).forEach(entity => {
    const regex = new RegExp(entity, 'g');
    decodedText = decodedText.replace(regex, htmlEntities[entity]);
  });

  // Replace numeric HTML entities (&#123; format)
  decodedText = decodedText.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(dec);
  });

  // Replace hex HTML entities (&#x1A; format)
  decodedText = decodedText.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Clean up extra whitespace
  decodedText = decodedText.replace(/\s+/g, ' ').trim();

  return decodedText;
}

// Clean product data function
function cleanProductData(product) {
  if (!product) return product;

  const cleaned = { ...product };

  // Clean text fields that might contain HTML entities
  if (cleaned.name) cleaned.name = decodeHtmlEntities(cleaned.name);
  if (cleaned.description) cleaned.description = decodeHtmlEntities(cleaned.description);
  if (cleaned.category) cleaned.category = decodeHtmlEntities(cleaned.category);
  if (cleaned.brand) cleaned.brand = decodeHtmlEntities(cleaned.brand);

  return cleaned;
}

const os = require('os');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Network detection helper
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const networkInterface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
        return networkInterface.address;
      }
    }
  }
  return 'localhost';
}

// Middleware - Güvenlik başlıkları
// CSP güçlendirildi - unsafe-inline ve unsafe-eval kaldırıldı
const cspDirectives = {
  defaultSrc: ["'self'"],
  // unsafe-inline kaldırıldı - XSS koruması için
  // Style'lar için nonce veya hash kullanılmalı
  styleSrc: ["'self'", "https://fonts.googleapis.com"],
  // unsafe-inline ve unsafe-eval kaldırıldı
  // Script'ler için nonce veya hash kullanılmalı
  scriptSrc: ["'self'"],
  imgSrc: ["'self'", "https:", "data:"],
  connectSrc: ["'self'", "https://api.plaxsy.com", "https://admin.plaxsy.com", "https://plaxsy.com", "https://www.plaxsy.com", "https://api.zerodaysoftware.tr"],
  fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'self'"],
  // XSS koruması için
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"]
}

// Report violations (sadece URL varsa ekle)
if (process.env.CSP_REPORT_URI) {
  cspDirectives.reportUri = process.env.CSP_REPORT_URI
}

// GÜVENLİK: CSP Nonce middleware - unsafe-inline ve unsafe-eval kaldırıldı
const { cspNonceMiddleware } = require('./utils/csp-nonce');

// Development için CSP direktifleri - GÜVENLİK: unsafe-inline ve unsafe-eval kaldırıldı
// Nonce kullanarak inline script/style'lar güvenli hale getirildi
const devCspDirectives = process.env.NODE_ENV === 'development' ? {
  defaultSrc: ["'self'"],
  // GÜVENLİK: unsafe-inline kaldırıldı, nonce kullanılacak
  styleSrc: ["'self'", "https://fonts.googleapis.com"],
  // GÜVENLİK: unsafe-inline ve unsafe-eval kaldırıldı, nonce kullanılacak
  scriptSrc: ["'self'"],
  imgSrc: ["'self'", "https:", "data:"],
  connectSrc: ["'self'", "https:", "http://localhost:*", "ws://localhost:*"],
  fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'self'", "https://www.dhlecommerce.com.tr"]
} : null

// Development modunda devCspDirectives kullan, değilse cspDirectives kullan
const finalCspDirectives = devCspDirectives || cspDirectives

// GÜVENLİK: Helmet CSP'yi devre dışı bırak, nonce middleware kullanacağız
app.use(helmet({
  contentSecurityPolicy: false, // Nonce middleware ile dinamik CSP kullanacağız
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// GÜVENLİK: CSP Nonce middleware - Her request için nonce oluşturur ve CSP header'ına ekler
// unsafe-inline ve unsafe-eval kaldırıldı, nonce kullanılıyor
app.use(cspNonceMiddleware);

app.use(hpp());
// Enable gzip compression for API responses - optimized for product lists
// ✅ FIX: Brotli devre dışı - React Native Brotli desteklemiyor, sadece gzip/deflate kullan
app.use(compression({
  threshold: 1024, // Threshold artırıldı - küçük response'lar sıkıştırılmayacak (tek ürün detayı gibi)
  level: 6, // Compression level (1-9, 6 = good balance between speed and size)
  // Brotli'yi devre dışı bırak - sadece gzip/deflate kullan
  filter: (req, res) => {
    if (req.headers['x-no-compress']) return false;
    
    // ✅ FIX: Accept-Encoding header'ından br (Brotli) kaldır - React Native uyumluluğu için
    if (req.headers['accept-encoding']) {
      req.headers['accept-encoding'] = req.headers['accept-encoding'].replace(/br,?/gi, '').replace(/,\s*,/g, ',').trim();
    }
    
    // Tek ürün detay endpoint'i için compression'ı devre dışı bırak
    // Çünkü küçük response'lar için compression gereksiz ve sorun yaratabilir
    if (req.path && /^\/api\/products\/\d+$/.test(req.path)) {
      return false; // Tek ürün detayı için compression yok
    }
    
    // Products list endpoint için compression aktif
    if (req.path && req.path.includes('/api/products') && !req.path.match(/\/api\/products\/\d+/)) {
      return true; // Ürün listesi için sıkıştır
    }
    
    return compression.filter(req, res);
  }
}));

// GÜVENLİK: CORS - CSRF ve yetkisiz erişim koruması ile güvenli hale getirildi
// Development ve Production için whitelist tabanlı CORS
app.use(cors({
  origin: function (origin, callback) {
    // İzin verilen origin'ler - Production ve Development için
    const productionOrigins = [
      'https://admin.plaxsy.com',
      'https://www.plaxsy.com',
      'https://plaxsy.com',
      'https://api.plaxsy.com',
      'https://api.zerodaysoftware.tr',
      'https://huglutekstil.com',
      'https://www.huglutekstil.com'
    ];
    
    // Development için ek origin'ler
    const developmentOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3006',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3006',
      ...productionOrigins // Production origin'leri development'ta da kullanılabilir
    ];
    
    // Ortama göre whitelist seç
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? productionOrigins 
      : developmentOrigins;
    
    // Origin yoksa (mobil uygulama veya same-origin request için)
    if (!origin) {
      // Same-origin request'ler için izin ver (mobil uygulama API key ile korunuyor)
      // Ancak production'da daha sıkı kontrol
      if (process.env.NODE_ENV === 'production') {
        // Production'da origin yoksa sadece API key ile korunan endpoint'ler için izin ver
        // Bu durumda mobil uygulama gibi durumlar için API key zorunlu
        return callback(null, true);
      } else {
        // Development'ta localhost için izin ver
        return callback(null, true);
      }
    }
    
    // Origin izin verilen listede mi kontrol et
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // GÜVENLİK: Whitelist'te olmayan origin'leri reddet
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error(`Not allowed by CORS. Origin "${origin}" is not in whitelist.`));
    }
  },
  credentials: true, // GÜVENLİK: credentials: true ile wildcard origin kullanılmıyor
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Admin-Key', 'X-Tenant-Id', 'x-tenant-id', 'X-CSRF-Token', 'csrf-token', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-CSRF-Token'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 saat preflight cache
}));

app.use(express.json());

// XSS Protection Middleware - Response'larda otomatik sanitization
app.use(xssProtectionMiddleware);

// ========== Google Auth (ID token doğrulama) ==========
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

app.post('/api/auth/google/verify', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken gerekli' });
    }
    if (!googleClient) {
      return res.status(500).json({ success: false, message: 'Google Client ID yapılandırılmadı' });
    }

    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload?.email;
    const emailVerified = payload?.email_verified;
    const name = payload?.name || 'Google User';

    if (!email || !emailVerified) {
      return res.status(401).json({ success: false, message: 'Google hesabı doğrulanamadı' });
    }

    // Aktif tenant'ı bul
    const [tenants] = await poolWrapper.execute('SELECT id FROM tenants WHERE isActive = true ORDER BY id ASC LIMIT 1');
    if (tenants.length === 0) {
      return res.status(500).json({ success: false, message: 'Aktif tenant bulunamadı' });
    }
    const tenantId = tenants[0].id;

    // Kullanıcıyı getir/oluştur
    const [rows] = await poolWrapper.execute('SELECT id, user_id, role FROM users WHERE email = ? AND tenantId = ? LIMIT 1', [email, tenantId]);
    let userIdNumeric;
    let role = 'user';
    if (rows.length === 0) {
      const userIdShort = (Math.floor(10000000 + Math.random() * 90000000)).toString();
      const [ins] = await poolWrapper.execute(
        'INSERT INTO users (user_id, tenantId, name, email, password, role, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, true, NOW())',
        [userIdShort, tenantId, name, email, '', role]
      );
      userIdNumeric = ins.insertId;
    } else {
      userIdNumeric = rows[0].id;
      role = rows[0].role || 'user';
    }

    // JWT üret
    const JWTAuth = require('./security/jwt-auth');
    const jwtAuth = new JWTAuth();
    const tokens = jwtAuth.generateTokenPair({ userId: userIdNumeric, tenantId, role });

    res.json({ success: true, data: { userId: userIdNumeric, tenantId, role, tokens } });
  } catch (e) {
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(e, 'GOOGLE_VERIFY');
    const errorResponse = createSafeErrorResponse(e, 'Google authentication failed');
    res.status(401).json(errorResponse);
  }
});

// GÜVENLİK: JWT Token Refresh Endpoint - Token rotation ile güçlendirilmiş
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const JWTAuth = require('./security/jwt-auth');
    const jwtAuth = new JWTAuth();
    await jwtAuth.handleTokenRefresh(req, res);
  } catch (error) {
    logError(error, 'TOKEN_REFRESH_ENDPOINT');
    const errorResponse = createSafeErrorResponse(error, 'Token refresh failed');
    res.status(500).json(errorResponse);
  }
});

// GÜVENLİK: JWT Logout Endpoint - Token'ı blacklist'e ekler
app.post('/api/auth/logout', async (req, res) => {
  try {
    const JWTAuth = require('./security/jwt-auth');
    const jwtAuth = new JWTAuth();
    
    // Token'ı request'ten al
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      req.token = authHeader.substring('Bearer '.length);
      // Token'dan user bilgisini çıkar
      try {
        const decoded = jwtAuth.decodeToken(req.token);
        if (decoded) {
          req.user = { userId: decoded.userId };
        }
      } catch (_) {}
    }
    
    await jwtAuth.handleLogout(req, res);
  } catch (error) {
    logError(error, 'LOGOUT_ENDPOINT');
    const errorResponse = createSafeErrorResponse(error, 'Logout failed');
    res.status(500).json(errorResponse);
  }
});

// Serve Admin Panel statically at /admin
try {
  const adminPanelPath = path.join(__dirname, '../admin-panel');
  app.use('/admin', require('express').static(adminPanelPath));
  // Also serve shared assets for admin panel
  const assetsPath = path.join(__dirname, '../assets');
  app.use('/admin/assets', require('express').static(assetsPath));
  console.log('✅ Admin panel static hosting enabled at /admin');
} catch (e) {
  console.warn('⚠️ Could not enable admin panel static hosting:', e.message);
}

// Helper: resolve numeric internal user id from external/userId string
async function resolveInternalUserId(externalUserId, tenantId) {
  try {
    if (externalUserId == null) return null;
    const raw = String(externalUserId);
    if (/^\d+$/.test(raw)) {
      // Could already be internal numeric id; verify existence
      const [rows] = await poolWrapper.execute('SELECT id FROM users WHERE id = ? AND tenantId = ? LIMIT 1', [parseInt(raw, 10), tenantId]);
      if (rows.length) return parseInt(raw, 10);
    }
    // Try by external short user_id
    const [found] = await poolWrapper.execute('SELECT id FROM users WHERE user_id = ? AND tenantId = ? LIMIT 1', [raw, tenantId]);
    return found.length ? found[0].id : null;
  } catch (e) {
    console.error('resolveInternalUserId error:', e);
    return null;
  }
}


if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.body) {
      console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
      console.log('📤 Request Body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });
}

// OPTİMİZASYON: Rate limiting - Yüksek trafik için optimize edilmiş
// Limitler environment variable'lardan yapılandırılabilir
const {
  createGeneralAPILimiter,
  createLoginLimiter,
  createAdminLimiter,
  createCriticalLimiter,
  createSQLQueryLimiter,
  createWalletTransferLimiter,
  createPaymentLimiter,
  createGiftCardLimiter,
  createAdminWalletTransferLimiter,
  createSuspiciousIPLimiter,
  getClientIP
} = require('./utils/rate-limiting');

// Genel API limiter - Yüksek trafik için 1000+ istek/15 dakika
const authLimiter = createGeneralAPILimiter();

// Login limiter - Environment variable'dan yapılandırılabilir
const loginLimiter = createLoginLimiter();

// Admin limiter - Yüksek trafik için 500+ istek/15 dakika
const adminLimiter = createAdminLimiter();

// Critical limiter - Yüksek trafik için 30+ istek/dakika
const criticalLimiter = createCriticalLimiter();

// OPTİMİZASYON: Kritik endpoint'ler için özel rate limiting - Utility'den al
// Key generator'lar iyileştirildi (unknown yerine IP bazlı fallback)
const sqlQueryLimiter = createSQLQueryLimiter();
const walletTransferLimiter = createWalletTransferLimiter();
const paymentLimiter = createPaymentLimiter();
const giftCardLimiter = createGiftCardLimiter();
const adminWalletTransferLimiter = createAdminWalletTransferLimiter();

// OPTİMİZASYON: Suspicious IP limiter - Yüksek trafik için limit artırıldı veya devre dışı
// Environment variable ile kontrol edilebilir (DISABLE_SUSPICIOUS_IP_LIMITER=true)
const suspiciousIPLimiter = createSuspiciousIPLimiter();

// OPTİMİZASYON: Rate limiting uygulama - Sıralama düzenlendi
// Spesifik limiter'lar önce, global limiter'lar son (çakışma önleme)

// 1. En spesifik endpoint'ler önce (login, kritik endpoint'ler)
app.use('/api/users/login', loginLimiter);
app.use('/api/admin/login', loginLimiter);

// 2. Kritik endpoint'ler (finansal, SQL query)
app.use('/api/admin/sql/query', sqlQueryLimiter);
app.use('/api/wallet/transfer', walletTransferLimiter);
app.use('/api/wallet/gift-card', giftCardLimiter);
app.use('/api/payments/process', paymentLimiter);
app.use('/api/admin/wallets/transfer', adminWalletTransferLimiter);

// 3. Kategori bazlı endpoint'ler (admin, orders, critical)
app.use('/api/orders', criticalLimiter);
// NOT: /api/admin için adminLimiter uygulanıyor ama /api/admin/sql/query önce geldiği için çakışma yok

// 4. Genel endpoint'ler (users, products)
// NOT: /api/cart için relaxedCartLimiter daha sonra uygulanıyor (satır 12089), burada authLimiter kaldırıldı
app.use('/api/users', authLimiter);
app.use('/api/products', authLimiter);

// 5. Admin endpoint'leri (spesifik olanlar zaten uygulandı)
app.use('/api/admin', adminLimiter);

// 6. Global limiter (en son, opsiyonel - environment variable ile kontrol edilebilir)
// NOT: Suspicious IP limiter artık 500+ istek/15 dakika veya devre dışı
// Diğer limiter'lar yeterli olduğu için genelde devre dışı bırakılabilir
if (process.env.DISABLE_SUSPICIOUS_IP_LIMITER !== 'true') {
  app.use('/api', suspiciousIPLimiter);
}

// SQL Query Logger Middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    if (req.method !== 'GET') {
      console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
      if (req.body && Object.keys(req.body).length > 0) {
        console.log('📤 Request Body:', JSON.stringify(req.body, null, 2));
      }
    }
    originalSend.call(this, data);
  };
  next();
});

// Initialize security modules
const dbSecurity = new DatabaseSecurity();
const inputValidator = new InputValidation();
const advancedSecurity = new AdvancedSecurity();

// Basic request size limiting
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// XML gövdeleri için text parser (text/xml, application/xml)
app.use(express.text({ type: ['text/xml', 'application/xml'], limit: '20mb' }));

// Dosya yükleme için uploads klasörünü oluştur
const uploadsDir = path.join(__dirname, 'uploads', 'reviews');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created:', uploadsDir);
}

// Invoices PDF yükleme için uploads klasörünü oluştur
const invoicesDir = path.join(__dirname, 'uploads', 'invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
  console.log('✅ Invoices uploads directory created:', invoicesDir);
}

// GÜVENLİK: File upload security utilities
// Not: sanitizeFileName zaten path-security.js'den import edilmiş (satır 39)
const { validateFileUpload } = require('./utils/file-security');

// Multer yapılandırması - Güvenli dosya yükleme
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // GÜVENLİK: Dosya adını sanitize et
    const sanitized = sanitizeFileName(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitized);
    const baseName = path.basename(sanitized, ext);
    // Güvenli dosya adı oluştur
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // GÜVENLİK: Görsel ve video formatları - Sınırlı whitelist
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo'
  ];
  
  // MIME type kontrolü
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Geçersiz dosya formatı. Sadece görsel (JPEG, PNG, WebP) ve video (MP4, MOV, AVI) yüklenebilir.'));
  }
  
  // Dosya uzantısı kontrolü
  const ext = file.originalname.toLowerCase().split('.').pop();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'avi'];
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Geçersiz dosya uzantısı. Sadece görsel (JPEG, PNG, WebP) ve video (MP4, MOV, AVI) yüklenebilir.'));
  }
  
  // MIME type ve uzantı uyumu kontrolü
  const mimeFromExt = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo'
  };
  
  if (mimeFromExt[ext] && mimeFromExt[ext] !== file.mimetype) {
    return cb(new Error('Dosya uzantısı ve MIME type uyuşmuyor.'));
  }
  
  cb(null, true);
};

// GÜVENLİK: Dosya boyutu limiti 50MB'dan 10MB'a düşürüldü
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maksimum (50MB'dan düşürüldü)
    files: 5 // Maksimum 5 dosya
  },
  fileFilter: fileFilter
});

// PDF yükleme için multer yapılandırması
const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, invoicesDir);
  },
  filename: (req, file, cb) => {
    const sanitized = sanitizeFileName(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitized);
    const baseName = path.basename(sanitized, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const invoiceFileFilter = (req, file, cb) => {
  // Sadece PDF dosyalarına izin ver
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Sadece PDF dosyaları yüklenebilir'), false);
  }
};

const invoiceUpload = multer({
  storage: invoiceStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maksimum
    files: 1 // Tek dosya
  },
  fileFilter: invoiceFileFilter
});

// Statik dosya servisi (yüklenen dosyaları erişilebilir yap)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ OPTIMIZASYON: Tenant cache middleware with enhanced Redis helpers
const tenantCache = require('./middleware/tenantCache');
const { getJson, setJsonEx, delKey, withLock, sha256, getOrSet, CACHE_TTL } = require('./redis');

// Relaxed rate limiter for cart endpoints (reduce 429 while Redis cache active)
const isPrivateIp = (ip) => /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(ip || '');
const relaxedCartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.headers['x-api-key'] || 'no-key'}:${req.ip}`,
  skip: (req) => isPrivateIp(req.ip) || req.headers['x-internal-proxy'] === '1'
});
app.use('/api', tenantCache);

// Advanced Security Middleware - Saldırı tespiti ve IP reputation kontrolü
app.use('/api', advancedSecurity.createSecurityMiddleware());

// CSRF Protection - State-changing operations için
app.use('/api', csrfProtection.createCSRFMiddleware({
  skipMethods: ['GET', 'HEAD', 'OPTIONS'],
  skipPaths: [
    '/api/health',
    '/api/admin/login',
    '/api/users/login',
    '/api/users', // Registration
    '/api/auth/google/verify'
  ],
  requireToken: process.env.NODE_ENV === 'production' // Production'da zorunlu
}));

// Tenant Isolation - Tüm API istekleri için
app.use('/api', enforceTenantIsolation());

// Global API Key Authentication for all API routes (except health and admin login)
app.use('/api', (req, res, next) => {
  // req.path burada '/api' mount edildiği için relatif: '/health', '/admin/...'
  const path = req.path || '';

  // Skip API key check for specific endpoints
  const skipApiKeyPaths = [
    '/health',
    '/admin/login',
    '/tenants', // Tenant creation doesn't require API key
    '/users', // User registration doesn't require API key
    '/users/login', // User login doesn't require API key
    '/api/users/login', // User login doesn't require API key
    '/auth/google/verify', // Google OAuth doesn't require API key
    '/invoices/share' // Public invoice share endpoints (token-based access)
  ];

  // Check if path matches any skip pattern (exact match or starts with)
  const shouldSkip = skipApiKeyPaths.some(skipPath => 
    path === skipPath || path.startsWith(skipPath + '/')
  );
  
  if (shouldSkip) {
    return next();
  }

  // Tüm /api (admin dahil) istekleri için: yalnız X-API-Key zorunlu
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    // CORS header'larını set et
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // GÜVENLİK: Saldırganları yanıltmak için genel hata mesajı
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }

  // X-API-Key doğrulaması (tenant tablosu) - Redis ile önbellek kullan, tenantCache doldurmuşsa DB atla
  if ((req && req.tenant && req.tenant.id) || (res.locals && res.locals.tenant && res.locals.tenant.id)) {
    if (!req.tenant && res.locals && res.locals.tenant) req.tenant = res.locals.tenant;
    return next();
  }
  // Redis'te tenant cache kontrolü
  (async () => {
    try {
      const cacheKey = `tenant:apikey:${sha256(String(apiKey))}`;
      const cached = await getJson(cacheKey);
      if (cached && cached.id) {
        // GÜVENLİK: Cache'den gelen tenant'ın API key'ini doğrula
        // Eski cache'lerde geçersiz key'ler için default tenant olabilir
        const [verifyRows] = await poolWrapper.execute(
          'SELECT id FROM tenants WHERE apiKey = ? AND id = ? AND isActive = true',
          [apiKey, cached.id]
        );
        if (verifyRows.length === 0) {
          // Cache'deki tenant bu API key'e ait değil, cache'i sil ve DB'den kontrol et
          try { await delKey(cacheKey); } catch (_) { }
          // Cache'i atla, DB kontrolüne devam et
        } else {
          // Cache geçerli, kullan
          req.tenant = cached;
          if (cached.settings && typeof cached.settings === 'string') {
            try { req.tenant.settings = JSON.parse(cached.settings); } catch (_) { }
          }
          return next();
        }
      }

      const lockKey = `${cacheKey}:lock`;
      let resolved = false;
      await withLock(lockKey, 5, async () => {
        const again = await getJson(cacheKey);
        if (again && again.id) {
          // GÜVENLİK: Cache'den gelen tenant'ın API key'ini doğrula
          const [verifyRows] = await poolWrapper.execute(
            'SELECT id FROM tenants WHERE apiKey = ? AND id = ? AND isActive = true',
            [apiKey, again.id]
          );
          if (verifyRows.length === 0) {
            // Cache geçersiz, sil ve DB kontrolüne devam et
            try { await delKey(cacheKey); } catch (_) { }
            return;
          }
          req.tenant = again;
          if (again.settings && typeof again.settings === 'string') {
            try { req.tenant.settings = JSON.parse(again.settings); } catch (_) { }
          }
          resolved = true;
          return;
        }
        const [rows] = await poolWrapper.execute(
          'SELECT id, name, domain, subdomain, settings, isActive FROM tenants WHERE apiKey = ? AND isActive = true',
          [apiKey]
        );
        if (!rows || rows.length === 0) {
          // GÜVENLİK: API key bulunamazsa direkt 401 döndür - default tenant fallback kaldırıldı
          const maskedKey = apiKey ? `${apiKey.substring(0, 4)}***${apiKey.substring(apiKey.length - 4)}` : 'N/A';
          if (process.env.NODE_ENV !== 'production') {
            console.log(`⚠️ Invalid API key attempt: ${maskedKey}`);
          }
          // CORS header'larını set et
          const origin = req.headers.origin;
          if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
          }
          // GÜVENLİK: Saldırganları yanıltmak için genel hata mesajı
          return res.status(401).json({ success: false, message: 'Authentication failed' });
        }
        const t = rows[0];
        if (t && t.settings) { try { t.settings = JSON.parse(t.settings); } catch (_) { } }
        req.tenant = t;
        await setJsonEx(cacheKey, 300, t);
        resolved = true;
      });

      if (resolved) return next();

      // Lock alınamadıysa/başkası çözemediyse DB'ye düş
      const [rows] = await poolWrapper.execute(
        'SELECT id, name, domain, subdomain, settings, isActive FROM tenants WHERE apiKey = ? AND isActive = true',
        [apiKey]
      );
      if (rows.length === 0) {
        // GÜVENLİK: API key bulunamazsa direkt 401 döndür - default tenant fallback kaldırıldı
        const maskedKey = apiKey ? `${apiKey.substring(0, 4)}***${apiKey.substring(apiKey.length - 4)}` : 'N/A';
        if (process.env.NODE_ENV !== 'production') {
          console.log(`⚠️ Invalid API key attempt (fallback): ${maskedKey}`);
        }
        // CORS header'larını set et
        const origin = req.headers.origin;
        if (origin) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        // GÜVENLİK: Saldırganları yanıltmak için genel hata mesajı
        return res.status(401).json({ success: false, message: 'Authentication failed' });
      }
      req.tenant = rows[0];
      if (req.tenant.settings) {
        try { req.tenant.settings = JSON.parse(req.tenant.settings); } catch (_) { }
      }
      try { await setJsonEx(cacheKey, 300, req.tenant); } catch (_) { }
      return next();
    } catch (error) {
      // Hata durumunda mevcut akışa geri dön: DB sorgusu
      poolWrapper.execute(
        'SELECT id, name, domain, subdomain, settings, isActive FROM tenants WHERE apiKey = ? AND isActive = true',
        [apiKey]
      ).then(([rows]) => {
        if (rows.length === 0) {
          // GÜVENLİK: API key bulunamazsa direkt 401 döndür - default tenant fallback kaldırıldı
          const maskedKey = apiKey ? `${apiKey.substring(0, 4)}***${apiKey.substring(apiKey.length - 4)}` : 'N/A';
          if (process.env.NODE_ENV !== 'production') {
            console.log(`⚠️ Invalid API key attempt (error handler): ${maskedKey}`);
          }
          // CORS header'larını set et
          const origin = req.headers.origin;
          if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
          }
          // GÜVENLİK: Saldırganları yanıltmak için genel hata mesajı
          return res.status(401).json({ success: false, message: 'Authentication failed' });
        }
        req.tenant = rows[0];
        if (req.tenant.settings) {
          try { req.tenant.settings = JSON.parse(req.tenant.settings); } catch (_) { }
        }
        next();
      }).catch(err => {
        // GÜVENLİK: Log mesajı - saldırganları yanıltmak için detay gizlendi
        console.error('❌ Authentication error:', err);
        // CORS header'larını set et
        const origin = req.headers.origin;
        if (origin) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        // GÜVENLİK: Saldırganları yanıltmak için genel hata mesajı
        res.status(500).json({ success: false, message: 'Service temporarily unavailable' });
      });
    }
  })();
});

// Global SQL Injection Guard for all API routes
app.use('/api', (req, res, next) => {
  try {
    // Reject overly long string inputs (basic hardening)
    const MAX_LEN = 500;
    const rejectLongStrings = (obj) => {
      const stack = [obj];
      while (stack.length) {
        const cur = stack.pop();
        if (cur == null) continue;
        if (typeof cur === 'string') {
          if (cur.length > MAX_LEN) return true;
        } else if (Array.isArray(cur)) {
          cur.forEach(v => stack.push(v));
        } else if (typeof cur === 'object') {
          Object.values(cur).forEach(v => stack.push(v));
        }
      }
      return false;
    };

    if (rejectLongStrings({ params: req.params, query: req.query, body: req.body })) {
      return res.status(400).json({ success: false, message: 'Input too long' });
    }

    // Generic numeric id validation for :id-like params
    if (req.params && typeof req.params === 'object') {
      for (const [k, v] of Object.entries(req.params)) {
        if (/id$/i.test(k)) {
          const num = Number(v);
          if (!Number.isInteger(num) || num <= 0) {
            return res.status(400).json({ success: false, message: `Invalid ${k}` });
          }
        }
      }
    }

    const hasSqlPatterns = inputValidator.scanObjectForSqlInjection({ params: req.params, query: req.query, body: req.body });
    if (hasSqlPatterns) return res.status(400).json({ success: false, message: 'Invalid input detected' });
    next();
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid input' });
  }
});

// Secure database configuration
const dbConfig = dbSecurity.getSecureDbConfig();

// Create database pool
let pool;
let xmlSyncService;
let profileScheduler;

// ⚡ OPTIMIZASYON: Async Query Logger (non-blocking)
const queryLogQueue = [];
const SLOW_QUERY_THRESHOLD = 100; // ms

// Async log processor (her 5 saniyede bir batch write)
setInterval(() => {
  if (queryLogQueue.length > 0) {
    const logs = queryLogQueue.splice(0, 100); // Max 100 log per batch
    // Production'da file'a yaz, development'ta console
    if (process.env.NODE_ENV === 'production') {
      // File write (non-blocking)
      const fs = require('fs');
      const logFile = path.join(__dirname, 'logs', 'slow-queries.log');
      fs.appendFile(logFile, logs.join('\n') + '\n', () => { });
    } else {
      // Development: sadece yavaş query'leri logla
      logs.forEach(log => console.log(log));
    }
  }
}, 5000);

function logQuery(sql, params, startTime) {
  const duration = Date.now() - startTime;

  // ⚡ Sadece yavaş query'leri logla (100ms+)
  if (duration > SLOW_QUERY_THRESHOLD) {
    const logEntry = `[${new Date().toISOString()}] SLOW QUERY (${duration}ms): ${sql.substring(0, 200)}`;
    queryLogQueue.push(logEntry);
  }
}

// Wrapped pool methods for logging
const poolWrapper = {
  async execute(sql, params) {
    const startTime = Date.now();
    try {
      const result = await pool.execute(sql, params);
      logQuery(sql, params, startTime);
      return result;
    } catch (error) {
      logQuery(sql, params, startTime);
      console.error(`❌ SQL Error: ${error.message}`);
      throw error;
    }
  },

  async query(sql, params) {
    const startTime = Date.now();
    try {
      const result = await pool.query(sql, params);
      logQuery(sql, params, startTime);
      return result;
    } catch (error) {
      logQuery(sql, params, startTime);
      console.error(`❌ SQL Error: ${error.message}`);
      throw error;
    }
  },

  async getConnection() {
    return await pool.getConnection();
  },

  async getConnection() {
    try {
      const connection = await pool.getConnection();

      // Wrap connection methods for logging
      const originalExecute = connection.execute;
      const originalQuery = connection.query;
      const originalBeginTransaction = connection.beginTransaction;
      const originalCommit = connection.commit;
      const originalRollback = connection.rollback;

      connection.execute = async function (sql, params) {
        const startTime = Date.now();
        try {
          const result = await originalExecute.call(this, sql, params);
          logQuery(sql, params, startTime);
          return result;
        } catch (error) {
          logQuery(sql, params, startTime);
          console.error(`❌ SQL Error: ${error.message}`);
          throw error;
        }
      };

      connection.query = async function (sql, params) {
        const startTime = Date.now();
        try {
          const result = await originalQuery.call(this, sql, params);
          logQuery(sql, params, startTime);
          return result;
        } catch (error) {
          logQuery(sql, params, startTime);
          console.error(`❌ SQL Error: ${error.message}`);
          throw error;
        }
      };

      connection.beginTransaction = async function () {
        console.log('🔄 Transaction started');
        return await originalBeginTransaction.call(this);
      };

      connection.commit = async function () {
        console.log('✅ Transaction committed');
        return await originalCommit.call(this);
      };

      connection.rollback = async function () {
        console.log('🔄 Transaction rolled back');
        return await originalRollback.call(this);
      };

      return connection;
    } catch (error) {
      console.error(`❌ Error getting connection: ${error.message}`);
      throw error;
    }
  }
};

// Set poolWrapper in global early so modules can access it (will be updated when pool is created)
global.poolWrapper = poolWrapper;

// Create user_exp_transactions table if not exists
async function createUserExpTransactionsTable() {
  try {
    if (!poolWrapper) {
      console.error('❌ poolWrapper not initialized yet');
      return;
    }
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS user_exp_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        tenantId VARCHAR(255) NOT NULL,
        source VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        description TEXT,
        orderId VARCHAR(255),
        productId VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_tenant (userId, tenantId),
        INDEX idx_timestamp (timestamp)
      )
    `);
    console.log('✅ user_exp_transactions table created/verified');
  } catch (error) {
    console.error('❌ Error creating user_exp_transactions table:', error);
  }
}

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);

    // Test connection with security
    const connection = await pool.getConnection();
    const secureConnection = dbSecurity.secureConnection(connection);
    console.log('✅ Database connected securely');
    secureConnection.release();

    // Create database schema
    await createDatabaseSchema(pool);

    // Set poolWrapper in database-schema module and global so other modules can use it
    const { setPoolWrapper } = require('./database-schema');
    setPoolWrapper(poolWrapper);
    // Also set in global for backward compatibility
    global.poolWrapper = poolWrapper;

    // Create user level system tables
    await createUserExpTransactionsTable();

    // Initialize XML Sync Service
    xmlSyncService = new XmlSyncService(pool);
    console.log('📡 XML Sync Service initialized');


    // Initialize Profile Scheduler (every 30 minutes)
    try {
      const { RecommendationService } = require('./services/recommendation-service');
      const recSvc = new RecommendationService(poolWrapper);
      profileScheduler = setInterval(async () => {
        try {
          // ✅ OPTIMIZASYON: N+1 query fix - Tek sorguda tüm veriyi al
          const [userTenants] = await poolWrapper.execute(
            `SELECT 
              userId,
              GROUP_CONCAT(DISTINCT tenantId) as tenantIds
            FROM user_events 
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
              AND tenantId IS NOT NULL
            GROUP BY userId`
          );

          // Paralel işleme için batch'lere böl
          const batchSize = 10;
          for (let i = 0; i < userTenants.length; i += batchSize) {
            const batch = userTenants.slice(i, i + batchSize);

            // Her batch'i paralel işle
            await Promise.allSettled(
              batch.map(async (row) => {
                const tenantIds = row.tenantIds.split(',').map(id => parseInt(id));

                // Her tenant için paralel işle
                await Promise.allSettled(
                  tenantIds.map(async (tenantId) => {
                    await recSvc.updateUserProfile(tenantId, row.userId);
                    await recSvc.generateRecommendations(tenantId, row.userId, 20);
                  })
                );
              })
            );
          }

          console.log(`🕒 Profiles refreshed: ${userTenants.length} users (optimized)`);
        } catch (e) {
          console.warn('⚠️ Profile scheduler error:', e.message);
        }
      }, 30 * 60 * 1000);
      console.log('⏱️ Profile Scheduler started (every 30 minutes)');
    } catch (e) {
      console.warn('⚠️ Could not start Profile Scheduler:', e.message);
    }

    // Initialize Analytics Aggregation Scheduler
    try {
      const AggregationService = require('./services/aggregation-service');
      const aggregationService = new AggregationService();

      // Günlük özet - Her gün saat 02:00'de çalışır
      const dailyAggregationInterval = 24 * 60 * 60 * 1000; // 24 saat
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0);
      const msUntilTomorrow = tomorrow.getTime() - now.getTime();

      setTimeout(() => {
        // İlk çalıştırma
        aggregationService.aggregateAllTenantsDaily().catch(err => {
          console.error('❌ Daily aggregation error:', err);
        });

        // Sonraki çalıştırmalar için interval
        setInterval(() => {
          aggregationService.aggregateAllTenantsDaily().catch(err => {
            console.error('❌ Daily aggregation error:', err);
          });
        }, dailyAggregationInterval);
      }, msUntilTomorrow);

      // Haftalık özet - Her Pazartesi saat 03:00'de çalışır
      const weeklyAggregationInterval = 7 * 24 * 60 * 60 * 1000; // 7 gün
      const nextMonday = new Date(now);
      const dayOfWeek = now.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(3, 0, 0, 0);
      const msUntilMonday = nextMonday.getTime() - now.getTime();

      setTimeout(() => {
        // İlk çalıştırma
        aggregationService.aggregateAllTenantsWeekly().catch(err => {
          console.error('❌ Weekly aggregation error:', err);
        });

        // Sonraki çalıştırmalar için interval
        setInterval(() => {
          aggregationService.aggregateAllTenantsWeekly().catch(err => {
            console.error('❌ Weekly aggregation error:', err);
          });
        }, weeklyAggregationInterval);
      }, msUntilMonday);

      // Aylık özet - Her ayın 1'i saat 04:00'de çalışır
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(4, 0, 0, 0);
      const msUntilNextMonth = nextMonth.getTime() - now.getTime();

      setTimeout(() => {
        // İlk çalıştırma
        aggregationService.aggregateAllTenantsMonthly().catch(err => {
          console.error('❌ Monthly aggregation error:', err);
        });

        // Sonraki çalıştırmalar için interval (yaklaşık 30 gün)
        setInterval(() => {
          aggregationService.aggregateAllTenantsMonthly().catch(err => {
            console.error('❌ Monthly aggregation error:', err);
          });
        }, 30 * 24 * 60 * 60 * 1000);
      }, msUntilNextMonth);

      console.log('⏱️ Analytics Aggregation Scheduler started');
    } catch (e) {
      console.warn('⚠️ Could not start Analytics Aggregation Scheduler:', e.message);
    }

    // Log security initialization
    dbSecurity.logDatabaseAccess('system', 'DATABASE_INIT', 'system', {
      ip: 'localhost',
      userAgent: 'server-init'
    });

    // Create homepage products table once DB/pool is ready
    try {
      await ensureHomepageProductsTable();
      console.log('✅ user_homepage_products table ready');
    } catch (e) {
      console.warn('⚠️ ensureHomepageProductsTable warning:', e.message);
    }

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    dbSecurity.logDatabaseAccess('system', 'DATABASE_ERROR', 'system', {
      error: error.message,
      ip: 'localhost'
    });
    throw error;
  }
}

// Ensure a default tenant with a known API key exists/active (idempotent)
async function ensureDefaultTenantApiKey() {
  try {
    const DEFAULT_KEY = 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
    const DEFAULT_NAME = 'Default Tenant';
    await poolWrapper.execute(
      `INSERT INTO tenants (id, name, apiKey, isActive, createdAt)
       VALUES (1, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE apiKey = VALUES(apiKey), isActive = 1, name = VALUES(name)`,
      [DEFAULT_NAME, DEFAULT_KEY]
    );
    console.log('✅ Default tenant API key ensured/updated');
  } catch (error) {
    console.warn('⚠️ Could not ensure default tenant API key:', error.message);
  }
}

// Ensure test user exists for panel testing (idempotent)
async function ensureTestUser() {
  try {
    // Get active tenant ID
    const [tenants] = await poolWrapper.execute('SELECT id FROM tenants WHERE isActive = true ORDER BY id ASC LIMIT 1');
    if (tenants.length === 0) {
      console.warn('⚠️ No active tenant found, skipping test user creation');
      return;
    }
    const tenantId = tenants[0].id;

    const TEST_EMAIL = 'test@test.com';
    const TEST_PASSWORD = 'test123';
    const TEST_NAME = 'Test Kullanıcı';
    const TEST_USER_ID = '12345678'; // 8-digit user_id

    // Check if test user already exists
    const [existingUser] = await poolWrapper.execute(
      'SELECT id FROM users WHERE email = ? AND tenantId = ?',
      [TEST_EMAIL, tenantId]
    );

    if (existingUser.length === 0) {
      // Create test user
      const hashedPassword = await hashPassword(TEST_PASSWORD);
      await poolWrapper.execute(
        'INSERT INTO users (user_id, tenantId, name, email, password, isActive, createdAt) VALUES (?, ?, ?, ?, ?, true, NOW())',
        [TEST_USER_ID, tenantId, TEST_NAME, TEST_EMAIL, hashedPassword]
      );
      // GÜVENLİK: Sensitive data logging - Production'da password loglanmaz
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Test user created successfully');
        console.log(`   Email: ${TEST_EMAIL}`);
        console.log(`   Password: ${TEST_PASSWORD} (development only)`);
      } else {
        console.log('✅ Test user created successfully');
        console.log(`   Email: ${TEST_EMAIL}`);
        // Production'da password loglanmaz
      }
    } else {
      // Update password if user exists (in case it was changed)
      const hashedPassword = await hashPassword(TEST_PASSWORD);
      await poolWrapper.execute(
        'UPDATE users SET password = ? WHERE email = ? AND tenantId = ?',
        [hashedPassword, TEST_EMAIL, tenantId]
      );
      // GÜVENLİK: Sensitive data logging - Production'da password loglanmaz
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Test user password reset');
        console.log(`   Email: ${TEST_EMAIL}`);
        console.log(`   Password: ${TEST_PASSWORD} (development only)`);
      } else {
        console.log('✅ Test user password reset');
        console.log(`   Email: ${TEST_EMAIL}`);
        // Production'da password loglanmaz
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not ensure test user:', error.message);
  }
}

// Health check endpoint (no authentication required)
app.get('/api/health', async (req, res) => {
  try {
    // Quick database check
    const connection = await pool.getConnection();
    connection.release();

    // Quick response
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    });
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'HEALTH_CHECK');
    const errorResponse = createSafeErrorResponse(error, 'Server health check failed');
    res.status(500).json({
      ...errorResponse,
      timestamp: new Date().toISOString()
    });
  }
});

// Bakım Modu - Durum kontrolü (herkese açık)
// platform parametresi: 'web' veya 'mobile' (opsiyonel, yoksa her ikisi için kontrol eder)
app.get('/api/maintenance/status', async (req, res) => {
  try {
    const platform = req.query.platform; // 'web' veya 'mobile'
    const cfgPath = path.join(__dirname, '..', 'admin-panel', 'config.json');
    let config = {};
    try {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      config = JSON.parse(raw);
    } catch (_) {
      // Config dosyası yoksa bakım modu kapalı
    }
    
    const maintenanceConfig = config.MAINTENANCE_MODE || {};
    
    // Platform'a göre enabled durumunu kontrol et
    let enabled = false;
    if (platform === 'web') {
      enabled = !!(maintenanceConfig.webEnabled !== undefined ? maintenanceConfig.webEnabled : maintenanceConfig.enabled);
    } else if (platform === 'mobile') {
      enabled = !!(maintenanceConfig.mobileEnabled !== undefined ? maintenanceConfig.mobileEnabled : maintenanceConfig.enabled);
    } else {
      // Platform belirtilmemişse, her ikisi için de kontrol et (geriye dönük uyumluluk)
      enabled = !!(maintenanceConfig.enabled || maintenanceConfig.webEnabled || maintenanceConfig.mobileEnabled);
    }
    
    const maintenanceMode = {
      enabled: enabled,
      message: maintenanceConfig.message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
      estimatedEndTime: maintenanceConfig.estimatedEndTime || null,
      webEnabled: maintenanceConfig.webEnabled !== undefined ? maintenanceConfig.webEnabled : (maintenanceConfig.enabled || false),
      mobileEnabled: maintenanceConfig.mobileEnabled !== undefined ? maintenanceConfig.mobileEnabled : (maintenanceConfig.enabled || false)
    };

    res.json({
      success: true,
      data: maintenanceMode
    });
  } catch (error) {
    console.error('❌ Maintenance status check error:', error);
    res.json({
      success: true,
      data: {
        enabled: false,
        message: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
        estimatedEndTime: null,
        webEnabled: false,
        mobileEnabled: false
      }
    });
  }
});

// Bakım Modu - Aç/Kapat (sadece admin)
app.post('/api/admin/maintenance/toggle', authenticateAdmin, async (req, res) => {
  try {
    const { enabled, webEnabled, mobileEnabled, message, estimatedEndTime } = req.body || {};
    const cfgPath = path.join(__dirname, '..', 'admin-panel', 'config.json');
    
    let current = {};
    try {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      current = JSON.parse(raw);
    } catch (_) {
      // Config dosyası yoksa yeni oluştur
    }

    const existingConfig = current.MAINTENANCE_MODE || {};
    
    // Yeni config oluştur - webEnabled ve mobileEnabled ayrı ayrı güncellenebilir
    const maintenanceConfig = {
      // Geriye dönük uyumluluk için enabled flag'i de tutuluyor
      enabled: enabled !== undefined ? !!enabled : (existingConfig.enabled || false),
      webEnabled: webEnabled !== undefined ? !!webEnabled : (existingConfig.webEnabled !== undefined ? existingConfig.webEnabled : (existingConfig.enabled || false)),
      mobileEnabled: mobileEnabled !== undefined ? !!mobileEnabled : (existingConfig.mobileEnabled !== undefined ? existingConfig.mobileEnabled : (existingConfig.enabled || false)),
      message: message !== undefined ? message : (existingConfig.message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.'),
      estimatedEndTime: estimatedEndTime !== undefined ? estimatedEndTime : (existingConfig.estimatedEndTime || null),
      updatedAt: new Date().toISOString()
    };

    const merged = {
      ...current,
      MAINTENANCE_MODE: maintenanceConfig
    };

    fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2), 'utf-8');
    
    const changes = [];
    if (webEnabled !== undefined) changes.push(`Web: ${webEnabled ? 'açıldı' : 'kapatıldı'}`);
    if (mobileEnabled !== undefined) changes.push(`Mobil: ${mobileEnabled ? 'açıldı' : 'kapatıldı'}`);
    if (enabled !== undefined) changes.push(`Genel: ${enabled ? 'açıldı' : 'kapatıldı'}`);
    
    console.log(`🔧 Bakım modu güncellendi: ${changes.join(', ')}`);
    
    return res.json({
      success: true,
      message: `Bakım modu güncellendi`,
      data: maintenanceConfig
    });
  } catch (e) {
    console.error('❌ Maintenance toggle error:', e);
    res.status(500).json({
      success: false,
      message: 'Bakım modu ayarı kaydedilemedi'
    });
  }
});

// Ollama API endpoints
app.get('/api/ollama/health', async (req, res) => {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

    const response = await axios.get(`${ollamaUrl}/api/tags`, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const models = response.data.models?.map(model => model.name) || [];

    res.json({
      success: true,
      status: 'online',
      models,
      url: ollamaUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'OLLAMA_HEALTH_CHECK');
    const errorResponse = createSafeErrorResponse(error, 'Ollama service unavailable');
    res.json({
      ...errorResponse,
      status: 'offline',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/ollama/generate', async (req, res) => {
  try {
    const { messages, model, temperature, maxTokens } = req.body;
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }

    // Mesajları Ollama formatına çevir
    let prompt = '';
    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    }
    prompt += 'Assistant: ';

    const requestBody = {
      model: model || 'gemma2:1b',
      prompt,
      stream: false,
      options: {
        temperature: temperature || 0.7,
        num_predict: maxTokens || 2000,
      }
    };

    console.log('🤖 Ollama Request:', { model: requestBody.model, temperature: requestBody.options.temperature });

    const response = await axios.post(`${ollamaUrl}/api/generate`, requestBody, {
      timeout: 60000, // 60 saniye timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'OLLAMA_GENERATE');
    const errorResponse = createSafeErrorResponse(error, 'Failed to generate response');
    res.status(500).json({
      ...errorResponse,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/ollama/pull', async (req, res) => {
  try {
    const { model } = req.body;
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

    if (!model) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }

    console.log(`📥 Pulling model: ${model}`);

    const response = await axios.post(`${ollamaUrl}/api/pull`, {
      name: model
    }, {
      timeout: 300000, // 5 dakika timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      message: `Model ${model} is being pulled`,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'OLLAMA_PULL');
    const errorResponse = createSafeErrorResponse(error, 'Failed to pull model');
    res.status(500).json({
      ...errorResponse,
      timestamp: new Date().toISOString()
    });
  }
});

// Security endpoints
// Security endpoints removed - keeping only basic API key authentication

// User Data Routes
app.use('/api/user-data', userDataRoutes);

// User Specific Data Routes
app.use('/api/user-specific', userSpecificDataRoutes);

// Chat Sessions Routes
app.use('/api/chat/sessions', chatSessionsRoutes);

// Segments Routes
app.use('/api', segmentsRoutes);

// Recommendations Routes
try {
  const recRoutesFactory = require('./routes/recommendations');
  // Delay init until after poolWrapper is defined
  process.nextTick(() => {
    try {
      const recommendationService = new RecommendationService(poolWrapper);
      const recRouter = recRoutesFactory(poolWrapper, recommendationService, authenticateTenant);
      app.use('/api/recommendations', recRouter);
      console.log('✅ Recommendations routes mounted at /api/recommendations');
    } catch (e) {
      console.warn('⚠️ Failed to mount recommendations routes:', e.message);
    }
  });
} catch (e) {
  console.warn('⚠️ Recommendations routes could not be required:', e.message);
}

// Dealership Applications Routes
try {
  const dealershipRoutes = require('./routes/dealership');
  app.use('/api/dealership', dealershipRoutes);
  console.log('✅ Dealership routes mounted at /api/dealership');
} catch (e) {
  console.warn('⚠️ Dealership routes could not be mounted:', e.message);
}

// Stories Routes
try {
  const storiesRoutesFactory = require('./routes/stories');
  // Delay init until after poolWrapper is defined
  process.nextTick(() => {
    try {
      const storiesRouter = storiesRoutesFactory(poolWrapper);
      app.use('/api/admin/stories', storiesRouter);
      app.use('/api/stories', storiesRouter); // Public endpoint for mobile app
      console.log('✅ Stories routes mounted at /api/admin/stories and /api/stories');
    } catch (e) {
      console.warn('⚠️ Failed to mount stories routes:', e.message);
    }
  });
} catch (e) {
  console.warn('⚠️ Stories routes could not be required:', e.message);
}


// Sliders Routes
try {
  const slidersRoutesFactory = require('./routes/sliders');
  // Delay init until after poolWrapper is defined
  process.nextTick(() => {
    try {
      const slidersRouter = slidersRoutesFactory(poolWrapper);
      app.use('/api/admin/sliders', slidersRouter);
      app.use('/api/sliders', slidersRouter); // Public endpoint for mobile app
      console.log('✅ Sliders routes mounted at /api/admin/sliders and /api/sliders');
    } catch (e) {
      console.warn('⚠️ Failed to mount sliders routes:', e.message);
    }
  });
} catch (e) {
  console.warn('⚠️ Sliders routes could not be required:', e.message);
}

// Popups Routes
try {
  const popupsRoutesFactory = require('./routes/popups');
  // Delay init until after poolWrapper is defined
  process.nextTick(() => {
    try {
      const popupsRouter = popupsRoutesFactory(poolWrapper);
      app.use('/api/admin/popups', popupsRouter);
      app.use('/api/popups', popupsRouter); // Public endpoint for mobile app
      console.log('✅ Popups routes mounted at /api/admin/popups and /api/popups');
    } catch (e) {
      console.warn('⚠️ Failed to mount popups routes:', e.message);
    }
  });
} catch (e) {
  console.warn('⚠️ Popups routes could not be required:', e.message);
}

// Flash Deals Routes
try {
  const createFlashDealsRouter = require('./routes/flash-deals');
  const flashDealsRoutes = createFlashDealsRouter(poolWrapper);
  app.use('/api/admin/flash-deals', flashDealsRoutes);
  app.use('/api/flash-deals', flashDealsRoutes);
  console.log('✅ Flash deals routes mounted at /api/admin/flash-deals and /api/flash-deals');
} catch (e) {
  console.warn('⚠️ Flash deals routes could not be mounted:', e.message);
}

// Live Users Routes
try {
  const liveUsersRoutes = require('./routes/live-users');
  app.use('/api/admin/live-users', liveUsersRoutes);
  app.use('/api/live-users', liveUsersRoutes);
  console.log('✅ Live users routes mounted at /api/admin/live-users and /api/live-users');
} catch (e) {
  console.warn('⚠️ Live users routes could not be mounted:', e.message);
}

// Backup Routes
try {
  const backupRoutes = require('./routes/backup');
  app.use('/api/admin/backup', backupRoutes);
  console.log('✅ Backup routes mounted at /api/admin/backup');
} catch (e) {
  console.warn('⚠️ Backup routes could not be mounted:', e.message);
}

// Scrapers Routes
try {
  const scrapersRoutes = require('./routes/scrapers');
  app.use('/api/admin/scrapers', scrapersRoutes);
  console.log('✅ Scrapers routes mounted at /api/admin/scrapers');
} catch (e) {
  console.warn('⚠️ Scrapers routes could not be mounted:', e.message);
}

// Analytics Routes
try {
  const analyticsRoutes = require('./routes/analytics');
  app.use('/api/admin/analytics', analyticsRoutes);
  console.log('✅ Analytics routes mounted at /api/admin/analytics');
} catch (e) {
  console.warn('⚠️ Analytics routes could not be mounted:', e.message);
}

// ML Routes
try {
  const mlRoutes = require('./routes/ml');
  app.use('/api/admin/ml', mlRoutes);
  console.log('✅ ML routes mounted at /api/admin/ml');
} catch (e) {
  console.warn('⚠️ ML routes could not be mounted:', e.message);
}

// Helper: generate unique 8-digit user_id
async function generateUnique8DigitUserId() {
  const min = 10000000;
  const max = 99999999;
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = String(Math.floor(Math.random() * (max - min + 1)) + min);
    const [exists] = await poolWrapper.execute('SELECT id FROM users WHERE user_id = ? LIMIT 1', [candidate]);
    if (!exists || exists.length === 0) return candidate;
  }
  throw new Error('Could not generate unique 8-digit user_id');
}

// Helper: ensure a specific user (by PK id) has 8-digit user_id; returns user_id
async function ensureUserHasExternalId(userPk) {
  if (!userPk) throw new Error('userPk required');
  const [[row]] = await poolWrapper.execute('SELECT user_id FROM users WHERE id = ? LIMIT 1', [userPk]);
  if (!row) throw new Error('User not found');
  if (row.user_id && String(row.user_id).length === 8) return row.user_id;
  const newId = await generateUnique8DigitUserId();
  await poolWrapper.execute('UPDATE users SET user_id = ? WHERE id = ?', [newId, userPk]);
  return newId;
}

// Helper: resolve user key (either numeric PK or 8-digit external user_id) to numeric PK
async function resolveUserKeyToPk(userKey, tenantId = 1) {
  if (userKey == null) throw new Error('userKey required');
  const key = String(userKey).trim();
  // If it looks like an 8-digit external id
  if (/^\d{8}$/.test(key)) {
    const [[row]] = await poolWrapper.execute(
      'SELECT id FROM users WHERE user_id = ? AND tenantId = ? LIMIT 1',
      [key, tenantId]
    );
    if (!row) throw new Error('User not found for external id');
    return row.id;
  }
  // Else, try numeric PK
  const num = Number(key);
  if (!Number.isInteger(num) || num <= 0) throw new Error('Invalid user key');
  return num;
}

// Admin: Reset all users' external 8-digit user_id
app.post('/api/admin/users/reset-user-ids', async (req, res) => {
  try {
    // Fetch all users' numeric primary keys
    const [users] = await poolWrapper.execute('SELECT id FROM users ORDER BY id ASC', []);
    if (!users || users.length === 0) {
      return res.json({ success: true, data: { updated: 0 }, message: 'No users to update' });
    }

    // Ensure uniqueness by checking DB per generated id
    let updatedCount = 0;
    const mapping = [];
    for (const row of users) {
      const newId = await generateUnique8DigitUserId();
      await poolWrapper.execute('UPDATE users SET user_id = ? WHERE id = ?', [newId, row.id]);
      updatedCount++;
      mapping.push({ id: row.id, user_id: newId });
    }

    res.json({ success: true, data: { updated: updatedCount, mapping } });
  } catch (error) {
    console.error('❌ Error resetting user IDs:', error);
    res.status(500).json({ success: false, message: 'Error resetting user IDs' });
  }
});

// Admin: Ensure ONE user has an 8-digit user_id (idempotent)
app.post('/api/admin/users/:id/ensure-user-id', async (req, res) => {
  try {
    const userPk = parseInt(req.params.id, 10);
    if (!Number.isInteger(userPk) || userPk <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const user_id = await ensureUserHasExternalId(userPk);
    res.json({ success: true, data: { id: userPk, user_id } });
  } catch (error) {
    console.error('❌ ensure-user-id error:', error);
    res.status(500).json({ success: false, message: 'ensure-user-id failed' });
  }
});

// Admin: Ensure all users missing user_id get a new 8-digit id (non-destructive)
app.post('/api/admin/users/ensure-missing-user-ids', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute('SELECT id FROM users WHERE (user_id IS NULL OR LENGTH(user_id) <> 8)', []);
    let updated = 0;
    const mapping = [];
    for (const r of rows) {
      const newId = await generateUnique8DigitUserId();
      await poolWrapper.execute('UPDATE users SET user_id = ? WHERE id = ?', [newId, r.id]);
      updated++;
      mapping.push({ id: r.id, user_id: newId });
    }
    res.json({ success: true, data: { updated, mapping } });
  } catch (error) {
    console.error('❌ ensure-missing-user-ids error:', error);
    res.status(500).json({ success: false, message: 'ensure-missing-user-ids failed' });
  }
});

// User Addresses Endpoints

// Get user's addresses
app.get('/api/user-addresses', async (req, res) => {
  try {
    const { userId, addressType } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    let query = `
      SELECT * FROM user_addresses 
      WHERE userId = ? AND tenantId = ?
    `;
    let params = [userId, req.tenant.id];

    if (addressType && (addressType === 'shipping' || addressType === 'billing')) {
      query += ' AND addressType = ?';
      params.push(addressType);
    }

    query += ' ORDER BY isDefault DESC, createdAt DESC';

    const [addresses] = await poolWrapper.execute(query, params);

    res.json({ success: true, data: addresses });
  } catch (error) {
    console.error('❌ Error fetching user addresses:', error);
    res.status(500).json({ success: false, message: 'Error fetching addresses' });
  }
});

// Create new address
// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection.getTokenHandler.bind(csrfProtection));

app.post('/api/user-addresses', validateUserIdMatch('body'), async (req, res) => {
  try {
    const { userId, addressType, fullName, phone, address, city, district, postalCode, isDefault } = req.body;

    if (!userId || !addressType || !fullName || !phone || !address || !city) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (addressType !== 'shipping' && addressType !== 'billing') {
      return res.status(400).json({
        success: false,
        message: 'Invalid address type. Must be shipping or billing'
      });
    }

    // If this is default address, remove default from others of same type
    if (isDefault) {
      await poolWrapper.execute(
        'UPDATE user_addresses SET isDefault = false WHERE userId = ? AND tenantId = ? AND addressType = ?',
        [userId, req.tenant.id, addressType]
      );
    }

    const [result] = await poolWrapper.execute(`
      INSERT INTO user_addresses (userId, tenantId, addressType, fullName, phone, address, city, district, postalCode, isDefault)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, req.tenant.id, addressType, fullName, phone, address, city, district || null, postalCode || null, isDefault || false]);

    res.json({
      success: true,
      data: { addressId: result.insertId },
      message: 'Address created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating address:', error);
    res.status(500).json({ success: false, message: 'Error creating address' });
  }
});

// Update address
app.put('/api/user-addresses/:id', requireUserOwnership('address', 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const { addressType, fullName, phone, address, city, district, postalCode, isDefault } = req.body;

    if (!addressType || !fullName || !phone || !address || !city) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (addressType !== 'shipping' && addressType !== 'billing') {
      return res.status(400).json({
        success: false,
        message: 'Invalid address type. Must be shipping or billing'
      });
    }

    // If this is default address, remove default from others of same type
    if (isDefault) {
      await poolWrapper.execute(
        'UPDATE user_addresses SET isDefault = false WHERE userId = (SELECT userId FROM user_addresses WHERE id = ?) AND tenantId = ? AND addressType = ? AND id != ?',
        [id, req.tenant.id, addressType, id]
      );
    }

    await poolWrapper.execute(`
      UPDATE user_addresses 
      SET addressType = ?, fullName = ?, phone = ?, address = ?, city = ?, district = ?, postalCode = ?, isDefault = ?, updatedAt = NOW()
      WHERE id = ? AND tenantId = ?
    `, [addressType, fullName, phone, address, city, district || null, postalCode || null, isDefault || false, id, req.tenant.id]);

    res.json({ success: true, message: 'Address updated successfully' });
  } catch (error) {
    console.error('❌ Error updating address:', error);
    res.status(500).json({ success: false, message: 'Error updating address' });
  }
});

// Delete address
app.delete('/api/user-addresses/:id', requireUserOwnership('address', 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    await poolWrapper.execute(
      'DELETE FROM user_addresses WHERE id = ? AND tenantId = ?',
      [id, req.tenant.id]
    );

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting address:', error);
    res.status(500).json({ success: false, message: 'Error deleting address' });
  }
});

// Set default address
app.put('/api/user-addresses/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;

    // Get address details first
    const [address] = await poolWrapper.execute(
      'SELECT userId, addressType FROM user_addresses WHERE id = ? AND tenantId = ?',
      [id, req.tenant.id]
    );

    if (address.length === 0) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const { userId, addressType } = address[0];

    // Remove default from others of same type
    await poolWrapper.execute(
      'UPDATE user_addresses SET isDefault = false WHERE userId = ? AND tenantId = ? AND addressType = ?',
      [userId, req.tenant.id, addressType]
    );

    // Set this address as default
    await poolWrapper.execute(
      'UPDATE user_addresses SET isDefault = true WHERE id = ? AND tenantId = ?',
      [id, req.tenant.id]
    );

    res.json({ success: true, message: 'Default address updated successfully' });
  } catch (error) {
    console.error('❌ Error setting default address:', error);
    res.status(500).json({ success: false, message: 'Error setting default address' });
  }
});

// Wallet Transfer Endpoints

// Transfer money between users
app.post('/api/wallet/transfer', validateUserIdMatch('body'), async (req, res) => {
  try {
    // Tenant kontrolü
    if (!req.tenant || !req.tenant.id) {
      return res.status(401).json({
        success: false,
        message: 'Tenant authentication required'
      });
    }

    let { fromUserId, toUserId, amount, description } = req.body || {};
    
    // CSRF ve yetkisiz erişim koruması: fromUserId kontrolü
    // Kullanıcı sadece kendi cüzdanından transfer yapabilir
    if (req.authenticatedUserId && fromUserId && parseInt(fromUserId) !== req.authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only transfer from your own wallet'
      });
    }

    // Harici kimlik varsa iç id'ye çevir
    const tenantId = req.tenant.id;
    const resolvedFromId = await resolveInternalUserId(fromUserId, tenantId);
    const resolvedToId = await resolveInternalUserId(toUserId, tenantId);

    // Tutarı güvenli parse et (virgül nokta dönüşümü, 2 ondalık hassasiyet)
    const parsedAmount = (() => {
      try {
        const n = parseFloat(String(amount).replace(/,/g, '.'));
        if (!isFinite(n)) return NaN;
        return Math.round(n * 100) / 100;
      } catch { return NaN }
    })();

    if (!resolvedFromId || !resolvedToId || !parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid required fields'
      });
    }

    if (resolvedFromId === resolvedToId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to yourself'
      });
    }

    // Check if both users exist
    const [fromUser] = await poolWrapper.execute(
      'SELECT id, name FROM users WHERE id = ? AND tenantId = ?',
      [resolvedFromId, req.tenant.id]
    );

    const [toUser] = await poolWrapper.execute(
      'SELECT id, name FROM users WHERE id = ? AND tenantId = ?',
      [resolvedToId, req.tenant.id]
    );

    if (fromUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sender user not found'
      });
    }

    if (toUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Receiver user not found'
      });
    }

    // Check sender's balance
    const [senderBalance] = await poolWrapper.execute(
      'SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?',
      [resolvedFromId, req.tenant.id]
    );

    if (senderBalance.length === 0 || senderBalance[0].balance < parsedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Start transaction
    console.log('🔄 Starting wallet transfer transaction...');
    const connection = await poolWrapper.getConnection();
    console.log('✅ Database connection obtained');
    await connection.beginTransaction();
    console.log('✅ Transaction started');

    try {
      // Deduct from sender
      console.log('🔄 Deducting from sender...');
      await connection.execute(
        'UPDATE user_wallets SET balance = balance - ?, updatedAt = NOW() WHERE userId = ? AND tenantId = ?',
        [parsedAmount, resolvedFromId, req.tenant.id]
      );
      console.log('✅ Sender balance deducted');

      // Add to receiver (create wallet if doesn't exist)
      console.log('🔄 Adding to receiver...');
      await connection.execute(`
        INSERT INTO user_wallets (userId, tenantId, balance, createdAt, updatedAt)
        VALUES (?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE balance = balance + ?, updatedAt = NOW()
      `, [resolvedToId, req.tenant.id, parsedAmount, parsedAmount]);
      console.log('✅ Receiver balance updated');

      // Record outgoing transaction for sender
      console.log('🔄 Recording outgoing transaction...');
      await connection.execute(`
        INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, createdAt)
        VALUES (?, ?, 'debit', ?, ?, NOW())
      `, [resolvedFromId, req.tenant.id, parsedAmount, (description || `Transfer to ${toUser[0].name}`)]);
      console.log('✅ Outgoing transaction recorded');

      // Record incoming transaction for receiver
      console.log('🔄 Recording incoming transaction...');
      await connection.execute(`
        INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, createdAt)
        VALUES (?, ?, 'credit', ?, ?, NOW())
      `, [resolvedToId, req.tenant.id, parsedAmount, (description || `Transfer from ${fromUser[0].name}`)]);
      console.log('✅ Incoming transaction recorded');

      console.log('🔄 Committing transaction...');
      await connection.commit();
      console.log('✅ Transaction committed successfully');

      res.json({
        success: true,
        message: 'Transfer completed successfully',
        data: {
          transferId: `TRANSFER_${Date.now()}`,
          amount: parsedAmount,
          fromUser: fromUser[0].name,
          toUser: toUser[0].name
        }
      });
    } catch (error) {
      console.error('❌ Transaction error, rolling back...', error.message);
      await connection.rollback();
      console.log('✅ Transaction rolled back');
      throw error;
    } finally {
      console.log('🔄 Releasing database connection...');
      connection.release();
      console.log('✅ Database connection released');
    }
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da stack trace ve detaylı error mesajları gizlenir
    // Error detayları sadece loglara yazılır, client'a gönderilmez
    logError(error, 'WALLET_TRANSFER');
    
    // GÜVENLİK: Production'da sensitive data loglanmaz
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error processing transfer:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        fromUserId: req.body?.fromUserId,
        toUserId: req.body?.toUserId,
        amount: req.body?.amount,
        tenantId: req.tenant?.id
      });
    }
    
    const errorResponse = createSafeErrorResponse(error, 'Error processing transfer');
    res.status(500).json(errorResponse);
  }
});

// Create gift card
app.post('/api/wallet/gift-card', validateUserIdMatch('body'), async (req, res) => {
  try {
    // Tenant kontrolü
    if (!req.tenant || !req.tenant.id) {
      return res.status(401).json({
        success: false,
        message: 'Tenant authentication required'
      });
    }

    const { amount, recipient, message, fromUserId, type } = req.body;
    
    // CSRF ve yetkisiz erişim koruması: fromUserId kontrolü
    // Kullanıcı sadece kendi cüzdanından gift card oluşturabilir
    if (req.authenticatedUserId && fromUserId && parseInt(fromUserId) !== req.authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only create gift cards from your own wallet'
      });
    }

    if (!amount || !recipient || !fromUserId || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid required fields'
      });
    }

    // Check sender's balance
    const [senderBalance] = await poolWrapper.execute(
      'SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?',
      [fromUserId, req.tenant.id]
    );

    if (senderBalance.length === 0 || senderBalance[0].balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Start transaction
    console.log('🔄 Starting gift card creation transaction...');
    const connection = await poolWrapper.getConnection();
    console.log('✅ Database connection obtained');
    await connection.beginTransaction();
    console.log('✅ Transaction started');

    try {
      // Deduct from sender
      console.log('🔄 Deducting from sender for gift card...');
      await connection.execute(
        'UPDATE user_wallets SET balance = balance - ?, updatedAt = NOW() WHERE userId = ? AND tenantId = ?',
        [amount, fromUserId, req.tenant.id]
      );
      console.log('✅ Sender balance deducted for gift card');

      // Create gift card record
      console.log('🔄 Creating gift card record...');
      const giftCardCode = `GC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const forSelf = req.body.forSelf || false;
      const recipientUserId = forSelf ? fromUserId : null;

      await connection.execute(`
        INSERT INTO gift_cards (code, fromUserId, recipient, recipientUserId, amount, message, status, tenantId, createdAt, expiresAt)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR))
      `, [giftCardCode, fromUserId, recipient, recipientUserId, amount, message || '', req.tenant.id]);
      console.log('✅ Gift card record created');

      // Record transaction for sender
      console.log('🔄 Recording gift card transaction...');
      await connection.execute(`
        INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, createdAt)
        VALUES (?, ?, 'debit', ?, ?, NOW())
      `, [fromUserId, req.tenant.id, amount, `Hediye çeki oluşturuldu - ${recipient}`]);
      console.log('✅ Gift card transaction recorded');

      console.log('🔄 Committing gift card transaction...');
      await connection.commit();
      console.log('✅ Gift card transaction committed successfully');

      res.json({
        success: true,
        message: 'Gift card created successfully',
        data: {
          giftCardCode,
          amount,
          recipient,
          message: message || '',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Gift card transaction error, rolling back...', error.message);
      await connection.rollback();
      console.log('✅ Gift card transaction rolled back');
      throw error;
    } finally {
      console.log('🔄 Releasing database connection...');
      connection.release();
      console.log('✅ Database connection released');
    }
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da stack trace ve detaylı error mesajları gizlenir
    logError(error, 'GIFT_CARD_CREATE');
    
    // GÜVENLİK: Production'da sensitive data loglanmaz
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error creating gift card:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        amount,
        recipient,
        fromUserId,
        tenantId: req.tenant?.id
      });
    }
    
    const errorResponse = createSafeErrorResponse(error, 'Error creating gift card');
    res.status(500).json(errorResponse);
  }
});

// Use gift card
app.post('/api/wallet/gift-card/use', validateUserIdMatch('body'), async (req, res) => {
  try {
    // Tenant kontrolü
    if (!req.tenant || !req.tenant.id) {
      return res.status(401).json({
        success: false,
        message: 'Tenant authentication required'
      });
    }

    const { giftCardCode, userId } = req.body;

    if (!giftCardCode || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Gift card code and user ID are required'
      });
    }

    // Check if gift card exists and is valid
    const [giftCardRows] = await poolWrapper.execute(
      'SELECT * FROM gift_cards WHERE code = ? AND tenantId = ? AND status = "active" AND expiresAt > NOW()',
      [giftCardCode, req.tenant.id]
    );

    if (giftCardRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Geçersiz veya süresi dolmuş hediye çeki'
      });
    }

    const giftCard = giftCardRows[0];

    // Check if user is authorized to use this gift card
    if (giftCard.recipientUserId && giftCard.recipientUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu hediye çekini kullanma yetkiniz yok'
      });
    }

    // Start transaction
    console.log('🔄 Starting gift card usage transaction...');
    const connection = await poolWrapper.getConnection();
    console.log('✅ Database connection obtained');
    await connection.beginTransaction();
    console.log('✅ Transaction started');

    try {
      // Add amount to user's wallet
      console.log('🔄 Adding gift card amount to user wallet...');
      await connection.execute(`
        INSERT INTO user_wallets (userId, tenantId, balance, createdAt, updatedAt)
        VALUES (?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE balance = balance + ?, updatedAt = NOW()
      `, [userId, req.tenant.id, giftCard.amount, giftCard.amount]);
      console.log('✅ Gift card amount added to wallet');

      // Update gift card status
      console.log('🔄 Updating gift card status...');
      await connection.execute(
        'UPDATE gift_cards SET status = "used", usedAt = NOW(), usedBy = ? WHERE code = ? AND tenantId = ?',
        [userId, giftCardCode, req.tenant.id]
      );
      console.log('✅ Gift card status updated');

      // Record transaction
      console.log('🔄 Recording gift card usage transaction...');
      await connection.execute(`
        INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, createdAt)
        VALUES (?, ?, 'credit', ?, ?, NOW())
      `, [userId, req.tenant.id, giftCard.amount, `Hediye çeki kullanıldı - ${giftCardCode}`]);
      console.log('✅ Gift card usage transaction recorded');

      console.log('🔄 Committing gift card usage transaction...');
      await connection.commit();
      console.log('✅ Gift card usage transaction committed successfully');

      res.json({
        success: true,
        message: 'Hediye çeki başarıyla kullanıldı',
        data: {
          amount: giftCard.amount,
          giftCardCode,
          remainingBalance: giftCard.amount
        }
      });
    } catch (error) {
      console.error('❌ Gift card usage transaction error, rolling back...', error.message);
      await connection.rollback();
      console.log('✅ Gift card usage transaction rolled back');
      throw error;
    } finally {
      console.log('🔄 Releasing database connection...');
      connection.release();
      console.log('✅ Database connection released');
    }
  } catch (error) {
    console.error('❌ Error using gift card:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      giftCardCode: req.body.giftCardCode,
      userId: req.body.userId,
      tenantId: req.tenant?.id
    });
    logError(error, 'GIFT_CARD_USE');
    const errorResponse = createSafeErrorResponse(error, 'Error using gift card');
    res.status(500).json(errorResponse);
  }
});

// Get transfer history
app.get('/api/wallet/transfers', async (req, res) => {
  try {
    const { userId, type } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    let query = `
      SELECT 
        wt.*,
        u.name as otherUserName,
        CASE 
          WHEN wt.type = 'transfer_in' THEN 'received'
          WHEN wt.type = 'transfer_out' THEN 'sent'
        END as transferDirection
      FROM wallet_transactions wt
      LEFT JOIN users u ON (
        CASE 
          WHEN wt.type = 'transfer_in' THEN wt.referenceId LIKE CONCAT('%', u.id, '%')
          WHEN wt.type = 'transfer_out' THEN wt.referenceId LIKE CONCAT('%', u.id, '%')
        END
      )
      WHERE wt.userId = ? AND wt.tenantId = ? AND wt.type IN ('transfer_in', 'transfer_out')
    `;

    let params = [userId, req.tenant.id];

    if (type && (type === 'sent' || type === 'received')) {
      query += ' AND wt.type = ?';
      params.push(type === 'sent' ? 'transfer_out' : 'transfer_in');
    }

    query += ' ORDER BY wt.createdAt DESC';

    const [transfers] = await poolWrapper.execute(query, params);

    res.json({ success: true, data: transfers });
  } catch (error) {
    console.error('❌ Error fetching transfers:', error);
    res.status(500).json({ success: false, message: 'Error fetching transfers' });
  }
});

// Search users for transfer
app.get('/api/users/search', async (req, res) => {
  try {
    const { query, excludeUserId } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 2 characters'
      });
    }

    let searchQuery = `
      SELECT id, name, email, user_id
      FROM users 
      WHERE tenantId = ? AND (name LIKE ? OR email LIKE ? OR user_id LIKE ?)
    `;

    let params = [req.tenant.id, `%${query}%`, `%${query}%`, `%${query}%`];

    if (excludeUserId) {
      searchQuery += ' AND id != ?';
      params.push(excludeUserId);
    }

    searchQuery += ' ORDER BY name LIMIT 10';

    const [users] = await poolWrapper.execute(searchQuery, params);

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('❌ Error searching users:', error);
    res.status(500).json({ success: false, message: 'Error searching users' });
  }
});

// Return Requests Endpoints

// Get user's return requests
app.get('/api/return-requests', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const [returnRequests] = await poolWrapper.execute(`
      SELECT 
        rr.*,
        o.id as orderId,
        oi.productName,
        oi.productImage,
        oi.price as originalPrice,
        oi.quantity
      FROM return_requests rr
      JOIN orders o ON rr.orderId = o.id
      JOIN order_items oi ON rr.orderItemId = oi.id
      WHERE rr.userId = ? AND rr.tenantId = ?
      ORDER BY rr.createdAt DESC
    `, [userId, req.tenant.id]);

    res.json({ success: true, data: returnRequests });
  } catch (error) {
    console.error('❌ Error fetching return requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching return requests' });
  }
});

// Create new return request
app.post('/api/return-requests', validateUserIdMatch('body'), async (req, res) => {
  try {
    const { userId, orderId, orderItemId, reason, description } = req.body;

    if (!userId || !orderId || !orderItemId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get order item details for refund amount
    const [orderItem] = await poolWrapper.execute(`
      SELECT oi.*, o.userId as orderUserId
      FROM order_items oi
      JOIN orders o ON oi.orderId = o.id
      WHERE oi.id = ? AND o.userId = ? AND oi.tenantId = ?
    `, [orderItemId, userId, req.tenant.id]);

    if (orderItem.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found or not owned by user'
      });
    }

    const refundAmount = parseFloat(orderItem[0].price) * parseInt(orderItem[0].quantity);

    // Check if return request already exists for this order item
    const [existingRequest] = await poolWrapper.execute(`
      SELECT id FROM return_requests 
      WHERE orderItemId = ? AND tenantId = ? AND status NOT IN ('rejected', 'cancelled')
    `, [orderItemId, req.tenant.id]);

    if (existingRequest.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu ürün için zaten bir iade talebi bulunmaktadır'
      });
    }

    // Create return request
    const [result] = await poolWrapper.execute(`
      INSERT INTO return_requests (tenantId, userId, orderId, orderItemId, reason, description, refundAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.tenant.id, userId, orderId, orderItemId, reason, description || null, refundAmount]);

    res.json({
      success: true,
      data: { returnRequestId: result.insertId },
      message: 'İade talebi başarıyla oluşturuldu'
    });
  } catch (error) {
    console.error('❌ Error creating return request:', error);
    res.status(500).json({ success: false, message: 'Error creating return request' });
  }
});

// Cancel return request (user can cancel pending requests)
app.put('/api/return-requests/:id/cancel', requireUserOwnership('return_request', 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Check if return request exists and belongs to user
    const [returnRequest] = await poolWrapper.execute(`
      SELECT id, status FROM return_requests 
      WHERE id = ? AND userId = ? AND tenantId = ?
    `, [id, userId, req.tenant.id]);

    if (returnRequest.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    if (returnRequest[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Sadece beklemede olan iade talepleri iptal edilebilir'
      });
    }

    await poolWrapper.execute(`
      UPDATE return_requests 
      SET status = 'cancelled', updatedAt = NOW()
      WHERE id = ?
    `, [id]);

    res.json({ success: true, message: 'İade talebi iptal edildi' });
  } catch (error) {
    console.error('❌ Error cancelling return request:', error);
    res.status(500).json({ success: false, message: 'Error cancelling return request' });
  }
});

// İyzico Payment Endpoints
const iyzicoService = new IyzicoService();

// Note: authenticateTenant middleware is now handled globally in the API key middleware above

// Process credit card payment - NO CARD DATA STORED
app.post('/api/payments/process', async (req, res) => {
  try {
    console.log('🔄 Processing payment - CARD DATA WILL NOT BE STORED');
    console.log('⚠️ SECURITY: Card information is processed but NOT saved to database');

    const {
      orderId,
      paymentCard,
      buyer,
      shippingAddress,
      billingAddress
    } = req.body;

    // Validate required fields
    if (!orderId || !paymentCard || !buyer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields'
      });
    }

    // Security validation for card data
    if (!paymentCard.cardNumber || !paymentCard.expireMonth || !paymentCard.expireYear || !paymentCard.cvc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid card information provided'
      });
    }

    // Get order details - Optimize: sadece gerekli column'lar
    const [orderRows] = await poolWrapper.execute(
      'SELECT id, userId, status, totalAmount, paymentMethod, shippingAddress, createdAt, updatedAt, tenantId FROM orders WHERE id = ? AND tenantId = ?',
      [orderId, req.tenant.id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderRows[0];

    // Get order items - Optimize: sadece gerekli column'lar
    const [itemRows] = await poolWrapper.execute(
      'SELECT id, productId, productName, quantity, price, variationString, selectedVariations FROM order_items WHERE orderId = ? AND tenantId = ?',
      [orderId, req.tenant.id]
    );

    if (itemRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items found for this order'
      });
    }

    // Prepare payment data
    const paymentData = {
      price: order.totalAmount,
      paidPrice: order.totalAmount,
      currency: 'TRY',
      basketId: orderId,
      paymentCard: {
        cardHolderName: paymentCard.cardHolderName,
        cardNumber: paymentCard.cardNumber.replace(/\s/g, ''),
        expireMonth: paymentCard.expireMonth,
        expireYear: paymentCard.expireYear,
        cvc: paymentCard.cvc
      },
      buyer: {
        id: buyer.id || order.userId,
        name: buyer.name || order.customerName?.split(' ')[0] || 'John',
        surname: buyer.surname || order.customerName?.split(' ').slice(1).join(' ') || 'Doe',
        gsmNumber: buyer.gsmNumber || order.customerPhone || '+905555555555',
        email: buyer.email || order.customerEmail || 'test@test.com',
        identityNumber: buyer.identityNumber || '11111111111',
        registrationAddress: buyer.registrationAddress || order.shippingAddress,
        ip: req.ip || '127.0.0.1',
        city: buyer.city || order.city || 'Istanbul',
        country: buyer.country || 'Turkey',
        zipCode: buyer.zipCode || '34000'
      },
      shippingAddress: {
        contactName: shippingAddress?.contactName || order.customerName || 'Ahmet Yılmaz',
        city: shippingAddress?.city || order.city || 'Istanbul',
        country: shippingAddress?.country || 'Turkey',
        address: shippingAddress?.address || order.fullAddress || order.shippingAddress,
        zipCode: shippingAddress?.zipCode || '34000'
      },
      billingAddress: {
        contactName: billingAddress?.contactName || order.customerName || 'John Doe',
        city: billingAddress?.city || order.city || 'Istanbul',
        country: billingAddress?.country || 'Turkey',
        address: billingAddress?.address || order.fullAddress || order.shippingAddress,
        zipCode: billingAddress?.zipCode || '34000'
      },
      basketItems: itemRows.map(item => ({
        id: item.id,
        name: item.productName || 'Product',
        category1: item.productCategory || 'Outdoor',
        category2: item.productBrand || 'Product',
        price: parseFloat(item.price) * parseInt(item.quantity)
      }))
    };

    console.log('🔄 Processing İyzico payment for order:', orderId);

    // Process payment with İyzico
    const paymentResult = await iyzicoService.processPayment(paymentData);

    if (paymentResult.success) {
      // Update order status and payment info
      await poolWrapper.execute(
        `UPDATE orders SET 
         status = 'paid', 
         paymentStatus = 'completed',
         paymentId = ?,
         paymentProvider = 'iyzico',
         paidAt = NOW()
         WHERE id = ? AND tenantId = ?`,
        [paymentResult.paymentId, orderId, req.tenant.id]
      );

      // Log payment transaction
      await poolWrapper.execute(
        `INSERT INTO payment_transactions 
         (tenantId, orderId, paymentId, provider, amount, currency, status, transactionData, createdAt)
         VALUES (?, ?, ?, 'iyzico', ?, 'TRY', 'success', ?, NOW())`,
        [
          req.tenant.id,
          orderId,
          paymentResult.paymentId,
          order.totalAmount,
          JSON.stringify(paymentResult)
        ]
      );

      // Hpay+ bonus: Her başarılı alışverişin %3'ü cüzdana puan olarak eklenir
      try {
        const bonusRate = 0.03;
        const [orderUserRows] = await poolWrapper.execute(
          'SELECT userId FROM orders WHERE id = ? AND tenantId = ? LIMIT 1',
          [orderId, req.tenant.id]
        );
        if (orderUserRows && orderUserRows.length > 0) {
          const targetUserId = orderUserRows[0].userId;
          const rawBonus = Number(order.totalAmount || 0) * bonusRate;
          const bonus = Math.max(0, Number(rawBonus.toFixed(2)));
          if (bonus > 0) {
            // Ensure wallet exists
            await poolWrapper.execute(
              `INSERT INTO user_wallets (userId, tenantId, balance, currency) 
               VALUES (?, ?, 0, 'TRY')
               ON DUPLICATE KEY UPDATE balance = balance`,
              [targetUserId, req.tenant.id]
            );
            // Update wallet balance
            await poolWrapper.execute(
              'UPDATE user_wallets SET balance = balance + ?, updatedAt = NOW() WHERE userId = ? AND tenantId = ?',
              [bonus, targetUserId, req.tenant.id]
            );
            // Log wallet transaction as Hpay+ bonus
            await poolWrapper.execute(
              `INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, status, paymentMethod, orderId, createdAt)
               VALUES (?, ?, 'credit', ?, ?, 'completed', 'hpay_plus', ?, NOW())`,
              [
                targetUserId,
                req.tenant.id,
                bonus,
                `Hpay+ bonus (%3) - Order #${orderId}`,
                orderId
              ]
            );
            console.log(`🎁 Hpay+ bonus eklendi: user ${targetUserId}, +${bonus} TRY (order ${orderId})`);
          }
        }
      } catch (bonusError) {
        console.warn('⚠️ Hpay+ bonus eklenemedi:', bonusError.message);
      }

      console.log('✅ Payment successful for order:', orderId);
      console.log('✅ Card data processed and discarded - NOT stored in database');

      res.json({
        success: true,
        message: 'Payment completed successfully - Card data not stored',
        data: {
          orderId: orderId,
          paymentId: paymentResult.paymentId,
          amount: paymentResult.paidPrice,
          currency: paymentResult.currency,
          cardInfo: {
            lastFourDigits: paymentResult.lastFourDigits,
            cardType: paymentResult.cardType,
            cardAssociation: paymentResult.cardAssociation
          }
        }
      });

    } else {
      console.log('❌ Payment failed for order:', orderId);

      // Update order status
      await poolWrapper.execute(
        `UPDATE orders SET 
         status = 'payment_failed', 
         paymentStatus = 'failed'
         WHERE id = ? AND tenantId = ?`,
        [orderId, req.tenant.id]
      );

      res.status(400).json({
        success: false,
        error: paymentResult.error,
        message: iyzicoService.translateErrorMessage(paymentResult.message)
      });
    }

  } catch (error) {
    console.error('❌ Payment processing error:', error);
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'PAYMENT_PROCESSING');
    const errorResponse = createSafeErrorResponse(error, 'Payment processing failed');
    res.status(500).json(errorResponse);
  }
});

// Get payment status
app.get('/api/payments/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const [paymentRows] = await poolWrapper.execute(
      'SELECT * FROM payment_transactions WHERE paymentId = ? AND tenantId = ?',
      [paymentId, req.tenant.id]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = paymentRows[0];

    // Query İyzico for latest status
    try {
      const iyzicoResult = await iyzicoService.retrievePayment(paymentId, payment.conversationId);

      res.json({
        success: true,
        data: {
          paymentId: paymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          createdAt: payment.createdAt,
          iyzicoStatus: iyzicoResult.status
        }
      });
    } catch (iyzicoError) {
      // Return local data if İyzico query fails
      res.json({
        success: true,
        data: {
          paymentId: paymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          createdAt: payment.createdAt
        }
      });
    }

  } catch (error) {
    console.error('❌ Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment status'
    });
  }
});

// Test cards endpoint (sandbox only)
app.get('/api/payments/test-cards', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      message: 'Test cards not available in production'
    });
  }

  res.json({
    success: true,
    data: IyzicoService.getTestCards()
  });
});

// Get user's returnable orders
app.get('/api/orders/returnable', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const [orders] = await poolWrapper.execute(`
      SELECT 
        o.id as orderId,
        o.createdAt as orderDate,
        o.status as orderStatus,
        oi.id as orderItemId,
        oi.productName,
        oi.productImage,
        oi.price,
        oi.quantity,
        CASE 
          WHEN rr.id IS NOT NULL THEN rr.status
          ELSE NULL
        END as returnStatus
      FROM orders o
      JOIN order_items oi ON o.id = oi.orderId
      LEFT JOIN return_requests rr ON oi.id = rr.orderItemId AND rr.status NOT IN ('rejected', 'cancelled')
      WHERE o.userId = ? AND o.tenantId = ? AND o.status IN ('delivered')
      ORDER BY o.createdAt DESC, oi.id
    `, [userId, req.tenant.id]);

    // Group by order
    const ordersMap = {};
    orders.forEach(row => {
      if (!ordersMap[row.orderId]) {
        ordersMap[row.orderId] = {
          orderId: row.orderId,
          orderDate: row.orderDate,
          orderStatus: row.orderStatus,
          items: []
        };
      }

      ordersMap[row.orderId].items.push({
        orderItemId: row.orderItemId,
        productName: row.productName,
        productImage: row.productImage,
        price: row.price,
        quantity: row.quantity,
        returnStatus: row.returnStatus,
        canReturn: !row.returnStatus // Can return if no active return request
      });
    });

    const result = Object.values(ordersMap);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error fetching returnable orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching returnable orders' });
  }
});

// Admin authentication middleware
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'berat1';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '38cdfD8217..';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'huglu-admin-token-2025';

function authenticateAdmin(req, res, next) {
  // Check both Authorization Bearer token and X-API-Key
  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring('Bearer '.length) : null;
  const apiKey = req.headers['x-api-key'];

  // Accept either Bearer token or valid API key
  const isValidBearer = bearerToken && bearerToken === ADMIN_TOKEN;
  const isValidApiKey = apiKey && apiKey === 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';

  if (!isValidBearer && !isValidApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  // Set admin context for the request
  req.isAdmin = true;
  next();
}

// Admin login endpoint (username/password -> token)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    // ===== Brute-force koruması (kullanıcı+IP bazlı) =====
    // Hafif, sunucu restartında sıfırlanan in-memory kayıt. Üretimde kalıcı storage önerilir.
    if (!global.__ADMIN_BRUTE_FORCE) global.__ADMIN_BRUTE_FORCE = new Map();
    const getIp = (r) => {
      const xf = (r.headers['x-forwarded-for'] || '').toString();
      if (xf) return xf.split(',')[0].trim();
      return (r.ip || r.connection?.remoteAddress || r.socket?.remoteAddress || 'unknown').toString();
    };
    const clientIp = getIp(req);
    const userKey = (username || 'unknown').toLowerCase();
    const key = `${userKey}|${clientIp}`;
    const now = Date.now();
    const rec = global.__ADMIN_BRUTE_FORCE.get(key) || { count: 0, lockUntil: 0, last: 0 };
    if (rec.lockUntil && now < rec.lockUntil) {
      const msLeft = rec.lockUntil - now;
      const minutes = Math.ceil(msLeft / 60000);
      // Log blocked attempt
      try {
        dbSecurity && dbSecurity.logDatabaseAccess(userKey, 'ADMIN_LOGIN_BLOCKED', clientIp, { attempts: rec.count, lockUntil: new Date(rec.lockUntil).toISOString() });
        // persist security event
        await poolWrapper.execute(
          'INSERT INTO security_events (eventType, username, ip, userAgent, details, severity) VALUES (?, ?, ?, ?, ?, ?)',
          ['BRUTE_FORCE', userKey, clientIp, (req.headers['user-agent'] || '').toString(), JSON.stringify({ attempts: rec.count, lockUntil: rec.lockUntil }), 'high']
        );
      } catch (_) { }
      return res.status(429).json({ success: false, message: `Çok fazla hatalı deneme. Lütfen ${minutes} dakika sonra tekrar deneyin.` });
    }

    if (!username || !password) {
      // Eksik bilgi de hatalı deneme sayılır
      rec.count = (rec.count || 0) + 1;
      rec.last = now;
      // Eşikler: 10→10dk, 20→30dk, 25→1gün
      if (rec.count >= 25) rec.lockUntil = now + 24 * 60 * 60 * 1000;
      else if (rec.count >= 20) rec.lockUntil = now + 30 * 60 * 1000;
      else if (rec.count >= 10) rec.lockUntil = now + 10 * 60 * 1000;
      global.__ADMIN_BRUTE_FORCE.set(key, rec);
      try {
        dbSecurity && dbSecurity.logDatabaseAccess(userKey, 'ADMIN_LOGIN_FAILED', clientIp, { reason: 'missing_fields', attempts: rec.count, lockUntil: rec.lockUntil || null });
        await poolWrapper.execute('INSERT INTO security_events (eventType, username, ip, userAgent, details, severity) VALUES (?, ?, ?, ?, ?, ?)',
          ['BRUTE_FORCE', userKey, clientIp, (req.headers['user-agent'] || '').toString(), JSON.stringify({ reason: 'missing_fields', attempts: rec.count, lockUntil: rec.lockUntil || null }), 'medium']);
      } catch (_) { }
      return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gerekli' });
    }
    // DB tabanlı admin doğrulama (ENV ile yönetilen admin; varsayılan: berat1/berat1)
    try {
      // Aktif tenant yoksa oluştur
      let tenantId = null;
      const [tenants] = await poolWrapper.execute('SELECT id FROM tenants WHERE isActive = true ORDER BY id ASC LIMIT 1');
      if (tenants.length > 0) {
        tenantId = tenants[0].id;
      } else {
        const apiKey = 'admin_default_' + Math.random().toString(36).slice(2);
        const [ins] = await poolWrapper.execute(
          'INSERT INTO tenants (name, domain, subdomain, apiKey, settings, isActive) VALUES (?, NULL, NULL, ?, ?, true)',
          ['Huğlu Outdoor', apiKey, JSON.stringify({})]
        );
        tenantId = ins.insertId;
      }

      const ADMIN_USERNAME_FIXED = (process.env.ADMIN_USERNAME || 'berat1').toString();
      const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || (ADMIN_USERNAME_FIXED + '@admin.local')).toString();

      // Admin kullanıcıyı seed et (yoksa oluştur)
      const [existingAdmin] = await poolWrapper.execute('SELECT id, password FROM users WHERE email = ? AND role = "admin" LIMIT 1', [ADMIN_EMAIL]);
      if (existingAdmin.length === 0) {
        const userIdStr = (Math.floor(10000000 + Math.random() * 90000000)).toString();
        const adminPlainPassword = (process.env.ADMIN_PASSWORD || 'berat1').toString();
        const seededHash = await hashPassword(adminPlainPassword);
        await poolWrapper.execute(
          'INSERT INTO users (user_id, tenantId, name, email, password, role, isActive, createdAt) VALUES (?, ?, ?, ?, ?, "admin", true, NOW())',
          [userIdStr, tenantId, 'Admin', ADMIN_EMAIL, seededHash]
        );
      }

      // Giriş kontrolü: username email ise direkt o email ile, değilse sabit kullanıcı adı ile doğrula
      let ok = false;
      let checkEmail = ADMIN_EMAIL;
      if (typeof username === 'string' && username.includes('@')) {
        checkEmail = username.toLowerCase();
      }
      const [adminRows] = await poolWrapper.execute('SELECT id, password FROM users WHERE email = ? AND role = "admin" LIMIT 1', [checkEmail]);
      const stored = adminRows[0]?.password || '';
      const passwordOk = stored ? await verifyPassword(password, stored) : false;
      if (username && username.includes('@')) {
        ok = passwordOk; // email ile girişte sadece şifre doğrulaması yeterli
      } else {
        ok = (username === ADMIN_USERNAME_FIXED) && passwordOk;
      }
      if (ok) {
        if (!rec.lockUntil || now >= rec.lockUntil) {
          global.__ADMIN_BRUTE_FORCE.delete(key);
        }
        try { dbSecurity && dbSecurity.logDatabaseAccess(userKey, 'ADMIN_LOGIN_SUCCESS', clientIp, {}); } catch (_) { }
        return res.json({ success: true, token: ADMIN_TOKEN });
      }
    } catch (dbErr) {
      console.error('❌ Admin DB auth error:', dbErr);
    }
    // Hatalı şifre: sayacı artır ve gerekirse kilitle
    rec.count = (rec.count || 0) + 1;
    rec.last = now;
    if (rec.count >= 25) rec.lockUntil = now + 24 * 60 * 60 * 1000; // 1 gün
    else if (rec.count >= 20) rec.lockUntil = now + 30 * 60 * 1000; // 30 dk
    else if (rec.count >= 10) rec.lockUntil = now + 10 * 60 * 1000; // 10 dk
    global.__ADMIN_BRUTE_FORCE.set(key, rec);
    try {
      dbSecurity && dbSecurity.logDatabaseAccess(userKey, 'ADMIN_LOGIN_FAILED', clientIp, { reason: 'invalid_credentials', attempts: rec.count, lockUntil: rec.lockUntil || null });
      await poolWrapper.execute('INSERT INTO security_events (eventType, username, ip, userAgent, details, severity) VALUES (?, ?, ?, ?, ?, ?)',
        ['BRUTE_FORCE', userKey, clientIp, (req.headers['user-agent'] || '').toString(), JSON.stringify({ reason: 'invalid_credentials', attempts: rec.count, lockUntil: rec.lockUntil || null }), rec.count >= 20 ? 'high' : 'medium']);
    } catch (_) { }
    return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı bilgileri' });
  } catch (e) {
    console.error('❌ Admin login error:', e);
    res.status(500).json({ success: false, message: 'Login sırasında hata' });
  }
});

// Admin - Update return request status
app.put('/api/admin/return-requests/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = [status];
    const updateFields = ['status = ?'];

    if (adminNotes) {
      updateFields.push('adminNotes = ?');
      updateData.push(adminNotes);
    }

    if (status === 'approved' || status === 'rejected' || status === 'completed') {
      updateFields.push('processedDate = NOW()');
    }

    updateData.push(id);

    await poolWrapper.execute(`
      UPDATE return_requests 
      SET ${updateFields.join(', ')}, updatedAt = NOW()
      WHERE id = ?
    `, updateData);

    res.json({ success: true, message: 'Return request status updated' });
  } catch (error) {
    console.error('❌ Error updating return request status:', error);
    res.status(500).json({ success: false, message: 'Error updating return request status' });
  }
});

// Admin Dashboard Stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 Admin stats requested');
    const rangeDays = Math.max(1, Math.min(365, parseInt(req.query.range || '30')));

    // Kullanıcı sayısı
    const [userCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM users');

    // Ürün sayısı
    const [productCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM products');

    // Sipariş sayısı
    const [orderCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM orders');

    // Tenant sayısı
    const [tenantCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM tenants');

    // Seçilen aralıktaki siparişler ve gelir
    const [recentOrders] = await poolWrapper.execute(`
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(totalAmount), 0) as revenue 
      FROM orders 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND status != 'cancelled'
    `, [rangeDays]);

    // Bu ayın geliri
    const [monthlyRevenue] = await poolWrapper.execute(`
      SELECT COALESCE(SUM(totalAmount), 0) as revenue 
      FROM orders 
      WHERE DATE_FORMAT(createdAt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
        AND status != 'cancelled'
    `);

    const stats = {
      users: userCount[0].count,
      products: productCount[0].count,
      orders: orderCount[0].count,
      tenants: tenantCount[0].count,
      monthlyRevenue: monthlyRevenue[0].revenue || 0,
      monthlyOrders: recentOrders[0].count || 0
    };

    console.log('📊 Stats calculated:', stats);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting admin stats:', error);
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'GET_STATS');
    const errorResponse = createSafeErrorResponse(error, 'Error getting stats');
    res.status(500).json(errorResponse);
  }
});

// Admin - Snort IDS logs (placeholder file reader / future DB integration)
app.get('/api/admin/snort/logs', authenticateAdmin, async (req, res) => {
  try {
    // Basic mock: return empty list if no integration
    // You can integrate with filesystem (/var/log/snort/alert_fast.txt) or a DB in the future.
    const demo = [];
    return res.json({ success: true, data: demo });
  } catch (error) {
    console.error('❌ Error getting snort logs:', error);
    return res.status(500).json({ success: false, message: 'Error getting snort logs' });
  }
});

// Admin - Redis stats
app.get('/api/admin/redis/stats', authenticateAdmin, async (req, res) => {
  try {
    const redis = global.redis;
    if (!redis) return res.json({ success: true, data: { available: false } });
    const infoStr = await redis.info();
    const lines = String(infoStr || '').split('\n');
    const map = {};
    lines.forEach((l) => {
      const [k, v] = l.split(':');
      if (k && v) map[k.trim()] = v.trim();
    });
    const usedMemory = Number(map['used_memory']) || 0;
    const opsPerSec = Number(map['instantaneous_ops_per_sec']) || 0;
    const keyspaceHits = Number(map['keyspace_hits']) || 0;
    const keyspaceMisses = Number(map['keyspace_misses']) || 0;
    const uptimeInSeconds = Number(map['uptime_in_seconds']) || 0;
    const hitRate = (keyspaceHits + keyspaceMisses) > 0 ? Math.round((keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100) : 0;
    const status = 'online';
    const load = Math.min(95, Math.round(opsPerSec / 500));
    const memoryMb = Math.round(usedMemory / (1024 * 1024));
    const hours = Math.floor(uptimeInSeconds / 3600);
    const days = Math.floor(hours / 24);
    const uptime = `${days}g ${hours % 24}s`;
    return res.json({ success: true, data: { available: true, memoryMb, opsPerSec, hitRate, status, uptime, load } });
  } catch (error) {
    console.error('❌ Redis stats error:', error);
    return res.status(500).json({ success: false, message: 'Error getting redis stats' });
  }
});

// Admin Chart Data
app.get('/api/admin/charts', authenticateAdmin, async (req, res) => {
  try {
    console.log('📈 Admin charts requested');
    const rangeDays = Math.max(1, Math.min(365, parseInt(req.query.range || '7')));

    // Seçilen gün aralığı satışlar
    const [dailySales] = await poolWrapper.execute(`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as orders,
        COALESCE(SUM(totalAmount), 0) as revenue
      FROM orders 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND status != 'cancelled'
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `, [rangeDays]);

    // Sipariş durumları
    const [orderStatuses] = await poolWrapper.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);

    // Son 6 aylık gelir
    const [monthlyRevenue] = await poolWrapper.execute(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        COALESCE(SUM(totalAmount), 0) as revenue
      FROM orders 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND status != 'cancelled'
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month ASC
    `);

    // En çok satan ürünler (top 5) - seçili aralıkta
    const [topProducts] = await poolWrapper.execute(`
      SELECT 
        p.name,
        SUM(oi.quantity) as totalSold,
        p.price,
        SUM(oi.quantity * oi.price) as totalRevenue
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.status != 'cancelled' AND o.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY p.id, p.name, p.price
      ORDER BY totalSold DESC
      LIMIT 5
    `, [rangeDays]);

    // Kategorisel satış dağılımı (seçili aralık)
    const [categorySales] = await poolWrapper.execute(`
      SELECT 
        p.category as category,
        COALESCE(SUM(oi.quantity * oi.price), 0) as revenue,
        COALESCE(SUM(oi.quantity), 0) as units
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.status != 'cancelled' AND o.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY p.category
      ORDER BY revenue DESC
    `, [rangeDays]);

    const chartData = {
      dailySales: dailySales || [],
      orderStatuses: orderStatuses || [],
      monthlyRevenue: monthlyRevenue || [],
      topProducts: topProducts || [],
      categorySales: categorySales || []
    };

    console.log('📈 Charts calculated:', {
      dailySalesCount: chartData.dailySales.length,
      orderStatusesCount: chartData.orderStatuses.length,
      monthlyRevenueCount: chartData.monthlyRevenue.length,
      topProductsCount: chartData.topProducts.length
    });

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('❌ Error getting chart data:', error);
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'GET_CHART_DATA');
    const errorResponse = createSafeErrorResponse(error, 'Error getting chart data');
    res.status(500).json(errorResponse);
  }
});

// Admin Analytics - Monthly Revenue & Expenses
app.get('/api/admin/analytics/monthly', authenticateAdmin, async (req, res) => {
  try {
    const months = parseInt(req.query.months || '12');
    
    // Son N ayın listesini JavaScript'te oluştur
    const monthList = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toISOString().slice(0, 7); // YYYY-MM formatı
      const monthLabel = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
      monthList.push({ month, monthLabel });
    }
    
    // Ay listesini SQL'de kullanmak için UNION ALL ile oluştur
    const monthUnions = monthList.map(() => 'SELECT ? as month, ? as monthLabel').join(' UNION ALL ');
    const monthParams = monthList.flatMap(m => [m.month, m.monthLabel]);
    
    // Son N ayın tümünü (veri olsun olmasın) göster - LEFT JOIN ile
    const [monthlyData] = await poolWrapper.execute(`
      SELECT 
        ml.month,
        ml.monthLabel,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.totalAmount ELSE 0 END), 0) as gelir,
        COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN o.totalAmount ELSE 0 END), 0) as gider,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.totalAmount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN o.totalAmount ELSE 0 END), 0) as kar,
        COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END) as orders,
        COUNT(DISTINCT o.userId) as customers
      FROM (${monthUnions}) AS ml
      LEFT JOIN orders o ON DATE_FORMAT(o.createdAt, '%Y-%m') = ml.month
      GROUP BY ml.month, ml.monthLabel
      ORDER BY ml.month ASC
    `, monthParams);

    res.json({
      success: true,
      data: monthlyData || []
    });
  } catch (error) {
    console.error('❌ Error getting monthly analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting monthly analytics',
      error: error.message
    });
  }
});

// Admin Analytics - Customer Behavior
app.get('/api/admin/analytics/customer-behavior', authenticateAdmin, async (req, res) => {
  try {
    // Müşteri davranış metrikleri
    const [customerMetrics] = await poolWrapper.execute(`
      SELECT 
        'Alışveriş Sıklığı' as category,
        AVG(CASE WHEN orderCount > 0 THEN orderCount ELSE 0 END) as value
      FROM (
        SELECT userId, COUNT(*) as orderCount
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY userId
      ) as userOrders
      UNION ALL
      SELECT 
        'Ortalama Sepet Değeri' as category,
        AVG(totalAmount) as value
      FROM orders
      WHERE status != 'cancelled'
      UNION ALL
      SELECT 
        'Tekrar Alım Oranı' as category,
        (COUNT(DISTINCT CASE WHEN orderCount > 1 THEN userId END) * 100.0 / 
         NULLIF(COUNT(DISTINCT userId), 0)) as value
      FROM (
        SELECT userId, COUNT(*) as orderCount
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY userId
      ) as userOrders
      UNION ALL
      SELECT 
        'Memnuniyet Puanı' as category,
        AVG(rating) * 20 as value
      FROM reviews
      WHERE rating IS NOT NULL
      UNION ALL
      SELECT 
        'İndirim Kullanımı' as category,
        (COUNT(CASE WHEN discountAmount > 0 THEN 1 END) * 100.0 / 
         NULLIF(COUNT(*), 0)) as value
      FROM orders
      WHERE status != 'cancelled'
    `);

    // Radar chart için normalize edilmiş değerler (0-100 arası)
    const behaviorData = customerMetrics.map((item) => ({
      category: item.category,
      value: Math.min(100, Math.max(0, parseFloat(item.value || 0)))
    }));

    res.json({
      success: true,
      data: behaviorData
    });
  } catch (error) {
    console.error('❌ Error getting customer behavior:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting customer behavior',
      error: error.message
    });
  }
});

// Admin Analytics - Category Performance
app.get('/api/admin/analytics/category-performance', authenticateAdmin, async (req, res) => {
  try {
    const months = parseInt(req.query.months || '6');
    
    // Kategori bazlı performans (son N ay)
    const [categoryData] = await poolWrapper.execute(`
      SELECT 
        p.category as name,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity * oi.price ELSE 0 END), 0) as satis,
        COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.id END) as siparisler,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity * oi.price ELSE 0 END) - 
                 SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity * p.cost ELSE 0 END), 0) as kar,
        COALESCE(SUM(p.stock), 0) as stok
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.productId
      LEFT JOIN orders o ON oi.orderId = o.id AND o.createdAt >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY p.category
      HAVING satis > 0 OR stok > 0
      ORDER BY satis DESC
      LIMIT 10
    `, [months]);

    res.json({
      success: true,
      data: categoryData || []
    });
  } catch (error) {
    console.error('❌ Error getting category performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting category performance',
      error: error.message
    });
  }
});

// Admin Analytics - Customer Segments
app.get('/api/admin/analytics/customer-segments', authenticateAdmin, async (req, res) => {
  try {
    // Müşteri segmentleri (VIP, Normal, Yeni, vb.)
    const [segments] = await poolWrapper.execute(`
      SELECT 
        CASE 
          WHEN totalSpent >= 10000 THEN 'VIP Müşteriler'
          WHEN totalSpent >= 5000 THEN 'Premium Müşteriler'
          WHEN totalSpent >= 1000 THEN 'Aktif Müşteriler'
          WHEN orderCount >= 3 THEN 'Sadık Müşteriler'
          WHEN orderCount = 1 THEN 'Yeni Müşteriler'
          ELSE 'Potansiyel Müşteriler'
        END as segment,
        COUNT(*) as count,
        SUM(totalSpent) as revenue,
        AVG(totalSpent) as avgOrder,
        'from-blue-500 to-blue-600' as color
      FROM (
        SELECT 
          o.userId,
          COUNT(DISTINCT o.id) as orderCount,
          COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.totalAmount ELSE 0 END), 0) as totalSpent
        FROM orders o
        GROUP BY o.userId
      ) as customerStats
      GROUP BY segment
      ORDER BY revenue DESC
    `);

    // Renkleri dinamik olarak ata
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600'
    ];

    const segmentsWithColors = segments.map((segment, index) => ({
      ...segment,
      color: colors[index % colors.length]
    }));

    res.json({
      success: true,
      data: segmentsWithColors
    });
  } catch (error) {
    console.error('❌ Error getting customer segments:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting customer segments',
      error: error.message
    });
  }
});

// Admin Analytics - Conversion Metrics
app.get('/api/admin/analytics/conversion', authenticateAdmin, async (req, res) => {
  try {
    // Dönüşüm oranı, sepet ortalaması, CLV
    const [conversionData] = await poolWrapper.execute(`
      SELECT 
        (COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.userId END) * 100.0 / 
         NULLIF(COUNT(DISTINCT u.id), 0)) as conversionRate,
        AVG(CASE WHEN o.status != 'cancelled' THEN o.totalAmount ELSE NULL END) as avgCartValue,
        AVG(CASE WHEN o.status != 'cancelled' THEN customerLifetimeValue ELSE NULL END) as avgCLV
      FROM users u
      LEFT JOIN orders o ON u.id = o.userId
      LEFT JOIN (
        SELECT 
          userId,
          SUM(totalAmount) as customerLifetimeValue
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY userId
      ) as clv ON u.id = clv.userId
    `);

    // Geçen ay ile karşılaştırma
    const [lastMonthData] = await poolWrapper.execute(`
      SELECT 
        (COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.userId END) * 100.0 / 
         NULLIF(COUNT(DISTINCT u.id), 0)) as conversionRate,
        AVG(CASE WHEN o.status != 'cancelled' THEN o.totalAmount ELSE NULL END) as avgCartValue,
        AVG(CASE WHEN o.status != 'cancelled' THEN customerLifetimeValue ELSE NULL END) as avgCLV
      FROM users u
      LEFT JOIN orders o ON u.id = o.userId AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
        AND o.createdAt < DATE_SUB(NOW(), INTERVAL 0 MONTH)
      LEFT JOIN (
        SELECT 
          userId,
          SUM(totalAmount) as customerLifetimeValue
        FROM orders
        WHERE status != 'cancelled' AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
          AND createdAt < DATE_SUB(NOW(), INTERVAL 0 MONTH)
        GROUP BY userId
      ) as clv ON u.id = clv.userId
    `);

    const current = conversionData[0] || {};
    const lastMonth = lastMonthData[0] || {};

    res.json({
      success: true,
      data: {
        conversionRate: parseFloat(current.conversionRate || 0).toFixed(1),
        lastMonthConversionRate: parseFloat(lastMonth.conversionRate || 0).toFixed(1),
        avgCartValue: parseFloat(current.avgCartValue || 0).toFixed(0),
        lastMonthAvgCartValue: parseFloat(lastMonth.avgCartValue || 0).toFixed(0),
        avgCLV: parseFloat(current.avgCLV || 0).toFixed(0),
        lastMonthAvgCLV: parseFloat(lastMonth.avgCLV || 0).toFixed(0)
      }
    });
  } catch (error) {
    console.error('❌ Error getting conversion metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting conversion metrics',
      error: error.message
    });
  }
});

// Admin - Google Maps Data Scraper (placeholder)
// POST /api/admin/scrapers/google-maps { query, city }
app.post('/api/admin/scrapers/google-maps', authenticateAdmin, async (req, res) => {
  try {
    const { query, city } = req.body || {};
    const normalizedCity = String(city || '').trim() || 'Konya';
    const normalizedQuery = String(query || '').trim() || 'bayi';

    const sample = [
      {
        name: 'Örnek İşletme 1',
        address: `${normalizedCity} Merkez`,
        city: normalizedCity,
        phone: '+90 332 000 00 00',
        website: 'https://ornek1.com',
        locationUrl: 'https://maps.google.com/?q=' + encodeURIComponent(`${normalizedCity} Merkez`),
      },
      {
        name: 'Örnek İşletme 2',
        address: `${normalizedCity} İlçesi`,
        city: normalizedCity,
        phone: '+90 332 111 11 11',
        website: '',
        locationUrl: 'https://maps.google.com/?q=' + encodeURIComponent(`${normalizedCity} İlçesi`),
      },
      {
        name: 'Örnek İşletme 3',
        address: `${normalizedCity} Sanayi`,
        city: normalizedCity,
        phone: '',
        website: 'https://ornek3.com',
        locationUrl: 'https://maps.google.com/?q=' + encodeURIComponent(`${normalizedCity} Sanayi`),
      },
    ];

    const terms = normalizedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = sample.filter((r) =>
      terms.length === 0 || terms.some((t) => (r.name || '').toLowerCase().includes(t))
    );

    return res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('❌ Google Maps scraper error:', error);
    return res.status(500).json({ success: false, message: 'Scraper error' });
  }
});

// Admin Security: list security events
app.get('/api/admin/security/login-attempts', authenticateAdmin, async (req, res) => {
  try {
    const range = Math.max(1, Math.min(365, parseInt(req.query.range || '7')));
    const q = (req.query.q || '').toString().trim();
    const ip = (req.query.ip || '').toString().trim();
    
    // SQL Injection koruması: Parametreli WHERE clause
    const conditions = [
      ['detectedAt', '>=', `DATE_SUB(NOW(), INTERVAL ${range} DAY)`],
      ['eventType', '=', 'BRUTE_FORCE']
    ];
    
    if (q) {
      // JSON_EXTRACT için özel işleme - parametreli sorgu
      conditions.push(['username', 'LIKE', q]);
      // JSON_EXTRACT için ayrı bir condition eklenemez, bu yüzden OR ile birleştiriyoruz
    }
    if (ip) {
      conditions.push(['ip', 'LIKE', ip]);
    }
    
    // Güvenli WHERE clause builder kullan
    const whereParts = [];
    const params = [];
    
    // Date filter için özel işleme
    whereParts.push('detectedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)');
    params.push(range);
    
    whereParts.push('eventType = ?');
    params.push('BRUTE_FORCE');
    
    if (q) {
      whereParts.push('(username LIKE ? OR JSON_EXTRACT(details, "$.email") LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (ip) {
      whereParts.push('ip LIKE ?');
      params.push(`%${ip}%`);
    }
    
    const whereClause = 'WHERE ' + whereParts.join(' AND ');
    
    const [rows] = await poolWrapper.execute(
      `SELECT id, eventType, username, ip, userAgent, details, severity, detectedAt, resolved, resolvedAt 
       FROM security_events ${whereClause} ORDER BY detectedAt DESC LIMIT 500`,
      params
    );
    const data = rows.map(r => ({
      id: r.id,
      eventType: r.eventType,
      username: r.username,
      ip: r.ip,
      userAgent: r.userAgent,
      details: (typeof r.details === 'string' ? (() => { try { return JSON.parse(r.details); } catch (_) { return { raw: r.details }; } })() : r.details) || {},
      severity: r.severity,
      timestamp: r.detectedAt,
      resolved: !!r.resolved,
      resolvedAt: r.resolvedAt
    }));
    res.json({ success: true, data });
  } catch (e) {
    console.error('❌ Error listing security events:', e);
    res.status(500).json({ success: false, message: 'Security events could not be loaded' });
  }
});

// Admin Security: server resource usage
app.get('/api/admin/security/server-stats', authenticateAdmin, async (req, res) => {
  try {
    const os = require('os');
    const load = os.loadavg ? os.loadavg() : [0, 0, 0];
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;
    const cpuCount = os.cpus()?.length || 1;
    const uptime = os.uptime();
    res.json({
      success: true,
      data: {
        cpu: { cores: cpuCount, load1: load[0] || 0, load5: load[1] || 0, load15: load[2] || 0 },
        memory: { total: memTotal, used: memUsed, free: memFree, usedPercent: memTotal ? (memUsed / memTotal) * 100 : 0 },
        uptimeSeconds: uptime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error('❌ Error getting server stats:', e);
    res.status(500).json({ success: false, message: 'Failed to read server stats' });
  }
});

// Admin - Top Customers (most orders and total spent)
app.get('/api/admin/top-customers', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10');
    const [rows] = await poolWrapper.execute(`
      SELECT 
        u.id as userId,
        u.name,
        u.email,
        u.phone,
        COUNT(o.id) AS orderCount,
        COALESCE(SUM(o.totalAmount), 0) AS totalSpent,
        MAX(o.createdAt) AS lastOrderAt
      FROM users u
      JOIN orders o ON o.userId = u.id
      WHERE o.status != 'cancelled'
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY orderCount DESC, totalSpent DESC
      LIMIT ?
    `, [limit]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting top customers:', error);
    res.status(500).json({ success: false, message: 'Error getting top customers' });
  }
});

// Admin - User management
app.put('/api/admin/users/:id/role', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Geçersiz rol' });
    }
    await poolWrapper.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.json({ success: true, message: 'Kullanıcı rolü güncellendi' });
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({ success: false, message: 'Error updating user role' });
  }
});

app.put('/api/admin/users/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive } = req.body || {};
    const activeVal = !!isActive;
    await poolWrapper.execute('UPDATE users SET isActive = ? WHERE id = ?', [activeVal, userId]);
    res.json({ success: true, message: 'Kullanıcı durumu güncellendi' });
  } catch (error) {
    console.error('❌ Error updating user status:', error);
    res.status(500).json({ success: false, message: 'Error updating user status' });
  }
});

app.post('/api/admin/users/:id/reset-password', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    let { newPassword } = req.body || {};
    if (!newPassword) newPassword = Math.random().toString(36).slice(-10);
    const hashed = await hashPassword(newPassword);
    await poolWrapper.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    res.json({ success: true, message: 'Şifre sıfırlandı', data: { newPassword } });
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Admin - change own password (berat1 account)
app.post('/api/admin/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mevcut ve yeni şifre gerekli' });
    }
    const ADMIN_EMAIL = 'berat1@admin.local';
    const [rows] = await poolWrapper.execute('SELECT id, password FROM users WHERE email = ? AND role = "admin" LIMIT 1', [ADMIN_EMAIL]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Admin bulunamadı' });
    const ok = await verifyPassword(currentPassword, rows[0].password);
    if (!ok) return res.status(401).json({ success: false, message: 'Mevcut şifre hatalı' });
    const hashedNew = await hashPassword(newPassword);
    await poolWrapper.execute('UPDATE users SET password = ? WHERE id = ?', [hashedNew, rows[0].id]);
    return res.json({ success: true, message: 'Şifre güncellendi' });
  } catch (error) {
    console.error('❌ change-password error:', error);
    res.status(500).json({ success: false, message: 'Şifre güncellenemedi' });
  }
});

// Admin - full backup (export all tables for active tenant)
app.get('/api/admin/backup', authenticateAdmin, async (req, res) => {
  try {
    const [tenantRows] = await poolWrapper.execute('SELECT id FROM tenants WHERE isActive = true ORDER BY id ASC LIMIT 1');
    if (tenantRows.length === 0) return res.status(404).json({ success: false, message: 'Aktif tenant yok' });
    const tenantId = tenantRows[0].id;

    // Kapsamlı tablo listesi (şemadaki tüm işlevsel tablolar)
    const tables = [
      'tenants',
      'users',
      'categories',
      'products', 'product_variations', 'product_variation_options',
      'orders', 'order_items', 'cart',
      'user_wallets', 'wallet_transactions', 'wallet_recharge_requests',
      'custom_production_requests', 'custom_production_items',
      'reviews', 'security_events', 'chatbot_analytics', 'referral_earnings',
      'recommendations',
      'customer_segments', 'customer_segment_assignments', 'campaigns', 'campaign_usage', 'customer_analytics',
      'discount_wheel_spins'
    ];
    const data = {};
    for (const t of tables) {
      try {
        let rows;
        if (t === 'tenants') {
          [rows] = await poolWrapper.execute('SELECT * FROM tenants WHERE id = ?', [tenantId]);
        } else {
          // GÜVENLİK: SQL Injection koruması - Güçlendirilmiş table identifier kullan
          try {
            // 1. Table name validasyonu (whitelist, format, SQL keyword kontrolü)
            const safeTableName = DatabaseSecurity.safeTableIdentifier(t);
            
            // 2. SQL query validation (ekstra güvenlik katmanı)
            const sqlQuery1 = `SELECT * FROM ${safeTableName} WHERE tenantId = ?`;
            DatabaseSecurity.validateQuery(sqlQuery1, [tenantId]);
            
            // 3. Önce tenantId filtresiyle dene
            try {
              [rows] = await poolWrapper.execute(sqlQuery1, [tenantId]);
            } catch (e1) {
              // tenantId kolonu yoksa tüm satırları al (bazı ilişkisel tablolar)
              // GÜVENLİK: Parametresiz sorgu için de validation
              const sqlQuery2 = `SELECT * FROM ${safeTableName}`;
              DatabaseSecurity.validateQuery(sqlQuery2, []);
              
              try {
                [rows] = await poolWrapper.execute(sqlQuery2);
              } catch (e2) {
                console.warn('Backup table skip:', t, e2.message);
                rows = [];
              }
            }
          } catch (tableError) {
            // Table validation başarısız
            console.warn(`⚠️ Backup table "${t}" validation failed:`, tableError.message);
            rows = [];
          }
        }
        data[t] = rows;
      } catch (err) {
        console.warn('Backup table error:', t, err.message);
        data[t] = [];
      }
    }
    return res.json({ success: true, tenantId, exportedAt: new Date().toISOString(), data });
  } catch (error) {
    console.error('❌ Backup error:', error);
    res.status(500).json({ success: false, message: 'Backup alınamadı' });
  }
});

// Admin - full restore (dangerous)
app.post('/api/admin/restore', authenticateAdmin, async (req, res) => {
  const conn = await poolWrapper.getConnection();
  try {
    const payload = req.body || {};
    const data = payload.data || {};
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: 'Geçersiz veri' });
    }

    await conn.beginTransaction();
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

    const tableOrder = [
      // child -> parent sırası silme için
      'order_items', 'orders',
      'product_variation_options', 'product_variations', 'products', 'categories',
      'cart',
      'wallet_transactions', 'user_wallets', 'wallet_recharge_requests',
      'custom_production_items', 'custom_production_requests',
      'campaign_usage', 'campaigns', 'customer_segment_assignments', 'customer_segments',
      'customer_analytics',
      'reviews', 'recommendations', 'chatbot_analytics', 'referral_earnings', 'discount_wheel_spins',
      'security_events',
      'users',
      'tenants'
    ];

    // GÜVENLİK: Truncate then insert - Güçlendirilmiş SQL Injection koruması
    for (const t of tableOrder) {
      try { 
        // 1. Table name validasyonu
        const safeTableName = DatabaseSecurity.safeTableIdentifier(t);
        
        // 2. SQL query validation
        const deleteSql = `DELETE FROM ${safeTableName}`;
        DatabaseSecurity.validateQuery(deleteSql, []);
        
        await conn.execute(deleteSql); 
      } catch (deleteError) {
        console.warn(`⚠️ Restore delete failed for table "${t}":`, deleteError.message);
      }
    }
    
    for (const t of Object.keys(data)) {
      try {
        // 1. Table name whitelist kontrolü ve validasyon
        const safeTableName = DatabaseSecurity.safeTableIdentifier(t);
        
        const rows = Array.isArray(data[t]) ? data[t] : [];
        if (rows.length === 0) continue;
        
        const cols = Object.keys(rows[0]);
        
        // 2. Column name'leri güvenli hale getir
        const safeCols = cols.map(c => {
          try {
            return DatabaseSecurity.safeColumnIdentifier(c);
          } catch (colError) {
            throw new Error(`Invalid column name "${c}" in table "${t}": ${colError.message}`);
          }
        });
        
        // 3. SQL query oluştur ve validate et
        const placeholders = '(' + cols.map(() => '?').join(',') + ')';
        const sql = `INSERT INTO ${safeTableName} (${safeCols.join(',')}) VALUES ${rows.map(() => placeholders).join(',')}`;
        
        // 4. SQL query validation (ekstra güvenlik)
        const values = [];
        rows.forEach(r => cols.forEach(c => values.push(r[c])));
        DatabaseSecurity.validateQuery(sql, values);
        
        // 5. Execute query
        await conn.execute(sql, values);
      } catch (restoreError) {
        console.warn(`⚠️ Restore insert failed for table "${t}":`, restoreError.message);
      }
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();
    res.json({ success: true, message: 'Veriler geri yüklendi' });
  } catch (error) {
    try { await conn.rollback(); } catch (_) { }
    console.error('❌ Restore error:', error);
    res.status(500).json({ success: false, message: 'Geri yükleme başarısız' });
  } finally {
    try { await conn.release(); } catch (_) { }
  }
});
// Admin - List carts summary per user
app.get('/api/admin/carts', authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(`
      SELECT u.id as userId, u.name as userName, u.email as userEmail,
             COUNT(c.id) as itemLines,
             COALESCE(SUM(c.quantity),0) as totalQuantity
      FROM users u
      LEFT JOIN cart c ON c.userId = u.id
      GROUP BY u.id, u.name, u.email
      ORDER BY totalQuantity DESC, itemLines DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error listing carts:', error);
    res.status(500).json({ success: false, message: 'Error listing carts' });
  }
});

// Admin - Gift cards list
app.get('/api/admin/gift-cards', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT id, code, fromUserId, recipient, recipientUserId, amount, status, expiresAt, usedAt, createdAt
       FROM gift_cards
       WHERE tenantId = ?
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting gift cards:', error);
    res.status(500).json({ success: false, message: 'Error getting gift cards' });
  }
});

// Admin - Create gift card
app.post('/api/admin/gift-cards', authenticateAdmin, async (req, res) => {
  try {
    const { code, amount, recipient, recipientUserId, expiresAt, fromUserId } = req.body || {};
    if (!code || !amount || !expiresAt) {
      return res.status(400).json({ success: false, message: 'code, amount, expiresAt required' });
    }
    const [result] = await poolWrapper.execute(
      `INSERT INTO gift_cards (code, fromUserId, recipient, recipientUserId, amount, status, tenantId, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, 'active', ?, NOW(), ?)` ,
      [code, fromUserId || 1, recipient || null, recipientUserId || null, amount, req.tenant?.id || 1, expiresAt]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('❌ Error creating gift card:', error);
    res.status(500).json({ success: false, message: 'Error creating gift card' });
  }
});

// Admin - Update gift card status
app.put('/api/admin/gift-cards/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body || {};
    const allowed = ['active', 'used', 'expired', 'cancelled'];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await poolWrapper.execute(
      `UPDATE gift_cards SET status = ?, updatedAt = NOW() WHERE id = ? AND tenantId = ?`,
      [status, id, req.tenant?.id || 1]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating gift card status:', error);
    res.status(500).json({ success: false, message: 'Error updating gift card status' });
  }
});

// Admin - Payment transactions
app.get('/api/admin/payment-transactions', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT id, orderId, paymentId, provider, amount, currency, status, createdAt
       FROM payment_transactions
       WHERE tenantId = ?
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting payment transactions:', error);
    res.status(500).json({ success: false, message: 'Error getting payment transactions' });
  }
});

// Admin - Update order status
app.patch('/api/admin/orders/:orderId/status', authenticateAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { status } = req.body || {};
    const allowed = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await poolWrapper.execute(`UPDATE orders SET status = ?, updatedAt = NOW() WHERE id = ? AND tenantId = ?`, [status, orderId, req.tenant?.id || 1]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
});

// Admin - Update order shipping info
app.patch('/api/admin/orders/:orderId/shipping', authenticateAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { trackingNumber, cargoCompany, cargoStatus } = req.body || {};
    const cargoAllowed = ['preparing', 'shipped', 'in-transit', 'delivered', null, undefined];
    if (!cargoAllowed.includes(cargoStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid cargoStatus' });
    }
    await poolWrapper.execute(
      `UPDATE orders SET trackingNumber = ?, cargoCompany = ?, cargoStatus = ?, updatedAt = NOW() WHERE id = ? AND tenantId = ?`,
      [trackingNumber || null, cargoCompany || null, cargoStatus || null, orderId, req.tenant?.id || 1]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating shipping info:', error);
    res.status(500).json({ success: false, message: 'Error updating shipping info' });
  }
});

// Admin - Return requests
app.get('/api/admin/return-requests', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT rr.id, rr.userId, rr.orderId, rr.orderItemId, rr.reason, rr.status, rr.requestDate, rr.refundAmount, rr.createdAt,
              u.name as customerName
       FROM return_requests rr
       LEFT JOIN users u ON u.id = rr.userId
       WHERE rr.tenantId = ?
       ORDER BY rr.requestDate DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting return requests:', error);
    res.status(500).json({ success: false, message: 'Error getting return requests' });
  }
});

// Admin - User discount codes
app.get('/api/admin/user-discount-codes', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT udc.id, udc.userId, u.name as userName, udc.discountCode, udc.discountType, udc.discountValue, udc.isUsed, udc.expiresAt, udc.createdAt
       FROM user_discount_codes udc
       LEFT JOIN users u ON u.id = udc.userId
       WHERE udc.tenantId = ?
       ORDER BY udc.createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting user discount codes:', error);
    res.status(500).json({ success: false, message: 'Error getting user discount codes' });
  }
});

// Admin - Create user discount code
app.post('/api/admin/user-discount-codes', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { userId, discountType, discountValue, expiresAt, discountCode, code } = req.body || {};
    const finalDiscountCode = discountCode || code; // Backward compatibility
    if (!userId || !discountType || typeof discountValue === 'undefined') {
      return res.status(400).json({ success: false, message: 'userId, discountType, discountValue required' });
    }
    const allowed = ['percentage', 'fixed'];
    if (!allowed.includes(String(discountType))) {
      return res.status(400).json({ success: false, message: 'Invalid discountType' });
    }
    const valueNum = parseFloat(discountValue);
    if (isNaN(valueNum) || valueNum <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid discountValue' });
    }

    // Generate code if not provided
    const genCode = finalDiscountCode || `USR${userId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await poolWrapper.execute(
      `INSERT INTO user_discount_codes (tenantId, userId, discountCode, discountType, discountValue, expiresAt, isUsed)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [tenantId, userId, genCode, discountType, valueNum, expiresAt || new Date(Date.now() + 30 * 86400000)]
    );
    res.json({ success: true, data: { code: genCode } });
  } catch (error) {
    console.error('❌ Error creating user discount code:', error);
    res.status(500).json({ success: false, message: 'Error creating discount code' });
  }
});

// Admin - Wallet recharge requests
app.get('/api/admin/wallet-recharge-requests', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT 
         w.id, w.userId, u.name AS userName, u.email AS userEmail, u.phone AS userPhone,
         w.amount, w.paymentMethod, w.bankInfo, w.status, w.errorMessage, w.approvedBy, w.createdAt, w.completedAt
       FROM wallet_recharge_requests w
       LEFT JOIN users u ON u.id = w.userId
       WHERE w.tenantId = ?
       ORDER BY w.createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting wallet recharge requests:', error);
    res.status(500).json({ success: false, message: 'Error getting wallet recharge requests' });
  }
});

// Admin - Wallet withdraw requests
app.get('/api/admin/wallet-withdraw-requests', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const tenantId = req.tenant?.id || 1;
    
    // Önce tablo var mı kontrol et
    try {
      const [rows] = await poolWrapper.execute(
        `SELECT 
           w.id, w.userId, u.name AS userName, u.email AS userEmail, u.phone AS userPhone,
           w.amount, w.bankInfo, w.status, w.errorMessage, w.approvedBy, w.createdAt, w.completedAt
         FROM wallet_withdraw_requests w
         LEFT JOIN users u ON u.id = w.userId
         WHERE w.tenantId = ?
         ORDER BY w.createdAt DESC
         LIMIT ? OFFSET ?`,
        [tenantId, limit, offset]
      );
      res.json({ success: true, data: rows || [] });
    } catch (tableError) {
      // Tablo yoksa boş array döndür
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        console.warn('⚠️ wallet_withdraw_requests table does not exist yet');
        res.json({ success: true, data: [] });
      } else {
        throw tableError;
      }
    }
  } catch (error) {
    console.error('❌ Error getting wallet withdraw requests:', error);
    res.json({ success: true, data: [] });
  }
});

// Admin - Update wallet withdraw request status
app.post('/api/admin/wallet-withdraw-requests/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body || {};
    const tenantId = req.tenant?.id || 1;
    const allowed = ['pending', 'pending_approval', 'completed', 'failed', 'cancelled'];
    
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    try {
      await poolWrapper.execute(
        `UPDATE wallet_withdraw_requests 
         SET status = ?, approvedBy = ?, completedAt = NOW() 
         WHERE id = ? AND tenantId = ?`,
        [status, req.user?.id || null, id, tenantId]
      );
      res.json({ success: true, message: 'Status updated' });
    } catch (tableError) {
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        res.status(404).json({ success: false, message: 'Table does not exist' });
      } else {
        throw tableError;
      }
    }
  } catch (error) {
    console.error('❌ Error updating wallet withdraw request status:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

async function handleRechargeStatus(req, res) {
  try {
    const id = String(req.params.id);
    const { status } = req.body || {};
    const allowed = ['pending', 'pending_approval', 'completed', 'failed', 'cancelled'];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Fetch request details
    const [rows] = await poolWrapper.execute(`SELECT * FROM wallet_recharge_requests WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found' });
    const reqRow = rows[0];

    // Update request status
    await poolWrapper.execute(
      `UPDATE wallet_recharge_requests SET status = ?, completedAt = CASE WHEN ? = 'completed' THEN NOW() ELSE completedAt END WHERE id = ?`,
      [status, status, id]
    );

    // If completed, credit wallet and log transaction
    if (status === 'completed') {
      const tenantId = req.tenant?.id || 1;
      const userId = reqRow.userId;
      const amount = parseFloat(reqRow.amount || 0);
      if (!isNaN(amount) && amount > 0 && userId) {
        await poolWrapper.execute(
          `INSERT INTO user_wallets (tenantId, userId, balance, currency)
           VALUES (?, ?, 0, 'TRY')
           ON DUPLICATE KEY UPDATE balance = balance`,
          [tenantId, userId]
        );
        await poolWrapper.execute(
          `UPDATE user_wallets SET balance = balance + ? WHERE tenantId = ? AND userId = ?`,
          [amount, tenantId, userId]
        );
        await poolWrapper.execute(
          `INSERT INTO wallet_transactions (tenantId, userId, type, amount, description, status)
           VALUES (?, ?, 'credit', ?, 'Admin approved recharge', 'completed')`,
          [tenantId, userId, amount]
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating recharge request:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
}

app.patch('/api/admin/wallet-recharge-requests/:id/status', authenticateAdmin, handleRechargeStatus);
// Alias to support POST from admin panel
app.post('/api/admin/wallet-recharge-requests/:id/status', authenticateAdmin, handleRechargeStatus);

// Admin - Referral earnings
app.get('/api/admin/referral-earnings', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT re.id, re.referrer_id, rf.name as referrerName, re.referred_id, rd.name as referredName, re.amount, re.status, re.createdAt, re.paidAt
       FROM referral_earnings re
       LEFT JOIN users rf ON rf.id = re.referrer_id
       LEFT JOIN users rd ON rd.id = re.referred_id
       WHERE re.tenantId = ?
       ORDER BY re.createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting referral earnings:', error);
    res.status(500).json({ success: false, message: 'Error getting referral earnings' });
  }
});

// Admin - Discount wheel spins
app.get('/api/admin/discount-wheel-spins', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT dws.id, dws.userId, u.name as userName, dws.deviceId, dws.spinResult, dws.discountCode, dws.isUsed, dws.usedAt, dws.createdAt, dws.expiresAt
       FROM discount_wheel_spins dws
       LEFT JOIN users u ON u.id = dws.userId
       WHERE dws.tenantId = ?
       ORDER BY dws.createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting wheel spins:', error);
    res.status(500).json({ success: false, message: 'Error getting wheel spins' });
  }
});

// Admin - User events
app.get('/api/admin/user-events', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT ue.id, ue.userId, u.name as userName, ue.productId, ue.eventType, ue.eventValue, ue.searchQuery, ue.createdAt
       FROM user_events ue
       LEFT JOIN users u ON u.id = ue.userId
       WHERE ue.tenantId = ?
       ORDER BY ue.createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting user events:', error);
    res.status(500).json({ success: false, message: 'Error getting user events' });
  }
});

// ==================== USER NOTIFICATIONS ====================

// Get user notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID required' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    let query = `SELECT id, title, message, type, isRead, readAt, data, createdAt
                 FROM user_notifications
                 WHERE userId = ? AND tenantId = ?`;
    const params = [userId, req.tenant?.id || 1];

    if (unreadOnly) {
      query += ' AND isRead = false';
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await poolWrapper.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    res.status(500).json({ success: false, message: 'Error getting notifications' });
  }
});

// Get unread notification count
app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID required' });
    }

    const [result] = await poolWrapper.execute(
      `SELECT COUNT(*) as count
       FROM user_notifications
       WHERE userId = ? AND tenantId = ? AND isRead = false`,
      [userId, req.tenant?.id || 1]
    );

    res.json({ success: true, count: result[0]?.count || 0 });
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({ success: false, message: 'Error getting unread count' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user?.id || req.body.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID required' });
    }

    await poolWrapper.execute(
      `UPDATE user_notifications
       SET isRead = true, readAt = NOW()
       WHERE id = ? AND userId = ? AND tenantId = ?`,
      [notificationId, userId, req.tenant?.id || 1]
    );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Error marking notification as read' });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', validateUserIdMatch('body'), async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID required' });
    }

    await poolWrapper.execute(
      `UPDATE user_notifications
       SET isRead = true, readAt = NOW()
       WHERE userId = ? AND tenantId = ? AND isRead = false`,
      [userId, req.tenant?.id || 1]
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Error marking all notifications as read' });
  }
});

// ==================== ADMIN NOTIFICATIONS ====================

// Admin - Send notification to user(s)
app.post('/api/admin/notifications/send', authenticateAdmin, async (req, res) => {
  try {
    const { userIds, userId, title, message, type = 'info', data } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const tenantId = req.tenant?.id || 1;
    let targetUserIds = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Multiple users
      targetUserIds = userIds;
    } else if (userId) {
      // Single user
      targetUserIds = [userId];
    } else {
      return res.status(400).json({ success: false, message: 'userId or userIds array required' });
    }

    // Validate users exist
    const placeholders = targetUserIds.map(() => '?').join(',');
    const [users] = await poolWrapper.execute(
      `SELECT id FROM users WHERE id IN (${placeholders}) AND tenantId = ?`,
      [...targetUserIds, tenantId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid users found' });
    }

    // Insert notifications
    const dataJson = data ? JSON.stringify(data) : null;
    const insertPromises = users.map(user => 
      poolWrapper.execute(
        `INSERT INTO user_notifications (tenantId, userId, title, message, type, data)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tenantId, user.id, title, message, type, dataJson]
      )
    );
    
    await Promise.all(insertPromises);

    res.json({ 
      success: true, 
      message: `Notification sent to ${users.length} user(s)`,
      sentCount: users.length
    });
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ success: false, message: 'Error sending notification' });
  }
});

// Admin - Get all notifications (for admin view)
app.get('/api/admin/notifications', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.query.userId;

    let query = `SELECT un.id, un.userId, u.name as userName, u.email, un.title, un.message, un.type, un.isRead, un.readAt, un.createdAt
                  FROM user_notifications un
                  LEFT JOIN users u ON u.id = un.userId
                  WHERE un.tenantId = ?`;
    const params = [req.tenant?.id || 1];

    if (userId) {
      query += ' AND un.userId = ?';
      params.push(userId);
    }

    query += ' ORDER BY un.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await poolWrapper.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting admin notifications:', error);
    res.status(500).json({ success: false, message: 'Error getting notifications' });
  }
});

// Admin - Customer analytics
app.get('/api/admin/customer-analytics', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT ca.id, ca.userId, u.name as userName, ca.totalOrders, ca.totalSpent, ca.averageOrderValue, ca.lastOrderDate, ca.customerLifetimeValue, ca.lastActivityDate
       FROM customer_analytics ca
       LEFT JOIN users u ON u.id = ca.userId
       WHERE ca.tenantId = ?
       ORDER BY ca.lastActivityDate DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting customer analytics:', error);
    res.status(500).json({ success: false, message: 'Error getting customer analytics' });
  }
});

// Admin - Recommendations (raw)
app.get('/api/admin/recommendations', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT id, userId, recommendedProducts, generatedAt
       FROM recommendations
       WHERE tenantId = ?
       ORDER BY generatedAt DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting recommendations:', error);
    res.status(500).json({ success: false, message: 'Error getting recommendations' });
  }
});

// Admin - User profiles
app.get('/api/admin/user-profiles', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await poolWrapper.execute(
      `SELECT up.userId, u.name as userName, up.interests, up.brandPreferences, up.avgPriceMin, up.avgPriceMax, up.discountAffinity, up.lastActive, up.totalEvents
       FROM user_profiles up
       LEFT JOIN users u ON u.id = up.userId
       WHERE up.tenantId = ?
       ORDER BY up.lastActive DESC
       LIMIT ? OFFSET ?`,
      [req.tenant?.id || 1, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting user profiles:', error);
    res.status(500).json({ success: false, message: 'Error getting user profiles' });
  }
});

// Admin - Server stats (read-only, lightweight)
// In-memory network sampling buffer
let __netSample = { lastBytesRx: 0, lastBytesTx: 0, lastTs: 0 };

app.get('/api/admin/server-stats', authenticateAdmin, async (req, res) => {
  try {
    const os = require('os');
    const si = require('systeminformation');

    // CPU and RAM
    const cpus = os.cpus() || [];
    const load = os.loadavg ? os.loadavg()[0] : 0; // 1-min load
    const cpuUsage = cpus.length ? Math.min(100, Math.max(0, (load / cpus.length) * 100)) : 0;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(0, totalMem - freeMem);
    const ramUsage = totalMem ? (usedMem / totalMem) * 100 : 0;

    // Disk usage via systeminformation
    let diskUsage = 0;
    let storageTotal = null;
    let storageUsed = null;
    try {
      const fsList = await si.fsSize();
      if (Array.isArray(fsList) && fsList.length > 0) {
        // Aggregate root-like mount points
        const total = fsList.reduce((s, d) => s + (Number(d.size) || 0), 0);
        const used = fsList.reduce((s, d) => s + (Number(d.used) || 0), 0);
        storageTotal = Math.round(total / (1024 * 1024 * 1024));
        storageUsed = Math.round(used / (1024 * 1024 * 1024));
        diskUsage = total > 0 ? Math.round((used / total) * 100) : 0;
      }
    } catch { }

    // Network speed sampling (approx.)
    let networkSpeed = 0; // Mbps (download)
    let networkHistory = [];
    try {
      const nets = await si.networkStats();
      // Sum across interfaces
      const rx = nets.reduce((s, n) => s + (Number(n.rx_bytes_total || n.rx_bytes || 0)), 0);
      const tx = nets.reduce((s, n) => s + (Number(n.tx_bytes_total || n.tx_bytes || 0)), 0);
      const now = Date.now();
      if (__netSample.lastTs && now > __netSample.lastTs) {
        const dtSec = (now - __netSample.lastTs) / 1000;
        const drx = Math.max(0, rx - __netSample.lastBytesRx);
        // bits/sec to Mbps
        networkSpeed = Math.round(((drx * 8) / dtSec) / 1e6);
      }
      __netSample = { lastBytesRx: rx, lastBytesTx: tx, lastTs: now };

      // Build a tiny history with current point; UI already can show blank gracefully
      const hh = new Date().toTimeString().slice(0, 5);
      networkHistory = [
        { time: hh, download: networkSpeed, upload: 0 }
      ];
    } catch { }

    const uptimeSec = os.uptime ? os.uptime() : Math.floor(process.uptime());
    const serverItem = {
      name: 'App Server',
      status: 'online',
      uptime: `${(uptimeSec / 86400).toFixed(2)}d`,
      load: Math.round(cpuUsage),
      ip: (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString()
    };

    const processes = [
      { name: 'node', cpu: Math.round(cpuUsage / 2), memory: Math.round(process.memoryUsage().rss / (1024 * 1024)), status: 'running' }
    ];

    // Simple CPU history snapshot based on current
    const cpuHistory = [
      { time: 'now', value: Math.round(cpuUsage) }
    ];

    res.json({
      success: true,
      data: {
        cpuUsage,
        ramUsage,
        diskUsage,
        networkSpeed,
        cpuHistory,
        networkHistory,
        servers: [serverItem],
        processes,
        totals: {
          storageTotal,
          storageUsed,
          ramTotal: Math.round(totalMem / (1024 * 1024 * 1024)),
          ramUsed: Math.round(usedMem / (1024 * 1024 * 1024)),
          activeServers: 1,
          totalServers: 1
        }
      }
    });
  } catch (error) {
    console.error('❌ Server stats error:', error);
    res.status(500).json({ success: false, message: 'Server stats unavailable' });
  }
});

// Admin - SQL utilities (read-only)
app.get('/api/admin/sql/tables', authenticateAdmin, async (req, res) => {
  try {
    const [tables] = await poolWrapper.execute(
      `SELECT TABLE_NAME as name
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME`
    );
    const limit = 5;
    const result = [];
    for (const t of tables) {
      try {
        const [cols] = await poolWrapper.execute(`SHOW COLUMNS FROM \`${t.name}\``);
        const [cnt] = await poolWrapper.execute(`SELECT COUNT(*) as c FROM \`${t.name}\``);
        result.push({ name: t.name, columns: cols.map(c => c.Field), rowCount: cnt[0]?.c || 0 });
        if (result.length >= 50) break; // avoid heavy payload
      } catch { }
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error listing tables:', error);
    res.status(500).json({ success: false, message: 'Error listing tables' });
  }
});

// =========================
// ADMIN - FILE MANAGER (READ-ONLY + DELETE)
// =========================
const SAFE_BASE_DIR = process.env.FILE_MANAGER_BASE || path.resolve(__dirname, '..');

// isPathInside fonksiyonu artık utils/path-security.js'den import ediliyor
// Eski implementasyon güvenlik açıkları içeriyordu

app.get('/api/admin/files', authenticateAdmin, async (req, res) => {
  try {
    let relPath = String(req.query.path || '/');

    // Güvenli path oluştur (path traversal koruması ile)
    let targetPath;
    try {
      if (relPath === '/' || relPath === '') {
        targetPath = SAFE_BASE_DIR;
      } else {
        targetPath = createSafePath(relPath, SAFE_BASE_DIR);
      }
    } catch (pathError) {
      logError(pathError, 'FILE_MANAGER_PATH');
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.json({ success: true, data: [] });
    }

    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      return res.json({ success: true, data: [] });
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const list = entries.map(e => {
      const full = path.join(targetPath, e.name);
      const s = fs.statSync(full);
      return {
        name: e.name,
        path: path.join(relPath === '/' ? '' : relPath, e.name).replace(/\\/g, '/'),
        type: e.isDirectory() ? 'dir' : 'file',
        size: s.isFile() ? s.size : undefined,
        modifiedAt: s.mtime.toISOString()
      };
    });
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('❌ files list', error);
    res.status(500).json({ success: false, message: 'Error listing files' });
  }
});

app.delete('/api/admin/files', authenticateAdmin, async (req, res) => {
  try {
    let relPath = String(req.query.path || '');

    // Güvenli path oluştur (path traversal koruması ile)
    let targetPath;
    try {
      if (relPath === '/' || relPath === '') {
        return res.status(400).json({ success: false, message: 'Cannot delete root directory' });
      }
      targetPath = createSafePath(relPath, SAFE_BASE_DIR);
    } catch (pathError) {
      logError(pathError, 'FILE_DELETE_PATH');
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      fs.rmdirSync(targetPath, { recursive: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    res.json({ success: true });
  } catch (error) {
    logError(error, 'FILE_DELETE');
    const errorResponse = createSafeErrorResponse(error, 'Error deleting file');
    res.status(500).json(errorResponse);
  }
});

// Optional: file download (read-only)
app.get('/api/admin/files/download', authenticateAdmin, async (req, res) => {
  try {
    let relPath = String(req.query.path || '');

    // Güvenli path oluştur (path traversal koruması ile)
    let targetPath;
    try {
      if (relPath === '/' || relPath === '') {
        return res.status(400).json({ success: false, message: 'Cannot download directory' });
      }
      targetPath = createSafePath(relPath, SAFE_BASE_DIR);
    } catch (pathError) {
      logError(pathError, 'FILE_DOWNLOAD_PATH');
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    return res.download(targetPath);
  } catch (error) {
    logError(error, 'FILE_DOWNLOAD');
    const errorResponse = createSafeErrorResponse(error, 'Error downloading file');
    res.status(500).json(errorResponse);
  }
});

// =========================
// ADMIN - CODE EDITOR
// =========================

// Dosya içeriği okuma
app.get('/api/admin/files/content', authenticateAdmin, async (req, res) => {
  try {
    let relPath = String(req.query.path || '');

    // Güvenli path oluştur (path traversal koruması ile)
    let targetPath;
    try {
      if (relPath === '/' || relPath === '') {
        return res.status(400).json({ success: false, message: 'Cannot read directory' });
      }
      targetPath = createSafePath(relPath, SAFE_BASE_DIR);
    } catch (pathError) {
      logError(pathError, 'FILE_CONTENT_READ_PATH');
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ success: false, message: 'Cannot read directory' });
    }

    // Dosya boyutu kontrolü (max 1MB)
    if (stats.size > 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File too large (max 1MB)' });
    }

    const content = fs.readFileSync(targetPath, 'utf8');
    res.json({ success: true, data: { content } });
  } catch (error) {
    logError(error, 'FILE_CONTENT_READ');
    const errorResponse = createSafeErrorResponse(error, 'Error reading file content');
    res.status(500).json(errorResponse);
  }
});

// Dosya içeriği kaydetme
app.post('/api/admin/files/save-content', authenticateAdmin, async (req, res) => {
  try {
    const { path: filePath, content } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({ success: false, message: 'Path and content required' });
    }

    let relPath = String(filePath);

    // Güvenli path oluştur (path traversal koruması ile)
    let targetPath;
    try {
      if (relPath === '/' || relPath === '') {
        return res.status(400).json({ success: false, message: 'Cannot save to root directory' });
      }
      targetPath = createSafePath(relPath, SAFE_BASE_DIR);
    } catch (pathError) {
      logError(pathError, 'FILE_CONTENT_SAVE_PATH');
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    // Dosyayı kaydet
    fs.writeFileSync(targetPath, content, 'utf8');

    res.json({ success: true, message: 'File saved successfully' });
  } catch (error) {
    logError(error, 'FILE_CONTENT_SAVE');
    const errorResponse = createSafeErrorResponse(error, 'Error saving file content');
    res.status(500).json(errorResponse);
  }
});

// Dosya kaydetme
app.post('/api/admin/files/save', authenticateAdmin, async (req, res) => {
  try {
    const { fileName, content, language } = req.body;

    if (!fileName || !content) {
      return res.status(400).json({ success: false, message: 'Dosya adı ve içerik gerekli' });
    }

    // Güvenli dosya adı oluştur
    const safeFileName = sanitizeFileName(fileName);
    const filePath = path.join(SAFE_BASE_DIR, 'code-editor', safeFileName);
    
    // Path güvenlik kontrolü
    if (!isPathInside(SAFE_BASE_DIR, filePath)) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    // Klasörü oluştur
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Dosyayı kaydet
    fs.writeFileSync(filePath, content, 'utf8');

    res.json({ success: true, message: 'Dosya kaydedildi' });
  } catch (error) {
    console.error('❌ file save', error);
    res.status(500).json({ success: false, message: 'Dosya kaydedilemedi' });
  }
});

// Kod çalıştırma - GÜVENLİK: Command injection riski nedeniyle devre dışı bırakıldı
// Bu endpoint production'da güvenlik riski oluşturur
app.post('/api/admin/code/run', authenticateAdmin, async (req, res) => {
  try {
    // Production ortamında bu endpoint tamamen devre dışı
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        success: false, 
        message: 'Bu özellik güvenlik nedeniyle production ortamında devre dışı bırakılmıştır' 
      });
    }

    // Development ortamında bile sadece JavaScript kod çalıştırmaya izin ver
    // Shell/bash komutları command injection riski taşır
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Kod gerekli' });
    }

    // Sadece JavaScript'e izin ver (Node.js VM ile güvenli çalıştırma)
    if (language !== 'javascript') {
      return res.status(400).json({ 
        success: false, 
        message: 'Güvenlik nedeniyle sadece JavaScript kodu çalıştırılabilir. Shell/bash komutları yasaktır.' 
      });
    }

    // Güvenli kod çalıştırma - Node.js VM modülü kullan
    const vm = require('vm');
    const { createContext } = vm;

    // Güvenli sandbox context
    const sandbox = {
      console: {
        log: (...args) => {
          // Console output'u topla
          if (!sandbox._output) sandbox._output = [];
          sandbox._output.push(args.map(a => String(a)).join(' '));
        }
      },
      setTimeout: () => {},
      setInterval: () => {},
      setImmediate: () => {},
      Buffer: Buffer,
      require: () => {
        throw new Error('require() is not allowed in sandbox');
      },
      process: {
        exit: () => {
          throw new Error('process.exit() is not allowed');
        }
      }
    };

    try {
      const context = createContext(sandbox);
      const script = new vm.Script(code);
      
      // Timeout ile çalıştır (5 saniye)
      script.runInContext(context, { timeout: 5000 });
      
      const output = (sandbox._output || []).join('\n') || 'Kod başarıyla çalıştırıldı';
      res.json({ success: true, output });
    } catch (error) {
      // GÜVENLİK: Error information disclosure - Production'da stack trace gizlenir
      logError(error, 'CODE_RUN');
      const errorResponse = createSafeErrorResponse(error, 'Code execution failed');
      res.json({
        ...errorResponse,
        output: `Hata: ${errorResponse.message}`
      });
    }

  } catch (error) {
    console.error('❌ code run', error);
    res.status(500).json({ success: false, message: 'Kod çalıştırılamadı' });
  }
});

// GÜVENLİK: Admin SQL query endpoint'i - SQL Injection koruması ile güçlendirildi
app.post('/api/admin/sql/query', authenticateAdmin, async (req, res) => {
  try {
    const sql = String(req.body?.query || '').trim();
    if (!sql) return res.status(400).json({ success: false, message: 'Query required' });
    
    // SQL Injection koruması - Kapsamlı güvenlik kontrolleri
    const upper = sql.toUpperCase().trim();
    
    // 1. Sadece SELECT sorgularına izin ver
    if (!upper.startsWith('SELECT')) {
      return res.status(400).json({ success: false, message: 'Only SELECT queries are allowed' });
    }
    
    // 2. Tehlikeli SQL komutlarını engelle
    const forbiddenKeywords = [
      'UPDATE', 'DELETE', 'DROP', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 
      'REPLACE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'PROCEDURE',
      'FUNCTION', 'TRIGGER', 'VIEW', 'INDEX', 'DATABASE', 'SCHEMA'
    ];
    if (forbiddenKeywords.some(k => upper.includes(k))) {
      return res.status(400).json({ success: false, message: 'Dangerous SQL statements are not allowed' });
    }
    
    // 3. UNION-based SQL injection engelleme
    if (upper.includes('UNION')) {
      return res.status(400).json({ success: false, message: 'UNION statements are not allowed' });
    }
    
    // 4. Subquery ve nested query engelleme (SQL injection riski)
    const openParenCount = (sql.match(/\(/g) || []).length;
    const closeParenCount = (sql.match(/\)/g) || []).length;
    if (openParenCount > 2 || closeParenCount > 2 || openParenCount !== closeParenCount) {
      return res.status(400).json({ success: false, message: 'Complex queries with nested structures are not allowed' });
    }
    
    // 5. Comment injection engelleme
    if (sql.includes('--') || sql.includes('/*') || sql.includes('*/') || sql.includes('#')) {
      return res.status(400).json({ success: false, message: 'SQL comments are not allowed' });
    }
    
    // 6. Multiple statement engelleme
    if (sql.includes(';') && sql.split(';').filter(s => s.trim().length > 0).length > 1) {
      return res.status(400).json({ success: false, message: 'Multiple statements are not allowed' });
    }
    
    // 7. Tehlikeli fonksiyonlar engelleme
    const dangerousFunctions = [
      'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE', 'BENCHMARK', 'SLEEP',
      'WAITFOR', 'DELAY', 'PG_SLEEP', 'GET_LOCK', 'RELEASE_LOCK'
    ];
    if (dangerousFunctions.some(f => upper.includes(f))) {
      return res.status(400).json({ success: false, message: 'Dangerous SQL functions are not allowed' });
    }
    
    // 8. Table name whitelist kontrolü - Sadece izin verilen tablolara erişim
    const allowedTables = DatabaseSecurity.getAllowedTables();
    const tableMatches = sql.match(/FROM\s+([`"]?)(\w+)\1/gi) || [];
    const usedTables = tableMatches.map(m => m.replace(/FROM\s+[`"]?/gi, '').replace(/[`"]/g, '').toLowerCase());
    
    for (const table of usedTables) {
      if (!allowedTables.includes(table)) {
        return res.status(400).json({ 
          success: false, 
          message: `Table "${table}" is not in allowed whitelist` 
        });
      }
    }
    
    // 9. Query uzunluk limiti (DoS koruması)
    if (sql.length > 1000) {
      return res.status(400).json({ success: false, message: 'Query too long. Maximum 1000 characters allowed' });
    }
    
    // 10. Prepared statement kullan - Parametreli sorgu zorunluluğu
    // Eğer sorguda parametre yoksa, sadece basit SELECT'lere izin ver
    const hasPlaceholders = sql.includes('?');
    if (!hasPlaceholders && (sql.includes("'") || sql.includes('"') || sql.match(/\d+/g)?.length > 5)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Queries with user input must use prepared statements (?)' 
      });
    }
    
    // 11. DatabaseSecurity validation kullan
    try {
      // Eğer parametre varsa, parametre sayısını kontrol et
      if (hasPlaceholders) {
        const paramCount = (sql.match(/\?/g) || []).length;
        const providedParams = Array.isArray(req.body.params) ? req.body.params : [];
        if (paramCount !== providedParams.length) {
          return res.status(400).json({ 
            success: false, 
            message: `Parameter count mismatch. Expected ${paramCount}, got ${providedParams.length}` 
          });
        }
        DatabaseSecurity.validateQuery(sql, providedParams);
      } else {
        // Parametre yoksa, sadece basit SELECT'lere izin ver
        DatabaseSecurity.validateQuery(sql, []);
      }
    } catch (validationError) {
      return res.status(400).json({ 
        success: false, 
        message: `Query validation failed: ${validationError.message}` 
      });
    }
    
    // 12. Query'yi çalıştır - Prepared statement ile
    const start = Date.now();
    let rows, fields;
    
    if (hasPlaceholders && Array.isArray(req.body.params)) {
      // Parametreli sorgu
      [rows, fields] = await poolWrapper.execute(sql, req.body.params);
    } else {
      // Parametresiz sorgu (sadece basit SELECT'ler için)
      [rows, fields] = await poolWrapper.query(sql);
    }
    
    const executionTime = (Date.now() - start) / 1000;
    
    // 13. Sonuçları maskele (sensitive data)
    const maskedRows = rows.map(row => {
      return DatabaseSecurity.maskSensitiveData(row, ['password', 'email', 'phone', 'apiKey', 'token']);
    });
    
    const columns = Array.isArray(fields) ? fields.map(f => f.name) : (rows[0] ? Object.keys(rows[0]) : []);
    
    // 14. Audit log
    dbSecurity && dbSecurity.logDatabaseAccess(
      req.user?.userId || 'admin',
      'ADMIN_SQL_QUERY',
      usedTables.join(','),
      { 
        ip: req.ip, 
        userAgent: req.headers['user-agent'],
        queryLength: sql.length,
        executionTime,
        rowCount: rows.length
      }
    );
    
    res.json({ 
      success: true, 
      data: { 
        columns, 
        rows: maskedRows, 
        rowCount: maskedRows.length, 
        executionTime 
      } 
    });
  } catch (error) {
    console.error('❌ SQL query error:', error);
    
    // Güvenlik: Hata mesajlarını maskele
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Query failed' 
      : error.message;
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage 
    });
  }
});

// Admin - panel config read/write (admin-panel/config.json)
app.get('/api/admin/panel-config', authenticateAdmin, async (req, res) => {
  try {
    const cfgPath = path.join(__dirname, '..', 'admin-panel', 'config.json');
    let cfg = null;
    try {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      cfg = JSON.parse(raw);
    } catch (_) {
      cfg = {
        API_BASE_URL: 'https://api.plaxsy.com/api',
        ADMIN_TOKEN: '',
        TENANT_API_KEY: '',
        FTP_BACKUP: { enabled: false, host: '', port: 21, user: '', password: '', remoteDir: '/backups' }
      };
      try { fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf-8'); } catch (_) { }
    }
    return res.json({ success: true, data: cfg });
  } catch (e) {
    console.error('❌ Read panel-config error:', e);
    res.status(500).json({ success: false, message: 'Config okunamadı' });
  }
});

app.post('/api/admin/panel-config', authenticateAdmin, async (req, res) => {
  try {
    const cfgPath = path.join(__dirname, '..', 'admin-panel', 'config.json');
    let current = {};
    try { current = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch (_) { }
    const incoming = req.body || {};
    const merged = { ...current, ...incoming };
    fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2), 'utf-8');
    return res.json({ success: true, message: 'Config kaydedildi', data: merged });
  } catch (e) {
    console.error('❌ Write panel-config error:', e);
    res.status(500).json({ success: false, message: 'Config kaydedilemedi' });
  }
});

// Admin - FTP backup config read
app.get('/api/admin/ftp-backup/config', authenticateAdmin, async (req, res) => {
  try {
    // Combine in-memory defaults with persisted panel-config if exists
    const cfgPath = path.join(__dirname, '..', 'admin-panel', 'config.json');
    let panelCfg = {};
    try {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      panelCfg = JSON.parse(raw);
    } catch (_) { }
    const saved = (panelCfg && panelCfg.FTP_BACKUP) ? panelCfg.FTP_BACKUP : {};
    const effective = {
      enabled: !!(__ftpBackupConfig.enabled || saved.enabled),
      host: __ftpBackupConfig.host || saved.host || '',
      port: __ftpBackupConfig.port || saved.port || 21,
      user: __ftpBackupConfig.user || saved.user || '',
      // never expose password; return masked info only
      password: saved.password ? '***' : (__ftpBackupConfig.password ? '***' : ''),
      remoteDir: __ftpBackupConfig.remoteDir || saved.remoteDir || '/backups',
      schedule: __ftpBackupConfig.schedule || saved.schedule || '0 3 * * *'
    };
    return res.json({ success: true, data: effective });
  } catch (e) {
    console.error('❌ Read FTP config error:', e);
    res.status(500).json({ success: false, message: 'FTP config okunamadı' });
  }
});

// Admin - FTP backup config write (updates in-memory and persists into panel config)
app.post('/api/admin/ftp-backup/config', authenticateAdmin, async (req, res) => {
  try {
    const { enabled, host, port, user, password, remoteDir, schedule } = req.body || {};
    if (!host || !user || (!__ftpBackupConfig.password && !password)) {
      // allow password omission if already set in memory (to avoid revealing it)
    }
    __ftpBackupConfig.enabled = !!enabled;
    if (host !== undefined) __ftpBackupConfig.host = String(host);
    if (port !== undefined) __ftpBackupConfig.port = parseInt(port) || 21;
    if (user !== undefined) __ftpBackupConfig.user = String(user);
    if (password) __ftpBackupConfig.password = String(password);
    if (remoteDir !== undefined) __ftpBackupConfig.remoteDir = String(remoteDir || '/');
    if (schedule !== undefined) __ftpBackupConfig.schedule = String(schedule);

    // persist to panel-config
    const cfgPath = path.join(__dirname, '..', 'admin-panel', 'config.json');
    let current = {};
    try { current = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch (_) { }
    const merged = {
      ...current,
      FTP_BACKUP: {
        enabled: __ftpBackupConfig.enabled,
        host: __ftpBackupConfig.host,
        port: __ftpBackupConfig.port,
        user: __ftpBackupConfig.user,
        // never write plain password to logs; we do persist it encrypted later if needed
        password: password ? String(password) : (current.FTP_BACKUP && current.FTP_BACKUP.password ? current.FTP_BACKUP.password : ''),
        remoteDir: __ftpBackupConfig.remoteDir
      }
    };
    try { fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2), 'utf-8'); } catch (_) { }

    return res.json({ success: true, message: 'FTP config kaydedildi' });
  } catch (e) {
    console.error('❌ Write FTP config error:', e);
    res.status(500).json({ success: false, message: 'FTP config kaydedilemedi' });
  }
});

// Admin - Test FTP connection (non-persistent)
app.post('/api/admin/ftp-backup/test', authenticateAdmin, async (req, res) => {
  const { host, port = 21, user, password, remoteDir = '/' } = req.body || {};
  if (!host || !user || !password) {
    return res.status(400).json({ success: false, message: 'host, user ve password gerekli' });
  }
  const client = new ftp.Client(10000);
  client.ftp.verbose = false;
  try {
    await client.access({ host, port: parseInt(port) || 21, user, password, secure: false });
    // try cd/create dir if provided
    if (remoteDir && remoteDir !== '/') {
      try { await client.ensureDir(remoteDir); } catch { }
      await client.cd(remoteDir);
    }
    return res.json({ success: true, message: 'FTP bağlantısı başarılı' });
  } catch (e) {
    return res.status(400).json({ success: false, message: e?.message || 'FTP bağlantısı başarısız' });
  } finally {
    client.close();
  }
});

// Admin - Trigger backup and upload to FTP
app.post('/api/admin/ftp-backup/run', authenticateAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    // override in-memory config temporarily if body provided
    const prev = { ...__ftpBackupConfig };
    try {
      if (body && Object.keys(body).length > 0) {
        if (body.host) __ftpBackupConfig.host = String(body.host);
        if (body.port) __ftpBackupConfig.port = parseInt(body.port) || 21;
        if (body.user) __ftpBackupConfig.user = String(body.user);
        if (body.password) __ftpBackupConfig.password = String(body.password);
        if (body.remoteDir) __ftpBackupConfig.remoteDir = String(body.remoteDir);
      }
      const out = await runFtpBackupNow();
      if (!out.ok) return res.status(400).json({ success: false, message: out.message || 'Yedek gönderilemedi' });
      return res.json({ success: true, message: 'Yedek FTP\'ye yüklendi' });
    } finally {
      // restore previous config to avoid unintended persistence
      __ftpBackupConfig = prev;
    }
  } catch (e) {
    console.error('❌ FTP run error:', e);
    res.status(500).json({ success: false, message: 'Yedek gönderme hatası' });
  }
});

// Admin - Get detailed cart for a user
app.get('/api/admin/carts/:userId', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [userRows] = await poolWrapper.execute('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const [items] = await poolWrapper.execute(`
      SELECT c.id, c.quantity, c.variationString,
             p.id as productId, p.name as productName, p.price as productPrice, p.image as productImage
      FROM cart c
      LEFT JOIN products p ON p.id = c.productId
      WHERE c.userId = ?
      ORDER BY c.createdAt DESC
    `, [userId]);
    const totalQuantity = items.reduce((s, i) => s + (i.quantity || 0), 0);
    res.json({ success: true, data: { user: userRows[0], items, totalQuantity } });
  } catch (error) {
    console.error('❌ Error getting user cart:', error);
    res.status(500).json({ success: false, message: 'Error getting user cart' });
  }
});

// Admin - List customer wallets
app.get('/api/admin/wallets', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const [rows] = await poolWrapper.execute(`
      SELECT u.id as userId, u.name as userName, u.email as userEmail,
             COALESCE(w.balance,0) as balance, COALESCE(w.currency,'TRY') as currency
      FROM users u
      LEFT JOIN user_wallets w ON w.userId = u.id AND w.tenantId = ?
      WHERE u.tenantId = ?
      ORDER BY balance DESC
    `, [tenantId, tenantId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error listing wallets:', error);
    res.status(500).json({ success: false, message: 'Error listing wallets' });
  }
});

// Admin - Wallets summary (totals)
app.get('/api/admin/wallets/summary', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const [[bal]] = await poolWrapper.execute(
      `SELECT COALESCE(SUM(balance),0) as totalBalance FROM user_wallets WHERE tenantId = ?`,
      [tenantId]
    );
    const [[cr]] = await poolWrapper.execute(
      `SELECT COALESCE(SUM(amount),0) as totalCredit FROM wallet_transactions WHERE tenantId = ? AND type = 'credit' AND status = 'completed'`,
      [tenantId]
    );
    const [[db]] = await poolWrapper.execute(
      `SELECT COALESCE(SUM(amount),0) as totalDebit FROM wallet_transactions WHERE tenantId = ? AND type = 'debit' AND status = 'completed'`,
      [tenantId]
    );
    res.json({ success: true, data: { totalBalance: bal.totalBalance || 0, totalCredit: cr.totalCredit || 0, totalDebit: db.totalDebit || 0 } });
  } catch (error) {
    console.error('❌ Error getting wallets summary:', error);
    res.status(500).json({ success: false, message: 'Error getting wallets summary' });
  }
});

// Admin - Adjust customer wallet balance
app.post('/api/admin/wallets/adjust', authenticateAdmin, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body || {};
    const adj = parseFloat(amount);
    if (!userId || isNaN(adj)) {
      return res.status(400).json({ success: false, message: 'Invalid userId or amount' });
    }
    // Ensure wallet exists
    await poolWrapper.execute(`
      INSERT INTO user_wallets (tenantId, userId, balance, currency)
      VALUES (?, ?, 0, 'TRY')
      ON DUPLICATE KEY UPDATE balance = balance
    `, [1, userId]);
    // Update balance
    await poolWrapper.execute('UPDATE user_wallets SET balance = balance + ? WHERE userId = ? AND tenantId = ?', [adj, userId, 1]);
    // Log transaction
    await poolWrapper.execute(`
      INSERT INTO wallet_transactions (tenantId, userId, type, amount, description, status)
      VALUES (?, ?, ?, ?, ?, 'completed')
    `, [1, userId, adj >= 0 ? 'credit' : 'debit', Math.abs(adj), reason || 'Admin adjustment']);
    res.json({ success: true, message: 'Balance adjusted' });
  } catch (error) {
    console.error('❌ Error adjusting wallet:', error);
    res.status(500).json({ success: false, message: 'Error adjusting wallet' });
  }
});

// Admin - Wallets add/remove (shortcut helpers used by admin panel)
app.post('/api/admin/wallets/add', authenticateAdmin, async (req, res) => {
  try {
    const { userId, amount, description } = req.body || {};
    const adj = parseFloat(amount);
    if (!userId || isNaN(adj) || adj <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid userId or amount' });
    }
    // Reuse adjust with positive amount
    await poolWrapper.execute(
      `INSERT INTO user_wallets (tenantId, userId, balance, currency)
       VALUES (?, ?, 0, 'TRY')
       ON DUPLICATE KEY UPDATE balance = balance`,
      [req.tenant?.id || 1, userId]
    );
    await poolWrapper.execute('UPDATE user_wallets SET balance = balance + ? WHERE userId = ? AND tenantId = ?', [adj, userId, req.tenant?.id || 1]);
    await poolWrapper.execute(
      `INSERT INTO wallet_transactions (tenantId, userId, type, amount, description, status)
       VALUES (?, ?, 'credit', ?, ?, 'completed')`,
      [req.tenant?.id || 1, userId, adj, description || 'Admin add']
    );
    res.json({ success: true, message: 'Balance increased' });
  } catch (error) {
    console.error('❌ Error wallet add:', error);
    res.status(500).json({ success: false, message: 'Error increasing balance' });
  }
});

app.post('/api/admin/wallets/remove', authenticateAdmin, async (req, res) => {
  try {
    const { userId, amount, description } = req.body || {};
    const adj = parseFloat(amount);
    if (!userId || isNaN(adj) || adj <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid userId or amount' });
    }
    await poolWrapper.execute(
      `INSERT INTO user_wallets (tenantId, userId, balance, currency)
       VALUES (?, ?, 0, 'TRY')
       ON DUPLICATE KEY UPDATE balance = balance`,
      [req.tenant?.id || 1, userId]
    );
    await poolWrapper.execute('UPDATE user_wallets SET balance = balance - ? WHERE userId = ? AND tenantId = ?', [adj, userId, req.tenant?.id || 1]);
    await poolWrapper.execute(
      `INSERT INTO wallet_transactions (tenantId, userId, type, amount, description, status)
       VALUES (?, ?, 'debit', ?, ?, 'completed')`,
      [req.tenant?.id || 1, userId, adj, description || 'Admin remove']
    );
    res.json({ success: true, message: 'Balance decreased' });
  } catch (error) {
    console.error('❌ Error wallet remove:', error);
    res.status(500).json({ success: false, message: 'Error decreasing balance' });
  }
});

app.post('/api/admin/wallets/transfer', authenticateAdmin, async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, description } = req.body || {};
    const adj = parseFloat(amount);
    if (!fromUserId || !toUserId || isNaN(adj) || adj <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid transfer parameters' });
    }
    const tenantId = req.tenant?.id || 1;
    // Ensure wallets exist
    await poolWrapper.execute(
      `INSERT INTO user_wallets (tenantId, userId, balance, currency)
       VALUES (?, ?, 0, 'TRY')
       ON DUPLICATE KEY UPDATE balance = balance`, [tenantId, fromUserId]
    );
    await poolWrapper.execute(
      `INSERT INTO user_wallets (tenantId, userId, balance, currency)
       VALUES (?, ?, 0, 'TRY')
       ON DUPLICATE KEY UPDATE balance = balance`, [tenantId, toUserId]
    );
    // Move balance
    await poolWrapper.execute('UPDATE user_wallets SET balance = balance - ? WHERE userId = ? AND tenantId = ?', [adj, fromUserId, tenantId]);
    await poolWrapper.execute('UPDATE user_wallets SET balance = balance + ? WHERE userId = ? AND tenantId = ?', [adj, toUserId, tenantId]);
    // Log transactions
    await poolWrapper.execute(
      `INSERT INTO wallet_transactions (tenantId, userId, type, amount, description, status)
       VALUES (?, ?, 'debit', ?, ?, 'completed')`, [tenantId, fromUserId, adj, description || `Transfer to ${toUserId}`]
    );
    await poolWrapper.execute(
      `INSERT INTO wallet_transactions (tenantId, userId, type, amount, description, status)
       VALUES (?, ?, 'credit', ?, ?, 'completed')`, [tenantId, toUserId, adj, description || `Transfer from ${fromUserId}`]
    );
    res.json({ success: true, message: 'Transfer completed' });
  } catch (error) {
    console.error('❌ Error wallet transfer:', error);
    res.status(500).json({ success: false, message: 'Error transferring balance' });
  }
});

// Admin - Live user product views (from JSON log for now)
app.get('/api/admin/live-views', authenticateAdmin, async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'user-activities.json');
    if (!fs.existsSync(filePath)) {
      return res.json({ success: true, data: [] });
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    // Filter only product view events and map to desired fields
    const views = (json.activities || json || []).filter(a =>
      a.activityType === 'product_viewed' || a.activityType === 'product_detail_viewed' || a.activityType === 'page_view_product'
    ).map(a => ({
      userId: a.userId || a.user_id || null,
      productId: a.productId || a.product_id || null,
      productName: a.productName || a.product_name || '-',
      viewedAt: a.activityTimestamp || a.viewTimestamp || a.timestamp || null,
      dwellSeconds: a.viewDuration || a.dwellSeconds || a.duration || 0,
      addedToCart: !!a.addedToCart,
      purchased: !!a.purchased
    }));
    res.json({ success: true, data: views });
  } catch (error) {
    console.error('❌ Error reading live views:', error);
    res.status(500).json({ success: false, message: 'Error reading live views' });
  }
});
// Admin - Custom Production Requests
app.get('/api/admin/custom-production-requests', authenticateAdmin, async (req, res) => {
  try {
    // Detect optional quote columns to avoid SELECT errors on fresh DBs
    const [cols] = await poolWrapper.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
    `);
    const names = new Set(cols.map(c => c.COLUMN_NAME));
    const baseCols = [
      'id', 'userId', 'tenantId', 'status', 'totalQuantity', 'totalAmount', 'customerName', 'customerEmail', 'customerPhone', 'companyName', 'taxNumber', 'taxAddress', 'companyAddress', 'notes', 'createdAt'
    ];
    const optionalCols = [
      'quoteAmount', 'quoteCurrency', 'quoteNotes', 'quoteStatus', 'quotedAt', 'quoteValidUntil', 'source'
    ];
    const selectCols = baseCols
      .concat(optionalCols.filter(n => names.has(n)))
      .join(', ');

    const [requests] = await poolWrapper.execute(
      `SELECT ${selectCols} FROM custom_production_requests ORDER BY createdAt DESC`
    );
    
    // Get items for each request
    const requestsWithItems = await Promise.all(
      requests.map(async (request) => {
        const [items] = await poolWrapper.execute(
          `SELECT cpi.*, p.name as productName, p.image as productImage, p.price as productPrice
           FROM custom_production_items cpi
           LEFT JOIN products p ON cpi.productId = p.id AND p.tenantId = cpi.tenantId
           WHERE cpi.requestId = ?`,
          [request.id]
        );
        return {
          ...request,
          items: items || []
        };
      })
    );
    
    res.json({ success: true, data: requestsWithItems });
  } catch (error) {
    console.error('❌ Error getting custom production requests:', error);
    res.status(500).json({ success: false, message: 'Error getting custom production requests' });
  }
});

// Admin - Get all custom production messages (with optional limit)
app.get('/api/admin/custom-production/messages', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const [rows] = await poolWrapper.execute(
      `SELECT 
        cpm.id, 
        cpm.requestId, 
        cpm.sender, 
        cpm.message, 
        cpm.createdAt,
        cpr.requestNumber,
        cpr.customerName,
        cpr.customerEmail
      FROM custom_production_messages cpm
      LEFT JOIN custom_production_requests cpr ON cpm.requestId = cpr.id AND cpm.tenantId = cpr.tenantId
      WHERE cpm.tenantId = ? 
      ORDER BY cpm.createdAt DESC 
      LIMIT ?`,
      [tenantId, limit]
    );
    
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error('❌ Error getting custom production messages:', error);
    res.status(500).json({ success: false, message: 'Mesajlar alınamadı' });
  }
});

// Admin - Get messages for a specific request
app.get('/api/admin/custom-production/requests/:id/messages', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = 1;
    const requestId = parseInt(req.params.id, 10);
    
    const [rows] = await poolWrapper.execute(
      `SELECT id, sender, message, createdAt 
       FROM custom_production_messages
       WHERE requestId = ? AND tenantId = ? 
       ORDER BY createdAt ASC`,
      [requestId, tenantId]
    );
    
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error('❌ Error getting custom production request messages:', error);
    res.status(500).json({ success: false, message: 'Mesajlar alınamadı' });
  }
});

app.get('/api/admin/custom-production-requests/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute('SELECT * FROM custom_production_requests WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
    const [items] = await poolWrapper.execute('SELECT * FROM custom_production_items WHERE requestId = ?', [id]);
    res.json({ success: true, data: { ...rows[0], items } });
  } catch (error) {
    console.error('❌ Error getting custom production request:', error);
    res.status(500).json({ success: false, message: 'Error getting request' });
  }
});

app.put('/api/admin/custom-production-requests/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, estimatedDeliveryDate, actualDeliveryDate, notes } = req.body || {};
    const validStatuses = ['pending', 'review', 'design', 'production', 'shipped', 'completed', 'cancelled', 'archived', 'approved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Geçersiz durum' });
    }
    const fields = ['status = ?'];
    const params = [status];
    if (estimatedDeliveryDate) { fields.push('estimatedDeliveryDate = ?'); params.push(estimatedDeliveryDate); }
    if (actualDeliveryDate) { fields.push('actualDeliveryDate = ?'); params.push(actualDeliveryDate); }
    if (notes) { fields.push('notes = ?'); params.push(notes); }
    params.push(id);
    await poolWrapper.execute(`UPDATE custom_production_requests SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, params);
    res.json({ success: true, message: 'Durum güncellendi' });
  } catch (error) {
    console.error('❌ Error updating custom production status:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

// Ensure quote columns exist (idempotent) and set quote
app.post('/api/admin/custom-production-requests/:id/quote', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quoteAmount, quoteCurrency = 'TRY', quoteNotes = '', quoteValidUntil } = req.body || {};
    if (quoteAmount === undefined || quoteAmount === null || isNaN(parseFloat(quoteAmount))) {
      return res.status(400).json({ success: false, message: 'Geçersiz teklif tutarı' });
    }
    // Ensure columns exist
    const [cols] = await poolWrapper.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
    `);
    const names = cols.map(c => c.COLUMN_NAME);
    const alters = [];
    if (!names.includes('quoteAmount')) alters.push("ADD COLUMN quoteAmount DECIMAL(10,2) NULL AFTER notes");
    if (!names.includes('quoteCurrency')) alters.push("ADD COLUMN quoteCurrency VARCHAR(10) DEFAULT 'TRY' AFTER quoteAmount");
    if (!names.includes('quoteNotes')) alters.push('ADD COLUMN quoteNotes TEXT AFTER quoteCurrency');
    if (!names.includes('quoteStatus')) alters.push("ADD COLUMN quoteStatus ENUM('none','sent','accepted','rejected') DEFAULT 'none' AFTER quoteNotes");
    if (!names.includes('quotedAt')) alters.push('ADD COLUMN quotedAt TIMESTAMP NULL AFTER quoteStatus');
    if (!names.includes('quoteValidUntil')) alters.push('ADD COLUMN quoteValidUntil TIMESTAMP NULL AFTER quotedAt');
    if (alters.length > 0) {
      await poolWrapper.execute(`ALTER TABLE custom_production_requests ${alters.join(', ')}`);
    }
    // Update quote
    await poolWrapper.execute(`
      UPDATE custom_production_requests 
      SET quoteAmount = ?, quoteCurrency = ?, quoteNotes = ?, quoteStatus = 'sent', quotedAt = NOW(), quoteValidUntil = ?
      WHERE id = ?
    `, [parseFloat(quoteAmount), quoteCurrency, quoteNotes, quoteValidUntil || null, id]);
    res.json({ success: true, message: 'Teklif gönderildi' });
  } catch (error) {
    console.error('❌ Error setting quote:', error);
    res.status(500).json({ success: false, message: 'Error setting quote' });
  }
});

// Admin - Proforma Quote (detaylı maliyet hesaplaması ile)
app.post('/api/admin/custom-production-requests/:id/proforma-quote', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      itemCosts,
      sharedShippingCost,
      profitMargin,
      vatRate,
      unitSalePrice,
      totalOfferAmount,
      totalVatAmount,
      totalWithVat,
      profitPercentage,
      notes,
      calculation
    } = req.body || {};

    // Request var mı kontrol et
    const [requestRows] = await poolWrapper.execute(
      'SELECT id, status FROM custom_production_requests WHERE id = ?',
      [id]
    );
    
    if (requestRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Proforma quote kolonlarını kontrol et ve ekle
    const [cols] = await poolWrapper.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
    `);
    const names = cols.map(c => c.COLUMN_NAME);
    const alters = [];
    
    // quoteValidUntil kolonu varsa ondan sonra, yoksa quotedAt'ten sonra ekle
    const afterColumn = names.includes('quoteValidUntil') ? 'quoteValidUntil' : (names.includes('quotedAt') ? 'quotedAt' : 'status');
    
    if (!names.includes('proformaQuoteData')) {
      alters.push(`ADD COLUMN proformaQuoteData JSON NULL AFTER ${afterColumn}`);
    }
    if (!names.includes('proformaItemCosts')) {
      alters.push("ADD COLUMN proformaItemCosts JSON NULL AFTER proformaQuoteData");
    }
    if (!names.includes('proformaSharedShippingCost')) {
      alters.push("ADD COLUMN proformaSharedShippingCost DECIMAL(10,2) DEFAULT 0 AFTER proformaItemCosts");
    }
    if (!names.includes('proformaProfitMargin')) {
      alters.push("ADD COLUMN proformaProfitMargin DECIMAL(5,2) DEFAULT 0 AFTER proformaSharedShippingCost");
    }
    if (!names.includes('proformaVatRate')) {
      alters.push("ADD COLUMN proformaVatRate DECIMAL(5,2) DEFAULT 10 AFTER proformaProfitMargin");
    }
    if (!names.includes('proformaTotalWithVat')) {
      alters.push("ADD COLUMN proformaTotalWithVat DECIMAL(10,2) NULL AFTER proformaVatRate");
    }
    if (!names.includes('proformaQuotedAt')) {
      alters.push("ADD COLUMN proformaQuotedAt TIMESTAMP NULL AFTER proformaTotalWithVat");
    }
    
    if (alters.length > 0) {
      await poolWrapper.execute(`ALTER TABLE custom_production_requests ${alters.join(', ')}`);
    }

    // Proforma quote verilerini güncelle
    const proformaQuoteData = {
      unitSalePrice: parseFloat(unitSalePrice) || 0,
      totalOfferAmount: parseFloat(totalOfferAmount) || 0,
      totalVatAmount: parseFloat(totalVatAmount) || 0,
      totalWithVat: parseFloat(totalWithVat) || 0,
      profitPercentage: parseFloat(profitPercentage) || 0,
      notes: notes || '',
      calculation: calculation || null,
      quotedAt: new Date().toISOString()
    };

    await poolWrapper.execute(`
      UPDATE custom_production_requests 
      SET 
        proformaQuoteData = ?,
        proformaItemCosts = ?,
        proformaSharedShippingCost = ?,
        proformaProfitMargin = ?,
        proformaVatRate = ?,
        proformaTotalWithVat = ?,
        proformaQuotedAt = NOW(),
        status = 'review',
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      JSON.stringify(proformaQuoteData),
      JSON.stringify(itemCosts || {}),
      parseFloat(sharedShippingCost) || 0,
      parseFloat(profitMargin) || 0,
      parseFloat(vatRate) || 10,
      parseFloat(totalWithVat) || 0,
      id
    ]);

    res.json({ 
      success: true, 
      message: 'Proforma teklif başarıyla kaydedildi',
      data: {
        id,
        proformaQuoteData,
        itemCosts
      }
    });
  } catch (error) {
    console.error('❌ Error saving proforma quote:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Proforma teklif kaydedilemedi: ' + (error.message || 'Bilinmeyen hata')
    });
  }
});

// Admin - Revizyon İste (proforma için)
app.put('/api/admin/custom-production-requests/:id/request-revision', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { revisionNotes } = req.body || {};

    const [requestRows] = await poolWrapper.execute(
      'SELECT id FROM custom_production_requests WHERE id = ?',
      [id]
    );
    
    if (requestRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Revizyon kolonlarını kontrol et
    const [cols] = await poolWrapper.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
    `);
    const names = cols.map(c => c.COLUMN_NAME);
    
    if (!names.includes('revisionNotes')) {
      await poolWrapper.execute("ALTER TABLE custom_production_requests ADD COLUMN revisionNotes TEXT NULL AFTER notes");
    }
    if (!names.includes('revisionRequestedAt')) {
      await poolWrapper.execute("ALTER TABLE custom_production_requests ADD COLUMN revisionRequestedAt TIMESTAMP NULL AFTER revisionNotes");
    }

    await poolWrapper.execute(`
      UPDATE custom_production_requests 
      SET 
        status = 'pending',
        revisionNotes = ?,
        revisionRequestedAt = NOW(),
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [revisionNotes || '', id]);

    res.json({ success: true, message: 'Revizyon talebi gönderildi' });
  } catch (error) {
    console.error('❌ Error requesting revision:', error);
    res.status(500).json({ success: false, message: 'Revizyon talebi gönderilemedi' });
  }
});

// Admin - Proforma Onayla
app.put('/api/admin/custom-production-requests/:id/approve-proforma', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await poolWrapper.execute(`
      UPDATE custom_production_requests 
      SET 
        status = 'approved',
        quoteStatus = 'sent',
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    res.json({ success: true, message: 'Proforma onaylandı' });
  } catch (error) {
    console.error('❌ Error approving proforma:', error);
    res.status(500).json({ success: false, message: 'Proforma onaylanamadı' });
  }
});

// User quote status update (accept/reject)
app.put('/api/custom-production-requests/:requestId/quote-status', async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const { status } = req.body || {};
    
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Geçersiz durum. accepted veya rejected olmalı' });
    }

    // Ensure columns exist
    const [cols] = await poolWrapper.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
    `);
    const names = cols.map(c => c.COLUMN_NAME);
    const alters = [];
    if (!names.includes('quoteStatus')) alters.push("ADD COLUMN quoteStatus ENUM('none','sent','accepted','rejected') DEFAULT 'none' AFTER quoteNotes");
    if (alters.length > 0) {
      await poolWrapper.execute(`ALTER TABLE custom_production_requests ${alters.join(', ')}`);
    }

    await poolWrapper.execute(
      `UPDATE custom_production_requests 
       SET quoteStatus = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, requestId]
    );

    res.json({ success: true, message: `Teklif ${status === 'accepted' ? 'onaylandı' : 'reddedildi'}` });
  } catch (error) {
    console.error('❌ Error updating quote status:', error);
    res.status(500).json({ success: false, message: 'Error updating quote status' });
  }
});

// Quote request from website form (Teklif Al formu)
app.post('/api/quote-requests', async (req, res) => {
  try {
    const tenantId = 1; // Default tenant
    const {
      name,
      email,
      phone,
      company,
      productType,
      quantity,
      budget,
      description,
      embroidery,
      printing,
      wholesale,
      embroideryDetails,
      printingDetails,
      sizeDistribution
    } = req.body || {};

    if (!name || !email || !phone || !productType || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Eksik alanlar: ad soyad, e-posta, telefon, ürün tipi ve miktar gereklidir'
      });
    }

    // Ensure source column exists
    const [cols] = await poolWrapper.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
    `);
    const names = cols.map(c => c.COLUMN_NAME);
    if (!names.includes('source')) {
      await poolWrapper.execute("ALTER TABLE custom_production_requests ADD COLUMN source VARCHAR(50) DEFAULT 'website' AFTER userId");
    }

    // Generate request number
    const requestNumber = `TEK-${Date.now()}`;

    // Build notes from form data
    let notes = `Teklif Al Formundan Gelen Talep\n`;
    notes += `Ürün Tipi: ${productType}\n`;
    notes += `Miktar: ${quantity} adet\n`;
    if (budget) notes += `Bütçe Aralığı: ${budget}\n`;
    if (description) notes += `\nProje Detayları:\n${description}\n`;
    
    const services = [];
    if (embroidery) services.push('Nakış');
    if (printing) services.push('Baskı');
    if (wholesale) services.push('Toptan');
    if (services.length > 0) notes += `\nHizmet Seçenekleri: ${services.join(', ')}\n`;
    
    if (embroidery && embroideryDetails) notes += `\nNakış Detayları:\n${embroideryDetails}\n`;
    if (printing && printingDetails) notes += `\nBaskı Detayları:\n${printingDetails}\n`;
    if (sizeDistribution) notes += `\nBeden Dağılımı:\n${sizeDistribution}\n`;

    // Try to get userId from auth token if user is logged in
    let userId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Decode token to get userId
        try {
          const JWTAuth = require('./security/jwt-auth');
          const jwtAuth = new JWTAuth();
          const decoded = jwtAuth.decodeToken(token);
          if (decoded && decoded.userId) {
            userId = decoded.userId;
          }
        } catch (e) {
          // Token decode edilemediyse basit decode dene
          try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token);
            if (decoded && decoded.userId) {
              userId = decoded.userId;
            }
          } catch (e2) {
            // Token decode edilemediyse devam et, userId null kalır
          }
        }
      }
    } catch (e) {
      // Auth kontrolü başarısız olursa devam et, userId null kalır
    }

    // Ensure userId column allows NULL (migration)
    try {
      const [userIdCol] = await poolWrapper.execute(`
        SELECT IS_NULLABLE, COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'custom_production_requests' 
        AND COLUMN_NAME = 'userId'
      `);
      if (userIdCol.length > 0 && userIdCol[0].IS_NULLABLE === 'NO') {
        // userId column'u NULL yapılabilir hale getir
        await poolWrapper.execute(`
          ALTER TABLE custom_production_requests 
          MODIFY COLUMN userId INT NULL
        `);
        // Foreign key constraint'i güncelle (ON DELETE SET NULL)
        try {
          await poolWrapper.execute(`
            ALTER TABLE custom_production_requests 
            DROP FOREIGN KEY custom_production_requests_ibfk_2
          `);
        } catch (e) {
          // Foreign key constraint adı farklı olabilir, tüm constraint'leri kontrol et
          const [fks] = await poolWrapper.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'custom_production_requests' 
            AND COLUMN_NAME = 'userId' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
          `);
          for (const fk of fks) {
            try {
              await poolWrapper.execute(`
                ALTER TABLE custom_production_requests 
                DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}
              `);
            } catch (e2) {
              // Constraint silinemezse devam et
            }
          }
        }
        // Foreign key'i yeniden ekle (ON DELETE SET NULL ile)
        await poolWrapper.execute(`
          ALTER TABLE custom_production_requests 
          ADD CONSTRAINT custom_production_requests_userId_fk 
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
        `);
      }
    } catch (e) {
      // Migration hatası olursa devam et
      console.warn('⚠️ Could not migrate userId column:', e.message);
    }

    // Create custom production request (userId null olabilir, çünkü form dolduran kullanıcı giriş yapmamış olabilir)
    const [requestResult] = await poolWrapper.execute(
      `INSERT INTO custom_production_requests 
       (tenantId, userId, requestNumber, status, totalQuantity, totalAmount, 
        customerName, customerEmail, customerPhone, companyName, notes, source) 
       VALUES (?, ?, ?, 'pending', ?, 0, ?, ?, ?, ?, ?, 'quote-form')`,
      [
        tenantId,
        userId,
        requestNumber,
        parseInt(quantity) || 0,
        name,
        email,
        phone || null,
        company || null,
        notes || null
      ]
    );

    const requestId = requestResult.insertId;

    console.log(`✅ Quote request created: ${requestNumber} (ID: ${requestId})`);

    res.json({
      success: true,
      message: 'Teklif talebiniz başarıyla alındı',
      data: {
        id: requestId,
        requestNumber: requestNumber
      }
    });
  } catch (error) {
    console.error('❌ Error creating quote request:', error);
    res.status(500).json({
      success: false,
      message: 'Teklif talebi oluşturulamadı: ' + (error.message || 'Bilinmeyen hata')
    });
  }
});

// Admin - Tüm kullanıcıları listele
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [rows] = await poolWrapper.execute(`
      SELECT u.id, u.name, u.email, u.phone, u.createdAt, t.name as tenantName 
      FROM users u 
      LEFT JOIN tenants t ON u.tenantId = t.id
      ORDER BY u.createdAt DESC 
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({ success: false, message: 'Error getting users' });
  }
});

// Admin - Users export (CSV)
app.get('/api/admin/users/export', authenticateAdmin, async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const [rows] = await poolWrapper.execute(
      `SELECT id, name, email, phone, createdAt FROM users WHERE tenantId = ? ORDER BY createdAt DESC LIMIT 1000`,
      [req.tenant?.id || 1]
    );
    if ((format || '').toString().toLowerCase() === 'csv') {
      const header = 'id,name,email,phone,createdAt\n';
      const csv = header + rows.map(r => [r.id, r.name, r.email, r.phone, r.createdAt && new Date(r.createdAt).toISOString()].map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      return res.status(200).send(csv);
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error exporting users:', error);
    res.status(500).json({ success: false, message: 'Error exporting users' });
  }
});

// Admin - Minimal CRM endpoints for admin panel integration
app.get('/api/admin/leads', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, q = '' } = req.query;
    const tenantId = req.tenant?.id || 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['tenantId = ?'];
    const params = [tenantId];
    if (q) {
      where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await poolWrapper.execute(
      `SELECT id, name, email, phone, source, status, ownerUserId, notes, createdAt, updatedAt
       FROM crm_leads
       WHERE ${where.join(' AND ')}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`, params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching leads:', error);
    res.status(500).json({ success: false, message: 'Error fetching leads' });
  }
});

app.post('/api/admin/leads', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { name, email, phone, company, source, status = 'new', notes = '' } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_leads (tenantId, name, email, phone, source, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [tenantId, name, email || null, phone || null, source || null, status, notes]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('❌ Error creating lead:', error);
    res.status(500).json({ success: false, message: 'Error creating lead' });
  }
});

app.put('/api/admin/leads/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const allowed = ['name', 'email', 'phone', 'source', 'status', 'ownerUserId', 'notes'];
    const fields = [];
    const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE crm_leads SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating lead:', error);
    res.status(500).json({ success: false, message: 'Error updating lead' });
  }
});

app.delete('/api/admin/leads/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM crm_leads WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting lead:', error);
    res.status(500).json({ success: false, message: 'Error deleting lead' });
  }
});

app.get('/api/admin/contacts', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, q = '' } = req.query;
    const tenantId = req.tenant?.id || 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['tenantId = ?'];
    const params = [tenantId];
    if (q) { where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await poolWrapper.execute(
      `SELECT id, userId, name, email, phone, company, position, createdAt, updatedAt
       FROM crm_contacts
       WHERE ${where.join(' AND ')}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`, params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({ success: false, message: 'Error fetching contacts' });
  }
});
app.post('/api/admin/contacts', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { userId = null, name, email, phone, company, position } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_contacts (tenantId, userId, name, email, phone, company, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [tenantId, userId, name, email || null, phone || null, company || null, position || null]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('❌ Error creating contact:', error);
    res.status(500).json({ success: false, message: 'Error creating contact' });
  }
});
app.put('/api/admin/contacts/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const allowed = ['userId', 'name', 'email', 'phone', 'company', 'position'];
    const fields = [];
    const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE crm_contacts SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating contact:', error);
    res.status(500).json({ success: false, message: 'Error updating contact' });
  }
});
app.delete('/api/admin/contacts/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM crm_contacts WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting contact:', error);
    res.status(500).json({ success: false, message: 'Error deleting contact' });
  }
});

// Admin - Integrations endpoints
app.get('/api/admin/integrations', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const [rows] = await poolWrapper.execute(
      `SELECT id, name, type, provider, status, apiKey, apiSecret, webhookUrl, config, 
              lastTest, testResult, description, createdAt, updatedAt
       FROM integrations
       WHERE tenantId = ?
       ORDER BY createdAt DESC`,
      [tenantId]
    );
    // API key ve secret'ları güvenlik için maskele
    const maskedRows = rows.map(row => ({
      ...row,
      apiKey: row.apiKey ? (row.apiKey.length > 8 ? row.apiKey.substring(0, 4) + '***' + row.apiKey.substring(row.apiKey.length - 4) : '***') : null,
      apiSecret: row.apiSecret ? '***' : null,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {})
    }));
    res.json({ success: true, data: maskedRows });
  } catch (error) {
    console.error('❌ Error fetching integrations:', error);
    res.status(500).json({ success: false, message: 'Error fetching integrations' });
  }
});

app.post('/api/admin/integrations', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { name, type, provider, apiKey, apiSecret, webhookUrl, description, config } = req.body || {};
    if (!name || !type || !provider) {
      return res.status(400).json({ success: false, message: 'Name, type, and provider are required' });
    }
    const configJson = config ? JSON.stringify(config) : null;
    const [result] = await poolWrapper.execute(
      `INSERT INTO integrations (tenantId, name, type, provider, status, apiKey, apiSecret, webhookUrl, config, description)
       VALUES (?, ?, ?, ?, 'inactive', ?, ?, ?, ?, ?)`,
      [tenantId, name, type, provider, apiKey || null, apiSecret || null, webhookUrl || null, configJson, description || null]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('❌ Error creating integration:', error);
    res.status(500).json({ success: false, message: 'Error creating integration' });
  }
});

app.put('/api/admin/integrations/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const { name, type, provider, status, apiKey, apiSecret, webhookUrl, description, config } = req.body || {};
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (type !== undefined) { fields.push('type = ?'); params.push(type); }
    if (provider !== undefined) { fields.push('provider = ?'); params.push(provider); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (apiKey !== undefined) { fields.push('apiKey = ?'); params.push(apiKey); }
    if (apiSecret !== undefined) { fields.push('apiSecret = ?'); params.push(apiSecret); }
    if (webhookUrl !== undefined) { fields.push('webhookUrl = ?'); params.push(webhookUrl); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (config !== undefined) { fields.push('config = ?'); params.push(JSON.stringify(config)); }
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(id, tenantId);
    await poolWrapper.execute(
      `UPDATE integrations SET ${fields.join(', ')} WHERE id = ? AND tenantId = ?`,
      params
    );
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating integration:', error);
    res.status(500).json({ success: false, message: 'Error updating integration' });
  }
});

app.delete('/api/admin/integrations/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM integrations WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting integration:', error);
    res.status(500).json({ success: false, message: 'Error deleting integration' });
  }
});

app.post('/api/admin/integrations/:id/test', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM integrations WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }
    const integration = rows[0];
    
    // Trendyol entegrasyonu için özel test
    if (integration.provider === 'Trendyol' && integration.type === 'marketplace') {
      const TrendyolAPIService = require('./services/trendyol-api');
      const config = typeof integration.config === 'string' ? JSON.parse(integration.config) : (integration.config || {});
      const supplierId = config.supplierId;
      
      if (!supplierId || !integration.apiKey || !integration.apiSecret) {
        await poolWrapper.execute(
          'UPDATE integrations SET lastTest = CURRENT_TIMESTAMP, testResult = ? WHERE id = ? AND tenantId = ?',
          ['error', id, tenantId]
        );
        return res.json({ 
          success: true, 
          data: { 
            success: false, 
            message: 'Supplier ID, API Key ve API Secret gereklidir' 
          } 
        });
      }
      
      try {
        const testResult = await TrendyolAPIService.testConnection(
          supplierId,
          integration.apiKey,
          integration.apiSecret
        );
        await poolWrapper.execute(
          'UPDATE integrations SET lastTest = CURRENT_TIMESTAMP, testResult = ? WHERE id = ? AND tenantId = ?',
          [testResult.success ? 'success' : 'error', id, tenantId]
        );
        return res.json({ success: true, data: testResult });
      } catch (error) {
        await poolWrapper.execute(
          'UPDATE integrations SET lastTest = CURRENT_TIMESTAMP, testResult = ? WHERE id = ? AND tenantId = ?',
          ['error', id, tenantId]
        );
        return res.json({ 
          success: true, 
          data: { 
            success: false, 
            message: error.error || error.message || 'Bağlantı testi başarısız' 
          } 
        });
      }
    }

    // HepsiBurada entegrasyonu için özel test
    if (integration.provider === 'HepsiBurada' && integration.type === 'marketplace') {
      const HepsiBuradaAPIService = require('./services/hepsiburada-api');
      const config = typeof integration.config === 'string' ? JSON.parse(integration.config) : (integration.config || {});
      const merchantId = config.merchantId;
      
      if (!merchantId || !integration.apiKey || !integration.apiSecret) {
        await poolWrapper.execute(
          'UPDATE integrations SET lastTest = CURRENT_TIMESTAMP, testResult = ? WHERE id = ? AND tenantId = ?',
          ['error', id, tenantId]
        );
        return res.json({ 
          success: true, 
          data: { 
            success: false, 
            message: 'Merchant ID, API Key ve API Secret gereklidir' 
          } 
        });
      }
      
      try {
        const testResult = await HepsiBuradaAPIService.testConnection(
          merchantId,
          integration.apiKey,
          integration.apiSecret
        );
        await poolWrapper.execute(
          'UPDATE integrations SET lastTest = CURRENT_TIMESTAMP, testResult = ? WHERE id = ? AND tenantId = ?',
          [testResult.success ? 'success' : 'error', id, tenantId]
        );
        return res.json({ success: true, data: testResult });
      } catch (error) {
        await poolWrapper.execute(
          'UPDATE integrations SET lastTest = CURRENT_TIMESTAMP, testResult = ? WHERE id = ? AND tenantId = ?',
          ['error', id, tenantId]
        );
        return res.json({ 
          success: true, 
          data: { 
            success: false, 
            message: error.error || error.message || 'Bağlantı testi başarısız' 
          } 
        });
      }
    }
    
    // Diğer entegrasyonlar için basit test
    const testResult = integration.apiKey && integration.apiSecret ? 'success' : 'error';
    const testMessage = testResult === 'success' ? 'Integration test başarılı' : 'API Key veya Secret eksik';
    await poolWrapper.execute(
      'UPDATE integrations SET lastTest = CURRENT_TIMESTAMP, testResult = ? WHERE id = ? AND tenantId = ?',
      [testResult, id, tenantId]
    );
    res.json({ success: true, data: { success: testResult === 'success', message: testMessage } });
  } catch (error) {
    console.error('❌ Error testing integration:', error);
    res.status(500).json({ success: false, message: 'Error testing integration' });
  }
});

app.post('/api/admin/integrations/:id/sync-orders', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔄 Sync Orders Endpoint Çağrıldı');
    console.log('  Integration ID:', req.params.id);
    console.log('  Tenant ID:', req.tenant?.id || 1);
    console.log('  Request Body:', JSON.stringify(req.body, null, 2));
    
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const { startDate, endDate, page = 0, size = 200 } = req.body || {};
    
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM integrations WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    );
    
    if (rows.length === 0) {
      console.log('❌ Integration bulunamadı:', id);
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }
    
    const integration = rows[0];
    console.log('✅ Integration bulundu:');
    console.log('  Provider:', integration.provider);
    console.log('  Type:', integration.type);
    console.log('  API Key:', integration.apiKey ? '***' + integration.apiKey.slice(-4) : 'Yok');
    console.log('  API Secret:', integration.apiSecret ? '***' + integration.apiSecret.slice(-4) : 'Yok');
    
    // Sadece marketplace entegrasyonları için
    if (integration.type !== 'marketplace') {
      console.log('❌ Marketplace entegrasyonu değil:', integration.type);
      return res.status(400).json({ 
        success: false, 
        message: 'Bu endpoint sadece marketplace entegrasyonları için kullanılabilir' 
      });
    }
    
    if (!integration.apiKey || !integration.apiSecret) {
      console.log('❌ API Key veya Secret eksik');
      return res.status(400).json({ 
        success: false, 
        message: 'API Key ve API Secret gereklidir' 
      });
    }
    
    const config = typeof integration.config === 'string' ? JSON.parse(integration.config) : (integration.config || {});
    console.log('  Config:', JSON.stringify(config, null, 2));
    
    let ordersResponse;

    if (integration.provider === 'Trendyol') {
      const supplierId = config.supplierId;
      console.log('📦 Trendyol Sipariş Çekme Başlatılıyor...');
      console.log('  Supplier ID:', supplierId);
      
      if (!supplierId) {
        console.log('❌ Supplier ID eksik');
        return res.status(400).json({ 
          success: false, 
          message: 'Supplier ID gereklidir. Lütfen entegrasyon ayarlarını kontrol edin.' 
        });
      }
      
      const TrendyolAPIService = require('./services/trendyol-api');
      console.log('📤 Trendyol API Servisi çağrılıyor...');
      // Sadece Created ve Pending durumundaki siparişleri çek
      // Trendyol API'de iki ayrı istek yapıp birleştiriyoruz
      const [createdOrders, pendingOrders] = await Promise.all([
        TrendyolAPIService.getOrders(
          supplierId,
          integration.apiKey,
          integration.apiSecret,
          { startDate, endDate, page, size, status: 'Created' }
        ),
        TrendyolAPIService.getOrders(
          supplierId,
          integration.apiKey,
          integration.apiSecret,
          { startDate, endDate, page, size, status: 'Pending' }
        )
      ]);
      
      // İki sonucu birleştir
      const allOrders = [];
      if (createdOrders.success && createdOrders.data?.content) {
        allOrders.push(...createdOrders.data.content);
      }
      if (pendingOrders.success && pendingOrders.data?.content) {
        allOrders.push(...pendingOrders.data.content);
      }
      
      // Her sipariş için detaylı bilgi çek (tüm veriler için)
      console.log(`📦 ${allOrders.length} sipariş bulundu, detaylar çekiliyor...`);
      const ordersWithDetails = [];
      for (const order of allOrders) {
        try {
          const orderNumber = order.orderNumber || order.id?.toString();
          if (orderNumber) {
            const detailResponse = await TrendyolAPIService.getOrderDetail(
              supplierId,
              orderNumber,
              integration.apiKey,
              integration.apiSecret
            );
            if (detailResponse.success && detailResponse.data) {
              ordersWithDetails.push(detailResponse.data);
            } else {
              // Detay çekilemezse mevcut veriyi kullan
              ordersWithDetails.push(order);
            }
          } else {
            ordersWithDetails.push(order);
          }
        } catch (error) {
          console.error(`❌ Sipariş detayı çekilemedi: ${order.orderNumber || order.id}`, error.message);
          // Hata durumunda mevcut veriyi kullan
          ordersWithDetails.push(order);
        }
      }
      
      ordersResponse = {
        success: true,
        data: {
          content: ordersWithDetails,
          totalElements: ordersWithDetails.length,
          totalPages: 1,
          page: 0,
          size: ordersWithDetails.length
        }
      };
      console.log('📥 Trendyol API Yanıtı alındı:', ordersResponse.success ? 'Başarılı' : 'Başarısız');
      console.log(`  Toplam ${ordersWithDetails.length} sipariş (Created + Pending)`);
    } else if (integration.provider === 'HepsiBurada') {
      const merchantId = config.merchantId;
      console.log('📦 HepsiBurada Sipariş Çekme Başlatılıyor...');
      console.log('  Merchant ID:', merchantId);
      
      if (!merchantId) {
        console.log('❌ Merchant ID eksik');
        return res.status(400).json({ 
          success: false, 
          message: 'Merchant ID gereklidir. Lütfen entegrasyon ayarlarını kontrol edin.' 
        });
      }
      
      const HepsiBuradaAPIService = require('./services/hepsiburada-api');
      console.log('📤 HepsiBurada API Servisi çağrılıyor...');
      ordersResponse = await HepsiBuradaAPIService.getOrders(
        merchantId,
        integration.apiKey,
        integration.apiSecret,
        { startDate, endDate, page, size }
      );
      console.log('📥 HepsiBurada API Yanıtı alındı:', ordersResponse.success ? 'Başarılı' : 'Başarısız');
    } else {
      console.log('❌ Desteklenmeyen provider:', integration.provider);
      return res.status(400).json({ 
        success: false, 
        message: 'Desteklenmeyen marketplace sağlayıcısı' 
      });
    }
    
    if (!ordersResponse.success || !ordersResponse.data) {
      console.log('❌ API Yanıtı başarısız:', ordersResponse.error || 'Siparişler çekilemedi');
      return res.status(500).json({ 
        success: false, 
        message: ordersResponse.error || 'Siparişler çekilemedi' 
      });
    }
    
    console.log('✅ API Yanıtı başarılı, siparişler işleniyor...');
    const marketplaceOrders = ordersResponse.data.content || ordersResponse.data || [];
    console.log('  Toplam sipariş sayısı:', marketplaceOrders.length);
    let syncedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const provider = integration.provider.toLowerCase();
    
    // Her siparişi işle
    for (const marketplaceOrder of marketplaceOrders) {
      try {
        // Sipariş zaten var mı kontrol et (orderNumber ile)
        const orderNumber = marketplaceOrder.orderNumber || marketplaceOrder.orderId || marketplaceOrder.id?.toString();
        if (!orderNumber) {
          skippedCount++;
          continue;
        }
        
        // Marketplace orders tablosunda kontrol et
        const [existingOrders] = await poolWrapper.execute(
          'SELECT id FROM marketplace_orders WHERE tenantId = ? AND provider = ? AND externalOrderId = ?',
          [tenantId, provider, orderNumber]
        );
        
        if (existingOrders.length > 0) {
          skippedCount++;
          continue; // Sipariş zaten var
        }
        
        // Marketplace sipariş durumunu sistem durumuna çevir
        const marketplaceStatus = marketplaceOrder.status || marketplaceOrder.orderStatus || 'Pending';
        let systemStatus = 'pending';
        if (marketplaceStatus.includes('Shipped') || marketplaceStatus.includes('Delivered') || marketplaceStatus.includes('Teslim')) {
          systemStatus = 'completed';
        } else if (marketplaceStatus.includes('Cancelled') || marketplaceStatus.includes('Canceled') || marketplaceStatus.includes('İptal')) {
          systemStatus = 'cancelled';
        } else if (marketplaceStatus.includes('Processing') || marketplaceStatus.includes('Preparing') || marketplaceStatus.includes('Hazırlanıyor')) {
          systemStatus = 'processing';
        }
        
        // Müşteri bilgileri
        let customerName = 'Marketplace Müşteri';
        let customerEmail = '';
        let customerPhone = '';
        let shippingAddress = 'Adres bilgisi yok';
        let city = '';
        let district = '';
        
        if (provider === 'trendyol') {
          const customerInfo = marketplaceOrder.customerFirstName || marketplaceOrder.shipmentAddress?.firstName || '';
          const customerSurname = marketplaceOrder.customerLastName || marketplaceOrder.shipmentAddress?.lastName || '';
          customerName = `${customerInfo} ${customerSurname}`.trim() || 'Trendyol Müşteri';
          customerEmail = marketplaceOrder.customerEmail || '';
          customerPhone = marketplaceOrder.customerPhone || marketplaceOrder.shipmentAddress?.phoneNumber || '';
          
          const shipmentAddress = marketplaceOrder.shipmentAddress || {};
          shippingAddress = [
            shipmentAddress.address1 || '',
            shipmentAddress.address2 || '',
            shipmentAddress.district || '',
            shipmentAddress.city || '',
            shipmentAddress.country || 'Turkey'
          ].filter(Boolean).join(', ');
          city = shipmentAddress.city || '';
          district = shipmentAddress.district || '';
        } else if (provider === 'hepsiburada') {
          customerName = marketplaceOrder.customerName || marketplaceOrder.buyer?.name || 'HepsiBurada Müşteri';
          customerEmail = marketplaceOrder.customerEmail || marketplaceOrder.buyer?.email || '';
          customerPhone = marketplaceOrder.customerPhone || marketplaceOrder.buyer?.phone || '';
          
          const address = marketplaceOrder.shippingAddress || marketplaceOrder.address || {};
          shippingAddress = [
            address.addressLine1 || address.address || '',
            address.addressLine2 || '',
            address.district || address.districtName || '',
            address.city || address.cityName || '',
            address.country || 'Turkey'
          ].filter(Boolean).join(', ');
          city = address.city || address.cityName || '';
          district = address.district || address.districtName || '';
        }
        
        // Toplam tutar
        const totalAmount = parseFloat(marketplaceOrder.totalPrice || marketplaceOrder.totalAmount || marketplaceOrder.grossAmount || 0);
        
        // Marketplace siparişini oluştur (ayrı tabloda)
        const [orderResult] = await poolWrapper.execute(
          `INSERT INTO marketplace_orders (tenantId, provider, externalOrderId, totalAmount, status, shippingAddress, 
           city, district, fullAddress, customerName, customerEmail, customerPhone, orderData)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenantId,
            provider,
            orderNumber,
            totalAmount,
            systemStatus,
            shippingAddress,
            city,
            district,
            shippingAddress,
            customerName,
            customerEmail,
            customerPhone,
            JSON.stringify(marketplaceOrder)
          ]
        );
        
        const marketplaceOrderId = orderResult.insertId;
        
        // Marketplace sipariş öğelerini ekle
        const orderLines = marketplaceOrder.lines || marketplaceOrder.orderLines || marketplaceOrder.items || [];
        for (const line of orderLines) {
          const productName = line.productName || line.productTitle || line.name || 'Ürün';
          const quantity = parseInt(line.quantity || 1);
          const price = parseFloat(line.price || line.salePrice || line.unitPrice || 0);
          
          await poolWrapper.execute(
            `INSERT INTO marketplace_order_items (tenantId, marketplaceOrderId, productName, quantity, price, productImage, productSku, itemData)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tenantId,
              marketplaceOrderId,
              productName,
              quantity,
              price,
              line.productImage || line.imageUrl || null,
              line.productSku || line.sku || null,
              JSON.stringify(line)
            ]
          );
        }
        
        syncedCount++;
      } catch (error) {
        console.error(`❌ Error syncing ${integration.provider} order:`, error);
        errors.push({
          orderNumber: marketplaceOrder.orderNumber || marketplaceOrder.orderId || marketplaceOrder.id,
          error: error.message
        });
      }
    }
    
    // Entegrasyon durumunu güncelle
    await poolWrapper.execute(
      'UPDATE integrations SET lastTest = CURRENT_TIMESTAMP, testResult = ? WHERE id = ? AND tenantId = ?',
      ['success', id, tenantId]
    );
    
    res.json({
      success: true,
      data: {
        synced: syncedCount,
        skipped: skippedCount,
        total: marketplaceOrders.length,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `${syncedCount} sipariş senkronize edildi, ${skippedCount} sipariş atlandı`
    });
  } catch (error) {
    console.error('❌ Error syncing Trendyol orders:', error);
    res.status(500).json({ 
      success: false, 
      message: error.error || error.message || 'Sipariş senkronizasyonu başarısız' 
    });
  }
});

// Admin - Invoices endpoints
// Admin - Marketplace siparişlerini listele
app.get('/api/admin/marketplace-orders', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { provider, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClauses = ['tenantId = ?'];
    let params = [tenantId];

    if (provider) {
      whereClauses.push('provider = ?');
      params.push(provider);
    }

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const [orders] = await poolWrapper.execute(
      `SELECT * FROM marketplace_orders ${whereSql} ORDER BY syncedAt DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Her sipariş için öğeleri çek
    for (const order of orders) {
      const [items] = await poolWrapper.execute(
        'SELECT * FROM marketplace_order_items WHERE marketplaceOrderId = ?',
        [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('❌ Error getting marketplace orders:', error);
    res.status(500).json({ success: false, message: 'Error getting marketplace orders' });
  }
});

app.get('/api/admin/invoices', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { page = 1, limit = 50, q = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['tenantId = ?'];
    const params = [tenantId];
    if (q) {
      where.push('(invoiceNumber LIKE ? OR customerName LIKE ? OR customerEmail LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await poolWrapper.execute(
      `SELECT id, invoiceNumber, customerName, customerEmail, customerPhone, orderId, 
              amount, taxAmount, totalAmount, currency, invoiceDate, dueDate, status, 
              fileName, fileSize, shareToken, shareUrl, notes, createdAt, updatedAt
       FROM invoices
       WHERE ${where.join(' AND ')}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching invoices:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoices' });
  }
});

app.post('/api/admin/invoices', authenticateAdmin, invoiceUpload.single('file'), async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const {
      invoiceNumber,
      customerName,
      customerEmail,
      customerPhone,
      orderId,
      amount,
      taxAmount,
      totalAmount,
      currency = 'TRY',
      invoiceDate,
      dueDate,
      status = 'draft',
      notes
    } = req.body || {};

    if (!invoiceNumber || !invoiceDate || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Fatura numarası, tarih ve tutar gereklidir'
      });
    }

    // Share token oluştur
    const crypto = require('crypto');
    const shareToken = crypto.randomBytes(32).toString('hex');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${baseUrl}/api/invoices/share/${shareToken}`;

    let filePath = null;
    let fileName = null;
    let fileSize = null;

    if (req.file) {
      filePath = `/uploads/invoices/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
    }

    const [result] = await poolWrapper.execute(
      `INSERT INTO invoices (tenantId, invoiceNumber, customerName, customerEmail, customerPhone, 
       orderId, amount, taxAmount, totalAmount, currency, invoiceDate, dueDate, status, 
       filePath, fileName, fileSize, shareToken, shareUrl, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        invoiceNumber,
        customerName || null,
        customerEmail || null,
        customerPhone || null,
        orderId ? parseInt(orderId) : null,
        parseFloat(amount),
        taxAmount ? parseFloat(taxAmount) : 0,
        totalAmount ? parseFloat(totalAmount) : parseFloat(amount),
        currency,
        invoiceDate,
        dueDate || null,
        status,
        filePath,
        fileName,
        fileSize,
        shareToken,
        shareUrl,
        notes || null
      ]
    );

    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    // Yüklenen dosyayı sil
    if (req.file) {
      try {
        fs.unlinkSync(path.join(invoicesDir, req.file.filename));
      } catch (unlinkError) {
        console.error('❌ Error deleting uploaded file:', unlinkError);
      }
    }
    res.status(500).json({ success: false, message: 'Error creating invoice' });
  }
});

app.put('/api/admin/invoices/:id', authenticateAdmin, invoiceUpload.single('file'), async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const {
      invoiceNumber,
      customerName,
      customerEmail,
      customerPhone,
      orderId,
      amount,
      taxAmount,
      totalAmount,
      currency,
      invoiceDate,
      dueDate,
      status,
      notes
    } = req.body || {};

    // Mevcut faturayı kontrol et
    const [existing] = await poolWrapper.execute(
      'SELECT filePath FROM invoices WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const fields = [];
    const params = [];

    if (invoiceNumber !== undefined) { fields.push('invoiceNumber = ?'); params.push(invoiceNumber); }
    if (customerName !== undefined) { fields.push('customerName = ?'); params.push(customerName); }
    if (customerEmail !== undefined) { fields.push('customerEmail = ?'); params.push(customerEmail); }
    if (customerPhone !== undefined) { fields.push('customerPhone = ?'); params.push(customerPhone); }
    if (orderId !== undefined) { fields.push('orderId = ?'); params.push(orderId ? parseInt(orderId) : null); }
    if (amount !== undefined) { fields.push('amount = ?'); params.push(parseFloat(amount)); }
    if (taxAmount !== undefined) { fields.push('taxAmount = ?'); params.push(parseFloat(taxAmount)); }
    if (totalAmount !== undefined) { fields.push('totalAmount = ?'); params.push(parseFloat(totalAmount)); }
    if (currency !== undefined) { fields.push('currency = ?'); params.push(currency); }
    if (invoiceDate !== undefined) { fields.push('invoiceDate = ?'); params.push(invoiceDate); }
    if (dueDate !== undefined) { fields.push('dueDate = ?'); params.push(dueDate || null); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }

    // Yeni dosya yüklendiyse
    if (req.file) {
      // Eski dosyayı sil
      if (existing[0].filePath) {
        try {
          const oldFilePath = path.join(__dirname, existing[0].filePath);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (unlinkError) {
          console.error('❌ Error deleting old file:', unlinkError);
        }
      }

      const filePath = `/uploads/invoices/${req.file.filename}`;
      fields.push('filePath = ?'); params.push(filePath);
      fields.push('fileName = ?'); params.push(req.file.originalname);
      fields.push('fileSize = ?'); params.push(req.file.size);
    }

    if (fields.length === 0) {
      return res.json({ success: true, message: 'No changes' });
    }

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(id, tenantId);

    await poolWrapper.execute(
      `UPDATE invoices SET ${fields.join(', ')} WHERE id = ? AND tenantId = ?`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating invoice:', error);
    if (req.file) {
      try {
        fs.unlinkSync(path.join(invoicesDir, req.file.filename));
      } catch (unlinkError) {
        console.error('❌ Error deleting uploaded file:', unlinkError);
      }
    }
    res.status(500).json({ success: false, message: 'Error updating invoice' });
  }
});

app.delete('/api/admin/invoices/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);

    // Dosyayı sil
    const [invoice] = await poolWrapper.execute(
      'SELECT filePath FROM invoices WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    );

    if (invoice.length > 0 && invoice[0].filePath) {
      try {
        const filePath = path.join(__dirname, invoice[0].filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (unlinkError) {
        console.error('❌ Error deleting invoice file:', unlinkError);
      }
    }

    await poolWrapper.execute('DELETE FROM invoices WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting invoice:', error);
    res.status(500).json({ success: false, message: 'Error deleting invoice' });
  }
});

// Admin invoice PDF download endpoint
app.get('/api/admin/invoices/:id/download', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);

    const [rows] = await poolWrapper.execute(
      'SELECT filePath, fileName FROM invoices WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    );

    if (rows.length === 0 || !rows[0].filePath) {
      return res.status(404).json({ success: false, message: 'Invoice file not found' });
    }

    const filePath = path.join(__dirname, rows[0].filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Invoice file not found' });
    }

    const fileName = rows[0].fileName || 'invoice.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ Error downloading invoice:', error);
    res.status(500).json({ success: false, message: 'Error downloading invoice' });
  }
});

// Public invoice share endpoint (token ile erişim)
app.get('/api/invoices/share/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const [rows] = await poolWrapper.execute(
      `SELECT id, invoiceNumber, customerName, customerEmail, customerPhone, 
              amount, taxAmount, totalAmount, currency, invoiceDate, dueDate, 
              status, filePath, fileName, shareUrl, notes
       FROM invoices
       WHERE shareToken = ?`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = rows[0];
    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('❌ Error fetching shared invoice:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoice' });
  }
});

// Public invoice PDF download endpoint
app.get('/api/invoices/share/:token/download', async (req, res) => {
  try {
    const { token } = req.params;
    const [rows] = await poolWrapper.execute(
      'SELECT filePath, fileName FROM invoices WHERE shareToken = ?',
      [token]
    );

    if (rows.length === 0 || !rows[0].filePath) {
      return res.status(404).json({ success: false, message: 'Invoice file not found' });
    }

    const filePath = path.join(__dirname, rows[0].filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Invoice file not found' });
    }

    const fileName = rows[0].fileName || 'invoice.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ Error downloading invoice:', error);
    res.status(500).json({ success: false, message: 'Error downloading invoice' });
  }
});

// Kargo fişi oluşturma endpoint'i
app.post('/api/admin/generate-cargo-slip', authenticateAdmin, async (req, res) => {
  try {
    const {
      orderId,
      invoiceUrl,
      cargoTrackingNumber,
      cargoProviderName,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      city,
      district,
      items = []
    } = req.body;

    // Validasyon: orderId zorunlu
    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'orderId parametresi gereklidir' 
      });
    }

    // PDFKit'i dinamik olarak yükle
    let PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch (error) {
      console.error('❌ PDFKit yüklenemedi:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'PDFKit kütüphanesi bulunamadı. Lütfen npm install pdfkit yapın.' 
      });
    }

    // QR kod için qrcode kütüphanesi
    let QRCode;
    try {
      QRCode = require('qrcode');
    } catch (error) {
      console.error('❌ QRCode yüklenemedi:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'QRCode kütüphanesi bulunamadı. Lütfen npm install qrcode yapın.' 
      });
    }

    // EAN-128 barkod için bwip-js kütüphanesi
    let bwipjs;
    try {
      bwipjs = require('bwip-js');
    } catch (error) {
      console.error('❌ bwip-js yüklenemedi:', error);
      // Fallback: QR kod kullanılacak
      bwipjs = null;
    }

    // A5 dikey boyutları: 148mm x 210mm (yaklaşık 420pt x 595pt)
    const doc = new PDFDocument({
      size: [420, 595], // A5 dikey (portrait)
      layout: 'portrait',
      margins: { top: 15, bottom: 15, left: 15, right: 15 },
      info: {
        Title: 'Kargo Fişi',
        Author: 'Huğlu Outdoor',
        Subject: 'Kargo Fişi',
        Keywords: 'kargo, fiş, cargo',
        Creator: 'Huğlu Outdoor Kargo Fişi Sistemi'
      }
    });

    // UTF-8 desteği için font ayarları
    // Helvetica Türkçe karakterleri destekler
    doc.font('Helvetica');
    
    // Türkçe karakterleri İngilizce karşılıklarına çevir
    const replaceTurkishChars = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'U')
        .replace(/ş/g, 's')
        .replace(/Ş/g, 'S')
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'O')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'C');
    };

    // UTF-8 encoding için text wrapper fonksiyonu
    const addUTF8Text = (text, x, y, options = {}) => {
      if (!text) return;
      // Metni UTF-8 olarak encode et ve PDFKit'e gönder
      // PDFKit otomatik olarak UTF-8'i destekler, ancak bazı karakterler için
      // özel işlem gerekebilir
      try {
        // Metni normalize et (Türkçe karakterler için)
        const normalizedText = String(text).normalize('NFC');
        doc.text(normalizedText, x, y, options);
      } catch (error) {
        console.error('Text encoding hatası:', error);
        // Fallback: orijinal metni kullan
        doc.text(String(text), x, y, options);
      }
    };

    // Üst başlık bölümü - gradient efekti için koyu arka plan (dikey için)
    doc.rect(0, 0, 420, 60).fill('#1e293b'); // Slate-800 (küçültüldü)
    doc.fontSize(22)
       .fillColor('#ffffff')
       .font('Helvetica-Bold');
    addUTF8Text('KARGO FISI', 20, 20, { align: 'center', width: 380 });
    
    // Alt çizgi
    doc.strokeColor('#3b82f6')
       .lineWidth(1.5)
       .moveTo(60, 50)
       .lineTo(360, 50)
       .stroke();

    // QR kod bölümü - önce oluştur (adres yanına yerleştirilecek)
    let qrCodeDataUrl;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(invoiceUrl || 'https://example.com', {
        width: 80,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('QR kod oluşturma hatası:', error);
      qrCodeDataUrl = null;
    }

    // Müşteri bilgileri bölümü (sol taraf - dikey layout)
    let yPos = 75;
    doc.fillColor('#0f172a')
       .fontSize(12)
       .font('Helvetica-Bold');
    addUTF8Text('MUSTERI BILGILERI', 20, yPos);
    
    // Alt çizgi
    doc.strokeColor('#cbd5e1')
       .lineWidth(1)
       .moveTo(20, yPos + 18)
       .lineTo(280, yPos + 18)
       .stroke();
    
    yPos += 25;
    doc.fillColor('#1e293b')
       .fontSize(9)
       .font('Helvetica');
    
    if (customerName) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica');
      addUTF8Text('Ad Soyad:', 20, yPos);
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
      addUTF8Text(replaceTurkishChars(customerName || ''), 85, yPos, { width: 220 });
      yPos += 15;
    }
    if (customerPhone) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica');
      addUTF8Text('Telefon:', 20, yPos);
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica');
      addUTF8Text(replaceTurkishChars(customerPhone || ''), 85, yPos, { width: 220 });
      yPos += 15;
    }
    if (customerEmail) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica');
      addUTF8Text('E-posta:', 20, yPos);
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
      addUTF8Text(replaceTurkishChars(customerEmail || ''), 85, yPos, { width: 220, lineGap: 1 });
      yPos += 16;
    }
    
    // QR kod ve adres yan yana
    const addressStartY = yPos;
    if (customerAddress) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica');
      addUTF8Text('Adres:', 20, yPos);
      
      // Adresi 50 karakter ile sınırla
      const addressText = replaceTurkishChars(customerAddress || '');
      const maxChars = 50;
      const addressLines = [];
      let remainingText = addressText;
      
      while (remainingText.length > 0) {
        if (remainingText.length <= maxChars) {
          addressLines.push(remainingText);
          break;
        }
        // 50 karaktere kadar kes
        let cutPoint = maxChars;
        // Kelime ortasında kesmemek için son boşluğu bul
        const lastSpace = remainingText.lastIndexOf(' ', maxChars);
        if (lastSpace > maxChars * 0.7) {
          cutPoint = lastSpace;
        }
        addressLines.push(remainingText.substring(0, cutPoint));
        remainingText = remainingText.substring(cutPoint).trim();
      }
      
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
      addressLines.forEach((line, idx) => {
        addUTF8Text(line, 85, yPos + (idx * 10), { width: 220, lineGap: 1 });
      });
      
      const addressHeight = addressLines.length * 10;
      yPos += addressHeight;
      
      // QR kod sağ tarafta (adres yanında)
      if (qrCodeDataUrl) {
        const qrSize = 60; // Küçültüldü
        const qrX = 320;
        const qrY = addressStartY;
        
        // QR kod arka plan kutusu
        doc.rect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 15)
           .fill('#f8fafc')
           .stroke('#e2e8f0')
           .lineWidth(0.5);
        
        const qrImage = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
        doc.image(qrImage, qrX, qrY, { width: qrSize, height: qrSize });
        
        doc.fontSize(6)
           .fillColor('#475569')
           .font('Helvetica-Bold');
        addUTF8Text('FATURA', qrX, qrY + qrSize + 2, { width: qrSize, align: 'center' });
      }
      
      yPos += 5;
    } else {
      // Adres yoksa QR kod yine sağda göster
      if (qrCodeDataUrl) {
        const qrSize = 60;
        const qrX = 320;
        const qrY = yPos;
        
        doc.rect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 15)
           .fill('#f8fafc')
           .stroke('#e2e8f0')
           .lineWidth(0.5);
        
        const qrImage = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
        doc.image(qrImage, qrX, qrY, { width: qrSize, height: qrSize });
        
        doc.fontSize(6)
           .fillColor('#475569')
           .font('Helvetica-Bold');
        addUTF8Text('FATURA', qrX, qrY + qrSize + 2, { width: qrSize, align: 'center' });
      }
      yPos += 20;
    }
    
    if (district || city) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica');
      addUTF8Text('Ilce/Il:', 20, yPos);
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica');
      addUTF8Text(replaceTurkishChars(`${district || ''} ${city || ''}`.trim()), 85, yPos, { width: 220 });
      yPos += 16;
    }

    // Ürün bilgileri bölümü (kargo bilgilerinden önce)
    let productYPos = 250;
    if (items && items.length > 0) {
      doc.fillColor('#0f172a')
         .fontSize(12)
         .font('Helvetica-Bold');
      addUTF8Text('URUN BILGILERI', 20, productYPos);
      
      // Alt çizgi
      doc.strokeColor('#cbd5e1')
         .lineWidth(1)
         .moveTo(20, productYPos + 18)
         .lineTo(380, productYPos + 18)
         .stroke();
      
      productYPos += 30;
      
      // Ürün listesi
      // QR kod ve footer için yaklaşık 200pt yer bırak (595 - 200 = 395)
      const maxYPos = 395;
      
      items.forEach((item, index) => {
        // Item validasyonu
        if (!item || typeof item !== 'object') {
          console.warn(`⚠️ Geçersiz item at index ${index}:`, item);
          return;
        }
        
        const productName = replaceTurkishChars(item.productName || 'Urun Adi');
        const productSku = item.productSku ? replaceTurkishChars(String(item.productSku)) : '';
        
        // Ürün için gereken minimum yükseklik: ürün adı (max 2 satır) + SKU + boşluk
        const itemHeight = 35; // Sabit yükseklik (2 satır ürün adı + SKU + boşluk)
        
        // Eğer sayfa dolacaksa yeni sayfa ekle
        if (productYPos + itemHeight > maxYPos) {
          doc.addPage();
          productYPos = 85;
        }
        
        // Ürün adı (geniş alan, uzun ise otomatik alt satıra geçer, max 2 satır)
        doc.fillColor('#64748b').fontSize(9).font('Helvetica');
        addUTF8Text(`${index + 1}. ${productName}`, 20, productYPos, { width: 360, lineGap: 2, ellipsis: true });
        productYPos += 24; // 2 satır için yeterli alan
        
        // SKU bilgisi (ürün adının altında)
        if (productSku && String(productSku).trim() !== '') {
          doc.fillColor('#64748b').fontSize(8).font('Helvetica');
          addUTF8Text(`SKU: ${productSku}`, 20, productYPos, { width: 360 });
          productYPos += 12;
        } else {
          productYPos += 3; // SKU yoksa küçük boşluk
        }
        
        // Ayırıcı çizgi (son ürün değilse)
        if (index < items.length - 1) {
          productYPos += 3;
          doc.strokeColor('#e2e8f0')
             .lineWidth(0.5)
             .moveTo(20, productYPos)
             .lineTo(380, productYPos)
             .stroke();
          productYPos += 5;
        }
      });
      
      productYPos += 20;
    }

    // Kargo bilgileri bölümü (alt kısım - dikey layout)
    let cargoYPos = items && items.length > 0 ? productYPos : 250;
    doc.fillColor('#0f172a')
       .fontSize(12)
       .font('Helvetica-Bold');
    addUTF8Text('KARGO BILGILERI', 20, cargoYPos);
    
    // Alt çizgi
    doc.strokeColor('#cbd5e1')
       .lineWidth(1)
       .moveTo(20, cargoYPos + 18)
       .lineTo(380, cargoYPos + 18)
       .stroke();
    
    cargoYPos += 30;
    if (cargoProviderName) {
      doc.fillColor('#64748b').fontSize(9).font('Helvetica');
      addUTF8Text('Kargo Firmasi:', 20, cargoYPos);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
      addUTF8Text(replaceTurkishChars(cargoProviderName || ''), 120, cargoYPos, { width: 280 });
      cargoYPos += 20;
    }
    
    if (cargoTrackingNumber) {
      doc.fillColor('#64748b').fontSize(9).font('Helvetica');
      addUTF8Text('Kargo Kodu:', 20, cargoYPos);
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
      addUTF8Text(cargoTrackingNumber || '', 120, cargoYPos, { width: 280 });
      cargoYPos += 25;
      
      // EAN-128 (Code128) barkod oluştur (küçültüldü)
      const barcodeY = cargoYPos;
      const barcodeHeight = 30; // Küçültüldü (50'den 30'a)
      const barcodeWidth = 300; // Küçültüldü (380'den 300'e)
      
      // Barkod için kutu
      doc.rect(20, barcodeY - 3, barcodeWidth, barcodeHeight + 15)
         .fill('#ffffff')
         .stroke('#e2e8f0')
         .lineWidth(0.5);
      
      let barcodeImage = null;
      
      // bwip-js ile EAN-128 (Code128) barkod oluştur
      if (bwipjs && cargoTrackingNumber) {
        try {
          const barcodeBuffer = await bwipjs.toBuffer({
            bcid: 'code128',        // Code128 formatı (EAN-128 uyumlu)
            text: String(cargoTrackingNumber),
            scale: 1.5, // Küçültüldü (2'den 1.5'e)
            height: 8,  // Küçültüldü (10'dan 8'e)
            includetext: true,      // Barkod altında metin göster
            textxalign: 'center',
            textsize: 8  // Küçültüldü (10'dan 8'e)
          });
          barcodeImage = barcodeBuffer;
        } catch (error) {
          console.error('❌ EAN-128 barkod oluşturma hatası:', error);
          barcodeImage = null;
        }
      }
      
      // Barkod görseli ekle
      if (barcodeImage) {
        doc.image(barcodeImage, 30, barcodeY, { width: barcodeWidth, height: barcodeHeight });
        cargoYPos += barcodeHeight + 8;
      } else {
        // Fallback: QR kod kullan
        try {
          const barcodeDataUrl = await QRCode.toDataURL(cargoTrackingNumber, {
            width: 360,
            margin: 1,
            errorCorrectionLevel: 'M'
          });
          const qrImage = Buffer.from(barcodeDataUrl.split(',')[1], 'base64');
          doc.image(qrImage, 30, barcodeY, { width: 360, height: barcodeHeight });
          cargoYPos += barcodeHeight + 10;
        } catch (error) {
          // Son fallback: Metin olarak göster
          doc.fontSize(16)
             .font('Courier-Bold')
             .fillColor('#0f172a');
          addUTF8Text(cargoTrackingNumber || '', 20, barcodeY + 10, { 
            align: 'center',
            width: 380
          });
          cargoYPos += 35;
        }
      }
      
      // EAN-128 etiketi
      doc.fontSize(7)
         .font('Helvetica')
         .fillColor('#64748b');
      addUTF8Text('EAN-128', 20, cargoYPos, { align: 'center', width: barcodeWidth });
    }

    // QR kod zaten yukarıda adres yanında gösterildi, burada tekrar oluşturmaya gerek yok

    // Alt bilgi bölümü - footer (dikey için)
    const footerHeight = 35; // Küçültüldü (40'tan 35'e)
    let finalFooterY = cargoYPos + 15;
    
    // Footer sayfa dışına taşmasın
    if (finalFooterY + footerHeight > 595) {
      // Footer'ı sayfa sonuna yerleştir
      finalFooterY = 595 - footerHeight;
    }
    
    doc.rect(0, finalFooterY, 420, footerHeight).fill('#f1f5f9');
    
    doc.fontSize(7)
       .font('Helvetica')
       .fillColor('#475569');
    addUTF8Text(`Siparis No: ${orderId}`, 20, finalFooterY + 6, { align: 'left' });
    
    addUTF8Text(`Olusturulma: ${new Date().toLocaleString('tr-TR')}`, 20, finalFooterY + 16, { align: 'left' });
    
    // Sağ tarafta logo/şirket bilgisi
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#1e293b');
    addUTF8Text('Huglu Outdoor', 220, finalFooterY + 6, { align: 'right', width: 180 });
    
    doc.fontSize(6)
       .font('Helvetica')
       .fillColor('#64748b');
    addUTF8Text('Kargo Fisi', 220, finalFooterY + 16, { align: 'right', width: 180 });

    // PDF'i response olarak gönder
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kargo-fisi-${orderId}.pdf"`);
    
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('❌ Kargo fişi oluşturma hatası:', error);
    console.error('❌ Hata detayları:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    
    // Eğer response henüz gönderilmediyse hata döndür
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Kargo fişi oluşturulamadı: ' + (error.message || 'Bilinmeyen hata') 
      });
    }
  }
});

app.get('/api/admin/opportunities', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, q = '', stageId = '' } = req.query;
    const tenantId = req.tenant?.id || 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['tenantId = ?'];
    const params = [tenantId];
    if (q) { where.push('(title LIKE ? )'); params.push(`%${q}%`); }
    if (stageId) { where.push('stageId = ?'); params.push(parseInt(stageId)); }
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await poolWrapper.execute(
      `SELECT d.id, d.title, d.value, d.currency, d.stageId, d.status, d.expectedCloseDate, d.createdAt,
              c.name AS contactName, s.name AS stageName, s.probability
       FROM crm_deals d
       LEFT JOIN crm_contacts c ON c.id = d.contactId
       LEFT JOIN crm_pipeline_stages s ON s.id = d.stageId
       WHERE ${where.join(' AND ')}
       ORDER BY d.createdAt DESC
       LIMIT ? OFFSET ?`, params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching opportunities:', error);
    res.status(500).json({ success: false, message: 'Error fetching opportunities' });
  }
});
app.post('/api/admin/opportunities', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { title, contactId = null, value = 0, currency = 'TRY', stageId = null, status = 'open', expectedCloseDate = null, ownerUserId = null } = req.body || {};
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });
    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_deals (tenantId, title, contactId, value, currency, stageId, status, expectedCloseDate, ownerUserId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [tenantId, title, contactId, value, currency, stageId, status, expectedCloseDate, ownerUserId]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('❌ Error creating opportunity:', error);
    res.status(500).json({ success: false, message: 'Error creating opportunity' });
  }
});
app.put('/api/admin/opportunities/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const allowed = ['title', 'contactId', 'value', 'currency', 'stageId', 'status', 'expectedCloseDate', 'ownerUserId'];
    const fields = [];
    const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE crm_deals SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating opportunity:', error);
    res.status(500).json({ success: false, message: 'Error updating opportunity' });
  }
});
app.delete('/api/admin/opportunities/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM crm_deals WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting opportunity:', error);
    res.status(500).json({ success: false, message: 'Error deleting opportunity' });
  }
});
app.get('/api/admin/activities', authenticateAdmin, async (req, res) => {
  try {
    const { contactId, leadId, opportunityId, page = 1, limit = 50, q = '', type = '' } = req.query;
    const tenantId = req.tenant?.id || 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['a.tenantId = ?'];
    const params = [tenantId];
    if (contactId) { where.push('a.contactId = ?'); params.push(parseInt(contactId)); }
    if (leadId) { where.push('a.leadId = ?'); params.push(parseInt(leadId)); }
    if (opportunityId) { where.push('a.opportunityId = ?'); params.push(parseInt(opportunityId)); }
    if (q) { where.push('(a.title LIKE ? OR a.notes LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    if (type) { where.push('a.type = ?'); params.push(type); }
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await poolWrapper.execute(
      `SELECT a.id, a.contactId, a.leadId, a.opportunityId, a.type, a.title, a.notes, a.status, a.activityAt, a.duration, a.createdAt,
              c.name AS contactName
       FROM crm_activities a
       LEFT JOIN crm_contacts c ON c.id = a.contactId
       WHERE ${where.join(' AND ')}
       ORDER BY a.createdAt DESC
       LIMIT ? OFFSET ?`, params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching activities:', error);
    res.status(500).json({ success: false, message: 'Error fetching activities' });
  }
});
app.post('/api/admin/activities', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { contactId = null, leadId = null, opportunityId = null, type = 'call', title, notes = '', status = 'planned', activityAt = null, duration = 0 } = req.body || {};
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });
    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_activities (tenantId, contactId, leadId, opportunityId, type, title, notes, status, activityAt, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [tenantId, contactId, leadId, opportunityId, type, title, notes, status, activityAt, duration]
    );
    const [newActivity] = await poolWrapper.execute('SELECT * FROM crm_activities WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: newActivity[0] });
  } catch (error) {
    console.error('❌ Error creating activity:', error);
    res.status(500).json({ success: false, message: 'Error creating activity' });
  }
});
app.put('/api/admin/activities/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const allowed = ['contactId', 'leadId', 'opportunityId', 'type', 'title', 'notes', 'status', 'activityAt', 'duration'];
    const fields = [];
    const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE crm_activities SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    const [updated] = await poolWrapper.execute('SELECT * FROM crm_activities WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('❌ Error updating activity:', error);
    res.status(500).json({ success: false, message: 'Error updating activity' });
  }
});
app.delete('/api/admin/activities/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM crm_activities WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting activity:', error);
    res.status(500).json({ success: false, message: 'Error deleting activity' });
  }
});
app.get('/api/admin/pipeline', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const [rows] = await poolWrapper.execute(
      `SELECT id, name, probability, sequence, createdAt FROM crm_pipeline_stages WHERE tenantId = ? ORDER BY sequence ASC, id ASC`,
      [tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching pipeline:', error);
    res.status(500).json({ success: false, message: 'Error fetching pipeline' });
  }
});
app.post('/api/admin/pipeline', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { name, probability = 0, sequence = 1 } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_pipeline_stages (tenantId, name, probability, sequence) VALUES (?, ?, ?, ?)`,
      [tenantId, name, parseInt(probability), parseInt(sequence)]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('❌ Error creating pipeline stage:', error);
    res.status(500).json({ success: false, message: 'Error creating pipeline stage' });
  }
});
app.put('/api/admin/pipeline/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const allowed = ['name', 'probability', 'sequence'];
    const fields = [];
    const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE crm_pipeline_stages SET ${fields.join(', ')} WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating pipeline stage:', error);
    res.status(500).json({ success: false, message: 'Error updating pipeline stage' });
  }
});
app.delete('/api/admin/pipeline/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM crm_pipeline_stages WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting pipeline stage:', error);
    res.status(500).json({ success: false, message: 'Error deleting pipeline stage' });
  }
});

// =========================
// CRM FULL ENDPOINTS - Frontend API compatibility
// =========================

// CRM Leads endpoints - /admin/crm/leads
app.get('/api/admin/crm/leads', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const tenantId = req.tenant?.id || 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['tenantId = ?'];
    const params = [tenantId];
    if (status && status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const countParams = [...params];
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await poolWrapper.execute(
      `SELECT id, name, email, phone, company, title, status, source, value, notes, assignedTo, createdAt, updatedAt
       FROM crm_leads
       ${whereClause}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`, params
    );
    const [countRows] = await poolWrapper.execute(
      `SELECT COUNT(*) as total FROM crm_leads ${whereClause}`, 
      countParams
    );
    res.json({ success: true, data: { leads: rows, total: countRows[0].total } });
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'FETCH_LEADS');
    
    // GÜVENLİK: Production'da stack trace loglanmaz
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error fetching CRM leads:', error);
      console.error('Error stack:', error.stack);
    }
    
    const errorResponse = createSafeErrorResponse(error, 'Error fetching leads');
    res.status(500).json(errorResponse);
  }
});

app.get('/api/admin/crm/leads/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM crm_leads WHERE id = ? AND tenantId = ?', [id, tenantId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error fetching lead:', error);
    res.status(500).json({ success: false, message: 'Error fetching lead' });
  }
});

app.post('/api/admin/crm/leads', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { name, email, phone, company, title, status = 'new', source, value = 0, notes, assignedTo } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_leads (tenantId, name, email, phone, company, title, status, source, value, notes, assignedTo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, name, email || null, phone || null, company || null, title || null, status, source || null, value, notes || null, assignedTo || null]
    );
    const [newLead] = await poolWrapper.execute('SELECT * FROM crm_leads WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: newLead[0] });
  } catch (error) {
    console.error('❌ Error creating CRM lead:', error);
    res.status(500).json({ success: false, message: 'Error creating lead' });
  }
});

app.put('/api/admin/crm/leads/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const allowed = ['name', 'email', 'phone', 'company', 'title', 'status', 'source', 'value', 'notes', 'assignedTo'];
    const fields = [];
    const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE crm_leads SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    const [updated] = await poolWrapper.execute('SELECT * FROM crm_leads WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('❌ Error updating CRM lead:', error);
    res.status(500).json({ success: false, message: 'Error updating lead' });
  }
});

app.delete('/api/admin/crm/leads/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM crm_leads WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting CRM lead:', error);
    res.status(500).json({ success: false, message: 'Error deleting lead' });
  }
});

app.post('/api/admin/crm/leads/:id/convert', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const leadId = parseInt(req.params.id);
    const opportunityData = req.body || {};
    
    // Get lead
    const [leadRows] = await poolWrapper.execute('SELECT * FROM crm_leads WHERE id = ? AND tenantId = ?', [leadId, tenantId]);
    if (leadRows.length === 0) return res.status(404).json({ success: false, message: 'Lead not found' });
    const lead = leadRows[0];

    // Create contact
    const [contactResult] = await poolWrapper.execute(
      `INSERT INTO crm_contacts (tenantId, name, email, phone, company, title)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenantId, lead.name, lead.email, lead.phone, lead.company, lead.title || null]
    );
    const contactId = contactResult.insertId;

    // Update lead status
    await poolWrapper.execute('UPDATE crm_leads SET status = "converted", updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [leadId]);

    // Create opportunity if data provided
    let opportunity = null;
    if (opportunityData.name || opportunityData.value) {
      const [oppResult] = await poolWrapper.execute(
        `INSERT INTO crm_deals (tenantId, title, contactId, value, currency, status, expectedCloseDate)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          opportunityData.name || `${lead.name} - Opportunity`,
          contactId,
          opportunityData.value || lead.value || 0,
          opportunityData.currency || 'TRY',
          'open',
          opportunityData.expectedCloseDate || null
        ]
      );
      const [oppRows] = await poolWrapper.execute('SELECT * FROM crm_deals WHERE id = ?', [oppResult.insertId]);
      opportunity = oppRows[0];
    }

    const [contactRows] = await poolWrapper.execute('SELECT * FROM crm_contacts WHERE id = ?', [contactId]);
    res.json({ success: true, data: { contact: contactRows[0], opportunity } });
  } catch (error) {
    console.error('❌ Error converting lead:', error);
    res.status(500).json({ success: false, message: 'Error converting lead' });
  }
});

app.get('/api/admin/crm/leads/search', authenticateAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    const tenantId = req.tenant?.id || 1;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });
    const [rows] = await poolWrapper.execute(
      `SELECT * FROM crm_leads 
       WHERE tenantId = ? AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)
       ORDER BY createdAt DESC LIMIT 20`,
      [tenantId, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error searching leads:', error);
    res.status(500).json({ success: false, message: 'Error searching leads' });
  }
});

// Google Maps Scraped Data Endpoints
app.post('/api/admin/google-maps/scraped-data', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { data, searchTerm } = req.body || {};
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Data array is required' });
    }

    const insertResults = [];
    const errors = [];

    for (const item of data) {
      try {
        // Check if already exists (by business name and phone)
        const [existing] = await poolWrapper.execute(
          `SELECT id FROM google_maps_scraped_data 
           WHERE tenantId = ? AND businessName = ? 
           AND (phoneNumber = ? OR (phoneNumber IS NULL AND ? IS NULL))`,
          [tenantId, item.businessName, item.phoneNumber || null, item.phoneNumber || null]
        );

        if (existing.length > 0) {
          // Update existing record
          await poolWrapper.execute(
            `UPDATE google_maps_scraped_data 
             SET website = ?, phoneNumber = ?, searchTerm = ?, updatedAt = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [item.website || null, item.phoneNumber || null, searchTerm || null, existing[0].id]
          );
          insertResults.push({ id: existing[0].id, action: 'updated', businessName: item.businessName });
        } else {
          // Insert new record
          const [result] = await poolWrapper.execute(
            `INSERT INTO google_maps_scraped_data (tenantId, businessName, website, phoneNumber, searchTerm, scrapedAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              tenantId,
              item.businessName,
              item.website || null,
              item.phoneNumber || null,
              searchTerm || null,
              item.scrapedAt ? new Date(item.scrapedAt) : new Date()
            ]
          );
          insertResults.push({ id: result.insertId, action: 'created', businessName: item.businessName });
        }
      } catch (itemError) {
        errors.push({ businessName: item.businessName, error: itemError.message });
      }
    }

    res.json({ 
      success: true, 
      data: { 
        saved: insertResults.length,
        errors: errors.length,
        results: insertResults,
        errorsList: errors
      } 
    });
  } catch (error) {
    console.error('❌ Error saving Google Maps scraped data:', error);
    res.status(500).json({ success: false, message: 'Error saving scraped data' });
  }
});

app.get('/api/admin/google-maps/scraped-data', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { page = 1, limit = 50, search = '', searchTerm = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `SELECT * FROM google_maps_scraped_data WHERE tenantId = ?`;
    const params = [tenantId];

    if (search) {
      query += ` AND (businessName LIKE ? OR phoneNumber LIKE ? OR website LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (searchTerm) {
      query += ` AND searchTerm LIKE ?`;
      params.push(`%${searchTerm}%`);
    }

    query += ` ORDER BY scrapedAt DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await poolWrapper.execute(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM google_maps_scraped_data WHERE tenantId = ?`;
    const countParams = [tenantId];
    
    if (search) {
      countQuery += ` AND (businessName LIKE ? OR phoneNumber LIKE ? OR website LIKE ?)`;
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam);
    }
    
    if (searchTerm) {
      countQuery += ` AND searchTerm LIKE ?`;
      countParams.push(`%${searchTerm}%`);
    }
    
    const [countRows] = await poolWrapper.execute(countQuery, countParams);
    const total = countRows[0].total;

    res.json({ 
      success: true, 
      data: { 
        items: rows, 
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      } 
    });
  } catch (error) {
    console.error('❌ Error fetching Google Maps scraped data:', error);
    res.status(500).json({ success: false, message: 'Error fetching scraped data' });
  }
});

app.delete('/api/admin/google-maps/scraped-data/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    
    await poolWrapper.execute(
      'DELETE FROM google_maps_scraped_data WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    );
    
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error('❌ Error deleting scraped data:', error);
    res.status(500).json({ success: false, message: 'Error deleting record' });
  }
});

// Convert Google Maps scraped data to CRM Lead
app.post('/api/admin/google-maps/scraped-data/:id/convert-to-lead', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    
    // Get scraped data
    const [scrapedRows] = await poolWrapper.execute(
      'SELECT * FROM google_maps_scraped_data WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    );
    
    if (scrapedRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Scraped data not found' });
    }
    
    const scraped = scrapedRows[0];
    
    // Create CRM lead
    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_leads (tenantId, name, email, phone, company, status, source, notes)
       VALUES (?, ?, ?, ?, ?, 'new', 'Google Maps', ?)`,
      [
        tenantId,
        scraped.businessName,
        null,
        scraped.phoneNumber,
        scraped.businessName,
        `Website: ${scraped.website || 'N/A'}\nArama Terimi: ${scraped.searchTerm || 'N/A'}`
      ]
    );
    
    const [newLead] = await poolWrapper.execute('SELECT * FROM crm_leads WHERE id = ?', [result.insertId]);
    
    res.json({ success: true, data: newLead[0] });
  } catch (error) {
    console.error('❌ Error converting to lead:', error);
    res.status(500).json({ success: false, message: 'Error converting to lead' });
  }
});

// SEO Analysis Endpoint - Analyze a website's SEO status
app.post('/api/admin/seo/analyze', authenticateAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    // Use axios to fetch the webpage (already imported at top)
    let cheerio;
    try {
      cheerio = require('cheerio');
    } catch (e) {
      return res.status(500).json({ 
        success: false, 
        message: 'Cheerio package is required. Please install it: npm install cheerio' 
      });
    }
    
    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      maxRedirects: 5
    });
    
    const loadTime = Date.now() - startTime;
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract basic SEO data
    const title = $('title').text().trim() || '';
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
    const canonicalUrl = $('link[rel="canonical"]').attr('href') || '';
    const robots = $('meta[name="robots"]').attr('content') || '';
    
    // Open Graph
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogType = $('meta[property="og:type"]').attr('content') || '';
    
    // Headings
    const h1Tags = $('h1').map((i, el) => $(el).text().trim()).get();
    const h2Tags = $('h2').map((i, el) => $(el).text().trim()).get();
    
    // Images
    const images = $('img');
    const imagesCount = images.length;
    const imagesWithoutAlt = images.filter((i, el) => !$(el).attr('alt') || $(el).attr('alt').trim() === '').length;
    
    // Links
    const links = $('a[href]');
    const linksCount = links.length;
    let internalLinks = 0;
    let externalLinks = 0;
    const baseUrl = new URL(url);
    
    links.each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === baseUrl.hostname) {
          internalLinks++;
        } else {
          externalLinks++;
        }
      } catch {
        // Relative link
        internalLinks++;
      }
    });
    
    // Word count (approximate)
    const bodyText = $('body').text();
    const wordCount = bodyText.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Schema markup
    const schemaMarkup = $('script[type="application/ld+json"]').length > 0;
    
    // Mobile friendly check (simple check for viewport meta)
    const viewport = $('meta[name="viewport"]').attr('content') || '';
    const mobileFriendly = viewport.includes('width=device-width');
    
    // Calculate SEO score
    let score = 100;
    const issues = [];
    
    if (!title) {
      score -= 10;
      issues.push('Sayfa başlığı (title) bulunamadı');
    } else if (title.length < 30 || title.length > 60) {
      score -= 5;
      issues.push(`Sayfa başlığı ideal uzunlukta değil (${title.length} karakter, ideal: 30-60)`);
    }
    
    if (!metaDescription) {
      score -= 10;
      issues.push('Meta açıklama bulunamadı');
    } else if (metaDescription.length < 120 || metaDescription.length > 160) {
      score -= 5;
      issues.push(`Meta açıklama ideal uzunlukta değil (${metaDescription.length} karakter, ideal: 120-160)`);
    }
    
    if (h1Tags.length === 0) {
      score -= 10;
      issues.push('H1 etiketi bulunamadı');
    } else if (h1Tags.length > 1) {
      score -= 5;
      issues.push(`Sayfada birden fazla H1 etiketi var (${h1Tags.length} adet, ideal: 1)`);
    }
    
    if (imagesWithoutAlt > 0) {
      score -= 5;
      issues.push(`${imagesWithoutAlt} görselde alt text eksik`);
    }
    
    if (!ogTitle && !ogDescription) {
      score -= 5;
      issues.push('Open Graph meta etiketleri eksik');
    }
    
    if (!canonicalUrl) {
      score -= 5;
      issues.push('Canonical URL bulunamadı');
    }
    
    if (!mobileFriendly) {
      score -= 10;
      issues.push('Sayfa mobil uyumlu görünmüyor (viewport meta tag eksik veya yanlış)');
    }
    
    if (loadTime > 3000) {
      score -= 5;
      issues.push(`Sayfa yükleme süresi yüksek (${loadTime}ms)`);
    }
    
    if (wordCount < 300) {
      score -= 5;
      issues.push(`Sayfa içeriği çok kısa (${wordCount} kelime, ideal: 300+)`);
    }
    
    score = Math.max(0, score);
    
    const analysis = {
      url,
      title,
      metaDescription,
      metaKeywords,
      h1Count: h1Tags.length,
      h1Tags: h1Tags.slice(0, 5),
      h2Count: h2Tags.length,
      h2Tags: h2Tags.slice(0, 5),
      imagesCount,
      imagesWithoutAlt,
      linksCount,
      internalLinks,
      externalLinks,
      canonicalUrl,
      robots,
      ogTitle,
      ogDescription,
      ogImage,
      ogType,
      schemaMarkup,
      mobileFriendly,
      loadTime,
      statusCode: response.status,
      wordCount,
      issues,
      score
    };
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('❌ Error analyzing SEO:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'SEO analizi yapılamadı. URL erişilebilir mi kontrol edin.' 
    });
  }
});

// CRM Opportunities endpoints - /admin/crm/opportunities
app.get('/api/admin/crm/opportunities', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, stage } = req.query;
    const tenantId = req.tenant?.id || 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['d.tenantId = ?'];
    const params = [tenantId];
    if (stage && stage !== 'all') {
      where.push('(s.name LIKE ? OR d.status = ?)');
      params.push(`%${stage}%`, stage);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const countParams = [...params];
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await poolWrapper.execute(
      `SELECT d.id, d.title as name, d.contactId, c.name as contactName, 
              d.value, d.currency, d.status, d.stageId, COALESCE(s.name, 'prospecting') as stage, COALESCE(s.probability, 0) as probability,
              d.expectedCloseDate, d.description, d.assignedTo, d.createdAt, d.updatedAt
       FROM crm_deals d
       LEFT JOIN crm_contacts c ON c.id = d.contactId
       LEFT JOIN crm_pipeline_stages s ON s.id = d.stageId
       ${whereClause}
       ORDER BY d.createdAt DESC
       LIMIT ? OFFSET ?`, params
    );
    // Map to frontend format
    const opportunities = rows.map(r => ({
      id: r.id,
      name: r.name,
      contactId: r.contactId,
      contactName: r.contactName,
      stage: r.stage || 'prospecting',
      value: parseFloat(r.value || 0),
      probability: r.probability || 0,
      expectedCloseDate: r.expectedCloseDate,
      description: r.description,
      assignedTo: r.assignedTo,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
    const [countRows] = await poolWrapper.execute(
      `SELECT COUNT(*) as total FROM crm_deals d
       LEFT JOIN crm_contacts c ON c.id = d.contactId
       LEFT JOIN crm_pipeline_stages s ON s.id = d.stageId
       ${whereClause}`,
      countParams
    );
    res.json({ success: true, data: { opportunities, total: countRows[0].total } });
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'FETCH_OPPORTUNITIES');
    
    // GÜVENLİK: Production'da stack trace loglanmaz
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error fetching CRM opportunities:', error);
      console.error('Error stack:', error.stack);
    }
    
    const errorResponse = createSafeErrorResponse(error, 'Error fetching opportunities');
    res.status(500).json(errorResponse);
  }
});

app.get('/api/admin/crm/opportunities/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute(
      `SELECT d.*, c.name as contactName, s.name as stageName, s.probability
       FROM crm_deals d
       LEFT JOIN crm_contacts c ON c.id = d.contactId
       LEFT JOIN crm_pipeline_stages s ON s.id = d.stageId
       WHERE d.id = ? AND d.tenantId = ?`, [id, tenantId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Opportunity not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error fetching opportunity:', error);
    res.status(500).json({ success: false, message: 'Error fetching opportunity' });
  }
});

app.post('/api/admin/crm/opportunities', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { name, contactId, stage, value = 0, probability = 0, expectedCloseDate, description, assignedTo } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    
    // Get or create stage
    let stageId = null;
    if (stage) {
      const [stageRows] = await poolWrapper.execute(
        'SELECT id FROM crm_pipeline_stages WHERE tenantId = ? AND name LIKE ?',
        [tenantId, `%${stage}%`]
      );
      if (stageRows.length > 0) {
        stageId = stageRows[0].id;
      }
    }

    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_deals (tenantId, title, contactId, value, currency, stageId, status, expectedCloseDate, description, assignedTo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, name, contactId || null, value, 'TRY', stageId, 'open', expectedCloseDate || null, description || null, assignedTo || null]
    );
    const [newOpp] = await poolWrapper.execute(
      `SELECT d.*, c.name as contactName, s.name as stage, s.probability
       FROM crm_deals d
       LEFT JOIN crm_contacts c ON c.id = d.contactId
       LEFT JOIN crm_pipeline_stages s ON s.id = d.stageId
       WHERE d.id = ?`, [result.insertId]
    );
    res.json({ success: true, data: newOpp[0] });
  } catch (error) {
    console.error('❌ Error creating CRM opportunity:', error);
    res.status(500).json({ success: false, message: 'Error creating opportunity' });
  }
});

app.put('/api/admin/crm/opportunities/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const allowed = ['name', 'title', 'contactId', 'value', 'stage', 'probability', 'expectedCloseDate', 'description', 'assignedTo', 'status'];
    const fields = [];
    const params = [];
    
    for (const k of allowed) {
      if (k in (req.body || {})) {
        if (k === 'name') {
          fields.push('title = ?');
          params.push(req.body[k]);
        } else if (k === 'stage') {
          const [stageRows] = await poolWrapper.execute(
            'SELECT id FROM crm_pipeline_stages WHERE tenantId = ? AND name LIKE ?',
            [tenantId, `%${req.body[k]}%`]
          );
          if (stageRows.length > 0) {
            fields.push('stageId = ?');
            params.push(stageRows[0].id);
          }
        } else {
          fields.push(`${k} = ?`);
          params.push(req.body[k]);
        }
      }
    }
    
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE crm_deals SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    const [updated] = await poolWrapper.execute(
      `SELECT d.*, c.name as contactName, s.name as stage, s.probability
       FROM crm_deals d
       LEFT JOIN crm_contacts c ON c.id = d.contactId
       LEFT JOIN crm_pipeline_stages s ON s.id = d.stageId
       WHERE d.id = ? AND d.tenantId = ?`, [id, tenantId]
    );
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('❌ Error updating CRM opportunity:', error);
    res.status(500).json({ success: false, message: 'Error updating opportunity' });
  }
});

app.delete('/api/admin/crm/opportunities/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM crm_deals WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting CRM opportunity:', error);
    res.status(500).json({ success: false, message: 'Error deleting opportunity' });
  }
});

app.get('/api/admin/crm/opportunities/search', authenticateAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    const tenantId = req.tenant?.id || 1;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });
    const [rows] = await poolWrapper.execute(
      `SELECT d.*, c.name as contactName FROM crm_deals d
       LEFT JOIN crm_contacts c ON c.id = d.contactId
       WHERE d.tenantId = ? AND (d.title LIKE ? OR c.name LIKE ?)
       ORDER BY d.createdAt DESC LIMIT 20`,
      [tenantId, `%${q}%`, `%${q}%`]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error searching opportunities:', error);
    res.status(500).json({ success: false, message: 'Error searching opportunities' });
  }
});

// CRM Tasks endpoints - /admin/crm/tasks
app.get('/api/admin/crm/tasks', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, relatedType } = req.query;
    const tenantId = req.tenant?.id || 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['tenantId = ?'];
    const params = [tenantId];
    if (status && status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }
    if (relatedType) {
      where.push('relatedType = ?');
      params.push(relatedType);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const countParams = [...params];
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await poolWrapper.execute(
      `SELECT * FROM crm_tasks
       ${whereClause}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`, params
    );
    const [countRows] = await poolWrapper.execute(
      `SELECT COUNT(*) as total FROM crm_tasks ${whereClause}`,
      countParams
    );
    res.json({ success: true, data: { tasks: rows, total: countRows[0].total } });
  } catch (error) {
    console.error('❌ Error fetching CRM tasks:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/admin/crm/tasks/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM crm_tasks WHERE id = ? AND tenantId = ?', [id, tenantId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error fetching task:', error);
    res.status(500).json({ success: false, message: 'Error fetching task' });
  }
});

app.post('/api/admin/crm/tasks', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { title, description, relatedType = 'other', relatedId, status = 'pending', priority = 'medium', dueDate, assignedTo } = req.body || {};
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });
    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_tasks (tenantId, title, description, relatedType, relatedId, status, priority, dueDate, assignedTo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, title, description || null, relatedType, relatedId || null, status, priority, dueDate || null, assignedTo || null]
    );
    const [newTask] = await poolWrapper.execute('SELECT * FROM crm_tasks WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: newTask[0] });
  } catch (error) {
    console.error('❌ Error creating CRM task:', error);
    res.status(500).json({ success: false, message: 'Error creating task' });
  }
});

app.put('/api/admin/crm/tasks/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const allowed = ['title', 'description', 'relatedType', 'relatedId', 'status', 'priority', 'dueDate', 'assignedTo'];
    const fields = [];
    const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE crm_tasks SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    const [updated] = await poolWrapper.execute('SELECT * FROM crm_tasks WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('❌ Error updating CRM task:', error);
    res.status(500).json({ success: false, message: 'Error updating task' });
  }
});

app.delete('/api/admin/crm/tasks/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM crm_tasks WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting CRM task:', error);
    res.status(500).json({ success: false, message: 'Error deleting task' });
  }
});

// CRM Contacts endpoints - /admin/crm/contacts
app.get('/api/admin/crm/contacts', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const tenantId = req.tenant?.id || 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [rows] = await poolWrapper.execute(
      `SELECT * FROM crm_contacts
       WHERE tenantId = ?
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`, [tenantId, parseInt(limit), offset]
    );
    const [countRows] = await poolWrapper.execute('SELECT COUNT(*) as total FROM crm_contacts WHERE tenantId = ?', [tenantId]);
    res.json({ success: true, data: { contacts: rows, total: countRows[0].total } });
  } catch (error) {
    console.error('❌ Error fetching CRM contacts:', error);
    res.status(500).json({ success: false, message: 'Error fetching contacts' });
  }
});

app.get('/api/admin/crm/contacts/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM crm_contacts WHERE id = ? AND tenantId = ?', [id, tenantId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error fetching contact:', error);
    res.status(500).json({ success: false, message: 'Error fetching contact' });
  }
});

app.post('/api/admin/crm/contacts', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { name, email, phone, company, title, address, city, notes, tags } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const [result] = await poolWrapper.execute(
      `INSERT INTO crm_contacts (tenantId, name, email, phone, company, title, address, city, notes, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, name, email || null, phone || null, company || null, title || null, address || null, city || null, notes || null, tags ? JSON.stringify(tags) : null]
    );
    const [newContact] = await poolWrapper.execute('SELECT * FROM crm_contacts WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: newContact[0] });
  } catch (error) {
    console.error('❌ Error creating CRM contact:', error);
    res.status(500).json({ success: false, message: 'Error creating contact' });
  }
});

app.put('/api/admin/crm/contacts/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const allowed = ['name', 'email', 'phone', 'company', 'title', 'address', 'city', 'notes', 'tags'];
    const fields = [];
    const params = [];
    for (const k of allowed) {
      if (k in (req.body || {})) {
        fields.push(`${k} = ?`);
        if (k === 'tags') {
          params.push(req.body[k] ? JSON.stringify(req.body[k]) : null);
        } else {
          params.push(req.body[k]);
        }
      }
    }
    if (fields.length === 0) return res.json({ success: true, message: 'No changes' });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE crm_contacts SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    const [updated] = await poolWrapper.execute('SELECT * FROM crm_contacts WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('❌ Error updating CRM contact:', error);
    res.status(500).json({ success: false, message: 'Error updating contact' });
  }
});

app.delete('/api/admin/crm/contacts/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM crm_contacts WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting CRM contact:', error);
    res.status(500).json({ success: false, message: 'Error deleting contact' });
  }
});

app.get('/api/admin/crm/contacts/search', authenticateAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    const tenantId = req.tenant?.id || 1;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });
    const [rows] = await poolWrapper.execute(
      `SELECT * FROM crm_contacts 
       WHERE tenantId = ? AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)
       ORDER BY createdAt DESC LIMIT 20`,
      [tenantId, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error searching contacts:', error);
    res.status(500).json({ success: false, message: 'Error searching contacts' });
  }
});

// CRM Stats endpoint
app.get('/api/admin/crm/stats', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    
    const [leadCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM crm_leads WHERE tenantId = ?', [tenantId]);
    const [oppCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM crm_deals WHERE tenantId = ? AND status = "open"', [tenantId]);
    const [contactCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM crm_contacts WHERE tenantId = ?', [tenantId]);
    const [taskCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM crm_tasks WHERE tenantId = ? AND status IN ("pending", "in-progress")', [tenantId]);
    const [pipelineValue] = await poolWrapper.execute('SELECT COALESCE(SUM(value), 0) as total FROM crm_deals WHERE tenantId = ? AND status = "open"', [tenantId]);
    
    // Conversion rate: converted leads / total leads
    const [convertedCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM crm_leads WHERE tenantId = ? AND status = "converted"', [tenantId]);
    const totalLeads = leadCount[0].count;
    const conversionRate = totalLeads > 0 ? (convertedCount[0].count / totalLeads) * 100 : 0;
    
    // Average deal size
    const [avgDeal] = await poolWrapper.execute('SELECT COALESCE(AVG(value), 0) as avg FROM crm_deals WHERE tenantId = ? AND status = "open"', [tenantId]);
    
    res.json({
      success: true,
      data: {
        totalLeads: leadCount[0].count,
        totalOpportunities: oppCount[0].count,
        totalContacts: contactCount[0].count,
        activeTasks: taskCount[0].count,
        pipelineValue: parseFloat(pipelineValue[0].total || 0),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        averageDealSize: parseFloat(avgDeal[0].avg || 0)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching CRM stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching CRM stats' });
  }
});

// CRM Pipeline endpoint - /admin/crm/pipeline
app.get('/api/admin/crm/pipeline', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const [rows] = await poolWrapper.execute(
      `SELECT s.name as stage, COUNT(d.id) as count, COALESCE(SUM(d.value), 0) as value
       FROM crm_pipeline_stages s
       LEFT JOIN crm_deals d ON d.stageId = s.id AND d.tenantId = ? AND d.status = 'open'
       WHERE s.tenantId = ?
       GROUP BY s.id, s.name
       ORDER BY s.sequence ASC, s.id ASC`,
      [tenantId, tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching CRM pipeline:', error);
    res.status(500).json({ success: false, message: 'Error fetching pipeline' });
  }
});

// =========================
// ADMIN - WAREHOUSE / INVENTORY CRUD
// =========================

// Warehouses
app.get('/api/admin/warehouses', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const [rows] = await poolWrapper.execute(
      'SELECT id, name, code, address, isActive, createdAt, updatedAt FROM warehouses WHERE tenantId = ? ORDER BY id DESC',
      [tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (error) { console.error('❌ warehouses list', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/warehouses', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { name, code = null, address = null, isActive = 1 } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const [r] = await poolWrapper.execute(
      'INSERT INTO warehouses (tenantId, name, code, address, isActive) VALUES (?, ?, ?, ?, ?)',
      [tenantId, name, code, address, isActive ? 1 : 0]
    );
    res.json({ success: true, data: { id: r.insertId } });
  } catch (error) { console.error('❌ warehouses create', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/warehouses/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    const allowed = ['name', 'code', 'address', 'isActive']; const fields = []; const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (!fields.length) return res.json({ success: true });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE warehouses SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) { console.error('❌ warehouses update', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/warehouses/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM warehouses WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) { console.error('❌ warehouses delete', error); res.status(500).json({ success: false, message: 'Error' }); }
});

// Warehouse Locations
app.get('/api/admin/warehouse-locations', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const { warehouseId } = req.query;
    const where = ['tenantId = ?']; const params = [tenantId];
    if (warehouseId) { where.push('warehouseId = ?'); params.push(parseInt(warehouseId)); }
    const [rows] = await poolWrapper.execute(
      `SELECT id, warehouseId, name, code, createdAt FROM warehouse_locations WHERE ${where.join(' AND ')} ORDER BY id DESC`, params);
    res.json({ success: true, data: rows });
  } catch (error) { console.error('❌ locations list', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/warehouse-locations', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const { warehouseId, name, code = null } = req.body || {};
    if (!warehouseId || !name) return res.status(400).json({ success: false, message: 'warehouseId and name required' });
    const [r] = await poolWrapper.execute(
      'INSERT INTO warehouse_locations (tenantId, warehouseId, name, code) VALUES (?, ?, ?, ?)',
      [tenantId, parseInt(warehouseId), name, code]
    ); res.json({ success: true, data: { id: r.insertId } });
  } catch (error) { console.error('❌ locations create', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/warehouse-locations/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    const allowed = ['warehouseId', 'name', 'code']; const fields = []; const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (!fields.length) return res.json({ success: true });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE warehouse_locations SET ${fields.join(', ')} WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) { console.error('❌ locations update', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/warehouse-locations/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM warehouse_locations WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) { console.error('❌ locations delete', error); res.status(500).json({ success: false, message: 'Error' }); }
});

// Bins
app.get('/api/admin/bins', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const { warehouseId, locationId } = req.query;
    const where = ['tenantId = ?']; const params = [tenantId];
    if (warehouseId) { where.push('warehouseId = ?'); params.push(parseInt(warehouseId)); }
    if (locationId) { where.push('locationId = ?'); params.push(parseInt(locationId)); }
    const [rows] = await poolWrapper.execute(
      `SELECT id, warehouseId, locationId, code, capacity, createdAt FROM bins WHERE ${where.join(' AND ')} ORDER BY id DESC`, params);
    res.json({ success: true, data: rows });
  } catch (error) { console.error('❌ bins list', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/bins', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const { warehouseId, locationId = null, code, capacity = 0 } = req.body || {};
    if (!warehouseId || !code) return res.status(400).json({ success: false, message: 'warehouseId and code required' });
    const [r] = await poolWrapper.execute(
      'INSERT INTO bins (tenantId, warehouseId, locationId, code, capacity) VALUES (?, ?, ?, ?, ?)',
      [tenantId, parseInt(warehouseId), locationId ? parseInt(locationId) : null, code, parseInt(capacity)]
    ); res.json({ success: true, data: { id: r.insertId } });
  } catch (error) { console.error('❌ bins create', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/bins/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    const allowed = ['warehouseId', 'locationId', 'code', 'capacity']; const fields = []; const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (!fields.length) return res.json({ success: true });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE bins SET ${fields.join(', ')} WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) { console.error('❌ bins update', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/bins/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM bins WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) { console.error('❌ bins delete', error); res.status(500).json({ success: false, message: 'Error' }); }
});

// Inventory items
app.get('/api/admin/inventory', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const { productId, warehouseId, binId } = req.query;
    const where = ['ii.tenantId = ?']; const params = [tenantId];
    if (productId) { where.push('ii.productId = ?'); params.push(parseInt(productId)); }
    if (warehouseId) { where.push('ii.warehouseId = ?'); params.push(parseInt(warehouseId)); }
    if (binId) { where.push('ii.binId = ?'); params.push(parseInt(binId)); }
    const [rows] = await poolWrapper.execute(
      `SELECT ii.id, ii.productId, p.name as productName, ii.warehouseId, w.name as warehouseName, ii.binId, b.code as binCode, ii.quantity, ii.reserved, ii.updatedAt
       FROM inventory_items ii
       LEFT JOIN products p ON p.id = ii.productId
       LEFT JOIN warehouses w ON w.id = ii.warehouseId
       LEFT JOIN bins b ON b.id = ii.binId
       WHERE ${where.join(' AND ')}
       ORDER BY ii.id DESC`, params);
    res.json({ success: true, data: rows });
  } catch (error) { console.error('❌ inventory list', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/inventory', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const { productId, warehouseId, binId = null, quantity = 0 } = req.body || {};
    if (!productId || !warehouseId) return res.status(400).json({ success: false, message: 'productId and warehouseId required' });
    const [r] = await poolWrapper.execute(
      `INSERT INTO inventory_items (tenantId, productId, warehouseId, binId, quantity) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updatedAt = CURRENT_TIMESTAMP`,
      [tenantId, parseInt(productId), parseInt(warehouseId), binId ? parseInt(binId) : null, parseInt(quantity)]);
    res.json({ success: true, data: { id: r.insertId || null } });
  } catch (error) { console.error('❌ inventory upsert', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/inventory/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    const allowed = ['productId', 'warehouseId', 'binId', 'quantity', 'reserved']; const fields = []; const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (!fields.length) return res.json({ success: true });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE inventory_items SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) { console.error('❌ inventory update', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/inventory/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM inventory_items WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) { console.error('❌ inventory delete', error); res.status(500).json({ success: false, message: 'Error' }); }
});

// Inventory movements
app.get('/api/admin/inventory-movements', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const [rows] = await poolWrapper.execute(
      `SELECT id, productId, fromWarehouseId, fromBinId, toWarehouseId, toBinId, quantity, reason, referenceType, referenceId, createdAt
       FROM inventory_movements WHERE tenantId = ? ORDER BY id DESC LIMIT 500`, [tenantId]);
    res.json({ success: true, data: rows });
  } catch (error) { console.error('❌ movements list', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/inventory-movements', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { productId, fromWarehouseId = null, fromBinId = null, toWarehouseId = null, toBinId = null, quantity, reason, referenceType = null, referenceId = null } = req.body || {};
    const qty = parseInt(quantity);
    if (!productId || !qty || !reason) return res.status(400).json({ success: false, message: 'productId, quantity, reason required' });
    await poolWrapper.execute(
      `INSERT INTO inventory_movements (tenantId, productId, fromWarehouseId, fromBinId, toWarehouseId, toBinId, quantity, reason, referenceType, referenceId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, parseInt(productId), fromWarehouseId, fromBinId, toWarehouseId, toBinId, qty, reason, referenceType, referenceId]
    );
    res.json({ success: true });
  } catch (error) { console.error('❌ movements create', error); res.status(500).json({ success: false, message: 'Error' }); }
});

// Suppliers
app.get('/api/admin/suppliers', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const [rows] = await poolWrapper.execute(
      'SELECT id, name, email, phone, address, taxNumber, isActive, createdAt FROM suppliers WHERE tenantId = ? ORDER BY id DESC', [tenantId]);
    res.json({ success: true, data: rows });
  } catch (error) { console.error('❌ suppliers list', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/suppliers', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const { name, email = null, phone = null, address = null, taxNumber = null, isActive = 1 } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const [r] = await poolWrapper.execute('INSERT INTO suppliers (tenantId, name, email, phone, address, taxNumber, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)', [tenantId, name, email, phone, address, taxNumber, isActive ? 1 : 0]);
    res.json({ success: true, data: { id: r.insertId } });
  } catch (error) { console.error('❌ suppliers create', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/suppliers/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    const allowed = ['name', 'email', 'phone', 'address', 'taxNumber', 'isActive']; const fields = []; const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (!fields.length) return res.json({ success: true });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE suppliers SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) { console.error('❌ suppliers update', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/suppliers/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM suppliers WHERE id = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) { console.error('❌ suppliers delete', error); res.status(500).json({ success: false, message: 'Error' }); }
});

// Purchase Orders
app.get('/api/admin/purchase-orders', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const [rows] = await poolWrapper.execute(
      `SELECT po.id, po.supplierId, s.name as supplierName, po.warehouseId, w.name as warehouseName, po.status, po.expectedAt, po.createdAt
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplierId
       LEFT JOIN warehouses w ON w.id = po.warehouseId
       WHERE po.tenantId = ? ORDER BY po.id DESC`, [tenantId]);
    res.json({ success: true, data: rows });
  } catch (error) { console.error('❌ PO list', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/purchase-orders', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const { supplierId, warehouseId, status = 'draft', expectedAt = null, notes = null } = req.body || {};
    if (!supplierId || !warehouseId) return res.status(400).json({ success: false, message: 'supplierId and warehouseId required' });
    const [r] = await poolWrapper.execute(
      'INSERT INTO purchase_orders (tenantId, supplierId, warehouseId, status, expectedAt, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [tenantId, parseInt(supplierId), parseInt(warehouseId), status, expectedAt, notes]
    ); res.json({ success: true, data: { id: r.insertId } });
  } catch (error) { console.error('❌ PO create', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/purchase-orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    const allowed = ['supplierId', 'warehouseId', 'status', 'expectedAt', 'notes']; const fields = []; const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (!fields.length) return res.json({ success: true });
    params.push(id, tenantId);
    await poolWrapper.execute(`UPDATE purchase_orders SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) { console.error('❌ PO update', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/purchase-orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    await poolWrapper.execute('DELETE FROM purchase_orders WHERE id = ? AND tenantId = ?', [id, tenantId]);
    await poolWrapper.execute('DELETE FROM purchase_order_items WHERE purchaseOrderId = ? AND tenantId = ?', [id, tenantId]);
    res.json({ success: true });
  } catch (error) { console.error('❌ PO delete', error); res.status(500).json({ success: false, message: 'Error' }); }
});

// Purchase Order Items
app.get('/api/admin/purchase-orders/:id/items', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute(
      `SELECT id, productId, quantity, receivedQuantity, price FROM purchase_order_items WHERE tenantId = ? AND purchaseOrderId = ? ORDER BY id ASC`, [tenantId, id]);
    res.json({ success: true, data: rows });
  } catch (error) { console.error('❌ PO items list', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/purchase-orders/:id/items', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id);
    const { productId, quantity, price = 0 } = req.body || {};
    if (!productId || !quantity) return res.status(400).json({ success: false, message: 'productId and quantity required' });
    const [r] = await poolWrapper.execute('INSERT INTO purchase_order_items (tenantId, purchaseOrderId, productId, quantity, price) VALUES (?, ?, ?, ?, ?)', [tenantId, id, parseInt(productId), parseInt(quantity), parseFloat(price)]);
    res.json({ success: true, data: { id: r.insertId } });
  } catch (error) { console.error('❌ PO item create', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/purchase-orders/:orderId/items/:itemId', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const orderId = parseInt(req.params.orderId); const itemId = parseInt(req.params.itemId);
    const allowed = ['productId', 'quantity', 'receivedQuantity', 'price']; const fields = []; const params = [];
    for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); }
    if (!fields.length) return res.json({ success: true });
    params.push(itemId, orderId, tenantId);
    await poolWrapper.execute(`UPDATE purchase_order_items SET ${fields.join(', ')} WHERE id = ? AND purchaseOrderId = ? AND tenantId = ?`, params);
    res.json({ success: true });
  } catch (error) { console.error('❌ PO item update', error); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/purchase-orders/:orderId/items/:itemId', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const orderId = parseInt(req.params.orderId); const itemId = parseInt(req.params.itemId);
    await poolWrapper.execute('DELETE FROM purchase_order_items WHERE id = ? AND purchaseOrderId = ? AND tenantId = ?', [itemId, orderId, tenantId]);
    res.json({ success: true });
  } catch (error) { console.error('❌ PO item delete', error); res.status(500).json({ success: false, message: 'Error' }); }
});

// Workstations
app.get('/api/admin/workstations', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const [rows] = await poolWrapper.execute('SELECT id, name, code, capacityPerHour, isActive, createdAt FROM workstations WHERE tenantId = ? ORDER BY id DESC', [tenantId]); res.json({ success: true, data: rows }); } catch (e) { console.error('❌ workstations', e); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/workstations', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const { name, code = null, capacityPerHour = 0, isActive = 1 } = req.body || {}; if (!name) return res.status(400).json({ success: false, message: 'Name required' }); const [r] = await poolWrapper.execute('INSERT INTO workstations (tenantId, name, code, capacityPerHour, isActive) VALUES (?, ?, ?, ?, ?)', [tenantId, name, code, parseInt(capacityPerHour), isActive ? 1 : 0]); res.json({ success: true, data: { id: r.insertId } }); } catch (e) { console.error('❌ ws create', e); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/workstations/:id', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id); const allowed = ['name', 'code', 'capacityPerHour', 'isActive']; const fields = []; const params = []; for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); } if (!fields.length) return res.json({ success: true }); params.push(id, tenantId); await poolWrapper.execute(`UPDATE workstations SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params); res.json({ success: true }); } catch (e) { console.error('❌ ws update', e); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/workstations/:id', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id); await poolWrapper.execute('DELETE FROM workstations WHERE id = ? AND tenantId = ?', [id, tenantId]); res.json({ success: true }); } catch (e) { console.error('❌ ws delete', e); res.status(500).json({ success: false, message: 'Error' }); }
});

// Production Orders
app.get('/api/admin/production-orders', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const [rows] = await poolWrapper.execute(
      `SELECT po.id, po.productId, p.name as productName, po.quantity, po.status, po.plannedStart, po.plannedEnd, po.actualStart, po.actualEnd, po.importance_level, po.notes, po.createdAt
     FROM production_orders po LEFT JOIN products p ON p.id = po.productId WHERE po.tenantId = ? ORDER BY po.id DESC`, [tenantId]);
    res.json({ success: true, data: rows });
  } catch (e) { console.error('❌ prod orders list', e); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/production-orders', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1; const { productId, quantity, status = 'planned', plannedStart = null, plannedEnd = null, warehouseId = null, importance_level = 'Orta', notes = null } = req.body || {};
    if (!productId || !quantity) return res.status(400).json({ success: false, message: 'productId and quantity required' });
    const [r] = await poolWrapper.execute('INSERT INTO production_orders (tenantId, productId, quantity, status, plannedStart, plannedEnd, warehouseId, importance_level, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [tenantId, parseInt(productId), parseInt(quantity), status, plannedStart, plannedEnd, warehouseId, importance_level, notes]);
    res.json({ success: true, data: { id: r.insertId } });
  } catch (e) { console.error('❌ prod orders create', e); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/production-orders/:id', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id); const allowed = ['productId', 'quantity', 'status', 'plannedStart', 'plannedEnd', 'actualStart', 'actualEnd', 'warehouseId', 'importance_level', 'notes']; const fields = []; const params = []; for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); } if (!fields.length) return res.json({ success: true }); params.push(id, tenantId); await poolWrapper.execute(`UPDATE production_orders SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?`, params); res.json({ success: true }); } catch (e) { console.error('❌ prod orders update', e); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/production-orders/:id', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id); await poolWrapper.execute('DELETE FROM production_orders WHERE id = ? AND tenantId = ?', [id, tenantId]); res.json({ success: true }); } catch (e) { console.error('❌ prod orders delete', e); res.status(500).json({ success: false, message: 'Error' }); }
});

// Production Steps
app.get('/api/admin/production-orders/:id/steps', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id); const [rows] = await poolWrapper.execute('SELECT id, workstationId, stepName, sequence, status, startedAt, finishedAt FROM production_steps WHERE tenantId = ? AND productionOrderId = ? ORDER BY sequence ASC', [tenantId, id]); res.json({ success: true, data: rows }); } catch (e) { console.error('❌ steps list', e); res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/admin/production-orders/:id/steps', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const id = parseInt(req.params.id); const { workstationId = null, stepName, sequence = 1, status = 'pending', startedAt = null, finishedAt = null } = req.body || {}; if (!stepName) return res.status(400).json({ success: false, message: 'stepName required' }); const [r] = await poolWrapper.execute('INSERT INTO production_steps (tenantId, productionOrderId, workstationId, stepName, sequence, status, startedAt, finishedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [tenantId, id, workstationId, stepName, parseInt(sequence), status, startedAt, finishedAt]); res.json({ success: true, data: { id: r.insertId } }); } catch (e) { console.error('❌ steps create', e); res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/admin/production-orders/:orderId/steps/:stepId', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const orderId = parseInt(req.params.orderId); const stepId = parseInt(req.params.stepId); const allowed = ['workstationId', 'stepName', 'sequence', 'status', 'startedAt', 'finishedAt']; const fields = []; const params = []; for (const k of allowed) if (k in (req.body || {})) { fields.push(`${k} = ?`); params.push(req.body[k]); } if (!fields.length) return res.json({ success: true }); params.push(stepId, orderId, tenantId); await poolWrapper.execute(`UPDATE production_steps SET ${fields.join(', ')} WHERE id = ? AND productionOrderId = ? AND tenantId = ?`, params); res.json({ success: true }); } catch (e) { console.error('❌ steps update', e); res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/admin/production-orders/:orderId/steps/:stepId', authenticateAdmin, async (req, res) => {
  try { const tenantId = req.tenant?.id || 1; const orderId = parseInt(req.params.orderId); const stepId = parseInt(req.params.stepId); await poolWrapper.execute('DELETE FROM production_steps WHERE id = ? AND productionOrderId = ? AND tenantId = ?', [stepId, orderId, tenantId]); res.json({ success: true }); } catch (e) { console.error('❌ steps delete', e); res.status(500).json({ success: false, message: 'Error' }); }
});

// Admin - Tüm siparişleri listele
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', dateFrom = '', dateTo = '', q = '' } = req.query;
    const offset = (page - 1) * limit;

    // Build filters
    const whereClauses = [];
    const params = [];
    if (status) {
      whereClauses.push('o.status = ?');
      params.push(String(status));
    }
    if (dateFrom) {
      whereClauses.push('o.createdAt >= ?');
      params.push(new Date(dateFrom));
    }
    if (dateTo) {
      whereClauses.push('o.createdAt <= ?');
      params.push(new Date(dateTo + ' 23:59:59'));
    }
    if (q) {
      whereClauses.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    const whereSql = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Get orders with product details
    const [orders] = await poolWrapper.execute(
      `
      SELECT o.id, o.totalAmount, o.status, o.createdAt, o.city, o.district, o.fullAddress, o.shippingAddress, o.paymentMethod,
             u.name as userName, u.email as userEmail, 
             t.name as tenantName
      FROM orders o 
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN tenants t ON o.tenantId = t.id
      ${whereSql}
      ORDER BY o.createdAt DESC 
      LIMIT ? OFFSET ?
      `,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get order items for each order
    for (let order of orders) {
      const [orderItems] = await poolWrapper.execute(`
        SELECT oi.quantity, oi.price, 
               p.name as productName, p.image as productImage
        FROM order_items oi
        LEFT JOIN products p ON oi.productId = p.id
        WHERE oi.orderId = ?
      `, [order.id]);

      order.items = orderItems;
      order.itemCount = orderItems.length;
    }

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('❌ Error getting orders:', error);
    res.status(500).json({ success: false, message: 'Error getting orders' });
  }
});

// Admin - Tek sipariş detayı
app.get('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get order details
    const [orders] = await poolWrapper.execute(`
      SELECT o.id, o.totalAmount, o.status, o.createdAt, o.city, o.district, o.fullAddress, o.shippingAddress, o.paymentMethod,
             u.name as userName, u.email as userEmail, 
             t.name as tenantName
      FROM orders o 
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN tenants t ON o.tenantId = t.id
      WHERE o.id = ?
    `, [id]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orders[0];

    // Get order items
    const [orderItems] = await poolWrapper.execute(`
      SELECT oi.quantity, oi.price, 
             p.name as productName, p.image as productImage
      FROM order_items oi
      LEFT JOIN products p ON oi.productId = p.id
      WHERE oi.orderId = ?
    `, [id]);

    order.items = orderItems;

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('❌ Error getting order details:', error);
    res.status(500).json({ success: false, message: 'Error getting order details' });
  }
});

// Admin - Sipariş durumu güncelle
app.put('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    await poolWrapper.execute(
      'UPDATE orders SET status = ?, updatedAt = NOW() WHERE id = ?',
      [status, id]
    );

    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
});

// Admin - Generate shipping label (simple HTML payload)
app.post('/api/admin/orders/:id/shipping-label', authenticateAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute(`
      SELECT o.*, u.name as userName, u.email as userEmail, u.phone as userPhone, t.name as tenantName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN tenants t ON o.tenantId = t.id
      WHERE o.id = ?
    `, [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const o = rows[0];
    const [items] = await poolWrapper.execute(`
      SELECT productName, quantity FROM order_items WHERE orderId = ?
    `, [orderId]);

    const createdAt = new Date().toISOString();
    // Gönderen adını normalize et: "default tenant/tenat" ya da boşsa "huğlu outdoor" kullan
    const rawTenantName = (o.tenantName || '').toString();
    const normalized = rawTenantName.trim().toLowerCase();
    const finalShipFrom = (!normalized || normalized === 'default tenant' || normalized === 'default tenat')
      ? 'huğlu outdoor'
      : rawTenantName;
    const label = {
      orderId: o.id,
      barcode: `HGL${o.id}`,
      createdAt,
      shipFrom: finalShipFrom,
      shipTo: {
        name: o.customerName || o.userName || 'Müşteri',
        address: o.fullAddress || o.shippingAddress || '-',
        city: o.city || '-',
        district: o.district || '-',
        phone: o.customerPhone || o.userPhone || '-'
      },
      items: items.map(i => ({ name: i.productName, qty: i.quantity })),
      totalItems: items.length
    };
    res.json({ success: true, data: label });
  } catch (error) {
    console.error('❌ Error generating shipping label:', error);
    res.status(500).json({ success: false, message: 'Error generating shipping label' });
  }
});

// Tenant Management endpoints
app.post('/api/tenants', async (req, res) => {
  try {
    const { name, domain, subdomain, settings } = req.body;

    // Generate secure API key
    const apiKey = generateSecureApiKey();

    const [result] = await poolWrapper.execute(
      'INSERT INTO tenants (name, domain, subdomain, apiKey, settings) VALUES (?, ?, ?, ?, ?)',
      [name, domain || null, subdomain || null, apiKey, JSON.stringify(settings || {})]
    );

    res.json({
      success: true,
      data: {
        tenantId: result.insertId,
        apiKey: apiKey
      },
      message: 'Tenant created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating tenant:', error);
    res.status(500).json({ success: false, message: 'Error creating tenant' });
  }
});

app.get('/api/tenants', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT id, name, domain, subdomain, isActive, createdAt FROM tenants ORDER BY createdAt DESC'
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting tenants:', error);
    res.status(500).json({ success: false, message: 'Error getting tenants' });
  }
});

app.get('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await poolWrapper.execute(
      'SELECT id, name, domain, subdomain, settings, isActive, createdAt, updatedAt FROM tenants WHERE id = ?',
      [id]
    );

    if (rows.length > 0) {
      const tenant = rows[0];
      if (tenant.settings) {
        tenant.settings = JSON.parse(tenant.settings);
      }
      res.json({ success: true, data: tenant });
    } else {
      res.status(404).json({ success: false, message: 'Tenant not found' });
    }
  } catch (error) {
    console.error('❌ Error getting tenant:', error);
    res.status(500).json({ success: false, message: 'Error getting tenant' });
  }
});

app.put('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, domain, subdomain, settings, isActive } = req.body;

    await poolWrapper.execute(
      'UPDATE tenants SET name = ?, domain = ?, subdomain = ?, settings = ?, isActive = ? WHERE id = ?',
      [name, domain, subdomain, JSON.stringify(settings || {}), isActive, id]
    );

    res.json({ success: true, message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('❌ Error updating tenant:', error);
    res.status(500).json({ success: false, message: 'Error updating tenant' });
  }
});

app.delete('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await poolWrapper.execute('DELETE FROM tenants WHERE id = ?', [id]);

    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting tenant:', error);
    res.status(500).json({ success: false, message: 'Error deleting tenant' });
  }
});

// Note: Tenant authentication is now handled globally in the API key middleware above

// User endpoints (with tenant authentication)
app.post('/api/users', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      birthDate,
      address,
      gender,
      privacyAccepted,
      termsAccepted,
      marketingEmail,
      marketingSms,
      marketingPhone
    } = req.body;

    // Validate required fields - web için esnek: name, email, password yeterli
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    // Validate privacy and terms acceptance
    // Mobil uygulama için zorunlu (phone ve birthDate varsa), web için opsiyonel
    const isMobileRequest = phone && birthDate;
    if (isMobileRequest && (!privacyAccepted || !termsAccepted)) {
      return res.status(400).json({
        success: false,
        message: 'Privacy policy and terms must be accepted'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Use default tenant ID if not provided
    const tenantId = req.tenant?.id || 1;

    // Check if user already exists
    const [existingUser] = await poolWrapper.execute(
      'SELECT id FROM users WHERE email = ? AND tenantId = ?',
      [email, tenantId]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Basic birthDate validation (optional field)
    let validBirthDate = null;
    if (birthDate) {
      const birth = new Date(birthDate);
      if (isNaN(birth.getTime())) {
        console.log('⚠️ Invalid birthDate format, using null:', birthDate);
        validBirthDate = null;
      } else {
        validBirthDate = birth.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    }

    // Generate 8-digit user ID
    const generateUserId = () => {
      const min = 10000000; // 8 digits starting with 1
      const max = 99999999; // 8 digits ending with 9
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    // Check if user_id already exists and generate a new one if needed
    let userId;
    let isUnique = false;
    while (!isUnique) {
      userId = generateUserId();
      const [existingUserId] = await poolWrapper.execute(
        'SELECT id FROM users WHERE user_id = ?',
        [userId]
      );
      if (existingUserId.length === 0) {
        isUnique = true;
      }
    }

    // Store PLAIN (no encryption). Only password is hashed.
    const plainPhone = phone || '';
    const plainAddress = address || '';
    const plainEmail = email;

    const [result] = await poolWrapper.execute(
      'INSERT INTO users (user_id, tenantId, name, email, password, phone, gender, birthDate, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, tenantId, name, plainEmail, hashedPassword, plainPhone, (gender || null), validBirthDate, plainAddress]
    );

    // Return user data for web panel - Try with company fields first, fallback if columns don't exist
    let [newUser] = await poolWrapper.execute(
      'SELECT id, name, email, phone, address, companyName, taxOffice, taxNumber, tradeRegisterNumber, website, createdAt FROM users WHERE id = ? AND tenantId = ?',
      [result.insertId, tenantId]
    ).catch(async (error) => {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️ Company columns missing, using fallback query');
        return await poolWrapper.execute(
          'SELECT id, name, email, phone, address, createdAt FROM users WHERE id = ? AND tenantId = ?',
          [result.insertId, tenantId]
        );
      }
      throw error;
    });

    res.json({
      success: true,
      data: newUser.length > 0 ? newUser[0] : {
        id: result.insertId,
        name: name,
        email: email,
        phone: plainPhone,
        address: plainAddress,
        createdAt: new Date().toISOString()
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'CREATE_USER');
    const errorResponse = createSafeErrorResponse(error, 'Error creating user');
    res.status(500).json(errorResponse);
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Use default tenant ID if not provided
    const tenantId = req.tenant?.id || 1;

    // GÜVENLİK: Yetkilendirme kontrolü - Kullanıcı sadece kendi bilgilerine erişebilir
    // JWT token varsa, token'daki userId ile istenen id'yi karşılaştır
    const authenticatedUserId = req.user?.userId;
    if (authenticatedUserId) {
      // JWT token ile giriş yapılmışsa, sadece kendi bilgilerine erişebilir
      if (parseInt(id) !== parseInt(authenticatedUserId)) {
        // Admin kontrolü - admin ise tüm kullanıcılara erişebilir
        const [adminCheck] = await poolWrapper.execute(
          'SELECT role FROM users WHERE id = ? AND tenantId = ?',
          [authenticatedUserId, tenantId]
        );
        if (adminCheck.length === 0 || (adminCheck[0].role !== 'admin' && adminCheck[0].role !== 'superadmin')) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own user information.'
          });
        }
      }
    }
    // JWT token yoksa, sadece tenant kontrolü yapılır (API key ile korunuyor)

    // Try with birthDate first, fallback to without it
    let [rows] = await poolWrapper.execute(
      'SELECT id, name, email, phone, birthDate, address, createdAt FROM users WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    ).catch(async (error) => {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️ birthDate column missing, using fallback query');
        return await poolWrapper.execute(
          'SELECT id, name, email, phone, address, createdAt FROM users WHERE id = ? AND tenantId = ?',
          [id, tenantId]
        );
      }
      throw error;
    });

    if (rows.length > 0) {
      const user = rows[0];

      // Direct data (no encryption needed)
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        birthDate: user.birthDate || null, // Will be null if column doesn't exist
        address: user.address || '',
        createdAt: user.createdAt
      };

      res.json({ success: true, data: userData });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('❌ Error getting user:', error);

    // Check if it's a database column error
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.error('❌ Database column error - birth_date column missing');
      res.status(500).json({
        success: false,
        message: 'Veritabanı hatası: birth_date kolonu eksik',
        type: 'DATABASE_ERROR',
        retryable: false
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Kullanıcı bilgileri alınırken hata oluştu',
        type: 'UNKNOWN_ERROR',
        retryable: false
      });
    }
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Store plain email (no encryption needed)

    // Use default tenant ID if not provided
    const tenantId = req.tenant?.id || 1;

    // Get user with hashed password - Try with company fields first, fallback if columns don't exist
    let [rows] = await poolWrapper.execute(
      'SELECT id, name, email, phone, address, password, companyName, taxOffice, taxNumber, tradeRegisterNumber, website, createdAt, tenantId FROM users WHERE email = ? AND tenantId = ?',
      [email, tenantId]
    ).catch(async (error) => {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️ Company columns missing, using fallback query');
        // Fallback: sadece mevcut kolonları seç
        return await poolWrapper.execute(
          'SELECT id, name, email, phone, address, password, createdAt, tenantId FROM users WHERE email = ? AND tenantId = ?',
          [email, tenantId]
        );
      }
      throw error;
    });

    if (rows.length > 0) {
      const user = rows[0];

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);

      if (isPasswordValid) {
        // Return user data (no decryption needed)
        // Company fields may not exist, so use optional chaining
        // IMPORTANT: Password field is NEVER included in response
        const userData = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          address: user.address || '',
          companyName: user.companyName || '',
          taxOffice: user.taxOffice || '',
          taxNumber: user.taxNumber || '',
          tradeRegisterNumber: user.tradeRegisterNumber || '',
          website: user.website || '',
          createdAt: user.createdAt
        };
        // Explicitly remove password if somehow present
        delete userData.password;

        console.log('✅ User data retrieved for login');
        console.log('📧 Email:', !!userData.email);
        console.log('📱 Phone:', !!userData.phone);
        console.log('🏠 Address:', !!userData.address);

        res.json({
          success: true,
          data: userData,
          message: 'Login successful'
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('❌ Error during login:', error);
    res.status(500).json({ success: false, message: 'Error during login' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, companyName, taxOffice, taxNumber, tradeRegisterNumber, website, currentPassword, newPassword } = req.body;

    // Get current user - Try with company fields first, fallback if columns don't exist
    let [userRows] = await poolWrapper.execute(
      'SELECT id, name, email, phone, address, password, companyName, taxOffice, taxNumber, tradeRegisterNumber, website, createdAt, tenantId FROM users WHERE id = ? AND tenantId = ?',
      [id, req.tenant.id]
    ).catch(async (error) => {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️ Company columns missing, using fallback query');
        return await poolWrapper.execute(
          'SELECT id, name, email, phone, address, password, createdAt, tenantId FROM users WHERE id = ? AND tenantId = ?',
          [id, req.tenant.id]
        );
      }
      throw error;
    });

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = userRows[0];

    // Şirket bilgileri kolonlarını kontrol et ve ekle
    const [cols] = await poolWrapper.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `);
    const columnNames = cols.map(c => c.COLUMN_NAME);
    const alters = [];

    if (!columnNames.includes('companyName')) {
      alters.push("ADD COLUMN companyName VARCHAR(255) NULL AFTER address");
    }
    if (!columnNames.includes('taxOffice')) {
      alters.push("ADD COLUMN taxOffice VARCHAR(255) NULL AFTER companyName");
    }
    if (!columnNames.includes('taxNumber')) {
      alters.push("ADD COLUMN taxNumber VARCHAR(50) NULL AFTER taxOffice");
    }
    if (!columnNames.includes('tradeRegisterNumber')) {
      alters.push("ADD COLUMN tradeRegisterNumber VARCHAR(100) NULL AFTER taxNumber");
    }
    if (!columnNames.includes('website')) {
      alters.push("ADD COLUMN website VARCHAR(255) NULL AFTER tradeRegisterNumber");
    }

    if (alters.length > 0) {
      await poolWrapper.execute(`ALTER TABLE users ${alters.join(', ')}`);
      console.log('✅ Şirket bilgileri kolonları eklendi');
    }

    // If password change is requested
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, currentUser.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Validate new password
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update user data (no encryption needed)
      const plainPhone = phone || currentUser.phone;
      const plainAddress = address || currentUser.address;

      const updateFields = ['name', 'email', 'phone', 'address', 'password'];
      const updateValues = [name, email, plainPhone, plainAddress, hashedNewPassword];

      if (columnNames.includes('companyName') || alters.length > 0) {
        updateFields.push('companyName', 'taxOffice', 'taxNumber', 'tradeRegisterNumber', 'website');
        updateValues.push(companyName || '', taxOffice || '', taxNumber || '', tradeRegisterNumber || '', website || '');
      }

      updateFields.push('id');
      updateValues.push(id);
      updateValues.push(req.tenant.id);

      await poolWrapper.execute(
        `UPDATE users SET ${updateFields.slice(0, -2).map(f => `${f} = ?`).join(', ')} WHERE id = ? AND tenantId = ?`,
        updateValues
      );
    } else {
      // Update user data (no encryption needed)
      const plainPhone = phone || currentUser.phone;
      const plainAddress = address || currentUser.address;

      const updateFields = ['name', 'email', 'phone', 'address'];
      const updateValues = [name, email, plainPhone, plainAddress];

      if (columnNames.includes('companyName') || alters.length > 0) {
        updateFields.push('companyName', 'taxOffice', 'taxNumber', 'tradeRegisterNumber', 'website');
        updateValues.push(companyName || '', taxOffice || '', taxNumber || '', tradeRegisterNumber || '', website || '');
      }

      updateFields.push('id');
      updateValues.push(id);
      updateValues.push(req.tenant.id);

      await poolWrapper.execute(
        `UPDATE users SET ${updateFields.slice(0, -2).map(f => `${f} = ?`).join(', ')} WHERE id = ? AND tenantId = ?`,
        updateValues
      );
    }

    // Return updated user data
      // Try with company fields first, fallback if columns don't exist
      let [updatedUser] = await poolWrapper.execute(
        'SELECT id, name, email, phone, address, companyName, taxOffice, taxNumber, tradeRegisterNumber, website, createdAt FROM users WHERE id = ? AND tenantId = ?',
        [id, req.tenant.id]
      ).catch(async (error) => {
        if (error.code === 'ER_BAD_FIELD_ERROR') {
          console.log('⚠️ Company columns missing, using fallback query');
          return await poolWrapper.execute(
            'SELECT id, name, email, phone, address, createdAt FROM users WHERE id = ? AND tenantId = ?',
            [id, req.tenant.id]
          );
        }
        throw error;
      });

    // IMPORTANT: Password field is NEVER included in response
    const userData = updatedUser.length > 0 ? { ...updatedUser[0] } : null;
    if (userData) {
      delete userData.password;
    }

    res.json({
      success: true,
      data: userData,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// ========== User Favorites Endpoints ==========
// Get user favorites
app.get('/api/favorites/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.tenant?.id || 1;

    const [favorites] = await poolWrapper.execute(`
      SELECT f.id, f.productId, f.createdAt,
             p.name, p.price, p.image, p.stock, p.description
      FROM user_favorites_v2 f
      JOIN products p ON f.productId = p.id AND p.tenantId = ?
      WHERE f.userId = ?
      ORDER BY f.createdAt DESC
    `, [tenantId, userId]);

    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error('❌ Error getting favorites:', error);
    res.status(500).json({ success: false, message: 'Error getting favorites' });
  }
});

// Add to favorites
app.post('/api/favorites', async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and product ID are required'
      });
    }

    const tenantId = req.tenant?.id || 1;

    // Check if already favorited
    const [existing] = await poolWrapper.execute(
      'SELECT id FROM user_favorites_v2 WHERE userId = ? AND productId = ?',
      [userId, productId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Product already in favorites'
      });
    }

    // Check if product exists
    const [product] = await poolWrapper.execute(
      'SELECT id FROM products WHERE id = ? AND tenantId = ?',
      [productId, tenantId]
    );

    if (product.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Add to favorites
    const [result] = await poolWrapper.execute(
      'INSERT INTO user_favorites_v2 (userId, productId) VALUES (?, ?)',
      [userId, productId]
    );

    res.json({
      success: true,
      data: { id: result.insertId },
      message: 'Product added to favorites'
    });
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    res.status(500).json({ success: false, message: 'Error adding to favorites' });
  }
});

// Remove from favorites
app.delete('/api/favorites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Verify ownership
    const [favorite] = await poolWrapper.execute(
      'SELECT id FROM user_favorites_v2 WHERE id = ? AND userId = ?',
      [id, userId]
    );

    if (favorite.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found or not owned by user'
      });
    }

    await poolWrapper.execute(
      'DELETE FROM user_favorites_v2 WHERE id = ? AND userId = ?',
      [id, userId]
    );

    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({ success: false, message: 'Error removing from favorites' });
  }
});

// Remove from favorites by productId
app.delete('/api/favorites/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    await poolWrapper.execute(
      'DELETE FROM user_favorites_v2 WHERE productId = ? AND userId = ?',
      [productId, userId]
    );

    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({ success: false, message: 'Error removing from favorites' });
  }
});

// ========== User Lists Endpoints ==========
// Get user lists
app.get('/api/lists/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.tenant?.id || 1;

    const [lists] = await poolWrapper.execute(`
      SELECT 
        ul.id,
        ul.name,
        ul.description,
        ul.createdAt,
        ul.updatedAt,
        COUNT(uli.id) as itemCount
      FROM user_lists ul
      LEFT JOIN user_list_items uli ON ul.id = uli.listId AND uli.tenantId = ?
      WHERE ul.userId = ? AND ul.tenantId = ?
      GROUP BY ul.id
      ORDER BY ul.createdAt DESC
    `, [tenantId, userId, tenantId]);

    res.json({ success: true, data: lists });
  } catch (error) {
    console.error('❌ Error getting user lists:', error);
    res.status(500).json({ success: false, message: 'Error getting user lists' });
  }
});

// Get list by ID with items
app.get('/api/lists/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    const { userId } = req.query;
    const tenantId = req.tenant?.id || 1;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Get list info
    const [lists] = await poolWrapper.execute(`
      SELECT id, name, description, createdAt, updatedAt
      FROM user_lists
      WHERE id = ? AND userId = ? AND tenantId = ?
    `, [listId, userId, tenantId]);

    if (lists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Get list items with product info
    const [items] = await poolWrapper.execute(`
      SELECT 
        uli.id,
        uli.productId,
        uli.quantity,
        uli.notes,
        uli.createdAt,
        p.name as productName,
        p.price as productPrice,
        p.image as productImage,
        p.stock as productStock
      FROM user_list_items uli
      JOIN products p ON uli.productId = p.id AND p.tenantId = ?
      WHERE uli.listId = ? AND uli.tenantId = ?
      ORDER BY uli.createdAt DESC
    `, [tenantId, listId, tenantId]);

    res.json({
      success: true,
      data: {
        ...lists[0],
        items: items
      }
    });
  } catch (error) {
    console.error('❌ Error getting list:', error);
    res.status(500).json({ success: false, message: 'Error getting list' });
  }
});

// Create new list
app.post('/api/lists', async (req, res) => {
  try {
    const { userId, name, description } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        message: 'User ID and list name are required'
      });
    }

    const tenantId = req.tenant?.id || 1;

    const [result] = await poolWrapper.execute(
      'INSERT INTO user_lists (tenantId, userId, name, description) VALUES (?, ?, ?, ?)',
      [tenantId, userId, name, description || null]
    );

    res.json({
      success: true,
      data: { id: result.insertId, name, description },
      message: 'List created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating list:', error);
    res.status(500).json({ success: false, message: 'Error creating list' });
  }
});

// Update list
app.put('/api/lists/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    const { userId, name, description } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const tenantId = req.tenant?.id || 1;

    // Verify ownership
    const [lists] = await poolWrapper.execute(
      'SELECT id FROM user_lists WHERE id = ? AND userId = ? AND tenantId = ?',
      [listId, userId, tenantId]
    );

    if (lists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'List not found or not owned by user'
      });
    }

    // Update list
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(listId, userId, tenantId);
    await poolWrapper.execute(
      `UPDATE user_lists SET ${updateFields.join(', ')} WHERE id = ? AND userId = ? AND tenantId = ?`,
      updateValues
    );

    res.json({ success: true, message: 'List updated successfully' });
  } catch (error) {
    console.error('❌ Error updating list:', error);
    res.status(500).json({ success: false, message: 'Error updating list' });
  }
});

// Delete list
app.delete('/api/lists/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const tenantId = req.tenant?.id || 1;

    // Verify ownership
    const [lists] = await poolWrapper.execute(
      'SELECT id FROM user_lists WHERE id = ? AND userId = ? AND tenantId = ?',
      [listId, userId, tenantId]
    );

    if (lists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'List not found or not owned by user'
      });
    }

    // Delete list (items will be deleted automatically due to CASCADE)
    await poolWrapper.execute(
      'DELETE FROM user_lists WHERE id = ? AND userId = ? AND tenantId = ?',
      [listId, userId, tenantId]
    );

    res.json({ success: true, message: 'List deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting list:', error);
    res.status(500).json({ success: false, message: 'Error deleting list' });
  }
});

// Add product to list
app.post('/api/lists/:listId/items', async (req, res) => {
  try {
    const { listId } = req.params;
    const { userId, productId, quantity, notes } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and product ID are required'
      });
    }

    const tenantId = req.tenant?.id || 1;

    // Verify list ownership
    const [lists] = await poolWrapper.execute(
      'SELECT id FROM user_lists WHERE id = ? AND userId = ? AND tenantId = ?',
      [listId, userId, tenantId]
    );

    if (lists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'List not found or not owned by user'
      });
    }

    // Check if product exists
    const [products] = await poolWrapper.execute(
      'SELECT id FROM products WHERE id = ? AND tenantId = ?',
      [productId, tenantId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product already in list
    const [existing] = await poolWrapper.execute(
      'SELECT id FROM user_list_items WHERE listId = ? AND productId = ? AND tenantId = ?',
      [listId, productId, tenantId]
    );

    if (existing.length > 0) {
      // Update quantity if already exists
      await poolWrapper.execute(
        'UPDATE user_list_items SET quantity = quantity + ?, notes = COALESCE(?, notes) WHERE id = ?',
        [quantity || 1, notes || null, existing[0].id]
      );
      return res.json({
        success: true,
        message: 'Product quantity updated in list'
      });
    }

    // Add to list
    const [result] = await poolWrapper.execute(
      'INSERT INTO user_list_items (tenantId, listId, productId, quantity, notes) VALUES (?, ?, ?, ?, ?)',
      [tenantId, listId, productId, quantity || 1, notes || null]
    );

    res.json({
      success: true,
      data: { id: result.insertId },
      message: 'Product added to list'
    });
  } catch (error) {
    console.error('❌ Error adding product to list:', error);
    res.status(500).json({ success: false, message: 'Error adding product to list' });
  }
});

// Remove product from list
app.delete('/api/lists/:listId/items/:itemId', async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const tenantId = req.tenant?.id || 1;

    // Verify list ownership
    const [lists] = await poolWrapper.execute(
      'SELECT id FROM user_lists WHERE id = ? AND userId = ? AND tenantId = ?',
      [listId, userId, tenantId]
    );

    if (lists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'List not found or not owned by user'
      });
    }

    // Delete item
    await poolWrapper.execute(
      'DELETE FROM user_list_items WHERE id = ? AND listId = ? AND tenantId = ?',
      [itemId, listId, tenantId]
    );

    res.json({ success: true, message: 'Product removed from list' });
  } catch (error) {
    console.error('❌ Error removing product from list:', error);
    res.status(500).json({ success: false, message: 'Error removing product from list' });
  }
});

// Update list item quantity
app.put('/api/lists/:listId/items/:itemId', async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const { userId, quantity, notes } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const tenantId = req.tenant?.id || 1;

    // Verify list ownership
    const [lists] = await poolWrapper.execute(
      'SELECT id FROM user_lists WHERE id = ? AND userId = ? AND tenantId = ?',
      [listId, userId, tenantId]
    );

    if (lists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'List not found or not owned by user'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (quantity !== undefined) {
      updateFields.push('quantity = ?');
      updateValues.push(quantity);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(itemId, listId, tenantId);
    await poolWrapper.execute(
      `UPDATE user_list_items SET ${updateFields.join(', ')} WHERE id = ? AND listId = ? AND tenantId = ?`,
      updateValues
    );

    res.json({ success: true, message: 'List item updated successfully' });
  } catch (error) {
    console.error('❌ Error updating list item:', error);
    res.status(500).json({ success: false, message: 'Error updating list item' });
  }
});

// ========== Support Tickets Endpoints ==========
// Get user support tickets
app.get('/api/support-tickets/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.tenant?.id || 1;

    const [tickets] = await poolWrapper.execute(`
      SELECT id, subject, category, status, message, createdAt, updatedAt
      FROM support_tickets
      WHERE userId = ? AND tenantId = ?
      ORDER BY createdAt DESC
    `, [userId, tenantId]);

    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('❌ Error getting support tickets:', error);
    
    // Check if table doesn't exist
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ success: true, data: [] });
    }
    
    res.status(500).json({ success: false, message: 'Error getting support tickets' });
  }
});

// Create support ticket
app.post('/api/support-tickets', async (req, res) => {
  try {
    const { userId, subject, category, message } = req.body;

    if (!userId || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'User ID, subject and message are required'
      });
    }

    const tenantId = req.tenant?.id || 1;

    // Verify user exists
    const [user] = await poolWrapper.execute(
      'SELECT id FROM users WHERE id = ? AND tenantId = ?',
      [userId, tenantId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [result] = await poolWrapper.execute(
      'INSERT INTO support_tickets (tenantId, userId, subject, category, message, status) VALUES (?, ?, ?, ?, ?, ?)',
      [tenantId, userId, subject, category || 'general', message, 'pending']
    );

    res.json({
      success: true,
      data: { id: result.insertId },
      message: 'Support ticket created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating support ticket:', error);
    
    // Check if table doesn't exist
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('⚠️ support_tickets table does not exist, creating it...');
      try {
        await poolWrapper.execute(`
          CREATE TABLE IF NOT EXISTS support_tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tenantId INT NOT NULL,
            userId INT NOT NULL,
            subject VARCHAR(255) NOT NULL,
            category VARCHAR(50) DEFAULT 'general',
            message TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user (userId, tenantId),
            INDEX idx_status (status)
          )
        `);
        
        // Retry insert
        const tenantId = req.tenant?.id || 1;
        const { userId, subject, category, message } = req.body;
        const [result] = await poolWrapper.execute(
          'INSERT INTO support_tickets (tenantId, userId, subject, category, message, status) VALUES (?, ?, ?, ?, ?, ?)',
          [tenantId, userId, subject, category || 'general', message, 'pending']
        );
        
        return res.json({
          success: true,
          data: { id: result.insertId },
          message: 'Support ticket created successfully'
        });
      } catch (createError) {
        console.error('❌ Error creating support_tickets table:', createError);
      }
    }
    
    res.status(500).json({ success: false, message: 'Error creating support ticket' });
  }
});

// Order endpoints (with tenant authentication)
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get orders with items
    const [orders] = await poolWrapper.execute(
      `SELECT o.id, o.totalAmount, o.status, o.createdAt, o.city, o.district, o.fullAddress, o.shippingAddress, o.paymentMethod
       FROM orders o 
       WHERE o.userId = ? AND o.tenantId = ? 
       ORDER BY o.createdAt DESC`,
      [userId, req.tenant.id]
    );

    // Get order items for each order
    for (let order of orders) {
      const [orderItems] = await poolWrapper.execute(`
        SELECT oi.quantity, oi.price, 
               p.name as productName, p.image as productImage
        FROM order_items oi
        LEFT JOIN products p ON oi.productId = p.id
        WHERE oi.orderId = ?
      `, [order.id]);

      order.items = orderItems;
    }

    console.log(`✅ Found ${orders.length} orders for user ${userId}`);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('❌ Error getting user orders:', error);
    res.status(500).json({ success: false, message: 'Error getting orders' });
  }
});

// Kullanıcının belirli bir ürünü satın alıp almadığını kontrol et
app.get('/api/users/:userId/purchases/:productId', tenantCache, async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const tenantId = req.tenant?.id || 1;
    
    console.log(`🔍 Checking purchase for user ${userId}, product ${productId}, tenant ${tenantId}`);

    // Kullanıcının bu ürünü içeren siparişlerini kontrol et
    const [purchases] = await poolWrapper.execute(
      `SELECT o.id as orderId, o.status as orderStatus, o.createdAt as purchaseDate,
              oi.productId, oi.quantity, oi.price, oi.selectedVariations
       FROM orders o
       INNER JOIN order_items oi ON o.id = oi.orderId
       WHERE o.userId = ? AND o.tenantId = ? AND oi.productId = ?
       ORDER BY o.createdAt DESC
       LIMIT 1`,
      [userId, tenantId, productId]
    );

    if (purchases.length > 0) {
      const purchase = purchases[0];
      res.json({
        success: true,
        data: {
          orderId: purchase.orderId,
          orderStatus: purchase.orderStatus,
          purchaseDate: purchase.purchaseDate,
          productId: purchase.productId,
          quantity: purchase.quantity,
          price: purchase.price,
          productVariations: purchase.selectedVariations ? JSON.parse(purchase.selectedVariations) : []
        }
      });
    } else {
      res.json({
        success: true,
        data: null
      });
    }
  } catch (error) {
    console.error('❌ Error checking user purchase:', error);
    res.status(500).json({ success: false, message: 'Error checking purchase' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const {
      userId, totalAmount, status, shippingAddress, paymentMethod, items,
      city, district, fullAddress, customerName, customerEmail, customerPhone
    } = req.body;

    // Validate required fields
    if (!userId || !totalAmount || !shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Begin transaction
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();

    try {
      // Cüzdan ödemesi kontrolü (EFT havale için cüzdan bakiyesi düşülmez)
      if (paymentMethod === 'wallet') {
        // Cüzdan bakiyesini kontrol et
        const [walletRows] = await connection.execute(
          'SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?',
          [userId, req.tenant.id]
        );

        const currentBalance = walletRows.length > 0 ? walletRows[0].balance : 0;

        if (currentBalance < totalAmount) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            success: false,
            message: 'Cüzdan bakiyeniz yetersiz',
            data: { currentBalance, requiredAmount: totalAmount }
          });
        }

        // Cüzdan bakiyesinden düş
        await connection.execute(
          'UPDATE user_wallets SET balance = balance - ?, updatedAt = NOW() WHERE userId = ? AND tenantId = ?',
          [totalAmount, userId, req.tenant.id]
        );

        // Cüzdan işlem kaydı oluştur
        await connection.execute(
          `INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, createdAt) 
           VALUES (?, ?, 'debit', ?, ?, NOW())`,
          [userId, req.tenant.id, totalAmount, `Alışveriş ödemesi - Sipariş #${Date.now()}`]
        );

        console.log(`💰 Wallet payment processed: ${totalAmount} TL deducted from user ${userId}`);
      }

      // Create order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (tenantId, userId, totalAmount, status, shippingAddress, paymentMethod, city, district, fullAddress, customerName, customerEmail, customerPhone) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.tenant.id, userId, totalAmount, status || 'pending', shippingAddress, paymentMethod, city, district, fullAddress, customerName, customerEmail, customerPhone]
      );

      const orderId = orderResult.insertId;

      // Create order items
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.price) {
          throw new Error('Invalid item data');
        }

        // Varyasyon bilgisi (variationString ve selectedVariations)
        const variationString = item.variationString || '';
        const selectedVariations = item.selectedVariations ? JSON.stringify(item.selectedVariations) : null;

        await connection.execute(
          `INSERT INTO order_items (tenantId, orderId, productId, quantity, price, productName, productDescription, productCategory, productBrand, productImage, variationString, selectedVariations) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.tenant.id, orderId, item.productId, item.quantity, item.price,
          item.productName, item.productDescription, item.productCategory, item.productBrand, item.productImage,
            variationString, selectedVariations]
        );

        // Update product stock
        await connection.execute(
          `UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ? AND tenantId = ?`,
          [item.quantity, item.productId, req.tenant.id]
        );
      }

      // Add EXP for purchase
      const baseExp = 50; // Base EXP for purchase
      const orderExp = Math.floor(totalAmount * 0.1); // 10% of order total
      const totalExp = baseExp + orderExp;

      await connection.execute(
        'INSERT INTO user_exp_transactions (userId, tenantId, source, amount, description, orderId) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, req.tenant.id, 'purchase', totalExp, `Alışveriş: ${totalAmount} TL`, orderId]
      );

      // Commit transaction
      await connection.commit();
      connection.release();

      console.log(`✅ Order created successfully: ${orderId} with ${items.length} items, ${totalExp} EXP added`);
      res.json({ success: true, data: { orderId, expGained: totalExp } });

    } catch (error) {
      // Rollback transaction
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ success: false, message: 'Error creating order' });
  }
});

app.put('/api/orders/:id/status', requireUserOwnership('order', 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await poolWrapper.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
});

app.put('/api/orders/:id/cancel', requireUserOwnership('order', 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    await poolWrapper.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['cancelled', id]
    );

    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Error cancelling order' });
  }
});

// Admin - Get all products (for admin panel)
app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    // Optimize: Admin için gerekli column'lar
    const [rows] = await poolWrapper.execute(
      'SELECT id, name, price, image, brand, category, description, stock, sku, isActive, lastUpdated, createdAt, tenantId FROM products ORDER BY lastUpdated DESC'
    );

    // Clean HTML entities from all products
    const cleanedProducts = rows.map(cleanProductData);

    res.json({ success: true, data: cleanedProducts });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, message: 'Error getting products' });
  }
});

// Admin - Get single product (for admin panel)
app.get('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('📦 Admin requesting product detail for ID:', productId);

    // Optimize: Admin detail için gerekli column'lar
    const [rows] = await poolWrapper.execute(
      'SELECT id, name, price, image, images, brand, category, description, stock, sku, isActive, lastUpdated, createdAt, tenantId FROM products WHERE id = ?',
      [productId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // Clean HTML entities from product data
    const cleanedProduct = cleanProductData(rows[0]);

    console.log('📦 Product detail found:', cleanedProduct.name);
    res.json({ success: true, data: cleanedProduct });
  } catch (error) {
    console.error('Error getting product detail:', error);
    res.status(500).json({ success: false, message: 'Error getting product detail' });
  }
});

// Admin - Create product
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const {
      name,
      description = null,
      price,
      category = null,
      image = null,
      stock = 0,
      brand = null,
      taxRate = 0,
      priceIncludesTax = false
    } = req.body || {};

    if (!name || price === undefined || price === null || isNaN(parseFloat(price))) {
      return res.status(400).json({ success: false, message: 'Geçersiz veri: name ve price zorunludur' });
    }

    // Default tenant
    const tenantId = 1;

    const [result] = await poolWrapper.execute(`
      INSERT INTO products (tenantId, name, description, price, taxRate, priceIncludesTax, category, image, stock, brand, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [tenantId, name, description, parseFloat(price), parseFloat(taxRate || 0), !!priceIncludesTax, category, image, parseInt(stock || 0, 10), brand]);

    // Optimize: Sadece gerekli column'lar
    const [rows] = await poolWrapper.execute('SELECT id, name, price, image, brand, category, description, stock, sku, isActive, lastUpdated, createdAt, tenantId FROM products WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: rows[0], message: 'Ürün oluşturuldu' });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ success: false, message: 'Error creating product' });
  }
});

// Admin - Update product
app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const allowed = ['name', 'description', 'price', 'taxRate', 'priceIncludesTax', 'category', 'image', 'images', 'stock', 'brand', 'hasVariations'];
    const fields = [];
    const params = [];
    for (const key of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
        fields.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Güncellenecek alan yok' });
    }
    params.push(productId);
    await poolWrapper.execute(`UPDATE products SET ${fields.join(', ')}, lastUpdated = NOW() WHERE id = ?`, params);
    // Optimize: Sadece gerekli column'lar
    const [rows] = await poolWrapper.execute('SELECT id, name, price, image, images, brand, category, description, stock, sku, isActive, lastUpdated, createdAt, tenantId FROM products WHERE id = ?', [productId]);
    res.json({ success: true, data: rows[0], message: 'Ürün güncellendi' });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({ success: false, message: 'Error updating product' });
  }
});

// Admin - Delete product
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const [result] = await poolWrapper.execute('DELETE FROM products WHERE id = ?', [productId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    }
    res.json({ success: true, message: 'Ürün silindi' });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Error deleting product' });
  }
});

// Admin - Get all categories (for admin panel)
app.get('/api/admin/categories', authenticateAdmin, async (req, res) => {
  try {
    console.log('📂 Admin requesting categories');

    const [rows] = await poolWrapper.execute(`
      SELECT c.*, COUNT(p.id) as productCount 
      FROM categories c 
      LEFT JOIN products p ON p.category = c.name AND p.tenantId = c.tenantId 
      WHERE c.tenantId = ?
      GROUP BY c.id 
      ORDER BY c.name ASC
    `, [req.tenant.id]);

    console.log('📂 Categories found:', rows.length);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: 'Error getting categories' });
  }
});

// Admin - Category stats (sales, orders, stock)
app.get('/api/admin/category-stats', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    // Sales and orders per category
    const [salesRows] = await poolWrapper.execute(
      `SELECT p.category as name,
              COUNT(oi.id) as orders,
              COALESCE(SUM(oi.price * oi.quantity),0) as revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.productId AND p.tenantId = ?
       JOIN orders o ON o.id = oi.orderId AND o.tenantId = ?
       GROUP BY p.category`, [tenantId, tenantId]
    );
    // Stock per category
    const [stockRows] = await poolWrapper.execute(
      `SELECT category as name, COALESCE(SUM(stock),0) as stock
       FROM products WHERE tenantId = ? GROUP BY category`, [tenantId]
    );
    // Merge
    const byName = new Map();
    salesRows.forEach((r) => byName.set(r.name, { name: r.name, orders: Number(r.orders) || 0, revenue: Number(r.revenue) || 0, stock: 0 }));
    stockRows.forEach((r) => {
      const cur = byName.get(r.name) || { name: r.name, orders: 0, revenue: 0, stock: 0 };
      cur.stock = Number(r.stock) || 0; byName.set(r.name, cur);
    });
    const merged = Array.from(byName.values()).sort((a, b) => b.revenue - a.revenue);
    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('❌ Error getting category stats:', error);
    res.status(500).json({ success: false, message: 'Error getting category stats' });
  }
});

// Admin - Create category
app.post('/api/admin/categories', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, categoryTree, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Kategori adı zorunludur' });
    }

    const [result] = await poolWrapper.execute(
      `INSERT INTO categories (tenantId, name, description, categoryTree, parentId, source) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.tenant.id, name, description || '', categoryTree || '', parentId || null, 'MANUAL']
    );

    // Optimize: Sadece gerekli column'lar
    const [newCategory] = await poolWrapper.execute(
      'SELECT id, name, description, categoryTree, parentId, source, isActive, createdAt, updatedAt, tenantId FROM categories WHERE id = ?', [result.insertId]
    );

    res.json({ success: true, data: newCategory[0], message: 'Kategori oluşturuldu' });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Error creating category' });
  }
});

// Admin - Update category
app.put('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { name, description, categoryTree, parentId, isActive } = req.body;

    const allowed = ['name', 'description', 'categoryTree', 'parentId', 'isActive'];
    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
        fields.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Güncellenecek alan yok' });
    }

    params.push(categoryId, req.tenant.id);

    await poolWrapper.execute(
      `UPDATE categories SET ${fields.join(', ')}, updatedAt = NOW() WHERE id = ? AND tenantId = ?`,
      params
    );

    // Optimize: Sadece gerekli column'lar
    const [updatedCategory] = await poolWrapper.execute(
      'SELECT id, name, description, categoryTree, parentId, source, isActive, createdAt, updatedAt, tenantId FROM categories WHERE id = ? AND tenantId = ?', [categoryId, req.tenant.id]
    );

    res.json({ success: true, data: updatedCategory[0], message: 'Kategori güncellendi' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Error updating category' });
  }
});

// Admin - Delete category
app.delete('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    // Kategoriye ait ürün var mı kontrol et
    const [products] = await poolWrapper.execute(
      'SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = ? AND tenantId = ?) AND tenantId = ?',
      [categoryId, req.tenant.id, req.tenant.id]
    );

    if (products[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu kategoriye ait ürünler bulunduğu için silinemez'
      });
    }

    await poolWrapper.execute(
      'DELETE FROM categories WHERE id = ? AND tenantId = ?',
      [categoryId, req.tenant.id]
    );

    res.json({ success: true, message: 'Kategori silindi' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Error deleting category' });
  }
});

// ==================== FLASH DEALS API ====================

// Create flash deals table if not exists
async function createFlashDealsTable() {
  try {
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS flash_deals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type ENUM('percentage', 'fixed') NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_dates (start_date, end_date)
      )
    `);
    
    // Flash deal products junction table
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS flash_deal_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flash_deal_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (flash_deal_id) REFERENCES flash_deals(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_flash_deal_product (flash_deal_id, product_id),
        INDEX idx_flash_deal (flash_deal_id),
        INDEX idx_product (product_id)
      )
    `);
    
    // Flash deal categories junction table
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS flash_deal_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flash_deal_id INT NOT NULL,
        category_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (flash_deal_id) REFERENCES flash_deals(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE KEY unique_flash_deal_category (flash_deal_id, category_id),
        INDEX idx_flash_deal (flash_deal_id),
        INDEX idx_category (category_id)
      )
    `);
    
    console.log('✅ Flash deals tables created/verified');
  } catch (error) {
    console.error('❌ Error creating flash deals table:', error);
  }
}

// Initialize flash deals table - moved to startServer function

// Admin - Get all flash deals
app.get('/api/admin/flash-deals/all', authenticateAdmin, async (req, res) => {
  try {
    console.log('⚡ Admin requesting flash deals');

    const [rows] = await poolWrapper.execute(`
      SELECT fd.*
      FROM flash_deals fd
      ORDER BY fd.created_at DESC
    `);

    // Her flash deal için ürün ve kategori bilgilerini getir
    const dealsWithTargets = await Promise.all(rows.map(async (deal) => {
      const [products] = await poolWrapper.execute(`
        SELECT p.id, p.name, p.price, p.image, p.category, p.brand, p.description, 
               p.stock, p.rating, p.reviewCount, p.hasVariations, p.externalId, p.lastUpdated
        FROM flash_deal_products fdp
        JOIN products p ON fdp.product_id = p.id
        WHERE fdp.flash_deal_id = ?
      `, [deal.id]);

      const [categories] = await poolWrapper.execute(`
        SELECT c.id, c.name
        FROM flash_deal_categories fdc
        JOIN categories c ON fdc.category_id = c.id
        WHERE fdc.flash_deal_id = ?
      `, [deal.id]);

      return {
        ...deal,
        products: products || [],
        categories: categories || []
      };
    }));

    console.log('⚡ Flash deals found:', dealsWithTargets.length);
    res.json({ success: true, data: dealsWithTargets });
  } catch (error) {
    console.error('❌ Error getting flash deals:', error);
    res.status(500).json({ success: false, message: 'Error getting flash deals' });
  }
});

// Admin - Create flash deal
app.post('/api/admin/flash-deals', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, discount_type, discount_value, start_date, end_date, product_ids, category_ids } = req.body;

    console.log('⚡ Creating flash deal:', { name, discount_type, discount_value, product_ids, category_ids });

    // Validate required fields
    if (!name || !discount_type || discount_value === undefined || discount_value === null || !start_date || !end_date) {
      console.log('❌ Validation failed:', { name, discount_type, discount_value, start_date, end_date });
      return res.status(400).json({
        success: false,
        message: 'Gerekli alanlar eksik: ' + JSON.stringify({
          name: !name ? 'eksik' : 'var',
          discount_type: !discount_type ? 'eksik' : 'var',
          discount_value: (discount_value === undefined || discount_value === null) ? 'eksik' : 'var',
          start_date: !start_date ? 'eksik' : 'var',
          end_date: !end_date ? 'eksik' : 'var'
        })
      });
    }
    
    // Validate discount value
    const discountValueNum = parseFloat(discount_value);
    if (isNaN(discountValueNum) || discountValueNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'İndirim değeri 0\'dan büyük bir sayı olmalıdır'
      });
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz indirim türü'
      });
    }

    // Validate at least one product or category selected
    const productIds = Array.isArray(product_ids) ? product_ids.filter(Boolean) : [];
    const categoryIds = Array.isArray(category_ids) ? category_ids.filter(Boolean) : [];
    
    if (productIds.length === 0 && categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'En az bir ürün veya kategori seçilmelidir'
      });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Bitiş tarihi başlangıç tarihinden sonra olmalı'
      });
    }

    // Start transaction
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();

    try {
      // Insert flash deal
      const [result] = await connection.execute(`
        INSERT INTO flash_deals (name, description, discount_type, discount_value, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name, description, discount_type, discount_value, start_date, end_date]);

      const flashDealId = result.insertId;

      // GÜVENLİK: Insert products - Prepared statement ile güvenli bulk insert
      if (productIds.length > 0) {
        // Input validation - Sadece integer ID'lere izin ver
        const validProductIds = productIds
          .map(id => parseInt(id))
          .filter(id => !isNaN(id) && id > 0);
        
        if (validProductIds.length > 0) {
          const productValues = validProductIds.map((productId) => [flashDealId, productId]);
          // MySQL'in güvenli bulk insert yöntemi - VALUES ? kullanımı güvenli
          await connection.query(`
            INSERT INTO flash_deal_products (flash_deal_id, product_id)
            VALUES ?
          `, [productValues]);
        }
      }

      // GÜVENLİK: Insert categories - Prepared statement ile güvenli bulk insert
      if (categoryIds.length > 0) {
        // Input validation - Sadece integer ID'lere izin ver
        const validCategoryIds = categoryIds
          .map(id => parseInt(id))
          .filter(id => !isNaN(id) && id > 0);
        
        if (validCategoryIds.length > 0) {
          const categoryValues = validCategoryIds.map((categoryId) => [flashDealId, categoryId]);
          // MySQL'in güvenli bulk insert yöntemi - VALUES ? kullanımı güvenli
          await connection.query(`
            INSERT INTO flash_deal_categories (flash_deal_id, category_id)
            VALUES ?
          `, [categoryValues]);
        }
      }

      await connection.commit();
      console.log('⚡ Flash deal created with ID:', flashDealId);
      res.json({
        success: true,
        message: 'Flash indirim başarıyla oluşturuldu',
        data: { id: flashDealId }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error creating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error creating flash deal' });
  }
});

// Admin - Update flash deal
app.put('/api/admin/flash-deals/:id', authenticateAdmin, async (req, res) => {
  try {
    const flashDealId = req.params.id;
    const { name, description, discount_type, discount_value, start_date, end_date, is_active, product_ids, category_ids } = req.body;

    console.log('⚡ Updating flash deal:', flashDealId);

    // Start transaction
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();

    try {
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
      if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
      if (discount_type !== undefined) { updateFields.push('discount_type = ?'); updateValues.push(discount_type); }
      if (discount_value !== undefined) { updateFields.push('discount_value = ?'); updateValues.push(discount_value); }
      if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date); }
      if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date); }
      if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }

      if (updateFields.length > 0) {
        updateValues.push(flashDealId);
        const [result] = await connection.execute(`
          UPDATE flash_deals 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `, updateValues);

        if (result.affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Flash indirim bulunamadı'
          });
        }
      }

      // GÜVENLİK: Update products if provided - Input validation ile güvenli
      if (product_ids !== undefined) {
        await connection.execute('DELETE FROM flash_deal_products WHERE flash_deal_id = ?', [flashDealId]);
        const productIds = Array.isArray(product_ids) ? product_ids.filter(Boolean) : [];
        
        // Input validation - Sadece integer ID'lere izin ver
        const validProductIds = productIds
          .map(id => parseInt(id))
          .filter(id => !isNaN(id) && id > 0);
        
        console.log('📦 Güncellenecek ürünler:', validProductIds);
        if (validProductIds.length > 0) {
          const productValues = validProductIds.map((productId) => [flashDealId, productId]);
          // MySQL'in güvenli bulk insert yöntemi
          await connection.query(`
            INSERT INTO flash_deal_products (flash_deal_id, product_id)
            VALUES ?
          `, [productValues]);
          console.log('✅ Ürünler eklendi:', validProductIds.length);
        }
      }

      // GÜVENLİK: Update categories if provided - Input validation ile güvenli
      if (category_ids !== undefined) {
        await connection.execute('DELETE FROM flash_deal_categories WHERE flash_deal_id = ?', [flashDealId]);
        const categoryIds = Array.isArray(category_ids) ? category_ids.filter(Boolean) : [];
        
        // Input validation - Sadece integer ID'lere izin ver
        const validCategoryIds = categoryIds
          .map(id => parseInt(id))
          .filter(id => !isNaN(id) && id > 0);
        
        console.log('📁 Güncellenecek kategoriler:', validCategoryIds);
        if (validCategoryIds.length > 0) {
          const categoryValues = validCategoryIds.map((categoryId) => [flashDealId, categoryId]);
          // MySQL'in güvenli bulk insert yöntemi
          await connection.query(`
            INSERT INTO flash_deal_categories (flash_deal_id, category_id)
            VALUES ?
          `, [categoryValues]);
          console.log('✅ Kategoriler eklendi:', validCategoryIds.length);
        }
      }

      await connection.commit();
      console.log('⚡ Flash deal updated:', flashDealId);
      res.json({
        success: true,
        message: 'Flash indirim başarıyla güncellendi'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error updating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error updating flash deal' });
  }
});

// Admin - Delete flash deal
app.delete('/api/admin/flash-deals/:id', authenticateAdmin, async (req, res) => {
  try {
    const flashDealId = req.params.id;

    console.log('⚡ Deleting flash deal:', flashDealId);

    const [result] = await poolWrapper.execute(
      'DELETE FROM flash_deals WHERE id = ?',
      [flashDealId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flash indirim bulunamadı'
      });
    }

    console.log('⚡ Flash deal deleted:', flashDealId);
    res.json({
      success: true,
      message: 'Flash indirim başarıyla silindi'
    });
  } catch (error) {
    console.error('❌ Error deleting flash deal:', error);
    res.status(500).json({ success: false, message: 'Error deleting flash deal' });
  }
});

// Flash deals endpoint'i artık routes/flash-deals.js dosyasında tanımlı
// Bu endpoint kaldırıldı - çakışmayı önlemek için

// Product endpoints (with tenant authentication)
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const language = req.query.language || 'tr'; // Default to Turkish
    const tekstilOnly = req.query.tekstilOnly === 'true' || req.query.tekstilOnly === true; // Sadece kullanıcı panelinden true gelirse filtrele
    const nocache = req.query.nocache === 'true' || req.query.nocache === true || req.query.refresh === 'true' || req.query.refresh === true; // Cache bypass

    // Redis hot cache for list page 1 (most requested) - cache key'e tekstilOnly ekle
    // Cache bypass kontrolü: nocache veya refresh parametresi varsa cache'i atla
    if (page === 1 && !nocache) {
      try {
        if (global.redis) {
          const key = `products:list:${req.tenant.id}:p1:${limit}:${tekstilOnly ? 'tekstil' : 'all'}`;
          const cached = await global.redis.get(key);
          if (cached) {
            // Optimize: Client cache 30 → 60 saniye
            res.setHeader('Cache-Control', 'public, max-age=60');
            console.log(`✅ [GET /api/products] Cache hit - returning cached data (use ?nocache=true to bypass)`);
            return res.json({ success: true, data: JSON.parse(cached), cached: true, source: 'redis' });
          }
        }
      } catch (error) {
        console.warn('⚠️ [GET /api/products] Cache read error:', error.message);
      }
    }
    
    if (nocache) {
      console.log(`🔄 [GET /api/products] Cache bypassed - fetching fresh data from database`);
    }

    // Tekstil kategorileri (sadece tekstilOnly=true ise kullanılacak)
    const tekstilKategoriler = [
      'Tişört', 'Gömlek', 'Pantolon', 'Mont', 'Hırka', 'Polar Bere', 'Şapka',
      'Eşofman', 'Hoodie', 'Bandana', 'Aplike', 'Battaniye', 'Waistcoat',
      'Yağmurluk', 'Rüzgarlık'
      // Camp Ürünleri, Silah Aksesuarları ve Mutfak Ürünleri çıkarıldı - web sitesinde görünmeyecek
    ];

    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE tenantId = ?';
    let countParams = [req.tenant.id];
    
    let selectQuery = `SELECT id, name, price, image, brand, category, lastUpdated, rating, reviewCount, stock, sku
       FROM products
       WHERE tenantId = ?`;
    let selectParams = [req.tenant.id];

    // Sadece tekstilOnly=true ise filtrele
    if (tekstilOnly) {
      const kategoriConditions = tekstilKategoriler.map(() => 'category LIKE ?').join(' OR ');
      countQuery += ` AND (${kategoriConditions})`;
      selectQuery += ` AND (${kategoriConditions})`;
      
      tekstilKategoriler.forEach(kat => {
        countParams.push(`%${kat}%`);
        selectParams.push(`%${kat}%`);
      });
    }

    // Get total count
    const [countRows] = await poolWrapper.execute(countQuery, countParams);
    const total = countRows[0].total;

    // Get paginated products
    selectQuery += ' ORDER BY lastUpdated DESC LIMIT ? OFFSET ?';
    selectParams.push(limit, offset);
    const [rows] = await poolWrapper.execute(selectQuery, selectParams);

    // Clean HTML entities from all products
    const cleanedProducts = rows.map(cleanProductData);

    // Optimize: Client cache 60 → 120 saniye (2 dakika)
    res.setHeader('Cache-Control', 'public, max-age=120');
    // Compression için Vary header (compression middleware otomatik Content-Encoding ekler)
    res.setHeader('Vary', 'Accept-Encoding');
    
    // Response payload - sadece gerekli alanlar (gereksiz alanlar kaldırıldı)
    const payload = {
      products: cleanedProducts,
      total: total,
      hasMore: offset + limit < total
    };
    
    // Save to Redis (page 1 only) - Optimize: Cache TTL 300 → 600 (10 dakika)
    // Cache bypass kontrolü: nocache varsa cache'e yazma
    if (page === 1 && !nocache) {
      try { 
        if (global.redis) {
          // JSON string'i cache'le (compression middleware response'u otomatik sıkıştırır)
          const cachedPayload = JSON.stringify(payload);
          await global.redis.set(`products:list:${req.tenant.id}:p1:${limit}:${tekstilOnly ? 'tekstil' : 'all'}`, cachedPayload, 'EX', 600);
          console.log(`💾 [GET /api/products] Data cached for 10 minutes`);
        }
      } catch (error) {
        console.warn('⚠️ [GET /api/products] Cache write error:', error.message);
      }
    }
    
    console.log(`✅ [GET /api/products] Returning fresh data from database (page: ${page}, limit: ${limit}, total: ${total})`);
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, message: 'Error getting products' });
  }
});

// Ensure user_homepage_products table exists (idempotent)
async function ensureHomepageProductsTable() {
  try {
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS user_homepage_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        tenantId INT NOT NULL,
        payload JSON NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_tenant (userId, tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {
    console.error('❌ ensureHomepageProductsTable error:', e);
  }
}

// Called after DB initialization

// Build homepage payload for a user and persist
async function buildHomepagePayload(tenantId, userId) {
  // Popular by rating
  const [popularRows] = await poolWrapper.execute(
    `SELECT id, name, price, image, brand, category, rating, reviewCount, lastUpdated
     FROM products WHERE tenantId = ?
     ORDER BY rating DESC, reviewCount DESC, lastUpdated DESC
     LIMIT 6`,
    [tenantId]
  );
  // New by lastUpdated
  const [newRows] = await poolWrapper.execute(
    `SELECT id, name, price, image, brand, category, rating, reviewCount, lastUpdated
     FROM products WHERE tenantId = ?
     ORDER BY lastUpdated DESC
     LIMIT 6`,
    [tenantId]
  );
  // Polar featured sample
  const [polarRows] = await poolWrapper.execute(
    `SELECT id, name, price, image, brand, category, rating, reviewCount, lastUpdated
     FROM products WHERE tenantId = ? AND (
       category = 'Polar Bere' OR LOWER(name) LIKE '%polar%' OR LOWER(name) LIKE '%hırka%'
     )
     ORDER BY lastUpdated DESC
     LIMIT 6`,
    [tenantId]
  );
  const payload = {
    popular: popularRows || [],
    newProducts: newRows || [],
    polar: polarRows || [],
    generatedAt: new Date().toISOString()
  };
  // Upsert
  const [existing] = await poolWrapper.execute(
    'SELECT id FROM user_homepage_products WHERE userId = ? AND tenantId = ? LIMIT 1',
    [userId, tenantId]
  );
  if (existing && existing.length) {
    await poolWrapper.execute(
      'UPDATE user_homepage_products SET payload = ?, updatedAt = NOW() WHERE id = ?',
      [JSON.stringify(payload), existing[0].id]
    );
  } else {
    await poolWrapper.execute(
      'INSERT INTO user_homepage_products (userId, tenantId, payload) VALUES (?, ?, ?)',
      [userId, tenantId, JSON.stringify(payload)]
    );
  }
  return payload;
}

// Get homepage products for user (cached in DB)
app.get('/api/users/:userId/homepage-products', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant missing' });
    }

    // ✅ OPTIMIZASYON: Use getOrSet helper with SWR pattern
    const rkey = `homepage:${tenantId}:${userId}`;
    const payload = await getOrSet(rkey, CACHE_TTL.LONG, async () => {
      // TTL: 6 hours (DB fallback)
      const [rows] = await poolWrapper.execute(`SELECT payload, updatedAt FROM user_homepage_products WHERE userId = ? AND tenantId = ? LIMIT 1`, [userId, tenantId]);
      let data;
      if (rows && rows.length) {
        const updatedAt = new Date(rows[0].updatedAt).getTime();
        const fresh = Date.now() - updatedAt < 6 * 60 * 60 * 1000;
        if (fresh) {
          try { data = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload; } catch { data = rows[0].payload; }
        }
      }
      if (!data) {
        data = await buildHomepagePayload(tenantId, userId);
      }
      return data;
    }, { backgroundRefresh: true });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error('❌ Error getting homepage products:', error);
    return res.status(500).json({ success: false, message: 'Error getting homepage products' });
  }
});

// Account summary (My Account) - Redis hot cache per user
app.get('/api/users/:userId/account-summary', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant missing' });

    // ✅ OPTIMIZASYON: Use getOrSet helper for account summary
    const rkey = `account:summary:${tenantId}:${userId}`;
    const summary = await getOrSet(rkey, CACHE_TTL.SHORT, async () => {
      // Aggregate summary
      const [[user]] = await poolWrapper.execute('SELECT id, name, email, phone, createdAt FROM users WHERE id = ? AND tenantId = ? LIMIT 1', [userId, tenantId]);
      const [[wallet]] = await poolWrapper.execute('SELECT balance, currency FROM user_wallets WHERE userId = ? AND tenantId = ? LIMIT 1', [userId, tenantId]);
      const [[orders]] = await poolWrapper.execute('SELECT COUNT(*) as count FROM orders WHERE userId = ? AND tenantId = ?', [userId, tenantId]);
      const [[favorites]] = await poolWrapper.execute('SELECT COUNT(*) as count FROM user_favorites_v2 WHERE userId = ?', [userId]);

      return {
        user: user || null,
        wallet: wallet || { balance: 0, currency: 'TRY' },
        counts: {
          orders: orders?.count || 0,
          favorites: favorites?.count || 0
        },
        generatedAt: new Date().toISOString()
      };
    }, { backgroundRefresh: true });
    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('❌ Account summary error:', error);
    return res.status(500).json({ success: false, message: 'Error getting account summary' });
  }
});

app.get('/api/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    const search = String(q || '').trim();
    if (!search || search.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Çoklu kiracı desteği: varsa kimliği doğrulanmış tenant üzerinden filtrele
    // Not: Diğer uç noktalarda kullanılan tenant ara katmanı burada yoksa, tüm ürünlerde arama yapılır
    const tenantId = req.tenant?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    // Öncelik: FULLTEXT arama (varsa). Düşüş: LIKE + JOIN
    const whereTenant = tenantId ? ' AND p.tenantId = ?' : '';
    const booleanQuery = search
      .split(/\s+/)
      .filter(Boolean)
      .map(w => `${w}*`)
      .join(' ');

    let rows;
    try {
      const paramsFT = tenantId
        ? [booleanQuery, booleanQuery, tenantId, `%${search}%`, limit, offset]
        : [booleanQuery, booleanQuery, `%${search}%`, limit, offset];

      const [ftRows] = await poolWrapper.execute(
        `SELECT p.id, p.name, p.price, p.image, p.brand, p.category, p.lastUpdated,
                MATCH(p.name, p.description, p.brand, p.sku, p.externalId) AGAINST (? IN BOOLEAN MODE) AS score
         FROM products p
         LEFT JOIN product_variations v ON v.productId = p.id
         LEFT JOIN product_variation_options o ON o.variationId = v.id
         WHERE (
           MATCH(p.name, p.description, p.brand, p.sku, p.externalId) AGAINST (? IN BOOLEAN MODE)
           OR o.sku LIKE ?
         )${whereTenant}
         GROUP BY p.id
         ORDER BY score DESC, p.lastUpdated DESC
         LIMIT ? OFFSET ?`,
        paramsFT
      );
      rows = ftRows;
    } catch (e) {
      // FULLTEXT desteklenmiyorsa LIKE'a düş
      const paramsLike = tenantId
        ? [
          `%${search}%`, `%${search}%`, `%${search}%`, // name/brand/description
          `%${search}%`, // externalId
          `%${search}%`, // product sku
          `%${search}%`, // option sku
          tenantId,
          limit,
          offset,
        ]
        : [
          `%${search}%`, `%${search}%`, `%${search}%`,
          `%${search}%`,
          `%${search}%`,
          `%${search}%`,
          limit,
          offset,
        ];
      const [likeRows] = await poolWrapper.execute(
        `SELECT DISTINCT p.id, p.name, p.price, p.image, p.brand, p.category, p.lastUpdated
         FROM products p
         LEFT JOIN product_variations v ON v.productId = p.id
         LEFT JOIN product_variation_options o ON o.variationId = v.id
         WHERE (
           p.name LIKE ?
           OR p.brand LIKE ?
           OR p.description LIKE ?
           OR p.externalId LIKE ?
           OR p.sku LIKE ?
           OR o.sku LIKE ?
         )${whereTenant}
         ORDER BY p.lastUpdated DESC
         LIMIT ? OFFSET ?`,
        paramsLike
      );
      rows = likeRows;
    }

    const cleanedProducts = rows.map(cleanProductData);
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.json({ success: true, data: cleanedProducts, page, limit, count: cleanedProducts.length });
  } catch (error) {
    console.error('Error searching products:', error);
    return res.status(500).json({ success: false, message: 'Error searching products' });
  }
});

app.get('/api/products/price-range', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT MIN(price) as minPrice, MAX(price) as maxPrice FROM products WHERE tenantId = ?',
      [req.tenant.id]
    );

    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({
      success: true,
      data: {
        min: rows[0]?.minPrice || 0,
        max: rows[0]?.maxPrice || 0
      }
    });
  } catch (error) {
    console.error('Error getting price range:', error);
    res.status(500).json({ success: false, message: 'Error getting price range' });
  }
});

app.get('/api/products/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 40;
    const offset = (page - 1) * limit;

    const [countRows] = await poolWrapper.execute(
      'SELECT COUNT(*) as total FROM products WHERE tenantId = ? AND category = ?',
      [req.tenant.id, category]
    );
    const total = countRows[0].total;

    const [rows] = await poolWrapper.execute(
      `SELECT id, name, price, image, brand, category, lastUpdated, rating, reviewCount, stock, sku
       FROM products 
       WHERE tenantId = ? AND category = ?
       ORDER BY lastUpdated DESC
       LIMIT ? OFFSET ?`,
      [req.tenant.id, category, limit, offset]
    );

    // Clean HTML entities from category products
    const cleanedProducts = rows.map(cleanProductData);

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ success: true, data: { products: cleanedProducts, total, hasMore: offset + limit < total } });
  } catch (error) {
    console.error('Error getting products by category:', error);
    res.status(500).json({ success: false, message: 'Error getting products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);
    const tenantId = req.tenant?.id;
    const apiKey = req.headers['x-api-key'] || 'not-provided';
    
    console.log(`🔍 [GET /api/products/${id}] Request received:`, {
      numericId,
      tenantId: tenantId || 'missing',
      apiKey: apiKey.substring(0, 10) + '...',
      userAgent: req.headers['user-agent']?.substring(0, 50) || 'unknown',
      origin: req.headers.origin || 'unknown'
    });
    
    if (!Number.isInteger(numericId) || numericId <= 0) {
      console.log(`❌ [GET /api/products/${id}] Invalid product id: ${numericId}`);
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }
    
    // Tenant kontrolü - req.tenant middleware'den geliyor
    if (!req.tenant || !req.tenant.id) {
      // GÜVENLİK: API key logging - Production'da API key loglanmaz
      const maskedKey = apiKey ? `${apiKey.substring(0, 4)}***${apiKey.substring(apiKey.length - 4)}` : 'N/A';
      if (process.env.NODE_ENV !== 'production') {
        console.log(`❌ [GET /api/products/${id}] Tenant authentication required - API Key: ${maskedKey}`);
      } else {
        console.log(`❌ [GET /api/products/${id}] Tenant authentication required`);
      }
      return res.status(401).json({ success: false, message: 'Tenant authentication required' });
    }
    
    // Optimize: Sadece gerekli column'lar - Public API için
    // isActive kolonu products tablosunda olmayabilir, bu yüzden seçmiyoruz
    // Eğer isActive kolonu varsa ve pasifse, WHERE clause'da filtreleyebiliriz ama şimdilik tüm ürünleri gösteriyoruz
    const [rows] = await poolWrapper.execute(
      'SELECT id, name, price, image, images, brand, category, description, stock, sku, rating, reviewCount, lastUpdated FROM products WHERE id = ? AND tenantId = ?',
      [numericId, req.tenant.id]
    );

    console.log(`🔍 [GET /api/products/${id}] Query result: ${rows.length} row(s) found (productId: ${numericId}, tenantId: ${req.tenant.id})`);

    if (rows.length > 0) {
      const product = rows[0];
      console.log(`🔍 [GET /api/products/${id}] Product found: ${product.name}`);
      
      // Clean HTML entities from single product
      const cleanedProduct = cleanProductData(product);
      
      // Tek ürün detayı için compression header'ını temizle (küçük response için gereksiz)
      // Compression middleware zaten filter'da devre dışı bırakıldı, ama emin olmak için
      res.setHeader('Content-Encoding', 'identity');
      
      console.log(`✅ [GET /api/products/${id}] Product returned successfully: ${cleanedProduct.name}`);
      res.json({ success: true, data: cleanedProduct });
    } else {
      // Debug: Ürünün var olup olmadığını ve hangi tenantId'ye ait olduğunu kontrol et
      const [debugRows] = await poolWrapper.execute(
        'SELECT id, name, tenantId FROM products WHERE id = ?',
        [numericId]
      );
      
      if (debugRows.length > 0) {
        const debugProduct = debugRows[0];
        console.log(`⚠️ [GET /api/products/${id}] Product exists but belongs to different tenant:`, {
          productId: debugProduct.id,
          productName: debugProduct.name,
          productTenantId: debugProduct.tenantId,
          requestedTenantId: req.tenant.id,
          tenantMismatch: debugProduct.tenantId !== req.tenant.id
        });
        res.status(404).json({ 
          success: false, 
          message: 'Product not found',
          error: 'PRODUCT_TENANT_MISMATCH',
          debug: process.env.NODE_ENV === 'development' ? {
            productExists: true,
            productTenantId: debugProduct.tenantId,
            requestedTenantId: req.tenant.id,
            tenantMismatch: true
          } : undefined
        });
      } else {
        console.log(`❌ [GET /api/products/${id}] Product not found in database (id: ${numericId}, tenantId: ${req.tenant.id})`);
        // Tüm tenant'larda ürün var mı kontrol et
        const [allTenantsCheck] = await poolWrapper.execute(
          'SELECT id, name, tenantId FROM products WHERE id = ?',
          [numericId]
        );
        if (allTenantsCheck.length > 0) {
          console.log(`⚠️ [GET /api/products/${id}] Product exists in other tenants:`, allTenantsCheck.map(p => ({ id: p.id, tenantId: p.tenantId })));
        }
        res.status(404).json({ 
          success: false, 
          message: 'Product not found',
          error: 'PRODUCT_NOT_FOUND'
        });
      }
    }
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'GET_PRODUCT');
    
    // GÜVENLİK: Production'da stack trace ve detaylı error bilgileri loglanmaz
    if (process.env.NODE_ENV !== 'production') {
      console.error(`❌ [GET /api/products/${req.params.id}] Error getting product:`, error);
      console.error(`❌ [GET /api/products/${req.params.id}] Error stack:`, error.stack);
      console.error(`❌ [GET /api/products/${req.params.id}] Error details:`, {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
    }
    
    const errorResponse = createSafeErrorResponse(error, 'Error getting product');
    res.status(500).json(errorResponse);
  }
});

// Product Variations Endpoints
app.get('/api/products/:productId/variations', async (req, res) => {
  try {
    const { productId } = req.params;
    const numericId = Number(productId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }

    // Tenant kontrolü
    if (!req.tenant || !req.tenant.id) {
      console.error(`❌ Product ${numericId}: Tenant not found in request`);
      return res.status(401).json({ success: false, message: 'Tenant authentication required' });
    }

    const tenantId = req.tenant.id;

    // Önce ürünün variationDetails JSON'ını çek
    const [productRows] = await poolWrapper.execute(`
      SELECT variationDetails FROM products 
      WHERE id = ? AND tenantId = ?
    `, [numericId, tenantId]);

    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = productRows[0];
    let xmlVariations = [];

    // variationDetails JSON'ını parse et
    if (product.variationDetails) {
      try {
        const variationDetails = typeof product.variationDetails === 'string'
          ? JSON.parse(product.variationDetails)
          : product.variationDetails;

        if (Array.isArray(variationDetails)) {
          xmlVariations = variationDetails;
          console.log(`📦 Product ${numericId}: variationDetails'ten ${xmlVariations.length} varyasyon parse edildi`);
        } else {
          console.log(`⚠️ Product ${numericId}: variationDetails array değil, type: ${typeof variationDetails}`);
        }
      } catch (parseError) {
        console.error(`❌ Product ${numericId}: variationDetails parse hatası:`, parseError);
      }
    } else {
      console.log(`⚠️ Product ${numericId}: variationDetails boş/null - XML'den türetme yapılamaz`);
    }

    // Varyasyonları ve seçeneklerini birlikte çek
    const [variations] = await poolWrapper.execute(`
      SELECT v.*, 
             COALESCE(
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', o.id,
                   'variationId', o.variationId,
                   'value', o.value,
                   'priceModifier', o.priceModifier,
                   'stock', o.stock,
                   'sku', o.sku,
                   'image', o.image,
                   'isActive', o.isActive
                 )
               ),
               JSON_ARRAY()
             ) as options
      FROM product_variations v
      LEFT JOIN product_variation_options o ON v.id = o.variationId AND o.isActive = true
      WHERE v.productId = ? AND v.tenantId = ?
      GROUP BY v.id
      ORDER BY v.displayOrder, v.name
    `, [numericId, tenantId]);

    // variations null/undefined kontrolü ve JSON parse
    let formattedVariations = [];
    if (!variations || !Array.isArray(variations)) {
      console.warn(`⚠️ Product ${numericId}: variations is not an array, using empty array`);
    } else {
      // JSON formatını düzelt ve normalize et
      formattedVariations = variations.map(variation => {
        // Varyasyon ismini normalize et (trim, boşlukları temizle)
        const normalizedName = variation.name ? String(variation.name).trim() : '';
        
        // Options null kontrolü ve JSON parse
        let parsedOptions = [];
        if (variation.options) {
          try {
            if (typeof variation.options === 'string') {
              parsedOptions = JSON.parse(variation.options);
            } else if (Array.isArray(variation.options)) {
              parsedOptions = variation.options;
            }
          } catch (parseError) {
            console.error(`⚠️ Product ${numericId}: Options parse error for variation ${variation.id}:`, parseError);
            parsedOptions = [];
          }
        }
        
        // Debug: Çok fazla option varsa uyarı ver
        if (parsedOptions.length > 50) {
          console.warn(`⚠️ Product ${numericId}: "${normalizedName}" varyasyonunda ${parsedOptions.length} option var (normal: 5-20). İlk 5 option:`, 
            parsedOptions.slice(0, 5).map((o) => ({ value: o.value, stock: o.stock })));
        }
        
        return {
          id: variation.id,
          productId: variation.productId,
          name: normalizedName,
          displayOrder: variation.displayOrder,
          options: Array.isArray(parsedOptions) ? parsedOptions : []
        };
      });
    }

    // XML'den varyasyon türetme mantığı - her zaman çalışsın (tabloda yoksa veya options boşsa)
    const hasValidVariations = formattedVariations.length > 0 && 
                               formattedVariations.some(v => v.options && v.options.length > 0);
    
    if (xmlVariations.length > 0) {
      // Eğer tabloda geçerli varyasyon yoksa veya XML'de daha fazla bilgi varsa, XML'den türet
      if (!hasValidVariations || xmlVariations.length > 0) {
        console.log(`📦 XML'den varyasyonlar türetiliyor (tabloda: ${formattedVariations.length}, XML'de: ${xmlVariations.length} varyasyon)...`);
        
        // variationDetails'tan varyasyonları grupla
        const variationMap = new Map(); // variationName -> options[]
        
        xmlVariations.forEach(variation => {
          try {
            // Attributes kontrolü - null, undefined veya boş objeleri atla
            if (!variation.attributes || typeof variation.attributes !== 'object') {
              return;
            }

            // Stok bilgisi kontrolü - stok yoksa veya 0 ise yine de ekle (stok 0 olabilir)
            const stock = parseInt(variation.stok) || 0;
            
            // Her attribute için varyasyon oluştur
            Object.keys(variation.attributes).forEach(attrName => {
              const rawAttrValue = variation.attributes[attrName];
              
              // Değer kontrolü - null, undefined, boş string kontrolü
              if (rawAttrValue === null || rawAttrValue === undefined) {
                return;
              }
              
              const attrValue = String(rawAttrValue).trim();
              if (!attrValue) {
                return;
              }
              
              // Varyasyon ismini normalize et
              const normalizedAttrName = String(attrName).trim();
              
              if (!variationMap.has(normalizedAttrName)) {
                variationMap.set(normalizedAttrName, new Map()); // value -> option
              }
              
              const optionsMap = variationMap.get(normalizedAttrName);
              if (!optionsMap.has(attrValue)) {
                // Aynı değere sahip varyasyonları birleştir (stokları topla)
                optionsMap.set(attrValue, {
                  id: `${numericId}-${normalizedAttrName}-${attrValue}`,
                  variationId: `${numericId}-${normalizedAttrName}`,
                  value: attrValue,
                  priceModifier: variation.fiyat || variation.priceModifier || 0,
                  stock: 0,
                  sku: variation.stokKodu || variation.sku || '',
                  image: null,
                  isActive: true
                });
              }
              
              // Stokları topla
              const option = optionsMap.get(attrValue);
              option.stock = (option.stock || 0) + stock;
              
              // Fiyat en düşük olanı kullan (indirimli fiyat varsa)
              if (variation.fiyat && variation.fiyat < option.priceModifier) {
                option.priceModifier = variation.fiyat;
              }
            });
          } catch (variationError) {
            console.error(`⚠️ Varyasyon parse hatası (Product ID: ${numericId}):`, variationError, 'Variation:', JSON.stringify(variation));
            // Hata olsa bile devam et
          }
        });
        
        // Map'ten array formatına dönüştür
        const xmlDerivedVariations = [];
        let displayOrder = 0;
        variationMap.forEach((optionsMap, variationName) => {
          const options = Array.from(optionsMap.values());
          // En az 1 option varsa ekle
          if (options.length > 0) {
            xmlDerivedVariations.push({
              id: `${numericId}-${variationName}`,
              productId: numericId,
              name: variationName,
              displayOrder: displayOrder++,
              options: options
            });
          }
        });
        
        // Eğer tabloda geçerli varyasyon yoksa, XML'den türetilenleri kullan
        if (!hasValidVariations) {
          formattedVariations = xmlDerivedVariations;
          console.log(`✅ ${formattedVariations.length} varyasyon variationDetails'tan türetildi (tabloda yoktu)`);
        } else {
          // Tabloda varyasyon var ama XML'de daha fazla bilgi varsa, birleştir
          // Öncelik tabloda olanlara verilir, XML'den gelenler sadece eksikleri tamamlar
          const existingVariationNames = new Set(formattedVariations.map(v => v.name.toLowerCase()));
          xmlDerivedVariations.forEach(xmlVar => {
            if (!existingVariationNames.has(xmlVar.name.toLowerCase())) {
              formattedVariations.push(xmlVar);
            }
          });
          console.log(`✅ XML'den ${xmlDerivedVariations.length} varyasyon türetildi, toplam ${formattedVariations.length} varyasyon`);
        }
      }
    }

    // Beden algılama helper fonksiyonu
    const isSizeVariation = (name) => {
      if (!name || typeof name !== 'string') return false;
      const normalizedName = name.toLowerCase().trim();
      const sizeKeywords = ['beden', 'size', 'numara', 'ölçü', 'boyut', 'bedenler', 'sizes'];
      return sizeKeywords.some(keyword => normalizedName.includes(keyword));
    };

    // Varyasyon isimlerini normalize et ve beden varyasyonlarını işaretle
    formattedVariations = formattedVariations.map(variation => ({
      ...variation,
      name: variation.name ? String(variation.name).trim() : '',
      isSizeVariation: isSizeVariation(variation.name)
    }));

    // XML varyasyonlarından beden stoklarını çıkar (geriye dönük uyumluluk için)
    const sizeStocks = {};
    xmlVariations.forEach(variation => {
      try {
        if (variation.attributes && variation.stok !== undefined) {
          const attributes = variation.attributes;
          if (attributes && typeof attributes === 'object') {
            // Beden bilgisini bul - daha kapsamlı pattern
            const sizeKeys = Object.keys(attributes).filter(key => {
              if (!key || typeof key !== 'string') return false;
              const normalizedKey = key.toLowerCase().trim();
              const sizeKeywords = ['beden', 'size', 'numara', 'ölçü', 'boyut', 'bedenler', 'sizes'];
              return sizeKeywords.some(keyword => normalizedKey.includes(keyword));
            });

            if (sizeKeys.length > 0) {
              const size = attributes[sizeKeys[0]];
              if (size && typeof size === 'string') {
                const normalizedSize = size.trim();
                if (normalizedSize) {
                  // Aynı beden için stokları topla
                  if (!sizeStocks[normalizedSize]) {
                    sizeStocks[normalizedSize] = 0;
                  }
                  sizeStocks[normalizedSize] += parseInt(variation.stok) || 0;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`⚠️ Beden stok parse hatası (Product ID: ${numericId}):`, error);
      }
    });

    // Debug logları
    console.log(`📦 Product ${numericId} variations endpoint:`);
    console.log(`  - XML variations: ${xmlVariations.length}`);
    console.log(`  - Formatted variations: ${formattedVariations.length}`);
    console.log(`  - Size stocks: ${Object.keys(sizeStocks).length} beden`);
    
    formattedVariations.forEach(v => {
      const sizeCount = v.isSizeVariation ? '✅ BEDEN' : '';
      console.log(`  - Variation: "${v.name}" (${v.options?.length || 0} options) ${sizeCount}`);
    });

    res.json({
      success: true,
      data: {
        variations: formattedVariations,
        sizeStocks: sizeStocks // XML'den çekilen beden stokları (geriye dönük uyumluluk)
      }
    });
  } catch (error) {
    // GÜVENLİK: Error information disclosure - Production'da detaylı error mesajları gizlenir
    logError(error, 'GET_PRODUCT_VARIATIONS');
    
    // GÜVENLİK: Production'da sensitive data loglanmaz
    if (process.env.NODE_ENV !== 'production') {
      console.error(`❌ Error fetching product variations for product ${req.params.productId}:`, error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage
      });
    }
    
    const errorResponse = createSafeErrorResponse(error, 'Error fetching product variations');
    res.status(500).json(errorResponse);
  }
});

app.get('/api/variations/:variationId/options', async (req, res) => {
  try {
    const { variationId } = req.params;
    const numericId = Number(variationId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid variation id' });
    }
    const [rows] = await poolWrapper.execute('SELECT * FROM product_variation_options WHERE variationId = ?', [numericId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching variation options:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/variation-options/:optionId', async (req, res) => {
  try {
    const { optionId } = req.params;
    const numericId = Number(optionId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid option id' });
    }
    const [rows] = await poolWrapper.execute('SELECT * FROM product_variation_options WHERE id = ?', [numericId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Variation option not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching variation option:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/products/filter', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, brand, search, tekstilOnly } = req.body;

    // Optimize: Sadece gerekli column'lar
    let query = 'SELECT id, name, price, image, brand, category, stock, sku, rating, reviewCount FROM products WHERE tenantId = ?';
    const params = [req.tenant.id];

    // Tekstil ürünleri için kategori filtreleme (sadece eksplisit olarak tekstilOnly=true ise)
    // Varsayılan olarak false - yani tüm ürünler gelir
    if (tekstilOnly === true || tekstilOnly === 'true') {
      const tekstilKategoriler = [
        'Tişört', 'Gömlek', 'Pantolon', 'Mont', 'Hırka', 'Polar Bere', 'Şapka',
        'Eşofman', 'Hoodie', 'Bandana', 'Aplike', 'Battaniye', 'Waistcoat',
        'Yağmurluk', 'Rüzgarlık'
        // Camp Ürünleri, Silah Aksesuarları ve Mutfak Ürünleri çıkarıldı - web sitesinde görünmeyecek
      ];
      const kategoriConditions = tekstilKategoriler.map(() => 'category LIKE ?').join(' OR ');
      query += ` AND (${kategoriConditions})`;
      tekstilKategoriler.forEach(kat => {
        params.push(`%${kat}%`);
      });
    }

    if (category) {
      query += ' AND category = ?';
      params.push(String(category));
    }

    if (minPrice !== undefined) {
      query += ' AND price >= ?';
      params.push(Number(minPrice));
    }

    if (maxPrice !== undefined) {
      query += ' AND price <= ?';
      params.push(Number(maxPrice));
    }

    if (brand) {
      query += ' AND brand = ?';
      params.push(String(brand));
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const s = String(search).slice(0, 100);
      params.push(`%${s}%`, `%${s}%`);
    }

    query += ' ORDER BY lastUpdated DESC';

    const [rows] = await poolWrapper.execute(query, params);

    // Clean HTML entities from filtered products
    const cleanedProducts = rows.map(cleanProductData);

    res.json({ success: true, data: cleanedProducts });
  } catch (error) {
    console.error('❌ Error filtering products:', error);
    res.status(500).json({ success: false, message: 'Error filtering products' });
  }
});

app.put('/api/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    await poolWrapper.execute(
      'UPDATE products SET stock = ? WHERE id = ?',
      [quantity, id]
    );

    res.json({ success: true, message: 'Product stock updated' });
  } catch (error) {
    console.error('❌ Error updating product stock:', error);
    res.status(500).json({ success: false, message: 'Error updating product stock' });
  }
});

// Admin Reviews endpoints
app.get('/api/admin/reviews', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const page = parseInt(req.query.page || '1') || 1;
    const limit = parseInt(req.query.limit || '50') || 50;
    const offset = (page - 1) * limit;

    // Tüm yorumları getir (ürün ve kullanıcı bilgileriyle birlikte)
    const [reviews] = await poolWrapper.execute(
      `SELECT r.id, r.productId, r.userId, r.userName, r.rating, r.comment, r.createdAt,
              COALESCE(r.status, 'approved') as status,
              p.name as productName, p.image as productImage,
              u.email as userEmail, u.phone as userPhone
       FROM reviews r
       LEFT JOIN products p ON r.productId = p.id AND r.tenantId = p.tenantId
       LEFT JOIN users u ON r.userId = u.id AND r.tenantId = u.tenantId
       WHERE r.tenantId = ?
       ORDER BY r.createdAt DESC
       LIMIT ? OFFSET ?`,
      [tenantId, limit, offset]
    );

    // Toplam yorum sayısı
    const [countResult] = await poolWrapper.execute(
      `SELECT COUNT(*) as total FROM reviews WHERE tenantId = ?`,
      [tenantId]
    );
    const total = countResult[0]?.total || 0;

    // Her yorum için medya dosyalarını getir
    for (const review of reviews) {
      const [media] = await poolWrapper.execute(
        `SELECT id, mediaType, mediaUrl, thumbnailUrl, displayOrder
         FROM review_media 
         WHERE reviewId = ? AND tenantId = ?
         ORDER BY displayOrder ASC`,
        [review.id, tenantId]
      );
      review.media = media || [];
    }

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error getting admin reviews:', error);
    res.status(500).json({ success: false, message: 'Error getting reviews' });
  }
});

app.put('/api/admin/reviews/:reviewId/status', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;
    const tenantId = req.tenant?.id || 1;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected'
      });
    }

    // Status sütunu yoksa ekle (ALTER TABLE IF NOT EXISTS çalışmaz, try-catch kullan)
    try {
      await poolWrapper.execute(
        `UPDATE reviews SET status = ? WHERE id = ? AND tenantId = ?`,
        [status, reviewId, tenantId]
      );
    } catch (error) {
      // Eğer status sütunu yoksa, ekle
      if (error.code === 'ER_BAD_FIELD_ERROR' || (error.message && error.message.includes('status'))) {
        await poolWrapper.execute(
          `ALTER TABLE reviews ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'`
        );
        // Tekrar dene
        await poolWrapper.execute(
          `UPDATE reviews SET status = ? WHERE id = ? AND tenantId = ?`,
          [status, reviewId, tenantId]
        );
      } else {
        throw error;
      }
    }

    res.json({
      success: true,
      message: 'Review status updated'
    });
  } catch (error) {
    console.error('❌ Error updating review status:', error);
    res.status(500).json({ success: false, message: 'Error updating review status' });
  }
});

app.delete('/api/admin/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const tenantId = req.tenant?.id || 1;

    // Review'ı sil (CASCADE ile medya dosyaları da silinir)
    await poolWrapper.execute(
      `DELETE FROM reviews WHERE id = ? AND tenantId = ?`,
      [reviewId, tenantId]
    );

    res.json({
      success: true,
      message: 'Review deleted'
    });
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Error deleting review' });
  }
});

// Reviews endpoints
app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const [rows] = await poolWrapper.execute(
      `SELECT r.*, u.name as userName 
       FROM reviews r 
       JOIN users u ON r.userId = u.id 
       WHERE r.productId = ? 
       ORDER BY r.createdAt DESC`,
      [productId]
    );

    // Her yorum için medya dosyalarını getir
    for (const review of rows) {
      const [media] = await poolWrapper.execute(
        `SELECT id, mediaType, mediaUrl, thumbnailUrl, fileSize, mimeType, displayOrder
         FROM review_media 
         WHERE reviewId = ? 
         ORDER BY displayOrder ASC`,
        [review.id]
      );
      review.media = media;
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting product reviews:', error);
    res.status(500).json({ success: false, message: 'Error getting product reviews' });
  }
});

// GÜVENLİK: Dosya yükleme endpoint'i - Magic bytes kontrolü ile güvenli
app.post('/api/reviews/upload', upload.array('media', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dosya yüklenmedi'
      });
    }

    // GÜVENLİK: Her dosya için kapsamlı validasyon
    const validatedFiles = [];
    const errors = [];

    for (const file of req.files) {
      const filePath = path.join(uploadsDir, file.filename);
      
      // Dosya yükleme validasyonu (magic bytes dahil)
      const validation = validateFileUpload(file, filePath);
      
      if (!validation.valid) {
        // Geçersiz dosyayı sil
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (deleteError) {
          console.error('❌ Error deleting invalid file:', deleteError);
        }
        
        errors.push({
          filename: file.originalname,
          errors: validation.errors
        });
        continue;
      }

      // Dosya başarıyla validasyon geçti
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const mediaUrl = `${baseUrl}/uploads/reviews/${file.filename}`;
      
      validatedFiles.push({
        mediaType: file.mimetype.startsWith('image/') ? 'image' : 'video',
        mediaUrl: mediaUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        filename: file.filename,
        originalName: file.originalname
      });
    }

    // Eğer hiç geçerli dosya yoksa hata döndür
    if (validatedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli dosya yüklenemedi',
        errors: errors
      });
    }

    // Kısmen başarılı durum (bazı dosyalar geçersiz)
    if (errors.length > 0) {
      return res.status(207).json({
        success: true,
        data: validatedFiles,
        message: `${validatedFiles.length} dosya başarıyla yüklendi, ${errors.length} dosya reddedildi`,
        errors: errors
      });
    }

    // Tüm dosyalar başarıyla yüklendi
    res.json({
      success: true,
      data: validatedFiles,
      message: 'Dosyalar başarıyla yüklendi'
    });
  } catch (error) {
    console.error('❌ Error uploading files:', error);
    res.status(500).json({ 
      success: false, 
      message: process.env.NODE_ENV === 'production' 
        ? 'Dosya yükleme hatası' 
        : error.message
    });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { productId, userId, userName, rating, comment, tenantId, media } = req.body;

    // Validate required fields
    if (!productId || !userId || !userName || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: productId, userId, userName, rating'
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Get tenantId from request or use default
    const finalTenantId = tenantId || 1;

    // Check if user already reviewed this product
    const [existingReview] = await poolWrapper.execute(
      'SELECT id FROM reviews WHERE productId = ? AND userId = ? AND tenantId = ?',
      [productId, userId, finalTenantId]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Insert new review
    const [result] = await poolWrapper.execute(
      'INSERT INTO reviews (tenantId, productId, userId, userName, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
      [finalTenantId, productId, userId, userName, rating, comment || '']
    );

    const reviewId = result.insertId;

    // Eğer medya dosyaları varsa, review_media tablosuna ekle
    if (media && Array.isArray(media) && media.length > 0) {
      for (let i = 0; i < media.length; i++) {
        const mediaItem = media[i];
        await poolWrapper.execute(
          `INSERT INTO review_media (tenantId, reviewId, mediaType, mediaUrl, thumbnailUrl, fileSize, mimeType, displayOrder)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            finalTenantId,
            reviewId,
            mediaItem.mediaType || (mediaItem.mediaUrl.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'image'),
            mediaItem.mediaUrl,
            mediaItem.thumbnailUrl || null,
            mediaItem.fileSize || null,
            mediaItem.mimeType || null,
            i
          ]
        );
      }
    }

    // Update product rating and review count
    const [reviewStats] = await poolWrapper.execute(
      `SELECT AVG(rating) as avgRating, COUNT(*) as reviewCount 
       FROM reviews 
       WHERE productId = ? AND tenantId = ?`,
      [productId, finalTenantId]
    );

    if (reviewStats.length > 0) {
      const { avgRating, reviewCount } = reviewStats[0];
      await poolWrapper.execute(
        'UPDATE products SET rating = ?, reviewCount = ? WHERE id = ? AND tenantId = ?',
        [parseFloat(avgRating.toFixed(2)), reviewCount, productId, finalTenantId]
      );
    }

    res.json({
      success: true,
      data: { reviewId: reviewId },
      message: 'Review added successfully'
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    res.status(500).json({ success: false, message: 'Error creating review' });
  }
});

// Cache for categories
let categoriesCache = null;
let categoriesCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Category and brand endpoints
app.get('/api/categories', async (req, res) => {
  try {
    // ✅ OPTIMIZASYON: Use getJson helper
    const cached = await getJson(`categories:${req.tenant.id}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true, source: 'redis' });
    }
    // Check cache
    const now = Date.now();
    if (categoriesCache && (now - categoriesCacheTime) < CACHE_DURATION) {
      console.log('📋 Categories served from cache');
      return res.json({
        success: true,
        data: categoriesCache,
        cached: true
      });
    }

    // Kategorileri veritabanından çek
    const [rows] = await poolWrapper.execute(`
      SELECT c.*, COUNT(p.id) as productCount 
      FROM categories c 
      LEFT JOIN products p ON p.category = c.name AND p.tenantId = c.tenantId 
      WHERE c.isActive = true AND c.tenantId = ?
      GROUP BY c.id 
      ORDER BY c.name ASC
    `, [req.tenant.id]);

    // Sadece kategori isimlerini döndür (string array)
    const categoryNames = rows.map(row => row.name).filter(name => name && typeof name === 'string');

    // Update in-memory cache
    categoriesCache = categoryNames;
    categoriesCacheTime = now;
    console.log('📋 Categories cached for 5 minutes');
    // ✅ OPTIMIZASYON: Use setJsonEx helper with CACHE_TTL
    await setJsonEx(`categories:${req.tenant.id}`, CACHE_TTL.MEDIUM, categoryNames);

    res.json({ success: true, data: categoryNames });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: 'Error getting categories' });
  }
});

// Kategori ağacını getir
app.get('/api/categories/tree', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(`
      SELECT c.*, COUNT(p.id) as productCount 
      FROM categories c 
      LEFT JOIN products p ON p.category = c.name AND p.tenantId = c.tenantId 
      WHERE c.isActive = true AND c.tenantId = ?
      GROUP BY c.id 
      ORDER BY c.categoryTree ASC
    `, [req.tenant.id]);

    // Kategori ağacını oluştur
    const categoryTree = this.buildCategoryTree(rows);

    res.json({ success: true, data: categoryTree });
  } catch (error) {
    console.error('Error getting category tree:', error);
    res.status(500).json({ success: false, message: 'Error getting category tree' });
  }
});

// Kategori ağacını oluştur
function buildCategoryTree(categories) {
  const tree = {};

  categories.forEach(category => {
    const parts = category.categoryTree ? category.categoryTree.split('/').filter(p => p.trim()) : [category.name];

    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!current[part]) {
        current[part] = {
          name: part,
          children: {},
          categories: [],
          productCount: 0
        };
      }

      if (i === parts.length - 1) {
        // Son seviye - kategoriyi ekle
        current[part].categories.push(category);
        current[part].productCount += category.productCount || 0;
      }

      current = current[part].children;
    }
  });

  return tree;
}

app.get('/api/brands', async (req, res) => {
  try {
    // ✅ OPTIMIZASYON: Use getJson helper
    const cached = await getJson(`brands:${req.tenant.id}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true, source: 'redis' });
    }
    const [rows] = await poolWrapper.execute(
      'SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != ""'
    );
    const brands = rows.map(row => row.brand).sort();
    // ✅ OPTIMIZASYON: Use setJsonEx helper with CACHE_TTL
    await setJsonEx(`brands:${req.tenant.id}`, CACHE_TTL.MEDIUM, brands);
    res.json({ success: true, data: brands });
  } catch (error) {
    console.error('Error getting brands:', error);
    res.status(500).json({ success: false, message: 'Error getting brands' });
  }
});

// XML Sync endpoints
app.post('/api/sync/trigger', async (req, res) => {
  if (!xmlSyncService) {
    return res.status(503).json({
      success: false,
      message: 'XML Sync Service not available'
    });
  }

  try {
    await xmlSyncService.triggerManualSync();
    res.json({
      success: true,
      message: 'Manual sync triggered successfully'
    });
  } catch (error) {
    console.error('❌ Error triggering manual sync:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering manual sync'
    });
  }
});

app.get('/api/sync/status', (req, res) => {
  if (!xmlSyncService) {
    return res.status(503).json({
      success: false,
      message: 'XML Sync Service not available'
    });
  }

  const status = xmlSyncService.getSyncStatus();
  res.json({ success: true, data: status });
});

// XML Test endpoint
app.get('/api/sync/test', async (req, res) => {
  if (!xmlSyncService) {
    return res.status(503).json({
      success: false,
      message: 'XML Sync Service not available'
    });
  }

  try {
    const products = await xmlSyncService.testXmlParsing();
    res.json({
      success: true,
      message: 'XML parsing test completed successfully',
      data: {
        productCount: products.length,
        products: products
      }
    });
  } catch (error) {
    console.error('❌ Error testing XML parsing:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing XML parsing',
      error: error.message
    });
  }
});

// XML içeriğini doğrudan POST gövdesinden alarak senkronize et
app.post('/api/sync/import-xml', async (req, res) => {
  try {
    if (!xmlSyncService) {
      return res.status(503).json({ success: false, message: 'XML Sync Service not available' });
    }

    const contentType = (req.headers['content-type'] || '').toLowerCase();
    const isXml = contentType.includes('xml');
    const rawBody = typeof req.body === 'string' ? req.body : '';

    if (!isXml || !rawBody) {
      return res.status(400).json({ success: false, message: 'Lütfen Content-Type: text/xml veya application/xml ve geçerli XML gövde gönderin.' });
    }

    const xml2js = require('xml2js');
    const parser = new xml2js.Parser({ 
      explicitArray: false, 
      ignoreAttrs: false, // ✅ Attribute'leri koru (Tanim, Deger gibi)
      attrkey: '$', // Attribute'leri $ objesine koy
      charkey: '_', // Text içeriği _ property'sine koy
      trim: true 
    });
    const parsed = await parser.parseStringPromise(rawBody);

    const source = xmlSyncService.getXmlSources()[0] || { name: 'Manual', type: 'ticimax' };
    const products = xmlSyncService.parseXmlToProducts(parsed, source) || [];

    // Kategorileri çıkar ve upsert et
    const categories = xmlSyncService.extractCategoriesFromProducts(products);
    const tenantId = (req.tenant && req.tenant.id) ? req.tenant.id : 1;
    await xmlSyncService.upsertCategories(categories, tenantId);

    let newCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const p of products) {
      const ok = await xmlSyncService.upsertProduct(p, tenantId);
      if (ok) {
        // upsertProduct istatistikleri xmlSyncService.syncStats üzerinde tutuluyor
        // Burada kaba bir tahminle sayacağız; gerçek dağılım loglarda mevcut
        if (p && p.externalId) {
          // Dışarıya sadece toplamları raporlamak yeterli
        }
      } else {
        errorCount++;
      }
    }

    // İstatistikleri servis içinden çek (daha doğru sayımlar için)
    const stats = xmlSyncService.getSyncStatus().stats || {};
    newCount = stats.newProducts || 0;
    updatedCount = stats.updatedProducts || 0;
    if (errorCount === 0) errorCount = stats.errors || 0;

    return res.json({
      success: true,
      message: 'XML import tamamlandı',
      data: {
        receivedProducts: products.length,
        categories: categories.length,
        newProducts: newCount,
        updatedProducts: updatedCount,
        errors: errorCount
      }
    });
  } catch (e) {
    console.error('❌ Error importing XML:', e.message);
    return res.status(500).json({ success: false, message: 'XML import hatası: ' + e.message });
  }
});

// Start server
async function startServer() {
  await initializeDatabase();
  // ✅ OPTIMIZASYON: Initialize Redis with retry and reconnection
  let redisRetries = 0;
  const maxRedisRetries = 3;
  const redisRetryDelay = 2000;
  
  async function connectRedis() {
    try {
      const Redis = require('ioredis');
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // ✅ OPTIMIZASYON: Enhanced Redis client configuration with ioredis
      const client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        retryStrategy: (times) => {
          if (times > 10) {
            console.error('❌ Redis: Max reconnection attempts reached');
            return null; // Stop retrying
          }
          // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, 6400ms, 12800ms, 25600ms
          return Math.min(times * 50, 30000);
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true; // Reconnect on READONLY error
          }
          return false;
        },
        connectTimeout: 5000,
        keepAlive: 30000
      });
      
      client.on('error', (err) => {
        console.warn('⚠️ Redis error:', err.message);
      });
      
      client.on('connect', () => {
        console.log('🔄 Redis: Connecting...');
      });
      
      client.on('ready', () => {
        console.log('✅ Redis connected and ready');
        redisRetries = 0;
      });
      
      client.on('reconnecting', () => {
        console.log('🔄 Redis: Reconnecting...');
      });
      
      // ioredis otomatik bağlanır, ancak ready event'ini bekleyelim
      await new Promise((resolve, reject) => {
        if (client.status === 'ready') {
          resolve();
        } else {
          const timeout = setTimeout(() => {
            reject(new Error('Redis connection timeout'));
          }, 10000);
          
          client.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          client.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }
      });
      
      global.redis = client;
      
      // ✅ OPTIMIZASYON: Health check after connection
      const { healthCheck } = require('./redis');
      const health = await healthCheck();
      if (health.available) {
        console.log(`✅ Redis health check passed (latency: ${health.latency}ms)`);
      }
      
      return client;
    } catch (e) {
      redisRetries++;
      if (redisRetries < maxRedisRetries) {
        console.warn(`⚠️ Redis connection failed (attempt ${redisRetries}/${maxRedisRetries}), retrying in ${redisRetryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, redisRetryDelay));
        return connectRedis();
      } else {
        console.warn('⚠️ Redis not available after max retries:', e.message);
        global.redis = null;
        return null;
      }
    }
  }
  
  await connectRedis();
  // Ensure default tenant API key exists and active
  await ensureDefaultTenantApiKey();

  // Ensure test user exists for panel testing
  await ensureTestUser();

  // Initialize flash deals table
  await createFlashDealsTable();

  // Cart endpoints (apply relaxed limiter)
  app.use('/api/cart', relaxedCartLimiter);
  app.use('/api/cart/user', relaxedCartLimiter);
  // Variations API stubs (return empty) - sadece açıkça devreye alınırsa
  if (process.env.DISABLE_VARIATIONS === '1') {
    app.get('/api/products/:productId/variations', async (req, res) => {
      res.json({ success: true, data: [] });
    });
    app.post('/api/products/:productId/variations', async (req, res) => {
      res.json({ success: true, data: false, message: 'Variations disabled' });
    });
    app.get('/api/variations/:variationId/options', async (req, res) => {
      res.json({ success: true, data: [] });
    });
    app.get('/api/variations/options/:optionId', async (req, res) => {
      res.json({ success: true, data: null });
    });
    app.put('/api/variations/options/:optionId/stock', async (req, res) => {
      res.json({ success: true, data: false, message: 'Variations disabled' });
    });
  }

  // Cart endpoints
  app.get('/api/cart/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.tenant?.id || 1;

      const cacheKey = `cart:${tenantId}:${userId}:-`;
      const lockKey = `${cacheKey}:lock`;

      const cached = await getJson(cacheKey);
      if (Array.isArray(cached)) {
        return res.json({ success: true, data: cached });
      }

      let rows;
      await withLock(lockKey, 5, async () => {
        const again = await getJson(cacheKey);
        if (Array.isArray(again)) {
          rows = again;
          return;
        }
        // Optimize: Sadece gerekli column'lar
        const q = `SELECT c.id, c.userId, c.deviceId, c.productId, c.quantity, c.variationString, c.selectedVariations, c.createdAt, 
                          p.name, p.price, p.image, p.stock 
         FROM cart c 
         JOIN products p ON c.productId = p.id 
         WHERE c.userId = ? AND c.tenantId = ?
         ORDER BY c.createdAt DESC`;
        const params = [userId, tenantId];
        const [dbRows] = await poolWrapper.execute(q, params);
        rows = dbRows;
        // Optimize: Cache TTL 60 → 180 (3 dakika - sepet sık değişir)
        await setJsonEx(cacheKey, 180, rows);
      });

      if (!rows) {
        // Optimize: Sadece gerekli column'lar
        const q = `SELECT c.id, c.userId, c.deviceId, c.productId, c.quantity, c.variationString, c.selectedVariations, c.createdAt, 
                          p.name, p.price, p.image, p.stock 
         FROM cart c 
         JOIN products p ON c.productId = p.id 
         WHERE c.userId = ? AND c.tenantId = ?
         ORDER BY c.createdAt DESC`;
        const params = [userId, tenantId];
        const [dbRows] = await poolWrapper.execute(q, params);
        rows = dbRows;
        // Optimize: Cache TTL 60 → 180 (3 dakika)
        await setJsonEx(cacheKey, 180, rows);
      }

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('❌ Error getting cart:', error);
      res.status(500).json({ success: false, message: 'Error getting cart' });
    }
  });

  app.post('/api/cart', validateUserIdMatch('body'), async (req, res) => {
    try {
      const { userId, productId, quantity, variationString, selectedVariations, deviceId } = req.body;
      console.log(`🛒 Server: Adding to cart - User: ${userId}, Product: ${productId}, Quantity: ${quantity}`);

      // Validate required fields
      if (!userId || !productId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: userId, productId, quantity'
        });
      }

      // Tenant ID from authentication
      const tenantId = req.tenant?.id || 1;

      // Ensure guest user exists (userId = 1)
      if (userId === 1) {
        try {
          await poolWrapper.execute(
            'INSERT IGNORE INTO users (id, email, password, name, phone, tenantId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [1, 'guest@huglu.com', 'guest', 'Guest User', '', tenantId, new Date().toISOString()]
          );
        } catch (e) {
          // Guest user already exists, ignore
        }
      }

      // ⚡ OPTIMIZASYON: Tek sorgu ile INSERT veya UPDATE (2 sorgu → 1 sorgu)
      // UNIQUE constraint gerekli: (tenantId, userId, productId, variationString, deviceId)
      const deviceIdValue = (userId === 1) ? (deviceId || '') : null;

      const [result] = await poolWrapper.execute(`
        INSERT INTO cart (tenantId, userId, deviceId, productId, quantity, variationString, selectedVariations, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          quantity = quantity + VALUES(quantity),
          selectedVariations = VALUES(selectedVariations)
      `, [
        tenantId,
        userId,
        deviceIdValue,
        productId,
        quantity,
        variationString || '',
        JSON.stringify(selectedVariations || {})
      ]);

      const cartItemId = result.insertId || result.affectedRows;
      console.log(`✅ Server: Cart updated for user ${userId}, item ${cartItemId}`);

      // ⚡ OPTIMIZASYON: Tek cache invalidation
      try {
        const cacheKey = `cart:${tenantId}:${userId}:${userId === 1 ? (deviceId || '') : '-'}`;
        await delKey(cacheKey);
      } catch (_) { }

      res.json({
        success: true,
        message: 'Ürün sepete eklendi',
        data: { cartItemId }
      });
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      res.status(500).json({ success: false, message: 'Sepete eklenirken hata oluştu' });
    }
  });

  // Health check endpoint removed - using the main one above



  // Check cart before logout and send notification if items exist
  app.post('/api/cart/check-before-logout', async (req, res) => {
    try {
      const { userId, deviceId } = req.body;
      const tenantId = req.tenant?.id || 1;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required'
        });
      }

      // Get cart items for user
      // Optimize: Sadece gerekli column'lar
      let cartQuery = 'SELECT c.id, c.userId, c.productId, c.quantity, c.variationString, c.selectedVariations, p.name as productName, p.price FROM cart c JOIN products p ON c.productId = p.id WHERE c.tenantId = ?';
      const cartParams = [tenantId];

      if (userId !== 1) {
        cartQuery += ' AND c.userId = ?';
        cartParams.push(userId);
      } else {
        cartQuery += ' AND c.userId = 1 AND c.deviceId = ?';
        cartParams.push(deviceId || '');
      }

      const [cartItems] = await poolWrapper.execute(cartQuery, cartParams);

      if (cartItems.length > 0) {
        // User has items in cart, send notification
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        console.log(`🛒 User ${userId} has ${totalItems} items in cart`);

        res.json({
          success: true,
          hasItems: true,
          itemCount: totalItems,
          totalPrice,
          message: 'Sepetinizde ürünler var, bildirim gönderildi'
        });
      } else {
        res.json({
          success: true,
          hasItems: false,
          message: 'Sepetinizde ürün yok'
        });
      }
    } catch (error) {
      console.error('❌ Error checking cart before logout:', error);
      res.status(500).json({ success: false, message: 'Sepet kontrolü sırasında hata oluştu' });
    }
  });

  app.put('/api/cart/:cartItemId', requireUserOwnership('cart', 'params'), async (req, res) => {
    try {
      const { cartItemId } = req.params;
      const { quantity } = req.body;

      if (quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity cannot be negative'
        });
      }

      if (quantity === 0) {
        // Miktar 0 ise ürünü sepetten kaldır
        await poolWrapper.execute(
          'DELETE FROM cart WHERE id = ?',
          [cartItemId]
        );
        try {
          const tenantId = req.tenant?.id || 1;
          // cartItemId'den userId ve deviceId'yi bulup anahtarları sil
          const [info] = await poolWrapper.execute('SELECT userId, deviceId FROM cart WHERE id = ?', [cartItemId]);
          const uId = info?.[0]?.userId;
          const dId = info?.[0]?.deviceId || '';
          if (uId) {
            await delKey(`cart:${tenantId}:${uId}:${uId === 1 ? dId : '-'}`);
            await delKey(`cart:${tenantId}:${uId}:-`);
          }
        } catch (_) { }
        return res.json({
          success: true,
          message: 'Item removed from cart'
        });
      }

      await poolWrapper.execute(
        'UPDATE cart SET quantity = ? WHERE id = ?',
        [quantity, cartItemId]
      );
      try {
        const tenantId = req.tenant?.id || 1;
        const [info] = await poolWrapper.execute('SELECT userId, deviceId FROM cart WHERE id = ?', [cartItemId]);
        const uId = info?.[0]?.userId;
        const dId = info?.[0]?.deviceId || '';
        if (uId) {
          await delKey(`cart:${tenantId}:${uId}:${uId === 1 ? dId : '-'}`);
          await delKey(`cart:${tenantId}:${uId}:-`);
        }
      } catch (_) { }
      res.json({
        success: true,
        message: 'Cart item updated'
      });
    } catch (error) {
      console.error('❌ Error updating cart item:', error);
      res.status(500).json({ success: false, message: 'Error updating cart item' });
    }
  });

  app.delete('/api/cart/:cartItemId', requireUserOwnership('cart', 'params'), async (req, res) => {
    try {
      const { cartItemId } = req.params;
      const tenantId = req.tenant?.id || 1;

      // ⚡ OPTIMIZASYON: Önce user bilgisini al, sonra sil
      const [info] = await poolWrapper.execute('SELECT userId, deviceId FROM cart WHERE id = ?', [cartItemId]);

      if (!info || info.length === 0) {
        return res.status(404).json({ success: false, message: 'Cart item not found' });
      }

      const uId = info[0].userId;
      const dId = info[0].deviceId || '';

      await poolWrapper.execute('DELETE FROM cart WHERE id = ?', [cartItemId]);

      // ⚡ OPTIMIZASYON: Tek cache invalidation
      try {
        const cacheKey = `cart:${tenantId}:${uId}:${uId === 1 ? dId : '-'}`;
        await delKey(cacheKey);
      } catch (_) { }

      res.json({
        success: true,
        message: 'Item removed from cart'
      });
    } catch (error) {
      console.error('❌ Error removing from cart:', error);
      res.status(500).json({ success: false, message: 'Error removing from cart' });
    }
  });

  app.get('/api/cart/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;
      console.log(`🛒 Server: Getting cart for user ${userId}`);

      // Tenant ID from authentication
      const tenantId = req.tenant?.id || 1;
      const cacheKey = `cart:${tenantId}:${userId}:${deviceId ? String(deviceId) : '-'}`;

      // ⚡ OPTIMIZASYON: Lock kaldırıldı - direkt cache kontrolü
      const cached = await getJson(cacheKey);
      if (Array.isArray(cached)) {
        console.log(`✅ Server: Cache hit for user ${userId}`);
        return res.json({ success: true, data: cached });
      }

      // Cache miss - DB'den çek
      // Optimize: Sadece gerekli column'lar
      let getCartSql = `SELECT c.id, c.userId, c.deviceId, c.productId, c.quantity, c.variationString, c.selectedVariations, c.createdAt, 
                               p.name, p.price, p.image, p.stock
         FROM cart c 
         JOIN products p ON c.productId = p.id 
         WHERE c.tenantId = ? AND c.userId = ?`;
      const getCartParams = [tenantId, userId];

      // Add device filter if provided
      if (deviceId) {
        getCartSql += ' AND c.deviceId = ?';
        getCartParams.push(String(deviceId));
      }

      getCartSql += ' ORDER BY c.createdAt DESC';

      const [rows] = await poolWrapper.execute(getCartSql, getCartParams);

      // ⚡ OPTIMIZASYON: Cache süresi 300 → 180 saniye (3 dakika - sepet daha sık değişir)
      await setJsonEx(cacheKey, 180, rows);

      console.log(`✅ Server: Found ${rows.length} cart items for user ${userId}`);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('❌ Error getting user cart:', error);
      res.status(500).json({ success: false, message: 'Error getting user cart' });
    }
  });

  app.get('/api/cart/user/:userId/total', async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;

      let totalSql = `SELECT SUM(c.quantity * p.price) as total
         FROM cart c 
         JOIN products p ON c.productId = p.id 
         WHERE c.tenantId = ?`;
      const totalParams = [req.tenant?.id || 1];
      if (parseInt(userId) !== 1) {
        totalSql += ' AND c.userId = ?';
        totalParams.push(userId);
      } else {
        totalSql += ' AND c.userId = 1 AND c.deviceId = ?';
        totalParams.push(String(deviceId || ''));
      }

      const [rows] = await poolWrapper.execute(totalSql, totalParams);

      const total = rows[0]?.total || 0;
      res.json({ success: true, data: total });
    } catch (error) {
      console.error('❌ Error getting cart total:', error);
      res.status(500).json({ success: false, message: 'Error getting cart total' });
    }
  });

  // Detailed total with campaigns applied
  app.get('/api/cart/user/:userId/total-detailed', async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;
      const tenantId = req.tenant?.id || 1;

      // Get cart items with product prices
      let itemsSql = `SELECT c.productId, c.quantity, p.price
        FROM cart c JOIN products p ON c.productId = p.id
        WHERE c.tenantId = ?`;
      const itemsParams = [tenantId];
      if (parseInt(userId) !== 1) {
        itemsSql += ' AND c.userId = ?';
        itemsParams.push(userId);
      } else {
        itemsSql += ' AND c.userId = 1 AND c.deviceId = ?';
        itemsParams.push(String(deviceId || ''));
      }

      const [cartRows] = await poolWrapper.execute(itemsSql, itemsParams);
      const subtotal = cartRows.reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.quantity) || 0), 0);

      // Load active campaigns (Redis hot cache)
      let campaigns;
      try {
        if (global.redis) {
          const cached = await global.redis.get(`campaigns:active:${tenantId}`);
          if (cached) campaigns = JSON.parse(cached);
        }
      } catch { }
      if (!campaigns) {
        // Optimize: Sadece gerekli column'lar
        const [rows] = await poolWrapper.execute(
          `SELECT id, name, type, discountType, discountValue, applicableProducts, startDate, endDate, minOrderAmount, maxDiscountAmount, isActive, status FROM campaigns WHERE tenantId = ? AND isActive = 1 AND status = 'active'
           AND (startDate IS NULL OR startDate <= NOW()) AND (endDate IS NULL OR endDate >= NOW())`,
          [tenantId]
        );
        campaigns = rows;
        // Optimize: Cache TTL 300 → 600 (10 dakika - campaigns daha az değişir)
        try { if (global.redis) await global.redis.set(`campaigns:active:${tenantId}`, JSON.stringify(rows), 'EX', 600); } catch { }
      }

      let discountTotal = 0;
      let shipping = subtotal >= 500 ? 0 : 29.9; // default policy fallback

      // Apply product-specific discounts
      for (const camp of campaigns) {
        if (camp.type === 'discount' && camp.applicableProducts) {
          try {
            const applicable = typeof camp.applicableProducts === 'string' ? JSON.parse(camp.applicableProducts) : camp.applicableProducts;
            const set = new Set(Array.isArray(applicable) ? applicable : []);
            for (const row of cartRows) {
              if (set.has(row.productId)) {
                const price = Number(row.price) || 0;
                const qty = Number(row.quantity) || 0;
                if (camp.discountType === 'percentage') {
                  discountTotal += (price * qty) * (Number(camp.discountValue) || 0) / 100;
                } else if (camp.discountType === 'fixed') {
                  discountTotal += (Number(camp.discountValue) || 0) * qty;
                }
              }
            }
          } catch { }
        }
      }

      // Apply cart threshold discounts and free shipping
      for (const camp of campaigns) {
        if (camp.type === 'free_shipping' && subtotal >= (Number(camp.minOrderAmount) || 0)) {
          shipping = 0;
        }
        if (camp.type === 'discount' && (!camp.applicableProducts) && subtotal >= (Number(camp.minOrderAmount) || 0)) {
          if (camp.discountType === 'percentage') {
            discountTotal += subtotal * (Number(camp.discountValue) || 0) / 100;
          } else if (camp.discountType === 'fixed') {
            discountTotal += Number(camp.discountValue) || 0;
          }
        }
      }

      // Cap max discount amount if defined
      for (const camp of campaigns) {
        if (camp.maxDiscountAmount) {
          discountTotal = Math.min(discountTotal, Number(camp.maxDiscountAmount) || discountTotal);
        }
      }

      const total = Math.max(0, subtotal - discountTotal + shipping);

      res.json({ success: true, data: { subtotal, discount: Number(discountTotal.toFixed(2)), shipping: Number(shipping.toFixed(2)), total: Number(total.toFixed(2)) } });
    } catch (error) {
      console.error('❌ Error getting detailed cart total:', error);
      res.status(500).json({ success: false, message: 'Error getting detailed cart total' });
    }
  });

  // Campaign endpoints
  app.get('/api/campaigns', async (req, res) => {
    try {
      const tenantId = req.tenant?.id || 1;
      try {
        if (global.redis) {
          const cached = await global.redis.get(`campaigns:list:${tenantId}`);
          if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true, source: 'redis' });
        }
      } catch { }
      // Optimize: Sadece gerekli column'lar
      const [rows] = await poolWrapper.execute(`SELECT id, name, type, discountType, discountValue, applicableProducts, startDate, endDate, minOrderAmount, maxDiscountAmount, isActive, status, createdAt, updatedAt FROM campaigns WHERE tenantId = ? ORDER BY updatedAt DESC`, [tenantId]);
      // Optimize: Cache TTL 300 → 600 (10 dakika)
      try { if (global.redis) await global.redis.set(`campaigns:list:${tenantId}`, JSON.stringify(rows), 'EX', 600); } catch { }
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('❌ Error listing campaigns:', error);
      res.status(500).json({ success: false, message: 'Error listing campaigns' });
    }
  });

  app.post('/api/campaigns', async (req, res) => {
    try {
      const tenantId = req.tenant?.id || 1;
      const { name, description, type, status = 'active', discountType, discountValue = 0, minOrderAmount = 0, maxDiscountAmount = null, applicableProducts = null, excludedProducts = null, startDate = null, endDate = null, isActive = true } = req.body;

      await poolWrapper.execute(
        `INSERT INTO campaigns (tenantId, name, description, type, status, discountType, discountValue, minOrderAmount, maxDiscountAmount, applicableProducts, excludedProducts, startDate, endDate, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, name || 'Campaign', description || '', type || 'discount', status, discountType || 'percentage', discountValue, minOrderAmount, maxDiscountAmount, applicableProducts ? JSON.stringify(applicableProducts) : null, excludedProducts ? JSON.stringify(excludedProducts) : null, startDate, endDate, isActive ? 1 : 0]
      );

      res.json({ success: true, message: 'Campaign created' });
    } catch (error) {
      console.error('❌ Error creating campaign:', error);
      res.status(500).json({ success: false, message: 'Error creating campaign' });
    }
  });

  app.delete('/api/cart/user/:userId', validateUserIdMatch('params'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;

      let deleteSql = 'DELETE FROM cart WHERE tenantId = ?';
      const deleteParams = [req.tenant?.id || 1];
      if (parseInt(userId) !== 1) {
        deleteSql += ' AND userId = ?';
        deleteParams.push(userId);
      } else {
        deleteSql += ' AND userId = 1 AND deviceId = ?';
        deleteParams.push(String(deviceId || ''));
      }

      await poolWrapper.execute(deleteSql, deleteParams);

      res.json({
        success: true,
        message: 'Cart cleared'
      });
    } catch (error) {
      console.error('❌ Error clearing cart:', error);
      res.status(500).json({ success: false, message: 'Error clearing cart' });
    }
  });

  // User profile endpoints
  app.put('/api/users/:userId/profile', requireUserOwnership('user', 'params'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, email, phone, address, companyName, taxOffice, taxNumber, tradeRegisterNumber, website } = req.body;

      console.log(`👤 Updating profile for user ${userId}:`, { name, email, phone, address, companyName, taxOffice, taxNumber, tradeRegisterNumber, website });

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Ad ve e-posta alanları gereklidir'
        });
      }

      // Check if email is already taken by another user
      const [existingUser] = await poolWrapper.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu e-posta adresi zaten kullanılıyor'
        });
      }

      // Şirket bilgileri kolonlarını kontrol et ve ekle
      const [cols] = await poolWrapper.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
      `);
      const columnNames = cols.map(c => c.COLUMN_NAME);
      const alters = [];

      if (!columnNames.includes('companyName')) {
        alters.push("ADD COLUMN companyName VARCHAR(255) NULL AFTER address");
      }
      if (!columnNames.includes('taxOffice')) {
        alters.push("ADD COLUMN taxOffice VARCHAR(255) NULL AFTER companyName");
      }
      if (!columnNames.includes('taxNumber')) {
        alters.push("ADD COLUMN taxNumber VARCHAR(50) NULL AFTER taxOffice");
      }
      if (!columnNames.includes('tradeRegisterNumber')) {
        alters.push("ADD COLUMN tradeRegisterNumber VARCHAR(100) NULL AFTER taxNumber");
      }
      if (!columnNames.includes('website')) {
        alters.push("ADD COLUMN website VARCHAR(255) NULL AFTER tradeRegisterNumber");
      }

      if (alters.length > 0) {
        await poolWrapper.execute(`ALTER TABLE users ${alters.join(', ')}`);
        console.log('✅ Şirket bilgileri kolonları eklendi');
      }

      // Update user profile
      const updateFields = ['name', 'email', 'phone', 'address'];
      const updateValues = [name, email, phone || '', address || ''];

      if (columnNames.includes('companyName') || alters.length > 0) {
        updateFields.push('companyName', 'taxOffice', 'taxNumber', 'tradeRegisterNumber', 'website');
        updateValues.push(companyName || '', taxOffice || '', taxNumber || '', tradeRegisterNumber || '', website || '');
      }

      updateFields.push('id');
      updateValues.push(userId);

      await poolWrapper.execute(
        `UPDATE users SET ${updateFields.slice(0, -1).map(f => `${f} = ?`).join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated user data - Try with company fields first, fallback if columns don't exist
      let [updatedUser] = await poolWrapper.execute(
        'SELECT id, name, email, phone, address, companyName, taxOffice, taxNumber, tradeRegisterNumber, website, createdAt, role FROM users WHERE id = ?',
        [userId]
      ).catch(async (error) => {
        if (error.code === 'ER_BAD_FIELD_ERROR') {
          console.log('⚠️ Company columns missing, using fallback query');
          return await poolWrapper.execute(
            'SELECT id, name, email, phone, address, createdAt, role FROM users WHERE id = ?',
            [userId]
          );
        }
        throw error;
      });

      console.log(`✅ Profile updated successfully for user ${userId}`);
      res.json({
        success: true,
        message: 'Profil başarıyla güncellendi',
        data: updatedUser[0] || null
      });
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Profil güncellenirken bir hata oluştu'
      });
    }
  });

  app.put('/api/users/:userId/password', requireUserOwnership('user', 'params'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;

      console.log(`🔒 Changing password for user ${userId}`);

      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mevcut şifre ve yeni şifre gereklidir'
        });
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Yeni şifre en az 6 karakter olmalıdır'
        });
      }

      // Get current user
      const [user] = await poolWrapper.execute(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );

      if (user.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      // For guest user (id = 1), skip password verification
      if (userId != 1) {
        // Verify current password using bcrypt
        const isCurrentPasswordValid = await verifyPassword(currentPassword, user[0].password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({
            success: false,
            message: 'Mevcut şifre yanlış'
          });
        }
      }

      // Hash new password with bcrypt
      const hashedNewPassword = await hashPassword(newPassword);
      await poolWrapper.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedNewPassword, userId]
      );

      console.log(`✅ Password changed successfully for user ${userId}`);
      res.json({
        success: true,
        message: 'Şifre başarıyla değiştirildi'
      });
    } catch (error) {
      console.error('❌ Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Şifre değiştirilirken bir hata oluştu'
      });
    }
  });

  // Wallet endpoints (simplified authentication for guest users)
  app.get('/api/wallet/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`💰 Getting wallet for user: ${userId}`);

      // Default tenant ID for guest users
      const tenantId = 1;

      // Get user wallet balance
      const [walletRows] = await poolWrapper.execute(
        'SELECT balance, currency FROM user_wallets WHERE userId = ? AND tenantId = ?',
        [userId, tenantId]
      );

      let balance = 0;
      let currency = 'TRY';

      if (walletRows.length > 0) {
        balance = walletRows[0].balance;
        currency = walletRows[0].currency;
      } else {
        // Create wallet if doesn't exist
        await poolWrapper.execute(
          'INSERT INTO user_wallets (userId, tenantId, balance, currency) VALUES (?, ?, ?, ?)',
          [userId, tenantId, 0, 'TRY']
        );
      }

      // Get recent transactions
      const [transactions] = await poolWrapper.execute(
        `SELECT id, type, amount, description, status, createdAt 
       FROM wallet_transactions 
       WHERE userId = ? AND tenantId = ? 
       ORDER BY createdAt DESC 
       LIMIT 20`,
        [userId, tenantId]
      );

      console.log(`✅ Found wallet with balance: ${balance} ${currency}, ${transactions.length} transactions`);
      res.json({
        success: true,
        data: {
          balance,
          currency,
          transactions: transactions.map(t => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            description: t.description,
            status: t.status,
            date: t.createdAt
          }))
        }
      });
    } catch (error) {
      console.error('❌ Error getting wallet:', error);
      res.status(500).json({ success: false, message: 'Error getting wallet' });
    }
  });

  app.post('/api/wallet/:userId/add-money', requireUserOwnership('wallet', 'params'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, paymentMethod, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
      }

      console.log(`💰 Adding money to wallet: User ${userId}, Amount: ${amount}`);

      // Default tenant ID for guest users
      const tenantId = 1;

      const connection = await poolWrapper.getConnection();
      await connection.beginTransaction();

      try {
        // Update wallet balance
        const [updateResult] = await connection.execute(
          `INSERT INTO user_wallets (userId, tenantId, balance, currency) 
         VALUES (?, ?, ?, 'TRY') 
         ON DUPLICATE KEY UPDATE balance = balance + ?`,
          [userId, tenantId, amount, amount]
        );

        // Add transaction record
        await connection.execute(
          `INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, status, paymentMethod) 
         VALUES (?, ?, 'credit', ?, ?, 'completed', ?)`,
          [userId, tenantId, amount, description || 'Para yükleme', paymentMethod || 'credit_card']
        );

        await connection.commit();
        connection.release();

        console.log(`✅ Money added successfully: ${amount} TRY`);
        res.json({ success: true, message: 'Para başarıyla yüklendi' });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('❌ Error adding money:', error);
      res.status(500).json({ success: false, message: 'Para yükleme hatası' });
    }
  });


  app.get('/api/wallet/:userId/transactions', async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      console.log(`💰 Getting transactions for user: ${userId}`);

      // Default tenant ID for guest users
      const tenantId = 1;

      const [transactions] = await poolWrapper.execute(
        `SELECT id, type, amount, description, status, paymentMethod, createdAt 
       FROM wallet_transactions 
       WHERE userId = ? AND tenantId = ? 
       ORDER BY createdAt DESC 
       LIMIT ? OFFSET ?`,
        [userId, tenantId, parseInt(limit), parseInt(offset)]
      );

      console.log(`✅ Found ${transactions.length} transactions`);
      res.json({
        success: true,
        data: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          status: t.status,
          paymentMethod: t.paymentMethod,
          date: t.createdAt
        }))
      });
    } catch (error) {
      console.error('❌ Error getting transactions:', error);
      res.status(500).json({ success: false, message: 'Error getting transactions' });
    }
  });

  // Low Stock Products API endpoint
  app.get('/api/admin/low-stock-products', async (req, res) => {
    try {
      const tenantId = req.tenant?.id || 1;
      const threshold = parseInt(req.query.threshold) || 10; // Default 10 adet altı düşük stok

      // Düşük stoklu ürünleri çek
      const [products] = await poolWrapper.execute(`
      SELECT id, name, sku, stock, image, category, brand, xmlOptions, variationDetails
      FROM products 
      WHERE tenantId = ? AND stock <= ?
      ORDER BY stock ASC, name ASC
    `, [tenantId, threshold]);

      // Her ürün için beden stoklarını çıkar
      const productsWithSizes = await Promise.all(
        products.map(async (product) => {
          const sizes = {};

          // xmlOptions JSON'ını parse et
          if (product.xmlOptions) {
            try {
              const xmlOptions = typeof product.xmlOptions === 'string'
                ? JSON.parse(product.xmlOptions)
                : product.xmlOptions;

              if (xmlOptions.options && Array.isArray(xmlOptions.options)) {
                xmlOptions.options.forEach((variation) => {
                  if (variation.attributes && variation.stok !== undefined) {
                    const attributes = variation.attributes;
                    if (attributes && typeof attributes === 'object') {
                      // Beden bilgisini bul (Beden, Size, etc.)
                      const sizeKeys = Object.keys(attributes).filter(key =>
                        key.toLowerCase().includes('beden') ||
                        key.toLowerCase().includes('size')
                      );

                      if (sizeKeys.length > 0) {
                        const size = attributes[sizeKeys[0]];
                        if (size && typeof size === 'string') {
                          sizes[size] = parseInt(variation.stok) || 0;
                        }
                      }
                    }
                  }
                });
              }
            } catch (parseError) {
              console.error(`Ürün ${product.id} xmlOptions parse hatası:`, parseError);
            }
          }

          // Eğer beden bilgisi yoksa ama varyasyonlar varsa, genel stok bilgisini kullan
          if (Object.keys(sizes).length === 0 && product.xmlOptions) {
            try {
              const xmlOptions = typeof product.xmlOptions === 'string'
                ? JSON.parse(product.xmlOptions)
                : product.xmlOptions;

              if (xmlOptions.options && Array.isArray(xmlOptions.options)) {
                // Varyasyon sayısını beden olarak göster
                const variationCount = xmlOptions.options.length;
                if (variationCount > 0) {
                  sizes['Varyasyon'] = variationCount;
                }
              }
            } catch (parseError) {
              console.error(`Ürün ${product.id} xmlOptions parse hatası:`, parseError);
            }
          }

          // variationDetails JSON'ını da kontrol et
          if (product.variationDetails) {
            try {
              const variationDetails = typeof product.variationDetails === 'string'
                ? JSON.parse(product.variationDetails)
                : product.variationDetails;

              if (Array.isArray(variationDetails)) {
                variationDetails.forEach((variation) => {
                  if (variation.attributes && variation.stok !== undefined) {
                    const attributes = variation.attributes;
                    if (attributes && typeof attributes === 'object') {
                      // Beden bilgisini bul (Beden, Size, etc.)
                      const sizeKeys = Object.keys(attributes).filter(key =>
                        key.toLowerCase().includes('beden') ||
                        key.toLowerCase().includes('size')
                      );

                      if (sizeKeys.length > 0) {
                        const size = attributes[sizeKeys[0]];
                        if (size && typeof size === 'string') {
                          sizes[size] = parseInt(variation.stok) || 0;
                        }
                      }
                    }
                  }
                });
              }
            } catch (parseError) {
              console.error(`Ürün ${product.id} variationDetails parse hatası:`, parseError);
            }
          }

          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            stock: product.stock,
            image: product.image,
            category: product.category,
            brand: product.brand,
            sizes: sizes
          };
        })
      );

      res.json({
        success: true,
        data: productsWithSizes
      });
    } catch (error) {
      console.error('Error getting low stock products:', error);
      res.status(500).json({ success: false, message: 'Error getting low stock products' });
    }
  });

  // Custom Production Requests API endpoints

  // Get all custom production requests for a user
  app.get('/api/custom-production-requests/:userKey', async (req, res) => {
    try {
      const { userKey } = req.params;
      const { limit = 50, offset = 0, status } = req.query;

      console.log(`🎨 Getting custom production requests for userKey: ${userKey}`);

      // Default tenant ID
      const tenantId = 1;
      // Resolve userKey to numeric PK
      let numericUserId;
      try {
        numericUserId = await resolveUserKeyToPk(userKey, tenantId);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid or unknown user' });
      }

      let query = `
      SELECT cpr.*, 
             GROUP_CONCAT(
               CONCAT(
                 JSON_OBJECT(
                   'id', cpi.id,
                   'productId', cpi.productId,
                   'quantity', cpi.quantity,
                   'customizations', cpi.customizations,
                   'productName', p.name,
                   'productImage', p.image,
                   'productPrice', p.price
                 )
               ) SEPARATOR '|||' 
             ) as items
      FROM custom_production_requests cpr
      LEFT JOIN custom_production_items cpi ON cpr.id = cpi.requestId
      LEFT JOIN products p ON cpi.productId = p.id AND p.tenantId = cpr.tenantId
      WHERE cpr.userId = ? AND cpr.tenantId = ?
    `;

      const params = [numericUserId, tenantId];

      if (status) {
        const s = String(status).toLowerCase();
        const allowed = ['pending', 'review', 'design', 'production', 'shipped', 'completed', 'cancelled'];
        if (!allowed.includes(s)) {
          return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        query += ' AND cpr.status = ?';
        params.push(s);
      }

      query += `
      GROUP BY cpr.id
      ORDER BY cpr.createdAt DESC
      LIMIT ? OFFSET ?
    `;

      params.push(parseInt(limit), parseInt(offset));

      const [requests] = await poolWrapper.execute(query, params);

      // Parse items JSON
      const formattedRequests = requests.map(request => {
        const items = request.items ?
          request.items.split('|||').map(item => JSON.parse(item)) : [];

        return {
          id: request.id,
          requestNumber: request.requestNumber,
          status: request.status,
          totalQuantity: request.totalQuantity,
          totalAmount: request.totalAmount,
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          customerPhone: request.customerPhone,
          notes: request.notes,
          estimatedDeliveryDate: request.estimatedDeliveryDate,
          actualDeliveryDate: request.actualDeliveryDate,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          // Quote fields (if present)
          quoteAmount: request.quoteAmount ?? null,
          quoteCurrency: request.quoteCurrency ?? null,
          quoteStatus: request.quoteStatus ?? null,
          quoteNotes: request.quoteNotes ?? null,
          quotedAt: request.quotedAt ?? null,
          quoteValidUntil: request.quoteValidUntil ?? null,
          items: items
        };
      });

      console.log(`✅ Found ${formattedRequests.length} custom production requests`);
      res.json({ success: true, data: formattedRequests });

    } catch (error) {
      console.error('❌ Error getting custom production requests:', error);
      res.status(500).json({ success: false, message: 'Error getting custom production requests' });
    }
  });

  // Create a message for a custom production request (user side)
  app.post('/api/custom-production-requests/:requestId/messages', async (req, res) => {
    try {
      const tenantId = 1;
      const requestId = parseInt(req.params.requestId, 10);
      const { userKey, message } = req.body || {};
      if (!requestId || !message || !userKey) {
        return res.status(400).json({ success: false, message: 'requestId, userKey and message are required' });
      }
      const userId = await resolveUserKeyToPk(userKey, tenantId);
      await poolWrapper.execute(
        `INSERT INTO custom_production_messages (tenantId, requestId, userId, sender, message) VALUES (?, ?, ?, 'user', ?)`,
        [tenantId, requestId, userId, String(message).slice(0, 5000)]
      );
      res.json({ success: true, message: 'Mesaj kaydedildi' });
    } catch (error) {
      console.error('❌ Error creating custom production message:', error);
      res.status(500).json({ success: false, message: 'Mesaj kaydedilemedi' });
    }
  });

  // List messages for a request (admin or user)
  app.get('/api/custom-production-requests/:requestId/messages', async (req, res) => {
    try {
      const tenantId = 1;
      const requestId = parseInt(req.params.requestId, 10);
      const [rows] = await poolWrapper.execute(
        `SELECT id, sender, message, createdAt FROM custom_production_messages
       WHERE requestId = ? AND tenantId = ? ORDER BY createdAt ASC`,
        [requestId, tenantId]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('❌ Error listing custom production messages:', error);
      res.status(500).json({ success: false, message: 'Mesajlar alınamadı' });
    }
  });
  // Get single custom production request
  app.get('/api/custom-production-requests/:userKey', async (req, res) => {
    try {
      const userKey = req.params.userKey;
      const userId = await resolveUserKeyToPk(userKey);
      
      if (!userId) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Detect optional columns
      const [cols] = await poolWrapper.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
      `);
      const names = new Set(cols.map(c => c.COLUMN_NAME));
      const baseCols = [
        'id', 'userId', 'tenantId', 'status', 'totalQuantity', 'totalAmount', 'customerName', 'customerEmail', 
        'customerPhone', 'companyName', 'taxNumber', 'taxAddress', 'companyAddress', 'notes', 'createdAt'
      ];
      const optionalCols = [
        'quoteAmount', 'quoteCurrency', 'quoteNotes', 'quoteStatus', 'quotedAt', 'quoteValidUntil', 
        'proformaQuoteData', 'proformaItemCosts', 'proformaSharedShippingCost', 'proformaProfitMargin', 
        'proformaVatRate', 'proformaTotalWithVat', 'proformaQuotedAt', 'revisionNotes', 'revisionRequestedAt',
        'requestNumber', 'estimatedDeliveryDate', 'actualDeliveryDate', 'source'
      ];
      const selectCols = baseCols
        .concat(optionalCols.filter(n => names.has(n)))
        .join(', ');

      const [requests] = await poolWrapper.execute(
        `SELECT ${selectCols} FROM custom_production_requests WHERE userId = ? ORDER BY createdAt DESC`,
        [userId]
      );

      // Get items for each request
      const requestsWithItems = await Promise.all(
        requests.map(async (request) => {
          const [items] = await poolWrapper.execute(
            `SELECT cpi.*, p.name as productName, p.image as productImage, p.price as productPrice
             FROM custom_production_items cpi
             LEFT JOIN products p ON cpi.productId = p.id AND p.tenantId = cpi.tenantId
             WHERE cpi.requestId = ?`,
            [request.id]
          );

          console.log(`📦 Request ${request.id} items:`, items?.length || 0, items);

          // Parse JSON fields in items (customizations)
          const parsedItems = (items || []).map((item) => {
            // Debug: Item verisini logla
            console.log(`🔍 Raw item for request ${request.id}:`, {
              id: item?.id,
              productId: item?.productId,
              quantity: item?.quantity,
              customizations: item?.customizations ? (typeof item.customizations === 'string' ? 'string' : 'object') : 'null'
            });
            
            if (item && item.customizations && typeof item.customizations === 'string') {
              try {
                item.customizations = JSON.parse(item.customizations);
              } catch (e) {
                console.error('Error parsing item customizations:', e);
              }
            }
            return item;
          });

          // Parse JSON fields if they exist
          if (request.proformaQuoteData && typeof request.proformaQuoteData === 'string') {
            try {
              request.proformaQuoteData = JSON.parse(request.proformaQuoteData);
            } catch (e) {
              console.error('Error parsing proformaQuoteData:', e);
            }
          }
          if (request.proformaItemCosts && typeof request.proformaItemCosts === 'string') {
            try {
              request.proformaItemCosts = JSON.parse(request.proformaItemCosts);
            } catch (e) {
              console.error('Error parsing proformaItemCosts:', e);
            }
          }

          return {
            ...request,
            items: parsedItems
          };
        })
      );

      res.json({ success: true, data: requestsWithItems });
    } catch (error) {
      console.error('❌ Error getting user custom production requests:', error);
      res.status(500).json({ success: false, message: 'Error getting requests' });
    }
  });

  app.get('/api/custom-production-requests/:userKey/:requestId', async (req, res) => {
    try {
      const { userKey, requestId } = req.params;
      const numericRequestId = Number(requestId);
      if (!Number.isInteger(numericRequestId) || numericRequestId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
      }

      console.log(`🎨 Getting custom production request: ${requestId} for userKey: ${userKey}`);

      // Default tenant ID
      const tenantId = 1;
      let numericUserId;
      try {
        numericUserId = await resolveUserKeyToPk(userKey, tenantId);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid or unknown user' });
      }

      // Detect optional columns
      const [cols] = await poolWrapper.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
      `);
      const names = new Set(cols.map(c => c.COLUMN_NAME));
      const baseCols = [
        'id', 'userId', 'tenantId', 'status', 'totalQuantity', 'totalAmount', 'customerName', 'customerEmail', 
        'customerPhone', 'companyName', 'taxNumber', 'taxAddress', 'companyAddress', 'notes', 'createdAt'
      ];
      const optionalCols = [
        'quoteAmount', 'quoteCurrency', 'quoteNotes', 'quoteStatus', 'quotedAt', 'quoteValidUntil', 
        'proformaQuoteData', 'proformaItemCosts', 'proformaSharedShippingCost', 'proformaProfitMargin', 
        'proformaVatRate', 'proformaTotalWithVat', 'proformaQuotedAt', 'revisionNotes', 'revisionRequestedAt',
        'requestNumber', 'estimatedDeliveryDate', 'actualDeliveryDate', 'source'
      ];
      const selectCols = baseCols
        .concat(optionalCols.filter(n => names.has(n)))
        .join(', ');

      // Get request details
      const [requests] = await poolWrapper.execute(
        `SELECT ${selectCols} FROM custom_production_requests 
       WHERE id = ? AND userId = ? AND tenantId = ?`,
        [numericRequestId, numericUserId, tenantId]
      );

      if (requests.length === 0) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      const request = requests[0];

      // Get request items with product details
      const [items] = await poolWrapper.execute(`
      SELECT cpi.*, p.name as productName, p.image as productImage, p.price as productPrice
      FROM custom_production_items cpi
      LEFT JOIN products p ON cpi.productId = p.id AND p.tenantId = cpi.tenantId
      WHERE cpi.requestId = ? AND cpi.tenantId = ?
      ORDER BY cpi.createdAt
    `, [numericRequestId, tenantId]);

      // Parse JSON fields if they exist
      if (request.proformaQuoteData && typeof request.proformaQuoteData === 'string') {
        try {
          request.proformaQuoteData = JSON.parse(request.proformaQuoteData);
        } catch (e) {
          console.error('Error parsing proformaQuoteData:', e);
        }
      }
      if (request.proformaItemCosts && typeof request.proformaItemCosts === 'string') {
        try {
          request.proformaItemCosts = JSON.parse(request.proformaItemCosts);
        } catch (e) {
          console.error('Error parsing proformaItemCosts:', e);
        }
      }

      const formattedRequest = {
        ...request,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          productPrice: item.productPrice,
          quantity: item.quantity,
          customizations: typeof item.customizations === 'string' 
            ? JSON.parse(item.customizations) 
            : item.customizations
        }))
      };

      console.log(`✅ Found custom production request with ${items.length} items`);
      res.json({ success: true, data: formattedRequest });

    } catch (error) {
      console.error('❌ Error getting custom production request:', error);
      res.status(500).json({ success: false, message: 'Error getting custom production request' });
    }
  });

  // Create custom production request
  app.post('/api/custom-production-requests', async (req, res) => {
    try {
      const {
        userId,
        items,
        customerName,
        customerEmail,
        customerPhone,
        companyName,
        taxNumber,
        taxAddress,
        companyAddress,
        notes
      } = req.body;

      if (!userId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'User ID and items are required'
        });
      }

      if (!customerName || !customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Customer name and email are required'
        });
      }

      console.log(`🎨 Creating custom production request for user: ${userId}`);

      // Default tenant ID
      const tenantId = 1;

      // Generate request number
      const requestNumber = `CP${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Calculate total quantity and amount
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalAmount = items.reduce((sum, item) => {
        const price = item.productPrice || 0;
        const quantity = item.quantity || 0;
        return sum + (price * quantity);
      }, 0);

      const connection = await poolWrapper.getConnection();
      await connection.beginTransaction();

      try {
        // Ensure invoice columns exist (idempotent)
        const [cols] = await connection.execute(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
        `);
        const names = cols.map(c => c.COLUMN_NAME);
        const alters = [];
        if (!names.includes('companyName')) alters.push("ADD COLUMN companyName VARCHAR(255) NULL AFTER customerPhone");
        if (!names.includes('taxNumber')) alters.push("ADD COLUMN taxNumber VARCHAR(50) NULL AFTER companyName");
        if (!names.includes('taxAddress')) alters.push("ADD COLUMN taxAddress TEXT NULL AFTER taxNumber");
        if (!names.includes('companyAddress')) alters.push("ADD COLUMN companyAddress TEXT NULL AFTER taxAddress");
        if (alters.length > 0) {
          await connection.execute(`ALTER TABLE custom_production_requests ${alters.join(', ')}`);
        }

        // Create custom production request
        const { companyName, taxNumber, taxAddress, companyAddress } = req.body;
        const [requestResult] = await connection.execute(
          `INSERT INTO custom_production_requests 
         (tenantId, userId, requestNumber, status, totalQuantity, totalAmount, 
          customerName, customerEmail, customerPhone, companyName, taxNumber, taxAddress, companyAddress, notes) 
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tenantId, userId, requestNumber, totalQuantity, totalAmount,
            customerName, customerEmail, customerPhone || null, 
            companyName || null, taxNumber || null, taxAddress || null, companyAddress || null,
            notes || null]
        );

        const requestId = requestResult.insertId;

        // Create custom production items
        for (const item of items) {
          const customizationsJson = item.customizations 
            ? JSON.stringify(item.customizations) 
            : JSON.stringify({});
          
          if (!item.productId || !item.quantity) {
            throw new Error(`Invalid item data: productId=${item.productId}, quantity=${item.quantity}`);
          }
          
          await connection.execute(
            `INSERT INTO custom_production_items 
           (tenantId, requestId, productId, quantity, customizations) 
           VALUES (?, ?, ?, ?, ?)`,
            [tenantId, requestId, item.productId, item.quantity, customizationsJson]
          );
        }

        await connection.commit();
        connection.release();

        console.log(`✅ Custom production request created: ${requestNumber}`);
        res.json({
          success: true,
          message: 'Custom production request created successfully',
          data: {
            id: requestId,
            requestNumber: requestNumber,
            status: 'pending',
            totalQuantity: totalQuantity,
            totalAmount: totalAmount
          }
        });

      } catch (error) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('❌ Error rolling back transaction:', rollbackError);
        }
        connection.release();
        throw error;
      }

    } catch (error) {
      console.error('❌ Error creating custom production request:', error);
      const errorMessage = error.message || 'Error creating custom production request';
      const errorDetails = process.env.NODE_ENV === 'development' ? error.stack : undefined;
      res.status(500).json({ 
        success: false, 
        message: errorMessage,
        ...(errorDetails && { details: errorDetails })
      });
    }
  });

  // Update custom production request status (admin only)
  app.put('/api/custom-production-requests/:requestId/status', async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status, estimatedDeliveryDate, actualDeliveryDate, notes } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const validStatuses = ['pending', 'review', 'design', 'production', 'shipped', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      console.log(`🎨 Updating custom production request status: ${requestId} to ${status}`);

      // Default tenant ID
      const tenantId = 1;

      const updateFields = ['status = ?'];
      const params = [status, requestId, tenantId];

      if (estimatedDeliveryDate) {
        updateFields.push('estimatedDeliveryDate = ?');
        params.splice(-2, 0, estimatedDeliveryDate);
      }

      if (actualDeliveryDate) {
        updateFields.push('actualDeliveryDate = ?');
        params.splice(-2, 0, actualDeliveryDate);
      }

      if (notes) {
        updateFields.push('notes = ?');
        params.splice(-2, 0, notes);
      }

      const [result] = await poolWrapper.execute(
        `UPDATE custom_production_requests 
       SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ? AND tenantId = ?`,
        params
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      console.log(`✅ Custom production request status updated: ${requestId}`);
      res.json({ success: true, message: 'Status updated successfully' });

    } catch (error) {
      console.error('❌ Error updating custom production request status:', error);
      res.status(500).json({ success: false, message: 'Error updating status' });
    }
  });

  // Manual XML sync endpoint
  app.post('/api/sync/products', async (req, res) => {
    try {
      console.log('🔄 Manual XML sync triggered...');

      if (!xmlSyncService) {
        return res.status(500).json({
          success: false,
          message: 'XML sync service not initialized'
        });
      }

      // Trigger manual sync
      const started = Date.now();
      let message = 'OK';
      let success = true;
      try {
        await xmlSyncService.triggerManualSync();
      } catch (innerErr) {
        success = false;
        message = innerErr && innerErr.message ? innerErr.message : 'Unknown error';
        throw innerErr;
      } finally {
        try {
          const durationMs = Date.now() - started;
          global.__syncLogs = global.__syncLogs || [];
          global.__syncLogs.unshift({ startedAt: new Date(started).toISOString(), durationMs, success, message });
          if (global.__syncLogs.length > 50) global.__syncLogs.length = 50;
        } catch (logErr) { /* ignore */ }
      }

      res.json({
        success: true,
        message: 'Product sync completed successfully with updated price logic',
        timestamp: new Date().toISOString(),
        note: 'IndirimliFiyat = 0 ise SatisFiyati kullanıldı'
      });

    } catch (error) {
      console.error('❌ Error in manual sync:', error);
      res.status(500).json({
        success: false,
        message: 'Error during product sync: ' + error.message
      });
    }
  });

  // Sync status endpoint
  app.get('/api/sync/status', async (req, res) => {
    try {
      if (!xmlSyncService) {
        return res.json({ success: true, data: { isRunning: false, lastSyncTime: null } });
      }

      const status = xmlSyncService.getSyncStatus();
      res.json({
        success: true,
        data: {
          isRunning: status.isRunning || false,
          lastSyncTime: status.lastSyncTime || null,
          message: status.message || null
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Cannot get sync status' });
    }
  });

  // Sync progress endpoint
  app.get('/api/sync/progress', async (req, res) => {
    try {
      if (!xmlSyncService) {
        return res.json({ success: true, data: null });
      }

      const status = xmlSyncService.getSyncStatus();
      if (!status.isRunning) {
        return res.json({ success: true, data: null });
      }

      const stats = status.stats || {};
      const total = (stats.newProducts || 0) + (stats.updatedProducts || 0) + (stats.errors || 0);
      const current = stats.processedProducts || 0;
      const percentage = total > 0 ? (current / total) * 100 : 0;

      res.json({
        success: true,
        data: {
          current: current,
          total: total,
          percentage: Math.min(100, Math.max(0, percentage)),
          status: status.message || 'İşleniyor...',
          currentItem: stats.currentProduct || null,
          errors: stats.errors || 0
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Cannot get sync progress' });
    }
  });

  // Sync logs (admin)
  app.get('/api/admin/sync/logs', authenticateAdmin, async (req, res) => {
    try {
      const logs = Array.isArray(global.__syncLogs) ? global.__syncLogs : [];
      res.json({ success: true, data: logs });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Cannot load logs' });
    }
  });

  // ==================== CAMPAIGN MANAGEMENT API ====================

  // Admin - Get campaigns with pagination and filters (for admin panel)
  app.get('/api/campaigns', authenticateAdmin, async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);
      const q = (req.query.q || '').toString().trim();
      const status = (req.query.status || '').toString().trim();

      const whereClauses = [];
      const whereParams = [];
      if (q) {
        whereClauses.push('(c.name LIKE ? OR c.description LIKE ?)');
        whereParams.push(`%${q}%`, `%${q}%`);
      }
      if (status) {
        whereClauses.push('c.status = ?');
        whereParams.push(status);
      }
      const whereSQL = whereClauses.length ? ('WHERE ' + whereClauses.join(' AND ')) : '';

      const offset = (page - 1) * pageSize;

      // Count total
      const [countRows] = await poolWrapper.execute(
        `SELECT COUNT(*) as total FROM campaigns c ${whereSQL}`,
        whereParams
      );
      const total = countRows[0]?.total || 0;

      // Page data
      const [campaigns] = await poolWrapper.execute(
        `SELECT c.*, cs.name as segmentName
       FROM campaigns c
       LEFT JOIN customer_segments cs ON c.targetSegmentId = cs.id
       ${whereSQL}
       ORDER BY c.createdAt DESC
       LIMIT ? OFFSET ?`,
        [...whereParams, pageSize, offset]
      );

      res.json({
        success: true,
        data: campaigns,
        meta: { page, pageSize, total }
      });
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error);
      res.status(500).json({ success: false, message: 'Error fetching campaigns' });
    }
  });

  // Admin - Get all segments (for admin panel)
  app.get('/api/campaigns/segments', authenticateAdmin, async (req, res) => {
    try {
      const [segments] = await poolWrapper.execute(`
      SELECT cs.*, COUNT(csa.userId) as customerCount
      FROM customer_segments cs 
      LEFT JOIN customer_segment_assignments csa ON cs.id = csa.segmentId
      GROUP BY cs.id
      ORDER BY cs.createdAt DESC
    `);

      // Parse JSON criteria
      const parsedSegments = segments.map(segment => ({
        ...segment,
        criteria: JSON.parse(segment.criteria)
      }));

      res.json({
        success: true,
        data: parsedSegments
      });

    } catch (error) {
      console.error('❌ Error fetching customer segments:', error);
      res.status(500).json({ success: false, message: 'Error fetching customer segments' });
    }
  });

  // Admin - Create campaign
  app.post('/api/campaigns', authenticateAdmin, async (req, res) => {
    try {
      const { name, description, type, targetSegmentId, discountType, discountValue, minOrderAmount, startDate, endDate, usageLimit } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: 'Name and type are required'
        });
      }

      console.log('🎯 Creating campaign:', { name, type });

      const [result] = await poolWrapper.execute(
        'INSERT INTO campaigns (tenantId, name, description, type, targetSegmentId, discountType, discountValue, minOrderAmount, startDate, endDate, usageLimit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [1, name, description || '', type, targetSegmentId || null, discountType || 'percentage', discountValue || 0, minOrderAmount || 0, startDate || null, endDate || null, usageLimit || null]
      );

      res.json({
        success: true,
        message: 'Campaign created successfully',
        data: { campaignId: result.insertId }
      });

    } catch (error) {
      console.error('❌ Error creating campaign:', error);
      res.status(500).json({ success: false, message: 'Error creating campaign' });
    }
  });

  // Admin - Create segment
  app.post('/api/campaigns/segments', authenticateAdmin, async (req, res) => {
    try {
      const { name, description, criteria } = req.body;

      if (!name || !criteria) {
        return res.status(400).json({
          success: false,
          message: 'Name and criteria are required'
        });
      }

      console.log('🎯 Creating customer segment:', { name, criteria });

      const [result] = await poolWrapper.execute(
        'INSERT INTO customer_segments (tenantId, name, description, criteria) VALUES (?, ?, ?, ?)',
        [1, name, description || '', JSON.stringify(criteria)]
      );

      res.json({
        success: true,
        message: 'Customer segment created successfully',
        data: { segmentId: result.insertId }
      });

    } catch (error) {
      console.error('❌ Error creating customer segment:', error);
      res.status(500).json({ success: false, message: 'Error creating customer segment' });
    }
  });

  // Admin - Auto create segments
  app.post('/api/campaigns/segments/auto-create', authenticateAdmin, async (req, res) => {
    try {
      console.log('🤖 Creating automatic segments...');

      // Create RFM-based segments
      const rfmSegments = [
        {
          name: 'Champions',
          description: 'En değerli müşteriler - sık sık alışveriş yapan, yüksek harcama yapan müşteriler',
          criteria: { rfmScore: '555', minOrders: 10, minSpent: 2000 }
        },
        {
          name: 'Loyal Customers',
          description: 'Sadık müşteriler - düzenli alışveriş yapan müşteriler',
          criteria: { rfmScore: '444', minOrders: 5, minSpent: 1000 }
        },
        {
          name: 'Potential Loyalists',
          description: 'Potansiyel sadık müşteriler - düzenli alışveriş yapmaya başlayan müşteriler',
          criteria: { rfmScore: '333', minOrders: 3, minSpent: 500 }
        },
        {
          name: 'New Customers',
          description: 'Yeni müşteriler - henüz alışveriş geçmişi az olan müşteriler',
          criteria: { rfmScore: '222', maxOrders: 2, maxSpent: 500 }
        },
        {
          name: 'At Risk',
          description: 'Risk altındaki müşteriler - uzun süredir alışveriş yapmayan müşteriler',
          criteria: { lastOrderDays: 90, minOrders: 1 }
        }
      ];

      let segmentsCreated = 0;
      for (const segmentData of rfmSegments) {
        try {
          await poolWrapper.execute(
            'INSERT INTO customer_segments (tenantId, name, description, criteria) VALUES (?, ?, ?, ?)',
            [1, segmentData.name, segmentData.description, JSON.stringify(segmentData.criteria)]
          );
          segmentsCreated++;
        } catch (error) {
          console.log(`⚠️ Segment ${segmentData.name} already exists or error:`, error.message);
        }
      }

      res.json({
        success: true,
        message: `${segmentsCreated} otomatik segment oluşturuldu`,
        data: { segmentsCreated }
      });

    } catch (error) {
      console.error('❌ Error creating automatic segments:', error);
      res.status(500).json({ success: false, message: 'Error creating automatic segments' });
    }
  });

  // Customer Segments API (for tenants)
  app.post('/api/campaigns/segments', async (req, res) => {
    try {
      const { name, description, criteria } = req.body;

      if (!name || !criteria) {
        return res.status(400).json({
          success: false,
          message: 'Name and criteria are required'
        });
      }

      console.log('🎯 Creating customer segment:', { name, criteria });

      const [result] = await poolWrapper.execute(
        'INSERT INTO customer_segments (tenantId, name, description, criteria) VALUES (?, ?, ?, ?)',
        [req.tenant.id, name, description || '', JSON.stringify(criteria)]
      );

      res.json({
        success: true,
        message: 'Customer segment created successfully',
        data: { segmentId: result.insertId }
      });

    } catch (error) {
      console.error('❌ Error creating customer segment:', error);
      res.status(500).json({ success: false, message: 'Error creating customer segment' });
    }
  });

  app.get('/api/campaigns/segments', async (req, res) => {
    try {
      const [segments] = await poolWrapper.execute(
        'SELECT * FROM customer_segments WHERE tenantId = ? ORDER BY createdAt DESC',
        [req.tenant.id]
      );

      // Parse JSON criteria
      const parsedSegments = segments.map(segment => ({
        ...segment,
        criteria: JSON.parse(segment.criteria)
      }));

      res.json({
        success: true,
        data: parsedSegments
      });

    } catch (error) {
      console.error('❌ Error fetching customer segments:', error);
      res.status(500).json({ success: false, message: 'Error fetching customer segments' });
    }
  });

  // Campaigns API
  app.post('/api/campaigns', async (req, res) => {
    try {
      const {
        name, description, type, targetSegmentId, discountType, discountValue,
        minOrderAmount, maxDiscountAmount, applicableProducts, excludedProducts,
        startDate, endDate, usageLimit
      } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: 'Name and type are required'
        });
      }

      console.log('🎪 Creating campaign:', { name, type });

      const [result] = await poolWrapper.execute(
        `INSERT INTO campaigns (tenantId, name, description, type, targetSegmentId, discountType, 
       discountValue, minOrderAmount, maxDiscountAmount, applicableProducts, excludedProducts, 
       startDate, endDate, usageLimit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.tenant.id, name, description || '', type, targetSegmentId || null,
          discountType || 'percentage', discountValue || 0, minOrderAmount || 0,
          maxDiscountAmount || null, JSON.stringify(applicableProducts || []),
          JSON.stringify(excludedProducts || []), startDate || null, endDate || null,
          usageLimit || null
        ]
      );

      res.json({
        success: true,
        message: 'Campaign created successfully',
        data: { campaignId: result.insertId }
      });

    } catch (error) {
      console.error('❌ Error creating campaign:', error);
      res.status(500).json({ success: false, message: 'Error creating campaign' });
    }
  });

  app.get('/api/campaigns', async (req, res) => {
    try {
      const [campaigns] = await poolWrapper.execute(
        `SELECT c.*, cs.name as segmentName 
       FROM campaigns c 
       LEFT JOIN customer_segments cs ON c.targetSegmentId = cs.id 
       WHERE c.tenantId = ? 
       ORDER BY c.createdAt DESC`,
        [req.tenant.id]
      );

      // Parse JSON fields
      const parsedCampaigns = campaigns.map(campaign => ({
        ...campaign,
        applicableProducts: JSON.parse(campaign.applicableProducts || '[]'),
        excludedProducts: JSON.parse(campaign.excludedProducts || '[]')
      }));

      res.json({
        success: true,
        data: parsedCampaigns
      });

    } catch (error) {
      console.error('❌ Error fetching campaigns:', error);
      res.status(500).json({ success: false, message: 'Error fetching campaigns' });
    }
  });

  // Customer Analytics API
  app.get('/api/campaigns/analytics/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const internalUserId = await resolveInternalUserId(userId, req.tenant.id);
      if (!internalUserId) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Get or create customer analytics
      let [analytics] = await poolWrapper.execute(
        'SELECT * FROM customer_analytics WHERE userId = ? AND tenantId = ?',
        [internalUserId, req.tenant.id]
      );

      if (analytics.length === 0) {
        // Create new analytics record
        await poolWrapper.execute(
          `INSERT INTO customer_analytics (tenantId, userId, lastActivityDate) VALUES (?, ?, NOW())`,
          [req.tenant.id, internalUserId]
        );

        [analytics] = await poolWrapper.execute(
          'SELECT * FROM customer_analytics WHERE userId = ? AND tenantId = ?',
          [internalUserId, req.tenant.id]
        );
      }

      const customerAnalytics = analytics[0];

      // Parse JSON fields
      customerAnalytics.favoriteCategories = JSON.parse(customerAnalytics.favoriteCategories || '[]');
      customerAnalytics.favoriteBrands = JSON.parse(customerAnalytics.favoriteBrands || '[]');

      res.json({
        success: true,
        data: customerAnalytics
      });

    } catch (error) {
      console.error('❌ Error fetching customer analytics:', error);
      res.status(500).json({ success: false, message: 'Error fetching customer analytics' });
    }
  });

  // Recommendation system removed: /api/campaigns/recommendations is deprecated

  // Campaign Usage Tracking
  app.post('/api/campaigns/usage', async (req, res) => {
    try {
      const { campaignId, userId, orderId, discountAmount } = req.body;

      if (!campaignId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID and User ID are required'
        });
      }

      console.log('📊 Tracking campaign usage:', { campaignId, userId, orderId });

      await poolWrapper.execute(
        'INSERT INTO campaign_usage (tenantId, campaignId, userId, orderId, discountAmount) VALUES (?, ?, ?, ?, ?)',
        [req.tenant.id, campaignId, userId, orderId || null, discountAmount || 0]
      );

      // Update campaign usage count
      await poolWrapper.execute(
        'UPDATE campaigns SET usedCount = usedCount + 1 WHERE id = ? AND tenantId = ?',
        [campaignId, req.tenant.id]
      );

      res.json({
        success: true,
        message: 'Campaign usage tracked successfully'
      });

    } catch (error) {
      console.error('❌ Error tracking campaign usage:', error);
      res.status(500).json({ success: false, message: 'Error tracking campaign usage' });
    }
  });

  // Get available campaigns for user
  app.get('/api/campaigns/available/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      const [campaigns] = await poolWrapper.execute(
        `SELECT c.*, cs.name as segmentName
       FROM campaigns c
       LEFT JOIN customer_segments cs ON c.targetSegmentId = cs.id
       WHERE c.tenantId = ? 
       AND c.status = 'active' 
       AND c.isActive = true
       AND (c.startDate IS NULL OR c.startDate <= NOW())
       AND (c.endDate IS NULL OR c.endDate >= NOW())
       AND (c.usageLimit IS NULL OR c.usedCount < c.usageLimit)
       ORDER BY c.createdAt DESC`,
        [req.tenant.id]
      );

      // Filter campaigns based on user segments
      const userSegments = await poolWrapper.execute(
        'SELECT segmentId FROM customer_segment_assignments WHERE userId = ? AND tenantId = ?',
        [userId, req.tenant.id]
      );

      const userSegmentIds = userSegments.map(row => row.segmentId);

      const availableCampaigns = campaigns.filter(campaign => {
        // If no target segment, campaign is available to all
        if (!campaign.targetSegmentId) return true;

        // Check if user is in the target segment
        return userSegmentIds.includes(campaign.targetSegmentId);
      });

      // Parse JSON fields
      const parsedCampaigns = availableCampaigns.map(campaign => ({
        ...campaign,
        applicableProducts: JSON.parse(campaign.applicableProducts || '[]'),
        excludedProducts: JSON.parse(campaign.excludedProducts || '[]')
      }));

      res.json({
        success: true,
        data: parsedCampaigns
      });

    } catch (error) {
      console.error('❌ Error fetching available campaigns:', error);
      res.status(500).json({ success: false, message: 'Error fetching available campaigns' });
    }
  });

  // ==================== DISCOUNT WHEEL API ====================

  // Spin discount wheel
  app.post('/api/discount-wheel/spin', async (req, res) => {
    try {
      const { deviceId, ipAddress, userAgent } = req.body;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: 'Device ID is required'
        });
      }

      console.log('🎰 Spinning discount wheel for device:', deviceId);

      // Check if device already spun
      const [existingSpin] = await poolWrapper.execute(
        'SELECT * FROM discount_wheel_spins WHERE deviceId = ? AND tenantId = ?',
        [deviceId, req.tenant.id]
      );

      if (existingSpin.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu cihazdan zaten çark çevrilmiş',
          data: {
            alreadySpun: true,
            existingCode: existingSpin[0].discountCode,
            spinResult: existingSpin[0].spinResult,
            expiresAt: existingSpin[0].expiresAt
          }
        });
      }

      // Generate random discount (1%, 3%, 5%, 7%, 10%, 20%)
      // %10 ve %20'nin çıkma ihtimali 8 kat daha az
      const discountOptions = ['1', '3', '5', '7', '10', '20'];
      const probabilities = [25, 25, 25, 25, 3.125, 3.125]; // %10 ve %20: 8 kat daha az (25/8 = 3.125)

      const random = Math.random() * 100;
      let cumulativeProbability = 0;
      let selectedDiscount = '1';

      for (let i = 0; i < discountOptions.length; i++) {
        cumulativeProbability += probabilities[i];
        if (random <= cumulativeProbability) {
          selectedDiscount = discountOptions[i];
          break;
        }
      }

      // Generate unique discount code
      const discountCode = `WHEEL${selectedDiscount}${Date.now().toString().slice(-6)}`;

      // Set expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Save spin result
      const [result] = await poolWrapper.execute(
        `INSERT INTO discount_wheel_spins 
       (tenantId, deviceId, ipAddress, userAgent, spinResult, discountCode, expiresAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.tenant.id, deviceId, ipAddress || '', userAgent || '', selectedDiscount, discountCode, expiresAt]
      );

      // If user is logged in, also save to user discount codes
      if (req.body.userId) {
        await poolWrapper.execute(
          `INSERT INTO user_discount_codes 
         (tenantId, userId, discountCode, discountType, discountValue, expiresAt) 
         VALUES (?, ?, ?, 'percentage', ?, ?)`,
          [req.tenant.id, req.body.userId, discountCode, selectedDiscount, expiresAt]
        );
      }

      console.log(`✅ Discount wheel spun: ${selectedDiscount}% discount, code: ${discountCode}`);

      res.json({
        success: true,
        message: 'Çark başarıyla çevrildi!',
        data: {
          spinResult: selectedDiscount,
          discountCode,
          expiresAt: expiresAt.toISOString(),
          discountType: 'percentage',
          discountValue: selectedDiscount
        }
      });

    } catch (error) {
      console.error('❌ Error spinning discount wheel:', error);
      res.status(500).json({ success: false, message: 'Çark çevrilirken hata oluştu' });
    }
  });

  // Get user discount codes
  app.get('/api/discount-codes/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      const [codes] = await poolWrapper.execute(
        `SELECT * FROM user_discount_codes 
       WHERE userId = ? AND tenantId = ? 
       ORDER BY createdAt DESC`,
        [userId, req.tenant.id]
      );

      res.json({
        success: true,
        data: codes
      });

    } catch (error) {
      console.error('❌ Error fetching discount codes:', error);
      res.status(500).json({ success: false, message: 'İndirim kodları alınırken hata oluştu' });
    }
  });

  // Validate discount code
  app.post('/api/discount-codes/validate', async (req, res) => {
    try {
      const { discountCode, userId, orderAmount } = req.body;

      if (!discountCode || !userId || !orderAmount) {
        return res.status(400).json({
          success: false,
          message: 'Discount code, user ID, and order amount are required'
        });
      }

      // Find the discount code
      const [codes] = await poolWrapper.execute(
        `SELECT * FROM user_discount_codes 
       WHERE discountCode = ? AND userId = ? AND tenantId = ? 
       AND isUsed = false AND expiresAt > NOW()`,
        [discountCode, userId, req.tenant.id]
      );

      if (codes.length === 0) {
        return res.json({
          success: false,
          message: 'Geçersiz veya süresi dolmuş indirim kodu'
        });
      }

      const code = codes[0];

      // Check minimum order amount
      if (orderAmount < code.minOrderAmount) {
        return res.json({
          success: false,
          message: `Minimum sipariş tutarı ${code.minOrderAmount} TL olmalı`
        });
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (code.discountType === 'percentage') {
        discountAmount = (orderAmount * code.discountValue) / 100;
      } else {
        discountAmount = code.discountValue;
      }

      // Apply maximum discount limit
      if (code.maxDiscountAmount && discountAmount > code.maxDiscountAmount) {
        discountAmount = code.maxDiscountAmount;
      }

      // Can't discount more than order amount
      discountAmount = Math.min(discountAmount, orderAmount);

      res.json({
        success: true,
        data: {
          discountAmount,
          discountType: code.discountType,
          discountValue: code.discountValue,
          finalAmount: orderAmount - discountAmount
        }
      });

    } catch (error) {
      console.error('❌ Error validating discount code:', error);
      res.status(500).json({ success: false, message: 'İndirim kodu doğrulanırken hata oluştu' });
    }
  });

  // Use discount code
  app.post('/api/discount-codes/use', async (req, res) => {
    try {
      const { discountCode, userId, orderId } = req.body;

      if (!discountCode || !userId || !orderId) {
        return res.status(400).json({
          success: false,
          message: 'Discount code, user ID, and order ID are required'
        });
      }

      // Mark code as used
      const [result] = await poolWrapper.execute(
        `UPDATE user_discount_codes 
       SET isUsed = true, usedAt = NOW(), orderId = ? 
       WHERE discountCode = ? AND userId = ? AND tenantId = ? AND isUsed = false`,
        [orderId, discountCode, userId, req.tenant.id]
      );

      if (result.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'İndirim kodu bulunamadı veya zaten kullanılmış'
        });
      }

      res.json({
        success: true,
        message: 'İndirim kodu başarıyla kullanıldı'
      });

    } catch (error) {
      console.error('❌ Error using discount code:', error);
      res.status(500).json({ success: false, message: 'İndirim kodu kullanılırken hata oluştu' });
    }
  });

  // Check if device can spin
  app.get('/api/discount-wheel/check/:deviceId', async (req, res) => {
    try {
      const { deviceId } = req.params;

      const [existingSpin] = await poolWrapper.execute(
        'SELECT * FROM discount_wheel_spins WHERE deviceId = ? AND tenantId = ?',
        [deviceId, req.tenant.id]
      );

      if (existingSpin.length > 0) {
        const spin = existingSpin[0];
        return res.json({
          success: true,
          data: {
            canSpin: false,
            alreadySpun: true,
            existingCode: spin.discountCode,
            spinResult: spin.spinResult,
            expiresAt: spin.expiresAt,
            isUsed: spin.isUsed
          }
        });
      }

      res.json({
        success: true,
        data: {
          canSpin: true,
          alreadySpun: false
        }
      });

    } catch (error) {
      console.error('❌ Error checking discount wheel:', error);
      res.status(500).json({ success: false, message: 'Çark durumu kontrol edilirken hata oluştu' });
    }
  });

  // ==================== CHATBOT API ENDPOINTS ====================

  // Chatbot mesaj işleme endpoint'i
  app.post('/api/chatbot/message', async (req, res) => {
    try {
      const { message, actionType = 'text', userId, productId } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mesaj boş olamaz'
        });
      }

      // Tenant kontrolü
      const tenantId = req.tenant?.id || 1;

      console.log('🤖 Chatbot mesaj alındı:', { message, actionType, userId, productId, tenantId });

      // Intent tespiti
      const intent = detectChatbotIntent(message.toLowerCase());
      console.log('🎯 Tespit edilen intent:', intent);

      // Ürün bilgilerini al (eğer productId varsa)
      let productInfo = null;
      if (productId) {
        try {
          const [productRows] = await poolWrapper.execute(
            'SELECT id, name, price, image FROM products WHERE id = ? AND tenantId = ? LIMIT 1',
            [productId, tenantId]
          );
          if (productRows.length > 0) {
            productInfo = {
              id: productRows[0].id,
              name: productRows[0].name,
              price: productRows[0].price,
              image: productRows[0].image
            };
          }
        } catch (err) {
          console.warn('⚠️ Ürün bilgisi alınamadı:', err.message);
        }
      }

      // Yanıt oluştur
      let response;
      try {
        response = await generateChatbotResponse(intent, message, actionType, tenantId);
      } catch (responseError) {
        console.error('❌ Yanıt oluşturma hatası:', responseError);
        // Fallback yanıt
        response = {
          id: `bot-${Date.now()}`,
          text: '🤔 Üzgünüm, şu anda yanıt veremiyorum. Lütfen tekrar deneyin veya canlı desteğe bağlanın.',
          isBot: true,
          timestamp: new Date(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🔄 Tekrar Dene', action: 'retry' },
            { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
          ]
        };
      }

      // Analitik verilerini kaydet (ürün bilgileri ile)
      try {
        await poolWrapper.execute(
          `INSERT INTO chatbot_analytics (tenantId, userId, message, intent, productId, productName, productPrice, productImage, timestamp) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            tenantId,
            userId || null,
            message.substring(0, 100),
            intent,
            productInfo?.id || null,
            productInfo?.name || null,
            productInfo?.price || null,
            productInfo?.image || null
          ]
        );
      } catch (analyticsError) {
        console.warn('⚠️ Chatbot analytics kaydedilemedi:', analyticsError.message);
      }

      res.json({
        success: true,
        data: response
      });

    } catch (error) {
      console.error('❌ Chatbot mesaj işleme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Mesaj işlenirken hata oluştu',
        data: {
          id: `bot-error-${Date.now()}`,
          text: '😔 Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin veya canlı desteğe bağlanın.',
          isBot: true,
          timestamp: new Date(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🔄 Tekrar Dene', action: 'retry' },
            { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
          ]
        }
      });
    }
  });

  // Chatbot analitik endpoint'i
  app.post('/api/chatbot/analytics', async (req, res) => {
    try {
      const { userId, message, intent, satisfaction, productId, productName, productPrice, productImage } = req.body;

      // Tenant kontrolü
      const tenantId = req.tenant?.id || 1;

      // Analitik verilerini kaydet
      await poolWrapper.execute(
        `INSERT INTO chatbot_analytics (userId, tenantId, message, intent, satisfaction, productId, productName, productPrice, productImage, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId || null,
          tenantId,
          message?.substring(0, 100) || null,
          intent || 'unknown',
          satisfaction || null,
          productId || null,
          productName || null,
          productPrice || null,
          productImage || null
        ]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Chatbot analitik hatası:', error);
      res.status(500).json({ success: false, message: 'Analitik kaydedilemedi' });
    }
  });
  
  // Admin - Chatbot konuşmalarını getir (ürün bilgileri ile)
  app.get('/api/admin/chatbot/conversations', authenticateAdmin, async (req, res) => {
    try {
      const tenantId = req.tenant?.id || 1;
      
      const [rows] = await poolWrapper.execute(`
        SELECT 
          ca.id,
          ca.userId,
          u.name as userName,
          u.email as userEmail,
          u.phone as userPhone,
          ca.message,
          ca.intent,
          ca.satisfaction,
          ca.productId,
          ca.productName,
          ca.productPrice,
          ca.productImage,
          ca.timestamp,
          p.name as productFullName,
          p.price as productFullPrice,
          p.image as productFullImage
        FROM chatbot_analytics ca
        LEFT JOIN users u ON ca.userId = u.id AND u.tenantId = ca.tenantId
        LEFT JOIN products p ON ca.productId = p.id AND p.tenantId = ca.tenantId
        WHERE ca.tenantId = ?
        ORDER BY ca.timestamp DESC
        LIMIT 500
      `, [tenantId]);

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('❌ Chatbot konuşmaları getirme hatası:', error);
      res.status(500).json({ success: false, message: 'Konuşmalar getirilemedi' });
    }
  });

  // Admin - Chatbot mesaj gönder
  app.post('/api/admin/chatbot/send-message', authenticateAdmin, async (req, res) => {
    try {
      const { userId, message, conversationId } = req.body;

      if (!userId || !message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'userId ve message gerekli'
        });
      }

      // Tenant kontrolü
      const tenantId = req.tenant?.id || 1;

      // Kullanıcı kontrolü (aynı tenant'ta mı?)
      const [userCheck] = await poolWrapper.execute(
        'SELECT id FROM users WHERE id = ? AND tenantId = ? LIMIT 1',
        [userId, tenantId]
      );

      if (userCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      // Kullanıcıya mesaj kaydet
      await poolWrapper.execute(
        `INSERT INTO chatbot_analytics (tenantId, userId, message, intent, timestamp) 
         VALUES (?, ?, ?, ?, NOW())`,
        [
          tenantId,
          userId,
          message.substring(0, 1000),
          'admin_message'
        ]
      );

      res.json({
        success: true,
        message: 'Mesaj gönderildi'
      });
    } catch (error) {
      console.error('❌ Admin mesaj gönderme hatası:', error);
      res.status(500).json({ success: false, message: 'Mesaj gönderilemedi' });
    }
  });

  // Kullanıcı - Admin mesajlarını getir
  app.get('/api/chatbot/admin-messages/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId || userId <= 0) {
        return res.status(400).json({ success: false, message: 'Geçersiz userId' });
      }

      // Tenant kontrolü (kullanıcının tenant'ı)
      const [userRow] = await poolWrapper.execute(
        'SELECT tenantId FROM users WHERE id = ? LIMIT 1',
        [userId]
      );

      const tenantId = userRow.length > 0 ? userRow[0].tenantId : 1;

      const [rows] = await poolWrapper.execute(
        `SELECT id, message, timestamp 
         FROM chatbot_analytics 
         WHERE userId = ? AND tenantId = ? AND intent = 'admin_message' AND timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)
         ORDER BY timestamp DESC
         LIMIT 50`,
        [userId, tenantId]
      );

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('❌ Admin mesajları getirme hatası:', error);
      res.status(500).json({ success: false, message: 'Mesajlar getirilemedi' });
    }
  });

  // Admin mesajını okundu olarak işaretle
  app.post('/api/chatbot/admin-messages/:messageId/read', async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      // Bu endpoint şimdilik sadece log için, ileride okundu durumu takibi için kullanılabilir
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  });

  // Chatbot FAQ endpoint'i
  app.get('/api/chatbot/faq', async (req, res) => {
    try {
      const faqData = {
        'sipariş nasıl takip': 'Siparişinizi takip etmek için "Hesabım > Siparişlerim" bölümüne gidin veya sipariş numaranızla takip yapın.',
        'kargo ücreti': '150 TL ve üzeri alışverişlerde kargo ücretsizdir. Altındaki siparişler için 19,90 TL kargo ücreti alınır.',
        'iade nasıl': 'Ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade edebilirsiniz. "İade Taleplerim" bölümünden işlem yapın.',
        'ödeme yöntemleri': 'Kredi kartı, banka kartı, havale/EFT seçenekleri mevcuttur. Kapıda ödeme bulunmamaktadır.',
        'teslimat süresi': 'Stokta bulunan ürünler 1-3 iş günü içinde kargoya verilir. Teslimat süresi 1-5 iş günüdür.',
        'taksit': 'Kredi kartınızla 2, 3, 6, 9 ve 12 aya varan taksit seçenekleri kullanabilirsiniz.',
        'şifre unuttum': 'Giriş ekranında "Şifremi Unuttum" linkine tıklayın ve e-posta adresinizi girin.',
        'stok': 'Ürün sayfasında stok durumu gösterilir. Stokta olmayan ürünler için "Stok gelince haber ver" seçeneğini kullanın.',
        // Hpay+ kısa bilgiler
        'hpay+ nedir': 'Hpay+, başarılı her alışverişten otomatik olarak %3 oranında kazandığınız cüzdan puanıdır.',
        'hpay+ nasıl kazanılır': 'Ödeme onaylandığında sipariş tutarınızın %3’ü Hpay+ olarak cüzdanınıza eklenir ve işlem geçmişinde görünür.',
        'hpay+ nerede görünür': 'Cüzdan sayfasındaki Hpay+ Bakiyesi ve Hpay+ Kazanç alanlarında ve işlem geçmişinde mor yıldız ile görünür.'
      };

      res.json({
        success: true,
        data: faqData
      });
    } catch (error) {
      console.error('❌ FAQ yükleme hatası:', error);
      res.status(500).json({ success: false, message: 'FAQ yüklenemedi' });
    }
  });

  // Chatbot intent tespit fonksiyonu
  function detectChatbotIntent(message) {
    const intents = {
      greeting: ['merhaba', 'selam', 'hey', 'hi', 'hello', 'iyi günler', 'günaydın', 'iyi akşamlar'],
      order_tracking: ['sipariş', 'takip', 'nerede', 'kargo', 'teslimat', 'sipariş takibi', 'siparişim'],
      product_search: ['ürün', 'arama', 'bul', 'var mı', 'stok', 'fiyat', 'ürün arama'],
      campaigns: ['kampanya', 'indirim', 'kupon', 'çek', 'promosyon', 'fırsat', 'özel teklif'],
      recommendations: ['öneri', 'bana ne önerirsin', 'ne alsam', 'beni tanı', 'kişisel öneri', 'kişiselleştir'],
      support: ['yardım', 'destek', 'problem', 'sorun', 'şikayet', 'canlı destek'],
      payment: ['ödeme', 'para', 'kredi kartı', 'banka', 'ücret', 'fatura', 'taksit'],
      return: ['iade', 'değişim', 'geri', 'kusur', 'hasarlı', 'yanlış'],
      shipping: ['kargo', 'teslimat', 'gönderim', 'ulaştırma', 'adres'],
      account: ['hesap', 'profil', 'şifre', 'giriş', 'kayıt', 'üyelik'],
      goodbye: ['görüşürüz', 'hoşça kal', 'bye', 'teşekkür', 'sağ ol', 'kapanış']
    };

    // Sipariş numarası tespiti
    if (/\b\d{5,}\b/.test(message)) {
      return 'order_number';
    }

    // Intent tespiti
    for (const [intent, keywords] of Object.entries(intents)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          return intent;
        }
      }
    }

    // Ürün arama tespiti
    if (message.length > 3) {
      return 'product_search_query';
    }

    return 'unknown';
  }

  // Chatbot yanıt oluşturma fonksiyonu
  async function generateChatbotResponse(intent, message, actionType, tenantId) {
    const timestamp = new Date();
    const messageId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Özel eylem tipleri
    if (actionType !== 'text') {
      return await handleSpecialChatbotAction(actionType, message, messageId, timestamp, tenantId);
    }

    // Intent'e göre yanıt oluştur
    switch (intent) {
      case 'order_number':
        return await handleOrderTracking(message, tenantId);

      case 'product_search_query':
        return await handleProductSearch(message, tenantId);

      case 'campaigns':
        return await handleCampaigns(tenantId);

      case 'recommendations':
        return await handleRecommendations(tenantId);

      case 'unknown':
        return {
          id: messageId,
          text: '🤔 Tam olarak anlayamadım. Size nasıl yardımcı olabileceğimi belirtir misiniz?',
          isBot: true,
          timestamp,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
            { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
            { id: '4', text: '❓ S.S.S.', action: 'faq' }
          ]
        };

      default:
        return getQuickResponse(intent, messageId, timestamp);
    }
  }

  // Hızlı yanıt fonksiyonu
  function getQuickResponse(intent, messageId, timestamp) {
    const quickResponses = {
      greeting: {
        text: '👋 Merhaba! Size nasıl yardımcı olabilirim?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
          { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
          { id: '3', text: '❓ S.S.S.', action: 'faq' },
          { id: '4', text: '🎧 Canlı Destek', action: 'live_support' }
        ]
      },
      order_tracking: {
        text: '📦 Sipariş takibi için sipariş numaranızı paylaşabilir misiniz? Veya "Siparişlerim" sayfasından tüm siparişlerinizi görüntüleyebilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📋 Siparişlerim', action: 'view_orders' },
          { id: '2', text: '🔢 Numara Gir', action: 'enter_order_number' },
          { id: '3', text: '📞 Destek Çağır', action: 'live_support' }
        ]
      },
      product_search: {
        text: '🔍 Hangi ürünü arıyorsunuz? Ürün adını yazabilir veya kategorilere göz atabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
          { id: '2', text: '🎯 Avcılık', action: 'search_category_avcilik' },
          { id: '3', text: '🎣 Balıkçılık', action: 'search_category_balik' },
          { id: '4', text: '👕 Giyim', action: 'search_category_giyim' }
        ]
      },
      support: {
        text: '🎧 Size nasıl yardımcı olabilirim? Sorununuzu açıklayabilir veya canlı desteğe bağlanabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📞 Canlı Destek', action: 'live_support' },
          { id: '2', text: '📧 E-posta Gönder', action: 'email_support' },
          { id: '3', text: '❓ S.S.S.', action: 'faq' },
          { id: '4', text: '📱 WhatsApp', action: 'whatsapp_support' }
        ]
      }
    };

    const response = quickResponses[intent] || quickResponses.greeting;
    return {
      id: messageId,
      text: response.text,
      isBot: true,
      timestamp,
      type: response.type || 'text',
      quickReplies: response.quickReplies
    };
  }

  // Sipariş takibi fonksiyonu
  async function handleOrderTracking(message, tenantId) {
    const orderNumber = message.match(/\b\d{5,}\b/)?.[0];

    if (orderNumber) {
      try {
        const [rows] = await poolWrapper.execute(
          'SELECT * FROM orders WHERE id = ? AND tenantId = ?',
          [orderNumber, tenantId]
        );

        if (rows.length > 0) {
          const order = rows[0];
          const statusText = getOrderStatusText(order.status);
          const trackingInfo = order.trackingNumber ? `\n📋 Takip No: ${order.trackingNumber}` : '';

          return {
            id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: `📦 Sipariş #${orderNumber}\n\n🚚 Durum: ${statusText}${trackingInfo}\n💰 Tutar: ₺${(Number(order.totalAmount) || 0).toFixed(2)}\n📅 Tarih: ${new Date(order.createdAt).toLocaleDateString('tr-TR')}`,
            isBot: true,
            timestamp: new Date(),
            type: 'quick_reply',
            quickReplies: [
              { id: '1', text: '🔍 Detay Gör', action: 'order_detail', data: { orderId: orderNumber } },
              { id: '2', text: '📞 Kargo Şirketi', action: 'cargo_contact' },
              { id: '3', text: '📋 Tüm Siparişler', action: 'view_orders' }
            ]
          };
        } else {
          return {
            id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: `❌ ${orderNumber} numaralı sipariş bulunamadı. Sipariş numaranızı kontrol edin veya giriş yaparak siparişlerinizi görüntüleyin.`,
            isBot: true,
            timestamp: new Date(),
            type: 'quick_reply',
            quickReplies: [
              { id: '1', text: '📋 Siparişlerime Git', action: 'navigate_orders' },
              { id: '2', text: '🔢 Başka Numara', action: 'enter_order_number' },
              { id: '3', text: '🎧 Canlı Destek', action: 'live_support' }
            ]
          };
        }
      } catch (error) {
        return {
          id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: '❌ Sipariş sorgulanırken bir hata oluştu. Lütfen tekrar deneyin veya canlı destek ile iletişime geçin.',
          isBot: true,
          timestamp: new Date(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🔄 Tekrar Dene', action: 'order_tracking' },
            { id: '2', text: '📋 Siparişlerim', action: 'view_orders' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' }
          ]
        };
      }
    }

    return getQuickResponse('order_tracking', `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, new Date());
  }

  // Ürün arama fonksiyonu
  async function handleProductSearch(query, tenantId) {
    try {
      const [rows] = await poolWrapper.execute(
        `SELECT * FROM products 
       WHERE (name LIKE ? OR description LIKE ?) 
       AND tenantId = ? 
       AND isActive = 1 
       ORDER BY name 
       LIMIT 5`,
        [`%${query}%`, `%${query}%`, tenantId]
      );

      if (rows.length > 0) {
        const productList = rows.map(p =>
          `• ${p.name}\n  💰 ₺${Number(p.price || 0).toFixed(2)}\n  📦 Stok: ${p.stock > 0 ? 'Var' : 'Yok'}`
        ).join('\n\n');

        return {
          id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: `🔍 "${query}" için ${rows.length} ürün buldum:\n\n${productList}`,
          isBot: true,
          timestamp: new Date(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '👀 Tümünü Gör', action: 'view_products', data: { query } },
            { id: '2', text: '🔍 Yeni Arama', action: 'product_search' },
            { id: '3', text: '🛒 Kategoriler', action: 'view_categories' }
          ]
        };
      } else {
        return {
          id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: `😔 "${query}" için ürün bulunamadı. Farklı anahtar kelimeler deneyebilirsiniz.`,
          isBot: true,
          timestamp: new Date(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🔍 Yeni Arama', action: 'product_search' },
            { id: '2', text: '🛒 Kategoriler', action: 'view_categories' },
            { id: '3', text: '🎧 Yardım İste', action: 'live_support' }
          ]
        };
      }
    } catch (error) {
      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: '❌ Ürün aramasında bir hata oluştu. Lütfen tekrar deneyin.',
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🔄 Tekrar Dene', action: 'product_search' },
          { id: '2', text: '🎧 Canlı Destek', action: 'live_support' }
        ]
      };
    }
  }

  // Kampanya fonksiyonu
  async function handleCampaigns(tenantId) {
    try {
      const [rows] = await poolWrapper.execute(
        'SELECT * FROM campaigns WHERE tenantId = ? AND isActive = 1 ORDER BY createdAt DESC LIMIT 3',
        [tenantId]
      );

      if (rows.length === 0) {
        return {
          id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: 'Şu an aktif kampanya bulunamadı. Daha sonra tekrar kontrol edebilirsiniz.',
          isBot: true,
          timestamp: new Date(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '⭐ Öneriler', action: 'show_recommendations' },
            { id: '2', text: '🛒 Ürünlere Göz At', action: 'view_products' }
          ]
        };
      }

      const campaignList = rows.map(c => {
        const discount = c.discountType === 'percentage' ? `%${c.discountValue}` : `${c.discountValue} TL`;
        return `• ${c.name} (${discount})${c.minOrderAmount ? ` – Min. ₺${Number(c.minOrderAmount).toFixed(0)}` : ''}`;
      }).join('\n');

      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: `🎁 Aktif kampanyalar:\n\n${campaignList}`,
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '✅ Uygun muyum?', action: 'check_campaign_eligibility' },
          { id: '2', text: '🛒 Ürünler', action: 'view_products' },
          { id: '3', text: '🏠 Ana Menü', action: 'greeting' }
        ]
      };
    } catch (error) {
      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: 'Kampanyalar yüklenirken bir sorun oluştu. Daha sonra tekrar deneyin.',
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⭐ Öneriler', action: 'show_recommendations' },
          { id: '2', text: '🏠 Ana Menü', action: 'greeting' }
        ]
      };
    }
  }

  // Öneri fonksiyonu
  async function handleRecommendations(tenantId) {
    try {
      // Optimize: Sadece gerekli column'lar
      const [rows] = await poolWrapper.execute(
        'SELECT id, name, price, image, brand, category FROM products WHERE tenantId = ? ORDER BY RAND() LIMIT 3',
        [tenantId]
      );

      if (rows.length === 0) {
        return {
          id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: 'Şu an öneri oluşturamadım. Popüler ürünlere göz atabilirsiniz.',
          isBot: true,
          timestamp: new Date(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🛒 Popüler Ürünler', action: 'view_products' },
            { id: '2', text: '🏠 Ana Menü', action: 'greeting' }
          ]
        };
      }

      const productList = rows.map(p => `• ${p.name} – ₺${Number(p.price || 0).toFixed(2)}`).join('\n');

      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: `⭐ Size önerdiklerim:\n\n${productList}`,
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '👀 Tümünü Gör', action: 'view_products' },
          { id: '2', text: '🎁 Kampanyalarım', action: 'check_campaign_eligibility' },
          { id: '3', text: '🔍 Yeni Arama', action: 'product_search' }
        ]
      };
    } catch (error) {
      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: 'Öneriler yüklenirken bir problem oluştu. Daha sonra tekrar deneyin.',
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🛒 Popüler Ürünler', action: 'view_products' },
          { id: '2', text: '🏠 Ana Menü', action: 'greeting' }
        ]
      };
    }
  }

  // Özel eylem fonksiyonu
  async function handleSpecialChatbotAction(action, message, messageId, timestamp, tenantId) {
    const responses = {
      live_support: {
        text: '🎧 Canlı desteğe bağlanıyorsunuz... Ortalama bekleme süresi: 2-3 dakika\n\n📞 Telefon: 0530 312 58 13\n📱 WhatsApp: +90 530 312 58 13\n📧 E-posta: info@hugluoutdoor.com',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📞 Telefon Et', action: 'call_support' },
          { id: '2', text: '📱 WhatsApp', action: 'whatsapp_support' },
          { id: '3', text: '📧 E-posta', action: 'email_support' }
        ]
      },
      faq: {
        text: '❓ S.S.S. sayfamızda en sık sorulan soruların cevaplarını bulabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📖 S.S.S. Gör', action: 'view_faq' },
          { id: '2', text: '🔍 Soru Ara', action: 'search_faq' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' }
        ]
      },
      view_orders: {
        text: '📋 Siparişlerinizi görüntülemek için "Hesabım > Siparişlerim" sayfasına yönlendiriyorum.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📱 Siparişlerime Git', action: 'navigate_orders' },
          { id: '2', text: '🔢 Numara ile Ara', action: 'enter_order_number' }
        ]
      },
      enter_order_number: {
        text: '🔢 Sipariş numaranızı yazın (örn: 12345). Ben sizin için takip edeceğim!',
        type: 'text'
      }
    };

    const response = responses[action] || {
      text: '🤖 Bu özellik henüz geliştiriliyor. Canlı destek ile iletişime geçebilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎧 Canlı Destek', action: 'live_support' },
        { id: '2', text: '🏠 Ana Menü', action: 'greeting' }
      ]
    };

    return {
      id: messageId,
      text: response.text,
      isBot: true,
      timestamp,
      type: response.type || 'text',
      quickReplies: response.quickReplies
    };
  }

  // Sipariş durumu metni
  function getOrderStatusText(status) {
    const statusMap = {
      'pending': 'Beklemede',
      'confirmed': 'Onaylandı',
      'preparing': 'Hazırlanıyor',
      'shipped': 'Kargoda',
      'delivered': 'Teslim Edildi',
      'cancelled': 'İptal Edildi',
      'returned': 'İade Edildi'
    };
    return statusMap[status] || status;
  }

  // ==================== AI PROVIDERS ENDPOINTS ====================

  const aiProviderConfig = {
    enabled: false,
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    // Bellekte tutulan anahtarlar (örn. süreç ömrü boyunca). Production için gizli kasada saklayın.
    openaiKey: null,
    anthropicKey: null,
    googleKey: null
  };

  app.get('/api/ai/providers/config', (req, res) => {
    res.json(aiProviderConfig);
  });

  app.post('/api/ai/providers/config', (req, res) => {
    try {
      const { enabled, provider, model, temperature, maxTokens, apiKey } = req.body || {};
      aiProviderConfig.enabled = !!enabled;
      if (provider) aiProviderConfig.provider = provider;
      if (model) aiProviderConfig.model = model;
      if (typeof temperature === 'number') aiProviderConfig.temperature = temperature;
      if (typeof maxTokens === 'number') aiProviderConfig.maxTokens = maxTokens;
      // Sağlayıcıya göre anahtarı sakla
      if (apiKey && typeof apiKey === 'string') {
        if ((provider || aiProviderConfig.provider) === 'openai') aiProviderConfig.openaiKey = apiKey;
        if ((provider || aiProviderConfig.provider) === 'anthropic') aiProviderConfig.anthropicKey = apiKey;
        if ((provider || aiProviderConfig.provider) === 'google') aiProviderConfig.googleKey = apiKey;
      }
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, message: 'Config kaydedilemedi' });
    }
  });

  app.get('/api/ai/providers/models', (req, res) => {
    const provider = (req.query.provider || 'openai').toString();
    let models = [];
    if (provider === 'openai') models = ['gpt-4o-mini','gpt-4o','gpt-4.1'];
    else if (provider === 'anthropic') models = ['claude-3-5-sonnet','claude-3-haiku'];
    else if (provider === 'google') models = ['gemini-1.5-flash','gemini-1.5-pro'];
    res.json({ models });
  });

  app.post('/api/ai/providers/test', async (req, res) => {
    try {
      const { provider, apiKey } = req.body || {};
      if (!provider || !apiKey) return res.status(400).json({ success: false, message: 'provider ve apiKey zorunlu' });
      if (provider === 'openai' && !apiKey.startsWith('sk-')) return res.json({ success: false, message: 'OpenAI anahtarı geçersiz görünüyor' });
      if (provider === 'anthropic' && !apiKey.startsWith('sk-')) return res.json({ success: false, message: 'Anthropic anahtarı geçersiz görünüyor' });
      if (provider === 'google' && apiKey.length < 20) return res.json({ success: false, message: 'Google API anahtarı kısa görünüyor' });
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Test başarısız' });
    }
  });

  app.get('/api/ai/insights', (req, res) => {
    const insights = [
      { id: '1', type: 'opportunity', title: 'Yüksek Potansiyelli Müşteri Segmenti', description: '25-35 yaş arası segment fırsatı', impact: 'high', confidence: 87, category: 'customers', actionable: true, estimatedValue: 45000, timeframe: '30 gün', priority: 1, createdAt: new Date().toISOString(), tags: ['segmentasyon'] },
    ];
    const predictions = [
      { metric: 'Aylık Satış', currentValue: 125000, predictedValue: 142000, confidence: 82, timeframe: '30 gün', trend: 'up', factors: ['Sezonluk artış'] },
    ];
    const recommendations = [
      { id: '1', title: 'Akıllı Fiyatlandırma Sistemi', description: 'Dinamik fiyatlandırma ile artış', category: 'Sales', priority: 'high', effort: 'medium', impact: 'high', roi: 340, timeframe: '45 gün', status: 'pending' },
    ];
    res.json({ insights, predictions, recommendations });
  });

  app.post('/api/ai/generate', async (req, res) => {
    try {
      const { provider, apiKey, model, messages, temperature = 0.7, maxTokens = 2000 } = req.body || {};
      if (!provider || !model || !Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: 'provider, model ve messages zorunlu' });
      }
      // Anahtar yoksa config’ten kullan
      let effectiveKey = apiKey;
      if (!effectiveKey) {
        if (provider === 'openai') effectiveKey = aiProviderConfig.openaiKey;
        if (provider === 'anthropic') effectiveKey = aiProviderConfig.anthropicKey;
        if (provider === 'google') effectiveKey = aiProviderConfig.googleKey;
      }
      if (!effectiveKey) {
        return res.status(400).json({ success: false, message: 'API anahtarı bulunamadı. Ayarlar’dan ekleyin.' });
      }
      let resultText = '';
      if (provider === 'openai') {
        const r = await axios.post('https://api.openai.com/v1/chat/completions', {
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        }, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${effectiveKey}` }, timeout: 60000
        });
        resultText = r.data?.choices?.[0]?.message?.content || '';
      } else if (provider === 'anthropic') {
        const r = await axios.post('https://api.anthropic.com/v1/messages', {
          model,
          messages,
          max_tokens: maxTokens,
          temperature
        }, {
          headers: { 'Content-Type': 'application/json', 'x-api-key': effectiveKey, 'anthropic-version': '2023-06-01' }, timeout: 60000
        });
        resultText = r.data?.content?.[0]?.text || '';
      } else if (provider === 'google') {
        // Google Gemini - Google AI Platform (Generative Language) v1beta
        // Önerilen: API key'ı query yerine header'da gönder
        // Mesajları tek bir metin içine birleştir
        const joined = (messages || [])
          .map((m) => `${(m.role || 'user')}: ${m.content}`)
          .join('\n\n');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        const body = {
          contents: [
            {
              role: 'user',
              parts: [ { text: joined } ]
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens
          }
        };

        const r = await axios.post(url, body, {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': effectiveKey
          },
          timeout: 60000
        });
        resultText = r.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        return res.status(400).json({ success: false, message: 'Desteklenmeyen sağlayıcı' });
      }
      return res.json({ success: true, data: { text: resultText } });
    } catch (e) {
      const status = e?.response?.status || 500;
      const providerMsg = e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'İçerik üretilemedi';
      console.error('❌ AI generate error:', providerMsg);
      return res.status(status).json({ success: false, message: providerMsg });
    }
  });

  // ==================== WALLET RECHARGE API ENDPOINTS ====================

  // Cüzdan bakiyesi sorgulama
  app.get('/api/wallet/balance/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      // Resolve to internal numeric users.id to satisfy FK
      const internalUserId = await resolveInternalUserId(userId, req.tenant.id);
      if (!internalUserId) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      // Redis hot cache
      try {
        if (global.redis) {
          const cached = await global.redis.get(`wallet:balance:${req.tenant.id}:${internalUserId}`);
          if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true, source: 'redis' });
        }
      } catch { }

      const [rows] = await poolWrapper.execute('SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?', [internalUserId, req.tenant.id]);

      if (rows.length === 0) {
        // Cüzdan yoksa oluştur
        await poolWrapper.execute(
          'INSERT INTO user_wallets (userId, tenantId, balance) VALUES (?, ?, 0)',
          [internalUserId, req.tenant.id]
        );
        return res.json({ success: true, data: { balance: 0 } });
      }

      const data = { balance: rows[0].balance };
      try { if (global.redis) await global.redis.set(`wallet:balance:${req.tenant.id}:${internalUserId}`, JSON.stringify(data), 'EX', 120); } catch { }
      res.json({ success: true, data });
    } catch (error) {
      console.error('❌ Wallet balance error:', error);
      res.status(500).json({ success: false, message: 'Bakiye sorgulanırken hata oluştu' });
    }
  });

  // Cüzdan para yükleme isteği oluştur
  app.post('/api/wallet/recharge-request', validateUserIdMatch('body'), async (req, res) => {
    try {
      const { userId, amount, paymentMethod, bankInfo } = req.body;

      if (!userId || !amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Eksik parametreler'
        });
      }

      if (amount < 10 || amount > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Tutar 10-10000 TL arasında olmalıdır'
        });
      }

      const requestId = `RCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Recharge request kaydet
      await poolWrapper.execute(
        `INSERT INTO wallet_recharge_requests 
       (id, userId, tenantId, amount, paymentMethod, bankInfo, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [requestId, userId, req.tenant.id, amount, paymentMethod, JSON.stringify(bankInfo || {})]
      );

      if (paymentMethod === 'card') {
        // Kredi kartı için Iyzico entegrasyonu
        try {
          const iyzicoResponse = await processCardPayment(requestId, amount, userId);

          if (iyzicoResponse.success) {
            // Başarılı ödeme - bakiyeyi güncelle
            await updateWalletBalance(userId, req.tenant.id, amount, 'card_recharge', requestId);

            // Request durumunu güncelle
            await poolWrapper.execute(
              'UPDATE wallet_recharge_requests SET status = ?, completedAt = NOW() WHERE id = ?',
              ['completed', requestId]
            );

            return res.json({
              success: true,
              data: {
                requestId,
                status: 'completed',
                newBalance: await getWalletBalance(userId, req.tenant.id),
                message: 'Para yükleme başarılı!'
              }
            });
          } else {
            // Ödeme başarısız
            await poolWrapper.execute(
              'UPDATE wallet_recharge_requests SET status = ?, errorMessage = ? WHERE id = ?',
              ['failed', iyzicoResponse.message, requestId]
            );

            return res.json({
              success: false,
              message: iyzicoResponse.message
            });
          }
        } catch (error) {
          console.error('❌ Card payment error:', error);
          await poolWrapper.execute(
            'UPDATE wallet_recharge_requests SET status = ?, errorMessage = ? WHERE id = ?',
            ['failed', 'Kart ödemesinde hata oluştu', requestId]
          );

          return res.status(500).json({
            success: false,
            message: 'Kart ödemesinde hata oluştu'
          });
        }
      } else if (paymentMethod === 'bank_transfer') {
        // EFT/Havale onay bekliyor
        return res.json({
          success: true,
          data: {
            requestId,
            status: 'pending_approval',
            message: 'EFT/Havale bilgileri alındı. Onay bekleniyor.',
            bankInfo: getBankInfo(req.tenant.id)
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz ödeme yöntemi'
        });
      }
    } catch (error) {
      console.error('❌ Recharge request error:', error);
      res.status(500).json({ success: false, message: 'Para yükleme isteği oluşturulamadı' });
    }
  });

  // Manuel para yükleme onayı (admin paneli için)
  app.post('/api/wallet/approve-recharge', async (req, res) => {
    try {
      const { requestId, adminUserId } = req.body;

      if (!requestId || !adminUserId) {
        return res.status(400).json({
          success: false,
          message: 'Eksik parametreler'
        });
      }

      // Request'i bul
      const [rows] = await poolWrapper.execute(
        'SELECT * FROM wallet_recharge_requests WHERE id = ? AND tenantId = ? AND status = ?',
        [requestId, req.tenant.id, 'pending_approval']
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Onay bekleyen istek bulunamadı'
        });
      }

      const request = rows[0];

      // Bakiyeyi güncelle
      await updateWalletBalance(request.userId, req.tenant.id, request.amount, 'bank_transfer', requestId);

      // Request durumunu güncelle
      await poolWrapper.execute(
        'UPDATE wallet_recharge_requests SET status = ?, approvedBy = ?, completedAt = NOW() WHERE id = ?',
        ['completed', adminUserId, requestId]
      );

      res.json({
        success: true,
        data: {
          requestId,
          status: 'completed',
          message: 'Para yükleme onaylandı!'
        }
      });
    } catch (error) {
      console.error('❌ Approve recharge error:', error);
      res.status(500).json({ success: false, message: 'Onay işleminde hata oluştu' });
    }
  });

  // Bekleyen para yükleme isteklerini listele (admin paneli için)
  app.get('/api/wallet/pending-requests', async (req, res) => {
    try {
      const [rows] = await poolWrapper.execute(
        `SELECT r.*, u.name, u.email, u.phone 
       FROM wallet_recharge_requests r
       JOIN users u ON r.userId = u.id
       WHERE r.tenantId = ? AND r.status = 'pending_approval'
       ORDER BY r.createdAt DESC`,
        [req.tenant.id]
      );

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('❌ Pending requests error:', error);
      res.status(500).json({ success: false, message: 'Bekleyen istekler alınamadı' });
    }
  });

  // Cüzdan işlem geçmişi
  app.get('/api/wallet/transactions/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const [rows] = await poolWrapper.execute(
        `SELECT * FROM wallet_transactions 
       WHERE userId = ? AND tenantId = ?
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
        [userId, req.tenant.id, parseInt(limit), offset]
      );

      const [countRows] = await poolWrapper.execute(
        'SELECT COUNT(*) as total FROM wallet_transactions WHERE userId = ? AND tenantId = ?',
        [userId, req.tenant.id]
      );

      res.json({
        success: true,
        data: {
          transactions: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countRows[0].total,
            pages: Math.ceil(countRows[0].total / limit)
          }
        }
      });
    } catch (error) {
      console.error('❌ Wallet transactions error:', error);
      res.status(500).json({ success: false, message: 'İşlem geçmişi alınamadı' });
    }
  });

  // Yardımcı fonksiyonlar
  async function processCardPayment(requestId, amount, userId) {
    console.log('🔄 Processing card payment - NO CARD DATA STORED');
    console.log('⚠️ SECURITY: Card information is processed but NOT stored in database');

    try {
      // Iyzico entegrasyonu burada yapılacak
      // Kart bilgileri sadece ödeme işlemi için kullanılır, kayıt edilmez

      // Simüle edilmiş ödeme işlemi
      const paymentResult = {
        success: true,
        message: 'Ödeme başarılı',
        transactionId: `TXN-${Date.now()}`,
        amount: amount,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Payment processed successfully - card data discarded');
      return paymentResult;

    } catch (error) {
      console.error('❌ Card payment processing error:', error);
      return {
        success: false,
        message: 'Ödeme işlemi başarısız',
        error: error.message
      };
    }
  }

  async function updateWalletBalance(userId, tenantId, amount, type, referenceId) {
    // Mevcut bakiyeyi al
    const [walletRows] = await poolWrapper.execute(
      'SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?',
      [userId, tenantId]
    );

    const currentBalance = walletRows.length > 0 ? walletRows[0].balance : 0;
    const newBalance = currentBalance + amount;

    // Bakiyeyi güncelle veya oluştur
    await poolWrapper.execute(
      `INSERT INTO user_wallets (userId, tenantId, balance) 
     VALUES (?, ?, ?) 
     ON DUPLICATE KEY UPDATE balance = ?`,
      [userId, tenantId, newBalance, newBalance]
    );

    // İşlem kaydı oluştur
    await poolWrapper.execute(
      `INSERT INTO wallet_transactions 
     (userId, tenantId, type, amount, balance, referenceId, description, createdAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, tenantId, type, amount, newBalance, referenceId, `Cüzdan ${type} - ${amount} TL`]
    );
  }

  async function getWalletBalance(userId, tenantId) {
    const [rows] = await poolWrapper.execute(
      'SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?',
      [userId, tenantId]
    );
    return rows.length > 0 ? rows[0].balance : 0;
  }


  function getBankInfo(tenantId) {
    // Tenant'a özel banka bilgileri
    return {
      bankName: 'Huglu Outdoor Bankası',
      accountName: 'Huglu Outdoor Ltd. Şti.',
      accountNumber: '1234-5678-9012-3456',
      iban: 'TR12 0006 4000 0011 2345 6789 01',
      branchCode: '1234',
      swiftCode: 'HUGLTR2A'
    };
  }

  // ==================== REFERRAL ENDPOINTS ====================

  // Get user referral info
  app.get('/api/referral/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // Get user's referral code and stats
      const [userRows] = await poolWrapper.execute(
        'SELECT referral_code, referral_count, user_id FROM users WHERE id = ? AND tenantId = ?',
        [userId, req.tenant.id]
      );

      if (userRows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = userRows[0];

      // Get referral earnings
      const [earningsRows] = await poolWrapper.execute(
        'SELECT SUM(amount) as total_earnings FROM referral_earnings WHERE referrer_id = ? AND tenantId = ?',
        [userId, req.tenant.id]
      );

      const totalEarnings = earningsRows[0].total_earnings || 0;

      res.json({
        success: true,
        data: {
          referralCode: user.referral_code,
          referralCount: user.referral_count || 0,
          totalEarnings: totalEarnings,
          referralLink: `${process.env.FRONTEND_URL || 'https://hugluoutdoor.com'}/referral/${user.referral_code}`
        }
      });
    } catch (error) {
      console.error('Error getting referral info:', error);
      res.status(500).json({ success: false, message: 'Error getting referral info' });
    }
  });

  // Use referral code
  app.post('/api/referral/use', async (req, res) => {
    try {
      const { referralCode, userId } = req.body;

      // Check if referral code exists and is not self-referral
      const [referrerRows] = await poolWrapper.execute(
        'SELECT id, referral_code FROM users WHERE referral_code = ? AND tenantId = ?',
        [referralCode, req.tenant.id]
      );

      if (referrerRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid referral code' });
      }

      const referrerId = referrerRows[0].id;

      if (referrerId === userId) {
        return res.status(400).json({ success: false, message: 'Cannot refer yourself' });
      }

      // Check if user already used a referral code
      const [existingRows] = await poolWrapper.execute(
        'SELECT id FROM users WHERE id = ? AND referred_by IS NOT NULL AND tenantId = ?',
        [userId, req.tenant.id]
      );

      if (existingRows.length > 0) {
        return res.status(400).json({ success: false, message: 'User already used a referral code' });
      }

      // Update user with referral
      await poolWrapper.execute(
        'UPDATE users SET referred_by = ? WHERE id = ? AND tenantId = ?',
        [referrerId, userId, req.tenant.id]
      );

      // Update referrer's count
      await poolWrapper.execute(
        'UPDATE users SET referral_count = COALESCE(referral_count, 0) + 1 WHERE id = ? AND tenantId = ?',
        [referrerId, req.tenant.id]
      );

      // Add referral earnings
      const referralBonus = 50; // 50 TL bonus
      await poolWrapper.execute(
        'INSERT INTO referral_earnings (referrer_id, referred_id, amount, tenantId) VALUES (?, ?, ?, ?)',
        [referrerId, userId, referralBonus, req.tenant.id]
      );

      res.json({ success: true, message: 'Referral code applied successfully', bonus: referralBonus });
    } catch (error) {
      console.error('Error using referral code:', error);
      res.status(500).json({ success: false, message: 'Error using referral code' });
    }
  });

  // Generate referral code and link
  app.post('/api/referral/:userId/generate', async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user exists
      const [userRows] = await poolWrapper.execute(
        'SELECT id, referral_code FROM users WHERE id = ? AND tenantId = ?',
        [userId, req.tenant.id]
      );

      if (userRows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = userRows[0];

      // If user already has a referral code, return it
      if (user.referral_code) {
        const referralLink = `${process.env.FRONTEND_URL || 'https://hugluoutdoor.com'}/referral/${user.referral_code}`;
        return res.json({
          success: true,
          data: {
            code: user.referral_code,
            url: referralLink
          }
        });
      }

      // Generate new referral code
      const referralCode = `REF${userId}${Date.now().toString().slice(-6)}`;

      // Update user with referral code
      await poolWrapper.execute(
        'UPDATE users SET referral_code = ? WHERE id = ? AND tenantId = ?',
        [referralCode, userId, req.tenant.id]
      );

      const referralLink = `${process.env.FRONTEND_URL || 'https://hugluoutdoor.com'}/referral/${referralCode}`;

      res.json({
        success: true,
        data: {
          code: referralCode,
          url: referralLink
        }
      });
    } catch (error) {
      console.error('Error generating referral code:', error);
      res.status(500).json({ success: false, message: 'Error generating referral code' });
    }
  });

  // ==================== USER LEVEL SYSTEM API ====================

  // Get user level information
  app.get('/api/user-level/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // Get user's total EXP
      const [expRows] = await poolWrapper.execute(
        'SELECT SUM(amount) as total_exp FROM user_exp_transactions WHERE userId = ? AND tenantId = ?',
        [userId, req.tenant.id]
      );

      const totalExp = expRows[0].total_exp || 0;

      // Calculate level based on EXP
      const levels = [
        { id: 'bronze', name: 'bronze', displayName: 'Bronz', minExp: 0, maxExp: 1500, color: '#CD7F32', icon: 'medal', multiplier: 1.0 },
        { id: 'iron', name: 'iron', displayName: 'Demir', minExp: 1500, maxExp: 4500, color: '#C0C0C0', icon: 'shield', multiplier: 1.2 },
        { id: 'gold', name: 'gold', displayName: 'Altın', minExp: 4500, maxExp: 10500, color: '#FFD700', icon: 'star', multiplier: 1.5 },
        { id: 'platinum', name: 'platinum', displayName: 'Platin', minExp: 10500, maxExp: 22500, color: '#E5E4E2', icon: 'diamond', multiplier: 2.0 },
        { id: 'diamond', name: 'diamond', displayName: 'Elmas', minExp: 22500, maxExp: Infinity, color: '#B9F2FF', icon: 'diamond', multiplier: 3.0 }
      ];

      // Find current level
      let currentLevel = levels[0];
      for (let i = levels.length - 1; i >= 0; i--) {
        if (totalExp >= levels[i].minExp) {
          currentLevel = levels[i];
          break;
        }
      }

      // Find next level
      const nextLevel = levels.find(level => level.minExp > totalExp) || null;
      const expToNextLevel = nextLevel ? nextLevel.minExp - totalExp : 0;
      const progressPercentage = nextLevel ?
        Math.min(100, ((totalExp - currentLevel.minExp) / (nextLevel.minExp - currentLevel.minExp)) * 100) : 100;

      res.json({
        success: true,
        levelProgress: {
          currentLevel,
          nextLevel,
          currentExp: totalExp,
          expToNextLevel,
          progressPercentage,
          totalExp
        }
      });
    } catch (error) {
      console.error('Error getting user level:', error);
      res.status(500).json({ success: false, message: 'Error getting user level' });
    }
  });

  // Admin: Get EXP transactions for a user
  app.get('/api/admin/user-exp/:userId', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.tenant?.id || 1;
      const { limit = 50, offset = 0 } = req.query;
      const [rows] = await poolWrapper.execute(
        `SELECT id, source, amount, description, orderId, productId, timestamp
       FROM user_exp_transactions
       WHERE userId = ? AND tenantId = ?
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
        [userId, tenantId, parseInt(limit), parseInt(offset)]
      );
      const [[agg]] = await poolWrapper.execute(
        `SELECT COALESCE(SUM(amount),0) as totalExp FROM user_exp_transactions WHERE userId = ? AND tenantId = ?`,
        [userId, tenantId]
      );
      res.json({ success: true, data: { totalExp: Number(agg.totalExp || 0), transactions: rows } });
    } catch (error) {
      console.error('❌ Error getting user EXP:', error);
      res.status(500).json({ success: false, message: 'Error getting user EXP' });
    }
  });

  // Admin: Adjust EXP (add positive, subtract negative)
  app.post('/api/admin/user-exp/adjust', authenticateAdmin, async (req, res) => {
    try {
      const tenantId = req.tenant?.id || 1;
      const { userId, amount, description } = req.body || {};
      const adj = parseInt(amount, 10);
      if (!userId || !Number.isFinite(adj) || adj === 0) {
        return res.status(400).json({ success: false, message: 'userId and non-zero integer amount required' });
      }
      const source = adj >= 0 ? 'manual_add' : 'manual_remove';
      await poolWrapper.execute(
        `INSERT INTO user_exp_transactions (userId, tenantId, source, amount, description)
       VALUES (?, ?, ?, ?, ?)`,
        [String(userId), String(tenantId), source, Math.abs(adj) * (adj >= 0 ? 1 : -1), description || 'Admin manual EXP']
      );
      const [[agg]] = await poolWrapper.execute(
        `SELECT COALESCE(SUM(amount),0) as totalExp FROM user_exp_transactions WHERE userId = ? AND tenantId = ?`,
        [String(userId), String(tenantId)]
      );
      res.json({ success: true, message: 'EXP adjusted', data: { totalExp: Number(agg.totalExp || 0) } });
    } catch (error) {
      console.error('❌ Error adjusting EXP:', error);
      res.status(500).json({ success: false, message: 'Error adjusting EXP' });
    }
  });

  // Admin: List users with total EXP and derived level (paginated)
  app.get('/api/admin/user-levels', authenticateAdmin, async (req, res) => {
    try {
      const tenantId = req.tenant?.id || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const search = String(req.query.search || '').trim();

      // Base users query
      let usersQuery = `SELECT u.id, u.name, u.email FROM users u WHERE u.tenantId = ?`;
      const params = [tenantId];
      if (search) {
        usersQuery += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      usersQuery += ` ORDER BY u.id DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [users] = await poolWrapper.execute(usersQuery, params);

      // Fetch EXP totals for listed users
      const ids = users.map((u) => u.id);
      let expMap = new Map();
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',');
        const [expRows] = await poolWrapper.execute(
          `SELECT userId, COALESCE(SUM(amount),0) as totalExp
         FROM user_exp_transactions
         WHERE tenantId = ? AND userId IN (${placeholders})
         GROUP BY userId`,
          [tenantId, ...ids]
        );
        for (const r of expRows) expMap.set(Number(r.userId), Number(r.totalExp || 0));
      }

      // Level calculation consistent with single-user endpoint
      const levels = [
        { id: 'bronze', displayName: 'Bronz', minExp: 0, maxExp: 1500, color: '#CD7F32', multiplier: 1.0 },
        { id: 'iron', displayName: 'Demir', minExp: 1500, maxExp: 4500, color: '#C0C0C0', multiplier: 1.2 },
        { id: 'gold', displayName: 'Altın', minExp: 4500, maxExp: 10500, color: '#FFD700', multiplier: 1.5 },
        { id: 'platinum', displayName: 'Platin', minExp: 10500, maxExp: 22500, color: '#E5E4E2', multiplier: 2.0 },
        { id: 'diamond', displayName: 'Elmas', minExp: 22500, maxExp: Infinity, color: '#B9F2FF', multiplier: 3.0 }
      ];

      const data = users.map((u) => {
        const totalExp = expMap.get(Number(u.id)) || 0;
        let currentLevel = levels[0];
        for (let i = levels.length - 1; i >= 0; i--) {
          if (totalExp >= levels[i].minExp) { currentLevel = levels[i]; break; }
        }
        const nextLevel = levels.find(l => l.minExp > totalExp) || null;
        const expToNextLevel = nextLevel ? (nextLevel.minExp - totalExp) : 0;
        const progressPercentage = nextLevel ? Math.min(100, ((totalExp - currentLevel.minExp) / (nextLevel.minExp - currentLevel.minExp)) * 100) : 100;
        return { userId: u.id, name: u.name, email: u.email, totalExp, currentLevel, expToNextLevel, progressPercentage };
      });

      res.json({ success: true, data: { users: data, pagination: { limit, offset, count: data.length } } });
    } catch (error) {
      console.error('❌ Error listing user levels:', error);
      res.status(500).json({ success: false, message: 'Error listing user levels' });
    }
  });

  // Add EXP to user
  app.post('/api/user-level/:userId/add-exp', async (req, res) => {
    try {
      const { userId } = req.params;
      const { source, amount, description, orderId, productId } = req.body;

      // Insert EXP transaction
      await poolWrapper.execute(
        'INSERT INTO user_exp_transactions (userId, tenantId, source, amount, description, orderId, productId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, req.tenant.id, source, amount, description || '', orderId || null, productId || null]
      );

      res.json({
        success: true,
        message: 'EXP added successfully',
        expGained: amount
      });
    } catch (error) {
      console.error('Error adding EXP:', error);
      res.status(500).json({ success: false, message: 'Error adding EXP' });
    }
  });

  // Add social share EXP
  app.post('/api/user-level/:userId/social-share-exp', async (req, res) => {
    try {
      const { userId } = req.params;
      const { platform, productId, expGain } = req.body;

      const expAmount = 25; // Sosyal paylaşım için sabit 25 EXP

      // Insert EXP transaction
      await poolWrapper.execute(
        'INSERT INTO user_exp_transactions (userId, tenantId, source, amount, description, productId) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, req.tenant.id, 'social_share', expAmount, `Sosyal paylaşım: ${platform}`, productId || null]
      );

      res.json({
        success: true,
        message: 'Sosyal paylaşım EXP\'si başarıyla eklendi',
        expGained: expAmount
      });
    } catch (error) {
      console.error('Error adding social share EXP:', error);
      res.status(500).json({ success: false, message: 'Sosyal paylaşım EXP\'si eklenemedi' });
    }
  });

  // Get user EXP history
  app.get('/api/user-level/:userId/history', async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const [transactions] = await poolWrapper.execute(
        'SELECT * FROM user_exp_transactions WHERE userId = ? AND tenantId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [userId, req.tenant.id, parseInt(limit), offset]
      );

      const [totalRows] = await poolWrapper.execute(
        'SELECT COUNT(*) as total FROM user_exp_transactions WHERE userId = ? AND tenantId = ?',
        [userId, req.tenant.id]
      );

      res.json({
        success: true,
        transactions,
        total: totalRows[0].total,
        hasMore: offset + transactions.length < totalRows[0].total
      });
    } catch (error) {
      console.error('Error getting EXP history:', error);
      res.status(500).json({ success: false, message: 'Error getting EXP history' });
    }
  });

  // ==================== SOCIAL CAMPAIGNS API ====================

  // Get user social tasks
  app.get('/api/social-tasks/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // For now, return empty array - will be implemented with real data
      res.json({
        success: true,
        tasks: []
      });
    } catch (error) {
      console.error('Error getting social tasks:', error);
      res.status(500).json({ success: false, message: 'Error getting social tasks' });
    }
  });

  // Share to social media
  app.post('/api/social-tasks/:userId/share', async (req, res) => {
    try {
      const { userId } = req.params;
      const { platform, productId, shareText } = req.body;

      // Add EXP for social sharing
      await poolWrapper.execute(
        'INSERT INTO user_exp_transactions (userId, tenantId, source, amount, description, productId) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, req.tenant.id, 'social_share', 25, `Sosyal paylaşım: ${platform}`, productId || null]
      );

      res.json({
        success: true,
        message: 'Social share recorded successfully'
      });
    } catch (error) {
      console.error('Error recording social share:', error);
      res.status(500).json({ success: false, message: 'Error recording social share' });
    }
  });

  // Get group discounts
  app.get('/api/group-discounts/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // For now, return empty array - will be implemented with real data
      res.json({
        success: true,
        groups: []
      });
    } catch (error) {
      console.error('Error getting group discounts:', error);
      res.status(500).json({ success: false, message: 'Error getting group discounts' });
    }
  });

  // Get shopping competitions
  app.get('/api/competitions/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // For now, return empty array - will be implemented with real data
      res.json({
        success: true,
        competitions: []
      });
    } catch (error) {
      console.error('Error getting competitions:', error);
      res.status(500).json({ success: false, message: 'Error getting competitions' });
    }
  });

  // Get shared carts
  app.get('/api/cart-sharing/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // For now, return empty array - will be implemented with real data
      res.json({
        success: true,
        sharedCarts: []
      });
    } catch (error) {
      console.error('Error getting shared carts:', error);
      res.status(500).json({ success: false, message: 'Error getting shared carts' });
    }
  });

  // Get buy together offers
  app.get('/api/buy-together/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // For now, return empty array - will be implemented with real data
      res.json({
        success: true,
        offers: []
      });
    } catch (error) {
      console.error('Error getting buy together offers:', error);
      res.status(500).json({ success: false, message: 'Error getting buy together offers' });
    }
  });

  // ==================== DATABASE TABLES CREATION ====================


  const localIP = getLocalIPAddress();

  // Admin app'i mount et (admin-server)
  try {
    const adminApp = require('./admin-server');
    // Admin server kendi içinde '/api' prefix'iyle tanımlı.
    // Bu nedenle root'a mount ediyoruz ki yollar '/api/...' olarak kalsın.
    app.use('/', adminApp);
    console.log('✅ Admin API mounted at root (routes keep /api prefix)');
  } catch (e) {
    console.warn('⚠️ Admin API mount failed:', e.message);
  }

  // GÜVENLİK: Enhanced error handling middleware - Production'da error detayları gizlenir
  app.use((error, req, res, next) => {
    // GÜVENLİK: Error logging - Detaylı bilgiler sadece loglara yazılır
    logError(error, req.path || 'UNKNOWN_ROUTE');

    // Database connection errors - Generic mesaj
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable',
        type: 'SERVICE_UNAVAILABLE',
        retryable: true
      });
    }

    // Database query errors - Generic mesaj
    if (error.code && error.code.startsWith('ER_')) {
      return res.status(500).json({
        success: false,
        message: 'Database operation failed',
        type: 'DATABASE_ERROR',
        retryable: false
      });
    }

    // JSON parse errors - Generic mesaj
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format',
        type: 'VALIDATION_ERROR',
        retryable: false
      });
    }

    // GÜVENLİK: Default error - Production'da generic mesaj
    const errorResponse = createSafeErrorResponse(error, 'An unexpected error occurred');
    res.status(error.status || 500).json({
      ...errorResponse,
      type: 'INTERNAL_ERROR',
      retryable: false
    });
  });

  // Development ortamında IP skorlarını temizle
  if (process.env.NODE_ENV !== 'production') {
    advancedSecurity.clearAllIPScores();
    console.log('🧹 Development ortamı: IP skorları temizlendi');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Local API: http://localhost:${PORT}/api`);
    console.log(`🌐 Network API: http://${localIP}:${PORT}/api`);
    console.log(`📊 SQL Query logging is ENABLED`);
    console.log(`🔍 All database operations will be logged with timing`);
    console.log(`🔧 Manual sync: POST /api/sync/products`);
    console.log(`💰 Price Logic: IndirimliFiyat = 0 ise SatisFiyati kullanılır`);
    console.log(`📱 API will work on same network even if IP changes`);

    // Start XML Sync Service
    if (xmlSyncService) {
      xmlSyncService.startScheduledSync();
      console.log(`📡 XML Sync Service started (every 4 hours)\n`);
    }
  });
}

startServer().catch(console.error);

// Global error handler: prevent leaking DB errors
app.use((err, req, res, next) => {
  try {
    const isDbError = err && typeof err.message === 'string' && /sql|database|mysql|syntax/i.test(err.message);
    if (isDbError) {
      console.error('❌ DB error masked:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } catch (_) { }
  console.error('❌ Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});