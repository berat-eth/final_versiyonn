'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Users, DollarSign, ShoppingCart, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { api } from '@/lib/api'

export default function CustomerAnalytics() {
  const [analytics, setAnalytics] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const [top, monthly] = await Promise.all([
          api.get<any>('/admin/analytics/top-customers').catch(() => null),
          api.get<any>('/admin/analytics/orders-monthly').catch(() => null)
        ])
        if (alive && top && (top as any).success && Array.isArray((top as any).data)) setAnalytics((top as any).data)
        if (alive && monthly && (monthly as any).success && Array.isArray((monthly as any).data)) setChartData((monthly as any).data)
      } catch (e: any) {
        setError(e?.message || 'Analitik verileri getirilemedi')
      } finally {
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Müşteri Analitiği</h2>
          <p className="text-slate-500 mt-1">Müşteri davranışlarını ve metriklerini analiz edin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <Users className="w-8 h-8 mb-3" />
          <p className="text-blue-100 text-sm">Toplam Müşteri</p>
          <p className="text-3xl font-bold">{analytics.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <ShoppingCart className="w-8 h-8 mb-3" />
          <p className="text-green-100 text-sm">Toplam Sipariş</p>
          <p className="text-3xl font-bold">{Array.isArray(chartData) ? chartData.reduce((s:any,m:any)=> s + (Number(m.orders)||0), 0) : 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <DollarSign className="w-8 h-8 mb-3" />
          <p className="text-purple-100 text-sm">Toplam Gelir</p>
          <p className="text-3xl font-bold">₺{Array.isArray(chartData) ? Number(chartData.reduce((s:any,m:any)=> s + (Number(m.revenue)||0), 0)).toLocaleString('tr-TR') : 0}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <TrendingUp className="w-8 h-8 mb-3" />
          <p className="text-orange-100 text-sm">Ort. Sipariş Değeri</p>
          <p className="text-3xl font-bold">₺{(() => { const o = Array.isArray(chartData) ? chartData.reduce((s:any,m:any)=> s + (Number(m.orders)||0), 0) : 0; const r = Array.isArray(chartData) ? chartData.reduce((s:any,m:any)=> s + (Number(m.revenue)||0), 0) : 0; return o>0 ? (r/o).toFixed(0) : '0'; })()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Aylık Sipariş Trendi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Aylık Gelir Trendi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Müşteri Detayları</h3>
        <div className="space-y-3">
          {analytics.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">{customer.userName}</h3>
                <span className="text-xs text-slate-500">Son sipariş: {customer.lastOrderDate}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Sipariş</p>
                  <p className="font-bold text-slate-800">{customer.totalOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Toplam Harcama</p>
                  <p className="font-bold text-green-600">₺{customer.totalSpent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ort. Sipariş</p>
                  <p className="font-bold text-blue-600">₺{customer.averageOrderValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Yaşam Boyu Değer</p>
                  <p className="font-bold text-purple-600">₺{customer.customerLifetimeValue.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
