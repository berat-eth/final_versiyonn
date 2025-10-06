'use client'

import { useEffect, useMemo, useState } from 'react'
import { Megaphone, Plus, Edit, Trash2, TrendingUp, X, Save, Eye, BarChart3, CheckCircle2 } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'ended'>('all')
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'all'|'active'|'ended'|'flash'>('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({ 
    name: '', description: '', type: 'discount',
    discountType: 'percentage', discountValue: '',
    minOrderAmount: '', maxDiscountAmount: '',
    targetSegmentId: '', applicableProducts: '', excludedProducts: '',
    startDate: '', endDate: '', usageLimit: ''
  })
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [categoryQuery, setCategoryQuery] = useState('')
  const [productsSearch, setProductsSearch] = useState<any[]>([])
  const [categoriesSearch, setCategoriesSearch] = useState<any[]>([])
  const [searching, setSearching] = useState<'none'|'products'|'categories'>('none')

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setFormData({ 
      name: campaign.name, description: '', type: 'discount',
      discountType: 'percentage', discountValue: '',
      minOrderAmount: '', maxDiscountAmount: '',
      targetSegmentId: '', applicableProducts: '', excludedProducts: '',
      startDate: '', endDate: '', usageLimit: ''
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
    if (editingCampaign) {
      setCampaigns(campaigns.map(c => c.id === editingCampaign.id ? { ...c, name: formData.name, type: formData.type as any, discount: String(formData.discountValue), status: c.status, views: c.views, conversions: c.conversions } : c))
    } else {
      setCampaigns([...campaigns, { id: Date.now(), name: formData.name, type: formData.type as any, discount: String(formData.discountValue), status: 'active', views: 0, conversions: 0 } as any])
    }
    // Form gönderiminde seçilen hedefleri API sözleşmesine uygun string olarak da saklayalım
    setFormData(prev => ({
      ...prev,
      applicableProducts: selectedProductIds.join(','),
      excludedProducts: '',
    }))
    setIsModalOpen(false)
  }

  useEffect(() => {
    let alive = true
    ;(async()=>{
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`https://api.zerodaysoftware.tr/api/campaigns?page=${page}&limit=50`, { headers:{ Accept:'application/json' } })
        const data = await res.json()
        if (alive && data?.success && Array.isArray(data.data)) setCampaigns(data.data)
      } catch (e:any) {
        setError(e?.message || 'Kampanyalar yüklenemedi')
      } finally { setLoading(false) }
    })()
    return () => { alive = false }
  }, [page])

  // Uzak ürün arama
  useEffect(()=>{
    let alive = true
    const run = async()=>{
      if (!productQuery || productQuery.length < 2) { setProductsSearch([]); return }
      try {
        setSearching('products')
        const res = await fetch(`https://api.zerodaysoftware.tr/api/products/search?q=${encodeURIComponent(productQuery)}&limit=10`, { headers:{ Accept:'application/json' } })
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
        const res = await fetch(`https://api.zerodaysoftware.tr/api/categories/search?q=${encodeURIComponent(categoryQuery)}&limit=10`, { headers:{ Accept:'application/json' } })
        const data = await res.json()
        if (alive && data?.success) setCategoriesSearch(data.data || [])
      } catch { /* ignore */ } finally { if (alive) setSearching('none') }
    }
    const t = setTimeout(run, 300)
    return ()=>{ alive = false; clearTimeout(t) }
  }, [categoryQuery])

  const filtered = useMemo(()=>{
    const tabFilter = activeTab === 'flash' ? (c: Campaign) => c.type === 'flash' as any : (c: Campaign) => (activeTab==='all' || c.status===activeTab)
    return campaigns
      .filter(c => tabFilter(c as any))
      .filter(c => (statusFilter==='all' || c.status===statusFilter))
      .filter(c => (!query || c.name.toLowerCase().includes(query.toLowerCase())))
  }, [campaigns, statusFilter, query, activeTab])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kampanya Yönetimi</h2>
          <p className="text-slate-500 mt-1">Kampanyalarınızı oluşturun, analiz edin ve optimize edin</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Ara..." className="px-3 py-2 border rounded-lg" />
          <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)} className="px-3 py-2 border rounded-lg">
            <option value="all">Tümü</option>
            <option value="active">Aktif</option>
            <option value="ended">Bitti</option>
          </select>
          <button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl flex items-center hover:shadow-lg">
            <Plus className="w-5 h-5 mr-2" />Yeni Kampanya
          </button>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="bg-white rounded-xl p-1 shadow-sm flex gap-1 w-full md:w-max">
        {[
          { key:'all', label:'Tümü' },
          { key:'active', label:'Aktif' },
          { key:'ended', label:'Bitti' },
          { key:'flash', label:'Flash' },
        ].map((t:any)=> (
          <button
            key={t.key}
            onClick={()=>setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm ${activeTab===t.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >{t.label}</button>
        ))}
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">Aktif Kampanyalar</p>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-green-600">{campaigns.filter(c => c.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">Toplam Görüntülenme</p>
            <Eye className="w-4 h-4 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-600">{campaigns.reduce((sum, c) => sum + c.views, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">Toplam Dönüşüm</p>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-purple-600">{campaigns.reduce((sum, c) => sum + c.conversions, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">Dönüşüm Oranı</p>
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-orange-600">
            {(() => {
              const views = campaigns.reduce((sum, c) => sum + c.views, 0)
              const conv = campaigns.reduce((sum, c) => sum + c.conversions, 0)
              return views > 0 ? ((conv / views) * 100).toFixed(1) : '0.0'
            })()}%
          </p>
        </div>
      </div>

      {/* Flash İndirimler bölümü kaldırıldı */}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-800">Hızlı 15 Kampanya Kurulumu</h3>
          <button onClick={async()=>{
            const presets = [
              { name:'Yeni Üye %10', type:'discount', discountType:'percentage', discountValue:10 },
              { name:'Sepette %15', type:'discount', discountType:'percentage', discountValue:15 },
              { name:'Kargo Bedava 500+', type:'shipping', discountType:'fixed', discountValue:0, minOrderAmount:500 },
              { name:'2 Al 1 Öde', type:'bogo', discountType:'buy_x_get_y', discountValue:0 },
              { name:'Hafta Sonu %20', type:'discount', discountType:'percentage', discountValue:20 },
              { name:'Öğrenci %12', type:'discount', discountType:'percentage', discountValue:12 },
              { name:'Sadakat %5', type:'discount', discountType:'percentage', discountValue:5 },
              { name:'Cüzdanla %7', type:'discount', discountType:'percentage', discountValue:7 },
              { name:'Yaz Fırsatı %18', type:'discount', discountType:'percentage', discountValue:18 },
              { name:'Kış Fırsatı %22', type:'discount', discountType:'percentage', discountValue:22 },
              { name:'Hafta İçi %9', type:'discount', discountType:'percentage', discountValue:9 },
              { name:'VIP %25', type:'discount', discountType:'percentage', discountValue:25 },
              { name:'Sepette 100₺', type:'discount', discountType:'fixed', discountValue:100 },
              { name:'3. Ürüne %50', type:'discount', discountType:'percentage', discountValue:50 },
              { name:'EFT %3 İndirim', type:'discount', discountType:'percentage', discountValue:3 },
            ]
            try {
              for (const p of presets) {
                await fetch('https://api.zerodaysoftware.tr/api/campaigns', {
                  method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' },
                  body: JSON.stringify({ name: p.name, description:'Otomatik kurulum', type: p.type, discountType: p.discountType, discountValue: p.discountValue, minOrderAmount: (p as any).minOrderAmount || 0, startDate: new Date().toISOString(), endDate: new Date(Date.now()+7*86400000).toISOString() })
                })
              }
              alert('15 kampanya şablonu gönderildi')
            } catch { alert('Kampanyalar oluşturulurken hata oluştu') }
          }} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm">Toplu Oluştur</button>
        </div>
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
              {filtered.map((campaign, index) => (
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Kampanya Adı *</label>
                    <input type="text" required value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tür</label>
                    <select value={formData.type} onChange={(e)=>setFormData({...formData,type:e.target.value})} className="w-full px-4 py-3 border rounded-xl">
                      <option value="discount">İndirim</option>
                      <option value="shipping">Kargo</option>
                      <option value="bogo">X Al Y Öde</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">İndirim Türü</label>
                    <select value={formData.discountType} onChange={(e)=>setFormData({...formData,discountType:e.target.value})} className="w-full px-4 py-3 border rounded-xl">
                      <option value="percentage">Yüzde (%)</option>
                      <option value="fixed">Sabit (₺)</option>
                      <option value="buy_x_get_y">X al Y öde</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">İndirim Değeri</label>
                    <input type="number" value={formData.discountValue} onChange={(e)=>setFormData({...formData,discountValue:e.target.value})} className="w-full px-4 py-3 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Min. Sepet</label>
                    <input type="number" value={formData.minOrderAmount} onChange={(e)=>setFormData({...formData,minOrderAmount:e.target.value})} className="w-full px-4 py-3 border rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Max. İndirim</label>
                    <input type="number" value={formData.maxDiscountAmount} onChange={(e)=>setFormData({...formData,maxDiscountAmount:e.target.value})} className="w-full px-4 py-3 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Segment ID</label>
                    <input type="text" value={formData.targetSegmentId} onChange={(e)=>setFormData({...formData,targetSegmentId:e.target.value})} className="w-full px-4 py-3 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Kullanım Limiti</label>
                    <input type="number" value={formData.usageLimit} onChange={(e)=>setFormData({...formData,usageLimit:e.target.value})} className="w-full px-4 py-3 border rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Başlangıç Tarihi</label>
                    <input type="datetime-local" value={formData.startDate} onChange={(e)=>setFormData({...formData,startDate:e.target.value})} className="w-full px-4 py-3 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bitiş Tarihi</label>
                    <input type="datetime-local" value={formData.endDate} onChange={(e)=>setFormData({...formData,endDate:e.target.value})} className="w-full px-4 py-3 border rounded-xl" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Hedef Ürünler</label>
                    <div className="flex gap-2">
                      <input value={productQuery} onChange={(e)=>setProductQuery(e.target.value)} placeholder="Ürün ara..." className="flex-1 px-4 py-3 border rounded-xl" />
                      <button type="button" onClick={()=>setProductQuery('')} className="px-3 py-2 border rounded-xl text-sm">Temizle</button>
                    </div>
                    {productsSearch.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-auto border rounded-xl">
                        {productsSearch.map((p:any)=>{
                          const checked = selectedProductIds.includes(Number(p.id))
                          return (
                            <label key={p.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0">
                              <input type="checkbox" checked={checked} onChange={(e)=>{
                                const id = Number(p.id)
                                setSelectedProductIds(prev => e.target.checked ? [...new Set([...prev, id])] : prev.filter(x=>x!==id))
                              }} />
                              <span className="text-sm text-slate-700">{p.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {selectedProductIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedProductIds.map(id => (
                          <span key={id} className="px-2 py-1 bg-slate-100 rounded-lg text-xs">#{id}</span>
                        ))}
                      </div>
                    )}
                  </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Hedef Kategoriler</label>
                    <div className="flex gap-2">
                      <input value={categoryQuery} onChange={(e)=>setCategoryQuery(e.target.value)} placeholder="Kategori ara..." className="flex-1 px-4 py-3 border rounded-xl" />
                      <button type="button" onClick={()=>setCategoryQuery('')} className="px-3 py-2 border rounded-xl text-sm">Temizle</button>
                    </div>
                    {categoriesSearch.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-auto border rounded-xl">
                        {categoriesSearch.map((c:any)=>{
                          const checked = selectedCategoryIds.includes(Number(c.id))
                          return (
                            <label key={c.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0">
                              <input type="checkbox" checked={checked} onChange={(e)=>{
                                const id = Number(c.id)
                                setSelectedCategoryIds(prev => e.target.checked ? [...new Set([...prev, id])] : prev.filter(x=>x!==id))
                              }} />
                              <span className="text-sm text-slate-700">{c.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {selectedCategoryIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedCategoryIds.map(id => (
                          <span key={id} className="px-2 py-1 bg-slate-100 rounded-lg text-xs">#{id}</span>
                        ))}
                      </div>
                    )}
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
