'use client'

import { useState, useEffect } from 'react'
import { Image, Plus, Edit, Trash2, Eye, ArrowUp, ArrowDown, Save, X, Play, Pause } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface Slider {
  id: string | number
  title: string
  description?: string
  imageUrl: string
  thumbnailUrl?: string
  videoUrl?: string
  isActive: boolean
  order: number
  autoPlay: boolean
  duration: number // saniye
  clickAction?: {
    type: 'product' | 'category' | 'url' | 'none'
    value: string
  }
  buttonText?: string
  buttonColor?: string
  textColor?: string
  overlayOpacity?: number
  createdAt: string
  updatedAt: string
  views?: number
  clicks?: number
}

export default function Sliders() {
  const [sliders, setSliders] = useState<Slider[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlider, setEditingSlider] = useState<Slider | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    thumbnailUrl: '',
    videoUrl: '',
    isActive: true,
    order: 1,
    autoPlay: true,
    duration: 5,
    clickAction: { type: 'none' as const, value: '' },
    buttonText: 'Keşfet',
    buttonColor: '#3B82F6',
    textColor: '#FFFFFF',
    overlayOpacity: 0.3
  })
  const [viewingSlider, setViewingSlider] = useState<Slider | null>(null)

  // Sliders yükle
  const loadSliders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/sliders/all') as any
      if (response.success) {
        setSliders(response.data || [])
      }
    } catch (error) {
      console.error('Sliders yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSliders()
  }, [])

  const handleDelete = async (id: string | number) => {
    if (confirm('Silmek istediğinizden emin misiniz?')) {
      try {
        const response = await api.delete(`/admin/sliders/${id}`) as any
        if (response.success) {
          setSliders(sliders.filter(s => s.id !== id))
        }
      } catch (error) {
        console.error('Slider silme hatası:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSlider) {
        // Güncelle
        const response = await api.put(`/admin/sliders/${editingSlider.id}`, formData) as any
        if (response.success) {
          setSliders(sliders.map(s => s.id === editingSlider.id ? response.data : s))
        }
      } else {
        // Yeni oluştur
        const response = await api.post('/admin/sliders', formData) as any
        if (response.success) {
          setSliders([...sliders, response.data])
        }
      }
      setIsModalOpen(false)
      setEditingSlider(null)
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        thumbnailUrl: '',
        videoUrl: '',
        isActive: true,
        order: sliders.length + 1,
        autoPlay: true,
        duration: 5,
        clickAction: { type: 'none', value: '' },
        buttonText: 'Keşfet',
        buttonColor: '#3B82F6',
        textColor: '#FFFFFF',
        overlayOpacity: 0.3
      })
    } catch (error) {
      console.error('Slider kaydetme hatası:', error)
    }
  }

  const handleEdit = (slider: Slider) => {
    setEditingSlider(slider)
    setFormData({
      title: slider.title,
      description: slider.description || '',
      imageUrl: slider.imageUrl,
      thumbnailUrl: slider.thumbnailUrl || '',
      videoUrl: slider.videoUrl || '',
      isActive: slider.isActive,
      order: slider.order,
      autoPlay: slider.autoPlay,
      duration: slider.duration,
      clickAction: slider.clickAction || { type: 'none' as const, value: '' },
      buttonText: slider.buttonText || 'Keşfet',
      buttonColor: slider.buttonColor || '#3B82F6',
      textColor: slider.textColor || '#FFFFFF',
      overlayOpacity: slider.overlayOpacity || 0.3
    })
    setIsModalOpen(true)
  }

  const toggleActive = async (id: string | number) => {
    try {
      const slider = sliders.find(s => s.id === id)
      if (slider) {
        const response = await api.patch(`/admin/sliders/${id}/toggle`, { isActive: !slider.isActive }) as any
        if (response.success) {
          setSliders(sliders.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s))
        }
      }
    } catch (error) {
      console.error('Slider durumu değiştirme hatası:', error)
    }
  }

  const moveUp = async (id: string | number) => {
    const index = sliders.findIndex(s => s.id === id)
    if (index > 0) {
      const newSliders = [...sliders]
      ;[newSliders[index - 1], newSliders[index]] = [newSliders[index], newSliders[index - 1]]
      setSliders(newSliders)
      // API'ye sıralama gönder
      try {
        await api.patch('/admin/sliders/reorder', { 
          sliderIds: newSliders.map(s => s.id) 
        })
      } catch (error) {
        console.error('Sıralama hatası:', error)
      }
    }
  }

  const moveDown = async (id: string | number) => {
    const index = sliders.findIndex(s => s.id === id)
    if (index < sliders.length - 1) {
      const newSliders = [...sliders]
      ;[newSliders[index], newSliders[index + 1]] = [newSliders[index + 1], newSliders[index]]
      setSliders(newSliders)
      // API'ye sıralama gönder
      try {
        await api.patch('/admin/sliders/reorder', { 
          sliderIds: newSliders.map(s => s.id) 
        })
      } catch (error) {
        console.error('Sıralama hatası:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Slider Yönetimi</h2>
          <p className="text-slate-500 mt-1">Ana sayfa slider'larını yönetin</p>
        </div>
        <button 
          onClick={() => {
            setEditingSlider(null)
            setFormData({
              title: '',
              description: '',
              imageUrl: '',
              thumbnailUrl: '',
              videoUrl: '',
              isActive: true,
              order: sliders.length + 1,
              autoPlay: true,
              duration: 5,
              clickAction: { type: 'none', value: '' },
              buttonText: 'Keşfet',
              buttonColor: '#3B82F6',
              textColor: '#FFFFFF',
              overlayOpacity: 0.3
            })
            setIsModalOpen(true)
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Slider
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Slider</p>
          <p className="text-3xl font-bold text-slate-800">{sliders.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Aktif</p>
          <p className="text-3xl font-bold text-green-600">{sliders.filter(s => s.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Görüntülenme</p>
          <p className="text-3xl font-bold text-blue-600">{sliders.reduce((sum, s) => sum + (s.views || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Tıklama Oranı</p>
          <p className="text-3xl font-bold text-purple-600">
            {sliders.reduce((sum, s) => sum + (s.views || 0), 0) > 0 
              ? ((sliders.reduce((sum, s) => sum + (s.clicks || 0), 0) / sliders.reduce((sum, s) => sum + (s.views || 0), 0)) * 100).toFixed(1)
              : '0.0'
            }%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Slider Listesi</h3>
        <div className="space-y-4">
          {sliders.map((slider, index) => (
            <motion.div
              key={slider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`border-2 rounded-xl p-5 transition-all ${
                slider.isActive ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-24 h-16 rounded-xl overflow-hidden">
                  {slider.imageUrl ? (
                    <img 
                      src={slider.imageUrl} 
                      alt={slider.title}
                      className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-2xl ${slider.imageUrl ? 'hidden' : 'flex'}`}>
                    🎬
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-bold text-slate-800">{slider.title}</h4>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      slider.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {slider.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                    {slider.autoPlay && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                        <Play className="w-3 h-3 inline mr-1" />
                        Otomatik
                      </span>
                    )}
                  </div>
                  {slider.description && (
                    <p className="text-sm text-slate-600 mb-2">{slider.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-slate-500">👁️ {(slider.views || 0).toLocaleString()} görüntülenme</span>
                    <span className="text-blue-600 font-semibold">👆 {(slider.clicks || 0).toLocaleString()} tıklama</span>
                    <span className="text-slate-500">⏱️ {slider.duration}s</span>
                    <span className="text-slate-500"># {slider.order}</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={() => moveUp(slider.id)} 
                    className="p-2 hover:bg-slate-100 rounded-lg"
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => moveDown(slider.id)} 
                    className="p-2 hover:bg-slate-100 rounded-lg"
                    disabled={index === sliders.length - 1}
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setViewingSlider(slider)} 
                    className="p-2 hover:bg-blue-50 rounded-lg"
                  >
                    <Eye className="w-5 h-5 text-blue-600" />
                  </button>
                  <button 
                    onClick={() => handleEdit(slider)}
                    className="p-2 hover:bg-green-50 rounded-lg"
                  >
                    <Edit className="w-5 h-5 text-green-600" />
                  </button>
                  <button 
                    onClick={() => toggleActive(slider.id)} 
                    className={`p-2 rounded-lg ${
                      slider.isActive 
                        ? 'hover:bg-orange-50' 
                        : 'hover:bg-green-50'
                    }`}
                  >
                    {slider.isActive ? (
                      <Pause className="w-5 h-5 text-orange-600" />
                    ) : (
                      <Play className="w-5 h-5 text-green-600" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleDelete(slider.id)} 
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
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
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-2xl font-bold">{editingSlider ? 'Slider Düzenle' : 'Yeni Slider'}</h3>
                <button onClick={() => setIsModalOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Başlık *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                      placeholder="Slider başlığı"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sıra</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Açıklama</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Slider açıklaması"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Resim URL *</label>
                  <input
                    type="url"
                    required
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/slider.jpg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Thumbnail URL</label>
                    <input
                      type="url"
                      value={formData.thumbnailUrl}
                      onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/thumb.jpg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Video URL</label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/video.mp4"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Süre (saniye)</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Buton Metni</label>
                    <input
                      type="text"
                      value={formData.buttonText}
                      onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                      placeholder="Keşfet"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Overlay Opacity</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.overlayOpacity}
                      onChange={(e) => setFormData({ ...formData, overlayOpacity: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <span className="text-xs text-slate-500">{Math.round(formData.overlayOpacity * 100)}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Buton Rengi</label>
                    <input
                      type="color"
                      value={formData.buttonColor}
                      onChange={(e) => setFormData({ ...formData, buttonColor: e.target.value })}
                      className="w-full h-12 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Metin Rengi</label>
                    <input
                      type="color"
                      value={formData.textColor}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="w-full h-12 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tıklama Aksiyonu</label>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={formData.clickAction.type}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        clickAction: { 
                          ...formData.clickAction, 
                          type: e.target.value as any 
                        } 
                      })}
                      className="px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="none">Aksiyon Yok</option>
                      <option value="product">Ürün</option>
                      <option value="category">Kategori</option>
                      <option value="url">URL</option>
                    </select>
                    {formData.clickAction.type !== 'none' && (
                      <input
                        type="text"
                        value={formData.clickAction.value || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          clickAction: { 
                            ...formData.clickAction, 
                            value: e.target.value 
                          } 
                        })}
                        className="px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                        placeholder={formData.clickAction.type === 'url' ? 'https://...' : 'Değer'}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium">
                      Aktif
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoPlay"
                      checked={formData.autoPlay}
                      onChange={(e) => setFormData({ ...formData, autoPlay: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="autoPlay" className="text-sm font-medium">
                      Otomatik Oynat
                    </label>
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center justify-center">
                    <Save className="w-5 h-5 mr-2" />
                    {editingSlider ? 'Güncelle' : 'Kaydet'}
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

      {/* Detay Modal */}
      <AnimatePresence>
        {viewingSlider && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingSlider(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">Slider Detayları</h3>
                <button
                  onClick={() => setViewingSlider(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-32 h-20 rounded-2xl overflow-hidden">
                    {viewingSlider.imageUrl ? (
                      <img 
                        src={viewingSlider.imageUrl} 
                        alt={viewingSlider.title}
                        className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                          if (nextElement) {
                            nextElement.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-3xl ${viewingSlider.imageUrl ? 'hidden' : 'flex'}`}>
                      🎬
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-800">{viewingSlider.title}</h4>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        viewingSlider.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {viewingSlider.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                      {viewingSlider.autoPlay && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                          <Play className="w-3 h-3 inline mr-1" />
                          Otomatik
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {viewingSlider.description && (
                  <div>
                    <h5 className="text-lg font-semibold text-slate-800 mb-2">Açıklama</h5>
                    <p className="text-slate-600">{viewingSlider.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center text-blue-600 mb-2">
                      <Eye className="w-5 h-5 mr-2" />
                      <p className="text-sm font-medium">Görüntülenme</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-700">{(viewingSlider.views || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center text-purple-600 mb-2">
                      <span className="text-lg mr-2">👆</span>
                      <p className="text-sm font-medium">Tıklama</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-700">{(viewingSlider.clicks || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center text-green-600 mb-2">
                      <span className="text-lg mr-2">⏱️</span>
                      <p className="text-sm font-medium">Süre</p>
                    </div>
                    <p className="text-3xl font-bold text-green-700">{viewingSlider.duration}s</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center text-orange-600 mb-2">
                      <span className="text-lg mr-2">📊</span>
                      <p className="text-sm font-medium">Oran</p>
                    </div>
                    <p className="text-3xl font-bold text-orange-700">
                      {(viewingSlider.views || 0) > 0 
                        ? (((viewingSlider.clicks || 0) / (viewingSlider.views || 0)) * 100).toFixed(1)
                        : '0.0'
                      }%
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6">
                  <h5 className="font-semibold text-slate-800 mb-4">Slider Ayarları</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Sıra</span>
                        <span className="font-bold text-slate-800">{viewingSlider.order}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Otomatik Oynat</span>
                        <span className={`font-bold ${viewingSlider.autoPlay ? 'text-green-600' : 'text-slate-600'}`}>
                          {viewingSlider.autoPlay ? 'Açık' : 'Kapalı'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Buton Metni</span>
                        <span className="font-bold text-slate-800">{viewingSlider.buttonText || 'Keşfet'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Buton Rengi</span>
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: viewingSlider.buttonColor || '#3B82F6' }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Metin Rengi</span>
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: viewingSlider.textColor || '#FFFFFF' }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Overlay Opacity</span>
                        <span className="font-bold text-slate-800">
                          {Math.round((viewingSlider.overlayOpacity || 0.3) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewingSlider(null)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
