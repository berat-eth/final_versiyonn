'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productsApi } from '@/utils/api'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  image?: string;
  images?: string | string[];
  brand?: string;
  category?: string;
  stock?: number;
  rating?: number;
  reviewCount?: number;
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id ? Number(params.id) : null
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [productImages, setProductImages] = useState<string[]>([])

  const loadProduct = useCallback(async () => {
    if (!productId) return
    
    try {
      setLoading(true)
      setError(null)
      const response = await productsApi.getProductById(productId)
      
      if (response.success && response.data) {
        const productData = response.data
        
        // İstenmeyen kategorileri kontrol et
        const excludedCategories = ['Camp Ürünleri', 'Silah Aksesuarları', 'Mutfak Ürünleri']
        const productCategory = productData.category || ''
        
        const isExcluded = excludedCategories.some(excludedCat => 
          productCategory.toLowerCase().includes(excludedCat.toLowerCase())
        )
        
        if (isExcluded) {
          setError('Bu ürün kategorisi web sitesinde görüntülenemez')
          setProduct(null)
          return
        }
        
        setProduct(productData)
        
        // Resimleri hazırla
        let images: string[] = [];
        if (productData.images) {
          if (typeof productData.images === 'string') {
            try {
              const parsed = JSON.parse(productData.images);
              images = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              images = [productData.images];
            }
          } else if (Array.isArray(productData.images)) {
            images = productData.images;
          }
        }
        
        // Ana resmi ekle (eğer images'da yoksa)
        if (productData.image && !images.includes(productData.image)) {
          images.unshift(productData.image);
        } else if (productData.image && !images.length) {
          images = [productData.image];
        }
        
        setProductImages(images);
      } else {
        setError('Ürün bulunamadı')
      }
    } catch (error) {
      console.error('Ürün yüklenemedi:', error)
      setError('Ürün yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId, loadProduct])

  const openLightbox = useCallback((index: number) => {
    setSelectedImageIndex(index)
    setIsLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false)
  }, [])

  const nextImage = useCallback(() => {
    setSelectedImageIndex((prev) => (prev + 1) % productImages.length)
  }, [productImages.length])

  const prevImage = useCallback(() => {
    setSelectedImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length)
  }, [productImages.length])

  useEffect(() => {
    if (!isLightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox()
      } else if (e.key === 'ArrowLeft') {
        prevImage()
      } else if (e.key === 'ArrowRight') {
        nextImage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, prevImage, nextImage, closeLightbox])

  if (loading) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
        <div className="flex-grow flex items-center justify-center py-32">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-6xl text-blue-600 dark:text-blue-400 mb-4">
              sync
            </span>
            <p className="text-xl text-gray-600 dark:text-gray-400 font-semibold">Ürün yükleniyor...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
        <div className="flex-grow flex items-center justify-center px-4 py-32">
          <div className="text-center bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-12 max-w-md">
            <span className="material-symbols-outlined text-7xl text-gray-400 dark:text-gray-600 mb-6">
              error
            </span>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6">
              {error || 'Ürün bulunamadı'}
            </h2>
            <Link
              href="/urunler"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Ürünlere Dön
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <main className="flex-grow">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Ana Sayfa
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <Link href="/urunler" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Ürünler
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-gray-900 dark:text-white font-semibold truncate max-w-[200px] md:max-w-none">
              {product.name}
            </span>
          </nav>
        </div>

        {/* Product Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 pb-16">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 p-6 md:p-8 lg:p-12">
              {/* Product Images Section */}
              <div className="space-y-4">
                {/* Main Image */}
                <div 
                  className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group"
                  onClick={() => productImages.length > 0 && openLightbox(selectedImageIndex)}
                >
                  <div className="relative aspect-square">
                    {productImages.length > 0 ? (
                      <>
                        <Image
                          src={productImages[selectedImageIndex]}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          priority
                          unoptimized
                        />
                        {productImages.length > 1 && (
                          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                            {selectedImageIndex + 1} / {productImages.length}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-5xl opacity-80">
                            zoom_in
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-8xl text-gray-400">image</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Thumbnail Images */}
                {productImages.length > 1 && (
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-4 gap-3">
                    {productImages.slice(0, 8).map((img, idx) => (
                      <div 
                        key={idx} 
                        className={`relative aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                          selectedImageIndex === idx 
                            ? 'border-blue-600 dark:border-blue-400 shadow-lg ring-2 ring-blue-400/50 scale-105' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedImageIndex(idx)}
                      >
                        <Image
                          src={img}
                          alt={`${product.name} - Resim ${idx + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Image Navigation (Mobile) */}
                {productImages.length > 1 && (
                  <div className="flex items-center justify-center gap-4 md:hidden">
                    <button
                      onClick={prevImage}
                      className="flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-md"
                      aria-label="Önceki resim"
                    >
                      <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">chevron_left</span>
                    </button>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4">
                      {selectedImageIndex + 1} / {productImages.length}
                    </span>
                    <button
                      onClick={nextImage}
                      className="flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-md"
                      aria-label="Sonraki resim"
                    >
                      <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Product Info Section */}
              <div className="flex flex-col gap-6 lg:gap-8">
                {/* Brand & Category */}
                <div className="flex flex-wrap items-center gap-3">
                  {product.brand && (
                    <span className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 rounded-xl text-sm font-bold uppercase">
                      {product.brand}
                    </span>
                  )}
                  {product.category && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">category</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{product.category}</span>
                    </div>
                  )}
                </div>

                {/* Product Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                  {product.name}
                </h1>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Link
                    href={`/panel/urunler/${product.id}/tasarim`}
                    className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  >
                    <span className="material-symbols-outlined text-2xl">palette</span>
                    <span>Tasarım Editörüne Git</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>

                  <Link
                    href="/teklif-al"
                    className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    <span className="material-symbols-outlined text-2xl">request_quote</span>
                    <span>Teklif Al</span>
                  </Link>

                  <Link
                    href="/urunler"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span>Ürünlere Dön</span>
                  </Link>
                </div>

                {/* Product Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">local_shipping</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Hızlı Teslimat</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Siparişleriniz en kısa sürede</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">verified</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Kaliteli Ürün</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Premium kalite garantisi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-3xl">palette</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Özel Tasarım</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">İstediğiniz gibi özelleştirin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl">
                    <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-3xl">support_agent</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">7/24 Destek</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Her zaman yanınızdayız</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Description */}
            {product.description && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-6 md:p-8 lg:p-12">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-3xl">description</span>
                  Ürün Açıklaması
                </h2>
                <div className="prose prose-lg prose-gray dark:prose-invert max-w-none">
                  <div 
                    className="text-gray-700 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Lightbox Modal */}
      {isLightboxOpen && productImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-10 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg hover:scale-110"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          {/* Image Container */}
          <div 
            className="relative w-full h-full flex items-center justify-center p-4 md:p-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative max-w-7xl max-h-full">
              <Image
                src={productImages[selectedImageIndex]}
                alt={`${product.name} - Resim ${selectedImageIndex + 1}`}
                width={1400}
                height={1400}
                className="object-contain w-full h-full max-h-[90vh] rounded-2xl shadow-2xl"
                priority
                unoptimized
              />
              
              {/* Image Counter */}
              {productImages.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl">
                  {selectedImageIndex + 1} / {productImages.length}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            {productImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    prevImage()
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg hover:scale-110"
                  aria-label="Önceki resim"
                >
                  <span className="material-symbols-outlined text-4xl">chevron_left</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    nextImage()
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg hover:scale-110"
                  aria-label="Sonraki resim"
                >
                  <span className="material-symbols-outlined text-4xl">chevron_right</span>
                </button>
              </>
            )}

            {/* Keyboard Hint */}
            <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md text-white px-4 py-3 rounded-xl text-xs opacity-0 md:opacity-100 transition-opacity">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white/20 rounded">←</kbd>
                  <kbd className="px-2 py-1 bg-white/20 rounded">→</kbd>
                  <span className="ml-2">Geçiş</span>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <kbd className="px-2 py-1 bg-white/20 rounded">ESC</kbd>
                  <span className="ml-2">Kapat</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
