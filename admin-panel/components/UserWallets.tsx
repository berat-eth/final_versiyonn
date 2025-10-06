'use client'

import { useState } from 'react'
import { Wallet, Search, Filter, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'

export default function UserWallets() {
  const [wallets, setWallets] = useState([
    { id: 1, userId: 1, userName: 'Ahmet Yılmaz', balance: 1250.50, currency: 'TRY', lastTransaction: '2024-01-15' },
    { id: 2, userId: 2, userName: 'Ayşe Demir', balance: 850.00, currency: 'TRY', lastTransaction: '2024-01-14' },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kullanıcı Cüzdanları</h2>
          <p className="text-slate-500 mt-1">Müşteri bakiyelerini görüntüleyin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <Wallet className="w-8 h-8 mb-3" />
          <p className="text-blue-100 text-sm">Toplam Bakiye</p>
          <p className="text-3xl font-bold">₺2,100.50</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <TrendingUp className="w-8 h-8 mb-3" />
          <p className="text-green-100 text-sm">Toplam Yükleme</p>
          <p className="text-3xl font-bold">₺5,450.00</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <TrendingDown className="w-8 h-8 mb-3" />
          <p className="text-orange-100 text-sm">Toplam Harcama</p>
          <p className="text-3xl font-bold">₺3,349.50</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cüzdan ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          {wallets.map((wallet, index) => (
            <motion.div
              key={wallet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800">{wallet.userName}</h3>
                    <p className="text-sm text-slate-500">Son işlem: {wallet.lastTransaction}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800">₺{wallet.balance.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{wallet.currency}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
