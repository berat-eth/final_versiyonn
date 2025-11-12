```mermaid
graph TB
    subgraph "Client Layer"
        MA[Mobil Uygulama<br/>React Native/Expo]
        WA[Web Sitesi<br/>Next.js 14]
        AP[Admin Paneli<br/>Next.js 14]
    end
    
    subgraph "API Gateway"
        NGINX[Nginx Reverse Proxy<br/>Port 80/443]
    end
    
    subgraph "Backend Services"
        API[Backend API Server<br/>Node.js/Express<br/>Port 3000]
        ML[ML Service<br/>Python/FastAPI<br/>Port 8000]
    end
    
    subgraph "Data Layer"
        MYSQL[(MySQL Database<br/>Multi-Tenant)]
        REDIS[(Redis Cache<br/>Session/Queue)]
    end
    
    subgraph "External Services"
        IYZICO[İyzico<br/>Payment Gateway]
        GMAPS[Google Maps API]
        SMS[SMS Gateway]
        EMAIL[Email Service]
        PUSH[Push Notification]
    end
    
    subgraph "Storage"
        FILES[File Storage<br/>Uploads/Images]
    end
    
    MA -->|HTTPS| NGINX
    WA -->|HTTPS| NGINX
    AP -->|HTTPS| NGINX
    NGINX --> API
    API --> MYSQL
    API --> REDIS
    API --> ML
    ML --> MYSQL
    ML --> REDIS
    API --> IYZICO
    API --> GMAPS
    API --> SMS
    API --> EMAIL
    API --> PUSH
    API --> FILES
```



```mermaid
graph TD
    ROOT[Mobil Uygulama]
    
    ROOT --> USER_MGMT[Kullanıcı Yönetimi]
    USER_MGMT --> U1[Kayıt/Giriş]
    USER_MGMT --> U2[Biyometrik Giriş]
    USER_MGMT --> U3[Şifre Sıfırlama]
    USER_MGMT --> U4[Profil Düzenleme]
    USER_MGMT --> U5[Çoklu Dil]
    USER_MGMT --> U6[2FA]
    
    ROOT --> PRODUCT_MGMT[Ürün Yönetimi]
    PRODUCT_MGMT --> P1[Katalog Görüntüleme]
    PRODUCT_MGMT --> P2[Kategori Filtreleme]
    PRODUCT_MGMT --> P3[Marka Filtreleme]
    PRODUCT_MGMT --> P4[Fiyat Filtreleme]
    PRODUCT_MGMT --> P5[Arama]
    PRODUCT_MGMT --> P6[Ürün Detay]
    PRODUCT_MGMT --> P7[Görseller]
    PRODUCT_MGMT --> P8[Stok Durumu]
    PRODUCT_MGMT --> P9[Yorumlar/Puanlama]
    PRODUCT_MGMT --> P10[Favoriler]
    PRODUCT_MGMT --> P11[Barkod/NFC Tarama]
    
    ROOT --> CART_ORDER[Sepet ve Sipariş]
    CART_ORDER --> CO1[Sepete Ekleme]
    CART_ORDER --> CO2[Sepet Yönetimi]
    CART_ORDER --> CO3[Miktar Güncelleme]
    CART_ORDER --> CO4[Sipariş Oluşturma]
    CART_ORDER --> CO5[Sipariş Geçmişi]
    CART_ORDER --> CO6[Sipariş Detayları]
    CART_ORDER --> CO7[Durum Takibi]
    CART_ORDER --> CO8[İptal/İade]
    
    ROOT --> PAYMENT[Ödeme Sistemi]
    PAYMENT --> PAY1[Kredi Kartı]
    PAYMENT --> PAY2[EFT/Havale]
    PAYMENT --> PAY3[Cüzdan Ödemesi]
    PAYMENT --> PAY4[İyzico Entegrasyonu]
    PAYMENT --> PAY5[Ödeme Geçmişi]
    PAYMENT --> PAY6[Fatura Görüntüleme]
    
    ROOT --> WALLET[Cüzdan Sistemi]
    WALLET --> W1[Bakiye Görüntüleme]
    WALLET --> W2[Para Yükleme]
    WALLET --> W3[Para Çekme]
    WALLET --> W4[Cüzdan Ödemesi]
    WALLET --> W5[Geçmiş]
    WALLET --> W6[Hediye Çeki]
    WALLET --> W7[Para Transferi]
    WALLET --> W8[HPay Bonus]
    
    ROOT --> ADDRESS[Adres Yönetimi]
    ADDRESS --> A1[Teslimat Adresi]
    ADDRESS --> A2[Fatura Adresi]
    ADDRESS --> A3[Adres Düzenleme]
    ADDRESS --> A4[Google Maps]
    
    ROOT --> CAMPAIGN[Kampanya]
    CAMPAIGN --> C1[Flash İndirimler]
    CAMPAIGN --> C2[Kupon Kodları]
    CAMPAIGN --> C3[Kişiselleştirilmiş Teklifler]
    CAMPAIGN --> C4[İndirim Çarkı]
    CAMPAIGN --> C5[Bildirimler]
    
    ROOT --> CUSTOM_PROD[Özel Üretim]
    CUSTOM_PROD --> CP1[Talep Oluşturma]
    CUSTOM_PROD --> CP2[Takip]
    CUSTOM_PROD --> CP3[Durum]
    
    ROOT --> DEALERSHIP[Bayilik]
    DEALERSHIP --> D1[Başvuru]
    DEALERSHIP --> D2[Takip]
    DEALERSHIP --> D3[Durum]
    
    ROOT --> REFERRAL[Referans]
    REFERRAL --> R1[Kod Paylaşma]
    REFERRAL --> R2[Kazanç Görüntüleme]
    REFERRAL --> R3[Geçmiş]
    
    ROOT --> USER_LEVEL[Kullanıcı Seviyesi]
    USER_LEVEL --> UL1[Seviye Sistemi]
    USER_LEVEL --> UL2[Avantajlar]
    USER_LEVEL --> UL3[İlerleme Takibi]
    
    ROOT --> SHIPPING[Kargo Takibi]
    SHIPPING --> S1[Takip Numarası]
    SHIPPING --> S2[Teslimat Durumu]
    SHIPPING --> S3[Geçmiş]
    
    ROOT --> NOTIFICATIONS[Bildirimler]
    NOTIFICATIONS --> N1[Push Bildirimleri]
    NOTIFICATIONS --> N2[Kampanya Bildirimleri]
    NOTIFICATIONS --> N3[Sipariş Bildirimleri]
    NOTIFICATIONS --> N4[Stok Bildirimleri]
    
    ROOT --> SUPPORT[Destek]
    SUPPORT --> SUP1[Müşteri Desteği]
    SUPPORT --> SUP2[SSS]
    SUPPORT --> SUP3[İletişim Formu]
    SUPPORT --> SUP4[Canlı Destek]
    
    ROOT --> OTHER[Diğer]
    OTHER --> O1[Mağaza Bulucu]
    OTHER --> O2[Ayarlar]
    OTHER --> O3[Çıkış]
```



```mermaid3. Admin Paneli Özellikleri

```mermaid
graph TD
    ADMIN[Admin Paneli]
    
    ADMIN --> DASHBOARD[Dashboard]
    DASHBOARD --> D1[Genel İstatistikler]
    DASHBOARD --> D2[Satış Grafikleri]
    DASHBOARD --> D3[Kategori Performansı]
    DASHBOARD --> D4[En Çok Satan Ürünler]
    DASHBOARD --> D5[Son Siparişler]
    DASHBOARD --> D6[Gelir Analizi]
    DASHBOARD --> D7[Müşteri Davranış Analizi]
    DASHBOARD --> D8[Saatlik Aktivite]
    DASHBOARD --> D9[KPI Metrikleri]
    DASHBOARD --> D10[Trafik Kaynakları]
    DASHBOARD --> D11[Stok Uyarıları]
    DASHBOARD --> D12[Canlı Kullanıcılar]
    DASHBOARD --> D13[Snort IDS İstatistikleri]
    DASHBOARD --> D14[Özel Üretim İstatistikleri]
    
    ADMIN --> PROD_MGMT[Ürün Yönetimi]
    PROD_MGMT --> PM1[Ürün Listesi]
    PROD_MGMT --> PM2[Ürün Ekleme/Düzenleme/Silme]
    PROD_MGMT --> PM3[Kategoriler]
    PROD_MGMT --> PM4[Marka Yönetimi]
    PROD_MGMT --> PM5[Stok Yönetimi]
    PROD_MGMT --> PM6[Fiyat Yönetimi]
    PROD_MGMT --> PM7[Görseller]
    PROD_MGMT --> PM8[Toplu İşlemler]
    PROD_MGMT --> PM9[Durum Yönetimi]
    
    ADMIN --> ORDER_MGMT[Sipariş Yönetimi]
    ORDER_MGMT --> OM1[Sipariş Listesi]
    ORDER_MGMT --> OM2[Sipariş Detayları]
    ORDER_MGMT --> OM3[Durum Güncelleme]
    ORDER_MGMT --> OM4[Filtreleme]
    ORDER_MGMT --> OM5[Arama]
    ORDER_MGMT --> OM6[İade Yönetimi]
    ORDER_MGMT --> OM7[İptal Yönetimi]
    
    ADMIN --> CUSTOMER_MGMT[Müşteri Yönetimi]
    CUSTOMER_MGMT --> CM1[Müşteri Listesi]
    CUSTOMER_MGMT --> CM2[Müşteri Detayları]
    CUSTOMER_MGMT --> CM3[Düzenleme]
    CUSTOMER_MGMT --> CM4[Segmentasyon]
    CUSTOMER_MGMT --> CM5[Geçmiş]
    CUSTOMER_MGMT --> CM6[Arama]
    
    ADMIN --> CAMPAIGN_MGMT[Kampanya Yönetimi]
    CAMPAIGN_MGMT --> CAM1[Kampanya Oluşturma]
    CAMPAIGN_MGMT --> CAM2[Düzenleme]
    CAMPAIGN_MGMT --> CAM3[Silme]
    CAMPAIGN_MGMT --> CAM4[Flash Deal]
    CAMPAIGN_MGMT --> CAM5[Kupon Yönetimi]
    CAMPAIGN_MGMT --> CAM6[İndirim Çarkı]
    CAMPAIGN_MGMT --> CAM7[Performans Analizi]
    CAMPAIGN_MGMT --> CAM8[Önizleme]
    
    ADMIN --> MARKETING[Pazarlama]
    MARKETING --> M1[E-posta Kampanyaları]
    MARKETING --> M2[SMS Kampanyaları]
    MARKETING --> M3[Push Bildirimleri]
    MARKETING --> M4[Story Yönetimi]
    MARKETING --> M5[Slider Yönetimi]
    MARKETING --> M6[Popup Yönetimi]
    MARKETING --> M7[AI Müşteri Bulucu]
    
    ADMIN --> FINANCE[Finans Yönetimi]
    FINANCE --> F1[Ödeme İşlemleri]
    FINANCE --> F2[Kullanıcı Cüzdanları]
    FINANCE --> F3[Bakiye Yükleme Talepleri]
    FINANCE --> F4[Bakiye Çekim Talepleri]
    FINANCE --> F5[Referans Kazançları]
    FINANCE --> F6[Gelir Raporları]
    FINANCE --> F7[Gider Raporları]
    
    ADMIN --> ANALYTICS[Analitik]
    ANALYTICS --> AN1[Detaylı Analitik]
    ANALYTICS --> AN2[Canlı Veriler]
    ANALYTICS --> AN3[Canlı Kullanıcılar]
    ANALYTICS --> AN4[Satış Raporları]
    ANALYTICS --> AN5[Müşteri Raporları]
    ANALYTICS --> AN6[Ürün Raporları]
    ANALYTICS --> AN7[Kategori Raporları]
    ANALYTICS --> AN8[Zaman Bazlı Analizler]
    
    ADMIN --> AI[Yapay Zeka]
    AI --> AI1[ML Insights]
    AI --> AI2[Project Ajax]
    AI --> AI3[Ürün Önerileri]
    AI --> AI4[Davranış Tahminleri]
    AI --> AI5[Anomali Tespiti]
    AI --> AI6[Segmentasyon Analizi]
    AI --> AI7[Trend Analizi]
    AI --> AI8[Öneri Sistemi]
    
    ADMIN --> PRODUCTION[Üretim Takibi]
    PRODUCTION --> PR1[Özel Üretim Talepleri]
    PRODUCTION --> PR2[Durum Takibi]
    PRODUCTION --> PR3[İstatistikler]
    
    ADMIN --> SYSTEM[Sistem Yönetimi]
    SYSTEM --> SY1[Kullanıcı Rolleri]
    SYSTEM --> SY2[Yetkiler]
    SYSTEM --> SY3[Sistem Ayarları]
    SYSTEM --> SY4[API Yönetimi]
    SYSTEM --> SY5[Log Yönetimi]
    SYSTEM --> SY6[Yedekleme]
    SYSTEM --> SY7[Güvenlik Ayarları]
    
    ADMIN --> OTHER_ADMIN[Diğer]
    OTHER_ADMIN --> OA1[Admin Logları]
    OTHER_ADMIN --> OA2[Sistem Durumu]
    OTHER_ADMIN --> OA3[Performans İzleme]
    OTHER_ADMIN --> OA4[Hata Yönetimi]
```



```mermaid4. Backend API Mimarisi

```mermaid
graph LR
    subgraph "API Routes"
        AUTH[/api/auth<br/>Kimlik Doğrulama]
        USERS[/api/users<br/>Kullanıcı Yönetimi]
        PRODUCTS[/api/products<br/>Ürün Yönetimi]
        CART[/api/cart<br/>Sepet İşlemleri]
        ORDERS[/api/orders<br/>Sipariş Yönetimi]
        PAYMENT[/api/payment<br/>Ödeme İşlemleri]
        WALLET[/api/wallet<br/>Cüzdan İşlemleri]
        CAMPAIGNS[/api/campaigns<br/>Kampanya Yönetimi]
        ANALYTICS[/api/analytics<br/>Analitik]
        ML_ROUTES[/api/ml<br/>ML Servisleri]
        RECOMMENDATIONS[/api/recommendations<br/>Öneriler]
        SEGMENTS[/api/segments<br/>Segmentasyon]
        STORIES[/api/stories<br/>Hikayeler]
        SLIDERS[/api/sliders<br/>Sliderlar]
        POPUPS[/api/popups<br/>Popuplar]
        FLASH_DEALS[/api/flash-deals<br/>Flash İndirimler]
        LIVE_USERS[/api/live-users<br/>Canlı Kullanıcılar]
        BACKUP[/api/backup<br/>Yedekleme]
        SCRAPERS[/api/scrapers<br/>Web Scraping]
        DEALERSHIP[/api/dealership<br/>Bayilik]
        CHAT[/api/chat<br/>Sohbet]
    end
    
    subgraph "Services"
        AUTH_SVC[Authentication Service]
        USER_SVC[User Service]
        PRODUCT_SVC[Product Service]
        ORDER_SVC[Order Service]
        PAYMENT_SVC[Payment Service<br/>İyzico]
        WALLET_SVC[Wallet Service]
        ANALYTICS_SVC[Analytics Service]
        ML_SVC[ML Service Client]
        RECOMMENDATION_SVC[Recommendation Service]
        SEGMENT_SVC[Segment Service]
        XML_SVC[XML Sync Service]
        GMAPS_SVC[Google Maps Service]
        TRENDYOL_SVC[Trendyol API]
        HEPSIBURADA_SVC[Hepsiburada API]
        ENCRYPTION_SVC[Encryption Service]
        QUEUE_SVC[Queue Service<br/>BullMQ]
    end
    
    subgraph "Middleware"
        TENANT[Tenant Isolation]
        API_KEY[API Key Auth]
        JWT_AUTH[JWT Auth]
        RATE_LIMIT[Rate Limiting]
        CORS[CORS]
        HELMET[Helmet Security]
        COMPRESSION[Compression]
    end
    
    AUTH --> AUTH_SVC
    USERS --> USER_SVC
    PRODUCTS --> PRODUCT_SVC
    CART --> PRODUCT_SVC
    ORDERS --> ORDER_SVC
    PAYMENT --> PAYMENT_SVC
    WALLET --> WALLET_SVC
    CAMPAIGNS --> USER_SVC
    ANALYTICS --> ANALYTICS_SVC
    ML_ROUTES --> ML_SVC
    RECOMMENDATIONS --> RECOMMENDATION_SVC
    SEGMENTS --> SEGMENT_SVC
    
    TENANT --> API_KEY
    API_KEY --> JWT_AUTH
    JWT_AUTH --> RATE_LIMIT
    RATE_LIMIT --> CORS
    CORS --> HELMET
    HELMET --> COMPRESSION
```



```mermaid5. Veritabanı Şeması

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "has"
    TENANTS ||--o{ PRODUCTS : "has"
    TENANTS ||--o{ ORDERS : "has"
    TENANTS ||--o{ CAMPAIGNS : "has"
    TENANTS ||--o{ INTEGRATIONS : "has"
    
    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ ADDRESSES : "has"
    USERS ||--o{ WALLETS : "has"
    USERS ||--o{ CART_ITEMS : "has"
    USERS ||--o{ FAVORITES : "has"
    USERS ||--o{ USER_DATA : "has"
    USERS ||--o{ REFERRALS : "has"
    
    PRODUCTS ||--o{ PRODUCT_IMAGES : "has"
    PRODUCTS ||--o{ PRODUCT_VARIATIONS : "has"
    PRODUCTS ||--o{ CART_ITEMS : "in"
    PRODUCTS ||--o{ ORDER_ITEMS : "in"
    PRODUCTS ||--o{ FAVORITES : "in"
    PRODUCTS ||--o{ CATEGORIES : "belongs to"
    
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDERS ||--o{ PAYMENTS : "has"
    ORDERS ||--o{ INVOICES : "has"
    ORDERS ||--o{ SHIPPING : "has"
    
    CAMPAIGNS ||--o{ COUPONS : "has"
    CAMPAIGNS ||--o{ FLASH_DEALS : "has"
    
    WALLETS ||--o{ WALLET_TRANSACTIONS : "has"
    WALLETS ||--o{ RECHARGE_REQUESTS : "has"
    WALLETS ||--o{ WITHDRAW_REQUESTS : "has"
    
    CUSTOM_PRODUCTION ||--o{ CUSTOM_PRODUCTION_MESSAGES : "has"
    
    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : "has"
    
    USER_DATA ||--o{ USER_SPECIFIC_DATA : "has"
    
    TENANTS {
        int id PK
        string name
        string apiKey
        string domain
        json settings
    }
    
    USERS {
        int id PK
        int tenantId FK
        string userId
        string email
        string password
        string name
        string phone
        int level
        decimal walletBalance
    }
    
    PRODUCTS {
        int id PK
        int tenantId FK
        string name
        string description
        decimal price
        int stock
        int categoryId FK
        json images
    }
    
    ORDERS {
        int id PK
        int tenantId FK
        int userId FK
        decimal totalAmount
        string status
        int addressId FK
        string paymentMethod
    }
    
    WALLETS {
        int id PK
        int userId FK
        decimal balance
        decimal bonusBalance
    }
    
    CAMPAIGNS {
        int id PK
        int tenantId FK
        string name
        string type
        json rules
        date startDate
        date endDate
    }
```



```mermaid6. ML Servisi Mimarisi

```mermaid
graph TB
    subgraph "ML Service - FastAPI"
        API[FastAPI Application<br/>Port 8000]
        WS[WebSocket Endpoint<br/>/ws]
        HEALTH[Health Check<br/>/health]
        STATS[Stats Endpoint<br/>/api/stats]
        MODELS[Model Management<br/>/api/models]
    end
    
    subgraph "ML Models"
        REC_MODEL[Recommendation Model<br/>TensorFlow]
        PRED_MODEL[Purchase Prediction<br/>Scikit-learn]
        ANOMALY_MODEL[Anomaly Detection<br/>Isolation Forest]
        SEGMENT_MODEL[Segmentation Model<br/>K-Means]
    end
    
    subgraph "Data Processing"
        PROCESSOR[Realtime Processor<br/>Event Buffer]
        TRAINER[Model Trainer<br/>Batch Training]
        DATA_PROC[Data Processor<br/>Feature Engineering]
    end
    
    subgraph "Storage"
        REDIS_ML[(Redis<br/>Event Queue)]
        DB_ML[(MySQL<br/>User Data)]
    end
    
    API --> WS
    API --> HEALTH
    API --> STATS
    API --> MODELS
    API --> PROCESSOR
    PROCESSOR --> REC_MODEL
    PROCESSOR --> PRED_MODEL
    PROCESSOR --> ANOMALY_MODEL
    PROCESSOR --> SEGMENT_MODEL
    PROCESSOR --> REDIS_ML
    PROCESSOR --> DB_ML
    TRAINER --> REC_MODEL
    TRAINER --> PRED_MODEL
    TRAINER --> ANOMALY_MODEL
    TRAINER --> SEGMENT_MODEL
    DATA_PROC --> TRAINER
    DB_ML --> DATA_PROC
    REDIS_ML --> PROCESSOR
```



```mermaid7. Ödeme Akışı

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant MA as Mobil App
    participant API as Backend API
    participant IYZICO as İyzico Gateway
    participant DB as MySQL
    participant WALLET as Wallet Service
    
    U->>MA: Sipariş Oluştur
    MA->>API: POST /api/orders
    API->>DB: Sipariş Kaydet
    
    alt Kredi Kartı Ödemesi
        U->>MA: Kart Bilgileri Gir
        MA->>API: POST /api/payment/process
        API->>IYZICO: Ödeme İsteği
        IYZICO-->>API: Ödeme Sonucu
        API->>DB: Ödeme Kaydı
        API-->>MA: Ödeme Başarılı
        MA-->>U: Sipariş Onayı
    else Cüzdan Ödemesi
        U->>MA: Cüzdan ile Öde
        MA->>API: POST /api/payment/wallet
        API->>WALLET: Bakiye Kontrolü
        WALLET-->>API: Bakiye Yeterli
        API->>DB: Cüzdan Güncelle
        API->>DB: Ödeme Kaydı
        API-->>MA: Ödeme Başarılı
        MA-->>U: Sipariş Onayı
    else EFT/Havale
        U->>MA: EFT/Havale Seç
        MA->>API: POST /api/payment/bank-transfer
        API->>DB: Bekleyen Ödeme Kaydı
        API-->>MA: Banka Bilgileri
        MA-->>U: Ödeme Talimatı
    end
```



```mermaid8. Multi-Tenant Yapısı

```mermaid
graph TB
    subgraph "Tenant Isolation Layer"
        REQ[Incoming Request]
        TENANT_MW[Tenant Middleware]
        API_KEY_CHECK[API Key Validation]
        TENANT_RESOLVER[Tenant Resolver]
    end
    
    subgraph "Tenant Data"
        TENANT_1[(Tenant 1<br/>Data)]
        TENANT_2[(Tenant 2<br/>Data)]
        TENANT_N[(Tenant N<br/>Data)]
    end
    
    subgraph "Shared Services"
        REDIS_SHARED[(Redis<br/>Shared Cache)]
        MYSQL_SHARED[(MySQL<br/>Multi-Tenant DB)]
    end
    
    REQ --> TENANT_MW
    TENANT_MW --> API_KEY_CHECK
    API_KEY_CHECK --> TENANT_RESOLVER
    TENANT_RESOLVER -->|Tenant 1| TENANT_1
    TENANT_RESOLVER -->|Tenant 2| TENANT_2
    TENANT_RESOLVER -->|Tenant N| TENANT_N
    TENANT_1 --> MYSQL_SHARED
    TENANT_2 --> MYSQL_SHARED
    TENANT_N --> MYSQL_SHARED
    TENANT_1 --> REDIS_SHARED
    TENANT_2 --> REDIS_SHARED
    TENANT_N --> REDIS_SHARED
```



```mermaid9. Güvenlik Katmanları

```mermaid
graph TB
    subgraph "Security Layers"
        L1[Layer 1: Network Security<br/>HTTPS/TLS]
        L2[Layer 2: Reverse Proxy<br/>Nginx]
        L3[Layer 3: API Gateway<br/>Rate Limiting]
        L4[Layer 4: Authentication<br/>API Key + JWT]
        L5[Layer 5: Authorization<br/>Role-Based Access]
        L6[Layer 6: Data Protection<br/>Encryption]
        L7[Layer 7: Input Validation<br/>XSS/SQL Injection Protection]
    end
    
    subgraph "Security Features"
        HELMET_SEC[Helmet.js<br/>Security Headers]
        CORS_SEC[CORS Configuration]
        RATE_SEC[Rate Limiting<br/>100 req/15min]
        ENCRYPT_SEC[AES-256-CBC<br/>Data Encryption]
        HASH_SEC[Bcrypt<br/>Password Hashing]
        JWT_SEC[JWT Tokens<br/>Stateless Auth]
        SQL_SEC[Parameterized Queries<br/>SQL Injection Protection]
        XSS_SEC[DOMPurify<br/>XSS Protection]
    end
    
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
    L5 --> L6
    L6 --> L7
    
    L2 --> HELMET_SEC
    L2 --> CORS_SEC
    L3 --> RATE_SEC
    L4 --> JWT_SEC
    L5 --> HASH_SEC
    L6 --> ENCRYPT_SEC
    L7 --> SQL_SEC
    L7 --> XSS_SEC
```



```mermaid10. Entegrasyonlar ve Dış Servisler

```mermaid
graph LR
    subgraph "Huğlu Platform"
        API[Backend API]
        ML[ML Service]
    end
    
    subgraph "Payment Services"
        IYZICO[İyzico<br/>Payment Gateway]
    end
    
    subgraph "Map Services"
        GMAPS[Google Maps API<br/>Location Services]
        LEAFLET[Leaflet<br/>Map Visualization]
    end
    
    subgraph "E-Commerce Platforms"
        TRENDYOL[Trendyol API<br/>Product Sync]
        HEPSIBURADA[Hepsiburada API<br/>Product Sync]
    end
    
    subgraph "Notification Services"
        SMS_GW[SMS Gateway<br/>SMS Notifications]
        EMAIL_SVC[Email Service<br/>Email Notifications]
        PUSH_SVC[Push Notification<br/>Mobile Push]
    end
    
    subgraph "AI Services"
        ANYTHING_LLM[AnythingLLM<br/>Chatbot Service]
        OLLAMA[Ollama<br/>Local LLM]
    end
    
    subgraph "Analytics Services"
        CUSTOM_ANALYTICS[Custom Analytics<br/>User Behavior]
        ML_ANALYTICS[ML Analytics<br/>Predictions]
    end
    
    API --> IYZICO
    API --> GMAPS
    API --> LEAFLET
    API --> TRENDYOL
    API --> HEPSIBURADA
    API --> SMS_GW
    API --> EMAIL_SVC
    API --> PUSH_SVC
    API --> ANYTHING_LLM
    API --> OLLAMA
    API --> CUSTOM_ANALYTICS
    ML --> ML_ANALYTICS
```



```mermaid11. Deployment Mimarisi

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Load Balancer"
            LB[Nginx Load Balancer<br/>Port 80/443]
        end
        
        subgraph "Application Servers"
            APP1[PM2 Cluster<br/>Node.js API<br/>Instance 1]
            APP2[PM2 Cluster<br/>Node.js API<br/>Instance 2]
            APP3[PM2 Cluster<br/>Node.js API<br/>Instance N]
        end
        
        subgraph "ML Service"
            ML_SVC[FastAPI Service<br/>Port 8000]
        end
        
        subgraph "Database Cluster"
            MYSQL_MASTER[(MySQL Master<br/>Write Operations)]
            MYSQL_SLAVE1[(MySQL Slave 1<br/>Read Operations)]
            MYSQL_SLAVE2[(MySQL Slave 2<br/>Read Operations)]
        end
        
        subgraph "Cache Layer"
            REDIS_MASTER[(Redis Master)]
            REDIS_REPLICA[(Redis Replica)]
        end
        
        subgraph "Storage"
            FILE_STORAGE[File Storage<br/>Uploads/Images]
        end
        
        subgraph "Monitoring"
            PM2_MON[PM2 Monitoring]
            LOGS[Log Aggregation]
        end
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    LB --> ML_SVC
    APP1 --> MYSQL_MASTER
    APP2 --> MYSQL_MASTER
    APP3 --> MYSQL_MASTER
    APP1 --> MYSQL_SLAVE1
    APP2 --> MYSQL_SLAVE2
    APP1 --> REDIS_MASTER
    APP2 --> REDIS_MASTER
    APP3 --> REDIS_MASTER
    MYSQL_MASTER --> MYSQL_SLAVE1
    MYSQL_MASTER --> MYSQL_SLAVE2
    REDIS_MASTER --> REDIS_REPLICA
    APP1 --> FILE_STORAGE
    APP2 --> FILE_STORAGE
    APP3 --> FILE_STORAGE
    APP1 --> PM2_MON
    APP2 --> PM2_MON
    APP3 --> PM2_MON
    APP1 --> LOGS
    APP2 --> LOGS
    APP3 --> LOGS
```



```mermaid12. Teknoloji Stack Detayları

```mermaid
graph TD
    STACK[Teknoloji Stack]
    
    STACK --> FRONTEND[Frontend]
    FRONTEND --> MOBILE[Mobil]
    MOBILE --> M1[React Native 0.74.5]
    MOBILE --> M2[Expo 51.0.19]
    MOBILE --> M3[TypeScript]
    MOBILE --> M4[React Navigation]
    MOBILE --> M5[AsyncStorage]
    MOBILE --> M6[Expo Secure Store]
    MOBILE --> M7[Expo Location]
    MOBILE --> M8[Expo Image Picker]
    MOBILE --> M9[React Native NFC Manager]
    MOBILE --> M10[Expo Local Authentication]
    MOBILE --> M11[Expo AV]
    MOBILE --> M12[Lottie React Native]
    MOBILE --> M13[Three.js]
    
    FRONTEND --> WEB[Web]
    WEB --> W1[Next.js 14]
    WEB --> W2[TypeScript]
    WEB --> W3[Tailwind CSS]
    WEB --> W4[React 18]
    WEB --> W5[Material Symbols]
    
    FRONTEND --> ADMIN_FE[Admin]
    ADMIN_FE --> AF1[Next.js 14]
    ADMIN_FE --> AF2[TypeScript]
    ADMIN_FE --> AF3[Tailwind CSS]
    ADMIN_FE --> AF4[Framer Motion]
    ADMIN_FE --> AF5[Recharts]
    ADMIN_FE --> AF6[Lucide React]
    ADMIN_FE --> AF7[Monaco Editor]
    ADMIN_FE --> AF8[Leaflet]
    ADMIN_FE --> AF9[Puppeteer]
    ADMIN_FE --> AF10[PapaParse]
    ADMIN_FE --> AF11[XLSX]
    
    STACK --> BACKEND[Backend]
    BACKEND --> BE_RUNTIME[Runtime]
    BE_RUNTIME --> BR1[Node.js]
    BE_RUNTIME --> BR2[Express.js]
    
    BACKEND --> BE_DB[Database]
    BE_DB --> BD1[MySQL2]
    BE_DB --> BD2[Sequelize ORM]
    
    BACKEND --> BE_CACHE[Cache]
    BE_CACHE --> BC1[Redis ioredis]
    BE_CACHE --> BC2[BullMQ]
    
    BACKEND --> BE_SEC[Security]
    BE_SEC --> BS1[Helmet]
    BE_SEC --> BS2[CORS]
    BE_SEC --> BS3[Bcrypt]
    BE_SEC --> BS4[JWT]
    BE_SEC --> BS5[Express Rate Limit]
    
    BACKEND --> BE_FILE[File Processing]
    BE_FILE --> BF1[Multer]
    BE_FILE --> BF2[Sharp]
    
    BACKEND --> BE_SCRAPE[Web Scraping]
    BE_SCRAPE --> BSC1[Cheerio]
    BE_SCRAPE --> BSC2[Playwright]
    BE_SCRAPE --> BSC3[Puppeteer]
    
    BACKEND --> BE_PAY[Payment]
    BE_PAY --> BP1[İyzico SDK]
    
    BACKEND --> BE_OTHER[Other]
    BE_OTHER --> BO1[XML2JS]
    BE_OTHER --> BO2[Compression]
    BE_OTHER --> BO3[Morgan]
    
    STACK --> ML[ML Service]
    ML --> ML_FW[Framework]
    ML_FW --> MF1[Python]
    ML_FW --> MF2[FastAPI]
    ML_FW --> MF3[Uvicorn]
    
    ML --> ML_LIB[ML Libraries]
    ML_LIB --> ML1[TensorFlow 2.15.0]
    ML_LIB --> ML2[Scikit-learn 1.3.2]
    ML_LIB --> ML3[NumPy 1.24.3]
    ML_LIB --> ML4[Pandas 2.1.3]
    
    ML --> ML_DB[Database]
    ML_DB --> MD1[PyMySQL]
    ML_DB --> MD2[Redis]
    
    ML --> ML_OTHER[Other]
    ML_OTHER --> MO1[WebSockets]
    ML_OTHER --> MO2[Joblib]
    ML_OTHER --> MO3[Pydantic]
    
    STACK --> DEVOPS[DevOps]
    DEVOPS --> DEV_CONTAINER[Containerization]
    DEV_CONTAINER --> DC1[Docker]
    DEV_CONTAINER --> DC2[Docker Compose]
    
    DEVOPS --> DEV_PROCESS[Process Management]
    DEV_PROCESS --> DP1[PM2]
    DEV_PROCESS --> DP2[Systemd]
    
    DEVOPS --> DEV_WEB[Web Server]
    DEV_WEB --> DW1[Nginx]
    
    DEVOPS --> DEV_VERSION[Version Control]
    DEV_VERSION --> DV1[Git]
    
    DEVOPS --> DEV_MON[Monitoring]
    DEV_MON --> DM1[PM2 Monitoring]
    DEV_MON --> DM2[Custom Logging]
```



```mermaid13. API Endpoint Yapısı

```mermaid
graph TB
    subgraph "Public Endpoints"
        HEALTH[/api/health<br/>GET]
        LOGIN[/api/users/login<br/>POST]
        REGISTER[/api/users<br/>POST]
        PRODUCTS_PUBLIC[/api/products<br/>GET]
    end
    
    subgraph "Authenticated Endpoints"
        PROFILE[/api/users/profile<br/>GET/PUT]
        CART[/api/cart<br/>GET/POST/PUT/DELETE]
        ORDERS[/api/orders<br/>GET/POST]
        PAYMENT[/api/payment<br/>POST]
        WALLET[/api/wallet<br/>GET/POST]
        ADDRESSES[/api/addresses<br/>GET/POST/PUT/DELETE]
    end
    
    subgraph "Admin Endpoints"
        ADMIN_DASHBOARD[/api/admin/dashboard<br/>GET]
        ADMIN_PRODUCTS[/api/admin/products<br/>CRUD]
        ADMIN_ORDERS[/api/admin/orders<br/>CRUD]
        ADMIN_USERS[/api/admin/users<br/>CRUD]
        ADMIN_CAMPAIGNS[/api/admin/campaigns<br/>CRUD]
        ADMIN_ANALYTICS[/api/admin/analytics<br/>GET]
        ADMIN_ML[/api/admin/ml<br/>GET/POST]
        ADMIN_RECOMMENDATIONS[/api/admin/recommendations<br/>GET]
        ADMIN_SEGMENTS[/api/admin/segments<br/>GET]
        ADMIN_STORIES[/api/admin/stories<br/>CRUD]
        ADMIN_SLIDERS[/api/admin/sliders<br/>CRUD]
        ADMIN_POPUPS[/api/admin/popups<br/>CRUD]
        ADMIN_FLASH_DEALS[/api/admin/flash-deals<br/>CRUD]
        ADMIN_LIVE_USERS[/api/admin/live-users<br/>GET]
        ADMIN_BACKUP[/api/admin/backup<br/>GET/POST]
        ADMIN_SCRAPERS[/api/admin/scrapers<br/>POST]
    end
    
    subgraph "ML Endpoints"
        ML_HEALTH[/api/ml/health<br/>GET]
        ML_STATS[/api/ml/stats<br/>GET]
        ML_MODELS[/api/ml/models<br/>GET/POST]
        ML_PREDICT[/api/ml/predict<br/>POST]
        ML_RECOMMEND[/api/ml/recommend<br/>POST]
    end
```



```mermaid14. Veri Akışı - Kullanıcı Etkileşimi

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant MA as Mobil App
    participant API as Backend API
    participant REDIS as Redis Cache
    participant DB as MySQL
    participant ML as ML Service
    participant ANALYTICS as Analytics Service
    
    U->>MA: Ürün Görüntüleme
    MA->>API: GET /api/products/:id
    API->>REDIS: Cache Kontrolü
    alt Cache Hit
        REDIS-->>API: Cached Data
    else Cache Miss
        API->>DB: Ürün Sorgula
        DB-->>API: Ürün Data
        API->>REDIS: Cache'e Kaydet
    end
    API-->>MA: Ürün Data
    MA-->>U: Ürün Gösterimi
    
    MA->>ANALYTICS: Event Log (product_view)
    ANALYTICS->>ML: Event Queue'ya Ekle
    ML->>ML: Davranış Analizi
    ML->>DB: Kullanıcı Segment Güncelle
    
    U->>MA: Sepete Ekle
    MA->>API: POST /api/cart
    API->>DB: Sepet Güncelle
    API-->>MA: Başarılı
    
    U->>MA: Sipariş Oluştur
    MA->>API: POST /api/orders
    API->>ML: Öneri Sistemi Sorgula
    ML-->>API: Öneriler
    API->>DB: Sipariş Kaydet
    API-->>MA: Sipariş Onayı
```



```mermaid15. Kampanya ve İndirim Sistemi

```mermaid
graph TB
    subgraph "Campaign Types"
        FLASH[Flash Deals<br/>Zamanlı İndirimler]
        COUPON[Kupon Kodları<br/>İndirim Kuponları]
        WHEEL[İndirim Çarkı<br/>Şans Oyunu]
        PERSONAL[Kişiselleştirilmiş<br/>Teklifler]
        REFERRAL[Referans Sistemi<br/>Arkadaş Kazandır]
    end
    
    subgraph "Campaign Engine"
        RULES[Kural Motoru<br/>Koşul Kontrolü]
        CALC[İndirim Hesaplama<br/>Fiyat Güncelleme]
        VALIDATE[Geçerlilik Kontrolü<br/>Tarih/Stok/Kullanıcı]
    end
    
    subgraph "Storage"
        CAMPAIGN_DB[(Campaigns Table)]
        COUPON_DB[(Coupons Table)]
        USAGE_DB[(Usage History)]
    end
    
    FLASH --> RULES
    COUPON --> RULES
    WHEEL --> RULES
    PERSONAL --> RULES
    REFERRAL --> RULES
    
    RULES --> VALIDATE
    VALIDATE --> CALC
    CALC --> CAMPAIGN_DB
    CALC --> COUPON_DB
    CALC --> USAGE_DB
```



```mermaid16. Öneri Sistemi Mimarisi

```mermaid
graph TB
    subgraph "Recommendation Sources"
        USER_BASED[Kullanıcı Bazlı<br/>Benzer Kullanıcılar]
        ITEM_BASED[Ürün Bazlı<br/>Benzer Ürünler]
        CONTENT_BASED[İçerik Bazlı<br/>Ürün Özellikleri]
        COLLABORATIVE[İşbirlikçi Filtreleme<br/>Matrix Factorization]
        ML_BASED[ML Tabanlı<br/>Deep Learning]
    end
    
    subgraph "Recommendation Engine"
        COLLECTOR[Veri Toplayıcı<br/>User Behavior]
        PROCESSOR[İşlemci<br/>Feature Engineering]
        MODEL[ML Model<br/>TensorFlow]
        RANKER[Sıralayıcı<br/>Score Calculation]
    end
    
    subgraph "Storage"
        USER_DATA[(User Data)]
        PRODUCT_DATA[(Product Data)]
        INTERACTION_DATA[(Interaction Data)]
        MODEL_CACHE[(Model Cache)]
    end
    
    USER_BASED --> COLLECTOR
    ITEM_BASED --> COLLECTOR
    CONTENT_BASED --> COLLECTOR
    COLLABORATIVE --> COLLECTOR
    ML_BASED --> COLLECTOR
    
    COLLECTOR --> USER_DATA
    COLLECTOR --> PRODUCT_DATA
    COLLECTOR --> INTERACTION_DATA
    
    COLLECTOR --> PROCESSOR
    PROCESSOR --> MODEL
    MODEL --> MODEL_CACHE
    MODEL --> RANKER
    RANKER --> USER_DATA
```



```mermaid17. Canlı Kullanıcı Takibi

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant MA as Mobil App
    participant API as Backend API
    participant LIVE_SVC as Live User Service
    participant REDIS as Redis
    participant WS as WebSocket
    
    U->>MA: Uygulama Açılışı
    MA->>API: POST /api/live-users/register
    API->>LIVE_SVC: Kullanıcı Kaydı
    LIVE_SVC->>REDIS: Active Users Set
    LIVE_SVC->>WS: Broadcast Update
    
    loop Her 30 Saniyede
        MA->>API: POST /api/live-users/heartbeat
        API->>LIVE_SVC: Heartbeat Update
        LIVE_SVC->>REDIS: TTL Güncelle
    end
    
    U->>MA: Ekran Değişikliği
    MA->>API: POST /api/user-data/log
    API->>LIVE_SVC: Activity Update
    LIVE_SVC->>REDIS: Activity Log
    
    U->>MA: Uygulama Kapanışı
    MA->>API: POST /api/live-users/unregister
    API->>LIVE_SVC: Kullanıcı Çıkışı
    LIVE_SVC->>REDIS: Remove from Set
    LIVE_SVC->>WS: Broadcast Update
```



```mermaid18. XML Ürün Senkronizasyonu

```mermaid
sequenceDiagram
    participant CRON as Cron Job
    participant XML_SVC as XML Sync Service
    participant PARSER as XML Parser
    participant VALIDATOR as Data Validator
    participant DB as MySQL
    participant QUEUE as BullMQ Queue
    
    CRON->>XML_SVC: Zamanlanmış Senkronizasyon
    XML_SVC->>XML_SVC: XML Kaynakları Al
    XML_SVC->>PARSER: XML Parse Et
    PARSER->>VALIDATOR: Veri Doğrula
    VALIDATOR->>VALIDATOR: Stok Kontrolü
    VALIDATOR->>VALIDATOR: Fiyat Kontrolü
    VALIDATOR->>VALIDATOR: Kategori Kontrolü
    VALIDATOR->>QUEUE: İş Kuyruğuna Ekle
    QUEUE->>DB: Toplu Güncelleme
    DB-->>XML_SVC: Senkronizasyon Tamamlandı
    XML_SVC->>XML_SVC: Hata Raporu Oluştur
```



```mermaid19. Chatbot Sistemi

```mermaid
graph TB
    subgraph "Chatbot Architecture"
        USER_INPUT[Kullanıcı Mesajı]
        INTENT[Intent Recognition]
        CONTEXT[Context Manager]
        RESPONSE[Response Generator]
    end
    
    subgraph "AI Services"
        ANYTHING_LLM[AnythingLLM<br/>Chatbot API]
        OLLAMA[Ollama<br/>Local LLM]
        PROJECT_AJAX[Project Ajax<br/>Custom AI]
    end
    
    subgraph "Knowledge Base"
        FAQ[FAQ Database]
        PRODUCT_KB[Product Knowledge]
        ORDER_KB[Order Information]
        USER_KB[User Context]
    end
    
    subgraph "Response Types"
        TEXT[TEXT Response]
        PRODUCT[Product Recommendation]
        ORDER[Order Status]
        ACTION[Action Execution]
    end
    
    USER_INPUT --> INTENT
    INTENT --> CONTEXT
    CONTEXT --> ANYTHING_LLM
    CONTEXT --> OLLAMA
    CONTEXT --> PROJECT_AJAX
    CONTEXT --> FAQ
    CONTEXT --> PRODUCT_KB
    CONTEXT --> ORDER_KB
    CONTEXT --> USER_KB
    CONTEXT --> RESPONSE
    RESPONSE --> TEXT
    RESPONSE --> PRODUCT
    RESPONSE --> ORDER
    RESPONSE --> ACTION
```



```mermaid20. Cüzdan Sistemi İşlemleri

```mermaid
stateDiagram-v2
    [*] --> WalletCreated: Kullanıcı Kaydı
    
    WalletCreated --> BalanceLoaded: Para Yükleme Talebi
    BalanceLoaded --> PendingApproval: Admin Onayı Bekleniyor
    PendingApproval --> Approved: Admin Onayladı
    PendingApproval --> Rejected: Admin Reddetti
    Approved --> WalletCreated: Bakiye Güncellendi
    Rejected --> WalletCreated: İşlem İptal
    
    WalletCreated --> WithdrawRequest: Para Çekme Talebi
    WithdrawRequest --> WithdrawPending: Onay Bekleniyor
    WithdrawPending --> WithdrawApproved: Onaylandı
    WithdrawPending --> WithdrawRejected: Reddedildi
    WithdrawApproved --> WalletCreated: Bakiye Düşürüldü
    WithdrawRejected --> WalletCreated: İşlem İptal
    
    WalletCreated --> Payment: Cüzdan ile Ödeme
    Payment --> WalletCreated: Ödeme Tamamlandı
    
    WalletCreated --> Transfer: Kullanıcılar Arası Transfer
    Transfer --> WalletCreated: Transfer Tamamlandı
    
    WalletCreated --> BonusEarned: Bonus Kazanıldı
    BonusEarned --> WalletCreated: Bonus Eklendi
```



```mermaid21. Güvenlik ve Yetkilendirme Akışı

```mermaid
sequenceDiagram
    participant C as Client
    participant NGINX as Nginx
    participant API as Backend API
    participant AUTH as Auth Service
    participant DB as MySQL
    participant REDIS as Redis
    
    C->>NGINX: HTTPS Request
    NGINX->>NGINX: SSL Termination
    NGINX->>API: Forward Request
    
    API->>API: Helmet Security Headers
    API->>API: CORS Check
    API->>API: Rate Limiting Check
    
    alt Public Endpoint
        API-->>C: Public Response
    else Protected Endpoint
        API->>API: API Key Check (X-API-Key)
        alt Invalid API Key
            API-->>C: 401 Unauthorized
        else Valid API Key
            API->>AUTH: Tenant Resolution
            AUTH->>DB: Tenant Lookup
            DB-->>AUTH: Tenant Data
            AUTH-->>API: Tenant Context
            
            alt Admin Endpoint
                API->>API: JWT Token Check
                alt Invalid Token
                    API-->>C: 401 Unauthorized
                else Valid Token
                    API->>AUTH: Role Check
                    AUTH->>DB: Permission Lookup
                    DB-->>AUTH: Permissions
                    alt Insufficient Permissions
                        AUTH-->>API: 403 Forbidden
                        API-->>C: 403 Forbidden
                    else Sufficient Permissions
                        AUTH-->>API: Authorized
                        API->>DB: Business Logic
                        DB-->>API: Data
                        API-->>C: Success Response
                    end
                end
            else User Endpoint
                API->>AUTH: User Authentication
                AUTH->>REDIS: Session Check
                alt Valid Session
                    REDIS-->>AUTH: Session Data
                    AUTH-->>API: Authenticated
                    API->>DB: Business Logic
                    DB-->>API: Data
                    API-->>C: Success Response
                else Invalid Session
                    REDIS-->>AUTH: No Session
                    AUTH-->>API: Unauthenticated
                    API-->>C: 401 Unauthorized
                end
            end
        end
    end
```



```mermaid22. Performans Optimizasyonları

```mermaid
graph TB
    subgraph "Caching Strategy"
        REDIS_CACHE[Redis Cache<br/>Hot Data]
        MEMORY_CACHE[In-Memory Cache<br/>Frequently Accessed]
        CDN[CDN<br/>Static Assets]
    end
    
    subgraph "Database Optimization"
        CONNECTION_POOL[Connection Pooling<br/>20 Connections]
        READ_REPLICA[Read Replicas<br/>Load Distribution]
        INDEXING[Database Indexing<br/>Query Optimization]
        QUERY_CACHE[Query Cache<br/>Frequent Queries]
    end
    
    subgraph "Application Optimization"
        COMPRESSION[Response Compression<br/>Gzip/Brotli]
        LAZY_LOADING[Lazy Loading<br/>On-Demand Loading]
        CODE_SPLITTING[Code Splitting<br/>Bundle Optimization]
        PARALLEL_REQUESTS[Parallel Requests<br/>Concurrent Processing]
    end
    
    subgraph "Monitoring"
        PERFORMANCE_MON[Performance Monitoring<br/>Response Times]
        ERROR_TRACKING[Error Tracking<br/>Exception Handling]
        RESOURCE_USAGE[Resource Usage<br/>CPU/Memory]
    end
    
    REDIS_CACHE --> CONNECTION_POOL
    MEMORY_CACHE --> READ_REPLICA
    CDN --> INDEXING
    COMPRESSION --> QUERY_CACHE
    LAZY_LOADING --> PARALLEL_REQUESTS
    CODE_SPLITTING --> PERFORMANCE_MON
    PARALLEL_REQUESTS --> ERROR_TRACKING
    PERFORMANCE_MON --> RESOURCE_USAGE
```



```mermaid23. Loglama ve İzleme Sistemi

```mermaid
graph TB
    subgraph "Log Sources"
        API_LOGS[API Logs<br/>Request/Response]
        ERROR_LOGS[Error Logs<br/>Exceptions]
        ACCESS_LOGS[Access Logs<br/>Nginx]
        BUSINESS_LOGS[Business Logs<br/>Transactions]
        ML_LOGS[ML Service Logs<br/>Predictions]
    end
    
    subgraph "Log Processing"
        MORGAN[Morgan<br/>HTTP Logging]
        WINSTON[Winston<br/>Structured Logging]
        FILE_LOG[File Logging<br/>Rotating Logs]
    end
    
    subgraph "Log Storage"
        LOG_FILES[Log Files<br/>/logs Directory]
        DB_LOGS[(Database Logs<br/>Admin Logs Table)]
    end
    
    subgraph "Monitoring"
        PM2_MON[PM2 Monitoring<br/>Process Health]
        HEALTH_CHECK[Health Checks<br/>Service Status]
        ALERTS[Alerting System<br/>Critical Events]
    end
    
    API_LOGS --> MORGAN
    ERROR_LOGS --> WINSTON
    ACCESS_LOGS --> FILE_LOG
    BUSINESS_LOGS --> WINSTON
    ML_LOGS --> WINSTON
    
    MORGAN --> LOG_FILES
    WINSTON --> LOG_FILES
    FILE_LOG --> LOG_FILES
    WINSTON --> DB_LOGS
    
    LOG_FILES --> PM2_MON
    DB_LOGS --> HEALTH_CHECK
    PM2_MON --> ALERTS
    HEALTH_CHECK --> ALERTS
```



```mermaid24. Backup ve Yedekleme Stratejisi

```mermaid
graph TB
    subgraph "Backup Types"
        DB_BACKUP[Database Backup<br/>MySQL Dump]
        FILE_BACKUP[File Backup<br/>Uploads/Images]
        CONFIG_BACKUP[Config Backup<br/>Settings]
    end
    
    subgraph "Backup Schedule"
        DAILY[Daily Backup<br/>Full Database]
        WEEKLY[Weekly Backup<br/>Incremental]
        MONTHLY[Monthly Backup<br/>Archive]
    end
    
    subgraph "Backup Storage"
        LOCAL[Local Storage<br/>Server]
        REMOTE[Remote Storage<br/>Cloud/FTP]
        COMPRESSED[Compressed Archives<br/>Zip/Tar]
    end
    
    subgraph "Recovery"
        RESTORE[Restore Process<br/>Data Recovery]
        VERIFY[Verification<br/>Backup Integrity]
    end
    
    DB_BACKUP --> DAILY
    FILE_BACKUP --> WEEKLY
    CONFIG_BACKUP --> MONTHLY
    
    DAILY --> LOCAL
    WEEKLY --> REMOTE
    MONTHLY --> COMPRESSED
    
    LOCAL --> RESTORE
    REMOTE --> RESTORE
    COMPRESSED --> RESTORE
    RESTORE --> VERIFY
```



```mermaid25. Özellik Matrisi - Tüm Modüller

```mermaid
graph TB
    subgraph "Core Features"
        AUTH_FEAT[Authentication<br/>Login/Register/2FA]
        USER_FEAT[User Management<br/>Profile/Settings]
        PRODUCT_FEAT[Product Management<br/>Catalog/Search/Filter]
        CART_FEAT[Cart Management<br/>Add/Update/Remove]
        ORDER_FEAT[Order Management<br/>Create/Track/Cancel]
    end
    
    subgraph "Payment Features"
        PAYMENT_FEAT[Payment Processing<br/>Card/EFT/Wallet]
        WALLET_FEAT[Wallet System<br/>Balance/Transfer]
        INVOICE_FEAT[Invoice Generation<br/>PDF/Email]
    end
    
    subgraph "Marketing Features"
        CAMPAIGN_FEAT[Campaign Management<br/>Flash/Coupon/Wheel]
        NOTIFICATION_FEAT[Notifications<br/>Push/Email/SMS]
        STORY_FEAT[Stories<br/>Instagram-like]
        SLIDER_FEAT[Sliders<br/>Banner Management]
        POPUP_FEAT[Popups<br/>Announcements]
    end
    
    subgraph "Analytics Features"
        ANALYTICS_FEAT[Analytics<br/>Sales/User/Product]
        ML_FEAT[ML Insights<br/>Predictions/Recommendations]
        SEGMENT_FEAT[Segmentation<br/>User Groups]
        LIVE_FEAT[Live Users<br/>Real-time Tracking]
    end
    
    subgraph "Advanced Features"
        CUSTOM_PROD[Custom Production<br/>Made-to-Order]
        DEALERSHIP[Dealership<br/>Franchise System]
        REFERRAL[Referral System<br/>Rewards]
        CHATBOT[Chatbot<br/>AI Support]
        NFC[NFC Scanning<br/>Product Identification]
    end
    
    AUTH_FEAT --> USER_FEAT
    USER_FEAT --> PRODUCT_FEAT
    PRODUCT_FEAT --> CART_FEAT
    CART_FEAT --> ORDER_FEAT
    ORDER_FEAT --> PAYMENT_FEAT
    PAYMENT_FEAT --> WALLET_FEAT
    WALLET_FEAT --> INVOICE_FEAT
    CAMPAIGN_FEAT --> NOTIFICATION_FEAT
    NOTIFICATION_FEAT --> STORY_FEAT
    STORY_FEAT --> SLIDER_FEAT
    SLIDER_FEAT --> POPUP_FEAT
    ANALYTICS_FEAT --> ML_FEAT
    ML_FEAT --> SEGMENT_FEAT
    SEGMENT_FEAT --> LIVE_FEAT
    CUSTOM_PROD --> DEALERSHIP
    DEALERSHIP --> REFERRAL
    REFERRAL --> CHATBOT
    CHATBOT --> NFC
```
