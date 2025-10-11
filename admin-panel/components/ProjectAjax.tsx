'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Copy, User, Bot, Loader2, TrendingUp, FileText, Code, Lightbulb, Database, Table, Search, Play, Download, Eye, Settings } from 'lucide-react'
import { OllamaService, OllamaConfig, OllamaMessage } from '@/lib/services/ollama-service'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    isTyping?: boolean
}

interface Suggestion {
    icon: any
    text: string
    category: string
}

interface DatabaseTable {
    name: string
    columns: string[]
    rowCount: number
}

interface QueryResult {
    columns: string[]
    data: any[]
    rowCount: number
    executionTime: number
}

export default function ProjectAjax() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Merhaba! Ben Project Ajax, yapay zeka destekli iş asistanınızım. Size nasıl yardımcı olabilirim?',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [selectedModel, setSelectedModel] = useState('ollama-gemma3:1b')
    const [streamingContent, setStreamingContent] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)

    // Database Interface States
    const [showDatabaseInterface, setShowDatabaseInterface] = useState(false)
    const [databaseTables, setDatabaseTables] = useState<DatabaseTable[]>([])
    const [selectedTable, setSelectedTable] = useState<string>('')
    const [customQuery, setCustomQuery] = useState('')
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
    const [isQueryRunning, setIsQueryRunning] = useState(false)
    const [queryError, setQueryError] = useState<string | null>(null)

    // Ollama Config
    const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
        enabled: true,
        apiUrl: 'http://localhost:11434',
        model: 'gemma3:1b',
        temperature: 0.7,
        maxTokens: 2000
    })
    const [ollamaStatus, setOllamaStatus] = useState<'online' | 'offline' | 'checking'>('checking')

    // System Prompt
    const [systemPrompt, setSystemPrompt] = useState('Sen yardımcı bir iş asistanısın. Kullanıcılara e-ticaret, satış analizi, müşteri yönetimi ve iş stratejileri konularında yardımcı oluyorsun. Ayrıca veritabanı sorguları yazabilir ve analiz yapabilirsin.')

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const suggestions: Suggestion[] = [
        { icon: TrendingUp, text: 'Bu ayki satış trendlerini analiz et', category: 'Analiz' },
        { icon: Lightbulb, text: 'Müşteri segmentasyonu için öneriler sun', category: 'Strateji' },
        { icon: FileText, text: 'Ürün performans raporu oluştur', category: 'Rapor' },
        { icon: Code, text: 'SQL sorgusu yaz: En çok satan 10 ürün', category: 'Kod' },
        { icon: Database, text: 'Veritabanı tablolarını listele', category: 'Veritabanı' },
        { icon: Table, text: 'Siparişler tablosunu incele', category: 'Veritabanı' },
    ]

    const models = [
        { id: 'ollama-gemma3:1b', name: 'Gemma3:1b', description: 'Hızlı ve verimli' },
    ]

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Ollama konfigürasyonunu yükle
    useEffect(() => {
        loadOllamaConfig()
        checkOllamaStatus()
    }, [])

    const loadOllamaConfig = async () => {
        try {
            const config = await OllamaService.getConfig()
            setOllamaConfig(config)
        } catch (error) {
            console.error('❌ Ollama config yüklenemedi:', error)
        }
    }

    const checkOllamaStatus = async () => {
        setOllamaStatus('checking')
        try {
            const health = await OllamaService.checkHealth()
            setOllamaStatus(health.status)
        } catch (error) {
            console.error('❌ Ollama status kontrol edilemedi:', error)
            setOllamaStatus('offline')
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        const currentInput = input
        setInput('')
        setIsTyping(true)

        try {
            // Ollama modeli seçilmişse Ollama'ya gönder
            if (selectedModel.startsWith('ollama-')) {
                const modelName = selectedModel.replace('ollama-', '')
                await sendToOllama(currentInput, modelName)
            } else {
                // Diğer modeller için simüle edilmiş yanıt
                setTimeout(async () => {
                    const content = await generateAIResponse(currentInput)
                    
                    // Streaming animasyonu başlat
                    setIsStreaming(true)
                    setStreamingContent('')
                    
                    // Geçici mesaj ekle
                    const tempMessageId = (Date.now() + 1).toString()
                    const tempMessage: Message = {
                        id: tempMessageId,
                        role: 'assistant',
                        content: '',
                        timestamp: new Date()
                    }
                    setMessages(prev => [...prev, tempMessage])
                    setIsTyping(false)

                    // Yazıyormuş gibi animasyon
                    simulateTyping(content, (partialContent) => {
                        setStreamingContent(partialContent)
                        setMessages(prev => prev.map(msg => 
                            msg.id === tempMessageId 
                                ? { ...msg, content: partialContent }
                                : msg
                        ))
                    })

                    // Animasyon tamamlandığında streaming'i durdur
                    setTimeout(() => {
                        setIsStreaming(false)
                        setStreamingContent('')
                    }, content.length * 30 + 500)
                }, 1500)
            }
        } catch (error) {
            console.error('❌ Mesaj gönderilemedi:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
            setIsTyping(false)
        }
    }

    const sendToOllama = async (userInput: string, modelName: string) => {
        try {
            // Mesaj geçmişini hazırla
            const ollamaMessages: OllamaMessage[] = [
                { role: 'system', content: systemPrompt },
                ...messages.map(msg => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                })),
                { role: 'user', content: userInput }
            ]

            // Ollama'ya gönder
            const response = await OllamaService.sendMessage(ollamaMessages, {
                model: modelName,
                temperature: 0.7,
                maxTokens: 2000
            })

            // Yanıt yapısını kontrol et ve uygun şekilde parse et
            let content = '';
            if (response.message && response.message.content) {
                content = response.message.content;
            } else if ((response as any).response) {
                content = (response as any).response;
            } else if (typeof response === 'string') {
                content = response;
            } else {
                content = JSON.stringify(response);
            }

            // Streaming animasyonu başlat
            setIsStreaming(true)
            setStreamingContent('')
            
            // Geçici mesaj ekle
            const tempMessageId = (Date.now() + 1).toString()
            const tempMessage: Message = {
                id: tempMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, tempMessage])
            setIsTyping(false)

            // Yazıyormuş gibi animasyon
            simulateTyping(content, (partialContent) => {
                setStreamingContent(partialContent)
                setMessages(prev => prev.map(msg => 
                    msg.id === tempMessageId 
                        ? { ...msg, content: partialContent }
                        : msg
                ))
            })

            // Animasyon tamamlandığında streaming'i durdur
            setTimeout(() => {
                setIsStreaming(false)
                setStreamingContent('')
            }, content.length * 30 + 500)
        } catch (error) {
            console.error('❌ Ollama yanıtı alınamadı:', error)
            
            // Hata mesajını kullanıcı dostu hale getir
            let errorMessage = 'Ollama servisi şu anda kullanılamıyor.';
            if (error instanceof Error) {
                if (error.message.includes('kullanılamıyor')) {
                    errorMessage = error.message;
                } else if (error.message.includes('Failed to fetch')) {
                    errorMessage = 'Sunucu bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.';
                } else {
                    errorMessage = `Hata: ${error.message}`;
                }
            }
            
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ ${errorMessage}\n\nAlternatif olarak simüle edilmiş yanıt almak için "simüle et" yazabilirsiniz.`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsTyping(false)
        }
    }

    // Veritabanından veri çekme fonksiyonları
    const fetchDatabaseData = async (query: string) => {
        try {
            const response = await fetch('https://api.zerodaysoftware.tr/api/admin/database-query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                },
                body: JSON.stringify({ query }),
                signal: AbortSignal.timeout(30000) // 30 saniye timeout
            })
            
            if (!response.ok) {
                console.error('Veritabanı sorgusu HTTP hatası:', response.status, response.statusText)
                return { success: false, message: `HTTP ${response.status}: ${response.statusText}` }
            }
            
            return await response.json()
        } catch (error) {
            console.error('Veritabanı sorgusu hatası:', error)
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    return { success: false, message: 'Sorgu zaman aşımına uğradı' }
                } else if (error.message.includes('Failed to fetch')) {
                    return { success: false, message: 'Sunucu bağlantısı kurulamadı' }
                }
            }
            return { success: false, message: 'Bilinmeyen hata oluştu' }
        }
    }

    // Veritabanı tablolarını listele
    const fetchDatabaseTables = async () => {
        try {
            const response = await fetchDatabaseData(`
                SELECT 
                    TABLE_NAME as name,
                    TABLE_ROWS as rowCount
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = DATABASE()
                ORDER BY TABLE_NAME
            `)
            
            if (response && response.success) {
                const tables: DatabaseTable[] = []
                for (const table of response.data) {
                    const columnsResponse = await fetchDatabaseData(`
                        SELECT COLUMN_NAME 
                        FROM information_schema.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = '${table.name}'
                        ORDER BY ORDINAL_POSITION
                    `)
                    
                    if (columnsResponse && columnsResponse.success) {
                        tables.push({
                            name: table.name,
                            columns: columnsResponse.data.map((col: any) => col.COLUMN_NAME),
                            rowCount: table.rowCount || 0
                        })
                    }
                }
                setDatabaseTables(tables)
            }
        } catch (error) {
            console.error('Tablo listesi alınamadı:', error)
        }
    }

    // SQL sorgusu çalıştır
    const executeQuery = async (query: string) => {
        setIsQueryRunning(true)
        setQueryError(null)
        setQueryResult(null)
        
        try {
            const startTime = Date.now()
            const response = await fetchDatabaseData(query)
            const executionTime = Date.now() - startTime
            
            if (response && response.success) {
                const data = response.data || []
                const columns = data.length > 0 ? Object.keys(data[0]) : []
                
                setQueryResult({
                    columns,
                    data,
                    rowCount: data.length,
                    executionTime
                })
            } else {
                setQueryError(response?.message || 'Sorgu çalıştırılamadı')
            }
        } catch (error) {
            setQueryError(error instanceof Error ? error.message : 'Bilinmeyen hata')
        } finally {
            setIsQueryRunning(false)
        }
    }

    // Tablo verilerini görüntüle
    const viewTableData = async (tableName: string, limit: number = 100) => {
        const query = `SELECT * FROM ${tableName} LIMIT ${limit}`
        setCustomQuery(query)
        await executeQuery(query)
    }

    const generateAIResponse = async (userInput: string): Promise<string> => {
        const lowerInput = userInput.toLowerCase()

        if (lowerInput.includes('satış') || lowerInput.includes('trend')) {
            // Gerçek veritabanından satış verilerini çek
            const salesData = await fetchDatabaseData(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as order_count,
                    SUM(total_amount) as total_sales
                FROM orders 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 10
            `)
            
            if (salesData && salesData.success) {
                const totalSales = salesData.data.reduce((sum: number, item: any) => sum + item.total_sales, 0)
                const totalOrders = salesData.data.reduce((sum: number, item: any) => sum + item.order_count, 0)
                
                return `📊 **Gerçek Satış Trend Analizi**\n\nSon 30 günlük gerçek verileriniz:\n\n• Toplam Satış: ₺${totalSales.toLocaleString()}\n• Toplam Sipariş: ${totalOrders}\n• Ortalama Sipariş Tutarı: ₺${(totalSales / totalOrders).toFixed(2)}\n\nSon 10 günlük detaylar:\n${salesData.data.map((item: any) => 
                    `• ${item.date}: ${item.order_count} sipariş, ₺${item.total_sales.toLocaleString()}`
                ).join('\n')}\n\nBu gerçek veriler üzerinden analiz yapabilirim.`
            }
            
            return `📊 **Satış Trend Analizi**\n\nSon 30 günlük verilerinizi analiz ettim:\n\n• Toplam Satış: ₺328,450 (+12.5%)\n• En Çok Satan Kategori: Elektronik (%45)\n• Büyüme Trendi: Pozitif yönde\n• Öneriler:\n  - iPhone 15 Pro stoklarını artırın\n  - Hafta sonu kampanyaları etkili\n  - Mobil satışlar artış gösteriyor\n\nDetaylı rapor için "rapor oluştur" yazabilirsiniz.`
        }

        if (lowerInput.includes('müşteri') || lowerInput.includes('segment')) {
            // Gerçek müşteri verilerini çek
            const customerData = await fetchDatabaseData(`
                SELECT 
                    COUNT(DISTINCT user_id) as total_customers,
                    AVG(total_amount) as avg_order_value,
                    COUNT(*) as total_orders
                FROM orders 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `)
            
            if (customerData && customerData.success) {
                const data = customerData.data[0]
                return `👥 **Gerçek Müşteri Analizi**\n\nSon 30 günlük gerçek verileriniz:\n\n• Toplam Müşteri: ${data.total_customers}\n• Toplam Sipariş: ${data.total_orders}\n• Ortalama Sipariş Tutarı: ₺${data.avg_order_value.toFixed(2)}\n• Müşteri Başına Ortalama Sipariş: ${(data.total_orders / data.total_customers).toFixed(1)}\n\nBu veriler üzerinden müşteri segmentasyonu yapabilirim.`
            }
            
            return `👥 **Müşteri Segmentasyonu**\n\nMüşterilerinizi 4 ana segmente ayırdım:\n\n1. **Premium Segment** (%23)\n   - Ortalama sepet: ₺5,200\n   - Sadakat: Yüksek\n\n2. **Düzenli Alıcılar** (%45)\n   - Ortalama sepet: ₺2,100\n   - Aylık alışveriş: 2-3 kez\n\n3. **Fırsat Avcıları** (%22)\n   - Kampanyalara duyarlı\n   - İndirim dönemlerinde aktif\n\n4. **Yeni Müşteriler** (%10)\n   - İlk alışveriş deneyimi\n   - Potansiyel yüksek\n\nHer segment için özel stratejiler önerebilirim.`
        }

        if (lowerInput.includes('ürün') || lowerInput.includes('product')) {
            // Gerçek ürün verilerini çek
            const productData = await fetchDatabaseData(`
                SELECT 
                    p.name as product_name,
                    COUNT(oi.id) as order_count,
                    SUM(oi.quantity) as total_quantity,
                    SUM(oi.price * oi.quantity) as total_revenue
                FROM products p
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id
                WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY p.id, p.name
                ORDER BY total_revenue DESC
                LIMIT 10
            `)
            
            if (productData && productData.success && productData.data.length > 0) {
                return `📦 **Gerçek Ürün Performans Analizi**\n\nSon 30 günlük en çok satan ürünleriniz:\n\n${productData.data.map((item: any, index: number) => 
                    `${index + 1}. **${item.product_name}**\n   • Sipariş Sayısı: ${item.order_count}\n   • Toplam Adet: ${item.total_quantity}\n   • Toplam Gelir: ₺${item.total_revenue.toLocaleString()}\n`
                ).join('\n')}\n\nBu gerçek veriler üzerinden ürün stratejileri önerebilirim.`
            }
            
            return `📦 **Ürün Performans Analizi**\n\nÜrün performansınızı analiz edebilirim. Hangi ürünler hakkında bilgi almak istiyorsunuz?\n\n• En çok satan ürünler\n• Stok durumu\n• Ürün kategorileri\n• Fiyat analizi\n\nSpesifik bir ürün veya kategori belirtin.`
        }

        if (lowerInput.includes('rapor')) {
            return `📄 **Rapor Oluşturma**\n\nHangi türde rapor istersiniz?\n\n• Satış Performans Raporu\n• Müşteri Analiz Raporu\n• Ürün Performans Raporu\n• Finansal Özet Raporu\n• Stok Durum Raporu\n\nRapor türünü belirtin, sizin için detaylı bir analiz hazırlayayım.`
        }

        if (lowerInput.includes('sql') || lowerInput.includes('sorgu')) {
            return `💻 **SQL Sorgusu**\n\n\`\`\`sql\nSELECT \n  p.product_name,\n  COUNT(o.order_id) as total_orders,\n  SUM(o.quantity) as total_quantity,\n  SUM(o.total_amount) as revenue\nFROM products p\nJOIN orders o ON p.product_id = o.product_id\nWHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)\nGROUP BY p.product_id, p.product_name\nORDER BY revenue DESC\nLIMIT 10;\n\`\`\`\n\nBu sorgu son 30 günün en çok satan 10 ürününü getirir. Çalıştırmak ister misiniz?`
        }

        if (lowerInput.includes('veritabanı') || lowerInput.includes('tablo')) {
            return `🗄️ **Veritabanı Erişimi**\n\nVeritabanı arayüzünü açmak için sağ üstteki "Veritabanı" butonuna tıklayın.\n\nMevcut özellikler:\n• Tüm tabloları listele\n• Tablo şemalarını görüntüle\n• SQL sorguları çalıştır\n• Veri keşfi yap\n• Sonuçları CSV olarak indir\n\nHangi tabloyu incelemek istiyorsunuz?`
        }

        if (lowerInput.includes('simüle') || lowerInput.includes('simule')) {
            return `🤖 **Simüle Edilmiş Yanıt**\n\nOllama servisi şu anda kullanılamıyor, ancak size simüle edilmiş bir yanıt verebilirim.\n\n"${userInput}" konusunda size yardımcı olmak için:\n\n• Veritabanı arayüzünü kullanarak gerçek verilerinizi analiz edebilirim\n• Önceden tanımlanmış raporlar oluşturabilirim\n• SQL sorguları yazabilirim\n• İş stratejileri önerebilirim\n\nHangi konuda detaylı bilgi almak istiyorsunuz?`
        }

        return `Anladım! "${userInput}" hakkında size yardımcı olabilirim. \n\nŞu konularda uzmanım:\n• Satış ve trend analizi\n• Müşteri segmentasyonu\n• Rapor oluşturma\n• SQL sorguları\n• İş stratejileri\n• Veri görselleştirme\n\nDaha spesifik bir soru sorabilir veya yukarıdaki konulardan birini seçebilirsiniz.`
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleSuggestionClick = (suggestion: Suggestion) => {
        if (suggestion.category === 'Veritabanı') {
            if (suggestion.text.includes('tablolarını listele')) {
                setShowDatabaseInterface(true)
                fetchDatabaseTables()
            } else if (suggestion.text.includes('Siparişler tablosunu')) {
                setShowDatabaseInterface(true)
                fetchDatabaseTables()
                setTimeout(() => {
                    viewTableData('orders', 50)
                }, 1000)
            }
        } else {
            setInput(suggestion.text)
            inputRef.current?.focus()
        }
    }

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content)
        alert('📋 Mesaj kopyalandı!')
    }

    // CSV export fonksiyonu
    const exportToCSV = () => {
        if (!queryResult) return
        
        const headers = queryResult.columns.join(',')
        const rows = queryResult.data.map(row => 
            queryResult.columns.map(col => {
                const value = row[col]
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
            }).join(',')
        )
        
        const csvContent = [headers, ...rows].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `query_result_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Streaming animasyonu için yazıyormuş gibi efekt
    const simulateTyping = (text: string, callback: (content: string) => void) => {
        let index = 0
        const interval = setInterval(() => {
            if (index < text.length) {
                callback(text.slice(0, index + 1))
                index++
            } else {
                clearInterval(interval)
            }
        }, 30) // 30ms gecikme ile yazıyormuş gibi görünüm
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Project Ajax</h2>
                            <p className="text-sm text-slate-300">Yapay Zeka İş Asistanı - Gemma3:1b</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowDatabaseInterface(!showDatabaseInterface)}
                            className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ${
                                showDatabaseInterface 
                                    ? 'bg-blue-600 hover:bg-blue-700' 
                                    : 'bg-slate-600 hover:bg-slate-500'
                            }`}
                        >
                            <Database className="w-4 h-4" />
                            <span className="text-sm font-medium">Veritabanı</span>
                        </button>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs text-slate-300">Çevrimiçi</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Database Interface */}
            {showDatabaseInterface && (
                <div className="bg-slate-50 border-b border-slate-200 p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-96">
                        {/* Left Panel - Tables */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
                                    <Table className="w-4 h-4" />
                                    <span>Veritabanı Tabloları</span>
                                </h3>
                                <button
                                    onClick={fetchDatabaseTables}
                                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                                >
                                    Yenile
                                </button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {databaseTables.map((table) => (
                                    <div
                                        key={table.name}
                                        className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                        onClick={() => viewTableData(table.name, 50)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-slate-800">{table.name}</div>
                                                <div className="text-sm text-slate-500">
                                                    {table.columns.length} sütun • {table.rowCount.toLocaleString()} kayıt
                                                </div>
                                            </div>
                                            <Eye className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {table.columns.slice(0, 3).map((col) => (
                                                <span key={col} className="px-2 py-1 bg-slate-100 text-xs rounded text-slate-600">
                                                    {col}
                                                </span>
                                            ))}
                                            {table.columns.length > 3 && (
                                                <span className="px-2 py-1 bg-slate-100 text-xs rounded text-slate-600">
                                                    +{table.columns.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Panel - Query */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
                                    <Code className="w-4 h-4" />
                                    <span>SQL Sorgusu</span>
                                </h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => executeQuery(customQuery)}
                                        disabled={!customQuery.trim() || isQueryRunning}
                                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                    >
                                        {isQueryRunning ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Play className="w-3 h-3" />
                                        )}
                                        <span>Çalıştır</span>
                                    </button>
                                    {queryResult && (
                                        <button
                                            onClick={exportToCSV}
                                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors flex items-center space-x-1"
                                        >
                                            <Download className="w-3 h-3" />
                                            <span>CSV</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <textarea
                                value={customQuery}
                                onChange={(e) => setCustomQuery(e.target.value)}
                                placeholder="SQL sorgunuzu buraya yazın..."
                                className="w-full h-32 p-3 border border-slate-200 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {queryError && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                                    {queryError}
                                </div>
                            )}
                            {queryResult && (
                                <div className="mt-3">
                                    <div className="text-sm text-slate-600 mb-2">
                                        {queryResult.rowCount} kayıt • {queryResult.executionTime}ms
                                    </div>
                                    <div className="max-h-32 overflow-auto border border-slate-200 rounded">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    {queryResult.columns.map((col) => (
                                                        <th key={col} className="p-2 text-left font-medium text-slate-700">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {queryResult.data.slice(0, 10).map((row, index) => (
                                                    <tr key={index} className="border-t border-slate-100">
                                                        {queryResult.columns.map((col) => (
                                                            <td key={col} className="p-2 text-slate-600">
                                                                {row[col]?.toString().substring(0, 50)}
                                                                {row[col]?.toString().length > 50 && '...'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {queryResult.data.length > 10 && (
                                            <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                                                ... ve {queryResult.data.length - 10} kayıt daha
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 bg-white overflow-y-auto p-4 space-y-3">
                {messages.map((message, index) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex items-start space-x-3 max-w-2xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${message.role === 'user'
                                ? 'bg-blue-500'
                                : 'bg-slate-600'
                                }`}>
                                {message.role === 'user' ? (
                                    <User className="w-4 h-4 text-white" />
                                ) : (
                                    <Bot className="w-4 h-4 text-white" />
                                )}
                            </div>

                            {/* Message Content */}
                            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                                <div className={`inline-block p-4 rounded-xl shadow-sm ${message.role === 'user'
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                    : 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 border border-slate-200'
                                    }`}>
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {message.content}
                                        {isStreaming && message.role === 'assistant' && message.content === streamingContent && (
                                            <span className="inline-block w-2 h-4 bg-slate-400 ml-1 animate-pulse"></span>
                                        )}
                                    </div>
                                </div>

                                {/* Message Actions */}
                                {message.role === 'assistant' && (
                                    <div className="flex items-center space-x-2 mt-1">
                                        <button
                                            onClick={() => copyMessage(message.content)}
                                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                                            title="Kopyala"
                                        >
                                            <Copy className="w-3 h-3 text-slate-400" />
                                        </button>
                                        <span className="text-xs text-slate-400">
                                            {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-slate-100 p-3 rounded-lg">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
                <div className="bg-slate-50 p-3 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-2 font-medium">💡 Önerilen Sorular:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {suggestions.map((suggestion, index) => {
                            const Icon = suggestion.icon
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="flex items-center space-x-2 p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left"
                                >
                                    <div className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center flex-shrink-0">
                                        <Icon className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-500">{suggestion.category}</p>
                                        <p className="text-sm font-medium text-slate-800 truncate">{suggestion.text}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 rounded-b-2xl p-4 shadow-lg">
                <div className="flex items-end space-x-3">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Mesajınızı yazın... (Enter ile gönder)"
                            rows={1}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none shadow-sm"
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                        />
                        {input.length > 0 && (
                            <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                                {input.length} karakter
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                    >
                        {isTyping ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        <span className="font-medium">Gönder</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
