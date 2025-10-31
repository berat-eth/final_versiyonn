'use client'

import { useEffect, useState } from 'react'
import { Crown, Plus, MessageSquare, Search, Filter, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function BulkCustomProduction() {
  // Requests & items
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [items, setItems] = useState<any[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  // Messages
  const [messages, setMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ subject: '', description: '', customerName: '', customerPhone: '' })

  const translateStatus = (status?: string) => {
    const s = String(status || '').toLowerCase()
    if (!s) return '-'
    if (s === 'pending') return 'Beklemede'
    if (s === 'review') return 'Teklif'
    if (s === 'design') return 'Tasarım'
    if (s === 'production') return 'Üretimde'
    if (s === 'shipped') return 'Kargolandı'
    if (s === 'completed') return 'Tamamlandı'
    if (s === 'cancelled') return 'İptal'
    return status as any
  }

  const setRequestStatus = async (id: number, status: 'pending' | 'review' | 'design' | 'production' | 'shipped' | 'completed' | 'cancelled') => {
    try {
      await api.put(`/admin/custom-production-requests/${id}/status`, { status })
      await loadRequests()
      if (typeof id === 'number') {
        await loadItems(id)
      }
      alert('İşlem uygulandı')
    } catch {
      alert('İşlem başarısız')
    }
  }

  const renderCustomization = (value: any) => {
    let data: any = value
    if (typeof value === 'string') {
      try { data = JSON.parse(value) } catch { /* ignore */ }
    }
    if (!data || typeof data !== 'object') return <span className="text-slate-500 dark:text-slate-400">-</span>
    return (
      <div className="text-xs space-y-1">
        {data.text && (<div><span className="font-medium text-slate-600 dark:text-slate-400">Yazı:</span> <span className="text-slate-700 dark:text-slate-300">{data.text}</span></div>)}
        {data.color && (<div><span className="font-medium text-slate-600 dark:text-slate-400">Renk:</span> <span className="text-slate-700 dark:text-slate-300">{data.color}</span></div>)}
        {data.position && (<div><span className="font-medium text-slate-600 dark:text-slate-400">Pozisyon:</span> <span className="text-slate-700 dark:text-slate-300">{data.position}</span></div>)}
        {data.logo && (
          <div>
            <span className="font-medium text-slate-600 dark:text-slate-400">Logo:</span>{' '}
            <a href={String(data.logo)} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">{String(data.logo).slice(0,64)}{String(data.logo).length>64?'...':''}</a>
          </div>
        )}
        {data.logoSize && (typeof data.logoSize === 'object') && (
          <div><span className="font-medium text-slate-600 dark:text-slate-400">Logo Boyutu:</span> <span className="text-slate-700 dark:text-slate-300">{data.logoSize.width}x{data.logoSize.height}</span></div>
        )}
        {typeof data.isBenden === 'boolean' && (
          <div><span className="font-medium text-slate-600 dark:text-slate-400">Benden:</span> <span className="text-slate-700 dark:text-slate-300">{data.isBenden ? 'Evet' : 'Hayır'}</span></div>
        )}
        {data.bendenSize && (<div><span className="font-medium text-slate-600 dark:text-slate-400">Beden:</span> <span className="text-slate-700 dark:text-slate-300">{data.bendenSize}</span></div>)}
        {data.bendenQuantity != null && (<div><span className="font-medium text-slate-600 dark:text-slate-400">Adet:</span> <span className="text-slate-700 dark:text-slate-300">{data.bendenQuantity}</span></div>)}
        {data.bendenDescription && (<div className="break-words"><span className="font-medium text-slate-600 dark:text-slate-400">Açıklama:</span> <span className="text-slate-700 dark:text-slate-300">{data.bendenDescription}</span></div>)}
      </div>
    )
  }

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/custom-production-requests')
      if ((res as any)?.success && Array.isArray((res as any).data)) setRequests((res as any).data)
      else setRequests([])
    } catch (e:any) {
      setError(e?.message || 'Özel üretim talepleri getirilemedi')
      setRequests([])
    } finally { setLoading(false) }
  }

  const loadItems = async (id: number) => {
    try {
      setItemsLoading(true)
      setItemsError(null)
      const res = await api.get<any>(`/admin/custom-production-requests/${id}`)
      if ((res as any)?.success) {
        const data = (res as any).data || {}
        setItems(Array.isArray(data.items) ? data.items : [])
      } else {
        setItems([])
      }
    } catch (e:any) {
      setItemsError(e?.message || 'Talep kalemleri getirilemedi')
      setItems([])
    } finally { setItemsLoading(false) }
  }

  const loadMessages = async (id?: number) => {
    try {
      setMessagesLoading(true)
      setMessagesError(null)
      if (id) {
        const res = await api.get<any>(`/admin/custom-production/requests/${id}/messages`)
        if ((res as any)?.success && Array.isArray((res as any).data)) setMessages((res as any).data)
        else setMessages([])
      } else {
        const res = await api.get<any>('/admin/custom-production/messages', { limit: 50 })
        if ((res as any)?.success && Array.isArray((res as any).data)) setMessages((res as any).data)
        else setMessages([])
      }
    } catch (e:any) {
      setMessagesError(e?.message || 'Mesajlar getirilemedi')
      setMessages([])
    } finally { setMessagesLoading(false) }
  }

  useEffect(()=>{ loadRequests() }, [])
  useEffect(()=>{
    if (typeof selectedId === 'number') {
      loadItems(selectedId)
      loadMessages(selectedId)
    } else {
      setItems([])
      loadMessages(undefined)
    }
  }, [selectedId])

  const totalRevenue = requests.reduce((sum:number, r:any)=> sum + Number(r.totalAmount || 0), 0)
  const inProgressCount = requests.filter((r:any)=> ['review','design','production','shipped'].includes(String(r.status))).length
  const completedCount = requests.filter((r:any)=> String(r.status) === 'completed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Özel Toptan Üretim</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Talepleri, kalemleri ve mesajlaşmayı tek ekranda yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRequests} className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Yenile</button>
          <button onClick={()=> setShowCreateModal(true)} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow">
            <Plus className="w-5 h-5 mr-2" />
            Yeni Talep
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Talep</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{requests.length}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Devam Eden</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{inProgressCount}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Tamamlanan</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{completedCount}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Tutar</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">₺{totalRevenue.toLocaleString('tr-TR')}</p>
        </div>
      </div>

      {/* Requests table */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        {error && <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>}
        {loading && <p className="text-slate-500 dark:text-slate-400 text-sm">Yükleniyor...</p>}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Talep No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Telefon</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adet</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tutar</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {requests.map((r:any, index:number)=> (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">#{r.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{r.customerName || '-'}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{r.customerEmail || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{r.customerPhone || '-'}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{r.totalQuantity ?? '-'}</td>
                  <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">₺{Number(r.totalAmount || 0).toLocaleString('tr-TR')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${String(r.status) === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      ['review','design','production','shipped'].includes(String(r.status)) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                      {translateStatus(r.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{r.createdAt || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={()=>{ setSelectedId(r.id); setShowDetailModal(true); }} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-lg text-sm font-medium transition-shadow">
                      Detay
                    </button>
                  </td>
                </motion.tr>
              ))}
              {requests.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">Kayıt bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && typeof selectedId === 'number' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=> setShowDetailModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-700" onClick={(e)=> e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Talep Detayı</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Talep #{selectedId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=> setRequestStatus(selectedId, 'review')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Teklif</button>
                <button onClick={()=> setRequestStatus(selectedId, 'completed')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">Onayla</button>
                <button onClick={()=> setRequestStatus(selectedId, 'cancelled')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">Reddet</button>
                <button onClick={()=> setShowDetailModal(false)} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">Kapat</button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {(() => {
                const req = requests.find((x:any)=> x.id === selectedId) || {}
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Müşteri</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{req.customerName || '-'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{req.customerPhone || '-'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Durum</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{translateStatus(req.status)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Toplam</p>
                      <p className="text-lg font-semibold text-green-700 dark:text-green-400">₺{Number(req.totalAmount||0).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                )
              })()}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adet</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Not</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {items.map((it:any, idx:number)=> (
                      <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-100">{it.productName || it.productId || '-'}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{it.quantity ?? '-'}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300 break-all">{renderCustomization(it.note ?? it.customizations)}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={3} className="px-6 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">Kalem bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=> setShowCreateModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700" onClick={(e)=> e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Yeni Talep</h3>
              <button onClick={()=> setShowCreateModal(false)} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">Kapat</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Müşteri Adı</label>
                <input value={createForm.customerName} onChange={(e)=> setCreateForm({ ...createForm, customerName: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Ad Soyad" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Telefon</label>
                <input value={createForm.customerPhone} onChange={(e)=> setCreateForm({ ...createForm, customerPhone: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Telefon" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Konu</label>
                <input value={createForm.subject} onChange={(e)=> setCreateForm({ ...createForm, subject: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Örn: Toptan Av Bıçağı" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Açıklama</label>
                <textarea value={createForm.description} onChange={(e)=> setCreateForm({ ...createForm, description: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none" rows={4} placeholder="İhtiyaç detayı" />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button onClick={()=> setShowCreateModal(false)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">İptal</button>
                <button
                  onClick={async()=>{
                    const payload:any = { subject: createForm.subject, description: createForm.description }
                    if (createForm.customerName) payload.customerName = createForm.customerName
                    if (createForm.customerPhone) payload.customerPhone = createForm.customerPhone
                    try {
                      const resp = await api.post<any>('/admin/custom-production/requests', payload)
                      if ((resp as any)?.success && (resp as any).data?.id) {
                        setShowCreateModal(false)
                        setCreateForm({ subject: '', description: '', customerName: '', customerPhone: '' })
                        await loadRequests()
                        const newId = Number((resp as any).data.id)
                        setSelectedId(newId)
                        setShowDetailModal(true)
                        await loadItems(newId)
                      } else {
                        alert('Talep oluşturulamadı')
                      }
                    } catch { alert('Talep oluşturulamadı') }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-lg"
                >
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items and messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Talep Kalemleri</h3>
              {typeof selectedId === 'number' && <p className="text-slate-500 dark:text-slate-400 text-sm">Talep #{selectedId} için</p>}
            </div>
            <div className="flex items-center gap-2">
              {typeof selectedId === 'number' && (
                <button onClick={()=>loadItems(selectedId)} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Yenile</button>
              )}
            </div>
          </div>
          {itemsLoading && <p className="text-slate-500 dark:text-slate-400 text-sm">Yükleniyor...</p>}
          {itemsError && <p className="text-red-600 dark:text-red-400 text-sm">{itemsError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adet</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Mesaj/Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((it:any, idx:number)=> (
                  <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-100">{it.productName || it.productId || '-'}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{it.quantity ?? '-'}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300 break-all">{it.note || (typeof it.customizations === 'string' ? it.customizations : JSON.stringify(it.customizations))}</td>
                  </tr>
                ))}
                {items.length === 0 && !itemsLoading && !itemsError && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">Kayıt bulunamadı</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Mesaj ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-300 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filtrele</span>
            </button>
          </div>

          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {messagesLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Yükleniyor...</div>}
            {messagesError && <div className="text-red-600 dark:text-red-400 text-sm">{messagesError}</div>}
            {messages
              .filter(m => !searchTerm || String(m.message||'').toLowerCase().includes(searchTerm.toLowerCase()))
              .map((message: any, index: number) => (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, x: message.sender === 'admin' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-md p-4 rounded-xl ${
                  message.sender === 'admin' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-semibold text-sm">{message.userName || (message.sender==='admin' ? 'Admin' : 'Kullanıcı')}</span>
                  </div>
                  <p className="text-sm mb-1">{message.message}</p>
                  <p className={`text-xs ${message.sender === 'admin' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {message.createdAt}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <input
              type="text"
              placeholder="Mesajınızı yazın..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              onClick={async()=>{
                const content = newMessage.trim()
                if (!content) return
                try {
                  let reqId = typeof selectedId === 'number' ? selectedId : 0
                  if (!reqId) {
                    const create = await api.post<any>('/admin/custom-production/requests', { subject: 'Admin Mesajı', description: content })
                    if ((create as any)?.success && (create as any).data?.id) {
                      reqId = Number((create as any).data.id)
                      setSelectedId(reqId)
                      await loadRequests()
                    }
                  }
                  const send = await api.post<any>('/admin/custom-production/messages', { requestId: reqId, message: content, sender: 'admin' })
                  if ((send as any)?.success) {
                    setNewMessage('')
                    await loadMessages(reqId || undefined)
                  } else {
                    alert('Mesaj gönderilemedi')
                  }
                } catch { alert('Mesaj gönderilemedi') }
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Gönder</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


