'use client'

import { Search, Bell, Mail, User, List } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function Header() {
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const loadLogs = () => {
    try {
      const l = JSON.parse(localStorage.getItem('apiLogs') || '[]')
      setLogs(l)
    } catch { setLogs([]) }
  }
  useEffect(() => {
    loadLogs()
    const handler = () => loadLogs()
    window.addEventListener('api-log-updated', handler)
    return () => window.removeEventListener('api-log-updated', handler)
  }, [])

  const filtered = logs.filter((l)=>{
    const text = `${l.method||''} ${l.status||''} ${l.url||''}`.toLowerCase()
    return text.includes(query.toLowerCase())
  })

  const statusColor = (status: number) => status >= 500 ? 'bg-red-100 text-red-700 border-red-200' : status >= 400 ? 'bg-orange-100 text-orange-700 border-orange-200' : status >= 300 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200'
  const methodColor = (m: string) => {
    const mm = (m||'GET').toUpperCase()
    if (mm === 'GET') return 'bg-blue-100 text-blue-700 border-blue-200'
    if (mm === 'POST') return 'bg-purple-100 text-purple-700 border-purple-200'
    if (mm === 'PUT' || mm === 'PATCH') return 'bg-amber-100 text-amber-700 border-amber-200'
    if (mm === 'DELETE') return 'bg-rose-100 text-rose-700 border-rose-200'
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const copy = (text: string) => {
    try { navigator.clipboard.writeText(text) } catch {}
  }

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ürün, sipariş veya müşteri ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4 ml-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-6 h-6 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Mail className="w-6 h-6 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLogs(!showLogs)}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="API Logları"
          >
            <List className="w-6 h-6 text-slate-600" />
          </motion.button>

          <div className="h-8 w-px bg-slate-200"></div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">Admin User</p>
              <p className="text-xs text-slate-500">Yönetici</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:shadow-lg transition-shadow">
              AY
            </div>
          </div>
        </div>
      </div>
      {showLogs && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4 max-h-96 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-700">API Logları</h4>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Ara (GET 200 /products)" className="px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{localStorage.removeItem('apiLogs'); setLogs([])}} className="text-xs text-red-600 hover:underline">Temizle</button>
              <button onClick={()=>{setExpanded({})}} className="text-xs text-slate-600 hover:underline">Daralt</button>
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz log yok</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {filtered.map((log, idx) => {
                const id = `${log.time}-${idx}`
                const isOpen = !!expanded[id]
                const urlText = String(log.url||'')
                const u = (()=>{ try { return new URL(urlText) } catch { return null }})()
                const path = u ? `${u.pathname}${u.search}` : urlText
                const host = u ? u.host : ''
                return (
                <li key={id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded border ${methodColor(log.method)}`}>{(log.method||'GET').toUpperCase()}</span>
                      <span className={`px-2 py-0.5 rounded border ${statusColor(Number(log.status||0))}`}>{log.status}</span>
                      <span className="text-slate-400">{new Date(log.time).toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>copy(urlText)} className="px-2 py-0.5 border border-slate-200 rounded hover:bg-slate-100">Kopyala</button>
                      <button onClick={()=>setExpanded((e)=>({...e, [id]: !isOpen}))} className="px-2 py-0.5 border border-slate-200 rounded hover:bg-slate-100">{isOpen? 'Gizle':'Detay'}</button>
                    </div>
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-slate-800 break-all">
                    {host && <span className="text-slate-400">{host}</span>}<span className="ml-1">{path}</span>
                  </div>
                  {isOpen && (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {log.requestBody && (
                        <div className="bg-white border border-slate-200 rounded p-2">
                          <div className="text-slate-600 mb-1">İstek Gövdesi</div>
                          <pre className="text-[11px] whitespace-pre-wrap break-all">{JSON.stringify(log.requestBody, null, 2)}</pre>
                        </div>
                      )}
                      {log.responseBody && (
                        <div className="bg-white border border-slate-200 rounded p-2">
                          <div className="text-slate-600 mb-1">Yanıt</div>
                          <pre className="text-[11px] whitespace-pre-wrap break-all">{JSON.stringify(log.responseBody, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )})}
            </ul>
          )}
        </div>
      )}
    </header>
  )
}
