# Google Maps Veri Toplama ve Excel Kaydetme - n8n Workflow

Bu workflow, Google Maps'ten veri toplar, Excel formatına dönüştürür, MySQL veritabanına kaydeder ve Google Drive'a yükler.

## Workflow ID
**hShLHo8fdvIzKmkS**

## Nasıl Kullanılır

### 1. Gerekli Ayarlar

#### Google Maps API Key
1. [Google Cloud Console](https://console.cloud.google.com/) üzerinden bir proje oluşturun
2. Maps JavaScript API ve Places API'yi etkinleştirin
3. API Key oluşturun
4. n8n workflow'undaki "Google Maps API" node'unu açın
5. `queryParameters` içindeki `key` değerini kendi API key'inizle değiştirin

#### Google Drive Bağlantısı
1. n8n'de "Google Drive'a Yükle" node'unu açın
2. Credentials bölümünden Google Drive OAuth2 bağlantısı oluşturun
3. Gerekli izinleri verin (Drive API erişimi)

#### MySQL Veritabanı Bağlantısı
1. n8n'de "MySQL'e Kaydet" node'unu açın
2. Credentials bölümünden MySQL bağlantısı oluşturun:
   - **Host**: MySQL sunucu adresi (örn: `your-server.com` veya IP adresi)
   - **Port**: MySQL port numarası (varsayılan: `3306`)
   - **Database**: Veritabanı adı
   - **User**: MySQL kullanıcı adı
   - **Password**: MySQL şifresi
3. Bağlantıyı test edin

#### MySQL Tablo Yapısı
MySQL veritabanınızda aşağıdaki tabloyu oluşturun:

```sql
CREATE TABLE `google_maps_data` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT,
  `rating` DECIMAL(3,2) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `website` VARCHAR(500) DEFAULT NULL,
  `latitude` DECIMAL(10,8) DEFAULT NULL,
  `longitude` DECIMAL(11,8) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_name_address` (`name`(100), `address`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Not:** Tablo adını değiştirmek isterseniz, "MySQL'e Kaydet" node'undaki `table` parametresini güncelleyin.

### 2. Workflow Yapılandırması

#### Tetikleme Seçenekleri

**A) Otomatik (Schedule Trigger)**
- Her 1 saatte bir çalışır (varsayılan)
- Zamanlamayı değiştirmek için "Schedule Trigger" node'unu düzenleyin

**B) Manuel (Webhook)**
- Webhook URL'i kullanarak manuel olarak tetikleyebilirsiniz
- n8n UI'dan webhook URL'ini alın: `https://otomasyon.plaxsy.com/webhook/google-maps-scraper`

#### Arama Parametreleri
"Google Maps API" node'unda `query` parametresini değiştirerek farklı aramalar yapabilirsiniz:
- `restaurant in Istanbul`
- `hotel in Ankara`
- `pharmacy near me`

### 3. Toplanan Veriler

Workflow şu bilgileri toplar ve Excel'e yazar:
- İsim (name)
- Adres (formatted_address)
- Değerlendirme (rating)
- Telefon (formatted_phone_number)
- Web Sitesi (website)
- Enlem (latitude)
- Boylam (longitude)

**Not:** Duplicate temizleme işlemi otomatik olarak yapılır. Aynı isim ve adrese sahip kayıtlar hem MySQL'e hem Excel'e yazılmadan önce filtrelenir.

### 4. Veri Depolama

#### Excel Dosyası
- Dosya adı: `google_maps_data_YYYY-MM-DD_HH-mm-ss.xlsx`
- Google Drive'a otomatik yüklenir
- Root klasörüne kaydedilir (klasör değiştirilebilir)

#### MySQL Veritabanı
- Veriler `google_maps_data` tablosuna kaydedilir
- Duplicate kayıtlar otomatik atlanır (`skipOnConflict` aktif)
- Her kayıt için `created_at` ve `updated_at` timestamp'leri otomatik eklenir

### 5. Workflow'u Aktifleştirme

1. n8n dashboard'da workflow'u açın
2. Sağ üstteki "Active" toggle'ı açın
3. Workflow otomatik olarak çalışmaya başlar

### 6. Sorun Giderme

**API Key Hatası:**
- Google Maps API key'inizin doğru olduğundan emin olun
- API key'in Places API için etkin olduğunu kontrol edin

**Google Drive Bağlantı Hatası:**
- Google Drive credentials'larının doğru olduğundan emin olun
- OAuth2 izinlerinin verildiğini kontrol edin

**Veri Bulunamadı:**
- Arama query'sini değiştirmeyi deneyin
- API limitlerinizi kontrol edin

**MySQL Bağlantı Hatası:**
- MySQL sunucunuzun uzak bağlantılara açık olduğundan emin olun
- Firewall ayarlarını kontrol edin (3306 portu açık olmalı)
- MySQL kullanıcısının uzak bağlantı izni olduğundan emin olun: `GRANT ALL ON database_name.* TO 'user'@'%';`
- MySQL credentials'larının doğru olduğunu kontrol edin

**MySQL Tablo Hatası:**
- Tablo adının doğru olduğundan emin olun
- Tablo kolonlarının workflow'daki alanlarla eşleştiğinden emin olun
- `skipOnConflict` seçeneği aktif olduğundan emin olun (duplicate kayıtları atlar)

## Önemli Notlar

⚠️ **Google Maps API Limitleri:**
- Ücretsiz tier'da günlük sınırlar vardır
- Çok fazla istek yapmamaya dikkat edin

⚠️ **Veri İşleme:**
- Google Maps API'den gelen response'da `results` array'i bulunur
- Workflow'da "Her Sonuç İçin" node'u bu array'i tek tek işler

✅ **Duplicate Temizleme:**
- Workflow otomatik olarak duplicate (çift) verileri temizler
- "Duplicate Temizle" node'u aynı isim ve adrese sahip kayıtları otomatik olarak filtrelenir
- Karşılaştırma kriterleri: `name` ve `address` alanları
- İlk görülen kayıt tutulur, duplicate'ler silinir

## Workflow Yapısı

```
Schedule Trigger / Webhook
    ↓
Google Maps API (HTTP Request)
    ↓
Her Sonuç İçin (ItemLists - Split)
    ↓
Veriyi İşle (Set)
    ↓
Duplicate Temizle (Remove Duplicates)
    ├──→ Excel Oluştur (Spreadsheet File) → Google Drive'a Yükle → Yanıt
    └──→ MySQL'e Kaydet (MySQL Insert)
```

## Özelleştirme Önerileri

1. **Farklı Veriler Toplama:**
   - "Veriyi İşle" node'unda yeni alanlar ekleyebilirsiniz
   - Place Details API kullanarak daha fazla bilgi alabilirsiniz

2. **Filtreleme:**
   - Minimum rating filtresi ekleyebilirsiniz
   - Belirli kategoriler için filtreleme yapabilirsiniz

3. **Duplicate Kontrolü:**
   - "Duplicate Temizle" node'unda karşılaştırma kriterlerini değiştirebilirsiniz
   - Sadece `name` veya sadece `address` alanına göre de duplicate kontrolü yapabilirsiniz
   - `place_id` gibi unique identifier kullanarak daha hassas duplicate kontrolü ekleyebilirsiniz

4. **MySQL Özelleştirme:**
   - Farklı bir tablo adı kullanmak için "MySQL'e Kaydet" node'undaki `table` parametresini değiştirin
   - `upsert` operation kullanarak mevcut kayıtları güncelleyebilirsiniz
   - Transaction mode kullanarak batch insert yapabilirsiniz

4. **Klasör Yapısı:**
   - Google Drive'da otomatik klasör oluşturup dosyaları oraya kaydedebilirsiniz
   - Tarih bazlı klasörleme yapabilirsiniz

5. **Bildirimler:**
   - Email veya Slack bildirimleri ekleyebilirsiniz
   - Hata durumlarında uyarı alabilirsiniz

## İletişim

Workflow ile ilgili sorularınız için n8n dashboard'ını kontrol edin veya geliştiriciyle iletişime geçin.

