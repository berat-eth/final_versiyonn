'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'

interface GalleryImage {
  id: number
  src: string
  alt: string
  category: string
  title?: string
}

const galleryImages: GalleryImage[] = [
  // Atölye Görselleri
  { id: 1, src: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80', alt: 'Atölye İçi', category: 'Atölye', title: 'Modern Üretim Hattı' },
  { id: 2, src: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80', alt: 'Dikim Atölyesi', category: 'Atölye', title: 'Profesyonel Dikim' },
  { id: 3, src: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80', alt: 'Kesim Masası', category: 'Atölye', title: 'Hassas Kesim' },
  { id: 4, src: 'https://images.unsplash.com/photo-1558769132-cb1aea1f1c85?w=800&q=80', alt: 'Tasarım Masası', category: 'Atölye', title: 'Yaratıcı Tasarım' },
  
  // Ürün Görselleri
  { id: 5, src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', alt: 'İş Kıyafetleri', category: 'Ürünler', title: 'Kurumsal Koleksiyon' },
  { id: 6, src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', alt: 'Tişört Üretimi', category: 'Ürünler', title: 'Kaliteli Tişörtler' },
  { id: 7, src: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', alt: 'Polo Yaka', category: 'Ürünler', title: 'Şık Polo Yaka' },
  { id: 8, src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', alt: 'Gömlek', category: 'Ürünler', title: 'Klasik Gömlekler' },
  
  // Ekipman
  { id: 9, src: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80', alt: 'Kalite Kontrol', category: 'Ekipman', title: 'Kalite Kontrol' },
  { id: 10, src: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80', alt: 'Modern Makineler', category: 'Ekipman', title: 'Teknolojik Makineler' },
  { id: 11, src: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80', alt: 'Üretim Hattı', category: 'Ekipman', title: 'Otomatik Üretim' },
  { id: 12, src: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80', alt: 'Baskı Makinesi', category: 'Ekipman', title: 'Dijital Baskı' },
  
  // Ekip
  { id: 13, src: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80', alt: 'Ekip Çalışması', category: 'Ekip', title: 'Profesyonel Ekip' },
  { id: 14, src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80', alt: 'Takım Çalışması', category: 'Ekip', title: 'Uyumlu Takım' },
  { id: 15, src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80', alt: 'Müşteri Görüşmesi', category: 'Ekip', title: 'Müşteri Odaklı' },
  { id: 16, src: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80', alt: 'Toplantı', category: 'Ekip', title: 'İnovatif Çözümler' },
]

const categories = ['Tümü', 'Atölye', 'Ürünler', 'Ekipman', 'Ekip']

export default function Galeri() {
  const [selectedCategory, setSelectedCategory] = useState('Tümü')
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

  const filteredImages = selectedCategory === 'Tümü' 
    ? galleryImages 
    : galleryImages.filter(img => img.category === selectedCategory)

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <main className="flex-grow px-4 md:px-10 lg:px-20 py-16 pt-24">
        <div className="max-w-[1400px] mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-6">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">photo_library</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Fotoğraf Galerisi</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Galeri
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Atölyemizden, ürünlerimizden ve ekibimizden kareler
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg scale-105'
                    : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:scale-105 hover:shadow-lg'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {image.title && (
                      <h3 className="text-white font-bold text-lg mb-1">{image.title}</h3>
                    )}
                    <p className="text-white/80 text-sm">{image.category}</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full">
                  <span className="text-white text-xs font-semibold">{image.category}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">camera_enhance</span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Profesyonel Çekim</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tüm fotoğraflarımız profesyonel ekipmanlarla çekilmektedir</p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">update</span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Güncel İçerik</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Galerimiz düzenli olarak yeni fotoğraflarla güncellenmektedir</p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                  <span className="material-symbols-outlined text-pink-600 dark:text-pink-400 text-2xl">visibility</span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">360° Görünüm</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Atölyemizi ve ürünlerimizi her açıdan görebilirsiniz</p>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <span className="material-symbols-outlined text-4xl">close</span>
            </button>
            <div className="relative aspect-video rounded-2xl overflow-hidden">
              <Image
                src={selectedImage.src}
                alt={selectedImage.alt}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="mt-4 text-center">
              {selectedImage.title && (
                <h3 className="text-white text-2xl font-bold mb-2">{selectedImage.title}</h3>
              )}
              <p className="text-white/80">{selectedImage.category}</p>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  )
}

