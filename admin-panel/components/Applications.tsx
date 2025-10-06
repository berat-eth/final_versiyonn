'use client'

import { FileText, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export default function Applications() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const res = await api.get<any>('/dealership/applications')
      if ((res as any)?.success && Array.isArray((res as any).data)) setApplications((res as any).data)
      else setApplications([])
    } catch (e:any) { setError(e?.message || 'Başvurular getirilemedi'); setApplications([]) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800">Bayilik Başvuruları</h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Yenile</button>
        </div>
      </div>
      <p className="text-slate-500">Bayilik başvurularını inceleyin ve onaylayın</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Bekleyen</p>
          <p className="text-3xl font-bold text-yellow-600">{applications.filter(a => a.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Onaylanan</p>
          <p className="text-3xl font-bold text-green-600">{applications.filter(a => a.status === 'approved').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Reddedilen</p>
          <p className="text-3xl font-bold text-red-600">{applications.filter(a => a.status === 'rejected').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {loading && <div className="text-slate-500 text-sm">Yükleniyor...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Başvuran</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Firma</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Telefon</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app, index) => (
                <motion.tr
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-semibold text-slate-800">{app.fullName}</td>
                  <td className="px-6 py-4">{app.companyName}</td>
                  <td className="px-6 py-4">{app.phone}</td>
                  <td className="px-6 py-4 text-slate-600">{app.createdAt}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      app.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                      app.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {app.status === 'new' ? 'Bekliyor' :
                       app.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button onClick={async()=>{ try{ await api.put(`/dealership/applications/${app.id}/status`, { status:'approved' }); await load() } catch {} }} className="p-2 hover:bg-green-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </button>
                      <button onClick={async()=>{ try{ await api.put(`/dealership/applications/${app.id}/status`, { status:'rejected' }); await load() } catch {} }} className="p-2 hover:bg-red-50 rounded-lg">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
