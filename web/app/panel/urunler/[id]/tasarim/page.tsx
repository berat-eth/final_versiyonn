'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productsApi } from '@/utils/api'
import Link from 'next/link'
import Image from 'next/image'

interface Product {
  id: number;
  name: string;
  image?: string;
  price: number;
}

interface DesignElement {
  id: string;
  type: 'logo' | 'text';
  content: string; // URL for logo, text for text
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  rotation?: number;
}

export default function DesignEditorPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id ? Number(params.id) : null
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [elements, setElements] = useState<DesignElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [textColor, setTextColor] = useState('#000000')
  const [textSize, setTextSize] = useState(24)
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 600 })

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
    
    // Canvas boyutunu ayarla
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setCanvasSize({ width: rect.width, height: rect.height })
    }
  }, [productId])

  const loadProduct = async () => {
    if (!productId) return
    
    try {
      setLoading(true)
      const response = await productsApi.getProductById(productId)
      
      if (response.success && response.data) {
        setProduct(response.data)
      }
    } catch (error) {
      console.error('Ürün yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Sadece resim dosyalarını kabul et
    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seçin')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string
      const newElement: DesignElement = {
        id: `logo-${Date.now()}`,
        type: 'logo',
        content: imageUrl,
        x: canvasSize.width / 2 - 50,
        y: canvasSize.height / 2 - 50,
        width: 100,
        height: 100,
        rotation: 0
      }
      setElements([...elements, newElement])
      setSelectedElement(newElement.id)
    }
    reader.readAsDataURL(file)
  }

  const handleAddText = () => {
    if (!textInput.trim()) return

    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: textInput,
      x: canvasSize.width / 2 - 50,
      y: canvasSize.height / 2,
      width: 200,
      height: 40,
      fontSize: textSize,
      color: textColor,
      rotation: 0
    }
    setElements([...elements, newElement])
    setSelectedElement(newElement.id)
    setTextInput('')
    setShowTextInput(false)
  }

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const element = elements.find(el => el.id === elementId)
    if (!element) return

    setSelectedElement(elementId)
    setIsDragging(true)
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - element.x,
        y: e.clientY - rect.top - element.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left - dragOffset.x
    const y = e.clientY - rect.top - dragOffset.y

    setElements(elements.map(el => 
      el.id === selectedElement 
        ? { ...el, x: Math.max(0, Math.min(x, canvasSize.width - el.width)), y: Math.max(0, Math.min(y, canvasSize.height - el.height)) }
        : el
    ))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleDelete = () => {
    if (selectedElement) {
      setElements(elements.filter(el => el.id !== selectedElement))
      setSelectedElement(null)
    }
  }

  const handleResize = (elementId: string, delta: number) => {
    setElements(elements.map(el => {
      if (el.id === elementId) {
        const newWidth = Math.max(20, Math.min(el.width + delta, canvasSize.width - el.x))
        const newHeight = el.type === 'logo' 
          ? (el.height * newWidth / el.width) 
          : el.height
        return { ...el, width: newWidth, height: newHeight }
      }
      return el
    }))
  }

  const handleRotate = (elementId: string, delta: number) => {
    setElements(elements.map(el => {
      if (el.id === elementId) {
        return { ...el, rotation: (el.rotation || 0) + delta }
      }
      return el
    }))
  }

  const handleExport = async () => {
    if (!canvasRef.current) return

    try {
      // html2canvas kullanarak canvas'ı görüntüye dönüştür
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      // Canvas'ı blob'a dönüştür ve indir
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `tasarim-${productId || 'urun'}-${Date.now()}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (error) {
      console.error('Export hatası:', error)
      alert('Tasarım export edilirken bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const selectedElementData = elements.find(el => el.id === selectedElement)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/panel/urunler" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Ürünler
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          {product && (
            <>
              <Link href={`/urunler/${product.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {product.name}
              </Link>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </>
          )}
          <span className="text-gray-900 dark:text-white font-semibold">Tasarım Editörü</span>
        </nav>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Tools */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">build</span>
                Araçlar
              </h2>
              
              <div className="space-y-3">
                {/* Logo Upload */}
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all cursor-pointer">
                    <span className="material-symbols-outlined">image</span>
                    <span>Logo Ekle</span>
                  </div>
                </label>

                {/* Text Input */}
                {!showTextInput ? (
                  <button
                    onClick={() => setShowTextInput(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                  >
                    <span className="material-symbols-outlined">text_fields</span>
                    <span>Yazı Ekle</span>
                  </button>
                ) : (
                  <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Yazı girin..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      autoFocus
                    />
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-10 w-16 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        value={textSize}
                        onChange={(e) => setTextSize(Number(e.target.value))}
                        min="12"
                        max="72"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Boyut"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddText}
                        className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all"
                      >
                        Ekle
                      </button>
                      <button
                        onClick={() => {
                          setShowTextInput(false)
                          setTextInput('')
                        }}
                        className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete Button */}
                {selectedElement && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all"
                  >
                    <span className="material-symbols-outlined">delete</span>
                    <span>Seçili Öğeyi Sil</span>
                  </button>
                )}

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  <span className="material-symbols-outlined">download</span>
                  <span>Tasarımı İndir</span>
                </button>
              </div>
            </div>

            {/* Selected Element Controls */}
            {selectedElementData && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Öğe Ayarları
                </h3>
                
                <div className="space-y-4">
                  {/* Size Control */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Boyut
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResize(selectedElement, -10)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="flex-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {Math.round(selectedElementData.width)}px
                      </span>
                      <button
                        onClick={() => handleResize(selectedElement, 10)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Rotation Control */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Döndür
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRotate(selectedElement, -5)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">rotate_left</span>
                      </button>
                      <span className="flex-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {Math.round(selectedElementData.rotation || 0)}°
                      </span>
                      <button
                        onClick={() => handleRotate(selectedElement, 5)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">rotate_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">palette</span>
                Tasarım Alanı
              </h2>

              <div
                ref={canvasRef}
                className="relative bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600"
                style={{ width: '100%', height: '600px', maxHeight: '600px' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Product Image Background */}
                {product?.image && (
                  <div className="absolute inset-0">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain opacity-30"
                      unoptimized
                    />
                  </div>
                )}

                {/* Design Elements */}
                {elements.map((element) => (
                  <div
                    key={element.id}
                    onClick={() => setSelectedElement(element.id)}
                    onMouseDown={(e) => handleMouseDown(e, element.id)}
                    className={`absolute cursor-move transition-all ${
                      selectedElement === element.id
                        ? 'ring-2 ring-blue-500 ring-offset-2'
                        : ''
                    }`}
                    style={{
                      left: `${element.x}px`,
                      top: `${element.y}px`,
                      width: `${element.width}px`,
                      height: `${element.height}px`,
                      transform: `rotate(${element.rotation || 0}deg)`,
                      zIndex: selectedElement === element.id ? 10 : 5
                    }}
                  >
                    {element.type === 'logo' ? (
                      <img
                        src={element.content}
                        alt="Logo"
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center font-bold"
                        style={{
                          fontSize: `${element.fontSize || 24}px`,
                          color: element.color || '#000000',
                          textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
                        }}
                      >
                        {element.content}
                      </div>
                    )}
                    
                    {/* Selection Indicator */}
                    {selectedElement === element.id && (
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                ))}

                {/* Empty State */}
                {elements.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-500 mb-4">
                        add_photo_alternate
                      </span>
                      <p className="text-gray-600 dark:text-gray-400">
                        Tasarım oluşturmak için logo veya yazı ekleyin
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          {product && (
            <Link
              href={`/urunler/${product.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Ürüne Dön</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}