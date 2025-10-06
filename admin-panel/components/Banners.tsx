'use client'

import { useState } from 'react'
import { Image as ImageIcon, Plus, Edit, Trash2, Eye, ArrowUp, ArrowDown } from 'lucide-react'
import { motion } from 'framer-motion'

interface Banner {
  id: number
  title: string
  image: string
  link: string
  position: string
  order: number
  active: boolean
  clicks: number
  views: number
}

export default function Banners() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [banners, setBanners] = useState<Banner[]>([])

  const positions = ['Ana Sayfa Üst', 'Ana Sayfa Orta', 'Ana Sayfa Alt', 'Kategori Slider', 'Ürün Detay', 'Sepet Sayfası']

  const moveUp = (id: number) => {
    const index = banners.findIndex(b => b.id === id)
    if (index > 0) {
      const newBanners = [...banners]
      ;[newBanners[index - 1], newBanners[index]] = [newBanners[index], newBanners[index - 1]]
      setBanners(newBanners)
    }
  }

  const moveDown = (id: number) => {
    const index = banners.findIndex(b => b.id === id)
    if (index < banners.length - 1) {
      const newBanners = [...banners]
      ;[newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]]
      setBanners(newBanners)
    }
  }

  const toggleActive = (id: number) => {
    setBanners(banners.map(b => b.id === id ? { ...b, active: !b.active } : b))
  }

  const deleteBanner = (id: number) => {
    if (confirm('Bu banner\'ı silmek istediğinizden emin misiniz?')) {
      setBanners(banners.filter(b => b.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Banner & Slider Yönetimi</h2>
          <p className="text-slate-500 mt-1">Uygulama banner'larını yönetin</p>
        </div>
        <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg">
          <Plus className="w-5 h-5 mr-2" />
          Yeni Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Banner</p>
          <p className="text-3xl font-bold text-slate-800">{banners.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Aktif</p>
          <p className="text-3xl font-bold text-green-600">{banners.filter(b => b.active).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Tıklama</p>
          <p className="text-3xl font-bold text-blue-600">{banners.reduce((sum, b) => sum + b.clicks, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Tıklama Oranı</p>
          <p className="text-3xl font-bold text-purple-600">
            {banners.length > 0 ? ((banners.reduce((sum, b) => sum + b.clicks, 0) / banners.reduce((sum, b) => sum + b.views, 0)) * 100).toFixed(1) : '0.0'}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Banner Listesi</h3>
        <div className="space-y-4">
          {banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`border-2 rounded-xl p-5 transition-all ${
                banner.active ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center text-4xl">
                  {banner.image}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-bold text-slate-800">{banner.title}</h4>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
                      {banner.position}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      banner.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {banner.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">🔗 {banner.link}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-slate-500">👁️ {banner.views.toLocaleString()} görüntülenme</span>
                    <span className="text-blue-600 font-semibold">👆 {banner.clicks.toLocaleString()} tıklama</span>
                    <span className="text-slate-500">
                      {((banner.clicks / banner.views) * 100).toFixed(1)}% oran
                    </span>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <button onClick={() => moveUp(banner.id)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <ArrowUp className="w-5 h-5" />
                  </button>
                  <button onClick={() => moveDown(banner.id)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <ArrowDown className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => toggleActive(banner.id)} className="p-2 hover:bg-blue-50 rounded-lg">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-lg">
                    <Edit className="w-5 h-5 text-slate-600" />
                  </button>
                  <button onClick={() => deleteBanner(banner.id)} className="p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
