'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, ShoppingBag, DollarSign, ArrowUp, ArrowDown, Calendar, Loader2, Clock, TrendingDown, Navigation, Filter, ArrowUpDown, MousePointer, ArrowLeft, Search } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { useTheme } from '@/lib/ThemeContext'
import { analyticsService } from '@/lib/services/analyticsService'
import { api } from '@/lib/api'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

// Custom Tooltip component for dark mode support
const CustomTooltip = ({ active, payload, label }: any) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  if (!active || !payload || !payload.length) return null
  
  return (
    <div 
      className={`rounded-xl shadow-lg p-3 ${
        isDark ? 'bg-slate-800 text-slate-100 border border-slate-700' : 'bg-white text-slate-800 border border-slate-200'
      }`}
      style={{
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
    >
      <p className={`font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{ color: entry.color }} className="text-sm">
          {entry.name}: <span className="font-bold">{typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [customerBehavior, setCustomerBehavior] = useState<any[]>([])
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([])
  const [customerSegments, setCustomerSegments] = useState<any[]>([])
  const [conversionMetrics, setConversionMetrics] = useState<any>(null)
  const [dateRange, setDateRange] = useState('12')
  
  // Behavior Analytics states
  const [screenViews, setScreenViews] = useState<any[]>([])
  const [scrollDepth, setScrollDepth] = useState<any[]>([])
  const [navigationPaths, setNavigationPaths] = useState<any[]>([])
  const [filterUsage, setFilterUsage] = useState<any[]>([])
  const [sortPreferences, setSortPreferences] = useState<any[]>([])
  const [backNavigation, setBackNavigation] = useState<any[]>([])
  const [productInteractions, setProductInteractions] = useState<any[]>([])
  const [productInteractionsWithDetails, setProductInteractionsWithDetails] = useState<any[]>([])
  const [productInteractionsLoading, setProductInteractionsLoading] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'general' | 'behavior'>('general')

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const months = parseInt(dateRange)
      
      const [monthlyRes, behaviorRes, categoryRes, segmentsRes, conversionRes] = await Promise.all([
        analyticsService.getMonthlyData(months),
        analyticsService.getCustomerBehavior(),
        analyticsService.getCategoryPerformance(months),
        analyticsService.getCustomerSegments(),
        analyticsService.getConversionMetrics()
      ])

      if (monthlyRes.success) {
        setMonthlyData(monthlyRes.data || [])
      }

      if (behaviorRes.success) {
        setCustomerBehavior(behaviorRes.data || [])
      }

      if (categoryRes.success) {
        setCategoryPerformance(categoryRes.data || [])
      }

      if (segmentsRes.success) {
        setCustomerSegments(segmentsRes.data || [])
      }

      if (conversionRes.success) {
        setConversionMetrics(conversionRes.data)
      }
    } catch (error) {
      console.error('Analytics yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const [cartBehavior, setCartBehavior] = useState<any>({})
  const [paymentBehavior, setPaymentBehavior] = useState<any>({})
  const [userSegments, setUserSegments] = useState<any>({})
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({})
  const [deviceInfo, setDeviceInfo] = useState<any>({})
  const [notifications, setNotifications] = useState<any>({})
  const [wishlist, setWishlist] = useState<any>({})
  const [sessions, setSessions] = useState<any>({})
  const [ltv, setLTV] = useState<any>({})
  const [campaigns, setCampaigns] = useState<any>({})
  const [fraudSignals, setFraudSignals] = useState<any>({})

  const loadBehaviorAnalytics = async () => {
    try {
      const [
        viewsRes, scrollRes, pathsRes, filterRes, sortRes, backRes, productRes,
        cartRes, paymentRes, segmentsRes, perfRes, deviceRes, notifRes,
        wishlistRes, sessionsRes, ltvRes, campaignsRes, fraudRes
      ] = await Promise.all([
        analyticsService.getScreenViews(),
        analyticsService.getScrollDepth(),
        analyticsService.getNavigationPaths(),
        analyticsService.getFilterUsage(),
        analyticsService.getSortPreferences(),
        analyticsService.getBackNavigation(),
        analyticsService.getProductInteractions(),
        analyticsService.getCartBehavior(),
        analyticsService.getPaymentBehavior(),
        analyticsService.getUserSegments(),
        analyticsService.getPerformanceMetrics(),
        analyticsService.getDeviceInfo(),
        analyticsService.getNotifications(),
        analyticsService.getWishlist(),
        analyticsService.getSessions(),
        analyticsService.getLTV(),
        analyticsService.getCampaigns(),
        analyticsService.getFraudSignals()
      ])

      if (viewsRes.success) setScreenViews(viewsRes.data || [])
      if (scrollRes.success) setScrollDepth(scrollRes.data || [])
      if (pathsRes.success) setNavigationPaths(pathsRes.data || [])
      if (filterRes.success) setFilterUsage(filterRes.data || [])
      if (sortRes.success) setSortPreferences(sortRes.data || [])
      if (backRes.success) setBackNavigation(backRes.data || [])
      if (productRes.success) {
        setProductInteractions(productRes.data || [])
        await loadProductDetails(productRes.data || [])
      }
      if (cartRes.success) setCartBehavior(cartRes.data || {})
      if (paymentRes.success) setPaymentBehavior(paymentRes.data || {})
      if (segmentsRes.success) setUserSegments(segmentsRes.data || {})
      if (perfRes.success) setPerformanceMetrics(perfRes.data || {})
      if (deviceRes.success) setDeviceInfo(deviceRes.data || {})
      if (notifRes.success) setNotifications(notifRes.data || {})
      if (wishlistRes.success) setWishlist(wishlistRes.data || {})
      if (sessionsRes.success) setSessions(sessionsRes.data || {})
      if (ltvRes.success) setLTV(ltvRes.data || {})
      if (campaignsRes.success) setCampaigns(campaignsRes.data || {})
      if (fraudRes.success) setFraudSignals(fraudRes.data || {})
    } catch (error) {
      console.error('Behavior analytics yükleme hatası:', error)
    }
  }

  const loadProductDetails = async (interactions: any[]) => {
    try {
      setProductInteractionsLoading(true)
      const productIds = interactions
        .map(i => i.productId)
        .filter((id, index, self) => id && self.indexOf(id) === index)

      if (productIds.length === 0) {
        setProductInteractionsWithDetails([])
        return
      }

      // Paralel olarak tüm ürün bilgilerini çek
      const productPromises = productIds.map(id => 
        api.get<any>(`/products/${id}`).catch(() => null)
      )
      const productResults = await Promise.allSettled(productPromises)

      const productsMap = new Map<number, any>()
      productResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.success && result.value?.data) {
          const product = result.value.data
          productsMap.set(productIds[index], product)
        }
      })

      // Interaction verilerine ürün bilgilerini ekle
      const interactionsWithDetails = interactions.map(interaction => {
        const product = productsMap.get(interaction.productId)
        return {
          ...interaction,
          productName: product?.name || product?.title || `Ürün #${interaction.productId}`,
          productImage: product?.image || product?.image1 || product?.image2 || null,
          productPrice: product?.price || 0,
          productStock: product?.stock || 0,
          productCategory: product?.category || product?.categoryName || 'Bilinmiyor'
        }
      })

      setProductInteractionsWithDetails(interactionsWithDetails)
    } catch (error) {
      console.error('Ürün detayları yüklenemedi:', error)
      setProductInteractionsWithDetails(interactions.map(i => ({ ...i, productName: `Ürün #${i.productId}` })))
    } finally {
      setProductInteractionsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
    loadBehaviorAnalytics()
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}dk`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Detaylı Analitik</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">İşletmenizin derinlemesine analizi</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300"
          >
            <option value="3">Son 3 Ay</option>
            <option value="6">Son 6 Ay</option>
            <option value="12">Son 12 Ay</option>
          </select>
          <button
            onClick={() => {
              loadAnalytics()
              loadBehaviorAnalytics()
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            Yenile
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'general'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Genel Analitik
        </button>
        <button
          onClick={() => setActiveTab('behavior')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'behavior'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Kullanıcı Davranış Analitiği
        </button>
      </div>

      {activeTab === 'general' && (
        <>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Gelir & Gider Analizi</h3>
          <ResponsiveContainer width="100%" height={300}>
            {monthlyData && monthlyData.length > 0 ? (
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="monthLabel" stroke="#94a3b8" className="dark:stroke-slate-400" />
              <YAxis stroke="#94a3b8" className="dark:stroke-slate-400" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="gelir" name="Gelir" fill="#667eea" radius={[8, 8, 0, 0]} />
              <Bar dataKey="gider" name="Gider" fill="#f093fb" radius={[8, 8, 0, 0]} />
              <Bar dataKey="kar" name="Kar" fill="#43e97b" radius={[8, 8, 0, 0]} />
            </BarChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Müşteri Davranış Analizi</h3>
          <ResponsiveContainer width="100%" height={300}>
            {customerBehavior && customerBehavior.length > 0 ? (
            <RadarChart data={customerBehavior}>
              <PolarGrid stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <PolarAngleAxis dataKey="category" stroke="#64748b" className="dark:stroke-slate-400" />
              <PolarRadiusAxis stroke="#94a3b8" className="dark:stroke-slate-400" />
              <Radar name="Puan" dataKey="value" stroke="#667eea" fill="#667eea" fillOpacity={0.6} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {customerBehavior.length > 0 && (
              <>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {customerBehavior.find((b: any) => b.category === 'Memnuniyet Puanı')?.value?.toFixed(0) || '0'}%
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Memnuniyet</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {customerBehavior.find((b: any) => b.category === 'Tekrar Alım Oranı')?.value?.toFixed(0) || '0'}%
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Tekrar Alım</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Kategori Performansı</h3>
        <ResponsiveContainer width="100%" height={350}>
          {categoryPerformance && categoryPerformance.length > 0 ? (
          <AreaChart data={categoryPerformance}>
            <defs>
              <linearGradient id="colorSatis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSiparis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f093fb" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f093fb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-slate-700" />
            <XAxis dataKey="name" stroke="#94a3b8" className="dark:stroke-slate-400" />
            <YAxis stroke="#94a3b8" className="dark:stroke-slate-400" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="satis" name="Satış" stroke="#667eea" strokeWidth={2} fillOpacity={1} fill="url(#colorSatis)" />
            <Area type="monotone" dataKey="siparisler" name="Siparişler" stroke="#f093fb" strokeWidth={2} fillOpacity={1} fill="url(#colorSiparis)" />
          </AreaChart>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
          )}
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {customerSegments.map((segment, index) => (
          <motion.div
            key={segment.segment}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 card-hover border border-slate-200 dark:border-slate-700"
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${segment.color} rounded-xl flex items-center justify-center mb-4`}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{segment.segment}</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Müşteri</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{segment.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Gelir</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ₺{parseFloat(segment.revenue || 0).toLocaleString('tr-TR')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Ort. Sipariş</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ₺{parseFloat(segment.avgOrder || 0).toFixed(0)}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Büyüme</span>
                <div className="flex items-center space-x-1">
                  <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-600 dark:text-green-400">+{(Math.random() * 20 + 5).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Dönüşüm Oranı</h4>
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-2">
            {conversionMetrics?.conversionRate || '0'}%
          </p>
          <p className="text-blue-100 text-sm">Ziyaretçiden müşteriye</p>
          <div className="mt-4 pt-4 border-t border-blue-400">
            <div className="flex items-center justify-between text-sm">
              <span>Geçen ay</span>
              <span className="font-semibold">{conversionMetrics?.lastMonthConversionRate || '0'}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Sepet Ortalaması</h4>
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-2">
            ₺{parseInt(conversionMetrics?.avgCartValue || '0').toLocaleString('tr-TR')}
          </p>
          <p className="text-green-100 text-sm">Ortalama sipariş değeri</p>
          <div className="mt-4 pt-4 border-t border-green-400">
            <div className="flex items-center justify-between text-sm">
              <span>Geçen ay</span>
              <span className="font-semibold">₺{parseInt(conversionMetrics?.lastMonthAvgCartValue || '0').toLocaleString('tr-TR')}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-700 dark:to-purple-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Müşteri Yaşam Değeri</h4>
            <DollarSign className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-2">
            ₺{parseInt(conversionMetrics?.avgCLV || '0').toLocaleString('tr-TR')}
          </p>
          <p className="text-purple-100 text-sm">Ortalama CLV</p>
          <div className="mt-4 pt-4 border-t border-purple-400">
            <div className="flex items-center justify-between text-sm">
              <span>Geçen ay</span>
              <span className="font-semibold">₺{parseInt(conversionMetrics?.lastMonthAvgCLV || '0').toLocaleString('tr-TR')}</span>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {activeTab === 'behavior' && (
        <>
          {/* 1. Ekran Görüntüleme Süreleri */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ekran Görüntüleme Süreleri</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {screenViews.length > 0 ? (
                <BarChart data={screenViews.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="screenName" stroke="#64748b" className="dark:stroke-slate-400" />
                  <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgDuration" fill="#6366f1" name="Ortalama Süre (ms)" />
                </BarChart>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
              )}
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {screenViews.slice(0, 3).map((view, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{view.screenName}</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {formatDuration(view.avgDuration || 0)}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{view.totalViews} görüntüleme</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 2. Scroll Derinliği */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Scroll Derinliği</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {scrollDepth.length > 0 ? (
                <BarChart data={scrollDepth.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="screenName" stroke="#64748b" className="dark:stroke-slate-400" />
                  <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgMaxDepth" fill="#10b981" name="Ortalama Scroll %" />
                </BarChart>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
              )}
            </ResponsiveContainer>
          </motion.div>

          {/* 3. Sayfa Geçiş Yolları */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Navigation className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sayfa Geçiş Yolları</h3>
            </div>
            <div className="space-y-2">
              {navigationPaths.length > 0 ? (
                navigationPaths.slice(0, 10).map((path, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{path.path}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{path.count} kullanım</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{path.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
              )}
            </div>
          </motion.div>

          {/* 4. Filtre Kullanım Oranı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Filtre Kullanım Oranı</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {filterUsage.length > 0 ? (
                <BarChart data={filterUsage.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="filterType" stroke="#64748b" className="dark:stroke-slate-400" />
                  <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalUsage" fill="#f59e0b" name="Toplam Kullanım" />
                </BarChart>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
              )}
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {filterUsage.slice(0, 4).map((filter, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{filter.filterType}</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{filter.totalUsage}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{filter.uniqueValuesCount} farklı değer</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 5. Sıralama Seçenekleri */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <ArrowUpDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sıralama Tercihleri</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {sortPreferences.length > 0 ? (
                <PieChart>
                  <Pie
                    data={sortPreferences.slice(0, 8)}
                    dataKey="totalUsage"
                    nameKey="sortType"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {sortPreferences.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
              )}
            </ResponsiveContainer>
          </motion.div>

          {/* 6. Geri Dönülen Sayfalar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <ArrowLeft className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Geri Dönülen Sayfalar</h3>
            </div>
            <div className="space-y-3">
              {backNavigation.length > 0 ? (
                backNavigation.slice(0, 10).map((nav, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{nav.fromScreen}</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{nav.totalBacks} geri dönüş</p>
                    </div>
                    <div className="mt-2 space-y-1">
                      {nav.toScreens.slice(0, 3).map((to: any, toIdx: number) => (
                        <p key={toIdx} className="text-xs text-slate-500 dark:text-slate-400">
                          → {to.toScreen} ({to.count} kez)
                        </p>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
              )}
            </div>
          </motion.div>

          {/* 7. Ürün Etkileşim Derinliği */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <MousePointer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ürün Etkileşim Derinliği</h3>
            </div>
            {productInteractions.length > 0 ? (
              <>
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Toplam Görüntüleme</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {productInteractions.reduce((sum, p) => sum + (p.totalViews || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Süre</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatDuration(productInteractions.reduce((sum, p) => sum + (p.avgDuration || 0), 0) / Math.max(productInteractions.length, 1))}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Zoom</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {(productInteractions.reduce((sum, p) => sum + parseFloat(p.avgZoomPerView || 0), 0) / Math.max(productInteractions.length, 1)).toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Carousel</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {(productInteractions.reduce((sum, p) => sum + parseFloat(p.avgCarouselSwipesPerView || 0), 0) / Math.max(productInteractions.length, 1)).toFixed(1)}
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productInteractions.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis dataKey="productId" stroke="#64748b" className="dark:stroke-slate-400" />
                    <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="totalViews" fill="#6366f1" name="Görüntüleme" />
                    <Bar dataKey="descriptionViewRate" fill="#10b981" name="Açıklama Görüntüleme %" />
                    <Bar dataKey="variantSelectionRate" fill="#f59e0b" name="Varyant Seçimi %" />
                  </BarChart>
                </ResponsiveContainer>
                {/* Detaylı Ürün Etkileşim Tablosu */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Ürün Etkileşim Detayları</p>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ürün ara..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300"
                      />
                    </div>
                  </div>
                  
                  {productInteractionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Görüntüleme</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ort. Süre</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Zoom</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Carousel</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Açıklama</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Varyant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productInteractionsWithDetails
                            .filter(item => {
                              if (!productSearchQuery) return true
                              const query = productSearchQuery.toLowerCase()
                              return (
                                item.productName?.toLowerCase().includes(query) ||
                                item.productId?.toString().includes(query) ||
                                item.productCategory?.toLowerCase().includes(query)
                              )
                            })
                            .slice(0, 20)
                            .map((interaction, idx) => (
                            <tr key={idx} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-3">
                                  {interaction.productImage && (
                                    <img
                                      src={interaction.productImage}
                                      alt={interaction.productName}
                                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none'
                                      }}
                                    />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                      {interaction.productName}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      ID: {interaction.productId} · {interaction.productCategory}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  {interaction.totalViews}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  {formatDuration(interaction.avgDuration || 0)}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                    {interaction.totalZoomCount || 0}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Ort: {parseFloat(interaction.avgZoomPerView || 0).toFixed(1)}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                    {interaction.totalCarouselSwipes || 0}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Ort: {parseFloat(interaction.avgCarouselSwipesPerView || 0).toFixed(1)}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${parseFloat(interaction.descriptionViewRate || 0) > 50 ? 'bg-green-500' : parseFloat(interaction.descriptionViewRate || 0) > 25 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                  <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {interaction.descriptionViewRate}%
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${parseFloat(interaction.variantSelectionRate || 0) > 50 ? 'bg-green-500' : parseFloat(interaction.variantSelectionRate || 0) > 25 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                  <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {interaction.variantSelectionRate}%
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {productInteractionsWithDetails.filter(item => {
                        if (!productSearchQuery) return true
                        const query = productSearchQuery.toLowerCase()
                        return (
                          item.productName?.toLowerCase().includes(query) ||
                          item.productId?.toString().includes(query) ||
                          item.productCategory?.toLowerCase().includes(query)
                        )
                      }).length === 0 && (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                          {productSearchQuery ? 'Arama sonucu bulunamadı' : 'Veri yok'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </motion.div>

          {/* 8. Sepet Davranışı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sepet Davranışı</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sepete Ekleme</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{cartBehavior.totalAdds || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sepetten Çıkarma</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{cartBehavior.totalRemoves || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Beden Değiştirme</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{cartBehavior.totalSizeChanges || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Sepet Doluluk</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{cartBehavior.avgCartItemCount || 0}</p>
              </div>
            </div>
            {Object.keys(cartBehavior.removeReasons || {}).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Çıkarma Nedenleri</p>
                <div className="space-y-2">
                  {Object.entries(cartBehavior.removeReasons).map(([reason, count]: [string, any]) => (
                    <div key={reason} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{reason}</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* 9. Ödeme Davranışı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ödeme Davranışı</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Kupon Denemeleri</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{paymentBehavior.couponTries || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Başarılı: {paymentBehavior.couponSuccesses || 0} | Başarısız: {paymentBehavior.couponFailures || 0}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sepet Terk</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{paymentBehavior.totalAbandons || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Taksit Seçimleri</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Object.keys(paymentBehavior.installmentSelections || {}).length}
                </p>
              </div>
            </div>
            {Object.keys(paymentBehavior.cartAbandons || {}).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Terk Edilme Adımları</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(paymentBehavior.cartAbandons).map(([step, count]: [string, any]) => ({ step, count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis dataKey="step" stroke="#64748b" className="dark:stroke-slate-400" />
                    <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* 10. Kullanıcı Segment Etiketleri */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kullanıcı Segment Etiketleri</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Fiyat Duyarlılık</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {userSegments.avgPriceSensitivity || 50}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ortalama Skor</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Hızlı Karar</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {userSegments.quickDecisionCount || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kullanıcı</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">İndirim Avcısı</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {userSegments.discountHunterCount || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kullanıcı</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Premium Alıcı</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {userSegments.premiumShopperCount || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kullanıcı</p>
              </div>
            </div>
          </motion.div>

          {/* 11. Performans Ölçümleri */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Performans Ölçümleri</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. API Süresi</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {performanceMetrics.avgApiResponseTime || 0}ms
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Loading Süresi</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {performanceMetrics.avgLoadingSpinnerDuration || 0}ms
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Görsel Yükleme</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {performanceMetrics.avgImageLoadTime || 0}ms
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">UI Freeze</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {performanceMetrics.totalUiFreezes || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {performanceMetrics.totalUiFreezeDuration || 0}ms toplam
                </p>
              </div>
            </div>
          </motion.div>

          {/* 12. Oturum Analitiği */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Oturum Analitiği</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Toplam Oturum</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{sessions.totalSessions || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Oturum Süresi</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatDuration(parseFloat(sessions.avgSessionDuration || 0))}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Sayfa Sayısı</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {parseFloat(sessions.avgPageCount || 0).toFixed(1)}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Scroll Derinliği</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {parseFloat(sessions.avgScrollDepth || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </motion.div>

          {/* 13. Favori / Wishlist Analitiği */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Favori / Wishlist Analitiği</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Wishlist Ekleme</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{wishlist.totalAdds || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Satın Alınmayan</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {wishlist.notPurchasedRate || 0}%
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Satın Alma Süresi</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatDuration(parseFloat(wishlist.avgTimeToPurchase || 0))}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Farklı Beden Arama</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {parseFloat(wishlist.sizeVariationCount || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* 14. Kullanıcı Yaşam Döngüsü (LTV) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kullanıcı Yaşam Döngüsü (LTV)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. İlk Satın Alma</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatDuration(parseFloat(ltv.avgFirstPurchaseTime || 0))}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Tekrar Aralığı</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatDuration(parseFloat(ltv.avgRepeatInterval || 0))}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Sepet Değeri</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ₺{parseFloat(ltv.avgBasketValue || 0).toLocaleString('tr-TR')}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Toplam Satın Alma</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {parseFloat(ltv.avgTotalPurchases || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* 15. Kampanya Etkisi */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kampanya Etkisi</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Banner Görüntüleme</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{campaigns.bannerViews || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tıklama: {campaigns.bannerClicks || 0} ({campaigns.bannerViewToClickRate || 0}%)
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Kupon Kullanımı</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {campaigns.voucherRedemptions || 0}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Flash Deal Görüntüleme</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {campaigns.flashDealViews || 0}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Görüntüleme Süresi</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatDuration(parseFloat(campaigns.avgViewDuration || 0))}
                </p>
              </div>
            </div>
          </motion.div>

          {/* 16. Güvenlik & Dolandırıcılık */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <ArrowDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Güvenlik & Dolandırıcılık Sinyalleri</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Hızlı Ödeme</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {fraudSignals.fastCheckouts || 0}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Başarısız Ödeme</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {fraudSignals.failedPaymentAttempts || 0}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">IP Konum Değişimi</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {fraudSignals.ipLocationChanges || 0}
                </p>
              </div>
            </div>
            {Array.isArray(fraudSignals.suspiciousUsers) && fraudSignals.suspiciousUsers.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                  Şüpheli Kullanıcılar ({fraudSignals.suspiciousUsers.length})
                </p>
                <div className="space-y-2">
                  {fraudSignals.suspiciousUsers.slice(0, 5).map((user: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Kullanıcı ID: {user.userId}</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {user.signalCount} toplam sinyal
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-red-600 dark:text-red-400">Hızlı: {user.fastCheckouts}</p>
                        <p className="text-xs text-red-600 dark:text-red-400">Başarısız: {user.failedPaymentAttempts}</p>
                        <p className="text-xs text-red-600 dark:text-red-400">IP Değişim: {user.ipLocationChanges}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}
