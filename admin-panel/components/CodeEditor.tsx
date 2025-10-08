'use client'

import { useEffect, useRef, useState } from 'react'
import { Save, Upload, Download, FileText, Code, Settings, Play, Square } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

interface CodeEditorProps {
  initialContent?: string
  language?: string
  fileName?: string
}

export default function CodeEditor({ 
  initialContent = '', 
  language = 'javascript',
  fileName = 'untitled.js'
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState(initialContent)
  const [currentLanguage, setCurrentLanguage] = useState(language)
  const [currentFileName, setCurrentFileName] = useState(fileName)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState('')

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'scss', label: 'SCSS' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'yaml', label: 'YAML' },
    { value: 'sql', label: 'SQL' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'plaintext', label: 'Plain Text' }
  ]

  // Syntax highlighting için basit CSS sınıfları
  const getSyntaxClass = (language: string) => {
    const classMap: { [key: string]: string } = {
      'javascript': 'language-javascript',
      'typescript': 'language-typescript',
      'python': 'language-python',
      'html': 'language-html',
      'css': 'language-css',
      'json': 'language-json',
      'sql': 'language-sql',
      'markdown': 'language-markdown'
    }
    return classMap[language] || 'language-plaintext'
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      // Dosyayı sunucuya kaydet
      const response = await api.post('/admin/files/save', {
        fileName: currentFileName,
        content: content,
        language: currentLanguage
      })

      if ((response as any).success) {
        alert('Dosya başarıyla kaydedildi!')
      } else {
        alert('Dosya kaydedilemedi!')
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error)
      alert('Dosya kaydedilemedi!')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRun = async () => {
    try {
      setIsRunning(true)
      setOutput('Kod çalıştırılıyor...\n')

      const response = await api.post('/admin/code/run', {
        code: content,
        language: currentLanguage
      })

      if ((response as any).success) {
        setOutput((response as any).output || 'Kod başarıyla çalıştırıldı!')
      } else {
        setOutput('Hata: ' + ((response as any).error || 'Bilinmeyen hata'))
      }
    } catch (error) {
      console.error('Çalıştırma hatası:', error)
      setOutput('Hata: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
    } finally {
      setIsRunning(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setContent(content)
        setCurrentFileName(file.name)
        
        // Dosya uzantısından dil belirle
        const extension = file.name.split('.').pop()?.toLowerCase()
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
          'md': 'markdown'
        }
        
        if (extension && langMap[extension]) {
          setCurrentLanguage(langMap[extension])
        }
      }
      reader.readAsText(file)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kod Editörü</h2>
          <p className="text-slate-500 mt-1">Syntax highlighting ile kod yazın ve çalıştırın</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".js,.ts,.py,.java,.cpp,.cs,.php,.rb,.go,.rs,.html,.css,.scss,.json,.xml,.yml,.yaml,.sql,.md,.txt"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="px-4 py-2 border rounded-xl hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Dosya Yükle
          </label>
          <button
            onClick={handleDownload}
            className="px-4 py-2 border rounded-xl hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            İndir
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Dosya bilgileri ve kontroller */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <input
              type="text"
              value={currentFileName}
              onChange={(e) => setCurrentFileName(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm font-medium"
              placeholder="Dosya adı"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-slate-600" />
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  Çalışıyor...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Çalıştır
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Editör */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-slate-100 p-4 border-b border-slate-700">
          <div className="flex items-center gap-2 text-sm">
            <Code className="w-4 h-4" />
            <span className="font-medium">{currentFileName}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-400">{currentLanguage}</span>
          </div>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full h-96 p-4 font-mono text-sm bg-slate-900 text-slate-100 border-0 outline-none resize-none ${getSyntaxClass(currentLanguage)}`}
            placeholder="Kodunuzu buraya yazın..."
            spellCheck={false}
            style={{
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              lineHeight: '1.5',
              tabSize: 2
            }}
          />
          <div className="absolute top-4 right-4 text-xs text-slate-500">
            {content.split('\n').length} satır
          </div>
        </div>
      </div>

      {/* Çıktı paneli */}
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-2xl shadow-sm p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Çıktı</h3>
            <button
              onClick={() => setOutput('')}
              className="text-slate-400 hover:text-white"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
          <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">
            {output}
          </pre>
        </motion.div>
      )}
    </div>
  )
}
