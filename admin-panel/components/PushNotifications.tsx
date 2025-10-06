'use client'

import { useState } from 'react'
import { Bell, Send, Users, Calendar, TrendingUp, Plus, X, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: number
  title: string
  message: string
  segment: string
  scheduled: string
  status: 'sent' | 'scheduled' | 'draft'
  sent: number
  opened: number
}

export default function PushNotifications() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [notifications, setNotifications] = useState<Notification[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    segment: 'all',
    scheduleType: 'now',
    scheduleDate: '',
    scheduleTime: ''
  })

  const segments = ['Tüm Kullanıcılar', 'VIP Müşteriler', 'Yeni Kullanıcılar', 'Aktif Siparişler', 'Terk Edilmiş Sepet', 'Pasif Kullanıcılar']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newNotification: Notification = {
      id: Date.now(),
      title: formData.title,
      message: formData.message,
      segment: segments[0],
      scheduled: formData.scheduleType === 'now' ? 'Şimdi' : `${formData.scheduleDate} ${formData.scheduleTime}`,
      status: formData.scheduleType === 'now' ? 'sent' : 'scheduled',
      sent: 0,
      opened: 0
    }
    setNotifications([newNotification, ...notifications])
    setIsModalOpen(false)
    setFormData({ title: '', message: '', segment: 'all', scheduleType: 'now', scheduleDate: '', scheduleTime: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Push Bildirim Yönetimi</h2>
          <p className="text-slate-500 mt-1">Kullanıcılara anlık bildirim gönderin</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Bildirim
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mb-1">Gönderilen</p>
          <p className="text-3xl font-bold text-slate-800">{notifications.filter(n => n.status === 'sent').reduce((sum, n) => sum + n.sent, 0).toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mb-1">Açılma Oranı</p>
          <p className="text-3xl font-bold text-slate-800">
            {notifications.length > 0 && notifications.reduce((sum, n) => sum + n.sent, 0) > 0
              ? ((notifications.reduce((sum, n) => sum + n.opened, 0) / notifications.reduce((sum, n) => sum + n.sent, 0)) * 100).toFixed(0)
              : '0'}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mb-1">Zamanlanmış</p>
          <p className="text-3xl font-bold text-slate-800">{notifications.filter(n => n.status === 'scheduled').length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mb-1">Aktif Kullanıcı</p>
          <p className="text-3xl font-bold text-slate-800">0</p>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Bildirim Geçmişi</h3>
        <div className="space-y-4">
          {notifications.map((notif, index) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-slate-800">{notif.title}</h4>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      notif.status === 'sent' ? 'bg-green-100 text-green-700' :
                      notif.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {notif.status === 'sent' ? 'Gönderildi' :
                       notif.status === 'scheduled' ? 'Zamanlandı' : 'Taslak'}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-2">{notif.message}</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <span>👥 {notif.segment}</span>
                    <span>📅 {notif.scheduled}</span>
                  </div>
                </div>
                {notif.status === 'sent' && (
                  <div className="text-right ml-4">
                    <p className="text-sm text-slate-500 mb-1">Performans</p>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="font-semibold">{notif.sent.toLocaleString()}</span> gönderildi</p>
                      <p className="text-sm"><span className="font-semibold text-green-600">{notif.opened.toLocaleString()}</span> açıldı</p>
                      <p className="text-xs text-slate-500">{((notif.opened / notif.sent) * 100).toFixed(1)}% oran</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
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
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-2xl font-bold">Yeni Push Bildirim</h3>
                <button onClick={() => setIsModalOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Başlık *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Bildirim başlığı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Mesaj *</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Bildirim mesajı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hedef Kitle</label>
                  <select
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl"
                  >
                    {segments.map(seg => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Gönderim Zamanı</label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="schedule"
                        checked={formData.scheduleType === 'now'}
                        onChange={() => setFormData({ ...formData, scheduleType: 'now' })}
                        className="mr-2"
                      />
                      Hemen Gönder
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="schedule"
                        checked={formData.scheduleType === 'later'}
                        onChange={() => setFormData({ ...formData, scheduleType: 'later' })}
                        className="mr-2"
                      />
                      Zamanla
                    </label>
                    {formData.scheduleType === 'later' && (
                      <div className="grid grid-cols-2 gap-3 ml-6">
                        <input
                          type="date"
                          value={formData.scheduleDate}
                          onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                          className="px-4 py-2 border rounded-xl"
                        />
                        <input
                          type="time"
                          value={formData.scheduleTime}
                          onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                          className="px-4 py-2 border rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center justify-center">
                    <Send className="w-5 h-5 mr-2" />
                    {formData.scheduleType === 'now' ? 'Gönder' : 'Zamanla'}
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
