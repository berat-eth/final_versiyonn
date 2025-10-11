'use client'

import { useEffect, useState } from 'react'
import { Search, MapPin, Download, Loader2, Phone, Mail, Globe, MapPinned, Eye, X, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import TurkeyMapLeaflet from './TurkeyMapLeaflet'

export default function GoogleMapsScraper() {
  const [query, setQuery] = useState('silah bayi OR av bayii Konya')
  const [city, setCity] = useState('Konya')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<{ state: string; total: number; processed: number; error?: string | null } | null>(null)
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const stopPolling = () => {
    if (polling) {
      clearInterval(polling)
      setPolling(null)
    }
  }

  const startPollingStatus = (jid: string) => {
    stopPolling()
    const t = setInterval(async () => {
      try {
        const st = await api.get<any>(`/admin/scrapers/google-maps/status/${jid}`)
        if (st?.success) {
          const data = st.data || st?.data?.data
          const payload = st.data?.data || st.data || {}
          setStatus({ state: payload.status || 'unknown', total: payload.total || 0, processed: payload.processed || 0, error: payload.error || null })
          if (payload.status === 'completed') {
            stopPolling()
            const res = await api.get<any>(`/admin/scrapers/google-maps/result/${jid}`)
            if (res?.success && Array.isArray(res?.data)) setResults(res.data)
            else if (res?.success && Array.isArray(res?.data?.data)) setResults(res.data.data)
            setLoading(false)
          }
          if (payload.status === 'failed' || payload.status === 'blocked') {
            stopPolling()
            setLoading(false)
            setError(payload.error || 'Scraping başarısız oldu')
          }
        }
      } catch {}
    }, 1500)
    setPolling(t)
  }

  const runScrape = async () => {
    try {
      setLoading(true)
      setError(null)
      setResults([])
      setStatus(null)
      const res = await api.post<any>('/admin/scrapers/google-maps', { query, city })
      if (res?.success && res?.jobId) {
        setJobId(res.jobId)
        startPollingStatus(res.jobId)
      } else if (res?.success && res?.data?.jobId) {
        setJobId(res.data.jobId)
        startPollingStatus(res.data.jobId)
      } else {
        setLoading(false)
        setError('İş oluşturulamadı')
      }
    } catch (e:any) {
      setError('Sunucu tarafında Google Maps scraping uç noktası bulunamadı veya hata verdi.')
      setResults([])
      setLoading(false)
    }
  }

  const exportCsv = () => {
    const header = ['Ad','Adres','Şehir','Telefon','Web','Konum']
    const rows = results.map(r => [r.name||'', r.address||'', r.city||'', r.phone||'', r.website||'', r.locationUrl||''])
    const csv = [header, ...rows].map(r => r.map(v => String(v).replaceAll('"','""')).map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gmaps-scrape-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity)
  }

  const openDetailModal = (item: any) => {
    setSelectedItem(item)
    setShowDetailModal(true)
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedItem(null)
  }

  const getWhatsAppUrl = (phone: string) => {
    if (!phone) return ''
    const cleanPhone = phone.replace(/\D/g, '')
    const whatsappPhone = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone}`
    return `https://wa.me/${whatsappPhone}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Google Maps Data Scrapper</h2>
          <p className="text-slate-500 mt-1">Google Haritalar'dan işletme verilerini toplayın</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="Arama sorgusu (örn: av bayii)" className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <div className="relative">
            <MapPin className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={city} onChange={(e)=> setCity(e.target.value)} placeholder="Şehir" className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <button disabled={loading} onClick={runScrape} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? <span className="inline-flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Çalışıyor...</span> : 'Verileri Topla'}
            </button>
            <button onClick={exportCsv} disabled={!results.length} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center">
              <Download className="w-4 h-4 mr-2"/>Dışa Aktar
            </button>
            <button
              onClick={() => {
                // Demo veri yükle
                setResults([
                  { 
                    name: 'Huğlu Bayi A', 
                    address: 'Merkez, Konya', 
                    city: 'Konya', 
                    phone: '+90 332 000 00 00', 
                    email: 'info@huglubayi.com',
                    website: 'https://ornek1.com', 
                    locationUrl: 'https://maps.google.com/?q=Konya',
                    lat: 37.8746,
                    lng: 32.4932,
                    query: query
                  },
                  { 
                    name: 'Av Malzemeleri B', 
                    address: 'Selçuklu, Konya', 
                    city: 'Konya', 
                    phone: '+90 332 111 11 11', 
                    email: 'satis@avmalzemeleri.com',
                    website: 'https://avmalzemeleri.com', 
                    locationUrl: 'https://maps.google.com/?q=Selçuklu+Konya',
                    lat: 37.8769,
                    lng: 32.4847,
                    query: query
                  },
                  { 
                    name: 'Outdoor C', 
                    address: 'Karatay, Konya', 
                    city: 'Konya', 
                    phone: '+90 332 222 22 22', 
                    email: 'info@outdoorc.com',
                    website: 'https://ornek3.com', 
                    locationUrl: 'https://maps.google.com/?q=Karatay+Konya',
                    lat: 37.8722,
                    lng: 32.5015,
                    query: query
                  },
                ])
                setError(null)
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
            >
              Demo Verisi
            </button>
          </div>
        </div>
        {(status || jobId) && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-slate-600">Durum: <span className="font-medium text-slate-800">{status?.state || 'oluşturuluyor'}</span> {status ? `• ${status.processed}/${status.total}` : ''}</div>
            {jobId && <div className="text-slate-400">İş No: {jobId.slice(0,8)}</div>}
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 border border-yellow-200 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            {error} • Lütfen backend’e `/api/admin/scrapers/google-maps` uç noktasını ekleyin veya Demo Verisi ile arayüzü test edin.
          </div>
        )}
      </div>

      {/* Türkiye Haritası - Minimalist */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-slate-700 mb-1">Türkiye Haritası</h3>
          <p className="text-slate-500 text-xs">Haritadan şehir seçerek arama yapabilirsiniz</p>
        </div>
        <TurkeyMapLeaflet
          onCitySelect={handleCitySelect}
          selectedCity={city}
          className="h-96"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {results.length === 0 ? (
          <p className="text-slate-500">Sonuç yok</p>
        ) : (
        <div className="space-y-3">
          {results.map((r, i) => {
            const phoneHref = r.phone ? `tel:${String(r.phone).replace(/\s+/g,'')}` : ''
            const email = r.email || ''
            const emailHref = email ? `mailto:${email}` : ''
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }} className="p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{r.name}</p>
                    <p className="text-sm text-slate-600 truncate">{r.address} {r.city ? `• ${r.city}` : ''}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>{r.phone || 'Telefon yok'}</span>
                      {email && <span>• {email}</span>}
                      {r.website && <span>• {r.website}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openDetailModal(r)}
                      className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs inline-flex items-center gap-1"
                      title="Detayları görüntüle"
                    >
                      <Eye className="w-3.5 h-3.5"/> Detay
                    </button>
                    <a
                      href={phoneHref || undefined}
                      target={phoneHref ? '_blank' : undefined}
                      rel={phoneHref ? 'noopener noreferrer' : undefined}
                      className={`px-2 py-1 rounded border text-xs inline-flex items-center gap-1 ${phoneHref ? 'border-slate-300 hover:bg-slate-50 text-slate-700' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}
                      onClick={(e)=>{ if(!phoneHref) e.preventDefault() }}
                      aria-disabled={!phoneHref}
                      title={phoneHref ? 'Ara' : 'Telefon yok'}
                    >
                      <Phone className="w-3.5 h-3.5"/> Ara
                    </a>
                    <a
                      href={emailHref || undefined}
                      className={`px-2 py-1 rounded border text-xs inline-flex items-center gap-1 ${emailHref ? 'border-slate-300 hover:bg-slate-50 text-slate-700' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}
                      onClick={(e)=>{ if(!emailHref) e.preventDefault() }}
                      title={emailHref ? 'E-posta gönder' : 'E-posta yok'}
                    >
                      <Mail className="w-3.5 h-3.5"/> Mail
                    </a>
                    <a
                      href={r.website || undefined}
                      target={r.website ? '_blank' : undefined}
                      rel={r.website ? 'noopener noreferrer' : undefined}
                      className={`px-2 py-1 rounded border text-xs inline-flex items-center gap-1 ${r.website ? 'border-slate-300 hover:bg-slate-50 text-slate-700' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}
                      onClick={(e)=>{ if(!r.website) e.preventDefault() }}
                      title={r.website ? 'Web sitesini aç' : 'Web sitesi yok'}
                    >
                      <Globe className="w-3.5 h-3.5"/> Site
                    </a>
                    <a
                      href={r.locationUrl || undefined}
                      target={r.locationUrl ? '_blank' : undefined}
                      rel={r.locationUrl ? 'noopener noreferrer' : undefined}
                      className={`px-2 py-1 rounded border text-xs inline-flex items-center gap-1 ${r.locationUrl ? 'border-slate-300 hover:bg-slate-50 text-slate-700' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}
                      onClick={(e)=>{ if(!r.locationUrl) e.preventDefault() }}
                      title={r.locationUrl ? 'Haritada aç' : 'Harita bağlantısı yok'}
                    >
                      <MapPinned className="w-3.5 h-3.5"/> Harita
                    </a>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
        )}
      </div>

      {/* Detay Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden relative z-[10000]"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-800">İşletme Detayları</h3>
              <button
                onClick={closeDetailModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* İşletme Adı */}
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">İşletme Adı</label>
                <div className="text-lg font-semibold text-slate-800">{selectedItem.name || 'Belirtilmemiş'}</div>
              </div>

              {/* Adres */}
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">Adres</label>
                <div className="text-slate-700">{selectedItem.address || 'Belirtilmemiş'}</div>
              </div>

              {/* Şehir */}
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">Şehir</label>
                <div className="text-slate-700">{selectedItem.city || 'Belirtilmemiş'}</div>
              </div>

              {/* İletişim Bilgileri */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">Telefon</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 font-medium">{selectedItem.phone || 'Belirtilmemiş'}</span>
                    {selectedItem.phone && (
                      <>
                        <a
                          href={`tel:${String(selectedItem.phone).replace(/\s+/g,'')}`}
                          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          title="Ara"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <a
                          href={getWhatsAppUrl(selectedItem.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          title="WhatsApp'ta mesaj gönder"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">E-posta</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 font-medium">{selectedItem.email || 'Belirtilmemiş'}</span>
                    {selectedItem.email && (
                      <a
                        href={`mailto:${selectedItem.email}`}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="E-posta gönder"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Web Sitesi */}
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">Web Sitesi</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-medium truncate">{selectedItem.website || 'Belirtilmemiş'}</span>
                  {selectedItem.website && (
                    <a
                      href={selectedItem.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      title="Web sitesini aç"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Harita Konumu */}
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">Harita Konumu</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-medium truncate">{selectedItem.locationUrl || 'Belirtilmemiş'}</span>
                  {selectedItem.locationUrl && (
                    <a
                      href={selectedItem.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                      title="Haritada aç"
                    >
                      <MapPinned className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Koordinatlar */}
              {(selectedItem.lat || selectedItem.lng) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 block mb-2">Enlem (Latitude)</label>
                    <div className="text-slate-700 font-mono text-sm">{selectedItem.lat || 'Belirtilmemiş'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 block mb-2">Boylam (Longitude)</label>
                    <div className="text-slate-700 font-mono text-sm">{selectedItem.lng || 'Belirtilmemiş'}</div>
                  </div>
                </div>
              )}

              {/* Arama Sorgusu */}
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">Arama Sorgusu</label>
                <div className="text-slate-700 font-mono text-sm bg-slate-50 p-2 rounded">{selectedItem.query || query || 'Belirtilmemiş'}</div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}


