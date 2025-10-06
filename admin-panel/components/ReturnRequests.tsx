'use client'

import { useState } from 'react'
import { RotateCcw, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ReturnRequests() {
  const [returns, setReturns] = useState([
    { id: 1, orderId: 'ORD-001', customerName: 'Ahmet Yılmaz', reason: 'Ürün hasarlı', status: 'pending', refundAmount: 250.00, requestDate: '2024-01-15' },
    { id: 2, orderId: 'ORD-002', customerName: 'Ayşe Demir', reason: 'Yanlış ürün', status: 'approved', refundAmount: 180.00, requestDate: '2024-01-14' },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'completed': return 'bg-blue-100 text-blue-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">İade Talepleri</h2>
          <p className="text-slate-500 mt-1">Müşteri iade taleplerini yönetin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="İade ara..."
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
          {returns.map((returnReq, index) => (
            <motion.div
              key={returnReq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <RotateCcw className="w-5 h-5 text-orange-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800">{returnReq.customerName}</h3>
                    <p className="text-sm text-slate-500">Sipariş: {returnReq.orderId}</p>
                    <p className="text-sm text-slate-600 mt-1">Sebep: {returnReq.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">₺{returnReq.refundAmount.toFixed(2)}</p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(returnReq.status)}`}>
                    {returnReq.status}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{returnReq.requestDate}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
