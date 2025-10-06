'use client'

import { useState } from 'react'
import { CreditCard, Search, Filter, Download, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function PaymentTransactions() {
  const [transactions, setTransactions] = useState([
    { id: 1, orderId: 'ORD-001', paymentId: 'PAY-12345', provider: 'iyzico', amount: 1250.00, status: 'success', createdAt: '2024-01-15 14:30' },
    { id: 2, orderId: 'ORD-002', paymentId: 'PAY-12346', provider: 'iyzico', amount: 850.00, status: 'pending', createdAt: '2024-01-15 15:45' },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Ödeme İşlemleri</h2>
          <p className="text-slate-500 mt-1">Tüm ödeme işlemlerini görüntüleyin</p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Rapor İndir</span>
        </button>
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">İşlem ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Sipariş</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Sağlayıcı</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Tutar</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Durum</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-slate-800">{transaction.paymentId}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{transaction.orderId}</td>
                  <td className="py-3 px-4 text-slate-600">{transaction.provider}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">₺{transaction.amount.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 w-fit ${getStatusColor(transaction.status)}`}>
                      {getStatusIcon(transaction.status)}
                      <span>{transaction.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{transaction.createdAt}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
