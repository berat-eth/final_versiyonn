'use client'

import { useState, useEffect } from 'react'
import { 
  Receipt, Plus, Edit, Trash2, Search, Filter, Download, 
  Copy, ExternalLink, FileText, Calendar, User, Mail, 
  Phone, DollarSign, X, Loader2, CheckCircle2, XCircle, 
  AlertCircle, Eye, Upload
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface Invoice {
  id: number
  invoiceNumber: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  orderId?: number
  amount: number
  taxAmount: number
  totalAmount: number
  currency: string
  invoiceDate: string
  dueDate?: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  fileName?: string
  fileSize?: number
  shareToken?: string
  shareUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface MarketplaceOrder {
  id: number
  provider: string
  externalOrderId: string
  totalAmount: number
  status: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  city?: string
  district?: string
  syncedAt: string
  createdAt: string
  items?: Array<{
    id: number
    productName: string
    quantity: number
    price: number
    productImage?: string
  }>
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    files: [] as File[]
  })

  useEffect(() => {
    loadInvoices()
  }, [searchQuery, statusFilter])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (searchQuery) params.q = searchQuery
      if (statusFilter) params.status = statusFilter
      
      // Faturaları yükle
      const invoicesResponse = await api.get<ApiResponse<Invoice[]>>('/admin/invoices', params)
      if (invoicesResponse.success && invoicesResponse.data) {
        setInvoices(invoicesResponse.data)
      }
      
      // Marketplace siparişlerini yükle (Trendyol ve HepsiBurada)
      const marketplaceResponse = await api.get<ApiResponse<MarketplaceOrder[]>>('/admin/marketplace-orders')
      if (marketplaceResponse.success && marketplaceResponse.data) {
        setMarketplaceOrders(marketplaceResponse.data)
      }
    } catch (err: any) {
      setError('Faturalar yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData({
      files: []
    })
    setShowAddModal(true)
    setError(null)
    setSuccess(null)
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setFormData({
      files: []
    })
    setShowEditModal(true)
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    try {
      setError(null)
      setSuccess(null)
      setUploading(true)

      if (formData.files.length === 0) {
        setError('Lütfen en az bir PDF dosyası seçin')
        setUploading(false)
        return
      }

      // FormData için özel fetch kullan (api client FormData'yı desteklemiyor)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.plaxsy.com/api'
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'

      if (editingInvoice) {
        // Düzenleme: Tek dosya
        if (formData.files.length > 1) {
          setError('Düzenleme için sadece bir dosya seçebilirsiniz')
          setUploading(false)
          return
        }

        const file = formData.files[0]
        const fileName = file.name.replace('.pdf', '').replace(/[^a-zA-Z0-9]/g, '-')
        const invoiceNumber = fileName || `FAT-${Date.now()}`

        const formDataToSend = new FormData()
        formDataToSend.append('invoiceNumber', invoiceNumber)
        formDataToSend.append('amount', '0')
        formDataToSend.append('totalAmount', '0')
        formDataToSend.append('currency', 'TRY')
        formDataToSend.append('invoiceDate', new Date().toISOString().split('T')[0])
        formDataToSend.append('status', 'draft')
        formDataToSend.append('file', file)

        const response = await fetch(`${API_BASE_URL}/admin/invoices/${editingInvoice.id}`, {
          method: 'PUT',
          headers: {
            'X-API-Key': API_KEY,
            'X-Admin-Key': ADMIN_KEY,
            'Authorization': `Bearer ${typeof window !== 'undefined' ? (sessionStorage.getItem('authToken') || '') : ''}`
          },
          body: formDataToSend
        }).then(r => r.json())

        if (response.success) {
          setSuccess('Fatura güncellendi')
          setShowEditModal(false)
          setEditingInvoice(null)
          loadInvoices()
          setTimeout(() => setSuccess(null), 3000)
        } else {
          setError(response.message || 'İşlem başarısız')
        }
      } else {
        // Toplu yükleme: Her dosya için ayrı fatura oluştur
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (const file of formData.files) {
          try {
            const fileName = file.name.replace('.pdf', '').replace(/[^a-zA-Z0-9]/g, '-')
            const invoiceNumber = fileName || `FAT-${Date.now()}-${Math.random().toString(36).substring(7)}`

            const formDataToSend = new FormData()
            formDataToSend.append('invoiceNumber', invoiceNumber)
            formDataToSend.append('amount', '0')
            formDataToSend.append('totalAmount', '0')
            formDataToSend.append('currency', 'TRY')
            formDataToSend.append('invoiceDate', new Date().toISOString().split('T')[0])
            formDataToSend.append('status', 'draft')
            formDataToSend.append('file', file)

            const response = await fetch(`${API_BASE_URL}/admin/invoices`, {
              method: 'POST',
              headers: {
                'X-API-Key': API_KEY,
                'X-Admin-Key': ADMIN_KEY,
                'Authorization': `Bearer ${typeof window !== 'undefined' ? (sessionStorage.getItem('authToken') || '') : ''}`
              },
              body: formDataToSend
            }).then(r => r.json())

            if (response.success) {
              successCount++
            } else {
              errorCount++
              errors.push(`${file.name}: ${response.message || 'Yükleme başarısız'}`)
            }
          } catch (err: any) {
            errorCount++
            errors.push(`${file.name}: ${err.message || 'Yükleme hatası'}`)
          }
        }

        if (successCount > 0) {
          setSuccess(`${successCount} fatura başarıyla yüklendi${errorCount > 0 ? `, ${errorCount} hata oluştu` : ''}`)
          setShowAddModal(false)
          loadInvoices()
          setTimeout(() => setSuccess(null), 5000)
        }
        
        if (errorCount > 0) {
          setError(errors.join('; '))
        }
      }
    } catch (err: any) {
      setError(err.message || 'İşlem sırasında bir hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu faturayı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await api.delete<ApiResponse<void>>(`/admin/invoices/${id}`)
      if (response.success) {
        setSuccess('Fatura silindi')
        loadInvoices()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'Silme işlemi başarısız')
      }
    } catch (err: any) {
      setError(err.message || 'Silme işlemi sırasında bir hata oluştu')
    }
  }

  const copyShareLink = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl)
    setSuccess('Link kopyalandı!')
    setTimeout(() => setSuccess(null), 2000)
  }

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
      case 'sent':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700'
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700'
    }
  }

  const getStatusLabel = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'Taslak'
      case 'sent': return 'Gönderildi'
      case 'paid': return 'Ödendi'
      case 'cancelled': return 'İptal'
      default: return status
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (statusFilter && invoice.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.customerName?.toLowerCase().includes(query) ||
        invoice.customerEmail?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const filteredMarketplaceOrders = marketplaceOrders.filter(order => {
    if (statusFilter && order.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.externalOrderId.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.customerEmail?.toLowerCase().includes(query) ||
        order.provider.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Faturalar
                </h1>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  PDF faturaları yükleyin ve müşterilerinizle paylaşın
                </p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:from-pink-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Fatura</span>
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
            >
              {success}
            </motion.div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fatura numarası, müşteri adı veya e-posta ile ara..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Tüm Durumlar</option>
              <option value="draft">Taslak</option>
              <option value="sent">Gönderildi</option>
              <option value="paid">Ödendi</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
        </div>

        {/* Invoices List */}
        {(filteredInvoices.length === 0 && filteredMarketplaceOrders.length === 0) ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">Henüz fatura eklenmemiş</p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              İlk Faturayı Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {/* Marketplace Siparişleri (Trendyol, HepsiBurada) */}
            {filteredMarketplaceOrders.map((order) => (
              <motion.div
                key={`marketplace-${order.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {order.provider === 'trendyol' ? '🛒' : '📦'} {order.externalOrderId}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium border bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700">
                        {order.provider === 'trendyol' ? 'Trendyol' : order.provider === 'hepsiburada' ? 'HepsiBurada' : order.provider}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status as Invoice['status'])}`}>
                        {getStatusLabel(order.status as Invoice['status'])}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {order.customerName && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <User className="w-4 h-4" />
                          <span>{order.customerName}</span>
                        </div>
                      )}
                      {order.customerEmail && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>{order.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(order.syncedAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>{Number(order.totalAmount || 0).toFixed(2)} TRY</span>
                      </div>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Sipariş Öğeleri ({order.items.length})
                        </p>
                        <div className="space-y-2">
                          {order.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <span>{item.productName}</span>
                              <span className="text-slate-400">x{item.quantity}</span>
                              <span className="ml-auto font-medium">{Number(item.price || 0).toFixed(2)} TRY</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              +{order.items.length - 3} ürün daha
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Normal Faturalar */}
            {filteredInvoices.map((invoice) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {invoice.customerName && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <User className="w-4 h-4" />
                          <span>{invoice.customerName}</span>
                        </div>
                      )}
                      {invoice.customerEmail && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>{invoice.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>{invoice.totalAmount.toFixed(2)} {invoice.currency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invoice.shareUrl && (
                      <button
                        onClick={() => copyShareLink(invoice.shareUrl!)}
                        className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="Linki Kopyala"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    {invoice.shareUrl && (
                      <a
                        href={invoice.shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        title="Linki Aç"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleEdit(invoice)}
                      className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      title="Düzenle"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {invoice.fileName && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <FileText className="w-4 h-4" />
                    <span>{invoice.fileName}</span>
                    {invoice.fileSize && (
                      <span className="text-xs">({(invoice.fileSize / 1024).toFixed(2)} KB)</span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {(showAddModal || showEditModal) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {editingInvoice ? 'Fatura Düzenle' : 'Yeni Fatura'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowAddModal(false)
                        setShowEditModal(false)
                        setEditingInvoice(null)
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      PDF Dosyası {!editingInvoice && <span className="text-red-500">*</span>}
                      {!editingInvoice && <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">(Birden fazla seçebilirsiniz)</span>}
                    </label>
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        multiple={!editingInvoice}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          setFormData({ ...formData, files })
                        }}
                        className="hidden"
                      />
                      <div className="px-8 py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-pink-500 dark:hover:border-pink-500 transition-colors text-center">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                        <span className="text-base font-medium text-slate-600 dark:text-slate-400 block mb-2">
                          {formData.files.length === 0 
                            ? 'PDF dosyası seçin' 
                            : `${formData.files.length} dosya seçildi`}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Maksimum 10MB, sadece PDF formatı
                        </span>
                      </div>
                    </label>
                    {formData.files.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {formData.files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                {file.name}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                ({(file.size / 1024).toFixed(2)} KB)
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                const newFiles = formData.files.filter((_, i) => i !== index)
                                setFormData({ ...formData, files: newFiles })
                              }}
                              className="p-1 text-red-500 hover:text-red-700 transition-colors"
                              title="Kaldır"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setShowEditModal(false)
                      setEditingInvoice(null)
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={uploading || formData.files.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:from-pink-700 hover:to-rose-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Yükleniyor...</span>
                      </>
                    ) : (
                      <span>Kaydet</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

