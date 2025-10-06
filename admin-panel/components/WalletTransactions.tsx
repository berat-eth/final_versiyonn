'use client'

import { useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Search, Filter } from 'lucide-react'
import { motion } from 'framer-motion'

export default function WalletTransactions() {
  const [transactions, setTransactions] = useState([
    { id: 1, userId: 1, userName: 'Ahmet Yılmaz', type: 'credit', amount: 500.00, description: 'Bakiye yükleme', createdAt: '2024-01-15 14:30' },
    { id: 2, userId: 1, userName: 'Ahmet Yılmaz', type: 'debit', amount: 150.00, description: 'Sipariş ödemesi', createdAt: '2024-01-15 15:45' },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Cüzdan İşlemleri</h2>
          <p className="text-slate-500 mt-1">Tüm cüzdan hareketlerini görüntüleyin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="İşlem ara..."
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
          {transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {transaction.type === 'credit' ? (
                    <ArrowUpCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-800">{transaction.userName}</h3>
                    <p className="text-sm text-slate-500">{transaction.description}</p>
                    <p className="text-xs text-slate-400">{transaction.createdAt}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'credit' ? '+' : '-'}₺{transaction.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
