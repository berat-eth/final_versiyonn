# Admin Panel Güvenlik Açıkları Raporu

**Tarih:** 2024  
**Kapsam:** Admin Panel (Next.js)  
**Öncelik:** 🔴 Kritik | 🟠 Yüksek | 🟡 Orta | 🟢 Düşük

---

## 🔴 KRİTİK GÜVENLİK AÇIKLARI

### 1. Hardcoded API Keys ve Secrets
**Öncelik:** 🔴 Kritik  
**Dosyalar:**
- `lib/api.ts` (satır 4-5)
- `lib/services/ollama-service.ts` (satır 87, 162)
- `components/TrendyolOrders.tsx` (satır 225-226, 960-961)
- `components/Invoices.tsx` (satır 108-109, 421-422)
- `components/Analytics.tsx` (satır 143-144)

**Sorun:**
```typescript
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS';
```

**Risk:**
- API anahtarları kod içinde hardcoded
- `NEXT_PUBLIC_` prefix ile client-side'da expose ediliyor
- Fallback değerler production'da kullanılabilir
- Anahtarlar browser'da görülebilir

**Öneri:**
- Tüm API anahtarlarını server-side'da tutun
- API route'ları oluşturun (Next.js API routes)
- Environment variables'ı sadece server-side'da kullanın
- Fallback değerleri kaldırın veya production'da hata fırlatın

---

### 2. Client-Side Authentication Kontrolü
**Öncelik:** 🔴 Kritik  
**Dosyalar:**
- `app/dashboard/page.tsx` (satır 97-106)
- `app/login/page.tsx` (satır 42)
- `app/2fa/page.tsx` (satır 20, 36)

**Sorun:**
```typescript
const logged = sessionStorage.getItem('adminLoggedIn') === '1'
const token = sessionStorage.getItem('authToken')
const twoFAValidated = sessionStorage.getItem('twoFAValidated') === '1'
```

**Risk:**
- Authentication state sadece client-side kontrol ediliyor
- sessionStorage manipüle edilebilir
- Backend'de token doğrulaması eksik olabilir
- XSS saldırıları ile sessionStorage erişilebilir

**Öneri:**
- Tüm protected route'lar için middleware ekleyin
- Her API isteğinde token doğrulaması yapın
- Server-side session kontrolü ekleyin
- HttpOnly cookies kullanın (XSS koruması için)

---

### 3. SQL Injection Riski
**Öncelik:** 🔴 Kritik  
**Dosya:** `components/SQLQuery.tsx` (satır 86)

**Sorun:**
- Client-side validation var ama backend'de de kontrol edilmeli
- SQL sorgusu direkt olarak backend'e gönderiliyor
- Prepared statements kullanımı doğrulanmalı

**Risk:**
- SQL injection saldırıları
- Veritabanı manipülasyonu
- Veri sızıntısı

**Öneri:**
- Backend'de SQL sorgularını whitelist ile sınırlandırın
- Prepared statements kullanın
- Sadece SELECT sorgularına izin verin (backend'de de kontrol edin)
- Query parametrelerini sanitize edin

---

### 4. Code Execution Riski
**Öncelik:** 🔴 Kritik  
**Dosya:** `components/CodeEditor.tsx` (satır 94-97)

**Sorun:**
```typescript
const response = await api.post('/admin/code/run', {
  code: content,
  language: currentLanguage
})
```

**Risk:**
- Kullanıcı tarafından girilen kod çalıştırılabiliyor
- Remote code execution (RCE) riski
- Sistem kaynaklarının kötüye kullanımı

**Öneri:**
- Bu özelliği production'dan kaldırın veya sadece sandbox ortamında çalıştırın
- Kod çalıştırmayı izole bir container'da yapın
- Timeout ve resource limitleri ekleyin
- Sadece belirli dillere izin verin
- Admin yetkisi kontrolü ekleyin

---

## 🟠 YÜKSEK ÖNCELİKLİ GÜVENLİK AÇIKLARI

### 5. XSS (Cross-Site Scripting) Riski
**Öncelik:** 🟠 Yüksek  
**Dosya:** `components/Email.tsx` (satır 481)

**Sorun:**
```typescript
dangerouslySetInnerHTML={{ __html: sanitizeHTML(templateHtml) }}
```

**Risk:**
- `dangerouslySetInnerHTML` kullanımı
- DOMPurify kullanılıyor ama yeterli olmayabilir
- Email template'lerinde XSS riski

**Öneri:**
- DOMPurify konfigürasyonunu gözden geçirin
- Content Security Policy (CSP) ekleyin
- Email template'lerini server-side render edin
- Kullanıcı girdilerini daha sıkı sanitize edin

---

### 6. CSRF (Cross-Site Request Forgery) Koruması Yok
**Öncelik:** 🟠 Yüksek  
**Dosyalar:** Tüm API çağrıları

**Sorun:**
- CSRF token kontrolü yok
- State-changing işlemler korunmuyor

**Risk:**
- CSRF saldırıları
- Yetkisiz işlemler
- Veri manipülasyonu

**Öneri:**
- CSRF token mekanizması ekleyin
- SameSite cookie attribute kullanın
- Double-submit cookie pattern uygulayın
- State-changing işlemler için token zorunlu tutun

---

### 7. Sensitive Data Exposure
**Öncelik:** 🟠 Yüksek  
**Dosya:** `lib/api.ts` (satır 86-99)

**Sorun:**
```typescript
const logs = JSON.parse(localStorage.getItem('apiLogs') || '[]');
localStorage.setItem('apiLogs', JSON.stringify(logs.slice(0, 200)));
```

**Risk:**
- API istek/yanıt logları localStorage'da saklanıyor
- Hassas bilgiler (token, password, vb.) loglanabilir
- XSS saldırıları ile erişilebilir

**Öneri:**
- Hassas bilgileri loglamayın
- Logları server-side'da saklayın
- localStorage yerine secure storage kullanın
- Logları sanitize edin

---

### 8. Session Storage Kullanımı
**Öncelik:** 🟠 Yüksek  
**Dosyalar:** Çoklu dosyalar

**Sorun:**
- Token'lar sessionStorage'da saklanıyor
- XSS saldırıları ile erişilebilir
- HttpOnly cookies kullanılmıyor

**Risk:**
- Token çalınması
- Session hijacking
- XSS saldırıları

**Öneri:**
- HttpOnly, Secure, SameSite cookie kullanın
- Token'ları server-side'da saklayın
- Refresh token mekanizması ekleyin
- Token rotation uygulayın

---

## 🟡 ORTA ÖNCELİKLİ GÜVENLİK AÇIKLARI

### 9. Input Validation Eksiklikleri
**Öncelik:** 🟡 Orta  
**Dosyalar:** Çoklu form component'leri

**Sorun:**
- Bazı input'lar yeterince validate edilmiyor
- Email, telefon, URL format kontrolleri eksik olabilir
- SQL Query component'inde sadece client-side validation

**Öneri:**
- Tüm input'ları server-side'da validate edin
- Zod veya benzeri validation library kullanın
- Rate limiting ekleyin
- Input length limitleri koyun

---

### 10. Authorization Kontrolü Eksiklikleri
**Öncelik:** 🟡 Orta  
**Dosyalar:** Tüm component'ler

**Sorun:**
- Client-side authorization kontrolü var
- Backend'de role-based access control (RBAC) doğrulanmalı
- Her endpoint için yetki kontrolü yapılmalı

**Öneri:**
- Backend'de RBAC implementasyonu
- Middleware ile yetki kontrolü
- Role-based route protection
- Audit logging

---

### 11. Environment Variables Exposure
**Öncelik:** 🟡 Orta  
**Dosyalar:** Çoklu dosyalar

**Sorun:**
- `NEXT_PUBLIC_` prefix ile environment variables client-side'da expose ediliyor
- Admin email/password environment variables'da (satır 47-48 userService.ts)

**Risk:**
- Hassas bilgiler browser'da görülebilir
- Production'da yanlış konfigürasyon

**Öneri:**
- Sadece gerçekten public olan değişkenler için `NEXT_PUBLIC_` kullanın
- Admin credentials'ları environment variables'dan kaldırın
- Server-side API route'ları kullanın

---

### 12. Rate Limiting Eksiklikleri
**Öncelik:** 🟡 Orta  
**Dosyalar:** API route'ları

**Sorun:**
- Google Maps scraper için rate limiting var
- Diğer endpoint'lerde rate limiting eksik olabilir

**Öneri:**
- Tüm API endpoint'lerine rate limiting ekleyin
- IP-based ve user-based rate limiting
- DDoS koruması
- Exponential backoff

---

## 🟢 DÜŞÜK ÖNCELİKLİ GÜVENLİK AÇIKLARI

### 13. Security Headers Eksiklikleri
**Öncelik:** 🟢 Düşük  
**Dosya:** `next.config.js`

**Sorun:**
- Bazı security headers eksik olabilir
- Content Security Policy (CSP) yok

**Öneri:**
- CSP header ekleyin
- Referrer-Policy ekleyin
- Permissions-Policy ekleyin
- Security headers'ı gözden geçirin

---

### 14. Dependency Güvenlik Açıkları
**Öncelik:** 🟢 Düşük  
**Dosya:** `package.json`

**Öneri:**
- `npm audit` çalıştırın
- `npm audit fix` uygulayın
- Düzenli olarak dependency güncellemeleri yapın
- Snyk veya benzeri tool kullanın

---

### 15. Error Handling ve Information Disclosure
**Öncelik:** 🟢 Düşük  
**Dosyalar:** Çoklu dosyalar

**Sorun:**
- Hata mesajlarında fazla bilgi verilebilir
- Stack trace'ler production'da görülebilir

**Öneri:**
- Production'da generic hata mesajları gösterin
- Stack trace'leri loglayın ama kullanıcıya göstermeyin
- Error boundary'ler ekleyin

---

## ÖNERİLER ÖZETİ

### Acil Yapılması Gerekenler (Kritik)
1. ✅ Tüm hardcoded API keys'leri kaldırın
2. ✅ Server-side authentication middleware ekleyin
3. ✅ SQL injection koruması için backend validation ekleyin
4. ✅ Code execution özelliğini kaldırın veya sandbox'a alın

### Kısa Vadede Yapılması Gerekenler (Yüksek)
1. ✅ CSRF protection ekleyin
2. ✅ HttpOnly cookies kullanın
3. ✅ Sensitive data logging'i kaldırın
4. ✅ XSS korumasını güçlendirin

### Orta Vadede Yapılması Gerekenler (Orta)
1. ✅ Input validation'ı güçlendirin
2. ✅ RBAC implementasyonu
3. ✅ Rate limiting ekleyin
4. ✅ Environment variables'ı gözden geçirin

### Uzun Vadede Yapılması Gerekenler (Düşük)
1. ✅ Security headers'ı tamamlayın
2. ✅ Dependency güncellemeleri
3. ✅ Error handling iyileştirmeleri
4. ✅ Security audit ve penetration testing

---

## TEST ÖNERİLERİ

1. **OWASP ZAP** ile otomatik güvenlik taraması
2. **Burp Suite** ile manuel penetration testing
3. **npm audit** ile dependency güvenlik açıkları kontrolü
4. **Snyk** ile sürekli güvenlik izleme
5. **CodeQL** ile statik kod analizi

---

## KAYNAKLAR

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

**Rapor Oluşturulma Tarihi:** 2024  
**Son Güncelleme:** 2024

