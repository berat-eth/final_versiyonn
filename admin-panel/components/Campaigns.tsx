'use client'

import { useEffect, useMemo, useState } from 'react'
import { Megaphone, Plus, Edit, Trash2, TrendingUp, X, Save, Eye, BarChart3, CheckCircle2, Clock, Target, Percent, DollarSign, ArrowUp, ArrowDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface Campaign {
  id: number
  name: string
  type: 'discount' | 'shipping' | 'bogo' | 'flash' | 'bundle'
  discount: string
  status: 'active' | 'ended' | 'draft'
  views: number
  conversions: number
  // X Al Y Öde için ek alanlar
  buyQuantity?: number
  getQuantity?: number
  discountPercentage?: number
  // Genel kampanya bilgileri
  description?: string
  minOrderAmount?: number
  maxDiscountAmount?: number
  startDate?: string
  endDate?: string
  usageLimit?: number
  usedCount?: number
  targetSegmentId?: string
  applicableProducts?: string
  excludedProducts?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

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

export default function Campaigns() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'ended'>('all')
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'all'|'active'|'ended'|'flash'>('all')

  // Flash Deals state'leri
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [flashLoading, setFlashLoading] = useState(true)
  const [isFlashModalOpen, setIsFlashModalOpen] = useState(false)
  const [editingFlashDeal, setEditingFlashDeal] = useState<FlashDeal | null>(null)
  const [flashFormData, setFlashFormData] = useState({
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
  const [viewingFlashDeal, setViewingFlashDeal] = useState<FlashDeal | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    type: 'discount' as 'discount' | 'shipping' | 'bogo' | 'flash' | 'bundle',
    discountType: 'percentage' as 'percentage' | 'fixed' | 'bogo', 
    discountValue: '',
    minOrderAmount: '', 
    maxDiscountAmount: '',
    targetSegmentId: '', 
    applicableProducts: '', 
    excludedProducts: '',
    startDate: '', 
    endDate: '', 
    usageLimit: '',
    // X Al Y Öde için ek alanlar
    buyQuantity: 2,
    getQuantity: 1,
    discountPercentage: 0
  })
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [categoryQuery, setCategoryQuery] = useState('')
  const [productsSearch, setProductsSearch] = useState<any[]>([])
  const [categoriesSearch, setCategoriesSearch] = useState<any[]>([])
  const [searching, setSearching] = useState<'none'|'products'|'categories'>('none')

  // Flash Deals fonksiyonları
  const loadFlashDeals = async () => {
    try {
      setFlashLoading(true)
      const response = await api.get('/admin/flash-deals/all') as any
      if (response.success) {
        // Backend'den gelen snake_case verilerini camelCase'e dönüştür
        const mappedDeals = (response.data || []).map((deal: any) => ({
          id: deal.id,
          name: deal.name || '',
          description: deal.description || '',
          discountType: deal.discount_type || deal.discountType || 'percentage',
          discountValue: deal.discount_value || deal.discountValue || 0,
          targetType: (deal.products && deal.products.length > 0) ? 'product' : 'category',
          targetId: undefined,
          startDate: deal.start_date || deal.startDate || '',
          endDate: deal.end_date || deal.endDate || '',
          isActive: deal.is_active !== undefined ? deal.is_active : deal.isActive !== undefined ? deal.isActive : true,
          createdAt: deal.created_at || deal.createdAt || '',
          updatedAt: deal.updated_at || deal.updatedAt || '',
          products: deal.products || [],
          categories: deal.categories || []
        }))
        setFlashDeals(mappedDeals)
      }
    } catch (error) {
      console.error('Flash deals yükleme hatası:', error)
    } finally {
      setFlashLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await api.get('/admin/products') as any
      if (response.success) {
        setProducts(response.data || [])
      }
    } catch (error) {
      console.error('Ürünler yükleme hatası:', error)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await api.get('/admin/categories') as any
      if (response.success) {
        setCategories(response.data || [])
      }
    } catch (error) {
      console.error('Kategoriler yükleme hatası:', error)
    }
  }

  const handleFlashDelete = async (id: string | number) => {
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

  const handleFlashSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!flashFormData.name.trim()) {
      alert('Flash deal adı zorunludur!')
      return
    }
    
    if (flashFormData.discountValue <= 0) {
      alert('İndirim değeri 0\'dan büyük olmalıdır!')
      return
    }
    
    if (!flashFormData.startDate || !flashFormData.endDate) {
      alert('Başlangıç ve bitiş tarihleri zorunludur!')
      return
    }
    
    if (new Date(flashFormData.startDate) >= new Date(flashFormData.endDate)) {
      alert('Bitiş tarihi başlangıç tarihinden sonra olmalıdır!')
      return
    }

    if (selectedProducts.length === 0 && selectedCategories.length === 0) {
      alert('En az bir ürün veya kategori seçmelisiniz!')
      return
    }
    
    try {
      const submitData = {
        name: flashFormData.name,
        description: flashFormData.description,
        discount_type: flashFormData.discountType,
        discount_value: flashFormData.discountValue,
        start_date: flashFormData.startDate,
        end_date: flashFormData.endDate,
        is_active: flashFormData.isActive,
        product_ids: selectedProducts.map(p => p.id),
        category_ids: selectedCategories.map(c => c.id)
      }
      
      if (editingFlashDeal) {
        const response = await api.put(`/admin/flash-deals/${editingFlashDeal.id}`, submitData) as any
        if (response.success) {
          await loadFlashDeals()
        }
      } else {
        const response = await api.post('/admin/flash-deals', submitData) as any
        if (response.success) {
          await loadFlashDeals()
        }
      }
      
      setIsFlashModalOpen(false)
      setEditingFlashDeal(null)
      setSearchTerm('')
      setShowSearchResults(false)
      setSelectedProducts([])
      setSelectedCategories([])
      setFlashFormData({
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
    } catch (error) {
      console.error('Flash deal kaydetme hatası:', error)
      alert('Flash deal kaydedilirken bir hata oluştu: ' + (error as Error).message)
    }
  }

  const handleFlashEdit = (deal: FlashDeal) => {
    setEditingFlashDeal(deal)
    setFlashFormData({
      name: deal.name,
      description: deal.description || '',
      discountType: deal.discountType,
      discountValue: deal.discountValue,
      targetType: deal.targetType || 'category',
      targetId: deal.targetId,
      startDate: deal.startDate,
      endDate: deal.endDate,
      isActive: deal.isActive
    })
    
    // Load selected products and categories from deal
    if ((deal as any).products && Array.isArray((deal as any).products)) {
      setSelectedProducts((deal as any).products.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category || ''
      })))
    }
    
    if ((deal as any).categories && Array.isArray((deal as any).categories)) {
      setSelectedCategories((deal as any).categories.map((c: any) => ({
        id: c.id,
        name: c.name
      })))
    }
    
    setSearchTerm('')
    setShowSearchResults(false)
    setIsFlashModalOpen(true)
  }

  const toggleFlashActive = async (id: string | number) => {
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
    const dealWithExtras = deal as any
    if (dealWithExtras.products && Array.isArray(dealWithExtras.products) && dealWithExtras.products.length > 0) {
      const productNames = dealWithExtras.products.slice(0, 3).map((p: any) => p.name).join(', ')
      const remaining = dealWithExtras.products.length - 3
      return `${productNames}${remaining > 0 ? ` +${remaining} ürün` : ''}`
    }
    if (dealWithExtras.categories && Array.isArray(dealWithExtras.categories) && dealWithExtras.categories.length > 0) {
      const categoryNames = dealWithExtras.categories.slice(0, 3).map((c: any) => c.name).join(', ')
      const remaining = dealWithExtras.categories.length - 3
      return `${categoryNames}${remaining > 0 ? ` +${remaining} kategori` : ''}`
    }
    if (deal.targetType === 'category' && deal.targetId) {
      const category = categories.find(c => c.id === deal.targetId)
      return category ? category.name : 'Kategori'
    } else if (deal.targetType === 'product' && deal.targetId) {
      const product = products.find(p => p.id === deal.targetId)
      return product ? product.name : 'Ürün'
    }
    return 'Seçim yapılmamış'
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

  const getFilteredItems = () => {
    if (flashFormData.targetType === 'category') {
      return categories.filter(category => 
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    } else {
      return products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setShowSearchResults(term.length > 0)
  }

  const selectItem = (item: Product | Category) => {
    if (flashFormData.targetType === 'product') {
      if (!selectedProducts.find(p => p.id === item.id)) {
        setSelectedProducts([...selectedProducts, item as Product])
      }
    } else {
      if (!selectedCategories.find(c => c.id === item.id)) {
        setSelectedCategories([...selectedCategories, item as Category])
      }
    }
    setSearchTerm('')
    setShowSearchResults(false)
  }

  const removeSelectedItem = (item: Product | Category) => {
    if (flashFormData.targetType === 'product') {
      setSelectedProducts(selectedProducts.filter(p => p.id !== item.id))
    } else {
      setSelectedCategories(selectedCategories.filter(c => c.id !== item.id))
    }
  }

  const clearAllSelections = () => {
    setSelectedProducts([])
    setSelectedCategories([])
  }

  // Kampanya türü yardımcı fonksiyonları
  const getCampaignTypeLabel = (type: string) => {
    switch (type) {
      case 'discount': return 'İndirim'
      case 'shipping': return 'Kargo'
      case 'bogo': return 'X Al Y Öde'
      case 'flash': return 'Flash'
      case 'bundle': return 'Paket'
      default: return type
    }
  }

  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'discount': return 'bg-green-100 text-green-700'
      case 'shipping': return 'bg-blue-100 text-blue-700'
      case 'bogo': return 'bg-purple-100 text-purple-700'
      case 'flash': return 'bg-orange-100 text-orange-700'
      case 'bundle': return 'bg-pink-100 text-pink-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'discount': return <Percent className="w-4 h-4" />
      case 'shipping': return <Target className="w-4 h-4" />
      case 'bogo': return <TrendingUp className="w-4 h-4" />
      case 'flash': return <Clock className="w-4 h-4" />
      case 'bundle': return <BarChart3 className="w-4 h-4" />
      default: return <Megaphone className="w-4 h-4" />
    }
  }

  const formatCampaignDiscount = (campaign: Campaign) => {
    if (campaign.type === 'bogo') {
      return `${campaign.buyQuantity} Al ${campaign.getQuantity} Öde`
    }
    return campaign.discount
  }

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setFormData({ 
      name: campaign.name, 
      description: campaign.description || '', 
      type: campaign.type as 'discount' | 'shipping' | 'bogo' | 'flash' | 'bundle',
      discountType: campaign.type === 'bogo' ? 'bogo' : 'percentage', 
      discountValue: campaign.discount,
      minOrderAmount: campaign.minOrderAmount?.toString() || '', 
      maxDiscountAmount: campaign.maxDiscountAmount?.toString() || '',
      targetSegmentId: campaign.targetSegmentId || '', 
      applicableProducts: campaign.applicableProducts || '', 
      excludedProducts: campaign.excludedProducts || '',
      startDate: campaign.startDate || '', 
      endDate: campaign.endDate || '', 
      usageLimit: campaign.usageLimit?.toString() || '',
      buyQuantity: campaign.buyQuantity || 2,
      getQuantity: campaign.getQuantity || 1,
      discountPercentage: campaign.discountPercentage || 0
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Silmek istediğinizden emin misiniz?')) {
      setCampaigns(campaigns.filter(c => c.id !== id))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const campaignData: Partial<Campaign> = {
      ...formData,
      applicableProducts: selectedProductIds.join(','),
      excludedProducts: '',
      buyQuantity: formData.type === 'bogo' ? parseInt(formData.buyQuantity.toString()) : undefined,
      getQuantity: formData.type === 'bogo' ? parseInt(formData.getQuantity.toString()) : undefined,
      discountPercentage: formData.type === 'bogo' ? parseInt(formData.discountPercentage.toString()) : undefined,
      minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : undefined,
      maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : undefined,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
      discount: formData.type === 'bogo' ? `${formData.buyQuantity} Al ${formData.getQuantity} Öde` : formData.discountValue
    }
    
    if (editingCampaign) {
      setCampaigns(campaigns.map(c => c.id === editingCampaign.id ? { 
        ...c, 
        ...campaignData,
        views: c.views, 
        conversions: c.conversions 
      } as Campaign : c))
    } else {
      setCampaigns([...campaigns, { 
        id: Date.now(), 
        ...campaignData,
        status: 'active', 
        views: 0, 
        conversions: 0,
        usedCount: 0,
        discount: campaignData.discount || ''
      } as Campaign])
    }
    
    setIsModalOpen(false)
    setEditingCampaign(null)
    setFormData({ 
      name: '', 
      description: '', 
      type: 'discount',
      discountType: 'percentage', 
      discountValue: '',
      minOrderAmount: '', 
      maxDiscountAmount: '',
      targetSegmentId: '', 
      applicableProducts: '', 
      excludedProducts: '',
      startDate: '', 
      endDate: '', 
      usageLimit: '',
      buyQuantity: 2,
      getQuantity: 1,
      discountPercentage: 0
    })
  }

  useEffect(() => {
    let alive = true
    ;(async()=>{
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`https://api.plaxsy.com/api/campaigns?page=${page}&limit=50`, { headers:{ Accept:'application/json' } })
        const data = await res.json()
        if (alive && data?.success && Array.isArray(data.data)) setCampaigns(data.data)
      } catch (e:any) {
        setError(e?.message || 'Kampanyalar yüklenemedi')
      } finally { setLoading(false) }
    })()
    return () => { alive = false }
  }, [page])

  // Flash Deals yükleme
  useEffect(() => {
    loadFlashDeals()
    loadProducts()
    loadCategories()
  }, [])

  // Uzak ürün arama
  useEffect(()=>{
    let alive = true
    const run = async()=>{
      if (!productQuery || productQuery.length < 2) { setProductsSearch([]); return }
      try {
        setSearching('products')
        const res = await fetch(`https://api.plaxsy.com/api/products/search?q=${encodeURIComponent(productQuery)}&limit=10`, { headers:{ Accept:'application/json' } })
        const data = await res.json()
        if (alive && data?.success) setProductsSearch(data.data || [])
      } catch { /* ignore */ } finally { if (alive) setSearching('none') }
    }
    const t = setTimeout(run, 300)
    return ()=>{ alive = false; clearTimeout(t) }
  }, [productQuery])

  // Uzak kategori arama
  useEffect(()=>{
    let alive = true
    const run = async()=>{
      if (!categoryQuery || categoryQuery.length < 2) { setCategoriesSearch([]); return }
      try {
        setSearching('categories')
        const res = await fetch(`https://api.plaxsy.com/api/categories/search?q=${encodeURIComponent(categoryQuery)}&limit=10`, { headers:{ Accept:'application/json' } })
        const data = await res.json()
        if (alive && data?.success) setCategoriesSearch(data.data || [])
      } catch { /* ignore */ } finally { if (alive) setSearching('none') }
    }
    const t = setTimeout(run, 300)
    return ()=>{ alive = false; clearTimeout(t) }
  }, [categoryQuery])

  const filtered = useMemo(()=>{
    const tabFilter = activeTab === 'flash' ? (c: Campaign) => c.type === 'flash' : (c: Campaign) => (activeTab==='all' || c.status===activeTab)
    return campaigns
      .filter(c => tabFilter(c as any))
      .filter(c => (statusFilter==='all' || c.status===statusFilter))
      .filter(c => (!query || c.name.toLowerCase().includes(query.toLowerCase())))
  }, [campaigns, statusFilter, query, activeTab])

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Kampanya Yönetimi</h1>
            <p className="text-blue-100 text-lg">Kampanyalarınızı oluşturun, analiz edin ve optimize edin</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input 
                value={query} 
                onChange={(e)=>setQuery(e.target.value)} 
                placeholder="Kampanya ara..." 
                className="w-full sm:w-64 px-4 py-3 pl-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30" 
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <select 
              value={statusFilter} 
              onChange={(e)=>setStatusFilter(e.target.value as any)} 
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <option value="all" className="text-gray-800">Tümü</option>
              <option value="active" className="text-gray-800">Aktif</option>
              <option value="ended" className="text-gray-800">Bitti</option>
            </select>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yeni Kampanya
            </button>
          </div>
        </div>
      </div>

      {/* Modern Tab Navigation */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2">
        <div className="flex flex-wrap gap-2">
          {[
            { key:'all', label:'Tümü', icon: <Megaphone className="w-4 h-4" /> },
            { key:'active', label:'Aktif', icon: <CheckCircle2 className="w-4 h-4" /> },
            { key:'ended', label:'Bitti', icon: <Clock className="w-4 h-4" /> },
            { key:'flash', label:'Flash İndirimler', icon: <TrendingUp className="w-4 h-4" /> },
          ].map((t:any)=> (
            <button
              key={t.key}
              onClick={()=>setActiveTab(t.key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab===t.key 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modern KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-green-600">{campaigns.filter(c => c.status === 'active').length}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Aktif Kampanyalar</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Şu anda çalışan kampanyalar</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-blue-600">{campaigns.reduce((sum, c) => sum + c.views, 0).toLocaleString()}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Toplam Görüntülenme</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Tüm kampanyaların toplam görüntülenmesi</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-purple-600">{campaigns.reduce((sum, c) => sum + c.conversions, 0).toLocaleString()}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Toplam Dönüşüm</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Kampanyalardan gelen dönüşümler</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-orange-600">
              {(() => {
                const views = campaigns.reduce((sum, c) => sum + c.views, 0)
                const conv = campaigns.reduce((sum, c) => sum + c.conversions, 0)
                return views > 0 ? ((conv / views) * 100).toFixed(1) : '0.0'
              })()}%
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Dönüşüm Oranı</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Görüntülenme başına dönüşüm</p>
        </motion.div>
      </div>

      {/* Flash İndirimler Bölümü */}
      {activeTab === 'flash' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Flash İndirimler</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Hızlı indirim kampanyalarını yönetin</p>
            </div>
            <button
              onClick={() => { 
                setEditingFlashDeal(null)
                setFlashFormData({
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
                setIsFlashModalOpen(true) 
              }}
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yeni Flash Deal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Aktif Flash Deal</p>
              <p className="text-3xl font-bold text-orange-600">{flashDeals.filter(d => d.isActive && isActive(d.startDate, d.endDate)).length}</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Süresi Dolmuş</p>
              <p className="text-3xl font-bold text-red-600">{flashDeals.filter(d => isExpired(d.endDate)).length}</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Flash Deal</p>
              <p className="text-3xl font-bold text-blue-600">{flashDeals.length}</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Ortalama İndirim</p>
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
                className={`bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden border-2 ${
                  isActive(deal.startDate, deal.endDate) 
                    ? 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/20' 
                    : isExpired(deal.endDate)
                    ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{deal.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        isActive(deal.startDate, deal.endDate)
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                          : isExpired(deal.endDate)
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {isActive(deal.startDate, deal.endDate) ? 'Aktif' : isExpired(deal.endDate) ? 'Süresi Dolmuş' : 'Beklemede'}
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        deal.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {deal.isActive ? 'Etkin' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                  
                  {deal.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{deal.description}</p>
                  )}

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 text-sm">İndirim</span>
                      <span className="font-bold text-orange-600">
                        {deal.discountType === 'percentage' 
                          ? `%${deal.discountValue || 0}` 
                          : `${deal.discountValue || 0}₺`
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 text-sm">Hedef</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{getTargetName(deal) || 'Seçim yapılmamış'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 text-sm">Bitiş</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {deal.endDate ? (() => {
                          try {
                            const date = new Date(deal.endDate);
                            return isNaN(date.getTime()) ? 'Geçersiz Tarih' : date.toLocaleDateString('tr-TR');
                          } catch {
                            return 'Geçersiz Tarih';
                          }
                        })() : 'Tarih belirtilmemiş'}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setViewingFlashDeal(deal)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="w-4 h-4 inline mr-1" />
                      Görüntüle
                    </button>
                    <button
                      onClick={() => handleFlashEdit(deal)}
                      className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      <Edit className="w-4 h-4 inline mr-1" />
                      Düzenle
                    </button>
                    <button
                      onClick={() => toggleFlashActive(deal.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        deal.isActive 
                          ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' 
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {deal.isActive ? 'Pasif' : 'Aktif'}
                    </button>
                    <button
                      onClick={() => handleFlashDelete(deal.id)}
                      className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Modern Campaign Table */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kampanyalar</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Tüm kampanyalarınızı buradan yönetin</p>
            </div>
            <button onClick={async()=>{
              const presets = [
                { name:'Yeni Üye %10', type:'discount', discountType:'percentage', discountValue:10 },
                { name:'Sepette %15', type:'discount', discountType:'percentage', discountValue:15 },
                { name:'Kargo Bedava 500+', type:'shipping', discountType:'fixed', discountValue:0, minOrderAmount:500 },
                { name:'2 Al 1 Öde', type:'bogo', discountType:'bogo', discountValue:0, buyQuantity:2, getQuantity:1 },
                { name:'3 Al 2 Öde', type:'bogo', discountType:'bogo', discountValue:0, buyQuantity:3, getQuantity:2 },
                { name:'Hafta Sonu %20', type:'discount', discountType:'percentage', discountValue:20 },
                { name:'Öğrenci %12', type:'discount', discountType:'percentage', discountValue:12 },
                { name:'Sadakat %5', type:'discount', discountType:'percentage', discountValue:5 },
                { name:'Cüzdanla %7', type:'discount', discountType:'percentage', discountValue:7 },
                { name:'Yaz Fırsatı %18', type:'discount', discountType:'percentage', discountValue:18 },
                { name:'Kış Fırsatı %22', type:'discount', discountType:'percentage', discountValue:22 },
                { name:'Hafta İçi %9', type:'discount', discountType:'percentage', discountValue:9 },
                { name:'VIP %25', type:'discount', discountType:'percentage', discountValue:25 },
                { name:'Sepette 100₺', type:'discount', discountType:'fixed', discountValue:100 },
                { name:'EFT %3 İndirim', type:'discount', discountType:'percentage', discountValue:3 },
              ]
              try {
                for (const p of presets) {
                  await fetch('https://api.plaxsy.com/api/campaigns', {
                    method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' },
                    body: JSON.stringify({ 
                      name: p.name, 
                      description:'Otomatik kurulum', 
                      type: p.type, 
                      discountType: p.discountType, 
                      discountValue: p.discountValue, 
                      minOrderAmount: (p as any).minOrderAmount || 0, 
                      buyQuantity: (p as any).buyQuantity || undefined,
                      getQuantity: (p as any).getQuantity || undefined,
                      startDate: new Date().toISOString(), 
                      endDate: new Date(Date.now()+7*86400000).toISOString() 
                    })
                  })
                }
                alert('15 kampanya şablonu gönderildi')
              } catch { alert('Kampanyalar oluşturulurken hata oluştu') }
            }} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow">
              <Plus className="w-4 h-4 inline mr-2" />
              Toplu Oluştur
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kampanya</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tür</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İndirim</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Görüntülenme</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Dönüşüm</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((campaign, index) => (
                <motion.tr
                  key={campaign.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                        {getCampaignTypeIcon(campaign.type)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{campaign.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCampaignTypeColor(campaign.type)}`}>
                      {getCampaignTypeIcon(campaign.type)}
                      <span className="ml-1">{getCampaignTypeLabel(campaign.type)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-green-600">{formatCampaignDiscount(campaign)}</div>
                    {campaign.type === 'bogo' && campaign.discountPercentage && campaign.discountPercentage > 0 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">+ %{campaign.discountPercentage} ek indirim</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold">{campaign.views.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="font-semibold">{campaign.conversions}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-700' : 
                      campaign.status === 'ended' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {campaign.status === 'active' ? 'Aktif' : 
                       campaign.status === 'ended' ? 'Sona Erdi' : 'Taslak'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEdit(campaign)}
                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(campaign.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Campaign Modal */}
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
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-bold">{editingCampaign ? 'Kampanya Düzenle' : 'Yeni Kampanya'}</h3>
                    <p className="text-blue-100 mt-1">Kampanya detaylarını doldurun</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Temel Bilgiler */}
                <div className="space-y-4">
                  <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Temel Bilgiler</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Kampanya Adı *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={(e)=>setFormData({...formData,name:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                        placeholder="Kampanya adını girin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Kampanya Türü *</label>
                      <select 
                        value={formData.type} 
                        onChange={(e)=>setFormData({...formData,type:e.target.value as any})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                      >
                        <option value="discount">İndirim Kampanyası</option>
                        <option value="shipping">Kargo Kampanyası</option>
                        <option value="bogo">X Al Y Öde</option>
                        <option value="bundle">Paket Kampanyası</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Açıklama</label>
                    <textarea 
                      value={formData.description} 
                      onChange={(e)=>setFormData({...formData,description:e.target.value})} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                      rows={3} 
                      placeholder="Kampanya açıklaması"
                    />
                  </div>
                </div>

                {/* İndirim Ayarları */}
                <div className="space-y-4">
                  <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">İndirim Ayarları</h4>
                  
                  {formData.type === 'bogo' ? (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center mb-4">
                        <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
                        <h5 className="text-lg font-semibold text-purple-800 dark:text-purple-300">X Al Y Öde Ayarları</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Alınacak Adet *</label>
                          <input 
                            type="number" 
                            min="1" 
                            value={formData.buyQuantity} 
                            onChange={(e)=>setFormData({...formData,buyQuantity:parseInt(e.target.value) || 2})} 
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Ödenecek Adet *</label>
                          <input 
                            type="number" 
                            min="1" 
                            value={formData.getQuantity} 
                            onChange={(e)=>setFormData({...formData,getQuantity:parseInt(e.target.value) || 1})} 
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Ek İndirim (%)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={formData.discountPercentage} 
                            onChange={(e)=>setFormData({...formData,discountPercentage:parseInt(e.target.value) || 0})} 
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                            placeholder="Ek indirim yüzdesi"
                          />
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-white dark:bg-dark-card rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Önizleme:</div>
                        <div className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                          {formData.buyQuantity} Al {formData.getQuantity} Öde
                          {formData.discountPercentage > 0 && ` + %${formData.discountPercentage} ek indirim`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700">İndirim Türü</label>
                        <select 
                          value={formData.discountType} 
                          onChange={(e)=>setFormData({...formData,discountType:e.target.value as any})} 
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="percentage">Yüzde (%)</option>
                          <option value="fixed">Sabit Tutar (₺)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">İndirim Değeri</label>
                        <input 
                          type="number" 
                          value={formData.discountValue} 
                          onChange={(e)=>setFormData({...formData,discountValue:e.target.value})} 
                          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                          placeholder="İndirim değeri"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Min. Sepet Tutarı</label>
                        <input 
                          type="number" 
                          value={formData.minOrderAmount} 
                          onChange={(e)=>setFormData({...formData,minOrderAmount:e.target.value})} 
                          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                          placeholder="Minimum sepet tutarı"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Hedefleme */}
                <div className="space-y-4">
                  <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Hedefleme</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Max. İndirim Tutarı</label>
                      <input 
                        type="number" 
                        value={formData.maxDiscountAmount} 
                        onChange={(e)=>setFormData({...formData,maxDiscountAmount:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                        placeholder="Maksimum indirim"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Segment ID</label>
                      <input 
                        type="text" 
                        value={formData.targetSegmentId} 
                        onChange={(e)=>setFormData({...formData,targetSegmentId:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                        placeholder="Hedef segment"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Kullanım Limiti</label>
                      <input 
                        type="number" 
                        value={formData.usageLimit} 
                        onChange={(e)=>setFormData({...formData,usageLimit:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                        placeholder="Kullanım limiti"
                      />
                    </div>
                  </div>
                </div>

                {/* Tarih Aralığı */}
                <div className="space-y-4">
                  <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Tarih Aralığı</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Başlangıç Tarihi</label>
                      <input 
                        type="datetime-local" 
                        value={formData.startDate} 
                        onChange={(e)=>setFormData({...formData,startDate:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Bitiş Tarihi</label>
                      <input 
                        type="datetime-local" 
                        value={formData.endDate} 
                        onChange={(e)=>setFormData({...formData,endDate:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                      />
                    </div>
                  </div>
                </div>

                {/* Ürün/Kategori Seçimi */}
                <div className="space-y-4">
                  <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Hedef Ürünler ve Kategoriler</h4>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700">Hedef Ürünler</label>
                      <div className="flex gap-2">
                        <input 
                          value={productQuery} 
                          onChange={(e)=>setProductQuery(e.target.value)} 
                          placeholder="Ürün ara..." 
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                        />
                        <button 
                          type="button" 
                          onClick={()=>setProductQuery('')} 
                          className="px-4 py-3 border border-slate-300 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                        >
                          Temizle
                        </button>
                      </div>
                      {productsSearch.length > 0 && (
                        <div className="mt-2 max-h-48 overflow-auto border border-slate-300 rounded-xl">
                          {productsSearch.map((p:any)=>{
                            const checked = selectedProductIds.includes(Number(p.id))
                            return (
                              <label key={p.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0 hover:bg-slate-50">
                                <input 
                                  type="checkbox" 
                                  checked={checked} 
                                  onChange={(e)=>{
                                    const id = Number(p.id)
                                    setSelectedProductIds(prev => e.target.checked ? [...new Set([...prev, id])] : prev.filter(x=>x!==id))
                                  }} 
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700">{p.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                      {selectedProductIds.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedProductIds.map(id => (
                            <span key={id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                              #{id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700">Hedef Kategoriler</label>
                      <div className="flex gap-2">
                        <input 
                          value={categoryQuery} 
                          onChange={(e)=>setCategoryQuery(e.target.value)} 
                          placeholder="Kategori ara..." 
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                        />
                        <button 
                          type="button" 
                          onClick={()=>setCategoryQuery('')} 
                          className="px-4 py-3 border border-slate-300 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                        >
                          Temizle
                        </button>
                      </div>
                      {categoriesSearch.length > 0 && (
                        <div className="mt-2 max-h-48 overflow-auto border border-slate-300 rounded-xl">
                          {categoriesSearch.map((c:any)=>{
                            const checked = selectedCategoryIds.includes(Number(c.id))
                            return (
                              <label key={c.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0 hover:bg-slate-50">
                                <input 
                                  type="checkbox" 
                                  checked={checked} 
                                  onChange={(e)=>{
                                    const id = Number(c.id)
                                    setSelectedCategoryIds(prev => e.target.checked ? [...new Set([...prev, id])] : prev.filter(x=>x!==id))
                                  }} 
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700">{c.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                      {selectedCategoryIds.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedCategoryIds.map(id => (
                            <span key={id} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                              #{id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Butonları */}
                <div className="flex space-x-4 pt-6 border-t border-slate-200">
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl flex items-center justify-center font-semibold hover:shadow-lg transition-all"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {editingCampaign ? 'Güncelle' : 'Kaydet'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-8 py-4 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash İndirimler Modal */}
      <AnimatePresence>
        {isFlashModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsFlashModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onBlur={() => {
                setTimeout(() => setShowSearchResults(false), 200)
              }}
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{editingFlashDeal ? 'Flash Deal Düzenle' : 'Yeni Flash Deal'}</h3>
                <button onClick={() => setIsFlashModalOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleFlashSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Ad *</label>
                  <input
                    type="text"
                    required
                    value={flashFormData.name}
                    onChange={(e) => setFlashFormData({ ...flashFormData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                    placeholder="Flash deal adı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Açıklama</label>
                  <textarea
                    value={flashFormData.description}
                    onChange={(e) => setFlashFormData({ ...flashFormData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                    rows={3}
                    placeholder="Flash deal açıklaması"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">İndirim Türü *</label>
                    <select
                      value={flashFormData.discountType}
                      onChange={(e) => setFlashFormData({ ...flashFormData, discountType: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                    >
                      <option value="percentage">Yüzde (%)</option>
                      <option value="fixed">Sabit Tutar (₺)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">İndirim Değeri *</label>
                    <input
                      type="number"
                      required
                      value={flashFormData.discountValue}
                      onChange={(e) => setFlashFormData({ ...flashFormData, discountValue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Ürün ve Kategori Seçimi</h4>
                  
                  {/* Ürün Seçimi */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                      Ürünler
                      <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">
                        {selectedProducts.length} ürün seçildi
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={flashFormData.targetType === 'product' ? searchTerm : ''}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setFlashFormData({ ...flashFormData, targetType: 'product' })
                          setShowSearchResults(true)
                        }}
                        onFocus={() => {
                          setFlashFormData({ ...flashFormData, targetType: 'product' })
                          setShowSearchResults(true)
                        }}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                        placeholder="Ürün ara..."
                      />
                      {showSearchResults && flashFormData.targetType === 'product' && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-card border border-gray-300 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {getFilteredItems().map(item => {
                            const isSelected = selectedProducts.find(p => p.id === item.id) !== undefined
                            return (
                              <div key={item.id} className="p-2">
                                <button
                                  type="button"
                                  onClick={() => selectItem(item)}
                                  disabled={isSelected}
                                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                                    isSelected 
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-not-allowed' 
                                      : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100'
                                  }`}
                                >
                                  <div className="font-medium flex items-center justify-between">
                                    <span>{item.name}</span>
                                    {isSelected && <span className="text-xs">✓ Seçildi</span>}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400">{(item as Product).category}</div>
                                </button>
                              </div>
                            )
                          })}
                          {getFilteredItems().length === 0 && (
                            <div className="p-3 text-sm text-gray-500 dark:text-slate-400 text-center">
                              Ürün bulunamadı
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kategori Seçimi */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                      Kategoriler
                      <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">
                        {selectedCategories.length} kategori seçildi
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={flashFormData.targetType === 'category' ? searchTerm : ''}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setFlashFormData({ ...flashFormData, targetType: 'category' })
                          setShowSearchResults(true)
                        }}
                        onFocus={() => {
                          setFlashFormData({ ...flashFormData, targetType: 'category' })
                          setShowSearchResults(true)
                        }}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                        placeholder="Kategori ara..."
                      />
                      {showSearchResults && flashFormData.targetType === 'category' && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-card border border-gray-300 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {getFilteredItems().map(item => {
                            const isSelected = selectedCategories.find(c => c.id === item.id) !== undefined
                            return (
                              <div key={item.id} className="p-2">
                                <button
                                  type="button"
                                  onClick={() => selectItem(item)}
                                  disabled={isSelected}
                                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                                    isSelected 
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-not-allowed' 
                                      : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100'
                                  }`}
                                >
                                  <div className="font-medium flex items-center justify-between">
                                    <span>{item.name}</span>
                                    {isSelected && <span className="text-xs">✓ Seçildi</span>}
                                  </div>
                                </button>
                              </div>
                            )
                          })}
                          {getFilteredItems().length === 0 && (
                            <div className="p-3 text-sm text-gray-500 dark:text-slate-400 text-center">
                              Kategori bulunamadı
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seçilen Öğeler */}
                  {(selectedProducts.length > 0 || selectedCategories.length > 0) && (
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-800 dark:text-slate-100">Seçilenler</h4>
                        <button
                          type="button"
                          onClick={clearAllSelections}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          Tümünü Temizle
                        </button>
                      </div>
                      
                      {selectedProducts.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Ürünler ({selectedProducts.length})</div>
                          <div className="space-y-2">
                            {selectedProducts.map(item => (
                              <div key={item.id} className="flex items-center justify-between bg-white dark:bg-dark-card rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{item.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400">{item.category}</div>
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
                      
                      {selectedCategories.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Kategoriler ({selectedCategories.length})</div>
                          <div className="space-y-2">
                            {selectedCategories.map(item => (
                              <div key={item.id} className="flex items-center justify-between bg-white dark:bg-dark-card rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{item.name}</div>
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
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Başlangıç Tarihi *</label>
                    <input
                      type="datetime-local"
                      required
                      value={flashFormData.startDate}
                      onChange={(e) => setFlashFormData({ ...flashFormData, startDate: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Bitiş Tarihi *</label>
                    <input
                      type="datetime-local"
                      required
                      value={flashFormData.endDate}
                      onChange={(e) => setFlashFormData({ ...flashFormData, endDate: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={flashFormData.isActive}
                    onChange={(e) => setFlashFormData({ ...flashFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-orange-600 border-gray-300 dark:border-slate-600 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Aktif
                  </label>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl flex items-center justify-center">
                    <Save className="w-5 h-5 mr-2" />
                    {editingFlashDeal ? 'Güncelle' : 'Kaydet'}
                  </button>
                  <button type="button" onClick={() => setIsFlashModalOpen(false)} className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash Deal Detay Modal */}
      <AnimatePresence>
        {viewingFlashDeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingFlashDeal(null)}
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
                  onClick={() => setViewingFlashDeal(null)}
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
                    <h4 className="text-2xl font-bold text-slate-800">{viewingFlashDeal.name}</h4>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        isActive(viewingFlashDeal.startDate, viewingFlashDeal.endDate)
                          ? 'bg-orange-100 text-orange-700'
                          : isExpired(viewingFlashDeal.endDate)
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isActive(viewingFlashDeal.startDate, viewingFlashDeal.endDate) ? 'Aktif' : isExpired(viewingFlashDeal.endDate) ? 'Süresi Dolmuş' : 'Beklemede'}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        viewingFlashDeal.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {viewingFlashDeal.isActive ? 'Etkin' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                </div>

                {viewingFlashDeal.description && (
                  <div>
                    <h5 className="text-lg font-semibold text-slate-800 mb-2">Açıklama</h5>
                    <p className="text-slate-600">{viewingFlashDeal.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center text-orange-600 mb-2">
                      <Percent className="w-5 h-5 mr-2" />
                      <p className="text-sm font-medium">İndirim</p>
                    </div>
                    <p className="text-3xl font-bold text-orange-700">
                      {viewingFlashDeal.discountType === 'percentage' 
                        ? `%${viewingFlashDeal.discountValue}` 
                        : `${viewingFlashDeal.discountValue}₺`
                      }
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center text-blue-600 mb-2">
                      <Target className="w-5 h-5 mr-2" />
                      <p className="text-sm font-medium">Hedef</p>
                    </div>
                    <p className="text-lg font-bold text-blue-700">{getTargetName(viewingFlashDeal)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center text-green-600 mb-2">
                      <Clock className="w-5 h-5 mr-2" />
                      <p className="text-sm font-medium">Bitiş</p>
                    </div>
                    <p className="text-lg font-bold text-green-700">
                      {new Date(viewingFlashDeal.endDate).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6">
                  <h5 className="font-semibold text-slate-800 mb-4">Zaman Bilgileri</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Başlangıç</span>
                      <span className="font-bold text-slate-800">
                        {new Date(viewingFlashDeal.startDate).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Bitiş</span>
                      <span className="font-bold text-slate-800">
                        {new Date(viewingFlashDeal.endDate).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Süre</span>
                      <span className="font-bold text-slate-800">
                        {Math.ceil((new Date(viewingFlashDeal.endDate).getTime() - new Date(viewingFlashDeal.startDate).getTime()) / (1000 * 60 * 60 * 24))} gün
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewingFlashDeal(null)}
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
