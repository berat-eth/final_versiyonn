'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId])

  const loadProduct = async () => {
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
      } else {
        setError('Ürün bulunamadı')
      }
    } catch (error) {
      console.error('Ürün yüklenemedi:', error)
      setError('Ürün yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="relative aspect-square">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-gray-400">image</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional Images */}
            {(() => {
              let images: string[] = [];
              if (product.images) {
                if (typeof product.images === 'string') {
                  try {
                    const parsed = JSON.parse(product.images);
                    images = Array.isArray(parsed) ? parsed : [parsed];
                  } catch {
                    images = [product.images];
                  }
                } else if (Array.isArray(product.images)) {
                  images = product.images;
                }
              }
              
              // Ana resmi ekle (eğer images'da yoksa)
              if (product.image && !images.includes(product.image)) {
                images.unshift(product.image);
              }
              
              return images.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {images.slice(1, 5).map((img, idx) => (
                    <div key={idx} className="relative aspect-square bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <Image
                        src={img}
                        alt={`${product.name} - Resim ${idx + 2}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
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
    </div>
  )
}
