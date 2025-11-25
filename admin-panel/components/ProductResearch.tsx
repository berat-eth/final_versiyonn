'use client'

import { useState } from 'react'
import { Search, Loader2, ExternalLink, Star, TrendingUp, Package, Sparkles, Brain } from 'lucide-react'
import { api } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface TrendyolProduct {
  name: string
  link: string
  price: string
  oldPrice?: string | null
  discount?: string | null
  image: string
  brand?: string
  rating?: string | null
  reviewCount?: string | null
  position: number
}

export default function ProductResearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ query: string; page: number; sortBy: string; totalResults: number; products: TrendyolProduct[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const handleSearch = async (searchPage = page) => {
    if (!searchQuery.trim()) {
      setError('Lütfen bir arama terimi girin')
      return
    }

    setLoading(true)
    setError(null)
    if (searchPage === 1) {
      setResults(null)
    }

    try {
      const response = await api.post<any>('/admin/scrapers/trendyol/search', {
        query: searchQuery.trim(),
        page: searchPage,
        sortBy: 'BEST_SELLER'
      })

      if (response.success && response.data) {
        setResults(response.data)
        setPage(searchPage)
      } else {
        setError(response.message || 'Arama başarısız')
      }
    } catch (err: any) {
      setError(err?.message || 'Arama sırasında hata oluştu')
      console.error('Trendyol arama hatası:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      setPage(1)
      handleSearch(1)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Ürün Araştırma</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Trendyol'dan ürün araştırması yapın</p>
      </div>

      {/* Arama Formu */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ürün ara... (örn: outdoor polar hırka)"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all dark:text-slate-300"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPage(1)
                  handleSearch(1)
                }}
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Aranıyor...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Ara</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sonuçlar */}
      {results && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Arama Sonuçları: "{results.query}"
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {results.totalResults} ürün bulundu • Sayfa {results.page}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (page > 1) {
                      handleSearch(page - 1)
                    }
                  }}
                  disabled={page === 1 || loading}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-300"
                >
                  Önceki
                </button>
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  {page}
                </span>
                <button
                  onClick={() => {
                    handleSearch(page + 1)
                  }}
                  disabled={results.products.length === 0 || loading}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-300"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.products.map((product, index) => (
              <motion.div
                key={`${product.link}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-product.png'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  {product.discount && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      {product.discount}
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  {product.brand && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {product.brand}
                    </p>
                  )}
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    {product.rating && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{product.rating}</span>
                        {product.reviewCount && (
                          <span className="text-slate-500 dark:text-slate-400">
                            ({product.reviewCount})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {product.price}
                    </span>
                    {product.oldPrice && (
                      <span className="text-sm text-slate-400 line-through">
                        {product.oldPrice}
                      </span>
                    )}
                  </div>
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all text-sm font-medium"
                  >
                    <span>Trendyol'da Gör</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>

          {results.products.length === 0 && (
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-12 text-center">
              <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                Bu sayfada ürün bulunamadı
              </p>
            </div>
          )}
        </div>
      )}

      {/* AI Loading Screen */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900"
          >
            <div className="text-center space-y-8 px-4">
              {/* AI Brain Icon with Animation */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="relative w-32 h-32 mx-auto">
                  {/* Glowing Background */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-3xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Brain Icon */}
                  <motion.div
                    className="relative w-full h-full flex items-center justify-center"
                    animate={{
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Brain className="w-20 h-20 text-white drop-shadow-2xl" strokeWidth={1.5} />
                  </motion.div>

                  {/* Sparkles around brain */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-white rounded-full"
                      style={{
                        top: '50%',
                        left: '50%',
                        originX: 0.5,
                        originY: 0.5,
                      }}
                      animate={{
                        x: [0, Math.cos((i * Math.PI * 2) / 8) * 60],
                        y: [0, Math.sin((i * Math.PI * 2) / 8) * 60],
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
              </motion.div>

              {/* AI Text */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <h3 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                  <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
                  <span>AI Ürün Araştırması</span>
                  <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
                </h3>
                <motion.p
                  className="text-xl text-blue-200 font-medium"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  Trendyol'dan veriler analiz ediliyor...
                </motion.p>
              </motion.div>

              {/* Progress Dots */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-white rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </motion.div>

              {/* Loading Stats */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="pt-8 space-y-2"
              >
                <div className="flex items-center justify-center gap-6 text-sm text-blue-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>Veri toplama aktif</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                    <span>AI analiz çalışıyor</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!results && !loading && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-12 text-center">
          <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            Ürün araştırması yapmak için yukarıdaki arama kutusunu kullanın
          </p>
        </div>
      )}
    </div>
  )
}
