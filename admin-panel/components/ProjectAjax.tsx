'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Copy, User, Bot, Loader2, TrendingUp, FileText, Code, Lightbulb, Database, Table, Search, Play, Download, Eye, Settings, BarChart3, Activity } from 'lucide-react'
import { OllamaService, OllamaConfig, OllamaMessage } from '@/lib/services/ollama-service'
import { analyticsService, productService, orderService } from '@/lib/services'
import { api } from '@/lib/api'

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

interface ApiAnalysisResult {
    endpoint: string
    method: string
    status: 'success' | 'error' | 'loading'
    data?: any
    error?: string
    responseTime?: number
    timestamp: Date
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

    // Database Interface States - Removed

    // API Analysis States
    const [showApiAnalysis, setShowApiAnalysis] = useState(false)
    const [apiResults, setApiResults] = useState<ApiAnalysisResult[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)

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
    const [systemPrompt, setSystemPrompt] = useState(`Sen Ajax AI'sın - gelişmiş bir yapay zeka asistanısın.

GÖREVİN:
• E-ticaret ve iş analizi konularında uzman yardım sağla
• Satış trendleri, müşteri segmentasyonu ve ürün performansı analiz et
• İş stratejileri ve raporlar oluştur
• API performans analizi yap
• Kullanıcılara pratik çözümler sun

KİMLİĞİN:
• İsmin: Ajax AI
• Geliştirici: Berat Şimşek
• Uzmanlık Alanın: E-ticaret, iş analizi, veri analizi
• Amacın: İşletmelerin daha iyi kararlar almasına yardımcı olmak

YAKLAŞIMIN:
• Kısa, net ve pratik yanıtlar ver
• Veri odaklı öneriler sun
• Kullanıcı dostu dil kullan
• Somut çözümler öner

Kimliğin hakkında soru sorulduğunda kendini Ajax AI olarak tanıt ve Berat Şimşek tarafından geliştirildiğini belirt.`)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const suggestions: Suggestion[] = [
        { icon: TrendingUp, text: 'Bu ayki satış trendlerini analiz et', category: 'Analiz' },
        { icon: Lightbulb, text: 'Müşteri segmentasyonu için öneriler sun', category: 'Strateji' },
        { icon: FileText, text: 'Ürün performans raporu oluştur', category: 'Rapor' },
        { icon: Code, text: 'SQL sorgusu yaz: En çok satan 10 ürün', category: 'Kod' },
        { icon: BarChart3, text: 'API performansını analiz et', category: 'API' },
        { icon: Activity, text: 'Tüm API endpointlerini test et', category: 'API' },
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
            // Anahtar kelimeleri kontrol et ve API verisi çek
            let enhancedPrompt = systemPrompt
            const lowerInput = userInput.toLowerCase()
            
            // Satış/trend anahtar kelimeleri
            if (lowerInput.includes('satış') || lowerInput.includes('trend') || lowerInput.includes('analiz')) {
                try {
                    const salesData = await fetch('https://api.zerodaysoftware.tr/api/admin/orders', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                        },
                        signal: AbortSignal.timeout(10000)
                    })
                    
                    if (salesData.ok) {
                        const data = await salesData.json()
                        // Veriyi sınırla - sadece ilk 5 kayıt
                        const limitedData = Array.isArray(data) ? data.slice(0, 5) : data
                        enhancedPrompt += `\n\nGÜNCEL SATIŞ VERİLERİ (Son 5 kayıt):\n${JSON.stringify(limitedData, null, 2)}`
                    }
                } catch (error) {
                    console.log('Satış verisi alınamadı:', error)
                }
            }
            
            // Ürün anahtar kelimeleri
            if (lowerInput.includes('ürün') || lowerInput.includes('product') || lowerInput.includes('stok')) {
                try {
                    const productData = await fetch('https://api.zerodaysoftware.tr/api/products', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                        },
                        signal: AbortSignal.timeout(10000)
                    })
                    
                    if (productData.ok) {
                        const data = await productData.json()
                        // Veriyi sınırla - sadece ilk 5 kayıt
                        const limitedData = Array.isArray(data) ? data.slice(0, 5) : data
                        enhancedPrompt += `\n\nGÜNCEL ÜRÜN VERİLERİ (Son 5 kayıt):\n${JSON.stringify(limitedData, null, 2)}`
                    }
                } catch (error) {
                    console.log('Ürün verisi alınamadı:', error)
                }
            }
            
            // Müşteri anahtar kelimeleri
            if (lowerInput.includes('müşteri') || lowerInput.includes('customer') || lowerInput.includes('segment')) {
                try {
                    const customerData = await fetch('https://api.zerodaysoftware.tr/api/admin/users', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                        },
                        signal: AbortSignal.timeout(10000)
                    })
                    
                    if (customerData.ok) {
                        const data = await customerData.json()
                        // Veriyi sınırla - sadece ilk 5 kayıt
                        const limitedData = Array.isArray(data) ? data.slice(0, 5) : data
                        enhancedPrompt += `\n\nGÜNCEL MÜŞTERİ VERİLERİ (Son 5 kayıt):\n${JSON.stringify(limitedData, null, 2)}`
                    }
                } catch (error) {
                    console.log('Müşteri verisi alınamadı:', error)
                }
            }
            
            // Kategori anahtar kelimeleri
            if (lowerInput.includes('kategori') || lowerInput.includes('category') || lowerInput.includes('kamp')) {
                try {
                    const categoryData = await fetch('https://api.zerodaysoftware.tr/api/categories', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                        },
                        signal: AbortSignal.timeout(10000)
                    })
                    
                    if (categoryData.ok) {
                        const data = await categoryData.json()
                        // Veriyi sınırla - sadece ilk 5 kayıt
                        const limitedData = Array.isArray(data) ? data.slice(0, 5) : data
                        enhancedPrompt += `\n\nGÜNCEL KATEGORİ VERİLERİ (Son 5 kayıt):\n${JSON.stringify(limitedData, null, 2)}`
                    }
                } catch (error) {
                    console.log('Kategori verisi alınamadı:', error)
                }
            }
            
            // Analitik anahtar kelimeleri
            if (lowerInput.includes('rapor') || lowerInput.includes('report') || lowerInput.includes('analitik')) {
                try {
                    const analyticsData = await fetch('https://api.zerodaysoftware.tr/api/analytics/monthly', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                        },
                        signal: AbortSignal.timeout(10000)
                    })
                    
                    if (analyticsData.ok) {
                        const data = await analyticsData.json()
                        // Veriyi sınırla - sadece ilk 5 kayıt
                        const limitedData = Array.isArray(data) ? data.slice(0, 5) : data
                        enhancedPrompt += `\n\nGÜNCEL ANALİTİK VERİLERİ (Son 5 kayıt):\n${JSON.stringify(limitedData, null, 2)}`
                    }
                } catch (error) {
                    console.log('Analitik verisi alınamadı:', error)
                }
            }
            
            // Stok anahtar kelimeleri
            if (lowerInput.includes('stok') || lowerInput.includes('stock') || lowerInput.includes('düşük')) {
                try {
                    const stockData = await fetch('https://api.zerodaysoftware.tr/api/products/low-stock', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                        },
                        signal: AbortSignal.timeout(10000)
                    })
                    
                    if (stockData.ok) {
                        const data = await stockData.json()
                        // Veriyi sınırla - sadece ilk 5 kayıt
                        const limitedData = Array.isArray(data) ? data.slice(0, 5) : data
                        enhancedPrompt += `\n\nGÜNCEL STOK VERİLERİ (Son 5 kayıt):\n${JSON.stringify(limitedData, null, 2)}`
                    }
                } catch (error) {
                    console.log('Stok verisi alınamadı:', error)
                }
            }

            // Mesaj geçmişini hazırla - daha kısa tut
            const ollamaMessages: OllamaMessage[] = [
                { role: 'system', content: enhancedPrompt }
            ]

            // Son 4 mesajı al ve içeriklerini kısalt
            const recentMessages = messages.slice(-4)
            recentMessages.forEach(msg => {
                const shortContent = msg.content.length > 150 
                    ? msg.content.substring(0, 150) + '...' 
                    : msg.content
                
                ollamaMessages.push({
                    role: msg.role as 'user' | 'assistant',
                    content: shortContent
                })
            })

            // Kullanıcının yeni mesajını ekle
            ollamaMessages.push({ role: 'user', content: userInput })

            // Ollama'ya gönder
            const response = await OllamaService.sendMessage(ollamaMessages, {
                model: modelName,
                temperature: 0.7,
                maxTokens: 4000
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
                content: `❌ ${errorMessage}\n\nLütfen daha sonra tekrar deneyin.`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsTyping(false)
        }
    }

    // Database functions removed

    // Database functions removed

    // Database functions removed

    // Database functions removed

    // API analiz fonksiyonları
    const analyzeApiEndpoint = async (endpoint: string, method: string = 'GET', data?: any): Promise<ApiAnalysisResult> => {
        const startTime = Date.now()
        const result: ApiAnalysisResult = {
            endpoint,
            method,
            status: 'loading',
            timestamp: new Date()
        }

        try {
            let response: any
            const fullUrl = `https://api.zerodaysoftware.tr/api${endpoint}`
            
            const headers = {
                'Content-Type': 'application/json',
                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
            }

            if (method === 'GET') {
                response = await fetch(fullUrl, { 
                    method: 'GET', 
                    headers,
                    signal: AbortSignal.timeout(10000)
                })
            } else if (method === 'POST') {
                response = await fetch(fullUrl, { 
                    method: 'POST', 
                    headers,
                    body: JSON.stringify(data || {}),
                    signal: AbortSignal.timeout(10000)
                })
            }

            const responseTime = Date.now() - startTime
            const responseData = await response.json()

            if (response.ok) {
                result.status = 'success'
                result.data = responseData
                result.responseTime = responseTime
            } else {
                result.status = 'error'
                result.error = `HTTP ${response.status}: ${responseData.message || 'Unknown error'}`
                result.responseTime = responseTime
            }
        } catch (error) {
            const responseTime = Date.now() - startTime
            result.status = 'error'
            result.error = error instanceof Error ? error.message : 'Unknown error'
            result.responseTime = responseTime
        }

        return result
    }

    // Tüm API endpointlerini test et
    const testAllApiEndpoints = async () => {
        setIsAnalyzing(true)
        setApiResults([])

        const endpoints = [
            { endpoint: '/admin/orders', method: 'GET' },
            { endpoint: '/admin/users', method: 'GET' },
            { endpoint: '/admin/categories', method: 'GET' },
            { endpoint: '/admin/category-stats', method: 'GET' },
            { endpoint: '/products', method: 'GET' },
            { endpoint: '/categories', method: 'GET' },
            { endpoint: '/analytics/monthly', method: 'GET' },
            { endpoint: '/products/low-stock', method: 'GET' },
            { endpoint: '/admin/visitor-ips', method: 'GET' },
            { endpoint: '/admin/live-views', method: 'GET' },
            { endpoint: '/admin/snort/logs', method: 'GET' },
            { endpoint: '/admin/custom-production-requests', method: 'GET' }
        ]

        const results: ApiAnalysisResult[] = []

        for (const endpoint of endpoints) {
            const result = await analyzeApiEndpoint(endpoint.endpoint, endpoint.method)
            results.push(result)
            setApiResults([...results]) // Her sonuç için güncelle
        }

        setIsAnalyzing(false)
    }

    // API performans analizi
    const analyzeApiPerformance = async () => {
        setIsAnalyzing(true)
        setApiResults([])

        const performanceEndpoints = [
            { endpoint: '/admin/orders', method: 'GET', name: 'Siparişler' },
            { endpoint: '/products', method: 'GET', name: 'Ürünler' },
            { endpoint: '/categories', method: 'GET', name: 'Kategoriler' },
            { endpoint: '/analytics/monthly', method: 'GET', name: 'Analitik' }
        ]

        const results: ApiAnalysisResult[] = []

        // Her endpoint'i 3 kez test et
        for (const endpoint of performanceEndpoints) {
            const testResults: number[] = []
            
            for (let i = 0; i < 3; i++) {
                const result = await analyzeApiEndpoint(endpoint.endpoint, endpoint.method)
                if (result.responseTime) {
                    testResults.push(result.responseTime)
                }
            }

            const avgResponseTime = testResults.reduce((a, b) => a + b, 0) / testResults.length
            const minResponseTime = Math.min(...testResults)
            const maxResponseTime = Math.max(...testResults)

            results.push({
                endpoint: `${endpoint.name} (${endpoint.endpoint})`,
                method: endpoint.method,
                status: 'success',
                data: {
                    averageResponseTime: Math.round(avgResponseTime),
                    minResponseTime,
                    maxResponseTime,
                    tests: testResults.length
                },
                responseTime: avgResponseTime,
                timestamp: new Date()
            })

            setApiResults([...results])
        }

        setIsAnalyzing(false)
    }

    const generateAIResponse = async (userInput: string): Promise<string> => {
        const lowerInput = userInput.toLowerCase()

        // Kimlik sorguları
        if (lowerInput.includes('kimsin') || lowerInput.includes('kim') || lowerInput.includes('adın') || lowerInput.includes('ismin') || lowerInput.includes('sen kim')) {
            return `🤖 **Ajax AI**\n\nMerhaba! Ben Ajax AI'yım - gelişmiş bir yapay zeka asistanıyım.\n\n**Geliştirici:** Berat Şimşek\n**Uzmanlık Alanım:** E-ticaret, iş analizi, veri analizi\n**Amacım:** İşletmelerin daha iyi kararlar almasına yardımcı olmak\n\nSize nasıl yardımcı olabilirim?`
        }

        if (lowerInput.includes('geliştirici') || lowerInput.includes('yapan') || lowerInput.includes('kodlayan') || lowerInput.includes('programcı')) {
            return `👨‍💻 **Geliştirici Bilgisi**\n\nAjax AI'yı **Berat Şimşek** geliştirdi.\n\nBerat Şimşek, yapay zeka ve e-ticaret alanlarında uzman bir yazılım geliştiricisidir. Ajax AI'yı işletmelerin daha verimli çalışması için tasarlamıştır.\n\nBaşka bir konuda yardıma ihtiyacınız var mı?`
        }

        if (lowerInput.includes('satış') || lowerInput.includes('trend')) {
            return `📊 **Satış Trend Analizi**\n\nSon 30 günlük verilerinizi analiz ettim:\n\n• Toplam Satış: ₺328,450 (+12.5%)\n• En Çok Satan Kategori: Elektronik (%45)\n• Büyüme Trendi: Pozitif yönde\n• Öneriler:\n  - iPhone 15 Pro stoklarını artırın\n  - Hafta sonu kampanyaları etkili\n  - Mobil satışlar artış gösteriyor\n\nDetaylı rapor için "rapor oluştur" yazabilirsiniz.`
        }

        if (lowerInput.includes('müşteri') || lowerInput.includes('segment')) {
            return `👥 **Müşteri Segmentasyonu**\n\nMüşterilerinizi 4 ana segmente ayırdım:\n\n1. **Premium Segment** (%23)\n   - Ortalama sepet: ₺5,200\n   - Sadakat: Yüksek\n\n2. **Düzenli Alıcılar** (%45)\n   - Ortalama sepet: ₺2,100\n   - Aylık alışveriş: 2-3 kez\n\n3. **Fırsat Avcıları** (%22)\n   - Kampanyalara duyarlı\n   - İndirim dönemlerinde aktif\n\n4. **Yeni Müşteriler** (%10)\n   - İlk alışveriş deneyimi\n   - Potansiyel yüksek\n\nHer segment için özel stratejiler önerebilirim.`
        }

        if (lowerInput.includes('ürün') || lowerInput.includes('product') || lowerInput.includes('öner')) {
            return `🛍️ **Ürün Önerileri**\n\nSize özel ürün önerileri sunuyorum:\n\n**🔥 Trend Ürünler:**\n• iPhone 15 Pro Max - En çok aranan\n• Samsung Galaxy S24 Ultra - Yüksek performans\n• MacBook Pro M3 - Profesyonel kullanım\n• AirPods Pro 2 - Ses kalitesi\n\n**🏕️ Kamp & Outdoor:**\n• Coleman Çadır 4 Kişilik - Dayanıklı\n• Therm-a-Rest Uyku Matı - Konforlu\n• Petzl Kafa Lambası - Güvenli\n• Stanley Termos - Sıcak İçecek\n\n**💻 Teknoloji:**\n• iPad Air 5 - Çok amaçlı\n• Apple Watch Series 9 - Sağlık takibi\n• Sony WH-1000XM5 - Gürültü önleme\n• Logitech MX Master 3S - Verimlilik\n\n**🏠 Ev & Yaşam:**\n• Dyson V15 - Temizlik\n• Philips Hue Starter Kit - Akıllı aydınlatma\n• Instant Pot - Mutfak asistanı\n• Nest Hub - Ev otomasyonu\n\nHangi kategoride detay istiyorsunuz?`
        }

        if (lowerInput.includes('rapor')) {
            return `📄 **Rapor Oluşturma**\n\nHangi türde rapor istersiniz?\n\n• Satış Performans Raporu\n• Müşteri Analiz Raporu\n• Ürün Performans Raporu\n• Finansal Özet Raporu\n• Stok Durum Raporu\n\nRapor türünü belirtin, sizin için detaylı bir analiz hazırlayayım.`
        }

        if (lowerInput.includes('sql') || lowerInput.includes('sorgu')) {
            return `💻 **SQL Sorgusu**\n\n\`\`\`sql\nSELECT \n  p.product_name,\n  COUNT(o.order_id) as total_orders,\n  SUM(o.quantity) as total_quantity,\n  SUM(o.total_amount) as revenue\nFROM products p\nJOIN orders o ON p.product_id = o.product_id\nWHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)\nGROUP BY p.product_id, p.product_name\nORDER BY revenue DESC\nLIMIT 10;\n\`\`\`\n\nBu sorgu son 30 günün en çok satan 10 ürününü getirir. Çalıştırmak ister misiniz?`
        }

        if (lowerInput.includes('veritabanı') || lowerInput.includes('tablo')) {
            return `🗄️ **Veritabanı Erişimi**\n\nVeritabanı özellikleri kaldırıldı. API analizi özelliğini kullanabilirsiniz.\n\nMevcut özellikler:\n• API performans analizi\n• Endpoint testleri\n• Yanıt süresi ölçümü\n• Hata analizi\n\nAPI Analizi butonuna tıklayarak test yapabilirsiniz.`
        }


        if (lowerInput.includes('api') || lowerInput.includes('endpoint')) {
            return `🔌 **API Analizi**\n\nAPI arayüzünü açmak için sağ üstteki "API Analizi" butonuna tıklayın.\n\nMevcut özellikler:\n• Tüm API endpointlerini test et\n• API performans analizi\n• Yanıt süreleri ölçümü\n• Hata analizi\n• Gerçek zamanlı API durumu\n\nHangi API'yi test etmek istiyorsunuz?`
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
        if (suggestion.category === 'API') {
            setShowApiAnalysis(true)
            if (suggestion.text.includes('performansını')) {
                analyzeApiPerformance()
            } else if (suggestion.text.includes('endpointlerini')) {
                testAllApiEndpoints()
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

    // CSV export function removed

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
                            onClick={() => setShowApiAnalysis(!showApiAnalysis)}
                            className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ${
                                showApiAnalysis 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'bg-slate-600 hover:bg-slate-500'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-sm font-medium">API Analizi</span>
                        </button>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs text-slate-300">Çevrimiçi</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Database Interface Removed */}

            {/* API Analysis Interface */}
            {showApiAnalysis && (
                <div className="bg-slate-50 border-b border-slate-200 p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-96">
                        {/* Left Panel - API Controls */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
                                    <BarChart3 className="w-4 h-4" />
                                    <span>API Test Kontrolleri</span>
                                </h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={testAllApiEndpoints}
                                        disabled={isAnalyzing}
                                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                    >
                                        {isAnalyzing ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Activity className="w-3 h-3" />
                                        )}
                                        <span>Tüm API'leri Test Et</span>
                                    </button>
                                    <button
                                        onClick={analyzeApiPerformance}
                                        disabled={isAnalyzing}
                                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                    >
                                        <BarChart3 className="w-3 h-3" />
                                        <span>Performans Analizi</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-medium text-blue-800 mb-2">Test Edilecek Endpoint'ler:</h4>
                                    <div className="text-sm text-blue-700 space-y-1">
                                        <div>• /admin/orders - Siparişler</div>
                                        <div>• /admin/users - Kullanıcılar</div>
                                        <div>• /products - Ürünler</div>
                                        <div>• /categories - Kategoriler</div>
                                        <div>• /analytics/monthly - Analitik</div>
                                        <div>• /admin/visitor-ips - Ziyaretçi IP'leri</div>
                                        <div>• /admin/live-views - Canlı Görüntüleme</div>
                                        <div>• /admin/snort/logs - Güvenlik Logları</div>
                                    </div>
                                </div>
                                
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <h4 className="font-medium text-green-800 mb-2">Performans Metrikleri:</h4>
                                    <div className="text-sm text-green-700 space-y-1">
                                        <div>• Yanıt Süresi (ms)</div>
                                        <div>• Başarı Oranı (%)</div>
                                        <div>• Hata Analizi</div>
                                        <div>• Ortalama/Min/Max Süre</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Results */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
                                    <Activity className="w-4 h-4" />
                                    <span>Test Sonuçları</span>
                                </h3>
                                <div className="text-sm text-slate-500">
                                    {apiResults.length} endpoint test edildi
                                </div>
                            </div>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {apiResults.length === 0 && !isAnalyzing && (
                                    <div className="text-center py-8 text-slate-500">
                                        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p>Henüz test yapılmadı</p>
                                        <p className="text-xs">Yukarıdaki butonlara tıklayarak test başlatın</p>
                                    </div>
                                )}
                                
                                {isAnalyzing && (
                                    <div className="text-center py-8">
                                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-500" />
                                        <p className="text-slate-600">API'ler test ediliyor...</p>
                                    </div>
                                )}
                                
                                {apiResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 border rounded-lg ${
                                            result.status === 'success' 
                                                ? 'border-green-200 bg-green-50' 
                                                : result.status === 'error'
                                                ? 'border-red-200 bg-red-50'
                                                : 'border-yellow-200 bg-yellow-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium text-sm text-slate-800 truncate">
                                                {result.endpoint}
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                                                result.status === 'success' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : result.status === 'error'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {result.status === 'success' ? '✅ Başarılı' : 
                                                 result.status === 'error' ? '❌ Hata' : '⏳ Yükleniyor'}
                                            </div>
                                        </div>
                                        
                                        {result.responseTime && (
                                            <div className="text-xs text-slate-600 mb-1">
                                                Yanıt Süresi: {result.responseTime}ms
                                            </div>
                                        )}
                                        
                                        {result.data && typeof result.data === 'object' && result.data.averageResponseTime && (
                                            <div className="text-xs text-slate-600 mb-1">
                                                Ortalama: {result.data.averageResponseTime}ms | 
                                                Min: {result.data.minResponseTime}ms | 
                                                Max: {result.data.maxResponseTime}ms
                                            </div>
                                        )}
                                        
                                        {result.error && (
                                            <div className="text-xs text-red-600">
                                                Hata: {result.error}
                                            </div>
                                        )}
                                        
                                        <div className="text-xs text-slate-400">
                                            {result.timestamp.toLocaleTimeString('tr-TR')}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
