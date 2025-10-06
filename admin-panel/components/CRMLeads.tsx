'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Mail, Phone, Building, Calendar, TrendingUp, Search, Filter, X, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface Lead {
  id: number
  name: string
  email: string
  phone: string
  company: string
  source: string
  status: 'Yeni' | 'İletişimde' | 'Nitelikli' | 'Dönüştürüldü' | 'Kayıp'
  score: number
  createdAt: string
  lastContact: string
  estimatedValue: number
}

export default function CRMLeads() {
  // Backend entegrasyonu
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [viewingLead, setViewingLead] = useState<Lead | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [source, setSource] = useState('Form')

  const statusColors = {
    'Yeni': 'bg-blue-100 text-blue-700 border-blue-200',
    'İletişimde': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Nitelikli': 'bg-green-100 text-green-700 border-green-200',
    'Dönüştürüldü': 'bg-purple-100 text-purple-700 border-purple-200',
    'Kayıp': 'bg-red-100 text-red-700 border-red-200',
  }

  const statusIcons = {
    'Yeni': AlertCircle,
    'İletişimde': Clock,
    'Nitelikli': TrendingUp,
    'Dönüştürüldü': CheckCircle,
    'Kayıp': X,
  }

  // İstatistik kartları kaldırıldı (mock)

  useEffect(() => {
    let alive = true
    ;(async()=>{
      try {
        setLoading(true)
        setError(null)
        const mod = await import('../lib/services/crmService')
        const res: any = await mod.crmService.getLeads({ page: 1, limit: 50 })
        if (alive && res?.success && Array.isArray(res.data)) {
          setLeads(res.data)
        } else {
          setLeads([])
        }
      } catch (e:any) {
        setError(e?.message || 'Lead listesi yüklenemedi')
        setLeads([])
      } finally { setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Potansiyel Müşteriler</h2>
          <p className="text-slate-500 mt-1">Lead'lerinizi takip edin ve yönetin</p>
        </div>
        <button onClick={()=>setShowAdd(true)} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium flex items-center space-x-2">
          <UserPlus className="w-5 h-5" />
          <span>Yeni Lead Ekle</span>
        </button>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Lead ara..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
              <option>Yeni</option>
              <option>İletişimde</option>
              <option>Nitelikli</option>
              <option>Dönüştürüldü</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Lead</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Şirket</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Kaynak</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Skor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tahmini Değer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Son İletişim</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead, index) => {
                const StatusIcon = statusIcons[lead.status]
                return (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{lead.name}</p>
                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <Mail className="w-3 h-3" />
                            <span>{lead.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <Building className="w-4 h-4 mr-2 text-slate-400" />
                        {lead.company}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{lead.source}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border ${statusColors[lead.status]}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${lead.score >= 80 ? 'bg-green-500' : lead.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">₺{lead.estimatedValue.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{lead.lastContact}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setViewingLead(lead)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
                      >
                        Detay
                      </button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detay Modal */}
      <AnimatePresence>
        {viewingLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingLead(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-2xl font-bold text-slate-800">Lead Detayları</h3>
                <button
                  onClick={() => setViewingLead(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {viewingLead.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-800">{viewingLead.name}</h4>
                    <p className="text-slate-600">{viewingLead.company}</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border mt-2 ${statusColors[viewingLead.status]}`}>
                      {viewingLead.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center text-slate-500 mb-2">
                      <Mail className="w-4 h-4 mr-2" />
                      <p className="text-sm">E-posta</p>
                    </div>
                    <p className="font-bold text-slate-800">{viewingLead.email}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center text-slate-500 mb-2">
                      <Phone className="w-4 h-4 mr-2" />
                      <p className="text-sm">Telefon</p>
                    </div>
                    <p className="font-bold text-slate-800">{viewingLead.phone}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center text-slate-500 mb-2">
                      <Calendar className="w-4 h-4 mr-2" />
                      <p className="text-sm">Oluşturulma</p>
                    </div>
                    <p className="font-bold text-slate-800">{viewingLead.createdAt}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center text-slate-500 mb-2">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <p className="text-sm">Lead Skoru</p>
                    </div>
                    <p className="font-bold text-slate-800">{viewingLead.score}/100</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <p className="text-sm text-green-600 mb-1">Tahmini Değer</p>
                    <p className="text-2xl font-bold text-green-700">₺{viewingLead.estimatedValue.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-600 mb-1">Kaynak</p>
                    <p className="text-2xl font-bold text-blue-700">{viewingLead.source}</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium">
                    İletişime Geç
                  </button>
                  <button className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium">
                    Düzenle
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {showAdd && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e)=>e.stopPropagation()}>
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="text-2xl font-bold">Yeni Lead</h3>
            <button onClick={()=>setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-6 h-6"/></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ad Soyad</label>
                <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-4 py-3 border rounded-xl"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Şirket</label>
                <input value={company} onChange={(e)=>setCompany(e.target.value)} className="w-full px-4 py-3 border rounded-xl"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">E-posta</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-xl"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefon</label>
                <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full px-4 py-3 border rounded-xl"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kaynak</label>
                <select value={source} onChange={(e)=>setSource(e.target.value)} className="w-full px-4 py-3 border rounded-xl">
                  <option>Form</option>
                  <option>Kampanya</option>
                  <option>Telefon</option>
                  <option>E-posta</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                disabled={adding || !name.trim() || !email.trim()}
                onClick={async()=>{
                  try {
                    setAdding(true)
                    const mod = await import('../lib/services/crmService')
                    const res: any = await mod.crmService.createLead({ name: name.trim(), email: email.trim(), phone: phone.trim(), company: company.trim(), source })
                    if (res?.success) {
                      // Başarıda listeyi tazele
                      try {
                        const listRes: any = await mod.crmService.getLeads({ page: 1, limit: 50 })
                        if (listRes?.success && Array.isArray(listRes.data)) setLeads(listRes.data)
                      } catch {}
                      setShowAdd(false)
                      setName(''); setEmail(''); setPhone(''); setCompany('')
                      alert('Lead oluşturuldu')
                    } else {
                      alert('Lead eklenemedi')
                    }
                  } catch { alert('Lead eklenemedi') } finally { setAdding(false) }
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl disabled:opacity-50"
              >Kaydet</button>
              <button onClick={()=>setShowAdd(false)} className="px-6 py-3 border rounded-xl">İptal</button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
