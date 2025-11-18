'use client'

import { useState, useEffect } from 'react'
import { 
  ShoppingCart, Search, Loader2, X, User, Mail, Phone, 
  Calendar, DollarSign, Package, MapPin, Upload, CheckCircle, Trash2, FileSpreadsheet
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface TicimaxOrder {
  id: number
  externalOrderId: string
  orderNumber?: string
  totalAmount: number
  status: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  city?: string
  district?: string
  fullAddress?: string
  cargoProviderName?: string
  cargoTrackingNumber?: string
  barcode?: string
  orderDate?: string
  createdAt: string
  items?: Array<{
    id: number
    productName: string
    quantity: number
    price: number
    productSku?: string
  }>
}

export default function TicimaxOrders() {
  const [orders, setOrders] = useState<TicimaxOrder[]>([])
  const [totalOrders, setTotalOrders] = useState<number>(0)
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOrders()
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [statusFilter, startDate, endDate])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      
      const response = await api.get<ApiResponse<TicimaxOrder[]>>('/admin/ticimax-orders', params)
      if (response.success && response.data) {
        setOrders(response.data)
        const responseWithTotal = response as any
        if (responseWithTotal.total !== undefined) {
          setTotalOrders(responseWithTotal.total)
        } else {
          setTotalOrders(response.data.length)
        }
        if (responseWithTotal.totalAmount !== undefined) {
          setTotalAmount(responseWithTotal.totalAmount)
        } else {
          const calculatedTotal = response.data.reduce((sum, order) => {
            return sum + (parseFloat(String(order.totalAmount || 0)))
          }, 0)
          setTotalAmount(calculatedTotal)
        }
      }
    } catch (err: any) {
      setError('Siparişler yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Excel dosyalarını kabul et (.xls, .xlsx)
    if (!file.name.match(/\.(xls|xlsx)$/i) && !file.type.includes('spreadsheet')) {
      setError('Lütfen Excel dosyası seçin (.xls veya .xlsx)')
      return
    }
    
    try {
      setUploading(true)
      setError(null)
      setUploadSuccess(null)
      
      // FormData ile dosyayı gönder
      const formData = new FormData()
      formData.append('file', file)
      
      // API base URL'i al
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.zerodaysoftware.tr/api'
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
      const token = sessionStorage.getItem('authToken') || ''
      
      const response = await fetch(`${API_BASE_URL}/admin/ticimax-orders/import`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': ADMIN_KEY
        },
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const { imported, skipped, errors } = result.data
        setUploadSuccess(`${imported} sipariş başarıyla yüklendi${skipped > 0 ? `, ${skipped} sipariş atlandı` : ''}`)
        if (errors && errors.length > 0) {
          setError(`Bazı hatalar oluştu: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`)
        }
        
        // Siparişleri yeniden yükle
        await loadOrders()
        
        // Modal'ı kapat
        setShowUploadModal(false)
        
        // Başarı mesajını 5 saniye sonra temizle
        setTimeout(() => setUploadSuccess(null), 5000)
      } else {
        throw new Error(result.message || 'Sipariş yükleme başarısız')
      }
    } catch (err: any) {
      setError('Excel yükleme hatası: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setUploading(false)
      // Input'u temizle
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleDeleteOrder = async (orderId: number, orderNumber: string) => {
    if (!confirm(`"${orderNumber}" siparişini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      setDeletingOrderId(orderId)
      setError(null)

      const response = await api.delete<ApiResponse<any>>(`/admin/ticimax-orders/${orderId}`)

      if (response.success) {
        setUploadSuccess('Sipariş başarıyla silindi')
        await loadOrders()
        setTimeout(() => setUploadSuccess(null), 3000)
      } else {
        throw new Error(response.message || 'Sipariş silinemedi')
      }
    } catch (err: any) {
      setError('Sipariş silinirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setDeletingOrderId(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      processing: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      completed: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      cancelled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    }
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Beklemede',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal',
    }
    return labels[status] || status
  }

  const filteredOrders = orders.filter(order => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.externalOrderId?.toLowerCase().includes(query) ||
        order.orderNumber?.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.customerEmail?.toLowerCase().includes(query) ||
        order.customerPhone?.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Ticimax Siparişleri
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Ticimax siparişlerini Excel ile yükleyebilir ve yönetebilirsiniz
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Excel Yükle
        </button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{totalOrders}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Tutar</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Gösterilen</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{filteredOrders.length}</p>
            </div>
            <Search className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Arama
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sipariş no, müşteri adı..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-bg dark:text-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Durum
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-bg dark:text-slate-200"
            >
              <option value="">Tümü</option>
              <option value="pending">Beklemede</option>
              <option value="processing">İşleniyor</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-bg dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-bg dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Hata ve Başarı Mesajları */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}
      {uploadSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-800 dark:text-green-200">
          {uploadSuccess}
        </div>
      )}

      {/* Sipariş Listesi */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-12 text-center">
          <Package className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Henüz sipariş bulunmuyor</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Sipariş No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Müşteri</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Tutar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-200">
                      {order.orderNumber || order.externalOrderId}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      <div>
                        <div className="font-medium">{order.customerName || '-'}</div>
                        {order.customerEmail && (
                          <div className="text-xs text-slate-500">{order.customerEmail}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-200">
                      {order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteOrder(order.id, order.orderNumber || order.externalOrderId)}
                        disabled={deletingOrderId === order.id}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingOrderId === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Excel Yükleme Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-dark-card rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Excel Dosyası Yükle
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Excel dosyasını seçin (.xls veya .xlsx)
                  </p>
                  <input
                    type="file"
                    accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label
                    htmlFor="excel-upload"
                    className={`inline-block px-4 py-2 rounded-lg cursor-pointer ${
                      uploading
                        ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {uploading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Yükleniyor...
                      </span>
                    ) : (
                      'Dosya Seç'
                    )}
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
