'use client'

import { useState, useEffect } from 'react'
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock, TrendingUp, TrendingDown, Zap, Database, ArrowRight, Eye } from 'lucide-react'
import { motion } from 'framer-motion'

interface Integration {
  id: string
  name: string
  status: 'active' | 'error' | 'warning' | 'inactive'
  lastSync: string
  syncStatus: 'success' | 'failed' | 'pending'
  totalProducts: number
  totalOrders: number
  errorCount: number
  uptime: number
  responseTime: number
  apiCalls: number
  color: string
}

export default function IntegrationMonitor() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    // Örnek entegrasyon verileri - gerçek API entegrasyonu için değiştirilecek
    setIntegrations([
      {
        id: 'hepsiburada',
        name: 'Hepsiburada',
        status: 'active',
        lastSync: '2 dakika önce',
        syncStatus: 'success',
        totalProducts: 1250,
        totalOrders: 89,
        errorCount: 0,
        uptime: 99.8,
        responseTime: 245,
        apiCalls: 15420,
        color: 'orange'
      },
      {
        id: 'trendyol',
        name: 'Trendyol',
        status: 'warning',
        lastSync: '15 dakika önce',
        syncStatus: 'pending',
        totalProducts: 980,
        totalOrders: 67,
        errorCount: 3,
        uptime: 97.2,
        responseTime: 380,
        apiCalls: 12350,
        color: 'blue'
      }
    ])
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      // Otomatik yenileme - gerçek API entegrasyonu için değiştirilecek
      setIntegrations(prev => prev.map(integration => ({
        ...integration,
        lastSync: 'Az önce',
        apiCalls: integration.apiCalls + Math.floor(Math.random() * 10),
        responseTime: integration.responseTime + Math.floor(Math.random() * 20 - 10)
      })))
    }, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default: return <XCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200'
      case 'error': return 'bg-red-100 text-red-700 border-red-200'
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const totalStats = {
    totalProducts: integrations.reduce((sum, int) => sum + int.totalProducts, 0),
    totalOrders: integrations.reduce((sum, int) => sum + int.totalOrders, 0),
    totalErrors: integrations.reduce((sum, int) => sum + int.errorCount, 0),
    avgUptime: (integrations.reduce((sum, int) => sum + int.uptime, 0) / integrations.length).toFixed(1),
    avgResponseTime: Math.round(integrations.reduce((sum, int) => sum + int.responseTime, 0) / integrations.length),
    totalApiCalls: integrations.reduce((sum, int) => sum + int.apiCalls, 0)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Entegrasyon Monitörü</h1>
          <p className="text-slate-600 mt-1">Tüm entegrasyonlarınızı tek yerden izleyin</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Otomatik Yenileme Açık' : 'Otomatik Yenileme Kapalı'}</span>
          </button>
        </div>
      </div>

      {/* Genel İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Database className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-blue-100 text-xs">Toplam Ürün</p>
          <p className="text-2xl font-bold mt-1">{totalStats.totalProducts.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-green-100 text-xs">Toplam Sipariş</p>
          <p className="text-2xl font-bold mt-1">{totalStats.totalOrders.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-red-100 text-xs">Toplam Hata</p>
          <p className="text-2xl font-bold mt-1">{totalStats.totalErrors}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-purple-100 text-xs">Ortalama Uptime</p>
          <p className="text-2xl font-bold mt-1">{totalStats.avgUptime}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-yellow-100 text-xs">Ort. Yanıt Süresi</p>
          <p className="text-2xl font-bold mt-1">{totalStats.avgResponseTime}ms</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-indigo-100 text-xs">Toplam API Çağrısı</p>
          <p className="text-2xl font-bold mt-1">{totalStats.totalApiCalls.toLocaleString()}</p>
        </motion.div>
      </div>

      {/* Entegrasyon Kartları */}
      {integrations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-lg">Henüz entegrasyon bulunmuyor</p>
          <p className="text-slate-400 text-sm mt-2">Entegrasyonlarınızı yapılandırmak için ilgili sayfalara gidin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {integrations.map((integration, index) => (
          <motion.div
            key={integration.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className={`p-4 border-b border-slate-200 bg-gradient-to-r ${
              integration.color === 'orange' ? 'from-orange-50 to-orange-100' : 'from-blue-50 to-blue-100'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800">{integration.name}</h3>
                {getStatusIcon(integration.status)}
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(integration.status)}`}>
                {integration.status === 'active' ? 'Aktif' : integration.status === 'warning' ? 'Uyarı' : 'Hata'}
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Son Senkronizasyon</span>
                <span className="text-sm font-medium text-slate-800">{integration.lastSync}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Toplam Ürün</span>
                <span className="text-sm font-bold text-blue-600">{integration.totalProducts.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Aktif Sipariş</span>
                <span className="text-sm font-bold text-green-600">{integration.totalOrders.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Hata Sayısı</span>
                <span className={`text-sm font-bold ${integration.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {integration.errorCount}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-600">Uptime</span>
                  <span className="text-xs font-medium text-slate-800">{integration.uptime}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      integration.uptime >= 99 ? 'bg-green-500' : 
                      integration.uptime >= 95 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${integration.uptime}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600">Yanıt Süresi</span>
                </div>
                <span className="text-xs font-medium text-slate-800">{integration.responseTime}ms</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600">API Çağrısı</span>
                </div>
                <span className="text-xs font-medium text-slate-800">{integration.apiCalls.toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setSelectedIntegration(integration)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Detaylar
              </button>
              <button
                onClick={() => {
                  // Entegrasyon sayfasına git
                  window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: integration.id } }))
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                Yönet
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
          ))}
        </div>
      )}

      {/* Detay Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedIntegration(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">{selectedIntegration.name} Detayları</h2>
                <button
                  onClick={() => setSelectedIntegration(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Durum */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Durum Bilgisi</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">Bağlantı Durumu</p>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedIntegration.status)}
                      <span className="font-medium text-slate-800">
                        {selectedIntegration.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">Son Senkronizasyon</p>
                    <p className="font-medium text-slate-800">{selectedIntegration.lastSync}</p>
                  </div>
                </div>
              </div>

              {/* Performans */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Performans Metrikleri</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Uptime</span>
                    <span className="text-sm font-bold text-green-600">{selectedIntegration.uptime}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Ortalama Yanıt Süresi</span>
                    <span className="text-sm font-bold text-blue-600">{selectedIntegration.responseTime}ms</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Toplam API Çağrısı</span>
                    <span className="text-sm font-bold text-purple-600">{selectedIntegration.apiCalls.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Veri */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Veri İstatistikleri</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedIntegration.totalProducts}</p>
                    <p className="text-xs text-slate-600 mt-1">Ürün</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedIntegration.totalOrders}</p>
                    <p className="text-xs text-slate-600 mt-1">Sipariş</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{selectedIntegration.errorCount}</p>
                    <p className="text-xs text-slate-600 mt-1">Hata</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
