'use client'

import { useState } from 'react'
import { PackageCheck, TrendingUp, Activity, AlertTriangle, Factory } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProductionTracking() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [tracking] = useState<any[]>([])

  // İstatistik kartları kaldırıldı (mock)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Üretim Takibi</h2>
          <p className="text-slate-500 mt-1">Gerçek zamanlı üretim verilerini izleyin</p>
        </div>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Canlı Üretim Durumu</h3>
        <div className="space-y-4">
          {tracking.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-1">{item.factory}</h4>
                  <p className="text-sm text-slate-600">{item.product}</p>
                </div>
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  item.status === 'Normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {item.status === 'Normal' ? '✓ Normal' : '⚠ Düşük Verim'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Mevcut Üretim</p>
                  <p className="text-xl font-bold text-blue-700">{item.currentOutput}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 mb-1">Hedef</p>
                  <p className="text-xl font-bold text-green-700">{item.targetOutput}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 mb-1">Verimlilik</p>
                  <p className="text-xl font-bold text-purple-700">{item.efficiency}%</p>
                </div>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${item.efficiency >= 80 ? 'bg-green-500' : item.efficiency >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(item.currentOutput / item.targetOutput) * 100}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
