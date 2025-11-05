'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, ShoppingBag, DollarSign, ArrowUp, ArrowDown, Calendar, Loader2, Clock, TrendingDown, Navigation, Filter, ArrowUpDown, MousePointer, ArrowLeft, Search, User, X, Activity, Globe, Target, Brain, AlertTriangle, Zap, BarChart3 } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { useTheme } from '@/lib/ThemeContext'
import { analyticsService } from '@/lib/services/analyticsService'
import { api } from '@/lib/api'
import { userService } from '@/lib/services/userService'

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
  const [activeTab, setActiveTab] = useState<'general' | 'behavior' | 'advanced' | 'predictive' | 'realtime' | 'health' | 'user-based'>('general')
  const [behaviorSubTab, setBehaviorSubTab] = useState<'interaction' | 'product' | 'segmentation' | 'performance' | 'marketing'>('interaction')
  
  // User-based analytics states
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userAnalyticsLoading, setUserAnalyticsLoading] = useState(false)
  
  // Device-based analytics states
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<any>(null)
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('')
  const [deviceAnalyticsLoading, setDeviceAnalyticsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'user' | 'device'>('user')
  
  // User-specific analytics data
  const [userScreenViews, setUserScreenViews] = useState<any[]>([])
  const [userScrollDepth, setUserScrollDepth] = useState<any[]>([])
  const [userNavigationPaths, setUserNavigationPaths] = useState<any[]>([])
  const [userProductInteractions, setUserProductInteractions] = useState<any[]>([])
  const [userCartBehavior, setUserCartBehavior] = useState<any>({})
  const [userPaymentBehavior, setUserPaymentBehavior] = useState<any>({})
  const [userSessions, setUserSessions] = useState<any>({})
  const [userDeviceInfo, setUserDeviceInfo] = useState<any>({})
  const [userWishlist, setUserWishlist] = useState<any>({})
  const [userLTV, setUserLTV] = useState<any>({})
  
  // Advanced Analytics states
  const [cohortData, setCohortData] = useState<any[]>([])
  const [cohortRetention, setCohortRetention] = useState<any[]>([])
  const [cohortLTV, setCohortLTV] = useState<any>(null)
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [cohortLoading, setCohortLoading] = useState(false)
  
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [funnelSteps, setFunnelSteps] = useState<any[]>([])
  const [funnelLoading, setFunnelLoading] = useState(false)
  
  const [geospatialData, setGeospatialData] = useState<any>(null)
  const [geospatialLoading, setGeospatialLoading] = useState(false)
  
  const [predictiveData, setPredictiveData] = useState<any>({
    churnPredictions: [],
    purchaseProbabilities: []
  })
  const [predictiveLoading, setPredictiveLoading] = useState(false)
  
  const [realtimeMetrics, setRealtimeMetrics] = useState<any>(null)
  const [realtimeLoading, setRealtimeLoading] = useState(false)
  const [realtimeInterval, setRealtimeInterval] = useState<NodeJS.Timeout | null>(null)
  
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [healthMetrics, setHealthMetrics] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  const loadAnalytics = async () => {
    try {
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
    const loadAllData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          loadAnalytics(),
    loadBehaviorAnalytics()
        ])
      } catch (error) {
        console.error('Veri yükleme hatası:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAllData()
  }, [dateRange])

  // Load users for user-based analytics
  const loadUsers = async () => {
    try {
      setUsersLoading(true)
      const response = await userService.getAllUsers()
      if (response && response.success && response.data) {
        setUsers(response.data)
      }
    } catch (error) {
      console.error('Kullanıcı listesi yükleme hatası:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  // Load user-specific analytics
  const loadUserAnalytics = async (userId: number) => {
    try {
      setUserAnalyticsLoading(true)
      
      // Get user details
      const userRes = await userService.getProfile(userId)
      if (userRes && userRes.success && userRes.data) {
        setSelectedUser(userRes.data)
      }

      // Load user-specific analytics data
      const [
        viewsRes, scrollRes, pathsRes, productRes,
        cartRes, paymentRes, sessionsRes, deviceRes,
        wishlistRes, ltvRes
      ] = await Promise.all([
        api.get<any>(`/user-data/behavior/screen-views?userId=${userId}`).catch(() => ({ success: true, data: [] })),
        api.get<any>(`/user-data/behavior/scroll-depth?userId=${userId}`).catch(() => ({ success: true, data: [] })),
        api.get<any>(`/user-data/behavior/navigation-paths?userId=${userId}`).catch(() => ({ success: true, data: [] })),
        api.get<any>(`/user-data/behavior/product-interactions?userId=${userId}`).catch(() => ({ success: true, data: [] })),
        api.get<any>(`/user-data/behavior/cart-behavior?userId=${userId}`).catch(() => ({ success: true, data: {} })),
        api.get<any>(`/user-data/behavior/payment-behavior?userId=${userId}`).catch(() => ({ success: true, data: {} })),
        api.get<any>(`/user-data/behavior/sessions?userId=${userId}`).catch(() => ({ success: true, data: {} })),
        api.get<any>(`/user-data/behavior/device-info?userId=${userId}`).catch(() => ({ success: true, data: {} })),
        api.get<any>(`/user-data/behavior/wishlist?userId=${userId}`).catch(() => ({ success: true, data: {} })),
        api.get<any>(`/user-data/behavior/ltv?userId=${userId}`).catch(() => ({ success: true, data: {} }))
      ])

      if (viewsRes.success) setUserScreenViews(viewsRes.data || [])
      if (scrollRes.success) setUserScrollDepth(scrollRes.data || [])
      if (pathsRes.success) setUserNavigationPaths(pathsRes.data || [])
      if (productRes.success) setUserProductInteractions(productRes.data || [])
      if (cartRes.success) setUserCartBehavior(cartRes.data || {})
      if (paymentRes.success) setUserPaymentBehavior(paymentRes.data || {})
      if (sessionsRes.success) setUserSessions(sessionsRes.data || {})
      if (deviceRes.success) setUserDeviceInfo(deviceRes.data || {})
      if (wishlistRes.success) setUserWishlist(wishlistRes.data || {})
      if (ltvRes.success) setUserLTV(ltvRes.data || {})
    } catch (error) {
      console.error('Kullanıcı analitik verileri yükleme hatası:', error)
    } finally {
      setUserAnalyticsLoading(false)
    }
  }

  // Load devices for device-based analytics
  const loadDevices = async () => {
    try {
      setDevicesLoading(true)
      const response = await analyticsService.getDevices(200, 0)
      if (response && response.success && response.data) {
        setDevices(response.data)
      }
    } catch (error) {
      console.error('Device listesi yükleme hatası:', error)
    } finally {
      setDevicesLoading(false)
    }
  }

  // Load device-specific analytics
  const loadDeviceAnalytics = async (deviceId: string) => {
    try {
      setDeviceAnalyticsLoading(true)
      
      // Get device details
      const device = devices.find(d => d.deviceId === deviceId)
      if (device) {
        setSelectedDevice(device)
      }

      // Load device-specific analytics data
      const analyticsRes = await analyticsService.getDeviceAnalytics(deviceId, 30)
      
      if (analyticsRes.success && analyticsRes.data) {
        setUserScreenViews(analyticsRes.data.screenViews || [])
        setUserScrollDepth(analyticsRes.data.scrollDepth || [])
        setUserNavigationPaths(analyticsRes.data.navigationPaths || [])
        setUserProductInteractions(analyticsRes.data.productInteractions || [])
        setUserSessions(analyticsRes.data.sessions || {})
      }
    } catch (error) {
      console.error('Device analitik verileri yükleme hatası:', error)
    } finally {
      setDeviceAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'user-based') {
      if (viewMode === 'user' && users.length === 0) {
        loadUsers()
      } else if (viewMode === 'device' && devices.length === 0) {
        loadDevices()
      }
    }
  }, [activeTab, viewMode])

  useEffect(() => {
    if (selectedUserId && viewMode === 'user') {
      loadUserAnalytics(selectedUserId)
    }
  }, [selectedUserId, viewMode])

  useEffect(() => {
    if (selectedDeviceId && viewMode === 'device') {
      loadDeviceAnalytics(selectedDeviceId)
    }
  }, [selectedDeviceId, viewMode])

  // Advanced Analytics - Load cohort data
  const loadCohortData = async () => {
    try {
      setCohortLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 12)
      
      const [cohortsRes, retentionRes] = await Promise.all([
        analyticsService.getCohorts(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          'month'
        ),
        selectedCohort 
          ? analyticsService.getCohortRetention(selectedCohort, 12)
          : Promise.resolve({ success: true, data: [] })
      ])
      
      if (cohortsRes.success) {
        setCohortData(cohortsRes.data || [])
      }
      if (retentionRes.success) {
        setCohortRetention(retentionRes.data || [])
      }
    } catch (error) {
      console.error('Cohort verileri yükleme hatası:', error)
    } finally {
      setCohortLoading(false)
    }
  }

  // Advanced Analytics - Load funnel data
  const loadFunnelData = async () => {
    try {
      setFunnelLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      
      const defaultSteps = [
        { name: 'Ana Sayfa', event: 'screen_view', screen: 'Home' },
        { name: 'Ürün Listesi', event: 'screen_view', screen: 'Products' },
        { name: 'Ürün Detay', event: 'screen_view', screen: 'ProductDetail' },
        { name: 'Sepete Ekle', event: 'cart_add', screen: 'Cart' },
        { name: 'Ödeme', event: 'payment_start', screen: 'Checkout' },
        { name: 'Tamamla', event: 'purchase', screen: 'OrderComplete' }
      ]
      
      const res = await analyticsService.calculateFunnel(
        defaultSteps,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      
      if (res.success) {
        setFunnelData(res.data || [])
        setFunnelSteps(defaultSteps)
      }
    } catch (error) {
      console.error('Funnel verileri yükleme hatası:', error)
    } finally {
      setFunnelLoading(false)
    }
  }

  // Advanced Analytics - Load geospatial data
  const loadGeospatialData = async () => {
    try {
      setGeospatialLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 6)
      
      const res = await analyticsService.getGeographicDistribution(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      
      if (res.success) {
        setGeospatialData(res.data)
      }
    } catch (error) {
      console.error('Geospatial verileri yükleme hatası:', error)
    } finally {
      setGeospatialLoading(false)
    }
  }

  // Predictive Analytics - Load predictions
  const loadPredictiveData = async () => {
    try {
      setPredictiveLoading(true)
      
      // Get all users for churn prediction
      const usersRes = await userService.getAllUsers()
      if (usersRes.success && usersRes.data) {
        const users = usersRes.data.slice(0, 50) // Limit to first 50 users
        const churnPromises = users.map((user: any) => 
          analyticsService.predictChurn(user.id, 30).catch(() => null)
        )
        
        const churnResults = await Promise.all(churnPromises)
        const churnPredictions = churnResults
          .filter((r: any) => r && r.success && r.data)
          .map((r: any) => r.data)
        
        setPredictiveData((prev: any) => ({
          ...prev,
          churnPredictions
        }))
      }
      
      // Get purchase probabilities
      const purchaseRes = await analyticsService.predictPurchase()
      if (purchaseRes.success && purchaseRes.data) {
        setPredictiveData((prev: any) => ({
          ...prev,
          purchaseProbabilities: purchaseRes.data || []
        }))
      }
    } catch (error) {
      console.error('Predictive verileri yükleme hatası:', error)
    } finally {
      setPredictiveLoading(false)
    }
  }

  // Real-time Analytics - Load metrics
  const loadRealtimeMetrics = async () => {
    try {
      setRealtimeLoading(true)
      const res = await analyticsService.getRealtimeMetrics()
      if (res.success) {
        setRealtimeMetrics(res.data)
      }
    } catch (error) {
      console.error('Realtime metrikler yükleme hatası:', error)
    } finally {
      setRealtimeLoading(false)
    }
  }

  // Health Monitoring - Load health status
  const loadHealthStatus = async () => {
    try {
      setHealthLoading(true)
      const [healthRes, metricsRes] = await Promise.all([
        analyticsService.getHealthStatus(),
        analyticsService.getMetrics()
      ])
      
      if (healthRes.success) {
        setHealthStatus(healthRes.data)
      }
      if (metricsRes.success) {
        setHealthMetrics(metricsRes.data)
      }
    } catch (error) {
      console.error('Health status yükleme hatası:', error)
    } finally {
      setHealthLoading(false)
    }
  }

  // Load data when switching to advanced analytics tabs
  useEffect(() => {
    if (activeTab === 'advanced') {
      if (cohortData.length === 0) loadCohortData()
      if (funnelData.length === 0) loadFunnelData()
      if (!geospatialData) loadGeospatialData()
    } else if (activeTab === 'predictive') {
      if (predictiveData.churnPredictions.length === 0) loadPredictiveData()
    } else if (activeTab === 'realtime') {
      loadRealtimeMetrics()
      const interval = setInterval(() => {
        loadRealtimeMetrics()
      }, 5000) // Update every 5 seconds
      setRealtimeInterval(interval)
      return () => {
        if (interval) clearInterval(interval)
      }
    } else if (activeTab === 'health') {
      loadHealthStatus()
      const interval = setInterval(() => {
        loadHealthStatus()
      }, 10000) // Update every 10 seconds
      return () => {
        if (interval) clearInterval(interval)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Cleanup realtime interval
  useEffect(() => {
    return () => {
      if (realtimeInterval) {
        clearInterval(realtimeInterval)
      }
    }
  }, [realtimeInterval])

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
            onClick={async () => {
              setLoading(true)
              try {
                await Promise.all([
                  loadAnalytics(),
              loadBehaviorAnalytics()
                ])
              } catch (error) {
                console.error('Veri yenileme hatası:', error)
              } finally {
                setLoading(false)
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            Yenile
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-3 font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'general'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Genel Analitik</span>
        </button>
        <button
          onClick={() => setActiveTab('behavior')}
          className={`px-4 py-3 font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'behavior'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Davranış Analitiği</span>
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-4 py-3 font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'advanced'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Gelişmiş Analitik</span>
        </button>
        <button
          onClick={() => setActiveTab('predictive')}
          className={`px-4 py-3 font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'predictive'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>Tahminsel Analitik</span>
        </button>
        <button
          onClick={() => setActiveTab('realtime')}
          className={`px-4 py-3 font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'realtime'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Canlı Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-3 font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'health'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Sistem Sağlığı</span>
        </button>
        <button
          onClick={() => setActiveTab('user-based')}
          className={`px-4 py-3 font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'user-based'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Kullanıcı/Cihaz Analitiği</span>
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

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Müşteri Segmentleri</h3>
        {customerSegments && customerSegments.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {customerSegments.map((segment, index) => (
          <motion.div
            key={segment.segment}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
                className="bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-sm p-6 card-hover border border-slate-200 dark:border-slate-700"
          >
                <div className={`w-12 h-12 bg-gradient-to-br ${segment.color || 'from-blue-500 to-blue-600'} rounded-xl flex items-center justify-center mb-4`}>
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
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
        )}
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Dönüşüm Metrikleri</h3>
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
      </div>
      </>
      )}

      {activeTab === 'behavior' && (
        <>
          {/* Alt Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 mb-6">
            <button
              onClick={() => setBehaviorSubTab('interaction')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                behaviorSubTab === 'interaction'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Kullanıcı Etkileşimi
            </button>
            <button
              onClick={() => setBehaviorSubTab('product')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                behaviorSubTab === 'product'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Ürün & Sepet
            </button>
            <button
              onClick={() => setBehaviorSubTab('segmentation')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                behaviorSubTab === 'segmentation'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Kullanıcı Segmentasyonu
            </button>
            <button
              onClick={() => setBehaviorSubTab('performance')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                behaviorSubTab === 'performance'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Performans & Teknik
            </button>
            <button
              onClick={() => setBehaviorSubTab('marketing')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                behaviorSubTab === 'marketing'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Pazarlama & Güvenlik
            </button>
          </div>

          {/* Kullanıcı Etkileşimi Sekmesi */}
          {behaviorSubTab === 'interaction' && (
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
            </>
          )}

          {/* Ürün & Sepet Sekmesi */}
          {behaviorSubTab === 'product' && (
            <>
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
            </>
          )}

          {/* Kullanıcı Segmentasyonu Sekmesi */}
          {behaviorSubTab === 'segmentation' && (
            <>
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

          {/* 12. Oturum Analitiği */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
            </>
          )}

          {/* Performans & Teknik Sekmesi */}
          {behaviorSubTab === 'performance' && (
            <>
          {/* 11. Performans Ölçümleri */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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

          {/* 17. Cihaz Bilgileri */}
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

          {/* 17. Cihaz Bilgileri */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cihaz Bilgileri</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {deviceInfo.platforms && Object.keys(deviceInfo.platforms).length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Platformlar</p>
                  <div className="space-y-2 mt-2">
                    {Object.entries(deviceInfo.platforms).slice(0, 4).map(([platform, count]: [string, any]) => (
                      <div key={platform} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{platform}</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {deviceInfo.osVersions && Object.keys(deviceInfo.osVersions).length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">OS Versiyonları</p>
                  <div className="space-y-2 mt-2">
                    {Object.entries(deviceInfo.osVersions).slice(0, 4).map(([os, count]: [string, any]) => (
                      <div key={os} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{os}</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {deviceInfo.screenSizes && Object.keys(deviceInfo.screenSizes).length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ekran Boyutları</p>
                  <div className="space-y-2 mt-2">
                    {Object.entries(deviceInfo.screenSizes).slice(0, 4).map(([size, count]: [string, any]) => (
                      <div key={size} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{size}</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {deviceInfo.browsers && Object.keys(deviceInfo.browsers).length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tarayıcılar</p>
                  <div className="space-y-2 mt-2">
                    {Object.entries(deviceInfo.browsers).slice(0, 4).map(([browser, count]: [string, any]) => (
                      <div key={browser} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{browser}</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(!deviceInfo.platforms || Object.keys(deviceInfo.platforms || {}).length === 0) &&
             (!deviceInfo.osVersions || Object.keys(deviceInfo.osVersions || {}).length === 0) &&
             (!deviceInfo.screenSizes || Object.keys(deviceInfo.screenSizes || {}).length === 0) &&
             (!deviceInfo.browsers || Object.keys(deviceInfo.browsers || {}).length === 0) && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </motion.div>
            </>
          )}

          {/* Pazarlama & Güvenlik Sekmesi */}
          {behaviorSubTab === 'marketing' && (
            <>
          {/* 15. Kampanya Etkisi */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
            transition={{ delay: 0.2 }}
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

          {/* 18. Bildirim Analitiği */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Bildirim Analitiği</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Toplam Gönderim</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{notifications.totalSent || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Açılma Oranı</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {notifications.openRate || 0}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {notifications.totalOpened || 0} açıldı
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tıklama Oranı</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {notifications.clickRate || 0}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {notifications.totalClicks || 0} tıklama
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Reddedilme</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {notifications.totalDismissed || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {notifications.dismissRate || 0}% oran
                </p>
              </div>
            </div>
            {notifications.byType && Object.keys(notifications.byType).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Bildirim Türlerine Göre</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(notifications.byType).map(([type, data]: [string, any]) => (
                    <div key={type} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">{type}</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Gönderim</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{data.sent || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Açılma</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">{data.opened || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Tıklama</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{data.clicked || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!notifications.totalSent && !notifications.openRate && !notifications.clickRate) && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </motion.div>
            </>
          )}
        </>
      )}

      {/* Advanced Analytics Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {/* Sub-tabs for Advanced Analytics */}
          <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedCohort(null)}
              className={`px-4 py-2 font-medium transition-colors ${
                !selectedCohort
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Cohort Analizi
            </button>
            <button
              onClick={() => setSelectedCohort('funnel')}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedCohort === 'funnel'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Funnel Analizi
            </button>
            <button
              onClick={() => setSelectedCohort('geospatial')}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedCohort === 'geospatial'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Coğrafi Analiz
            </button>
          </div>

          {/* Cohort Analysis */}
          {!selectedCohort && (
            <div className="space-y-6">
              {cohortLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Cohort Analizi</h3>
                    {cohortData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={cohortData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="cohort" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="users" fill="#6366f1" />
                          <Bar dataKey="revenue" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">Veri yok</div>
                    )}
                  </div>

                  {cohortRetention.length > 0 && (
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Retention Rate</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={cohortRetention}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line type="monotone" dataKey="retention" stroke="#6366f1" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Funnel Analysis */}
          {selectedCohort === 'funnel' && (
            <div className="space-y-6">
              {funnelLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Funnel Analizi</h3>
                  {funnelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={funnelData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="step" type="category" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="users" fill="#6366f1" />
                        <Bar dataKey="conversion" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">Veri yok</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Geospatial Analysis */}
          {selectedCohort === 'geospatial' && (
            <div className="space-y-6">
              {geospatialLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Coğrafi Dağılım</h3>
                  {geospatialData && geospatialData.countries ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={geospatialData.countries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="country" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="users" fill="#6366f1" />
                        <Bar dataKey="sessions" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">Veri yok</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Predictive Analytics Tab */}
      {activeTab === 'predictive' && (
        <div className="space-y-6">
          {predictiveLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Churn Predictions */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Churn Risk Analizi</h3>
                </div>
                {predictiveData.churnPredictions.length > 0 ? (
                  <div className="space-y-3">
                    {predictiveData.churnPredictions.slice(0, 10).map((prediction: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            Kullanıcı ID: {prediction.userId}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Risk Skoru: {((prediction.riskScore || 0) * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg ${
                          (prediction.riskScore || 0) > 0.7 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : (prediction.riskScore || 0) > 0.4
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {(prediction.riskScore || 0) > 0.7 ? 'Yüksek Risk' : (prediction.riskScore || 0) > 0.4 ? 'Orta Risk' : 'Düşük Risk'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">Veri yok</div>
                )}
              </div>

              {/* Purchase Probabilities */}
              {predictiveData.purchaseProbabilities.length > 0 && (
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 mb-4">
                    <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Satın Alma Olasılığı</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={predictiveData.purchaseProbabilities.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="userId" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="probability" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Real-time Dashboard Tab */}
      {activeTab === 'realtime' && (
        <div className="space-y-6">
          {realtimeLoading && !realtimeMetrics ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : realtimeMetrics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Aktif Kullanıcılar</h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {realtimeMetrics.activeUsers || 0}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Son 5 dakika</p>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Aktif Oturumlar</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {realtimeMetrics.activeSessions || 0}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Şu anda</p>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Olay Hızı</h3>
                  </div>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {realtimeMetrics.eventsPerMinute || 0}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dakikada olay</p>
                </div>
              </div>

              {realtimeMetrics.liveFeed && realtimeMetrics.liveFeed.length > 0 && (
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Canlı Olay Akışı</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {realtimeMetrics.liveFeed.slice(0, 50).map((event: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{event.eventType}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {event.userId ? `Kullanıcı: ${event.userId}` : `Cihaz: ${event.deviceId?.substring(0, 8)}...`}
                          </p>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(event.timestamp).toLocaleTimeString('tr-TR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Zap className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-lg font-medium">Canlı veri yok</p>
            </div>
          )}
        </div>
      )}

      {/* System Health Tab */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {healthLoading && !healthStatus ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {healthStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-2 mb-4">
                      <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sistem Durumu</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Veritabanı</span>
                        <span className={`px-3 py-1 rounded-lg ${
                          healthStatus.database?.status === 'healthy'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {healthStatus.database?.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Redis</span>
                        <span className={`px-3 py-1 rounded-lg ${
                          healthStatus.redis?.status === 'healthy'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {healthStatus.redis?.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Event Queue</span>
                        <span className={`px-3 py-1 rounded-lg ${
                          healthStatus.queue?.status === 'healthy'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {healthStatus.queue?.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {healthMetrics && (
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center space-x-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sistem Metrikleri</h3>
                      </div>
                      <div className="space-y-3">
                        {healthMetrics.processingRate && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-400">İşleme Hızı</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {healthMetrics.processingRate} olay/sn
                            </span>
                          </div>
                        )}
                        {healthMetrics.queueSize !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Kuyruk Boyutu</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {healthMetrics.queueSize}
                            </span>
                          </div>
                        )}
                        {healthMetrics.cacheHitRate !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Cache Hit Rate</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {(healthMetrics.cacheHitRate * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!healthStatus && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Activity className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                  <p className="text-lg font-medium">Sistem durumu bilgisi mevcut değil</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'user-based' && (
        <>
          {/* View Mode Toggle */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Görünüm Modu</h3>
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => {
                    setViewMode('user')
                    setSelectedUserId(null)
                    setSelectedDeviceId(null)
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Kullanıcılar
                </button>
                <button
                  onClick={() => {
                    setViewMode('device')
                    setSelectedUserId(null)
                    setSelectedDeviceId(null)
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'device'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Cihazlar (Anonymous)
                </button>
              </div>
            </div>
          </div>

          {/* Kullanıcı/Cihaz Seçimi */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {viewMode === 'user' ? 'Kullanıcı Seçimi' : 'Cihaz Seçimi'}
              </h3>
              {(selectedUserId || selectedDeviceId) && (
                <button
                  onClick={() => {
                    setSelectedUserId(null)
                    setSelectedDeviceId(null)
                    setSelectedUser(null)
                    setSelectedDevice(null)
                  }}
                  className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Temizle</span>
                </button>
              )}
            </div>
            
            {viewMode === 'user' ? (
              usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Kullanıcı ara (isim, email, telefon)..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {users
                    .filter(user => {
                      if (!userSearchQuery) return true
                      const query = userSearchQuery.toLowerCase()
                      return (
                        user.name?.toLowerCase().includes(query) ||
                        user.email?.toLowerCase().includes(query) ||
                        user.phone?.toLowerCase().includes(query) ||
                        user.id?.toString().includes(query)
                      )
                    })
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedUserId === user.id
                            ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            selectedUserId === user.id
                              ? 'bg-blue-600 dark:bg-blue-500'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}>
                            <User className={`w-5 h-5 ${
                              selectedUserId === user.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate ${
                              selectedUserId === user.id
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-800 dark:text-slate-100'
                            }`}>
                              {user.name || 'İsimsiz Kullanıcı'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {user.email || user.phone || `ID: ${user.id}`}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
                
                {users.filter(user => {
                      if (!userSearchQuery) return true
                      const query = userSearchQuery.toLowerCase()
                      return (
                        user.name?.toLowerCase().includes(query) ||
                        user.email?.toLowerCase().includes(query) ||
                        user.phone?.toLowerCase().includes(query) ||
                        user.id?.toString().includes(query)
                      )
                    }).length === 0 && (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                        {userSearchQuery ? 'Kullanıcı bulunamadı' : 'Kullanıcı yok'}
                      </div>
                    )}
              </>
            )
            ) : (
              devicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cihaz ara (deviceId, platform, browser)..."
                      value={deviceSearchQuery}
                      onChange={(e) => setDeviceSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {devices
                      .filter(device => {
                        if (!deviceSearchQuery) return true
                        const query = deviceSearchQuery.toLowerCase()
                        return (
                          device.deviceId?.toLowerCase().includes(query) ||
                          device.platform?.toLowerCase().includes(query) ||
                          device.browser?.toLowerCase().includes(query) ||
                          device.userName?.toLowerCase().includes(query)
                        )
                      })
                      .map((device) => (
                        <button
                          key={device.deviceId}
                          onClick={() => setSelectedDeviceId(device.deviceId)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedDeviceId === device.deviceId
                              ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              selectedDeviceId === device.deviceId
                                ? 'bg-blue-600 dark:bg-blue-500'
                                : device.userId
                                ? 'bg-green-200 dark:bg-green-900/30'
                                : 'bg-slate-200 dark:bg-slate-700'
                            }`}>
                              {device.userId ? (
                                <User className={`w-5 h-5 ${
                                  selectedDeviceId === device.deviceId ? 'text-white' : 'text-green-600 dark:text-green-400'
                                }`} />
                              ) : (
                                <span className={`text-xs font-bold ${
                                  selectedDeviceId === device.deviceId ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                                }`}>A</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold truncate text-xs ${
                                selectedDeviceId === device.deviceId
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-800 dark:text-slate-100'
                              }`}>
                                {device.userName || 'Anonymous Device'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {device.platform} • {device.browser || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1">
                                {device.deviceId.substring(0, 20)}...
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                  
                  {devices.filter(device => {
                        if (!deviceSearchQuery) return true
                        const query = deviceSearchQuery.toLowerCase()
                        return (
                          device.deviceId?.toLowerCase().includes(query) ||
                          device.platform?.toLowerCase().includes(query) ||
                          device.browser?.toLowerCase().includes(query) ||
                          device.userName?.toLowerCase().includes(query)
                        )
                      }).length === 0 && (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                          {deviceSearchQuery ? 'Cihaz bulunamadı' : 'Cihaz yok'}
                        </div>
                      )}
                </>
              )
            )}
          </div>

          {/* Seçili Kullanıcı/Cihaz Analitik Verileri */}
          {(selectedUserId || selectedDeviceId) && (
            <>
              {(selectedUser || selectedDevice) && (
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-700 dark:to-purple-800 rounded-2xl shadow-lg p-6 text-white mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">
                        {viewMode === 'user' 
                          ? (selectedUser?.name || 'İsimsiz Kullanıcı')
                          : (selectedDevice?.userName || 'Anonymous Device')
                        }
                      </h3>
                      <p className="text-blue-100">
                        {viewMode === 'user'
                          ? (selectedUser?.email || selectedUser?.phone || `ID: ${selectedUser?.id}`)
                          : `${selectedDevice?.platform} • ${selectedDevice?.deviceId.substring(0, 30)}...`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-100">{viewMode === 'user' ? 'Kullanıcı ID' : 'Device ID'}</p>
                      <p className="text-2xl font-bold">
                        {viewMode === 'user' ? selectedUser?.id : selectedDevice?.deviceId.substring(0, 15) + '...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(userAnalyticsLoading || deviceAnalyticsLoading) ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  {/* Ekran Görüntüleme Süreleri */}
                  {userScreenViews.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-6"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ekran Görüntüleme Süreleri</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={userScreenViews.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                          <XAxis dataKey="screenName" stroke="#64748b" className="dark:stroke-slate-400" />
                          <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="avgDuration" fill="#6366f1" name="Ortalama Süre (ms)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}

                  {/* Scroll Derinliği */}
                  {userScrollDepth.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-6"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Scroll Derinliği</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={userScrollDepth.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                          <XAxis dataKey="screenName" stroke="#64748b" className="dark:stroke-slate-400" />
                          <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="avgMaxDepth" fill="#10b981" name="Ortalama Scroll %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}

                  {/* Navigasyon Yolları */}
                  {userNavigationPaths.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-6"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <Navigation className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sayfa Geçiş Yolları</h3>
                      </div>
                      <div className="space-y-2">
                        {userNavigationPaths.slice(0, 10).map((path, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{path.path}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{path.count} kullanım</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{path.percentage?.toFixed(1) || 0}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Ürün Etkileşimleri */}
                  {userProductInteractions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-6"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <MousePointer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ürün Etkileşimleri</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Toplam Görüntüleme</p>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            {userProductInteractions.reduce((sum, p) => sum + (p.totalViews || 0), 0)}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Süre</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatDuration(userProductInteractions.reduce((sum, p) => sum + (p.avgDuration || 0), 0) / Math.max(userProductInteractions.length, 1))}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Zoom</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {(userProductInteractions.reduce((sum, p) => sum + parseFloat(p.avgZoomPerView || 0), 0) / Math.max(userProductInteractions.length, 1)).toFixed(1)}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ürün Sayısı</p>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {userProductInteractions.length}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Sepet Davranışı */}
                  {Object.keys(userCartBehavior).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-6"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sepet Davranışı</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sepete Ekleme</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{userCartBehavior.totalAdds || 0}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sepetten Çıkarma</p>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{userCartBehavior.totalRemoves || 0}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Beden Değiştirme</p>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userCartBehavior.totalSizeChanges || 0}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Sepet Doluluk</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userCartBehavior.avgCartItemCount || 0}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Oturum Bilgileri */}
                  {Object.keys(userSessions).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-6"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Oturum Bilgileri</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Toplam Oturum</p>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{userSessions.totalSessions || 0}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Oturum Süresi</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatDuration(parseFloat(userSessions.avgSessionDuration || 0))}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Sayfa Sayısı</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {parseFloat(userSessions.avgPageCount || 0).toFixed(1)}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ort. Scroll Derinliği</p>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {parseFloat(userSessions.avgScrollDepth || 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Cihaz Bilgileri */}
                  {Object.keys(userDeviceInfo).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-6"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cihaz Bilgileri</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {userDeviceInfo.platform && (
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Platform</p>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{userDeviceInfo.platform}</p>
                          </div>
                        )}
                        {userDeviceInfo.osVersion && (
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">OS Versiyonu</p>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{userDeviceInfo.osVersion}</p>
                          </div>
                        )}
                        {userDeviceInfo.screenSize && (
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ekran Boyutu</p>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{userDeviceInfo.screenSize}</p>
                          </div>
                        )}
                        {userDeviceInfo.browser && (
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tarayıcı</p>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{userDeviceInfo.browser}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Veri Yok Mesajı */}
                  {userScreenViews.length === 0 &&
                   userScrollDepth.length === 0 &&
                   userNavigationPaths.length === 0 &&
                   userProductInteractions.length === 0 &&
                   Object.keys(userCartBehavior).length === 0 &&
                   Object.keys(userSessions).length === 0 &&
                   Object.keys(userDeviceInfo).length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <User className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                      <p className="text-lg font-medium">Bu kullanıcı için analitik verisi bulunmuyor</p>
                      <p className="text-sm mt-2">Kullanıcı henüz aktivite gerçekleştirmemiş olabilir</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!selectedUserId && !selectedDeviceId && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <User className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-lg font-medium">
                {viewMode === 'user' ? 'Kullanıcı seçin' : 'Cihaz seçin'}
              </p>
              <p className="text-sm mt-2">
                Analitik verilerini görmek için yukarıdan {viewMode === 'user' ? 'bir kullanıcı' : 'bir cihaz'} seçin
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
