'use client'

import { useState, useEffect } from 'react'
import { Plus, Eye, Trash2, X, Save, Edit, ArrowUp, ArrowDown, Clock, Target, Percent, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface FlashDeal {
    id: string | number
    name: string
    description?: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    targetType: 'category' | 'product'
    targetId?: number
    startDate: string
    endDate: string
    isActive: boolean
    createdAt: string
    updatedAt: string
    targetName?: string
}

interface Product {
    id: number
    name: string
    category: string
}

interface Category {
    id: number
    name: string
}

export default function FlashDeals() {
    const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingDeal, setEditingDeal] = useState<FlashDeal | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: 0,
        targetType: 'category' as 'category' | 'product',
        targetId: undefined as number | undefined,
        startDate: '',
        endDate: '',
        isActive: true
    })
    const [viewingDeal, setViewingDeal] = useState<FlashDeal | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
    const [selectedCategories, setSelectedCategories] = useState<Category[]>([])

    // Flash deals yükle
    const loadFlashDeals = async () => {
        try {
            setLoading(true)
            const response = await api.get('/admin/flash-deals/all') as any
            if (response.success) {
                setFlashDeals(response.data || [])
            }
        } catch (error) {
            console.error('Flash deals yükleme hatası:', error)
        } finally {
            setLoading(false)
        }
    }

    // Ürünleri yükle
    const loadProducts = async () => {
        try {
            console.log('🛍️ Ürünler yükleniyor...')
            const response = await api.get('/admin/products') as any
            console.log('🛍️ Ürünler response:', response)
            if (response.success) {
                setProducts(response.data || [])
                console.log('🛍️ Ürünler yüklendi:', response.data?.length || 0)
            } else {
                console.error('🛍️ Ürünler yükleme başarısız:', response.message)
            }
        } catch (error) {
            console.error('🛍️ Ürünler yükleme hatası:', error)
        }
    }

    // Kategorileri yükle
    const loadCategories = async () => {
        try {
            console.log('📂 Kategoriler yükleniyor...')
            const response = await api.get('/admin/categories') as any
            console.log('📂 Kategoriler response:', response)
            if (response.success) {
                setCategories(response.data || [])
                console.log('📂 Kategoriler yüklendi:', response.data?.length || 0)
            } else {
                console.error('📂 Kategoriler yükleme başarısız:', response.message)
            }
        } catch (error) {
            console.error('📂 Kategoriler yükleme hatası:', error)
        }
    }

    useEffect(() => {
        loadFlashDeals()
        loadProducts()
        loadCategories()
    }, [])

    const handleDelete = async (id: string | number) => {
        if (confirm('Silmek istediğinizden emin misiniz?')) {
            try {
                const response = await api.delete(`/admin/flash-deals/${id}`) as any
                if (response.success) {
                    setFlashDeals(flashDeals.filter(d => d.id !== id))
                }
            } catch (error) {
                console.error('Flash deal silme hatası:', error)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('💾 Flash deal kaydediliyor...', { editingDeal: !!editingDeal, formData })
        
        // Form validation
        if (!formData.name.trim()) {
            alert('Flash deal adı zorunludur!')
            return
        }
        
        if (formData.discountValue <= 0) {
            alert('İndirim değeri 0\'dan büyük olmalıdır!')
            return
        }
        
        if (!formData.startDate || !formData.endDate) {
            alert('Başlangıç ve bitiş tarihleri zorunludur!')
            return
        }
        
        if (new Date(formData.startDate) >= new Date(formData.endDate)) {
            alert('Bitiş tarihi başlangıç tarihinden sonra olmalıdır!')
            return
        }
        
        try {
            // Seçilen ürün/kategori ID'lerini form data'ya ekle
            const submitData = {
                ...formData,
                targetIds: formData.targetType === 'product' 
                    ? selectedProducts.map(p => p.id)
                    : selectedCategories.map(c => c.id)
            }
            
            if (editingDeal) {
                // Güncelle
                console.log('✏️ Flash deal güncelleniyor:', editingDeal.id)
                const response = await api.put(`/admin/flash-deals/${editingDeal.id}`, submitData) as any
                console.log('✏️ Güncelleme response:', response)
                if (response.success) {
                    setFlashDeals(flashDeals.map(d => d.id === editingDeal.id ? response.data : d))
                    console.log('✅ Flash deal güncellendi')
                } else {
                    console.error('❌ Flash deal güncelleme başarısız:', response.message)
                }
            } else {
                // Yeni oluştur
                console.log('➕ Yeni flash deal oluşturuluyor')
                const response = await api.post('/admin/flash-deals', submitData) as any
                console.log('➕ Oluşturma response:', response)
                if (response.success) {
                    setFlashDeals([...flashDeals, response.data])
                    console.log('✅ Yeni flash deal oluşturuldu')
                } else {
                    console.error('❌ Flash deal oluşturma başarısız:', response.message)
                }
            }
            
            // Modal'ı kapat ve form'u temizle
            setIsModalOpen(false)
            setEditingDeal(null)
            setSearchTerm('')
            setShowSearchResults(false)
            setSelectedProducts([])
            setSelectedCategories([])
            setFormData({
                name: '',
                description: '',
                discountType: 'percentage' as 'percentage' | 'fixed',
                discountValue: 0,
                targetType: 'category' as 'category' | 'product',
                targetId: undefined,
                startDate: '',
                endDate: '',
                isActive: true
            })
            console.log('🎉 Flash deal işlemi tamamlandı')
        } catch (error) {
            console.error('❌ Flash deal kaydetme hatası:', error)
            alert('Flash deal kaydedilirken bir hata oluştu: ' + (error as Error).message)
        }
    }

    const handleEdit = (deal: FlashDeal) => {
        setEditingDeal(deal)
        setFormData({
            name: deal.name,
            description: deal.description || '',
            discountType: deal.discountType,
            discountValue: deal.discountValue,
            targetType: deal.targetType,
            targetId: deal.targetId,
            startDate: deal.startDate,
            endDate: deal.endDate,
            isActive: deal.isActive
        })
        
        // Hedef seçimi için arama terimini set et
        if (deal.targetId) {
            const targetItem = deal.targetType === 'category' 
                ? categories.find(c => c.id === deal.targetId)
                : products.find(p => p.id === deal.targetId)
            setSearchTerm(targetItem ? targetItem.name : '')
        } else {
            setSearchTerm('')
        }
        
        setShowSearchResults(false)
        setIsModalOpen(true)
    }

    const toggleActive = async (id: string | number) => {
        try {
            const deal = flashDeals.find(d => d.id === id)
            if (deal) {
                const response = await api.patch(`/admin/flash-deals/${id}/toggle`, { isActive: !deal.isActive }) as any
                if (response.success) {
                    setFlashDeals(flashDeals.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d))
                }
            }
        } catch (error) {
            console.error('Flash deal durumu değiştirme hatası:', error)
        }
    }

    const getTargetName = (deal: FlashDeal) => {
        if (deal.targetType === 'category') {
            const category = categories.find(c => c.id === deal.targetId)
            return category ? category.name : 'Tüm Kategoriler'
        } else if (deal.targetType === 'product') {
            const product = products.find(p => p.id === deal.targetId)
            return product ? product.name : 'Tüm Ürünler'
        }
        return 'Tüm Ürünler'
    }

    const isExpired = (endDate: string) => {
        return new Date(endDate) < new Date()
    }

    const isActive = (startDate: string, endDate: string) => {
        const now = new Date()
        const start = new Date(startDate)
        const end = new Date(endDate)
        return now >= start && now <= end
    }

    // Arama fonksiyonları
    const getFilteredItems = () => {
        console.log('🔍 Arama yapılıyor:', { targetType: formData.targetType, searchTerm, categoriesCount: categories.length, productsCount: products.length })
        
        if (formData.targetType === 'category') {
            const filtered = categories.filter(category => 
                category.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            console.log('📂 Filtrelenmiş kategoriler:', filtered.length)
            return filtered
        } else {
            const filtered = products.filter(product => 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.category.toLowerCase().includes(searchTerm.toLowerCase())
            )
            console.log('🛍️ Filtrelenmiş ürünler:', filtered.length)
            return filtered
        }
    }

    const handleSearch = (term: string) => {
        setSearchTerm(term)
        setShowSearchResults(term.length > 0)
    }

    const selectItem = (item: Product | Category) => {
        if (formData.targetType === 'product') {
            // Ürün seçimi - maksimum 5 ürün
            if (selectedProducts.length >= 5) {
                alert('Maksimum 5 ürün seçebilirsiniz!')
                return
            }
            if (!selectedProducts.find(p => p.id === item.id)) {
                setSelectedProducts([...selectedProducts, item as Product])
            }
        } else {
            // Kategori seçimi - maksimum 5 kategori
            if (selectedCategories.length >= 5) {
                alert('Maksimum 5 kategori seçebilirsiniz!')
                return
            }
            if (!selectedCategories.find(c => c.id === item.id)) {
                setSelectedCategories([...selectedCategories, item as Category])
            }
        }
        setSearchTerm('')
        setShowSearchResults(false)
    }

    const removeSelectedItem = (item: Product | Category) => {
        if (formData.targetType === 'product') {
            setSelectedProducts(selectedProducts.filter(p => p.id !== item.id))
        } else {
            setSelectedCategories(selectedCategories.filter(c => c.id !== item.id))
        }
    }

    const clearAllSelections = () => {
        setSelectedProducts([])
        setSelectedCategories([])
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
                    <h2 className="text-3xl font-bold text-slate-800">Flash İndirimler</h2>
                    <p className="text-slate-500 mt-1">Hızlı indirim kampanyalarını yönetin</p>
                </div>
                <button
                    onClick={() => { 
                        setEditingDeal(null)
                        setFormData({
                            name: '',
                            description: '',
                            discountType: 'percentage' as 'percentage' | 'fixed',
                            discountValue: 0,
                            targetType: 'category' as 'category' | 'product',
                            targetId: undefined,
                            startDate: '',
                            endDate: '',
                            isActive: true
                        })
                        setSearchTerm('')
                        setShowSearchResults(false)
                        setSelectedProducts([])
                        setSelectedCategories([])
                        setIsModalOpen(true) 
                    }}
                    className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Flash Deal
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Aktif Flash Deal</p>
                    <p className="text-3xl font-bold text-orange-600">{flashDeals.filter(d => d.isActive && isActive(d.startDate, d.endDate)).length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Süresi Dolmuş</p>
                    <p className="text-3xl font-bold text-red-600">{flashDeals.filter(d => isExpired(d.endDate)).length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Toplam Flash Deal</p>
                    <p className="text-3xl font-bold text-blue-600">{flashDeals.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <p className="text-slate-500 text-sm mb-2">Ortalama İndirim</p>
                    <p className="text-3xl font-bold text-green-600">
                        {flashDeals.length > 0 
                            ? (flashDeals.reduce((sum, d) => sum + d.discountValue, 0) / flashDeals.length).toFixed(1)
                            : '0'
                        }%
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flashDeals.map((deal, index) => (
                    <motion.div
                        key={deal.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 ${
                            isActive(deal.startDate, deal.endDate) 
                                ? 'border-orange-200 bg-orange-50/30' 
                                : isExpired(deal.endDate)
                                ? 'border-red-200 bg-red-50/30'
                                : 'border-slate-200'
                        }`}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800 truncate">{deal.name}</h3>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                        isActive(deal.startDate, deal.endDate)
                                            ? 'bg-orange-100 text-orange-700'
                                            : isExpired(deal.endDate)
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {isActive(deal.startDate, deal.endDate) ? 'Aktif' : isExpired(deal.endDate) ? 'Süresi Dolmuş' : 'Beklemede'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                        deal.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                        {deal.isActive ? 'Etkin' : 'Pasif'}
                                    </span>
                                </div>
                            </div>
                            
                            {deal.description && (
                                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{deal.description}</p>
                            )}

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-sm">İndirim</span>
                                    <span className="font-bold text-orange-600">
                                        {deal.discountType === 'percentage' 
                                            ? `%${deal.discountValue}` 
                                            : `${deal.discountValue}₺`
                                        }
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-sm">Hedef</span>
                                    <span className="font-semibold text-slate-800">{getTargetName(deal)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-sm">Bitiş</span>
                                    <span className="font-semibold text-slate-800">
                                        {new Date(deal.endDate).toLocaleDateString('tr-TR')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setViewingDeal(deal)}
                                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                >
                                    <Eye className="w-4 h-4 inline mr-1" />
                                    Görüntüle
                                </button>
                                <button
                                    onClick={() => handleEdit(deal)}
                                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                                >
                                    <Edit className="w-4 h-4 inline mr-1" />
                                    Düzenle
                                </button>
                                <button
                                    onClick={() => toggleActive(deal.id)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        deal.isActive 
                                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' 
                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                    }`}
                                >
                                    {deal.isActive ? 'Pasif' : 'Aktif'}
                                </button>
                                <button
                                    onClick={() => handleDelete(deal.id)}
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
                            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                            onBlur={() => {
                                // Arama sonuçlarını gizle
                                setTimeout(() => setShowSearchResults(false), 200)
                            }}
                        >
                            <div className="p-6 border-b flex items-center justify-between">
                                <h3 className="text-2xl font-bold">{editingDeal ? 'Flash Deal Düzenle' : 'Yeni Flash Deal'}</h3>
                                <button onClick={() => setIsModalOpen(false)}>
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Ad *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500"
                                        placeholder="Flash deal adı"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Açıklama</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500"
                                        rows={3}
                                        placeholder="Flash deal açıklaması"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">İndirim Türü *</label>
                                        <select
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="percentage">Yüzde (%)</option>
                                            <option value="fixed">Sabit Tutar (₺)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">İndirim Değeri *</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.discountValue}
                                            onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Hedef Türü *</label>
                                        <select
                                            value={formData.targetType}
                                            onChange={(e) => {
                                                setFormData({ ...formData, targetType: e.target.value as 'category' | 'product', targetId: undefined })
                                                setSearchTerm('')
                                                setShowSearchResults(false)
                                            }}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="category">Kategori</option>
                                            <option value="product">Ürün</option>
                                        </select>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <label className="block text-sm font-medium mb-2">
                                                Hedef Seç (Maksimum 5)
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {formData.targetType === 'product' 
                                                        ? `${selectedProducts.length}/5 ürün seçildi`
                                                        : `${selectedCategories.length}/5 kategori seçildi`
                                                    }
                                                </span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => handleSearch(e.target.value)}
                                                    onFocus={() => setShowSearchResults(true)}
                                                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500"
                                                    placeholder={`${formData.targetType === 'category' ? 'Kategori' : 'Ürün'} ara...`}
                                                />
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            
                                            {/* Arama Sonuçları */}
                                            {showSearchResults && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                                    {getFilteredItems().map(item => {
                                                        const isSelected = formData.targetType === 'product' 
                                                            ? selectedProducts.find(p => p.id === item.id) !== undefined
                                                            : selectedCategories.find(c => c.id === item.id) !== undefined
                                                        
                                                        return (
                                                            <div key={item.id} className="p-2">
                                                                <button
                                                                    onClick={() => selectItem(item)}
                                                                    disabled={isSelected}
                                                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                                                                        isSelected 
                                                                            ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                                                                            : 'hover:bg-gray-100'
                                                                    }`}
                                                                >
                                                                    <div className="font-medium flex items-center justify-between">
                                                                        <span>{item.name}</span>
                                                                        {isSelected && <span className="text-xs">✓ Seçildi</span>}
                                                                    </div>
                                                                    {formData.targetType === 'product' && (
                                                                        <div className="text-xs text-gray-500">{(item as Product).category}</div>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )
                                                    })}
                                                    {getFilteredItems().length === 0 && (
                                                        <div className="p-3 text-sm text-gray-500 text-center">
                                                            {formData.targetType === 'category' ? 'Kategori' : 'Ürün'} bulunamadı
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Seçilen Öğeler */}
                                        {(selectedProducts.length > 0 || selectedCategories.length > 0) && (
                                            <div className="bg-gray-50 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-medium text-gray-800">
                                                        Seçilen {formData.targetType === 'product' ? 'Ürünler' : 'Kategoriler'}
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        onClick={clearAllSelections}
                                                        className="text-xs text-red-600 hover:text-red-800"
                                                    >
                                                        Tümünü Temizle
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {(formData.targetType === 'product' ? selectedProducts : selectedCategories).map(item => (
                                                        <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                                                            <div className="flex-1">
                                                                <div className="font-medium text-sm">{item.name}</div>
                                                                {formData.targetType === 'product' && (
                                                                    <div className="text-xs text-gray-500">{(item as Product).category}</div>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSelectedItem(item)}
                                                                className="ml-2 text-red-500 hover:text-red-700"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Başlangıç Tarihi *</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Bitiş Tarihi *</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium">
                                        Aktif
                                    </label>
                                </div>
                                <div className="flex space-x-3 pt-4">
                                    <button type="submit" className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl flex items-center justify-center">
                                        <Save className="w-5 h-5 mr-2" />
                                        {editingDeal ? 'Güncelle' : 'Kaydet'}
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
                {viewingDeal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setViewingDeal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
                        >
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-slate-800">Flash Deal Detayları</h3>
                                <button
                                    onClick={() => setViewingDeal(null)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white text-2xl">
                                        ⚡
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-slate-800">{viewingDeal.name}</h4>
                                        <div className="flex items-center space-x-2 mt-2">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                                isActive(viewingDeal.startDate, viewingDeal.endDate)
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : isExpired(viewingDeal.endDate)
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {isActive(viewingDeal.startDate, viewingDeal.endDate) ? 'Aktif' : isExpired(viewingDeal.endDate) ? 'Süresi Dolmuş' : 'Beklemede'}
                                            </span>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                                viewingDeal.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {viewingDeal.isActive ? 'Etkin' : 'Pasif'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {viewingDeal.description && (
                                    <div>
                                        <h5 className="text-lg font-semibold text-slate-800 mb-2">Açıklama</h5>
                                        <p className="text-slate-600">{viewingDeal.description}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                                        <div className="flex items-center text-orange-600 mb-2">
                                            <Percent className="w-5 h-5 mr-2" />
                                            <p className="text-sm font-medium">İndirim</p>
                                        </div>
                                        <p className="text-3xl font-bold text-orange-700">
                                            {viewingDeal.discountType === 'percentage' 
                                                ? `%${viewingDeal.discountValue}` 
                                                : `${viewingDeal.discountValue}₺`
                                            }
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                        <div className="flex items-center text-blue-600 mb-2">
                                            <Target className="w-5 h-5 mr-2" />
                                            <p className="text-sm font-medium">Hedef</p>
                                        </div>
                                        <p className="text-lg font-bold text-blue-700">{getTargetName(viewingDeal)}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                        <div className="flex items-center text-green-600 mb-2">
                                            <Clock className="w-5 h-5 mr-2" />
                                            <p className="text-sm font-medium">Bitiş</p>
                                        </div>
                                        <p className="text-lg font-bold text-green-700">
                                            {new Date(viewingDeal.endDate).toLocaleDateString('tr-TR')}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h5 className="font-semibold text-slate-800 mb-4">Zaman Bilgileri</h5>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Başlangıç</span>
                                            <span className="font-bold text-slate-800">
                                                {new Date(viewingDeal.startDate).toLocaleString('tr-TR')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Bitiş</span>
                                            <span className="font-bold text-slate-800">
                                                {new Date(viewingDeal.endDate).toLocaleString('tr-TR')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Süre</span>
                                            <span className="font-bold text-slate-800">
                                                {Math.ceil((new Date(viewingDeal.endDate).getTime() - new Date(viewingDeal.startDate).getTime()) / (1000 * 60 * 60 * 24))} gün
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setViewingDeal(null)}
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
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
