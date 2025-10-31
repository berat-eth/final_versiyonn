'use client'

import { useState } from 'react'
import { Disc, Search, Filter, Gift } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DiscountWheelSpins() {
  const [spins, setSpins] = useState([
    { id: 1, userName: 'Ahmet Yılmaz', spinResult: '10', discountCode: 'SPIN10-ABC', isUsed: false, expiresAt: '2024-12-31', createdAt: '2024-01-15' },
    { id: 2, userName: 'Ayşe Demir', spinResult: '5', discountCode: 'SPIN5-XYZ', isUsed: true, expiresAt: '2024-12-31', createdAt: '2024-01-14' },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Çarkıfelek Çevirmeleri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">İndirim çarkı sonuçlarını görüntüleyin</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Çevirme ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <button className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-300 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
        </div>

        <div className="space-y-3">
          {spins.map((spin, index) => (
            <motion.div
              key={spin.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-shadow bg-white dark:bg-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Disc className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{spin.userName}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Kod: {spin.discountCode}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{spin.createdAt}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">%{spin.spinResult}</p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    spin.isUsed ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  }`}>
                    {spin.isUsed ? 'Kullanıldı' : 'Aktif'}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Son: {spin.expiresAt}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
