'use client'

import { useState } from 'react'
import { Megaphone, Plus, Edit, Trash2, TrendingUp, X, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Campaign {
  id: number
  name: string
  type: string
  discount: string
  status: 'active' | 'ended'
  views: number
  conversions: number
}

export default function Campaigns() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({ name: '', type: 'İndirim', discount: '' })

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setFormData({ name: campaign.name, type: campaign.type, discount: campaign.discount })
    setIsModalOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Silmek istediğinizden emin misiniz?')) {
      setCampaigns(campaigns.filter(c => c.id !== id))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCampaign) {
      setCampaigns(campaigns.map(c => c.id === editingCampaign.id ? { ...c, ...formData } : c))
    } else {
      setCampaigns([...campaigns, { id: Date.now(), ...formData, status: 'active', views: 0, conversions: 0 }])
    }
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kampanya Yönetimi</h2>
          <p className="text-slate-500 mt-1">Kampanyalarınızı oluşturun ve yönetin</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Kampanya
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Aktif Kampanyalar</p>
          <p className="text-3xl font-bold text-green-600">{campaigns.filter(c => c.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Görüntülenme</p>
          <p className="text-3xl font-bold text-blue-600">{campaigns.reduce((sum, c) => sum + c.views, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Dönüşüm</p>
          <p className="text-3xl font-bold text-purple-600">{campaigns.reduce((sum, c) => sum + c.conversions, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Dönüşüm Oranı</p>
          <p className="text-3xl font-bold text-orange-600">
            {campaigns.length > 0 ? ((campaigns.reduce((sum, c) => sum + c.conversions, 0) / campaigns.reduce((sum, c) => sum + c.views, 0)) * 100).toFixed(1) : '0.0'}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Kampanya</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tür</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İndirim</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Görüntülenme</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Dönüşüm</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((campaign, index) => (
                <motion.tr
                  key={campaign.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Megaphone className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-slate-800">{campaign.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm">{campaign.type}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600">{campaign.discount}</td>
                  <td className="px-6 py-4">{campaign.views.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-semibold">{campaign.conversions}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {campaign.status === 'active' ? 'Aktif' : 'Sona Erdi'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEdit(campaign)}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit className="w-5 h-5 text-slate-400" />
                      </button>
                      <button 
                        onClick={() => handleDelete(campaign.id)}
                        className="p-2 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-2xl font-bold">{editingCampaign ? 'Kampanya Düzenle' : 'Yeni Kampanya'}</h3>
                <button onClick={() => setIsModalOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kampanya Adı *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tür *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                    >
                      <option>İndirim</option>
                      <option>Kupon</option>
                      <option>Kargo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">İndirim *</label>
                    <input
                      type="text"
                      required
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      placeholder="%30 veya ₺50"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center justify-center">
                    <Save className="w-5 h-5 mr-2" />
                    {editingCampaign ? 'Güncelle' : 'Kaydet'}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border rounded-xl">
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
