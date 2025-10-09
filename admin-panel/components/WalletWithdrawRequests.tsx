'use client'

import { useEffect, useState } from 'react'
import { Wallet, Search, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function WalletWithdrawRequests() {
  const [requests, setRequests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/wallet-withdraw-requests?limit=100')
      if ((res as any)?.success && (res as any).data) setRequests((res as any).data)
      else setRequests([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Çekim talepleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])

  const updateStatus = async (id: string, status: 'completed' | 'failed' | 'cancelled' | 'pending_approval') => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: true }))
      await api.post(`/admin/wallet-withdraw-requests/${id}/status`, { status })
      await fetchRequests()
    } catch (e) {
      alert('İşlem başarısız')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const approveRequest = (req: any) => {
    if (!confirm(`${req.id} talebini onaylamak istiyor musunuz?`)) return
    updateStatus(req.id, 'completed')
  }

  const rejectRequest = (req: any) => {
    if (!confirm(`${req.id} talebini reddetmek istiyor musunuz?`)) return
    updateStatus(req.id, 'failed')
  }

  const statusBadge = (status: string) => {
    const s = String(status || '').toLowerCase()
    if (s.includes('complete')) return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Tamamlandı</span>
    if (s.includes('pending') || s.includes('await')) return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Beklemede</span>
    if (s.includes('fail') || s.includes('reject')) return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Başarısız</span>
    if (s.includes('cancel')) return <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">İptal</span>
    return <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">-</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Bakiye Çekim Talepleri</h2>
          <p className="text-slate-500 mt-1">Kullanıcıların çekim taleplerini yönetin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Talep ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Yükleniyor...</p>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>
        ) : (
        <div className="space-y-3">
          {requests
            .filter(r => `${r.userName||''} ${r.id||''}`.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <Wallet className="w-5 h-5 text-blue-600 mt-1" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-800">{request.fullName || request.userName || '-'}</h3>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">IBAN: </span>
                      <span className="font-mono tracking-wider">{request.iban || request.IBAN || request.ibanNumber || '-'}</span>
                    </div>
                    <p className="text-xs text-slate-400">Talep ID: {request.id} • {request.createdAt}</p>
                  </div>
                </div>
                <div className="text-right min-w-[160px]">
                  <p className="text-2xl font-bold text-slate-800">₺{Number(request.amount||0).toFixed(2)}</p>
                  <div className="mt-1">{statusBadge(request.status)}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  disabled={!!actionLoading[request.id]}
                  onClick={() => approveRequest(request)}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 inline-flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Onayla
                </button>
                <button
                  disabled={!!actionLoading[request.id]}
                  onClick={() => rejectRequest(request)}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reddet
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}


