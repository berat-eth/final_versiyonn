'use client'

import { useEffect, useState } from 'react'
import { Folder, File, Upload, Download, Trash2, RefreshCw, Plus, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

interface FsItem {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  modifiedAt?: string
}

export default function FileManager() {
  const [cwd, setCwd] = useState<string>('/')
  const [items, setItems] = useState<FsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadList = async (dir: string) => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/files', { path: dir })
      if ((res as any)?.success && Array.isArray((res as any).data)) setItems((res as any).data)
      else setItems([])
    } catch (e:any) {
      setError(e?.message || 'Dosyalar getirilemedi')
      setItems([])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ loadList(cwd) }, [cwd])

  const goUp = () => {
    if (cwd === '/' || cwd === '') return
    const parts = cwd.split('/').filter(Boolean)
    parts.pop()
    const parent = '/' + parts.join('/')
    setCwd(parent || '/')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Dosya Yöneticisi</h2>
          <p className="text-slate-500 mt-1">Sunucu dosyalarını görüntüleyin ve yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>loadList(cwd)} className="px-4 py-3 border rounded-xl hover:bg-slate-50 flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Yenile</button>
          <button className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"><Plus className="w-4 h-4"/>Klasör</button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={goUp} className="px-2 py-1 border rounded-lg hover:bg-slate-50 flex items-center gap-1"><ArrowLeft className="w-4 h-4"/>Yukarı</button>
        <span className="px-2 py-1 bg-slate-100 rounded-lg">{cwd}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {loading && <p className="text-slate-500 text-sm">Yükleniyor...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, idx)=> (
            <motion.div key={it.path || idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity:1, y:0 }} transition={{ delay: idx * 0.02 }} className="border rounded-xl p-4 hover:shadow-sm cursor-pointer"
              onClick={()=>{ if (it.type==='dir') setCwd(it.path) }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {it.type==='dir' ? <Folder className="w-6 h-6 text-yellow-600"/> : <File className="w-6 h-6 text-slate-600"/>}
                  <div>
                    <p className="font-semibold text-slate-800">{it.name}</p>
                    <p className="text-xs text-slate-500">{it.modifiedAt || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {it.type==='file' && (
                    <a href={`#`} onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); window.open(`${location.origin}/api/admin/files/download?path=${encodeURIComponent(it.path)}`,'_blank') }} title="İndir" className="p-2 hover:bg-slate-100 rounded-lg"><Download className="w-4 h-4"/></a>
                  )}
                  <button onClick={async (e)=>{ e.stopPropagation(); try{ await api.delete<any>(`/admin/files?path=${encodeURIComponent(it.path)}`); await loadList(cwd) } catch { alert('Silinemedi'); } }} title="Sil" className="p-2 hover:bg-slate-100 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            </motion.div>
          ))}
          {items.length === 0 && !loading && !error && (
            <div className="text-slate-500 text-sm">Bu klasörde içerik yok</div>
          )}
        </div>
      </div>
    </div>
  )
}


