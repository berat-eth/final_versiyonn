'use client'

import { Search, Bell, Mail, User } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ürün, sipariş veya müşteri ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4 ml-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-6 h-6 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Mail className="w-6 h-6 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          </motion.button>

          <div className="h-8 w-px bg-slate-200"></div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">Admin User</p>
              <p className="text-xs text-slate-500">Yönetici</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:shadow-lg transition-shadow">
              AY
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
