'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const Header = dynamic(() => import('@/components/Header'), { ssr: true })
const Footer = dynamic(() => import('@/components/Footer'), { ssr: true })

export default function TeklifAlPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    productType: '',
    quantity: '',
    description: '',
    budget: '',
    embroidery: false,
    printing: false,
    wholesale: false,
    embroideryDetails: '',
    printingDetails: '',
    sizeDistribution: ''
  })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === 'application/pdf' && file.size <= 10 * 1024 * 1024) {
        setUploadedFile(file)
      } else {
        alert('Lütfen 10MB\'dan küçük bir PDF dosyası seçin.')
      }
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/teklif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          productType: '',
          quantity: '',
          description: '',
          budget: '',
          embroidery: false,
          printing: false,
          wholesale: false,
          embroideryDetails: '',
          printingDetails: '',
          sizeDistribution: ''
        })
        setUploadedFile(null)
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="layout-container flex h-full grow flex-col">
        <Header />

        <main className="flex-grow">
          {/* Hero Section */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-10"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
              <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-6">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">request_quote</span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Ücretsiz Teklif</span>
                </div>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight mb-6">
                  <span className="text-[#0d141b] dark:text-slate-50">Özel </span>
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Teklif Alın
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Projeleriniz için özel üretim tekliflerimizden yararlanın. Size en uygun çözümü sunmak için buradayız.
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-10 lg:px-20 py-8">
            <div className="layout-content-container flex flex-col max-w-[1200px] mx-auto flex-1">
              <div className="grid md:grid-cols-2 gap-12 py-16">
                {/* Left Side - Info */}
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col gap-6">
                    <h2 className="text-4xl font-black text-[#0d141b] dark:text-slate-50">
                      Neden Bizden Teklif Almalısınız?
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      Yılların deneyimi ve uzman ekibimizle projelerinize özel çözümler sunuyoruz. Kaliteli üretim, uygun fiyat ve zamanında teslimat garantisi.
                    </p>
                  </div>

                  <div className="flex flex-col gap-6">
                    {[
                      {
                        icon: 'verified',
                        title: 'Kalite Garantisi',
                        description: 'Tüm ürünlerimizde %100 kalite garantisi',
                        color: 'from-blue-500 to-blue-600'
                      },
                      {
                        icon: 'schedule',
                        title: 'Hızlı Teslimat',
                        description: 'Zamanında ve güvenli teslimat',
                        color: 'from-purple-500 to-purple-600'
                      },
                      {
                        icon: 'account_balance_wallet',
                        title: 'Uygun Fiyat',
                        description: 'Rekabetçi ve şeffaf fiyatlandırma',
                        color: 'from-pink-500 to-pink-600'
                      },
                      {
                        icon: 'support_agent',
                        title: '7/24 Destek',
                        description: 'Her zaman yanınızdayız',
                        color: 'from-green-500 to-green-600'
                      }
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300">
                        <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <span className="material-symbols-outlined text-white text-2xl">{item.icon}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className="text-lg font-bold text-[#0d141b] dark:text-slate-50">{item.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side - Form */}
                <div className="flex flex-col gap-6">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
                    <h3 className="text-2xl font-black text-[#0d141b] dark:text-slate-50 mb-6">
                      Teklif Formu
                    </h3>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Ad Soyad *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Adınız ve soyadınız"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            E-posta *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="ornek@email.com"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Telefon *
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="0555 555 55 55"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Firma Adı
                        </label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Firma adınız (opsiyonel)"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Ürün Tipi *
                          </label>
                          <select
                            name="productType"
                            value={formData.productType}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          >
                            <option value="">Seçiniz</option>
                            <option value="tshirt">T-Shirt</option>
                            <option value="sweatshirt">Sweatshirt</option>
                            <option value="hoodie">Hoodie</option>
                            <option value="pantolon">Pantolon</option>
                            <option value="ceket">Ceket</option>
                            <option value="diger">Diğer</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Miktar *
                          </label>
                          <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            required
                            min="1"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Adet"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Bütçe Aralığı
                        </label>
                        <select
                          name="budget"
                          value={formData.budget}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="">Seçiniz</option>
                          <option value="0-5000">0 - 5.000 TL</option>
                          <option value="5000-10000">5.000 - 10.000 TL</option>
                          <option value="10000-25000">10.000 - 25.000 TL</option>
                          <option value="25000+">25.000 TL+</option>
                        </select>
                      </div>

                      {/* Hizmet Seçenekleri */}
                      <div className="flex flex-col gap-4">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Hizmet Seçenekleri
                        </label>
                        <div className="grid md:grid-cols-3 gap-4">
                          <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                            <input
                              type="checkbox"
                              checked={formData.embroidery}
                              onChange={(e) => setFormData({ ...formData, embroidery: e.target.checked })}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">draw</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">Nakış</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 transition-all has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 dark:has-[:checked]:bg-purple-900/20">
                            <input
                              type="checkbox"
                              checked={formData.printing}
                              onChange={(e) => setFormData({ ...formData, printing: e.target.checked })}
                              className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">print</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">Baskı</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-pink-500 dark:hover:border-pink-500 transition-all has-[:checked]:border-pink-500 has-[:checked]:bg-pink-50 dark:has-[:checked]:bg-pink-900/20">
                            <input
                              type="checkbox"
                              checked={formData.wholesale}
                              onChange={(e) => setFormData({ ...formData, wholesale: e.target.checked })}
                              className="w-5 h-5 text-pink-600 rounded focus:ring-2 focus:ring-pink-500"
                            />
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-pink-600 dark:text-pink-400">inventory_2</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">Toptan</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Nakış Detayları */}
                      {formData.embroidery && (
                        <div className="flex flex-col gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">draw</span>
                            Nakış Detayları
                          </label>
                          <textarea
                            name="embroideryDetails"
                            value={formData.embroideryDetails}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            placeholder="Nakış yeri, renk, boyut vb. detayları belirtin..."
                          />
                        </div>
                      )}

                      {/* Baskı Detayları */}
                      {formData.printing && (
                        <div className="flex flex-col gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-lg">print</span>
                            Baskı Detayları
                          </label>
                          <textarea
                            name="printingDetails"
                            value={formData.printingDetails}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                            placeholder="Baskı türü (dijital, serigrafi vb.), baskı yeri, renk sayısı vb. detayları belirtin..."
                          />
                        </div>
                      )}

                      {/* Toptan Bilgi */}
                      {formData.wholesale && (
                        <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-200 dark:border-pink-800">
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-pink-600 dark:text-pink-400 text-2xl">info</span>
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Toptan Alım</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Toptan alımlarınızda özel indirimlerden yararlanabilirsiniz. Detaylı bilgi için sizinle iletişime geçeceğiz.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Beden Dağılımı
                        </label>
                        <textarea
                          name="sizeDistribution"
                          value={formData.sizeDistribution}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          placeholder="Örnek: XS: 10 adet, S: 20 adet, M: 30 adet, L: 25 adet, XL: 15 adet"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Beden dağılımını serbest metin olarak yazabilirsiniz
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Tasarım Dosyası (PDF)
                        </label>
                        <div className="relative">
                          {!uploadedFile ? (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-4xl">upload_file</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">Dosya seçin</span> veya sürükleyin
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">PDF (Maks. 10MB)</p>
                              </div>
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <div className="flex items-center justify-between p-4 border-2 border-green-300 dark:border-green-700 rounded-xl bg-green-50 dark:bg-green-900/20">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">picture_as_pdf</span>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{uploadedFile.name}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={removeFile}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                              >
                                <span className="material-symbols-outlined text-red-600 dark:text-red-400">delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Proje Detayları *
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          required
                          rows={5}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          placeholder="Projeniz hakkında detaylı bilgi verin..."
                        />
                      </div>

                      {submitStatus === 'success' && (
                        <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl">
                          <p className="text-green-800 dark:text-green-300 text-sm font-semibold">
                            ✓ Talebiniz başarıyla gönderildi! En kısa sürede size dönüş yapacağız.
                          </p>
                        </div>
                      )}

                      {submitStatus === 'error' && (
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl">
                          <p className="text-red-800 dark:text-red-300 text-sm font-semibold">
                            ✗ Bir hata oluştu. Lütfen tekrar deneyin.
                          </p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            <span>Gönderiliyor...</span>
                          </>
                        ) : (
                          <>
                            <span>Teklif Talep Et</span>
                            <span className="material-symbols-outlined">send</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
