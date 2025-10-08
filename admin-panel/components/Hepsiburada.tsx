'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ShoppingCart, Package, BarChart3, Settings, Wand2, RefreshCw, TrendingUp, DollarSign, Users } from 'lucide-react'
import { api } from '@/lib/api'

export default function Hepsiburada() {
  const [open, setOpen] = useState<{ visible: boolean, title: string | null }>({ visible: false, title: null })
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    loading: true
  })

  useEffect(() => {
    // Hepsiburada istatistiklerini çek
    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true }))
        // TODO: Gerçek API entegrasyonu
        // const response = await api.get('/integrations/hepsiburada/stats')
        // setStats(response.data)
        
        // Örnek veri
        setTimeout(() => {
          setStats({
            totalProducts: 1250,
            totalOrders: 89,
            totalRevenue: 45680,
            activeCustomers: 234,
            loading: false
          })
        }, 1000)
      } catch (error) {
        console.error('Hepsiburada stats fetch error:', error)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }
    
    fetchStats()
  }, [])

  const actions = [
    { id: 'orders', title: 'Gelen Siparişler', icon: ShoppingCart, color: 'from-amber-500 to-amber-600' },
    { id: 'products', title: 'Ürünler', icon: Package, color: 'from-emerald-500 to-emerald-600' },
    { id: 'analytics', title: 'Analitik', icon: BarChart3, color: 'from-indigo-500 to-indigo-600' },
    { id: 'settings', title: 'Ayarlar', icon: Settings, color: 'from-slate-500 to-slate-600' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Hepsiburada</h1>
          <p className="text-slate-600 mt-1">Sade ve modern arayüz – geliştirme aşamasında</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700">
          <Wand2 className="w-4 h-4" />
          <span className="text-sm font-medium">Yeni Tasarım</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setOpen({ visible: true, title: a.title })}
            className={`group w-full rounded-xl p-5 text-left bg-gradient-to-br ${a.color} text-white shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <a.icon className="w-7 h-7 opacity-90" />
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-semibold">{a.title}</h3>
              <p className="text-white/80 text-xs mt-1">Tıkla ve uyarıyı gör</p>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Bu modül geliştirme aşamasında</h2>
        <p className="text-slate-600 mt-2">Tam fonksiyonellik yakında eklenecek. Şimdilik arayüz önizlemesini görmek için kartlara tıklayabilirsiniz.</p>
      </div>

      {open.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen({ visible: false, title: null })}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{open.title} – Geliştirme Aşamasında</h3>
                <p className="text-slate-600 mt-1">Bu bölüm üzerinde çalışıyoruz. Yakında aktif olacak.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setOpen({ visible: false, title: null })} className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm font-medium">Tamam</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
