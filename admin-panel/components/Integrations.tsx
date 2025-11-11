'use client'

import { useState, useEffect } from 'react'
import { 
  Link2, CheckCircle2, XCircle, AlertCircle, Settings, 
  Key, ExternalLink, RefreshCw, Plus, Edit, Trash2, 
  Save, X, Loader2, Eye, EyeOff, Globe, Mail, 
  Smartphone, CreditCard, Truck, MessageSquare, Zap, 
  ShoppingCart as ShoppingCartIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface Integration {
  id: number
  name: string
  type: 'payment' | 'shipping' | 'sms' | 'email' | 'api' | 'webhook' | 'marketplace' | 'other'
  provider: string
  status: 'active' | 'inactive' | 'error'
  apiKey?: string
  apiSecret?: string
  webhookUrl?: string
  config?: Record<string, any>
  lastTest?: string
  testResult?: 'success' | 'error' | null
  description?: string
}

const integrationTypes = {
  payment: { label: 'Ödeme', icon: CreditCard, color: 'from-green-500 to-emerald-600' },
  shipping: { label: 'Kargo', icon: Truck, color: 'from-blue-500 to-cyan-600' },
  sms: { label: 'SMS', icon: Smartphone, color: 'from-purple-500 to-pink-600' },
  email: { label: 'E-posta', icon: Mail, color: 'from-orange-500 to-red-600' },
  api: { label: 'API', icon: Key, color: 'from-indigo-500 to-blue-600' },
  webhook: { label: 'Webhook', icon: Zap, color: 'from-yellow-500 to-orange-600' },
  marketplace: { label: 'Marketplace', icon: ShoppingCartIcon, color: 'from-pink-500 to-rose-600' },
  other: { label: 'Diğer', icon: Link2, color: 'from-gray-500 to-slate-600' }
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null)
  const [showApiKey, setShowApiKey] = useState<Record<number, boolean>>({})
  const [testing, setTesting] = useState<Record<number, boolean>>({})
  const [syncing, setSyncing] = useState<Record<number, boolean>>({})
  const [syncStatus, setSyncStatus] = useState<Record<number, { message: string; success: boolean }>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'api' as Integration['type'],
    provider: '',
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    description: '',
    config: {} as Record<string, any>
  })

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      const response = await api.get<ApiResponse<Integration[]>>('/admin/integrations')
      if (response.success && response.data) {
        setIntegrations(response.data)
      }
    } catch (err: any) {
      setError('Entegrasyonlar yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData({
      name: '',
      type: 'api',
      provider: '',
      apiKey: '',
      apiSecret: '',
      webhookUrl: '',
      description: '',
      config: {}
    })
    setShowAddModal(true)
    setError(null)
    setSuccess(null)
  }

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration)
    const config = integration.config || {}
    setFormData({
      name: integration.name,
      type: integration.type,
      provider: integration.provider,
      apiKey: integration.apiKey || '',
      apiSecret: integration.apiSecret || '',
      webhookUrl: integration.webhookUrl || '',
      description: integration.description || '',
      config: config
    })
    setShowEditModal(true)
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    try {
      setError(null)
      setSuccess(null)

      const payload = {
        ...formData,
        status: 'active'
      }

      let response: ApiResponse<Integration>
      if (editingIntegration) {
        response = await api.put<ApiResponse<Integration>>(
          `/admin/integrations/${editingIntegration.id}`,
          payload
        )
      } else {
        response = await api.post<ApiResponse<Integration>>(
          '/admin/integrations',
          payload
        )
      }

      if (response.success) {
        setSuccess(editingIntegration ? 'Entegrasyon güncellendi' : 'Entegrasyon eklendi')
        setShowAddModal(false)
        setShowEditModal(false)
        setEditingIntegration(null)
        loadIntegrations()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'İşlem başarısız')
      }
    } catch (err: any) {
      setError(err.message || 'İşlem sırasında bir hata oluştu')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu entegrasyonu silmek istediğinizden emin misiniz?')) return

    try {
      const response = await api.delete<ApiResponse<void>>(`/admin/integrations/${id}`)
      if (response.success) {
        setSuccess('Entegrasyon silindi')
        loadIntegrations()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'Silme işlemi başarısız')
      }
    } catch (err: any) {
      setError(err.message || 'Silme işlemi sırasında bir hata oluştu')
    }
  }

  const handleTest = async (integration: Integration) => {
    setTesting({ ...testing, [integration.id]: true })
    try {
      const response = await api.post<ApiResponse<{ success: boolean; message: string }>>(
        `/admin/integrations/${integration.id}/test`
      )
      if (response.success && response.data) {
        setSuccess(`Test sonucu: ${response.data.message}`)
        loadIntegrations()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Test başarısız: ' + (response.message || 'Bilinmeyen hata'))
      }
    } catch (err: any) {
      setError('Test sırasında hata: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setTesting({ ...testing, [integration.id]: false })
    }
  }

  const toggleApiKey = (id: number) => {
    setShowApiKey({ ...showApiKey, [id]: !showApiKey[id] })
  }

  const handleSyncOrders = async (integration: Integration) => {
    setSyncing({ ...syncing, [integration.id]: true })
    setSyncStatus({ ...syncStatus, [integration.id]: { message: '', success: false } })
    try {
      const response = await api.post<ApiResponse<{ synced: number; skipped: number; total: number; errors?: any[] }>>(
        `/admin/integrations/${integration.id}/sync-orders`,
        {}
      )
      if (response.success && response.data) {
        const { synced, skipped, total } = response.data
        setSyncStatus({
          ...syncStatus,
          [integration.id]: {
            message: `${synced} sipariş senkronize edildi, ${skipped} sipariş atlandı (Toplam: ${total})`,
            success: true
          }
        })
        setSuccess(response.message || 'Siparişler başarıyla çekildi')
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setSyncStatus({
          ...syncStatus,
          [integration.id]: {
            message: response.message || 'Sipariş çekme başarısız',
            success: false
          }
        })
        setError(response.message || 'Sipariş çekme başarısız')
      }
    } catch (err: any) {
      setSyncStatus({
        ...syncStatus,
        [integration.id]: {
          message: err.message || 'Sipariş çekme sırasında hata oluştu',
          success: false
        }
      })
      setError('Sipariş çekme sırasında hata: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setSyncing({ ...syncing, [integration.id]: false })
    }
  }

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
      case 'error':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700'
    }
  }

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4" />
      case 'error':
        return <XCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

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
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Link2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Entegrasyonlar
                </h1>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  API ve servis entegrasyonlarını yönetin
                </p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Entegrasyon</span>
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
        </div>

        {/* Integrations Grid */}
        {integrations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <Link2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">Henüz entegrasyon eklenmemiş</p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              İlk Entegrasyonu Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => {
              const typeInfo = integrationTypes[integration.type]
              const TypeIcon = typeInfo.icon
              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-gradient-to-br ${typeInfo.color} rounded-lg`}>
                        <TypeIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {integration.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {integration.provider}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(integration.status)}`}>
                      {getStatusIcon(integration.status)}
                      {integration.status === 'active' ? 'Aktif' : integration.status === 'error' ? 'Hata' : 'Pasif'}
                    </span>
                  </div>

                  {integration.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {integration.description}
                    </p>
                  )}

                  {integration.apiKey && (
                    <div className="mb-4">
                      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                        API Key
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showApiKey[integration.id] ? 'text' : 'password'}
                          value={showApiKey[integration.id] ? integration.apiKey : '••••••••••••'}
                          readOnly
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm"
                        />
                        <button
                          onClick={() => toggleApiKey(integration.id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        >
                          {showApiKey[integration.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {integration.lastTest && (
                    <div className="mb-4 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Son Test: </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {new Date(integration.lastTest).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  )}

                  {syncStatus[integration.id] && (
                    <div className={`mb-4 p-2 rounded text-xs ${
                      syncStatus[integration.id].success
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                      {syncStatus[integration.id].message}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4">
                    {integration.provider === 'Trendyol' && integration.type === 'marketplace' && (
                      <button
                        onClick={() => handleSyncOrders(integration)}
                        disabled={syncing[integration.id]}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors disabled:opacity-50"
                      >
                        {syncing[integration.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShoppingCartIcon className="w-4 h-4" />
                        )}
                        <span>{syncing[integration.id] ? 'Çekiliyor...' : 'Siparişleri Çek'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleTest(integration)}
                      disabled={testing[integration.id]}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                    >
                      {testing[integration.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>Test Et</span>
                    </button>
                    <button
                      onClick={() => handleEdit(integration)}
                      className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      title="Düzenle"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(integration.id)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
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
                      {editingIntegration ? 'Entegrasyon Düzenle' : 'Yeni Entegrasyon'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowAddModal(false)
                        setShowEditModal(false)
                        setEditingIntegration(null)
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
                      Ad
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="Örn: Stripe Ödeme"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tip
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Integration['type'] })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {Object.entries(integrationTypes).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Sağlayıcı
                    </label>
                    <input
                      type="text"
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="Örn: Stripe, PayPal, MNG Kargo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="API anahtarı"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      API Secret (Opsiyonel)
                    </label>
                    <input
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="API secret"
                    />
                  </div>

                  {formData.type === 'webhook' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        value={formData.webhookUrl}
                        onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        placeholder="https://example.com/webhook"
                      />
                    </div>
                  )}

                  {formData.type === 'marketplace' && formData.provider === 'Trendyol' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Supplier ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.config?.supplierId || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          config: { ...formData.config, supplierId: e.target.value } 
                        })}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        placeholder="Trendyol Supplier ID"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Trendyol Partner Panel'den alabileceğiniz Supplier ID
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Açıklama (Opsiyonel)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      rows={3}
                      placeholder="Entegrasyon hakkında açıklama"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setShowEditModal(false)
                      setEditingIntegration(null)
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Kaydet</span>
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

