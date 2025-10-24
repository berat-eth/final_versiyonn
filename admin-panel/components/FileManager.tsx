'use client'

import { useEffect, useState } from 'react'
import { Folder, File, RefreshCw, ArrowLeft, Eye, X, Code } from 'lucide-react'
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
  const [viewingFile, setViewingFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [isViewing, setIsViewing] = useState(false)

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

  const getFileLanguage = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    const langMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yml': 'yaml',
      'yaml': 'yaml',
      'sql': 'sql',
      'md': 'markdown',
      'txt': 'plaintext'
    }
    return langMap[extension || ''] || 'plaintext'
  }

  const handleViewFile = async (filePath: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get('/admin/files/content', { path: filePath })
      if ((response as any)?.success) {
        setFileContent((response as any).data.content || '')
        setViewingFile(filePath)
        setIsViewing(true)
      } else {
        setError('Dosya içeriği yüklenemedi')
      }
    } catch (e: any) {
      setError(e?.message || 'Dosya yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseViewer = () => {
    setIsViewing(false)
    setViewingFile(null)
    setFileContent('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Dosya Görüntüleyici</h2>
          <p className="text-slate-500 mt-1">Sunucu dosyalarını görüntüleyin</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>loadList(cwd)} className="px-4 py-3 border rounded-xl hover:bg-slate-50 flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Yenile</button>
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
                    <button 
                      onClick={(e)=>{ e.stopPropagation(); handleViewFile(it.path) }} 
                      title="Görüntüle" 
                      className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {items.length === 0 && !loading && !error && (
            <div className="text-slate-500 text-sm">Bu klasörde içerik yok</div>
          )}
        </div>
      </div>

      {/* Dosya Görüntüleyici */}
      {isViewing && viewingFile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="bg-slate-900 text-slate-100 p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Code className="w-4 h-4" />
                <span className="font-medium">{viewingFile.split('/').pop()}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">{getFileLanguage(viewingFile)}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">Salt Okunur</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCloseViewer}
                  className="px-3 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2 text-sm"
                >
                  <X className="w-4 h-4" />
                  Kapat
                </button>
              </div>
            </div>
          </div>
          <div className="relative">
            <pre className="w-full h-96 p-4 font-mono text-sm bg-slate-900 text-slate-100 border-0 outline-none overflow-auto whitespace-pre-wrap"
              style={{
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                lineHeight: '1.5',
                tabSize: 2
              }}
            >
              {fileContent || 'Dosya içeriği yükleniyor...'}
            </pre>
            <div className="absolute top-4 right-4 text-xs text-slate-500">
              {fileContent.split('\n').length} satır
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}


