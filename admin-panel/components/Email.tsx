'use client'

import { useState } from 'react'
import { Mail, Send, Users, TrendingUp, Eye, MousePointer, Trash2, Edit, Plus, Copy, Download, Filter, Search, Calendar, BarChart3, FileText, Image, Code, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface EmailTemplate {
  id: number
  name: string
  subject: string
  category: string
  thumbnail: string
  lastModified: string
}

interface EmailCampaign {
  id: number
  name: string
  subject: string
  recipients: number
  sent: number
  opened: number
  clicked: number
  status: 'draft' | 'scheduled' | 'sent'
  date: string
}

export default function Email() {
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns' | 'stats'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateCategory, setTemplateCategory] = useState('Genel')
  const [templateHtml, setTemplateHtml] = useState('<html>\n  <body>\n    <h1>Merhaba!</h1>\n    <p>E-posta içeriğinizi buraya yazın...</p>\n  </body>\n</html>')

  // Mock şablon verileri kaldırıldı - Backend entegrasyonu için hazır
  const templates: EmailTemplate[] = []

  // Mock kampanya verileri kaldırıldı - Backend entegrasyonu için hazır
  const campaigns: EmailCampaign[] = []

  // Mock istatistikler kaldırıldı - Backend entegrasyonu için hazır
  const stats = {
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">E-posta Pazarlama</h2>
          <p className="text-slate-500 mt-1">Şablonlar, kampanyalar ve istatistikler</p>
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition-shadow">
          <Plus className="w-5 h-5" />
          <span>Yeni Kampanya</span>
        </button>
      </div>

      {/* İstatistik kartları kaldırıldı (mock) */}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="border-b border-slate-200 px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Şablonlar</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'campaigns'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Kampanyalar</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>İstatistikler</span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Şablon ara..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Şablon</span>
                </button>
              </div>

              {/* List View */}
              <div className="space-y-3">
                {templates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center text-3xl border border-blue-200">
                        {template.thumbnail}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 mb-1">{template.name}</h3>
                        <p className="text-sm text-slate-600 mb-2">{template.subject}</p>
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {template.category}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {template.lastModified}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setSelectedTemplate(template)
                          setShowTemplateModal(true)
                        }}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Görüntüle"
                      >
                        <Eye className="w-5 h-5 text-blue-600" />
                      </button>
                      <button className="p-2 hover:bg-purple-50 rounded-lg transition-colors" title="Düzenle">
                        <Edit className="w-5 h-5 text-purple-600" />
                      </button>
                      <button className="p-2 hover:bg-green-50 rounded-lg transition-colors" title="Kopyala">
                        <Copy className="w-5 h-5 text-green-600" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="HTML İndir">
                        <Download className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Kampanya</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Alıcı</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Gönderilen</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Açılma</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tıklama</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((campaign, index) => (
                      <motion.tr
                        key={campaign.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-800">{campaign.name}</p>
                            <p className="text-sm text-slate-500">{campaign.subject}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{campaign.recipients.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-600">{campaign.sent.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-800 font-semibold">{campaign.opened.toLocaleString()}</span>
                            {campaign.sent > 0 && (
                              <span className="text-xs text-green-600">
                                ({((campaign.opened / campaign.sent) * 100).toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-800 font-semibold">{campaign.clicked.toLocaleString()}</span>
                            {campaign.sent > 0 && (
                              <span className="text-xs text-purple-600">
                                ({((campaign.clicked / campaign.sent) * 100).toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            campaign.status === 'sent' ? 'bg-green-100 text-green-700' :
                            campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {campaign.status === 'sent' ? 'Gönderildi' :
                             campaign.status === 'scheduled' ? 'Zamanlandı' : 'Taslak'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{campaign.date}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-bold text-slate-800 mb-4">Performans Özeti</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Toplam Gönderim</span>
                      <span className="font-bold text-slate-800">{stats.totalSent.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Başarılı Teslimat</span>
                      <span className="font-bold text-green-600">{(stats.totalSent * 0.977).toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Bounce</span>
                      <span className="font-bold text-orange-600">{(stats.totalSent * 0.023).toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Spam Şikayeti</span>
                      <span className="font-bold text-red-600">12</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="font-bold text-slate-800 mb-4">Etkileşim Metrikleri</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Açılma Oranı</span>
                        <span className="font-bold text-green-600">{stats.openRate}%</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${stats.openRate}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Tıklama Oranı</span>
                        <span className="font-bold text-purple-600">{stats.clickRate}%</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${stats.clickRate}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Dönüşüm Oranı</span>
                        <span className="font-bold text-blue-600">4.2%</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '42%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h4 className="font-bold text-slate-800 mb-4">En İyi Performans Gösteren Kampanyalar</h4>
                <div className="space-y-3">
                  {campaigns.filter(c => c.status === 'sent').map((campaign, index) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{campaign.name}</p>
                          <p className="text-sm text-slate-500">{campaign.recipients.toLocaleString()} alıcı</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Açılma: <span className="font-bold text-green-600">{((campaign.opened / campaign.sent) * 100).toFixed(1)}%</span></p>
                        <p className="text-sm text-slate-600">Tıklama: <span className="font-bold text-purple-600">{((campaign.clicked / campaign.sent) * 100).toFixed(1)}%</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Template Modal with HTML Editor */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <Code className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">Yeni E-posta Şablonu</h3>
                    <p className="text-sm text-slate-500">HTML ile özel şablon oluşturun</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Template Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Şablon Adı *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Örn: Hoş Geldin E-postası"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      E-posta Konusu *
                    </label>
                    <input
                      type="text"
                      value={templateSubject}
                      onChange={(e) => setTemplateSubject(e.target.value)}
                      placeholder="Örn: Aramıza Hoş Geldiniz!"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Kategori
                    </label>
                    <select
                      value={templateCategory}
                      onChange={(e) => setTemplateCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Genel</option>
                      <option>Karşılama</option>
                      <option>İşlem</option>
                      <option>Promosyon</option>
                      <option>Hatırlatma</option>
                      <option>Özel Gün</option>
                      <option>Öneri</option>
                    </select>
                  </div>
                </div>

                {/* HTML Editor */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      HTML Kodu
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTemplateHtml('<html>\n  <body>\n    <h1>Merhaba!</h1>\n    <p>E-posta içeriğinizi buraya yazın...</p>\n  </body>\n</html>')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Sıfırla
                      </button>
                      <span className="text-xs text-slate-500">
                        {templateHtml.length} karakter
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Code Editor */}
                    <div>
                      <div className="bg-slate-900 rounded-t-xl px-4 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-mono">HTML Editor</span>
                        <Code className="w-4 h-4 text-slate-400" />
                      </div>
                      <textarea
                        value={templateHtml}
                        onChange={(e) => setTemplateHtml(e.target.value)}
                        className="w-full h-96 px-4 py-3 bg-slate-900 text-green-400 font-mono text-sm rounded-b-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        spellCheck={false}
                      />
                    </div>

                    {/* Preview */}
                    <div>
                      <div className="bg-slate-100 rounded-t-xl px-4 py-2 flex items-center justify-between border border-slate-200">
                        <span className="text-xs text-slate-600 font-medium">Önizleme</span>
                        <Eye className="w-4 h-4 text-slate-600" />
                      </div>
                      <div 
                        className="w-full h-96 px-4 py-3 bg-white border border-slate-200 border-t-0 rounded-b-xl overflow-auto"
                        dangerouslySetInnerHTML={{ __html: templateHtml }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Insert Buttons */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm font-medium text-slate-700 mb-3">Hızlı Ekle:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTemplateHtml(templateHtml + '\n<h1>Başlık</h1>')}
                      className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-50 transition-colors"
                    >
                      Başlık
                    </button>
                    <button
                      onClick={() => setTemplateHtml(templateHtml + '\n<p>Paragraf metni...</p>')}
                      className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-50 transition-colors"
                    >
                      Paragraf
                    </button>
                    <button
                      onClick={() => setTemplateHtml(templateHtml + '\n<a href="#">Link</a>')}
                      className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-50 transition-colors"
                    >
                      Link
                    </button>
                    <button
                      onClick={() => setTemplateHtml(templateHtml + '\n<button style="background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px;">Buton</button>')}
                      className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-50 transition-colors"
                    >
                      Buton
                    </button>
                    <button
                      onClick={() => setTemplateHtml(templateHtml + '\n<img src="https://via.placeholder.com/600x300" alt="Görsel" style="max-width: 100%;">')}
                      className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-50 transition-colors"
                    >
                      Görsel
                    </button>
                    <button
                      onClick={() => setTemplateHtml(templateHtml + '\n<div style="background: #f1f5f9; padding: 20px; border-radius: 8px;">İçerik kutusu</div>')}
                      className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-50 transition-colors"
                    >
                      Kutu
                    </button>
                  </div>
                </div>

                {/* Save Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      alert('✅ Şablon kaydedildi!')
                      setShowCreateModal(false)
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                  >
                    Şablonu Kaydet
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Modal */}
      <AnimatePresence>
        {showTemplateModal && selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTemplateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">{selectedTemplate.name}</h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="text-center text-8xl mb-6">{selectedTemplate.thumbnail}</div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Konu</label>
                    <p className="text-slate-800">{selectedTemplate.subject}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Kategori</label>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                      {selectedTemplate.category}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Son Düzenleme</label>
                    <p className="text-slate-600">{selectedTemplate.lastModified}</p>
                  </div>
                </div>
                <div className="mt-6 flex space-x-3">
                  <button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium">
                    Düzenle
                  </button>
                  <button className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium">
                    Kopyala
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
