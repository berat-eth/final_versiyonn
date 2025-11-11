# Güvenlik Açıkları Raporu

Bu rapor, kod tabanında tespit edilen güvenlik açıklarını kategorize eder ve öncelik sırasına göre listeler.

## 🔴 KRİTİK SEVİYE GÜVENLİK AÇIKLARI

### 1. Hardcoded Credentials (Kritik)
**Öncelik: YÜKSEK**  
**Etki: Kritik - Veritabanı ve sistem erişimi**

#### 1.1. Veritabanı Şifreleri
- **Dosya**: `server/quick-setup.sh` (Satır 176)
  - Hardcoded DB password: `38cdfD8217..`
  - DB host, user, name bilgileri açık

- **Dosya**: `ml-service/config.py` (Satır 16)
  - Hardcoded DB password: `38cdfD8217..`
  - Production ortamında default değer olarak kullanılıyor

#### 1.2. Admin Credentials
- **Dosya**: `server/server.js` (Satır 2821-2822)
  - Hardcoded admin password: `38cdfD8217..`
  - Hardcoded admin token: `huglu-admin-token-2025`
  - Hardcoded admin username: `berat1`

#### 1.3. API Keys
- **Dosya**: `src/utils/secure-storage.ts` (Satır 68)
  - Hardcoded default API key: `huglu_f22635b61189c2cea13eec242465148d890fef5206ec8a1b0263bf279f4ba6ad`

- **Dosya**: `admin-panel/lib/api.ts` (Satır 4-5)
  - Hardcoded API key: `huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f`
  - Hardcoded admin key: `huglu-admin-2024-secure-key-CHANGE-THIS`

- **Dosya**: `server/server.js` (Satır 2832)
  - Hardcoded admin API key kontrolü: `huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f`

**Öneri**: Tüm credentials'ları environment variable'lara taşıyın ve `.env` dosyasını `.gitignore`'a ekleyin.

---

### 2. SQL Injection Riski (Kritik)
**Öncelik: YÜKSEK**  
**Etki: Kritik - Veritabanı manipülasyonu**

#### 2.1. Admin SQL Query Endpoint
- **Dosya**: `server/server.js` (Satır 4950-4971)
  - `/api/admin/sql/query` endpoint'i kullanıcıdan SQL sorgusu alıyor
  - Sadece SELECT ve bazı keyword filtreleme var, ancak yeterli değil
  - Prepared statement kullanılmıyor - direkt SQL string çalıştırılıyor
  - **Risk**: UNION-based SQL injection, time-based blind SQL injection mümkün

**Örnek Saldırı Senaryosu**:
```sql
SELECT * FROM users WHERE id = 1 UNION SELECT password FROM users--
```

**Öneri**: 
- Bu endpoint'i tamamen kaldırın veya sadece whitelist'teki sorgulara izin verin
- Prepared statement kullanın
- Query builder kullanın

---

### 3. XSS (Cross-Site Scripting) Açıkları (Kritik)
**Öncelik: YÜKSEK**  
**Etki: Kritik - Kullanıcı verilerinin çalınması, session hijacking**

#### 3.1. dangerouslySetInnerHTML Kullanımları
- **Dosya**: `web/app/urunler/[id]/page.tsx` (Satır 567)
  - Ürün açıklaması direkt HTML olarak render ediliyor
  - Sanitization yok

- **Dosya**: `admin-panel/components/Email.tsx` (Satır 480)
  - Email template HTML'i direkt render ediliyor
  - Sanitization yok

- **Dosya**: `web/app/layout.tsx` (Satır 92, 132)
  - HTML içerik direkt render ediliyor

- **Dosya**: `web/app/giris/page.tsx` (Satır 222)
  - HTML içerik direkt render ediliyor

**Öneri**: 
- DOMPurify veya benzeri bir sanitization kütüphanesi kullanın
- Tüm user-generated content'i sanitize edin
- CSP (Content Security Policy) header'larını güçlendirin

---

### 4. CORS Misconfiguration (Yüksek)
**Öncelik: ORTA-YÜKSEK**  
**Etki: Yüksek - CSRF saldırıları, yetkisiz erişim**

#### 4.1. Development Ortamında Tüm Origin'lere İzin
- **Dosya**: `server/server.js` (Satır 356-358)
  - Development ortamında `callback(null, true)` ile tüm origin'lere izin veriliyor
  - Production'da whitelist var ama development'ta güvenlik yok

#### 4.2. Production Dosyasında Tüm Origin'lere İzin
- **Dosya**: `server/server-production.js` (Satır 220-226)
  - **KRİTİK**: `origin: true` ile tüm origin'lere izin veriliyor
  - Bu production dosyası, production'da kullanılırsa ciddi güvenlik açığı

**Öneri**: 
- Production'da kesinlikle whitelist kullanın
- Development'ta bile sınırlı origin listesi kullanın
- `credentials: true` ile birlikte wildcard origin kullanmayın

---

### 5. Authentication Bypass Riski (Yüksek)
**Öncelik: YÜKSEK**  
**Etki: Yüksek - Yetkisiz erişim**

#### 5.1. Default Tenant Fallback
- **Dosya**: `server/server.js` (Satır 690-696, 725-727, 758-759)
  - API key bulunamazsa default tenant (id: 1) kullanılıyor
  - Bu, geçersiz API key'lerle bile erişim sağlanmasına neden olabilir
  - **Risk**: Brute force saldırıları ile default tenant'a erişim

#### 5.2. Tenant Isolation Bypass
- **Dosya**: `server/middleware/authorization.js` (Satır 252-277)
  - Tenant yoksa default tenant (id: 1) kullanılıyor
  - Bu, tenant isolation'ı bypass edebilir

**Öneri**: 
- Geçersiz API key durumunda erişimi reddedin
- Default tenant fallback'i kaldırın veya sadece belirli endpoint'ler için kullanın

---

## 🟡 ORTA SEVİYE GÜVENLİK AÇIKLARI

### 6. Sensitive Data Logging (Orta)
**Öncelik: ORTA**  
**Etki: Orta - Bilgi sızıntısı**

#### 6.1. Password ve API Key Logging
- **Dosya**: `server/server.js` (Satır 1228, 1238)
  - Test password'ları console'a yazdırılıyor: `console.log('   Password: ${TEST_PASSWORD}')`
  - API key'lerin bir kısmı loglanıyor (satır 691, 726, 759)

**Öneri**: 
- Production'da sensitive data loglamayın
- Log seviyelerini ayarlayın
- Log rotation ve temizleme politikaları uygulayın

---

### 7. File Upload Security (Orta)
**Öncelik: ORTA**  
**Etki: Orta - Dosya yükleme saldırıları**

#### 7.1. Dosya Boyutu Limitleri
- **Dosya**: `server/server.js` (Satır 580)
  - 50MB limit var ama çok yüksek
  - Video dosyaları için risk oluşturabilir

#### 7.2. Dosya Tipi Kontrolü
- **Dosya**: `server/server.js` (Satır 564-575)
  - MIME type kontrolü var ama yeterli değil
  - Dosya içeriği kontrolü yok (magic bytes)
  - Dosya adı sanitization var ama yeterli olmayabilir

**Öneri**: 
- Dosya boyutu limitlerini düşürün (örn: 10MB)
- Magic bytes kontrolü ekleyin
- Virus scanning ekleyin
- Dosya adlarını daha agresif sanitize edin

---

### 8. SQL Query String Interpolation (Orta)
**Öncelik: ORTA**  
**Etki: Orta - SQL injection riski**

#### 8.1. Template Literal Kullanımı
- **Dosya**: `server/server.js` (Satır 100, 102)
  - Table name için template literal kullanılıyor: `` `SELECT * FROM ${safeTableName}` ``
  - `safeTableName` whitelist kontrolünden geçiyor ama yine de risk var

**Öneri**: 
- Table name'ler için de prepared statement kullanın
- Whitelist kontrolünü güçlendirin

---

### 9. Error Information Disclosure (Orta)
**Öncelik: DÜŞÜK-ORTA**  
**Etki: Düşük - Bilgi toplama**

#### 9.1. Development Error Details
- **Dosya**: `server/server.js` (Çoklu yerler)
  - Development ortamında stack trace'ler gösteriliyor
  - Production'da genelde gizleniyor ama bazı yerlerde hala görünebilir

**Öneri**: 
- Tüm error response'larını production'da generic hale getirin
- Error logging'i ayrı bir servise taşıyın

---

### 10. Rate Limiting Eksiklikleri (Orta)
**Öncelik: ORTA**  
**Etki: Orta - DoS saldırıları**

#### 10.1. Bazı Endpoint'lerde Rate Limiting Yok
- **Dosya**: `server/server.js`
  - `/api/admin/sql/query` gibi kritik endpoint'lerde özel rate limiting yok
  - Global rate limit var ama endpoint bazlı yok

**Öneri**: 
- Kritik endpoint'ler için özel rate limiting ekleyin
- IP bazlı rate limiting güçlendirin

---

## 🟢 DÜŞÜK SEVİYE GÜVENLİK AÇIKLARI

### 11. CSP (Content Security Policy) Zayıflıkları (Düşük)
**Öncelik: DÜŞÜK**  
**Etki: Düşük - XSS koruması zayıflığı**

#### 11.1. Development'ta unsafe-inline
- **Dosya**: `server/server.js` (Satır 270-271)
  - Development'ta `'unsafe-inline'` ve `'unsafe-eval'` kullanılıyor
  - Bu, XSS korumasını zayıflatıyor

**Öneri**: 
- Nonce veya hash kullanarak inline script'leri güvenli hale getirin
- Development'ta bile unsafe direktiflerden kaçının

---

### 12. Session Management (Düşük)
**Öncelik: DÜŞÜK**  
**Etki: Düşük - Session hijacking**

#### 12.1. JWT Token Yönetimi
- JWT token'ların expiration time'ları kontrol edilmeli
- Refresh token mekanizması güçlendirilmeli

**Öneri**: 
- Token rotation ekleyin
- Token blacklist mekanizması ekleyin

---

## 📋 ÖNCELİKLENDİRİLMİŞ DÜZELTME LİSTESİ

### Hemen Düzeltilmesi Gerekenler (1-2 Hafta)
1. ✅ Tüm hardcoded credentials'ları environment variable'lara taşı
2. ✅ Admin SQL query endpoint'ini kaldır veya güvenli hale getir
3. ✅ XSS açıklarını düzelt (dangerouslySetInnerHTML kullanımları)
4. ✅ Production CORS ayarlarını düzelt (server-production.js)
5. ✅ Default tenant fallback'i kaldır veya güvenli hale getir

### Kısa Vadede Düzeltilmesi Gerekenler (1 Ay)
6. ✅ Sensitive data logging'i kaldır
7. ✅ File upload güvenliğini güçlendir
8. ✅ SQL query string interpolation'ları düzelt
9. ✅ Error information disclosure'ı düzelt
10. ✅ Rate limiting'i güçlendir

### Orta Vadede İyileştirilecekler (2-3 Ay)
11. ✅ CSP politikalarını güçlendir
12. ✅ Session management'ı iyileştir
13. ✅ Security testing otomasyonu ekle
14. ✅ Security monitoring ve alerting ekle

---

## 🔒 GENEL GÜVENLİK ÖNERİLERİ

1. **Environment Variables**: Tüm sensitive data'yı environment variable'lara taşıyın
2. **Input Validation**: Tüm user input'larını validate edin ve sanitize edin
3. **Output Encoding**: Tüm output'ları encode edin
4. **Least Privilege**: Minimum yetki prensibini uygulayın
5. **Security Headers**: Güvenlik header'larını güçlendirin
6. **Regular Updates**: Dependencies'leri düzenli güncelleyin
7. **Security Audits**: Düzenli güvenlik denetimleri yapın
8. **Penetration Testing**: Düzenli penetration test yapın
9. **Incident Response**: Güvenlik olayları için response planı hazırlayın
10. **Security Training**: Geliştirici ekibine güvenlik eğitimi verin

---

## 📊 ÖZET İSTATİSTİKLER

- **Kritik Seviye**: 5 açık
- **Orta Seviye**: 6 açık
- **Düşük Seviye**: 2 açık
- **Toplam**: 13 güvenlik açığı

**En Kritik Alanlar**:
1. Hardcoded credentials (5 farklı yerde)
2. SQL injection riski (1 kritik endpoint)
3. XSS açıkları (4 farklı component)
4. CORS misconfiguration (2 dosyada)
5. Authentication bypass (default tenant fallback)

---

*Rapor oluşturulma tarihi: 2025-01-27*
*Tarama kapsamı: Tüm kod tabanı*

