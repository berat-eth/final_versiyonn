'use client'

import { useEffect, useState } from 'react'
import { Search, MapPin, Download, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function GoogleMapsScraper() {
  const [query, setQuery] = useState('silah bayi OR av bayii Konya')
  const [city, setCity] = useState('Konya')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])

  const runScrape = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.post<any>('/admin/scrapers/google-maps', { query, city })
      if ((res as any)?.success && Array.isArray((res as any).data)) setResults((res as any).data)
      else setResults([])
    } catch (e:any) {
      setError('Sunucu tarafında Google Maps scraping uç noktası bulunamadı veya hata verdi.')
      setResults([])
    } finally {
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
                  { name: 'Huğlu Bayi A', address: 'Merkez, Konya', city: 'Konya', phone: '+90 332 000 00 00', website: 'https://ornek1.com', locationUrl: 'https://maps.google.com/?q=Konya' },
                  { name: 'Av Malzemeleri B', address: 'Selçuklu, Konya', city: 'Konya', phone: '+90 332 111 11 11', website: '', locationUrl: '' },
                  { name: 'Outdoor C', address: 'Karatay, Konya', city: 'Konya', phone: '', website: 'https://ornek3.com', locationUrl: 'https://maps.google.com/?q=Karatay' },
                ])
                setError(null)
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
            >
              Demo Verisi
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 border border-yellow-200 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            {error} • Lütfen backend’e `/api/admin/scrapers/google-maps` uç noktasını ekleyin veya Demo Verisi ile arayüzü test edin.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {results.length === 0 ? (
          <p className="text-slate-500">Sonuç yok</p>
        ) : (
        <div className="space-y-3">
          {results.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="p-4 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{r.name}</p>
                  <p className="text-sm text-slate-600">{r.address} {r.city ? `• ${r.city}` : ''}</p>
                  <p className="text-xs text-slate-500">{r.phone} {r.website ? `• ${r.website}` : ''}</p>
                </div>
                {r.locationUrl && (
                  <a className="text-blue-600 hover:underline text-sm" target="_blank" rel="noopener noreferrer" href={r.locationUrl}>Haritada Aç</a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}


