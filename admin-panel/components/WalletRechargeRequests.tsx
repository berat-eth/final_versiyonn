'use client'

import { useState } from 'react'
import { Wallet, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function WalletRechargeRequests() {
  const [requests, setRequests] = useState([
    { id: 'REQ-001', userName: 'Ahmet Yılmaz', amount: 500.00, paymentMethod: 'card', status: 'pending', createdAt: '2024-01-15 14:30' },
    { id: 'REQ-002', userName: 'Ayşe Demir', amount: 1000.00, paymentMethod: 'bank_transfer', status: 'completed', createdAt: '2024-01-14 10:20' },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'pending_approval': return 'bg-orange-100 text-orange-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'cancelled': return 'bg-slate-100 text-slate-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'pending_approval': return <Clock className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Bakiye Yükleme Talepleri</h2>
          <p className="text-slate-500 mt-1">Cüzdan yükleme taleplerini yönetin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Talep ara..."
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
          {requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800">{request.userName}</h3>
                    <p className="text-sm text-slate-500">Talep ID: {request.id}</p>
                    <p className="text-xs text-slate-400">{request.createdAt}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-800">₺{request.amount.toFixed(2)}</p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 w-fit ml-auto ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    <span>{request.status}</span>
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{request.paymentMethod}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
