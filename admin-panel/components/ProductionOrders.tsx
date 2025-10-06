'use client'

import { useState } from 'react'
import { ClipboardList, Package, Calendar, User, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProductionOrders() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [orders] = useState<any[]>([])

  const statusColors = {
    'Başlamadı': 'bg-slate-100 text-slate-700',
    'Devam Ediyor': 'bg-blue-100 text-blue-700',
    'Tamamlandı': 'bg-green-100 text-green-700',
    'Gecikmiş': 'bg-red-100 text-red-700',
  }

  // İstatistik kartları kaldırıldı (mock)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Üretim Emirleri</h2>
          <p className="text-slate-500 mt-1">Üretim emirlerini takip edin</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium">
          Yeni Emir Oluştur
        </button>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Aktif Üretim Emirleri</h3>
        <div className="space-y-4">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-mono text-sm font-bold">
                      {order.id}
                    </span>
                    <h4 className="text-lg font-bold text-slate-800">{order.product}</h4>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                    <span className="flex items-center">
                      <Package className="w-4 h-4 mr-1" />
                      {order.quantity} Adet
                    </span>
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {order.assignedTo}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {order.startDate} - {order.dueDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-xs">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${order.completion === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${order.completion}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{order.completion}%</span>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                  {order.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
