'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productsApi } from '@/utils/api'
import Image from 'next/image'
import Link from 'next/link'

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  image?: string;
  images?: string | string[]; // Ürün resimleri (string veya array)
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Ürün yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 max-w-md">
          <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
            error
          </span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Ürün bulunamadı'}
          </h2>
          <Link
            href="/urunler"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Ürünlere Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/urunler" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Ürünler
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-gray-900 dark:text-white font-semibold">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group"
              onClick={() => productImages.length > 0 && openLightbox(selectedImageIndex)}
            >
              <div className="relative aspect-square">
                {productImages.length > 0 ? (
                  <>
                    <Image
                      src={productImages[selectedImageIndex]}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                    {productImages.length > 1 && (
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {selectedImageIndex + 1} / {productImages.length}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity">
                        zoom_in
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-gray-400">image</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Thumbnail Images */}
            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {productImages.slice(0, 8).map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`relative aspect-square bg-white dark:bg-gray-800 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                      selectedImageIndex === idx 
                        ? 'border-blue-600 dark:border-blue-400 shadow-lg scale-105' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
            
            {/* Navigation Buttons (if more than 1 image) */}
            {productImages.length > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={prevImage}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-md"
                  aria-label="Önceki resim"
                >
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">chevron_left</span>
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {selectedImageIndex + 1} / {productImages.length}
                </span>
                <button
                  onClick={nextImage}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-md"
                  aria-label="Sonraki resim"
                >
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">chevron_right</span>
                </button>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-6">
            <div>
              {product.brand && (
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                  {product.brand}
                </p>
              )}
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                {product.name}
              </h1>
              
              {product.category && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">category</span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{product.category}</span>
                </div>
              )}

              {product.rating !== null && product.rating !== undefined && !isNaN(Number(product.rating)) && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-yellow-400">star</span>
                  <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {Number(product.rating).toFixed(1)}
                  </span>
                  {product.reviewCount && (
                    <span className="text-sm text-gray-500 dark:text-gray-500">
                      ({product.reviewCount} değerlendirme)
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {Number(product.price || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
                {product.stock !== undefined && (
                  <div className={`px-4 py-2 rounded-lg font-semibold ${
                    product.stock > 0
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {product.stock > 0 ? `Stokta Var (${product.stock})` : 'Stokta Yok'}
                  </div>
                )}
              </div>
            </div>

            {/* Design Editor Button */}
            <Link
              href={`/panel/urunler/${product.id}/tasarim`}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <span className="material-symbols-outlined">palette</span>
              <span>Tasarım Editörüne Git</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>

            {/* Back to Products Button */}
            <Link
              href="/urunler"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Ürünlere Dön
            </Link>
          </div>
        </div>

        {/* Product Description */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">description</span>
            Ürün Açıklaması
          </h2>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            {product.description ? (
              <div 
                className="text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                Bu ürün için henüz açıklama eklenmemiş.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && productImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
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
                width={1200}
                height={1200}
                className="object-contain w-full h-full max-h-[90vh] rounded-lg"
                unoptimized
              />
              
              {/* Image Counter */}
              {productImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
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
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all"
                  aria-label="Önceki resim"
                >
                  <span className="material-symbols-outlined text-3xl">chevron_left</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    nextImage()
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all"
                  aria-label="Sonraki resim"
                >
                  <span className="material-symbols-outlined text-3xl">chevron_right</span>
                </button>
              </>
            )}

            {/* Keyboard Hint */}
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs opacity-0 md:opacity-100 transition-opacity">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white/20 rounded">←</kbd>
                <kbd className="px-2 py-1 bg-white/20 rounded">→</kbd>
                <span className="ml-2">Geçiş</span>
                <kbd className="ml-4 px-2 py-1 bg-white/20 rounded">ESC</kbd>
                <span className="ml-2">Kapat</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
