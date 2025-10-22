# Tekstil Atölyesi - Next.js Web Uygulaması

Bu proje, özel iş kıyafetleri üretimi yapan Tekstil Atölyesi için Next.js ve React kullanılarak geliştirilmiş modern bir web uygulamasıdır.

## Özellikler

- ✅ Next.js 14 App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Responsive tasarım
- ✅ Dark mode desteği
- ✅ Material Symbols ikonları

## Sayfalar

- **Ana Sayfa** (`/`) - Hero section, özellikler, referanslar, ürünler
- **Ürünler** (`/urunler`) - Ürün kataloğu
- **Hakkımızda** (`/hakkimizda`) - Şirket bilgileri
- **İletişim** (`/iletisim`) - İletişim formu ve bilgileri
- **Yönetici Girişi** (`/yonetici/giris`) - Admin panel girişi
- **Müşteri Paneli** (`/musteri/panel`) - Müşteri kontrol paneli

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

3. Tarayıcınızda açın: [http://localhost:3000](http://localhost:3000)

## Proje Yapısı

```
tekstil-atolyesi/
├── app/                    # Next.js App Router sayfaları
│   ├── layout.tsx         # Ana layout
│   ├── page.tsx           # Ana sayfa
│   ├── globals.css        # Global stiller
│   ├── urunler/           # Ürünler sayfası
│   ├── hakkimizda/        # Hakkımızda sayfası
│   ├── iletisim/          # İletişim sayfası
│   ├── yonetici/          # Yönetici paneli
│   └── musteri/           # Müşteri paneli
├── components/            # React componentleri
│   ├── Header.tsx         # Üst menü
│   ├── Footer.tsx         # Alt bilgi
│   └── Sidebar.tsx        # Yan menü (panel)
└── public/                # Statik dosyalar
```

## Teknolojiler

- **Next.js 14** - React framework
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Utility-first CSS framework
- **Material Symbols** - Google ikonları

## Build

Production build oluşturmak için:

```bash
npm run build
npm start
```

## Lisans

© 2023 Tekstil Atölyesi. Tüm hakları saklıdır.
