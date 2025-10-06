'use client'

import { useState } from 'react'
import { Briefcase, DollarSign, Calendar, CheckCircle, Clock, Search } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CRMDeals() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [deals] = useState<any[]>([])

  const statusColors = {
    'Aktif': 'bg-blue-100 text-blue-700 border-blue-200',
    'Müzakere': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Kazanıldı': 'bg-green-100 text-green-700 border-green-200',
    'Kaybedildi': 'bg-red-100 text-red-700 border-red-200',
  }

  // İstatistik kartları kaldırıldı (mock)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Anlaşmalar</h2>
          <p className="text-slate-500 mt-1">Tüm anlaşmalarınızı yönetin</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium">
          Yeni Anlaşma Ekle
        </button>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Anlaşma ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Anlaşma</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Şirket</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Değer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Kapanış</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Sorumlu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map((deal, index) => (
                <motion.tr
                  key={deal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{deal.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600">{deal.company}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-green-600">₺{deal.value.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border ${statusColors[deal.status as keyof typeof statusColors]}`}>
                      {deal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {deal.closeDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600">{deal.owner}</p>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
