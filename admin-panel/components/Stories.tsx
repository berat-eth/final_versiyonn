'use client'

import { useState, useEffect } from 'react'
import { Image, Plus, Eye, Trash2, X, Save, Edit, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface Story {
    id: string | number
    title: string
    description?: string
    imageUrl: string
    thumbnailUrl?: string
    videoUrl?: string
    isActive: boolean
    order: number
    createdAt: string
    updatedAt: string
    expiresAt?: string
    clickAction?: {
        type: 'product' | 'category' | 'url' | 'none'
        value: string
    }
    views?: number
    clicks?: number
}

export default function Stories() {
    const [stories, setStories] = useState<Story[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingStory, setEditingStory] = useState<Story | null>(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        imageUrl: '',
        thumbnailUrl: '',
        videoUrl: '',
        isActive: true,
        order: 1,
        expiresAt: '',
        clickAction: { type: 'none', value: '' }
    })
    const [viewingStory, setViewingStory] = useState<Story | null>(null)

    // Stories yükle
    const loadStories = async () => {
        try {
            setLoading(true)
            const response = await api.get('/admin/stories/all') as any
            if (response.success) {
                setStories(response.data || [])
            }
        } catch (error) {
            console.error('Stories yükleme hatası:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadStories()
    }, [])

    const handleDelete = async (id: string | number) => {
        if (confirm('Silmek istediğinizden emin misiniz?')) {
            try {
                const response = await api.delete(`/admin/stories/${id}`) as any
                if (response.success) {
                    setStories(stories.filter(s => s.id !== id))
                }
            } catch (error) {
                console.error('Story silme hatası:', error)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingStory) {
                // Güncelle
                const response = await api.put(`/admin/stories/${editingStory.id}`, formData) as any
                if (response.success) {
                    setStories(stories.map(s => s.id === editingStory.id ? response.data : s))
                }
            } else {
                // Yeni oluştur
                const response = await api.post('/admin/stories', formData) as any
                if (response.success) {
                    setStories([...stories, response.data])
                }
            }
            setIsModalOpen(false)
            setEditingStory(null)
            setFormData({
                title: '',
                description: '',
                imageUrl: '',
                thumbnailUrl: '',
                videoUrl: '',
                isActive: true,
                order: stories.length + 1,
                expiresAt: '',
                clickAction: { type: 'none', value: '' }
            })
        } catch (error) {
            console.error('Story kaydetme hatası:', error)
        }
    }

    const handleEdit = (story: Story) => {
        setEditingStory(story)
        setFormData({
            title: story.title,
            description: story.description || '',
            imageUrl: story.imageUrl,
            thumbnailUrl: story.thumbnailUrl || '',
            videoUrl: story.videoUrl || '',
            isActive: story.isActive,
            order: story.order,
            expiresAt: story.expiresAt || '',
            clickAction: story.clickAction || { type: 'none', value: '' }
        })
        setIsModalOpen(true)
    }

    const toggleActive = async (id: string | number) => {
        try {
            const story = stories.find(s => s.id === id)
            if (story) {
                const response = await api.patch(`/admin/stories/${id}/toggle`, { isActive: !story.isActive }) as any
                if (response.success) {
                    setStories(stories.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s))
                }
            }
        } catch (error) {
            console.error('Story durumu değiştirme hatası:', error)
        }
    }

    const moveUp = async (id: string | number) => {
        const index = stories.findIndex(s => s.id === id)
        if (index > 0) {
            const newStories = [...stories]
            ;[newStories[index - 1], newStories[index]] = [newStories[index], newStories[index - 1]]
            setStories(newStories)
            // API'ye sıralama gönder
            try {
                await api.patch('/admin/stories/reorder', { 
                    storyIds: newStories.map(s => s.id) 
                })
            } catch (error) {
                console.error('Sıralama hatası:', error)
            }
        }
    }

    const moveDown = async (id: string | number) => {
        const index = stories.findIndex(s => s.id === id)
        if (index < stories.length - 1) {
            const newStories = [...stories]
            ;[newStories[index], newStories[index + 1]] = [newStories[index + 1], newStories[index]]
            setStories(newStories)
            // API'ye sıralama gönder
            try {
                await api.patch('/admin/stories/reorder', { 
                    storyIds: newStories.map(s => s.id) 
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
                    <h2 className="text-3xl font-bold text-slate-800">Story Yönetimi</h2>
                    <p className="text-slate-500 mt-1">Hikayelerinizi oluşturun ve yönetin</p>
                </div>
                <button
                    onClick={() => { 
                        setEditingStory(null)
                        setFormData({
                            title: '',
                            description: '',
                            imageUrl: '',
                            thumbnailUrl: '',
                            videoUrl: '',
                            isActive: true,
                            order: stories.length + 1,
                            expiresAt: '',
                            clickAction: { type: 'none', value: '' }
                        })
                        setIsModalOpen(true) 
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Story
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Aktif Story</p>
                    <p className="text-3xl font-bold text-blue-600">{stories.filter(s => s.isActive).length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Toplam Görüntülenme</p>
                    <p className="text-3xl font-bold text-green-600">{stories.reduce((sum, s) => sum + (s.views || 0), 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Tıklama</p>
                    <p className="text-3xl font-bold text-purple-600">{stories.reduce((sum, s) => sum + (s.clicks || 0), 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Tıklama Oranı</p>
                    <p className="text-3xl font-bold text-orange-600">
                        {stories.reduce((sum, s) => sum + (s.views || 0), 0) > 0 
                            ? ((stories.reduce((sum, s) => sum + (s.clicks || 0), 0) / stories.reduce((sum, s) => sum + (s.views || 0), 0)) * 100).toFixed(1)
                            : '0.0'
                        }%
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
                        <div className="h-48 relative overflow-hidden">
                            {story.imageUrl ? (
                                <img 
                                    src={story.imageUrl} 
                                    alt={story.title}
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
                            <div className={`h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-6xl ${story.imageUrl ? 'hidden' : 'flex'}`}>
                                🎨
                            </div>
                            <div className="absolute top-2 right-2 flex space-x-1">
                                <button
                                    onClick={() => moveUp(story.id)}
                                    className="bg-white/80 hover:bg-white text-slate-600 p-1 rounded"
                                    disabled={index === 0}
                                >
                                    <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => moveDown(story.id)}
                                    className="bg-white/80 hover:bg-white text-slate-600 p-1 rounded"
                                    disabled={index === stories.length - 1}
                                >
                                    <ArrowDown className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-slate-800 truncate">{story.title}</h3>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${story.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {story.isActive ? 'Aktif' : 'Pasif'}
                                </span>
                            </div>
                            {story.description && (
                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{story.description}</p>
                            )}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Görüntülenme</span>
                                    <span className="font-semibold">{(story.views || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Tıklama</span>
                                    <span className="font-semibold text-blue-600">{story.clicks || 0}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Sıra</span>
                                    <span className="font-semibold">{story.order}</span>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setViewingStory(story)}
                                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                >
                                    <Eye className="w-4 h-4 inline mr-1" />
                                    Görüntüle
                                </button>
                                <button
                                    onClick={() => handleEdit(story)}
                                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                                >
                                    <Edit className="w-4 h-4 inline mr-1" />
                                    Düzenle
                                </button>
                                <button
                                    onClick={() => toggleActive(story.id)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        story.isActive 
                                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' 
                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                    }`}
                                >
                                    {story.isActive ? 'Pasif' : 'Aktif'}
                                </button>
                                <button
                                    onClick={() => handleDelete(story.id)}
                                    className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
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
                                <h3 className="text-2xl font-bold">{editingStory ? 'Story Düzenle' : 'Yeni Story'}</h3>
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
                                        placeholder="Story başlığı"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Açıklama</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="Story açıklaması"
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
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
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
                                <div className="grid grid-cols-2 gap-4">
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
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Bitiş Tarihi</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.expiresAt}
                                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
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
                                <div className="flex space-x-3 pt-4">
                                    <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center justify-center">
                                        <Save className="w-5 h-5 mr-2" />
                                        {editingStory ? 'Güncelle' : 'Kaydet'}
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
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden">
                                        {viewingStory.imageUrl ? (
                                            <img 
                                                src={viewingStory.imageUrl} 
                                                alt={viewingStory.title}
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
                                        <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-5xl ${viewingStory.imageUrl ? 'hidden' : 'flex'}`}>
                                            🎨
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-slate-800">{viewingStory.title}</h4>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium mt-2 ${
                                            viewingStory.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {viewingStory.isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                </div>
                                {viewingStory.description && (
                                    <div>
                                        <h5 className="text-lg font-semibold text-slate-800 mb-2">Açıklama</h5>
                                        <p className="text-slate-600">{viewingStory.description}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                        <div className="flex items-center text-blue-600 mb-2">
                                            <Eye className="w-5 h-5 mr-2" />
                                            <p className="text-sm font-medium">Görüntülenme</p>
                                        </div>
                                        <p className="text-3xl font-bold text-blue-700">{(viewingStory.views || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                                        <div className="flex items-center text-purple-600 mb-2">
                                            <span className="text-lg mr-2">👆</span>
                                            <p className="text-sm font-medium">Tıklama</p>
                                        </div>
                                        <p className="text-3xl font-bold text-purple-700">{(viewingStory.clicks || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                        <div className="flex items-center text-green-600 mb-2">
                                            <span className="text-lg mr-2">📊</span>
                                            <p className="text-sm font-medium">Oran</p>
                                        </div>
                                        <p className="text-3xl font-bold text-green-700">
                                            {(viewingStory.views || 0) > 0 
                                                ? (((viewingStory.clicks || 0) / (viewingStory.views || 0)) * 100).toFixed(1)
                                                : '0.0'
                                            }%
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h5 className="font-semibold text-slate-800 mb-4">Performans Metrikleri</h5>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Etkileşim Oranı</span>
                                            <span className="font-bold text-blue-600">
                                                {(viewingStory.views || 0) > 0 
                                                    ? (((viewingStory.clicks || 0) / (viewingStory.views || 0)) * 100).toFixed(2)
                                                    : '0.00'
                                                }%
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
                                            {viewingStory.isActive ? 'Aktif olarak yayında' : 'Pasif'}
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {viewingStory.isActive ? '12 saat kaldı' : '2 gün önce sona erdi'}
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
