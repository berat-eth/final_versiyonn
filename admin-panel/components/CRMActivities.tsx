'use client'

import { useEffect, useState } from 'react'
import { Calendar, Phone, Mail, Users, Clock, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CRMActivities() {
  // Backend entegrasyonu
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const typeIcons = {
    'Toplantı': Users,
    'Arama': Phone,
    'E-posta': Mail,
  }

  const typeColors = {
    'Toplantı': 'from-blue-500 to-blue-600',
    'Arama': 'from-green-500 to-green-600',
    'E-posta': 'from-purple-500 to-purple-600',
  }

  // İstatistik kartları kaldırıldı (mock)

  useEffect(() => {
    let alive = true
    ;(async()=>{
      try {
        setLoading(true)
        setError(null)
        const res: any = await (await import('../lib/services/crmService')).crmService.getActivities({ page: 1, limit: 50 })
        if (alive && res?.success && Array.isArray(res.data)) {
          setActivities(res.data)
        } else {
          setActivities([])
        }
      } catch (e:any) {
        setError(e?.message || 'Aktiviteler yüklenemedi')
        setActivities([])
      } finally { setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Aktiviteler</h2>
          <p className="text-slate-500 mt-1">Müşteri aktivitelerinizi takip edin</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium">
          Yeni Aktivite Ekle
        </button>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {loading && <div className="text-slate-500">Yükleniyor...</div>}
        {error && <div className="text-red-600">{error}</div>}
        <h3 className="text-xl font-bold text-slate-800 mb-6">Son Aktiviteler</h3>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = typeIcons[activity.type as keyof typeof typeIcons]
            const colorClass = typeColors[activity.type as keyof typeof typeColors]
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-4 p-4 bg-slate-50 rounded-xl hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-800">{activity.title}</h4>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      activity.status === 'Tamamlandı' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{activity.contact}</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {activity.date}
                    </span>
                    <span>{activity.notes}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
