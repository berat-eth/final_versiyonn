# 🔍 Performans Sorunları Analizi

## 📊 Tespit Edilen Sorunlar

### 🔴 KRİTİK SORUNLAR

#### 1. **N+1 Query Problemi - ProfileScreen**
**Dosya**: `src/views/ProfileScreen.tsx`

**Sorun**:
```typescript
// ❌ SORUN: Siparişler 2 kez yükleniyor
const loadUserData = async () => {
  const user = await UserController.getCurrentUser();
  await loadUserOrders(user.id);  // 1. kez
  await loadUserProfileData(user.id);
};

const loadUserProfileData = async (userId: number) => {
  const userOrders = await OrderController.getUserOrders(userId);  // 2. kez
  setOrders(userOrders);
  // ...
};
```

**Etki**: 
- Aynı sipariş verisi 2 kez API'den çekiliyor
- Gereksiz network trafiği
- Yavaş sayfa yükleme

---

#### 2. **Sıralı API Çağrıları - ProfileScreen**
**Dosya**: `src/views/ProfileScreen.tsx`

**Sorun**:
```typescript
// ❌ SORUN: Sıralı çağrılar
const loadUserProfileData = async (userId: number) => {
  const addresses = await UserController.getUserAddresses(userId);  // Bekle
  const balanceResponse = await apiService.get(`/wallet/balance/${userId}`);  // Bekle
  const userOrders = await OrderController.getUserOrders(userId);  // Bekle
  const favorites = await UserController.getUserFavorites(userId);  // Bekle
};
```

**Etki**:
- Toplam yükleme süresi = Tüm çağrıların toplamı
- Örnek: 4 çağrı × 500ms = 2000ms (2 saniye)
- Paralel yapılsaydı: ~500ms

---

#### 3. **Gereksiz getCurrentUserId Çağrıları**
**Dosyalar**: Birçok ekran

**Sorun**:
```typescript
// ❌ SORUN: Her işlemde tekrar çağrılıyor
const handleAddToCart = async () => {
  const userId = await UserController.getCurrentUserId();  // 1. çağrı
  // ...
};

const handleToggleFavorite = async () => {
  const userId = await UserController.getCurrentUserId();  // 2. çağrı
  // ...
};

const loadFavorites = async () => {
  const userId = await UserController.getCurrentUserId();  // 3. çağrı
  // ...
};
```

**Etki**:
- Her işlemde AsyncStorage okuması
- Gereksiz await süreleri
- Kod tekrarı

---

#### 4. **Cache Kullanılmıyor - ProductDetailScreen**
**Dosya**: `src/views/ProductDetailScreen.tsx`

**Sorun**:
```typescript
// ❌ SORUN: Her seferinde API'den çekiliyor
const loadReviews = async () => {
  const productReviews = await ReviewController.getReviewsByProductId(productId);
  setReviews(productReviews);
};

// Her focus'ta tekrar yükleniyor
useEffect(() => {
  loadReviews();
}, [productId]);
```

**Etki**:
- Aynı ürün yorumları her açılışta yeniden yükleniyor
- Gereksiz API çağrıları
- Yavaş sayfa geçişleri

---

#### 5. **Server-Side N+1 Query - User Events**
**Dosya**: `server/server.js`

**Sorun**:
```javascript
// ❌ SORUN: Loop içinde SQL sorgusu
const [users] = await poolWrapper.execute(
  `SELECT DISTINCT userId FROM user_events WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
);

for (const u of users) {  // Her kullanıcı için
  const [tenants] = await poolWrapper.execute(  // Ayrı sorgu
    `SELECT DISTINCT tenantId FROM user_events WHERE userId = ?`,
    [u.userId]
  );
}
```

**Etki**:
- 100 kullanıcı = 101 SQL sorgusu (1 + 100)
- Veritabanı yükü
- Yavaş background işlemler

---

### 🟡 ORTA SEVİYE SORUNLAR

#### 6. **Gereksiz Re-render - HomeScreen**
**Dosya**: `src/views/HomeScreen.tsx`

**Sorun**:
```typescript
// ❌ SORUN: Her render'da yeni array oluşturuluyor
const sliderData = [
  { id: 1, title: 'Yeni Sezon', ... },
  { id: 2, title: 'Kamp Sezonu', ... },
  // ...
];
```

**Çözüm**: `useMemo` kullanılmalı (zaten kullanılmış ama bazı yerlerde eksik)

---

#### 7. **Duplicate Wallet Calls**
**Dosyalar**: `WalletScreen.tsx`, `PaymentScreen.tsx`, `ProfileScreen.tsx`

**Sorun**:
```typescript
// Her ekranda ayrı ayrı çağrılıyor
const balanceResponse = await apiService.get(`/wallet/balance/${userId}`);
```

**Etki**:
- Aynı cüzdan bakiyesi 3 farklı ekranda ayrı ayrı çekiliyor
- Global state kullanılmalı

---

#### 8. **Inefficient Favorite Checks**
**Dosya**: `ProductListScreen.tsx`, `ProductDetailScreen.tsx`

**Sorun**:
```typescript
// ❌ SORUN: Tüm favoriler her seferinde yükleniyor
const loadFavorites = async () => {
  const favorites = await UserController.getUserFavorites(userId);
  const favoriteIds = favorites.map((fav: any) => parseInt(fav.productId));
  setFavoriteProducts(favoriteIds);
};
```

**Etki**:
- Her ürün listesi açılışında tüm favoriler yükleniyor
- Cache kullanılmalı

---

### 🟢 KÜÇÜK İYİLEŞTİRMELER

#### 9. **Missing Query Optimization - Server**
**Dosya**: `server/server.js`

**Sorun**:
```javascript
// ❌ SORUN: Index kullanılmıyor olabilir
SELECT * FROM orders WHERE userId = ?
SELECT * FROM products WHERE category = ?
```

**Çözüm**: Index'ler kontrol edilmeli

---

#### 10. **Unnecessary Data Fetching**
**Dosyalar**: Birçok ekran

**Sorun**:
```typescript
// ❌ SORUN: Tüm ürün verisi çekiliyor, sadece ID gerekli
const product = await ProductController.getProductById(productId);
// Sadece product.id kullanılıyor
```

---

## 📈 Performans Metrikleri

### Mevcut Durum (Tahmini)
```
ProfileScreen Yükleme: ~3-4 saniye
  - getCurrentUser: 200ms
  - getUserOrders (1. kez): 500ms
  - getUserOrders (2. kez): 500ms  ← Gereksiz
  - getWalletBalance: 400ms
  - getUserFavorites: 300ms
  - getUserLevel: 400ms
  - getUserAddresses: 200ms
  ─────────────────────────────────
  Toplam: ~2500ms (sıralı)

HomeScreen Yükleme: ~2-3 saniye
  - getPopularProducts: 600ms
  - getNewProducts: 600ms
  - getPolarProducts: 600ms
  - getCategories: 400ms
  - getCampaigns: 400ms
  ─────────────────────────────────
  Toplam: ~2600ms (sıralı)

ProductDetailScreen: ~1-2 saniye
  - getProductById: 400ms
  - getReviews: 500ms
  - getUserFavorites: 300ms
  - getCurrentUser: 200ms
  ─────────────────────────────────
  Toplam: ~1400ms
```

### Hedef Performans (Optimize Edilmiş)
```
ProfileScreen Yükleme: ~800ms
  - Paralel çağrılar: 500ms
  - Cache kullanımı: 300ms
  ─────────────────────────────────
  İyileştirme: %73 daha hızlı

HomeScreen Yükleme: ~600ms
  - Paralel çağrılar: 600ms
  - Cache kullanımı: 0ms (cache hit)
  ─────────────────────────────────
  İyileştirme: %77 daha hızlı

ProductDetailScreen: ~400ms
  - Cache kullanımı: 400ms
  ─────────────────────────────────
  İyileştirme: %71 daha hızlı
```

---

## 🎯 Öncelik Sıralaması

### 1. Yüksek Öncelik (Hemen Yapılmalı)
- ✅ ProfileScreen duplicate order calls
- ✅ Paralel API çağrıları (Promise.all)
- ✅ getCurrentUserId cache'leme
- ✅ Server-side N+1 query fix

### 2. Orta Öncelik (Bu Sprint)
- ⏳ Global wallet state
- ⏳ Favorite products cache
- ⏳ Product detail cache
- ⏳ Review cache

### 3. Düşük Öncelik (Gelecek Sprint)
- 📋 Database index optimization
- 📋 Image lazy loading
- 📋 Pagination implementation
- 📋 Virtual scrolling

---

## 💡 Önerilen Çözümler

### Çözüm 1: Paralel API Çağrıları
```typescript
// ✅ İYİ: Paralel çağrılar
const loadUserProfileData = async (userId: number) => {
  const [addresses, balanceResponse, userOrders, favorites] = await Promise.all([
    UserController.getUserAddresses(userId),
    apiService.get(`/wallet/balance/${userId}`),
    OrderController.getUserOrders(userId),
    UserController.getUserFavorites(userId)
  ]);
  
  // Sonuçları işle
};
```

### Çözüm 2: User ID Cache
```typescript
// ✅ İYİ: Component seviyesinde cache
const [userId, setUserId] = useState<number | null>(null);

useEffect(() => {
  UserController.getCurrentUserId().then(setUserId);
}, []);

// Artık userId state'inden kullan
```

### Çözüm 3: React Query / SWR Kullanımı
```typescript
// ✅ İYİ: Otomatik cache ve revalidation
import { useQuery } from '@tanstack/react-query';

const { data: userOrders } = useQuery({
  queryKey: ['orders', userId],
  queryFn: () => OrderController.getUserOrders(userId),
  staleTime: 5 * 60 * 1000, // 5 dakika
});
```

### Çözüm 4: Server-Side JOIN
```javascript
// ✅ İYİ: Tek sorguda tüm veri
const [results] = await poolWrapper.execute(`
  SELECT 
    u.userId,
    GROUP_CONCAT(DISTINCT u.tenantId) as tenantIds
  FROM user_events u
  WHERE u.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  GROUP BY u.userId
`);
```

---

## 📊 Beklenen İyileştirmeler

### Performans
- 🚀 %70-80 daha hızlı sayfa yükleme
- 🚀 %60 daha az API çağrısı
- 🚀 %50 daha az veritabanı sorgusu

### Kullanıcı Deneyimi
- ✨ Anlık sayfa geçişleri
- ✨ Smooth scroll
- ✨ Daha az loading spinner

### Sunucu Yükü
- 📉 %60 daha az API trafiği
- 📉 %50 daha az DB yükü
- 📉 Daha düşük sunucu maliyeti

---

## 🔧 Uygulama Planı

### Faz 1: Hızlı Kazançlar (1-2 gün)
1. ProfileScreen duplicate calls fix
2. Paralel API çağrıları
3. getCurrentUserId cache

### Faz 2: Orta Vadeli (3-5 gün)
1. Global state management
2. Cache stratejisi
3. Server-side optimizations

### Faz 3: Uzun Vadeli (1-2 hafta)
1. React Query entegrasyonu
2. Database indexing
3. Advanced caching

---

**Tarih**: 14 Ekim 2025  
**Durum**: 🔍 Analiz Tamamlandı  
**Sonraki Adım**: Optimizasyon Uygulaması
