'use client'

import { useEffect, useState } from 'react'
import { Download, Upload, Database, Clock, CheckCircle, AlertTriangle, HardDrive, Cloud, RefreshCw, Trash2, Calendar, X, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface BackupItem {
  id: number
  name: string
  date: string
  size: string
  type: 'auto' | 'manual'
  status: 'completed' | 'in-progress' | 'failed'
}

export default function Backup() {
  const [backups, setBackups] = useState<BackupItem[]>([])

  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [autoBackup, setAutoBackup] = useState(true)
  const [backupFrequency, setBackupFrequency] = useState('daily')
  const [showFtpModal, setShowFtpModal] = useState(false)
  const [ftpData, setFtpData] = useState({
    host: '',
    port: '21',
    username: '',
    password: '',
    directory: '/backups'
  })

  const reloadBackups = async () => {
    // Sunucuda list endpoint yoksa, tek "son oluşturulan" yedeği lokal listede tutarız
    // Gelecekte /admin/backups gibi bir uç nokta eklendiğinde burası güncellenebilir
  }

  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true)
      const res = await api.get<any>('/admin/backup')
      if (res && typeof window !== 'undefined') {
        const jsonString = JSON.stringify(res, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        a.href = url
        a.download = `backup-${timestamp}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        const sizeKb = Math.max(1, Math.round(jsonString.length / 1024))
        const item: BackupItem = {
          id: Date.now(),
          name: `Yedek - ${new Date().toLocaleDateString('tr-TR')}`,
          date: new Date().toLocaleString('tr-TR'),
          size: `${sizeKb} KB`,
          type: 'manual',
          status: 'completed'
        }
        setBackups([item, ...backups])
      }
    } catch (e:any) {
      alert(e?.message || 'Yedek oluşturulamadı')
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const handleDownload = async (backup: BackupItem) => {
    try {
      const res = await api.get<any>('/admin/backup')
      if (res && typeof window !== 'undefined') {
        const jsonString = JSON.stringify(res, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const safeName = backup?.name?.replace(/\s+/g, '-').toLowerCase() || 'backup'
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        a.href = url
        a.download = `${safeName}-${timestamp}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (e:any) {
      alert(e?.message || 'İndirme başarısız')
    }
  }

  const handleRestore = async (backup: BackupItem) => {
    if (!confirm(`${backup.name} geri yüklensin mi? Bu işlem mevcut verilerin üzerine yazacaktır.`)) return
    try {
      // Not: Geri yükleme çok riskli; backend tarafında /api/admin/restore POST mevcut (kısmi kesik)
      // Örnek payload: { data: { ... } } – gerçek senaryoda dosya içeriği gönderilmeli
      await api.post<any>('/admin/restore', { data: {} })
      alert('Geri yükleme isteği gönderildi')
    } catch (e:any) {
      alert(e?.message || 'Geri yükleme başarısız')
    }
  }

  const handleDelete = (id: number) => {
    if (confirm('Bu yedeği silmek istediğinizden emin misiniz?')) {
      setBackups(backups.filter(b => b.id !== id))
    }
  }

  useEffect(()=>{ reloadBackups() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Veri Yedekleme</h2>
          <p className="text-slate-500 mt-1">Verilerinizi yedekleyin ve geri yükleyin</p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={isCreatingBackup}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow disabled:opacity-50"
        >
          {isCreatingBackup ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Yedekleniyor...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Yeni Yedek Oluştur
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mb-1">Toplam Yedek</p>
          <p className="text-3xl font-bold text-slate-800">{backups.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mb-1">Toplam Boyut</p>
          <p className="text-3xl font-bold text-slate-800">9.5 GB</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mb-1">Son Yedek</p>
          <p className="text-lg font-bold text-slate-800">2 gün önce</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mb-1">Bulut Depolama</p>
          <p className="text-3xl font-bold text-slate-800">45%</p>
        </div>
      </div>

      {/* FTP Settings */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">FTP Sunucu Ayarları</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                FTP Sunucu Adresi *
              </label>
              <input
                type="text"
                placeholder="ftp.example.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Port
              </label>
              <input
                type="number"
                placeholder="21"
                defaultValue="21"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Kullanıcı Adı *
              </label>
              <input
                type="text"
                placeholder="username"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Şifre *
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Uzak Dizin
            </label>
            <input
              type="text"
              placeholder="/backups"
              defaultValue="/backups"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-slate-800">Otomatik FTP Yedekleme</p>
                <p className="text-sm text-slate-500">Her yedekten sonra FTP'ye gönder</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium">
              Bağlantıyı Test Et
            </button>
            <button className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl hover:shadow-lg transition-shadow font-medium">
              Kaydet ve Gönder
            </button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Güvenlik Notu:</p>
                <p>FTP bağlantı bilgileri şifrelenmiş olarak saklanır. SFTP kullanmanızı öneririz.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Otomatik Yedekleme Ayarları</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-800">Otomatik Yedekleme</p>
                  <p className="text-sm text-slate-500">Düzenli aralıklarla otomatik yedek al</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Yedekleme Sıklığı
              </label>
              <select
                value={backupFrequency}
                onChange={(e) => setBackupFrequency(e.target.value)}
                disabled={!autoBackup}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="hourly">Her Saat</option>
                <option value="daily">Günlük</option>
                <option value="weekly">Haftalık</option>
                <option value="monthly">Aylık</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Yedekleme Konumu
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                  <input type="radio" name="location" defaultChecked className="w-4 h-4 text-blue-600" />
                  <Cloud className="w-5 h-5 mx-3 text-slate-600" />
                  <span className="text-sm font-medium">Bulut Depolama</span>
                </label>
                <label className="flex items-center p-3 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                  <input type="radio" name="location" className="w-4 h-4 text-blue-600" />
                  <HardDrive className="w-5 h-5 mx-3 text-slate-600" />
                  <span className="text-sm font-medium">Yerel Sunucu</span>
                </label>
              </div>
            </div>

            <button className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium">
              Ayarları Kaydet
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Hızlı İşlemler</h3>
          
          <div className="space-y-4">
            <button onClick={handleCreateBackup} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl hover:shadow-md transition-all">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800">Tam Yedek Al</p>
                  <p className="text-xs text-slate-600">Tüm verileri yedekle</p>
                </div>
              </div>
              <span className="text-blue-600 font-semibold">→</span>
            </button>

            <button onClick={handleCreateBackup} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl hover:shadow-md transition-all">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800">Veritabanı Yedeği</p>
                  <p className="text-xs text-slate-600">Sadece veritabanını yedekle</p>
                </div>
              </div>
              <span className="text-green-600 font-semibold">→</span>
            </button>

            <button 
              onClick={() => setShowFtpModal(true)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl hover:shadow-md transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800">FTP'ye Gönder</p>
                  <p className="text-xs text-slate-600">Yedeği uzak sunucuya aktar</p>
                </div>
              </div>
              <span className="text-purple-600 font-semibold">→</span>
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl hover:shadow-md transition-all">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800">Zamanlanmış Yedek</p>
                  <p className="text-xs text-slate-600">Belirli tarihte yedek al</p>
                </div>
              </div>
              <span className="text-orange-600 font-semibold">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backup List */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Yedek Geçmişi</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Yedek Adı</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Boyut</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tür</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backups.map((backup, index) => (
                <motion.tr
                  key={backup.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Database className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-slate-800">{backup.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{backup.date}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{backup.size}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      backup.type === 'auto' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {backup.type === 'auto' ? 'Otomatik' : 'Manuel'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium ${
                      backup.status === 'completed' ? 'bg-green-100 text-green-700' :
                      backup.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {backup.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                      {backup.status === 'in-progress' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {backup.status === 'failed' && <AlertTriangle className="w-3 h-3" />}
                      <span>
                        {backup.status === 'completed' ? 'Tamamlandı' :
                         backup.status === 'in-progress' ? 'Devam Ediyor' : 'Başarısız'}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownload(backup)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                        title="İndir"
                      >
                        <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleRestore(backup)}
                        className="p-2 hover:bg-green-50 rounded-lg transition-colors group"
                        title="Geri Yükle"
                      >
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                        title="Sil"
                      >
                        <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FTP Modal */}
      <AnimatePresence>
        {showFtpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFtpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">FTP Sunucuya Gönder</h3>
                    <p className="text-sm text-slate-500">Yedeği uzak sunucuya aktarın</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFtpModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gönderilecek Yedek
                  </label>
                  <select className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {backups.map(backup => (
                      <option key={backup.id} value={backup.id}>
                        {backup.name} - {backup.size}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      FTP Sunucu Adresi *
                    </label>
                    <input
                      type="text"
                      value={ftpData.host}
                      onChange={(e) => setFtpData({ ...ftpData, host: e.target.value })}
                      placeholder="ftp.example.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      value={ftpData.port}
                      onChange={(e) => setFtpData({ ...ftpData, port: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Kullanıcı Adı *
                    </label>
                    <input
                      type="text"
                      value={ftpData.username}
                      onChange={(e) => setFtpData({ ...ftpData, username: e.target.value })}
                      placeholder="username"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Şifre *
                    </label>
                    <input
                      type="password"
                      value={ftpData.password}
                      onChange={(e) => setFtpData({ ...ftpData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Uzak Dizin
                  </label>
                  <input
                    type="text"
                    value={ftpData.directory}
                    onChange={(e) => setFtpData({ ...ftpData, directory: e.target.value })}
                    placeholder="/backups"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Protokol Seçenekleri:</p>
                      <div className="space-y-1">
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="protocol" defaultChecked className="text-blue-600" />
                          <span>FTP (Port 21)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="protocol" className="text-blue-600" />
                          <span>SFTP (Port 22) - Önerilen</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="protocol" className="text-blue-600" />
                          <span>FTPS (Port 990)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    onClick={async () => {
                      try {
                        const resp = await api.post<any>('/admin/ftp-backup/test', {
                          host: ftpData.host,
                          port: Number(ftpData.port) || 21,
                          user: ftpData.username,
                          password: ftpData.password,
                          remoteDir: ftpData.directory
                        })
                        if ((resp as any)?.success) alert('Bağlantı başarılı'); else alert((resp as any)?.message || 'Bağlantı başarısız')
                      } catch (e:any) {
                        alert(e?.message || 'Bağlantı testi başarısız')
                      }
                    }}
                    className="flex-1 border border-slate-300 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Bağlantıyı Test Et
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // Config'i kaydet
                        await api.post<any>('/admin/ftp-backup/config', {
                          enabled: true,
                          host: ftpData.host,
                          port: Number(ftpData.port) || 21,
                          user: ftpData.username,
                          password: ftpData.password,
                          remoteDir: ftpData.directory
                        })
                        // Çalıştır
                        const run = await api.post<any>('/admin/ftp-backup/run', {
                          host: ftpData.host,
                          port: Number(ftpData.port) || 21,
                          user: ftpData.username,
                          password: ftpData.password,
                          remoteDir: ftpData.directory
                        })
                        if ((run as any)?.success) alert('Yedek FTP\'ye gönderildi'); else alert((run as any)?.message || 'Gönderim başarısız')
                        setShowFtpModal(false)
                      } catch (e:any) {
                        alert(e?.message || 'Gönderim yapılamadı')
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium flex items-center justify-center"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Gönder
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
