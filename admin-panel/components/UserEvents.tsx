'use client'

import { useEffect, useState } from 'react'
import { Activity, Search, Filter, Eye, MousePointer, ShoppingCart, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function UserEvents() {
  const [events, setEvents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      try{
        setLoading(true)
        setError(null)
        const res = await api.get<any>('/admin/user-events')
        if (alive && (res as any)?.success && Array.isArray((res as any).data)) setEvents((res as any).data)
        else setEvents([])
      } catch (e:any) {
        setError(e?.message || 'Etkinlikler getirilemedi')
        // fallback: boş bırak
        setEvents([])
      } finally { setLoading(false) }
    })()
    return ()=>{ alive = false }
  }, [])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'view': return <Eye className="w-4 h-4" />
      case 'click': return <MousePointer className="w-4 h-4" />
      case 'add_to_cart': return <ShoppingCart className="w-4 h-4" />
      case 'purchase': return <ShoppingCart className="w-4 h-4" />
      case 'favorite': return <Heart className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'view': return 'bg-blue-100 text-blue-700'
      case 'click': return 'bg-purple-100 text-purple-700'
      case 'add_to_cart': return 'bg-orange-100 text-orange-700'
      case 'purchase': return 'bg-green-100 text-green-700'
      case 'favorite': return 'bg-pink-100 text-pink-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kullanıcı Etkinlikleri</h2>
          <p className="text-slate-500 mt-1">Kullanıcı davranışlarını izleyin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Etkinlik ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
        </div>

        <div className="space-y-3">
          {loading && <div className="text-slate-500 text-sm">Yükleniyor...</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${getEventColor(event.eventType)}`}>
                    {getEventIcon(event.eventType)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{event.userName}</h3>
                    <p className="text-sm text-slate-500">{event.productName}</p>
                    <p className="text-xs text-slate-400">{event.createdAt}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getEventColor(event.eventType)}`}>
                  {event.eventType}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
