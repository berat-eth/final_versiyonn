'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Filter, TrendingUp, Package, Eye, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { productService } from '@/lib/services'
import type { Product } from '@/lib/api'

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tümü')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const categories = ['Tümü', 'Kamp Malzemeleri', 'Outdoor Giyim', 'Ayakkabı', 'Aksesuar']

  // Fetch products from API
  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      const response = await productService.getProducts(page, 20)
      
      if (response.success && response.data) {
        setProducts(response.data.products)
        setTotalProducts(response.data.total)
        setHasMore(response.data.hasMore)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ürünler yüklenirken hata oluştu')
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  // Search products
  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      fetchProducts(1)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await productService.searchProducts(query, 1, 50)
      
      if (response.success && response.data) {
        setProducts(response.data)
        setTotalProducts(response.data.length)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama sırasında hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(currentPage)
  }, [currentPage])

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm) {
        searchProducts(searchTerm)
      } else {
        fetchProducts(1)
      }
    }, 500)

    return () => clearTimeout(delaySearch)
  }, [searchTerm])

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'Tümü' || product.category === selectedCategory
    return matchesCategory
  })

  const getStockStatus = (stock: number = 0): 'active' | 'low-stock' | 'out-of-stock' => {
    if (stock > 20) return 'active'
    if (stock > 0) return 'low-stock'
    return 'out-of-stock'
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Ürünler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-semibold mb-2">Hata</p>
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => fetchProducts(currentPage)}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Ürün Yönetimi</h2>
          <p className="text-slate-500 mt-1">Backend'den gelen ürünler</p>
        </div>
        <button
          onClick={() => fetchProducts(currentPage)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Toplam Ürün</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Aktif Ürün</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {products.filter(p => getStockStatus(p.stock) === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Düşük Stok</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {products.filter(p => getStockStatus(p.stock) === 'low-stock').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Stok Yok</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {products.filter(p => getStockStatus(p.stock) === 'out-of-stock').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ürün</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Kategori</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Fiyat</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Stok</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Marka</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">SKU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product, index) => {
                const status = getStockStatus(product.stock)
                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{product.name}</p>
                          <p className="text-xs text-slate-500">ID: #{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${
                          status === 'active' ? 'text-green-600' :
                          status === 'low-stock' ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {product.stock || 0}
                        </span>
                        <span className="text-sm text-slate-500">adet</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700 font-medium">{product.brand}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                        status === 'low-stock' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {status === 'active' ? 'Aktif' :
                         status === 'low-stock' ? 'Düşük Stok' : 'Stok Yok'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500 font-mono">{product.sku || '-'}</span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Toplam {totalProducts} ürün içinden {filteredProducts.length} gösteriliyor
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
