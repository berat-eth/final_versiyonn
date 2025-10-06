'use client'

import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Applications() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const applications: any[] = []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Bayilik Başvuruları</h2>
        <p className="text-slate-500 mt-1">Bayilik başvurularını inceleyin ve onaylayın</p>
      </div>

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
                  <td className="px-6 py-4 font-semibold text-slate-800">{app.name}</td>
                  <td className="px-6 py-4">{app.company}</td>
                  <td className="px-6 py-4">{app.phone}</td>
                  <td className="px-6 py-4 text-slate-600">{app.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      app.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {app.status === 'pending' ? 'Bekliyor' :
                       app.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-green-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg">
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
