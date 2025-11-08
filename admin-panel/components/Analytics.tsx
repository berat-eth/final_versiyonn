'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useTheme } from '@/lib/ThemeContext'
import { 
  BarChart3, TrendingUp, Users, Activity, ShoppingCart, DollarSign, 
  Eye, MousePointer, Zap, AlertTriangle, Clock, Target, Filter,
  Download, RefreshCw, Calendar, ArrowUp, ArrowDown, TrendingDown
} from 'lucide-react'
import { 
  Line, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area, ComposedChart
} from 'recharts'
import { motion } from 'framer-motion'

export default function Analytics() {
  const { theme } = useTheme()
  const [timeRange, setTimeRange] = useState('7d')
  const [activeSection, setActiveSection] = useState('overview')
  const [loading, setLoading] = useState(true)

  // Overview data
  const [overview, setOverview] = useState<any>(null)
  const [userAnalytics, setUserAnalytics] = useState<any>(null)
  const [behaviorAnalytics, setBehaviorAnalytics] = useState<any>(null)
  const [funnelData, setFunnelData] = useState<any>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const [segmentAnalytics, setSegmentAnalytics] = useState<any>(null)
  const [productAnalytics, setProductAnalytics] = useState<any>(null)
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null)
  const [characteristics, setCharacteristics] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [timeRange, activeSection])

  const loadData = async () => {
    setLoading(true)
    try {
      const tenantId = 1 // Default tenant, can be made dynamic

      switch (activeSection) {
        case 'overview':
          const overviewRes = await api.get(`/admin/analytics/overview?timeRange=${timeRange}&tenantId=${tenantId}`)
          setOverview(overviewRes.data)
          break

        case 'users':
          const usersRes = await api.get(`/admin/analytics/users?timeRange=${timeRange}&tenantId=${tenantId}`)
          setUserAnalytics(usersRes.data)
          break

        case 'behavior':
          const behaviorRes = await api.get(`/admin/analytics/behavior?timeRange=${timeRange}&tenantId=${tenantId}`)
          setBehaviorAnalytics(behaviorRes.data)
          break

        case 'funnel':
          const funnelRes = await api.get(`/admin/analytics/funnel?timeRange=${timeRange}&tenantId=${tenantId}`)
          setFunnelData(funnelRes.data)
          break

        case 'performance':
          const perfRes = await api.get(`/admin/analytics/performance?timeRange=${timeRange}&tenantId=${tenantId}`)
          setPerformanceMetrics(perfRes.data)
          break

        case 'segments':
          const segmentsRes = await api.get(`/admin/analytics/segments?timeRange=${timeRange}&tenantId=${tenantId}`)
          setSegmentAnalytics(segmentsRes.data)
          break

        case 'products':
          const productsRes = await api.get(`/admin/analytics/products?timeRange=${timeRange}&tenantId=${tenantId}`)
          setProductAnalytics(productsRes.data)
          break

        case 'timeseries':
          const timeseriesRes = await api.get(`/admin/analytics/timeseries?metric=users&timeRange=${timeRange}&interval=day&tenantId=${tenantId}`)
          setTimeSeriesData(timeseriesRes.data)
          break

        case 'characteristics':
          const charRes = await api.get(`/admin/analytics/characteristics?tenantId=${tenantId}`)
          setCharacteristics(charRes.data)
          break
      }
    } catch (error) {
      console.error('❌ Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const tenantId = 1
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api.plaxsy.com/api'}/admin/analytics/export?type=${format}&format=events&timeRange=${timeRange}&tenantId=${tenantId}`,
        {
          headers: {
            'X-Admin-Key': sessionStorage.getItem('authToken') || '',
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || ''
          }
        }
      )

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${Date.now()}.csv`
        a.click()
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${Date.now()}.json`
        a.click()
      }
    } catch (error) {
      console.error('❌ Error exporting data:', error)
      alert('Veri export edilemedi')
    }
  }

  const sections = [
    { id: 'overview', label: 'Genel Özet', icon: BarChart3 },
    { id: 'users', label: 'Kullanıcılar', icon: Users },
    { id: 'behavior', label: 'Davranış', icon: Activity },
    { id: 'funnel', label: 'Funnel', icon: Target },
    { id: 'performance', label: 'Performans', icon: Zap },
    { id: 'segments', label: 'Segmentler', icon: Filter },
    { id: 'products', label: 'Ürünler', icon: ShoppingCart },
    { id: 'timeseries', label: 'Zaman Serisi', icon: TrendingUp },
    { id: 'characteristics', label: 'Karakteristikler', icon: Users }
  ]

  const timeRanges = [
    { value: '1h', label: 'Son 1 Saat' },
    { value: '24h', label: 'Son 24 Saat' },
    { value: '7d', label: 'Son 7 Gün' },
    { value: '30d', label: 'Son 30 Gün' },
    { value: '90d', label: 'Son 90 Gün' },
    { value: '1y', label: 'Son 1 Yıl' }
  ]

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Detaylı Analitik
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Kullanıcı davranışları, performans metrikleri ve detaylı analizler
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          <button
            onClick={() => exportData('csv')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV Export
          </button>
          <button
            onClick={() => exportData('json')}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            JSON Export
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
        {sections.map(section => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
                activeSection === section.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeSection === 'overview' && overview && (
          <OverviewSection data={overview} theme={theme} />
        )}
        {activeSection === 'users' && userAnalytics && (
          <UsersSection data={userAnalytics} theme={theme} />
        )}
        {activeSection === 'behavior' && behaviorAnalytics && (
          <BehaviorSection data={behaviorAnalytics} theme={theme} />
        )}
        {activeSection === 'funnel' && funnelData && (
          <FunnelSection data={funnelData} theme={theme} />
        )}
        {activeSection === 'performance' && performanceMetrics && (
          <PerformanceSection data={performanceMetrics} theme={theme} />
        )}
        {activeSection === 'segments' && segmentAnalytics && (
          <SegmentsSection data={segmentAnalytics} theme={theme} />
        )}
        {activeSection === 'products' && productAnalytics && (
          <ProductsSection data={productAnalytics} theme={theme} />
        )}
        {activeSection === 'timeseries' && timeSeriesData && (
          <TimeSeriesSection data={timeSeriesData} theme={theme} />
        )}
        {activeSection === 'characteristics' && characteristics && (
          <CharacteristicsSection data={characteristics} theme={theme} />
        )}
      </div>
    </div>
  )
}

// Overview Section Component
function OverviewSection({ data, theme }: any) {
  const kpiCards = [
    { label: 'Toplam Kullanıcı', value: data.totalUsers, icon: Users, color: 'blue' },
    { label: 'Aktif Kullanıcı', value: data.activeUsers, icon: Activity, color: 'green' },
    { label: 'Toplam Oturum', value: data.totalSessions, icon: Eye, color: 'purple' },
    { label: 'Toplam Event', value: data.totalEvents, icon: MousePointer, color: 'orange' },
    { label: 'Toplam Gelir', value: `₺${data.totalRevenue.toLocaleString('tr-TR')}`, icon: DollarSign, color: 'green' },
    { label: 'Ort. Oturum Süresi', value: `${Math.floor(data.avgSessionDuration / 60)} dk`, icon: Clock, color: 'blue' },
    { label: 'Bounce Rate', value: `${data.bounceRate.toFixed(1)}%`, icon: TrendingDown, color: 'red' }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{kpi.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {kpi.value}
                  </p>
                </div>
                <Icon className={`w-8 h-8 text-${kpi.color}-600`} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Users Section Component
function UsersSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Aktif Kullanıcılar</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Günlük (DAU)</span>
              <span className="font-bold">{data.dau}</span>
            </div>
            <div className="flex justify-between">
              <span>Haftalık (WAU)</span>
              <span className="font-bold">{data.wau}</span>
            </div>
            <div className="flex justify-between">
              <span>Aylık (MAU)</span>
              <span className="font-bold">{data.mau}</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Kullanıcı Türleri</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Yeni Kullanıcılar</span>
              <span className="font-bold">{data.newUsers}</span>
            </div>
            <div className="flex justify-between">
              <span>Dönen Kullanıcılar</span>
              <span className="font-bold">{data.returningUsers}</span>
            </div>
            <div className="flex justify-between">
              <span>Retention Rate</span>
              <span className="font-bold">{data.retentionRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Churn Rate</span>
              <span className="font-bold text-red-600">{data.churnRate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Behavior Section Component
function BehaviorSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Ekran Görüntülemeleri</h3>
          <p className="text-3xl font-bold">{data.screenViews.toLocaleString()}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Ortalama Ekranda Kalma: {data.avgTimeOnScreen}s
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Scroll Derinliği</h3>
          <p className="text-3xl font-bold">{data.scrollDepth.avg.toFixed(1)}%</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Maksimum: {data.scrollDepth.max.toFixed(1)}%
          </p>
        </div>
      </div>
      {data.topScreens && data.topScreens.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">En Popüler Ekranlar</h3>
          <div className="space-y-2">
            {data.topScreens.map((screen: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span>{screen.screenName}</span>
                <span className="font-bold">{screen.viewCount} görüntüleme</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Funnel Section Component
function FunnelSection({ data, theme }: any) {
  const funnelSteps = [
    { label: 'Ürün Görüntüleme', value: data.funnel.productViews, color: '#3b82f6' },
    { label: 'Sepete Ekleme', value: data.funnel.addToCart, color: '#10b981' },
    { label: 'Checkout', value: data.funnel.checkout, color: '#f59e0b' },
    { label: 'Satın Alma', value: data.funnel.purchase, color: '#ef4444' }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-6">Satın Alma Funnel'i</h3>
        <div className="space-y-4">
          {funnelSteps.map((step, index) => {
            const prevValue = index > 0 ? funnelSteps[index - 1].value : step.value
            const conversionRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0
            return (
              <div key={index}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{step.label}</span>
                  <span className="font-bold">{step.value.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                  <div
                    className="h-4 rounded-full transition-all"
                    style={{
                      width: `${(step.value / funnelSteps[0].value) * 100}%`,
                      backgroundColor: step.color
                    }}
                  />
                </div>
                {index > 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Dönüşüm: {conversionRate.toFixed(1)}%
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md">
          <p className="text-sm text-slate-600 dark:text-slate-400">View → Cart</p>
          <p className="text-2xl font-bold">{data.conversionRates.viewToCart.toFixed(1)}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md">
          <p className="text-sm text-slate-600 dark:text-slate-400">Cart → Checkout</p>
          <p className="text-2xl font-bold">{data.conversionRates.cartToCheckout.toFixed(1)}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md">
          <p className="text-sm text-slate-600 dark:text-slate-400">Checkout → Purchase</p>
          <p className="text-2xl font-bold">{data.conversionRates.checkoutToPurchase.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}

// Performance Section Component
function PerformanceSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Sayfa Yükleme Süreleri</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Ortalama</span>
              <span className="font-bold">{data.pageLoadTime.avg}ms</span>
            </div>
            <div className="flex justify-between">
              <span>P95</span>
              <span className="font-bold">{data.pageLoadTime.p95}ms</span>
            </div>
            <div className="flex justify-between">
              <span>P99</span>
              <span className="font-bold">{data.pageLoadTime.p99}ms</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">API Performansı</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Ortalama Yanıt Süresi</span>
              <span className="font-bold">{data.apiResponseTime.avg}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Hata Oranı</span>
              <span className="font-bold text-red-600">{data.errorRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Crash Sayısı</span>
              <span className="font-bold text-red-600">{data.crashRate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Segments Section Component
function SegmentsSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Segment Performansı</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-2">Segment</th>
                <th className="text-right p-2">Kullanıcı</th>
                <th className="text-right p-2">Sipariş</th>
                <th className="text-right p-2">Gelir</th>
                <th className="text-right p-2">Ort. Sipariş</th>
              </tr>
            </thead>
            <tbody>
              {data.map((segment: any, index: number) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">{segment.segmentName}</td>
                  <td className="text-right p-2">{segment.userCount}</td>
                  <td className="text-right p-2">{segment.orderCount}</td>
                  <td className="text-right p-2">₺{parseFloat(segment.totalRevenue).toLocaleString('tr-TR')}</td>
                  <td className="text-right p-2">₺{parseFloat(segment.avgOrderValue).toLocaleString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Products Section Component
function ProductsSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">En Çok Görüntülenen</h3>
          <div className="space-y-2">
            {data.topViewed?.slice(0, 5).map((product: any, index: number) => (
              <div key={index} className="flex justify-between">
                <span className="truncate">{product.name}</span>
                <span className="font-bold">{product.viewCount}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">En Çok Sepete Eklenen</h3>
          <div className="space-y-2">
            {data.topAddedToCart?.slice(0, 5).map((product: any, index: number) => (
              <div key={index} className="flex justify-between">
                <span className="truncate">{product.name}</span>
                <span className="font-bold">{product.addToCartCount}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">En Çok Satın Alınan</h3>
          <div className="space-y-2">
            {data.topPurchased?.slice(0, 5).map((product: any, index: number) => (
              <div key={index} className="flex justify-between">
                <span className="truncate">{product.name}</span>
                <span className="font-bold">{product.purchaseCount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Time Series Section Component
function TimeSeriesSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Zaman Serisi Grafiği</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Characteristics Section Component
function CharacteristicsSection({ data, theme }: any) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md text-center">
        <p className="text-slate-600 dark:text-slate-400">Henüz karakteristik veri yok</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Kullanıcı Karakteristikleri</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-2">Kullanıcı</th>
                <th className="text-left p-2">Alışveriş Tarzı</th>
                <th className="text-right p-2">Fiyat Hassasiyeti</th>
                <th className="text-right p-2">Marka Sadakati</th>
                <th className="text-right p-2">Teknoloji</th>
                <th className="text-left p-2">Etkileşim</th>
                <th className="text-left p-2">Karar Hızı</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map((char: any, index: number) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">{char.userName || char.email || 'N/A'}</td>
                  <td className="p-2">{char.shoppingStyle}</td>
                  <td className="text-right p-2">{char.priceSensitivityScore}</td>
                  <td className="text-right p-2">{char.brandLoyaltyIndex}</td>
                  <td className="text-right p-2">{char.technologyAdoptionScore}</td>
                  <td className="p-2">{char.engagementLevel}</td>
                  <td className="p-2">{char.decisionSpeed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

