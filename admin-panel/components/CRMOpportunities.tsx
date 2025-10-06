'use client'

import { useEffect, useState } from 'react'
import { Target, TrendingUp, DollarSign, Calendar, Search } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CRMOpportunities() {
  // Backend entegrasyonu
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // İstatistik kartları kaldırıldı (mock)

  useEffect(() => {
    let alive = true
    ;(async()=>{
      try {
        setLoading(true)
        setError(null)
        const res: any = await (await import('../lib/services/crmService')).crmService.getOpportunities({ page: 1, limit: 50 })
        if (alive && res?.success && Array.isArray(res.data)) {
          setOpportunities(res.data)
        } else {
          setOpportunities([])
        }
      } catch (e:any) {
        setError(e?.message || 'Fırsatlar yüklenemedi')
        setOpportunities([])
      } finally { setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Satış Fırsatları</h2>
          <p className="text-slate-500 mt-1">Fırsatlarınızı takip edin ve yönetin</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium">
          Yeni Fırsat Ekle
        </button>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {loading && <div className="text-slate-500">Yükleniyor...</div>}
        {error && <div className="text-red-600">{error}</div>}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Fırsat ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          {opportunities.map((opp, index) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{opp.name}</h3>
                  <p className="text-sm text-slate-600 mb-3">{opp.company}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">{opp.stage}</span>
                    <span className="text-slate-600">Olasılık: {opp.probability}%</span>
                    <span className="text-slate-600 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {opp.closeDate}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">₺{opp.value.toLocaleString()}</p>
                  <button className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow text-sm">
                    Detay
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
