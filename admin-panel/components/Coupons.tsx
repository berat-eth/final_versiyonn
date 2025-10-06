'use client'

import { useState } from 'react'
import { Ticket, Plus, Copy, Trash2, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

interface Coupon {
  id: number
  code: string
  discount: string
  type: 'percentage' | 'fixed'
  minAmount: number
  maxUses: number
  used: number
  validUntil: string
  active: boolean
}

export default function Coupons() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [coupons, setCoupons] = useState<Coupon[]>([])

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code)
    alert(`Kupon kodu kopyalandı: ${code}`)
  }

  const deleteCoupon = (id: number) => {
    if (confirm('Bu kuponu silmek istediğinizden emin misiniz?')) {
      setCoupons(coupons.filter(c => c.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kupon & İndirim Kodları</h2>
          <p className="text-slate-500 mt-1">İndirim kuponlarını yönetin</p>
        </div>
        <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg">
          <Plus className="w-5 h-5 mr-2" />
          Yeni Kupon
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Aktif Kupon</p>
          <p className="text-3xl font-bold text-green-600">{coupons.filter(c => c.active).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Kullanım</p>
          <p className="text-3xl font-bold text-blue-600">{coupons.reduce((sum, c) => sum + c.used, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Kullanım Oranı</p>
          <p className="text-3xl font-bold text-purple-600">
            {coupons.length > 0 ? ((coupons.reduce((sum, c) => sum + c.used, 0) / coupons.reduce((sum, c) => sum + c.maxUses, 0)) * 100).toFixed(1) : '0.0'}%
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Tahmini İndirim</p>
          <p className="text-3xl font-bold text-orange-600">₺0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon, index) => (
          <motion.div
            key={coupon.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <Ticket className="w-8 h-8" />
                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  coupon.active ? 'bg-green-400 text-green-900' : 'bg-slate-400 text-slate-900'
                }`}>
                  {coupon.active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-3xl font-bold tracking-wider">{coupon.code}</p>
                  <button
                    onClick={() => copyCoupon(coupon.code)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-2xl font-bold">
                  {coupon.type === 'percentage' ? `%${coupon.discount}` : `₺${coupon.discount}`} İndirim
                </p>
              </div>
              <div className="space-y-2 text-sm opacity-90 mb-4">
                <p>💰 Min. Tutar: ₺{coupon.minAmount}</p>
                <p>📊 Kullanım: {coupon.used} / {coupon.maxUses}</p>
                <p>📅 Geçerlilik: {coupon.validUntil}</p>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                <div
                  className="bg-white h-2 rounded-full"
                  style={{ width: `${(coupon.used / coupon.maxUses) * 100}%` }}
                ></div>
              </div>
              <button
                onClick={() => deleteCoupon(coupon.id)}
                className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Sil
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
