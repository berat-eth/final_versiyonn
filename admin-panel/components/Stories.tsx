'use client'

import { useState } from 'react'
import { Image, Plus, Eye, Trash2, X, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Story {
    id: number
    title: string
    views: number
    clicks: number
    image: string
    status: 'active' | 'expired'
}

export default function Stories() {
    // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
    const [stories, setStories] = useState<Story[]>([])

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState({ title: '', image: '🎨' })
    const [viewingStory, setViewingStory] = useState<Story | null>(null)

    const handleDelete = (id: number) => {
        if (confirm('Silmek istediğinizden emin misiniz?')) {
            setStories(stories.filter(s => s.id !== id))
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setStories([...stories, { id: Date.now(), ...formData, status: 'active', views: 0, clicks: 0 }])
        setIsModalOpen(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Story Yönetimi</h2>
                    <p className="text-slate-500 mt-1">Hikayelerinizi oluşturun ve yönetin</p>
                </div>
                <button
                    onClick={() => { setFormData({ title: '', image: '🎨' }); setIsModalOpen(true); }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Story
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Aktif Story</p>
                    <p className="text-3xl font-bold text-blue-600">{stories.filter(s => s.status === 'active').length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Toplam Görüntülenme</p>
                    <p className="text-3xl font-bold text-green-600">{stories.reduce((sum, s) => sum + s.views, 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Tıklama</p>
                    <p className="text-3xl font-bold text-purple-600">{stories.reduce((sum, s) => sum + s.clicks, 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Tıklama Oranı</p>
                    <p className="text-3xl font-bold text-orange-600">
                        {((stories.reduce((sum, s) => sum + s.clicks, 0) / stories.reduce((sum, s) => sum + s.views, 0)) * 100).toFixed(1)}%
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stories.map((story, index) => (
                    <motion.div
                        key={story.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-2xl shadow-sm overflow-hidden card-hover"
                    >
                        <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-6xl">
                            {story.image}
                        </div>
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-slate-800">{story.title}</h3>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${story.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                    {story.status === 'active' ? 'Aktif' : 'Süresi Doldu'}
                                </span>
                            </div>
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Görüntülenme</span>
                                    <span className="font-semibold">{story.views.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Tıklama</span>
                                    <span className="font-semibold text-blue-600">{story.clicks}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => setViewingStory(story)}
                                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                                >
                                    <Eye className="w-4 h-4 inline mr-1" />
                                    Görüntüle
                                </button>
                                <button
                                    onClick={() => handleDelete(story.id)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
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
                                <h3 className="text-2xl font-bold">Yeni Story</h3>
                                <button onClick={() => setIsModalOpen(false)}>
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Başlık *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">İkon Seç</label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {['🎨', '🎁', '☀️', '✨', '🎉', '🔥', '⭐', '💎', '🎯', '🚀'].map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, image: emoji })}
                                                className={`p-4 text-3xl border-2 rounded-xl ${formData.image === emoji ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                                                    }`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex space-x-3 pt-4">
                                    <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center justify-center">
                                        <Save className="w-5 h-5 mr-2" />
                                        Kaydet
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
                {viewingStory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setViewingStory(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
                        >
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-slate-800">Story Detayları</h3>
                                <button
                                    onClick={() => setViewingStory(null)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-5xl">
                                        {viewingStory.image}
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-slate-800">{viewingStory.title}</h4>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium mt-2 ${
                                            viewingStory.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {viewingStory.status === 'active' ? 'Aktif' : 'Süresi Doldu'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                        <div className="flex items-center text-blue-600 mb-2">
                                            <Eye className="w-5 h-5 mr-2" />
                                            <p className="text-sm font-medium">Görüntülenme</p>
                                        </div>
                                        <p className="text-3xl font-bold text-blue-700">{viewingStory.views.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                                        <div className="flex items-center text-purple-600 mb-2">
                                            <span className="text-lg mr-2">👆</span>
                                            <p className="text-sm font-medium">Tıklama</p>
                                        </div>
                                        <p className="text-3xl font-bold text-purple-700">{viewingStory.clicks.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                        <div className="flex items-center text-green-600 mb-2">
                                            <span className="text-lg mr-2">📊</span>
                                            <p className="text-sm font-medium">Oran</p>
                                        </div>
                                        <p className="text-3xl font-bold text-green-700">
                                            {((viewingStory.clicks / viewingStory.views) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h5 className="font-semibold text-slate-800 mb-4">Performans Metrikleri</h5>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Etkileşim Oranı</span>
                                            <span className="font-bold text-blue-600">
                                                {((viewingStory.clicks / viewingStory.views) * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Ortalama İzlenme Süresi</span>
                                            <span className="font-bold text-slate-800">4.2 saniye</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Tamamlanma Oranı</span>
                                            <span className="font-bold text-green-600">78%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                                    <p className="text-sm text-slate-600 mb-2">Story Durumu</p>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800">
                                            {viewingStory.status === 'active' ? 'Aktif olarak yayında' : 'Süresi doldu'}
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {viewingStory.status === 'active' ? '12 saat kaldı' : '2 gün önce sona erdi'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setViewingStory(null)}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
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
