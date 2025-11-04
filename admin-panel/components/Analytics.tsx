'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, ShoppingBag, DollarSign, ArrowUp, ArrowDown, Calendar, Loader2 } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { motion } from 'framer-motion'
import { useTheme } from '@/lib/ThemeContext'
import { analyticsService } from '@/lib/services/analyticsService'

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

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

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
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
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
            onClick={loadAnalytics}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            Yenile
          </button>
        </div>
      </div>

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
    </div>
  )
}
