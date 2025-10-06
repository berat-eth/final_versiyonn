'use client'

import { useState } from 'react'
import { Factory, Package, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, Plus, Search, Filter, Edit, Trash2, ClipboardList, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ProductionPlan {
  id: number
  productName: string
  productCode: string
  plannedQuantity: number
  producedQuantity: number
  unit: string
  startDate: string
  endDate: string
  status: 'Planlandı' | 'Üretimde' | 'Tamamlandı' | 'Gecikmiş'
  priority: 'Düşük' | 'Orta' | 'Yüksek' | 'Acil'
  factory: string
  notes: string
}

export default function ProductionPlanning() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [plans, setPlans] = useState<ProductionPlan[]>([])

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ProductionPlan | null>(null)

  const statusColors = {
    'Planlandı': 'bg-blue-100 text-blue-700 border-blue-200',
    'Üretimde': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Tamamlandı': 'bg-green-100 text-green-700 border-green-200',
    'Gecikmiş': 'bg-red-100 text-red-700 border-red-200',
  }

  const priorityColors = {
    'Düşük': 'bg-slate-100 text-slate-700',
    'Orta': 'bg-blue-100 text-blue-700',
    'Yüksek': 'bg-orange-100 text-orange-700',
    'Acil': 'bg-red-100 text-red-700',
  }

  const statusIcons = {
    'Planlandı': Clock,
    'Üretimde': Factory,
    'Tamamlandı': CheckCircle,
    'Gecikmiş': AlertCircle,
  }

  // İstatistik kartları kaldırıldı (mock)

  const getProgressPercentage = (plan: ProductionPlan) => {
    return Math.round((plan.producedQuantity / plan.plannedQuantity) * 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Üretim Planlama</h2>
          <p className="text-slate-500 mt-1">Fabrika üretim planlarını yönetin</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Plan Ekle</span>
        </button>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      {/* Filtreler */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Ürün ara..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filtrele</span>
            </button>
            <select className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Tüm Durumlar</option>
              <option>Planlandı</option>
              <option>Üretimde</option>
              <option>Tamamlandı</option>
              <option>Gecikmiş</option>
            </select>
          </div>
        </div>

        {/* Üretim Planları Listesi */}
        <div className="space-y-4">
          {plans.map((plan, index) => {
            const StatusIcon = statusIcons[plan.status]
            const progress = getProgressPercentage(plan)
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-6 flex-wrap lg:flex-nowrap">
                  {/* Sol - Ürün Bilgileri */}
                  <div className="flex items-start space-x-4 flex-1 min-w-[300px]">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                      <Package className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">{plan.productName}</h3>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-mono">
                          {plan.productCode}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-md font-medium ${priorityColors[plan.priority]}`}>
                          {plan.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                        <span className="flex items-center">
                          <Factory className="w-4 h-4 mr-1" />
                          {plan.factory}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {plan.startDate} - {plan.endDate}
                        </span>
                      </div>
                      
                      {/* İlerleme Çubuğu */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-600">Üretim İlerlemesi</span>
                          <span className="font-bold text-slate-800">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all ${
                              progress === 100 ? 'bg-green-500' : 
                              progress >= 70 ? 'bg-blue-500' : 
                              progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-500">{plan.notes}</p>
                    </div>
                  </div>

                  {/* Orta - Miktar Bilgileri */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Planlanan</p>
                      <p className="text-2xl font-bold text-slate-800">{plan.plannedQuantity.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{plan.unit}</p>
                    </div>
                    <div className="text-4xl text-slate-300">→</div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Üretilen</p>
                      <p className="text-2xl font-bold text-green-600">{plan.producedQuantity.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{plan.unit}</p>
                    </div>
                  </div>

                  {/* Sağ - Durum ve Aksiyonlar */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border ${statusColors[plan.status]}`}>
                      <StatusIcon className="w-4 h-4 mr-2" />
                      {plan.status}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingPlan(plan)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Yeni Plan Ekleme Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-2xl font-bold text-slate-800">Yeni Üretim Planı</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ürün Adı</label>
                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ürün Kodu</label>
                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Planlanan Miktar</label>
                    <input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Birim</label>
                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Adet</option>
                      <option>Çift</option>
                      <option>Kg</option>
                      <option>Litre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Başlangıç Tarihi</label>
                    <input type="date" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bitiş Tarihi</label>
                    <input type="date" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fabrika</label>
                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Fabrika 1</option>
                      <option>Fabrika 2</option>
                      <option>Fabrika 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Öncelik</label>
                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Düşük</option>
                      <option>Orta</option>
                      <option>Yüksek</option>
                      <option>Acil</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notlar</label>
                  <textarea rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium">
                    Planı Kaydet
                  </button>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
