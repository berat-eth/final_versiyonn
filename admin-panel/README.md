# 🛍️ E-Ticaret Admin Paneli

Modern, kapsamlı ve kullanıcı dostu bir e-ticaret yönetim paneli. Next.js 14, React, TypeScript, Tailwind CSS ve Framer Motion ile geliştirilmiştir.

## ✨ Özellikler

### 📊 Dashboard
- Detaylı satış istatistikleri ve grafikler
- Kategori performans analizi
- Stok uyarı sistemi
- Kargo ve sipariş durumu takibi
- En çok satan ürünler
- Son siparişler özeti

### 👥 Kullanıcı Yönetimi
- Müşteri listesi ve profilleri
- Segment bazlı müşteri analizi (VIP, Sadık, Yeni, Pasif)
- Müşteri puanlama sistemi
- İletişim bilgileri ve harcama geçmişi

### 📦 Ürün Yönetimi
- Ürün listesi ve detayları
- Stok takibi ve uyarıları
- Kategori bazlı filtreleme
- Satış performans analizi
- Ürün düzenleme ve silme

### 🛒 Sipariş Yönetimi
- Sipariş listesi ve durumları
- Ödeme takibi
- Kargo durumu
- Sipariş detayları
- Durum güncelleme

### 🛍️ Sepet Yönetimi
- Aktif sepetler
- Terk edilmiş sepet analizi
- Sepet değeri takibi

### 📢 Kampanya Yönetimi
- Kampanya oluşturma ve düzenleme
- İndirim, kupon, kargo kampanyaları
- Görüntülenme ve dönüşüm istatistikleri

### 📸 Story Yönetimi
- Instagram tarzı story paylaşımı
- Görsel içerik yönetimi
- Tıklama ve görüntülenme analizi

### 📋 Bayilik Başvuruları
- Başvuru onaylama/reddetme
- Firma bilgileri yönetimi
- Durum takibi

### 💰 Müşteri Bakiyeleri
- Cüzdan yönetimi
- Bakiye hareketleri
- Yükleme ve harcama takibi

### 🎯 Müşteri Segmentleri
- Otomatik segmentasyon
- Segment bazlı analiz
- Gelir ve müşteri sayısı takibi

### 🎨 Kişiselleştirme
- Renk teması özelleştirme
- Tipografi ayarları
- Logo ve banner yükleme
- Sayfa düzeni seçenekleri

### 📊 Analitik
- Gelir & Gider analizi
- Müşteri davranış analizi
- Kategori performansı
- Dönüşüm oranları
- Müşteri yaşam değeri (CLV)

### 📡 Canlı Veriler
- Gerçek zamanlı aktivite izleme
- Aktif kullanıcı sayısı
- Anlık satış ve görüntüleme
- Canlı aktivite akışı

### 🏢 Tenant Yönetimi
- Çoklu mağaza yapısı
- Domain ve kullanıcı yönetimi
- Plan bazlı yönetim

### 💬 Chatbot
- AI destekli müşteri desteği
- Konuşma geçmişi
- Otomatik yanıt ayarları
- Çözüm oranı takibi

### 🔒 Güvenlik
- İki faktörlü doğrulama
- Güvenlik logları
- Oturum yönetimi
- API anahtar yönetimi
- Şüpheli aktivite uyarıları

### 👑 Özel Üretim
- Kişiye özel ürün siparişleri
- Üretim durumu takibi
- Premium müşteri yönetimi

### 📦 Depo Yönetimi
- Depo listesi ve yönetimi
- Bölge/Raf yönetimi
- Stok hareketleri (Giriş/Çıkış/Transfer)
- Depo doluluk analizi
- Kritik stok uyarıları
- Gerçek zamanlı stok takibi

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+ 
- npm veya yarn

### Adımlar

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
```

3. **Tarayıcıda açın:**
```
http://localhost:3000
```

## 📦 Teknolojiler

- **Next.js 14**: React framework
- **TypeScript**: Tip güvenliği
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animasyon kütüphanesi
- **Recharts**: Grafik ve veri görselleştirme
- **Lucide React**: Modern ikon seti
- **Axios**: HTTP client
- **date-fns**: Tarih işlemleri

## 🎨 Tasarım Özellikleri

- ✨ Framer Motion ile akıcı animasyonlar
- 🎨 Gradient renkler ve modern UI
- 📊 İnteraktif grafikler ve tablolar
- 📱 Tam responsive tasarım
- 🎯 Hover ve transition efektleri
- 🔍 Gelişmiş arama ve filtreleme
- 📋 Modern tablo görünümleri
- 🎭 Dark mode sidebar

## 📁 Proje Yapısı

```
├── app/
│   ├── layout.tsx          # Ana layout
│   ├── page.tsx            # Ana sayfa (router)
│   └── globals.css         # Global stiller
├── components/
│   ├── Dashboard.tsx            # Dashboard bileşeni
│   ├── Products.tsx             # Ürünler
│   ├── Orders.tsx               # Siparişler
│   ├── Customers.tsx            # Müşteriler
│   ├── Cart.tsx                 # Sepetler
│   ├── Campaigns.tsx            # Kampanyalar
│   ├── Stories.tsx              # Story'ler
│   ├── Applications.tsx         # Bayilik başvuruları
│   ├── CustomerCare.tsx         # Müşteri bakiyeleri
│   ├── Segments.tsx             # Müşteri segmentleri
│   ├── Analytics.tsx            # Analitik
│   ├── LiveData.tsx             # Canlı veriler
│   ├── Chatbot.tsx              # Chatbot
│   ├── Security.tsx             # Güvenlik
│   ├── Premium.tsx              # Özel üretim
│   ├── WarehouseManagement.tsx  # Depo yönetimi
│   ├── ProductionPlanning.tsx   # Üretim planlama
│   ├── ProductionOrders.tsx     # Üretim emirleri
│   ├── ProductionTracking.tsx   # Üretim takibi
│   ├── Sidebar.tsx              # Yan menü
│   └── Header.tsx               # Üst bar
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 🔧 Geliştirme

### Build
```bash
npm run build
```

### Production
```bash
npm start
```

### Lint
```bash
npm run lint
```

## 🌟 Sonraki Adımlar

İsterseniz şunları ekleyebilirsiniz:

1. **Backend Entegrasyonu**
   - REST API veya GraphQL
   - Veritabanı bağlantısı (MongoDB, PostgreSQL)
   - Authentication (NextAuth.js, JWT)

2. **Gelişmiş Özellikler**
   - Dosya yükleme (AWS S3, Cloudinary)
   - Email bildirimleri
   - Push notifications
   - Export/Import (Excel, CSV)
   - PDF rapor oluşturma

3. **Optimizasyon**
   - Server-side rendering
   - Static site generation
   - Image optimization
   - Caching stratejileri

4. **Test**
   - Unit tests (Jest)
   - Integration tests
   - E2E tests (Playwright, Cypress)

## 📝 Lisans

MIT

## 👨‍💻 Geliştirici

E-Ticaret Admin Panel - 2024

---

**Not:** Bu proje demo amaçlıdır. Production kullanımı için güvenlik, authentication ve backend entegrasyonu eklemeniz önerilir.
