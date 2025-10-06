'use client'

import { Crown, Plus, Clock, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Premium() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const orders: any[] = []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Özel Üretim</h2>
          <p className="text-slate-500 mt-1">Kişiye özel ürün siparişlerini yönetin</p>
        </div>
        <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg">
          <Plus className="w-5 h-5 mr-2" />
          Yeni Sipariş
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Sipariş</p>
          <p className="text-3xl font-bold text-yellow-600">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Devam Eden</p>
          <p className="text-3xl font-bold text-blue-600">{orders.filter((o: any) => o.status === 'in-progress').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Tamamlanan</p>
          <p className="text-3xl font-bold text-green-600">{orders.filter((o: any) => o.status === 'completed').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Gelir</p>
          <p className="text-3xl font-bold text-purple-600">
            ₺{orders.reduce((sum: number, o: any) => sum + o.price, 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ürün</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Fiyat</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Crown className="w-5 h-5 text-yellow-600" />
                      <span className="font-semibold text-slate-800">{order.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{order.product}</td>
                  <td className="px-6 py-4 font-bold text-green-600">₺{order.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-600">{order.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                      {order.status === 'completed' ? 'Tamamlandı' :
                        order.status === 'in-progress' ? 'Devam Ediyor' : 'Bekliyor'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-lg text-sm font-medium">
                      Detay
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
