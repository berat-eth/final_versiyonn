'use client'

import { useState } from 'react'
import { MapPin, Search, Filter, Edit2, Trash2, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

export default function UserAddresses() {
  const [addresses, setAddresses] = useState([
    { id: 1, userName: 'Ahmet Yılmaz', addressType: 'shipping', fullName: 'Ahmet Yılmaz', phone: '0532 123 4567', city: 'İstanbul', district: 'Kadıköy', address: 'Moda Cad. No:123', isDefault: true },
    { id: 2, userName: 'Ayşe Demir', addressType: 'billing', fullName: 'Ayşe Demir', phone: '0533 987 6543', city: 'Ankara', district: 'Çankaya', address: 'Kızılay Mah. No:45', isDefault: false },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kullanıcı Adresleri</h2>
          <p className="text-slate-500 mt-1">Müşteri adreslerini görüntüleyin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Adres ara..."
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address, index) => (
            <motion.div
              key={address.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-800">{address.fullName}</h3>
                </div>
                {address.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                    Varsayılan
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mb-1">{address.phone}</p>
              <p className="text-sm text-slate-600 mb-1">{address.address}</p>
              <p className="text-sm text-slate-600">{address.district}, {address.city}</p>
              <div className="flex items-center space-x-2 mt-3">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  address.addressType === 'shipping' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {address.addressType === 'shipping' ? 'Teslimat' : 'Fatura'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
