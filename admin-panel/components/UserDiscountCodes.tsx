'use client'

import { useState } from 'react'
import { Ticket, Search, Filter, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

export default function UserDiscountCodes() {
  const [codes, setCodes] = useState([
    { id: 1, userName: 'Ahmet Yılmaz', discountCode: 'WELCOME10', discountType: 'percentage', discountValue: 10, isUsed: false, expiresAt: '2024-12-31' },
    { id: 2, userName: 'Ayşe Demir', discountCode: 'SAVE50', discountType: 'fixed', discountValue: 50, isUsed: true, expiresAt: '2024-12-31' },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kullanıcı İndirim Kodları</h2>
          <p className="text-slate-500 mt-1">Kullanıcıya özel indirim kodlarını yönetin</p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Yeni Kod</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Kod ara..."
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
          {codes.map((code, index) => (
            <motion.div
              key={code.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Ticket className="w-5 h-5 text-orange-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800">{code.userName}</h3>
                    <p className="text-sm text-slate-500">Kod: {code.discountCode}</p>
                    <p className="text-xs text-slate-400">Son kullanma: {code.expiresAt}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-orange-600">
                    {code.discountType === 'percentage' ? `%${code.discountValue}` : `₺${code.discountValue}`}
                  </p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    code.isUsed ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {code.isUsed ? 'Kullanıldı' : 'Aktif'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
