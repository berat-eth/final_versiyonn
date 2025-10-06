'use client'

import { Shield, Lock, Key, AlertTriangle } from 'lucide-react'

export default function Security() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const securityLogs: any[] = []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Güvenlik Ayarları</h2>
        <p className="text-slate-500 mt-1">Sistem güvenliğini yönetin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Aktif Oturumlar</p>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Başarısız Denemeler</p>
          <p className="text-3xl font-bold text-red-600">{securityLogs.filter((l: any) => l.type === 'warning').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">API Anahtarları</p>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Güvenlik Skoru</p>
          <p className="text-3xl font-bold text-purple-600">100%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Güvenlik Ayarları</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-800">İki Faktörlü Doğrulama</p>
                  <p className="text-xs text-slate-500">Ekstra güvenlik katmanı</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <Key className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-slate-800">Otomatik Oturum Kapatma</p>
                  <p className="text-xs text-slate-500">30 dakika sonra</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-slate-800">Şüpheli Aktivite Uyarısı</p>
                  <p className="text-xs text-slate-500">Email bildirimi</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Güvenlik Logları</h3>
          <div className="space-y-3">
            {securityLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    log.type === 'success' ? 'text-green-600' :
                    log.type === 'warning' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {log.event}
                  </span>
                  <span className="text-xs text-slate-400">{log.time}</span>
                </div>
                <p className="text-xs text-slate-600">{log.user} • {log.ip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
