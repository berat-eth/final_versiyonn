'use client'

import { useEffect, useState } from 'react'
import { User, Search, Filter, TrendingUp, Tag, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function UserProfiles() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.get<any>('/admin/user-profiles', { limit: 100, offset: 0 })
        if (alive && (res as any)?.success && Array.isArray((res as any).data)) {
          setProfiles((res as any).data)
        }
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kullanıcı Profilleri</h2>
          <p className="text-slate-500 mt-1">Kullanıcı tercihlerini ve davranışlarını görüntüleyin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Profil ara..."
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles
            .filter(p => !searchTerm || String(p.userName||'').toLowerCase().includes(searchTerm.toLowerCase()))
            .map((profile: any, index) => (
            <motion.div
              key={profile.userId || profile.id || index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {profile.userName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{profile.userName}</h3>
                  <p className="text-xs text-slate-500">Son aktif: {profile.lastActive || '-'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1 flex items-center">
                    <Tag className="w-3 h-3 mr-1" />
                    İlgi Alanları
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(profile.interests||[]).map((interest: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Tercih Edilen Markalar</p>
                  <div className="flex flex-wrap gap-1">
                    {(profile.brandPreferences||[]).map((brand: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs">
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Fiyat Aralığı</p>
                    <p className="font-semibold text-slate-800 text-sm">₺{profile.avgPriceMin ?? 0} - ₺{profile.avgPriceMax ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">İndirim İlgisi</p>
                    <p className="font-semibold text-green-600 text-sm">%{(Number(profile.discountAffinity||0) * 100).toFixed(0)}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">Toplam Etkinlik</p>
                  <p className="font-bold text-slate-800">{profile.totalEvents ?? 0}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
