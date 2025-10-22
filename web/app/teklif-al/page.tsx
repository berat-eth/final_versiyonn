'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useState } from 'react'

export default function TeklifAl() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    productType: '',
    quantity: '',
    fabric: '',
    color: '',
    size: '',
    logo: false,
    embroidery: false,
    urgentOrder: false,
    deliveryDate: '',
    notes: '',
    logoFile: null as File | null,
    honeypot: '' // Bot koruması için
  })

  const [logoFileName, setLogoFileName] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const { validateFileUpload, sanitizeFileName } = require('@/utils/validation')
      const validation = validateFileUpload(file)
      
      if (!validation.valid) {
        alert(validation.error)
        e.target.value = ''
        return
      }
      
      const sanitizedName = sanitizeFileName(file.name)
      setFormData({ ...formData, logoFile: file })
      setLogoFileName(sanitizedName)
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return
    
    // Honeypot kontrolü - bot ise gönderme
    if (formData.honeypot !== '') {
      console.log('Bot detected')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/teklif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || 'Teklifiniz başarıyla gönderildi!')
        // Formu temizle
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          productType: '',
          quantity: '',
          fabric: '',
          color: '',
          size: '',
          logo: false,
          embroidery: false,
          urgentOrder: false,
          deliveryDate: '',
          notes: '',
          logoFile: null,
          honeypot: ''
        })
        setLogoFileName('')
      } else {
        alert(data.error || 'Bir hata oluştu. Lütfen tekrar deneyin.')
      }
    } catch (error) {
      console.error('Form gönderim hatası:', error)
      alert('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const productTypes = ['İş Gömleği', 'İş Pantolonu', 'İş Yeleği', 'İş Ceketi', 'İş Önlüğü', 'İş Tişörtü', 'İş Eldiveni', 'Diğer']
  const fabrics = ['Pamuk', 'Polyester', 'Pamuk-Polyester Karışım', 'Denim', 'Gabardin', 'Oxford', 'Diğer']

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <main className="flex-grow px-4 md:px-10 lg:px-20 py-16">
        <div className="max-w-[1200px] mx-auto">
          {/* Hero Section with Animation */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-6">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">workspace_premium</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Hızlı & Güvenilir Teklif</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 leading-tight">
              Teklif Alın
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              İhtiyacınıza özel iş kıyafetleri için hemen teklif alın.
              <span className="font-semibold text-blue-600 dark:text-blue-400"> 24 saat içinde</span> size dönüş yapıyoruz.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 md:p-10 hover:shadow-3xl transition-all duration-300">
                <form onSubmit={handleSubmit} className="space-y-10">
                  {/* Kişisel Bilgiler */}
                  <div className="space-y-5">
                    <h2 className="text-2xl font-bold text-[#1a2b4a] dark:text-white mb-4">Kişisel Bilgiler</h2>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ad Soyad *</label>
                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder="Adınız ve soyadınız" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">E-posta *</label>
                        <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder="ornek@email.com" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Telefon *</label>
                        <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder="+90 (5__) ___ __ __" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Şirket Adı</label>
                        <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder="Şirket adınız (opsiyonel)" />
                      </div>
                    </div>
                  </div>

                  {/* Ürün Detayları */}
                  <div className="space-y-5 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-[#1a2b4a] dark:text-white mb-4">Ürün Detayları</h2>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ürün Tipi *</label>
                        <select required value={formData.productType} onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                          <option value="">Ürün seçiniz</option>
                          {productTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Adet *</label>
                        <input type="number" required min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder="Kaç adet?" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Kumaş Tipi</label>
                        <select value={formData.fabric} onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                          <option value="">Kumaş seçiniz</option>
                          {fabrics.map((fabric) => <option key={fabric} value={fabric}>{fabric}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Renk</label>
                        <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder="Örn: Lacivert, Siyah" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Beden Dağılımı</label>
                      <input type="text" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        placeholder="Örn: S:10, M:20, L:15, XL:5" />
                    </div>
                  </div>

                  {/* Ek Bilgiler */}
                  <div className="space-y-5 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-[#1a2b4a] dark:text-white mb-4">Ek Bilgiler</h2>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all">
                        <input type="checkbox" checked={formData.logo} onChange={(e) => setFormData({ ...formData, logo: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">Logo Baskısı</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Ürünlere şirket logosu basılsın</p>
                        </div>
                      </label>
                      
                      {formData.logo && (
                        <div className="ml-8 space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Logo Dosyası Yükle
                              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                                (PNG, JPEG veya PDF)
                              </span>
                            </label>
                            <div className="relative">
                              <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.pdf"
                                onChange={handleFileChange}
                                className="hidden"
                                id="logo-upload"
                              />
                              <label
                                htmlFor="logo-upload"
                                className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                              >
                                <span className="material-symbols-outlined text-gray-400">upload_file</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {logoFileName || 'Dosya Seç'}
                                </span>
                              </label>
                            </div>
                            {logoFileName && (
                              <div className="flex items-center gap-2 mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">check_circle</span>
                                <span className="text-sm text-green-700 dark:text-green-300 font-medium">{logoFileName}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, logoFile: null })
                                    setLogoFileName('')
                                  }}
                                  className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all">
                        <input type="checkbox" checked={formData.embroidery} onChange={(e) => setFormData({ ...formData, embroidery: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Nakış İşleme</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Ürünlere nakış işleme yapılsın</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all">
                        <input type="checkbox" checked={formData.urgentOrder} onChange={(e) => setFormData({ ...formData, urgentOrder: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Acil Sipariş</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Siparişim acil, hızlı teslimat istiyorum</p>
                        </div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Teslim Tarihi</label>
                      <input type="date" value={formData.deliveryDate} onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ek Notlar</label>
                      <textarea rows={4} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                        placeholder="Özel talepleriniz veya notlarınız..."></textarea>
                    </div>
                    
                    {/* Honeypot field - Bot koruması */}
                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="website">Website</label>
                      <input
                        type="text"
                        id="website"
                        name="website"
                        value={formData.honeypot}
                        onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {isSubmitting ? (
                      <>
                        <span className="relative z-10 text-lg">Gönderiliyor...</span>
                        <span className="material-symbols-outlined relative z-10 animate-spin">progress_activity</span>
                      </>
                    ) : (
                      <>
                        <span className="relative z-10 text-lg">Teklif Gönder</span>
                        <span className="material-symbols-outlined relative z-10 group-hover:translate-x-1 transition-transform duration-300">send</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 sticky top-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <span className="material-symbols-outlined text-white text-xl">description</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1a2b4a] dark:text-white">Teklif Özeti</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {formData.name && <div className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"><span className="text-gray-600 dark:text-gray-400">İsim:</span><span className="font-semibold text-gray-900 dark:text-white">{formData.name}</span></div>}
                  {formData.productType && <div className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"><span className="text-gray-600 dark:text-gray-400">Ürün:</span><span className="font-semibold text-gray-900 dark:text-white">{formData.productType}</span></div>}
                  {formData.quantity && <div className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"><span className="text-gray-600 dark:text-gray-400">Adet:</span><span className="font-semibold text-gray-900 dark:text-white">{formData.quantity}</span></div>}
                  {formData.fabric && <div className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"><span className="text-gray-600 dark:text-gray-400">Kumaş:</span><span className="font-semibold text-gray-900 dark:text-white">{formData.fabric}</span></div>}
                  {!formData.name && !formData.productType && !formData.quantity && !formData.fabric && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                      <span className="material-symbols-outlined text-4xl mb-2 opacity-50">edit_note</span>
                      <p className="text-sm">Formu doldurmaya başlayın</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <span className="material-symbols-outlined text-2xl">info</span>
                    </div>
                    <h3 className="text-lg font-bold">Neden Biz?</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-all">
                      <span className="material-symbols-outlined text-lg mt-0.5">check_circle</span>
                      <span>Teklifler 24 saat içinde gönderilir</span>
                    </li>
                    <li className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-all">
                      <span className="material-symbols-outlined text-lg mt-0.5">check_circle</span>
                      <span>Minimum sipariş: 10 adet</span>
                    </li>
                    <li className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-all">
                      <span className="material-symbols-outlined text-lg mt-0.5">check_circle</span>
                      <span>Ücretsiz numune gönderimi</span>
                    </li>
                    <li className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-all">
                      <span className="material-symbols-outlined text-lg mt-0.5">check_circle</span>
                      <span>Toplu siparişlerde indirim</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <span className="material-symbols-outlined text-white text-xl">support_agent</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1a2b4a] dark:text-white">Hızlı İletişim</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <a href="tel:+902121234567" className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">phone</span>
                    </div>
                    <span className="font-medium">+90 (212) 123 45 67</span>
                  </a>
                  <a href="mailto:siparis@huglutekstil.com" className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-all">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">email</span>
                    </div>
                    <span className="font-medium text-xs">siparis@huglutekstil.com</span>
                  </a>
                  <a href="https://wa.me/905551234567" className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400">chat</span>
                    </div>
                    <span className="font-medium">WhatsApp Destek</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
