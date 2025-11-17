'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Copy, User, Bot, Loader2, TrendingUp, FileText, Code, Lightbulb, Database, Table, Search, Play, Download, Eye, Settings, BarChart3, Activity, Brain, TestTube2, Volume2, VolumeX, Mic, MicOff } from 'lucide-react'
import { OllamaService, OllamaConfig, OllamaMessage } from '@/lib/services/ollama-service'
import { productService, orderService } from '@/lib/services'
import { api } from '@/lib/api'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    isTyping?: boolean
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

interface Session {
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
    messageCount: number
    lastMessage?: string
}

interface ChatHistory {
    id: string
    sessionId: string
    messages: Message[]
    createdAt: Date
    updatedAt: Date
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
    const [aiProvider, setAiProvider] = useState<'ollama'>('ollama')
    const [aiModel, setAiModel] = useState('gemma3:4b')
    const [availableModels, setAvailableModels] = useState<string[]>([])
    const [streamingContent, setStreamingContent] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)
    // AI Ayarları paneli
    const [showAiSettings, setShowAiSettings] = useState(false)
    const [aiSaving, setAiSaving] = useState(false)
    const [aiTesting, setAiTesting] = useState(false)
    const [aiTestMessage, setAiTestMessage] = useState<string | null>(null)
    const [aiApiKeyLocal, setAiApiKeyLocal] = useState('')

    // Database Interface States - Removed

    // API Analysis States
    const [showApiAnalysis, setShowApiAnalysis] = useState(false)
    const [apiResults, setApiResults] = useState<ApiAnalysisResult[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Session States
    const [sessions, setSessions] = useState<Session[]>([])
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [showSessions, setShowSessions] = useState(false)
    const [isLoadingSessions, setIsLoadingSessions] = useState(false)

    // Prompt Modal States
    const [showPromptModal, setShowPromptModal] = useState(false)
    const [currentPrompt, setCurrentPrompt] = useState('')
    const [apiData, setApiData] = useState<any>(null)
    const [enhancedPrompt, setEnhancedPrompt] = useState('')
  // Önizleme paneli
    const [showPreviewPanel, setShowPreviewPanel] = useState(true)
    const [previewBlock, setPreviewBlock] = useState<{ lang: string; code: string } | null>(null)

    // Dark Mode State
    const [darkMode, setDarkMode] = useState<boolean>(true)
    
    // Text-to-Speech States
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
    const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
    
    // Speech Recognition (Voice Input) States
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const recognitionRef = useRef<any>(null)
    
    // Ollama Config
    const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
        enabled: true,
        apiUrl: 'http://localhost:11434',
        model: 'gemma3:4b',
        temperature: 0.7,
        maxTokens: 2000
    })
    
    const [ollamaStatus, setOllamaStatus] = useState<'online' | 'offline' | 'checking'>('checking')
    const [ollamaModels, setOllamaModels] = useState<string[]>([])

    // System Prompt
    const [systemPrompt, setSystemPrompt] = useState(`Sen Ajax AI'sın. Berat Şimşek geliştirdi. E-ticaret uzmanısın. Kısa yanıtlar ver. Huglu Outdoor firması için çalışıyorsun.`)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)


    // modele ilişkin kullanılmayan eski liste kaldırıldı

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
        loadSessions()
        // Ollama varsayılan olarak kullanılacak
        setAiProvider('ollama')
        setAiModel('gemma3:4b')
    }, [])

    // Session değiştiğinde mesajları yükle
    useEffect(() => {
        if (currentSessionId) {
            loadSessionMessages(currentSessionId)
        }
    }, [currentSessionId])

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
            if (health.models && health.models.length > 0) {
                setOllamaModels(health.models)
                // Eğer mevcut model listede yoksa, ilk modeli seç
                if (!health.models.includes(aiModel)) {
                    setAiModel(health.models[0])
                }
            }
        } catch (error) {
            console.error('❌ Ollama status kontrol edilemedi:', error)
            setOllamaStatus('offline')
        }
    }

    // Session Management Functions
    const loadSessions = async () => {
        setIsLoadingSessions(true)
        try {
            const response = await fetch('https://api.plaxsy.com/api/chat/sessions', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                }
            })
            
            if (response.ok) {
                const data = await response.json()
                setSessions(data.sessions || [])
                
                // Eğer hiç session yoksa yeni bir tane oluştur
                if (data.sessions.length === 0) {
                    await createNewSession()
                } else {
                    // İlk session'ı seç
                    setCurrentSessionId(data.sessions[0].id)
                }
            }
        } catch (error) {
            console.error('❌ Sessionlar yüklenemedi:', error)
            // Hata durumunda yeni session oluştur
            await createNewSession()
        } finally {
            setIsLoadingSessions(false)
        }
    }

    const createNewSession = async () => {
        try {
            const sessionName = `Sohbet ${new Date().toLocaleDateString('tr-TR')}`
            const response = await fetch('https://api.plaxsy.com/api/chat/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                },
                body: JSON.stringify({
                    name: sessionName,
                    messages: []
                })
            })
            
            if (response.ok) {
                const data = await response.json()
                const newSession: Session = {
                    id: data.sessionId,
                    name: sessionName,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    messageCount: 0
                }
                
                setSessions(prev => [newSession, ...prev])
                setCurrentSessionId(data.sessionId)
                
                // Yeni session için boş mesaj listesi
                setMessages([{
                    id: '1',
                    role: 'assistant',
                    content: 'Merhaba! Ben Project Ajax, yapay zeka destekli iş asistanınızım. Size nasıl yardımcı olabilirim?',
                    timestamp: new Date()
                }])
            }
        } catch (error) {
            console.error('❌ Yeni session oluşturulamadı:', error)
        }
    }

    const loadSessionMessages = async (sessionId: string) => {
        try {
            const response = await fetch(`https://api.plaxsy.com/api/chat/sessions/${sessionId}/messages`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                }
            })
            
            if (response.ok) {
                const data = await response.json()
                // Timestamp'leri Date objesine çevir
                const messages = (data.messages || []).map((msg: any) => ({
                    ...msg,
                    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp || Date.now())
                }))
                setMessages(messages)
            }
        } catch (error) {
            console.error('❌ Session mesajları yüklenemedi:', error)
        }
    }

    const saveSessionMessages = async (sessionId: string, messages: Message[]) => {
        try {
            await fetch(`https://api.plaxsy.com/api/chat/sessions/${sessionId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                },
                body: JSON.stringify({ messages })
            })
        } catch (error) {
            console.error('❌ Mesajlar kaydedilemedi:', error)
        }
    }

    const deleteSession = async (sessionId: string) => {
        try {
            const response = await fetch(`https://api.plaxsy.com/api/chat/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                }
            })
            
            if (response.ok) {
                setSessions(prev => prev.filter(s => s.id !== sessionId))
                
                // Eğer silinen session aktif session ise, ilk session'ı seç
                if (currentSessionId === sessionId) {
                    const remainingSessions = sessions.filter(s => s.id !== sessionId)
                    if (remainingSessions.length > 0) {
                        setCurrentSessionId(remainingSessions[0].id)
                    } else {
                        await createNewSession()
                    }
                }
            }
        } catch (error) {
            console.error('❌ Session silinemedi:', error)
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

        // Mesajları otomatik kaydet
        if (currentSessionId) {
            const updatedMessages = [...messages, userMessage]
            saveSessionMessages(currentSessionId, updatedMessages)
        }

        try {
            // Sadece Ollama kullanılıyor
            await sendToOllama(currentInput, aiModel)
        } catch (error) {
            console.error('❌ Mesaj gönderilemedi:', error)
            
            // Hata tipine göre farklı mesajlar
            let errorContent = `❌ Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
            
            if (error instanceof Error) {
                if (error.message.includes('Model bulunamadı')) {
                    errorContent = `❌ Model Hatası: Ajax V1:1b modeli bulunamadı. Lütfen model adını kontrol edin.`
                } else if (error.message.includes('Sunucu hatası')) {
                    errorContent = `❌ Sunucu Hatası: Ollama sunucusunda bir sorun var. Lütfen daha sonra tekrar deneyin.`
                } else if (error.message.includes('Geçersiz istek')) {
                    errorContent = `❌ İstek Hatası: Gönderilen veri geçersiz. Lütfen mesajınızı kontrol edin.`
                }
            }
            
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errorContent,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
            setIsTyping(false)
        }
    }

    const sendToOllama = async (userInput: string, modelName: string) => {
        try {
                // API entegrasyonu tekrar aktif - optimizasyonlarla
                let enhancedPrompt = systemPrompt
                const lowerInput = userInput.toLowerCase()
                let fetchedApiData: any = null
                
                // Satış/Trend anahtar kelimeleri
                if (lowerInput.includes('satış') || lowerInput.includes('trend') || lowerInput.includes('analiz')) {
                    try {
                        const salesData = await fetch('https://api.plaxsy.com/api/admin/orders', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (salesData.ok) {
                            const data = await salesData.json()
                            // Veriyi sınırla - sadece ilk 2 kayıt ve önemli alanlar
                            const limitedData = Array.isArray(data) ? data.slice(0, 2) : data
                            const summaryData = Array.isArray(limitedData) ? limitedData.map(item => ({
                                id: item.id,
                                totalAmount: item.totalAmount,
                                status: item.status,
                                createdAt: item.createdAt
                            })) : limitedData
                            enhancedPrompt += `\n\nSATIŞ VERİLERİ:\n${JSON.stringify(summaryData)}`
                            fetchedApiData = { type: 'sales', data: summaryData }
                        }
                    } catch (error) {
                        console.log('Satış verisi alınamadı:', error)
                    }
                }
                
                // Ürün anahtar kelimeleri
                if (lowerInput.includes('ürün') || lowerInput.includes('product') || lowerInput.includes('stok')) {
                    try {
                        const productData = await fetch('https://api.plaxsy.com/api/products', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (productData.ok) {
                            const data = await productData.json()
                            // Veriyi sınırla - sadece ilk 2 kayıt ve önemli alanlar
                            const limitedData = Array.isArray(data) ? data.slice(0, 2) : data
                            const summaryData = Array.isArray(limitedData) ? limitedData.map(item => ({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                stock: item.stock,
                                category: item.category
                            })) : limitedData
                            enhancedPrompt += `\n\nÜRÜN VERİLERİ:\n${JSON.stringify(summaryData)}`
                            fetchedApiData = { type: 'products', data: summaryData }
                        }
                    } catch (error) {
                        console.log('Ürün verisi alınamadı:', error)
                    }
                }
                
                // Müşteri anahtar kelimeleri
                if (lowerInput.includes('müşteri') || lowerInput.includes('customer') || lowerInput.includes('segment')) {
                    try {
                        const customerData = await fetch('https://api.plaxsy.com/api/admin/users', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (customerData.ok) {
                            const data = await customerData.json()
                            // Veriyi sınırla - sadece ilk 2 kayıt ve önemli alanlar
                            const limitedData = Array.isArray(data) ? data.slice(0, 2) : data
                            const summaryData = Array.isArray(limitedData) ? limitedData.map(item => ({
                                id: item.id,
                                name: item.name,
                                email: item.email,
                                createdAt: item.createdAt
                            })) : limitedData
                            enhancedPrompt += `\n\nMÜŞTERİ VERİLERİ:\n${JSON.stringify(summaryData)}`
                            fetchedApiData = { type: 'customers', data: summaryData }
                        }
                    } catch (error) {
                        console.log('Müşteri verisi alınamadı:', error)
                    }
                }
                
                // Kategori anahtar kelimeleri
                if (lowerInput.includes('kategori') || lowerInput.includes('category') || lowerInput.includes('kamp')) {
                    try {
                        const categoryData = await fetch('https://api.plaxsy.com/api/categories', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (categoryData.ok) {
                            const data = await categoryData.json()
                            // Veriyi sınırla - sadece ilk 3 kayıt
                            const limitedData = Array.isArray(data) ? data.slice(0, 3) : data
                            enhancedPrompt += `\n\nKATEGORİ VERİLERİ:\n${JSON.stringify(limitedData)}`
                            fetchedApiData = { type: 'categories', data: limitedData }
                        }
                    } catch (error) {
                        console.log('Kategori verisi alınamadı:', error)
                    }
                }
                
                // Stok anahtar kelimeleri
                if (lowerInput.includes('stok') || lowerInput.includes('stock') || lowerInput.includes('düşük')) {
                    try {
                        const stockData = await fetch('https://api.plaxsy.com/api/products/low-stock', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                            },
                            signal: AbortSignal.timeout(10000)
                        })
                        
                        if (stockData.ok) {
                            const data = await stockData.json()
                            // Veriyi sınırla - sadece ilk 3 kayıt
                            const limitedData = Array.isArray(data) ? data.slice(0, 3) : data
                            enhancedPrompt += `\n\nSTOK VERİLERİ:\n${JSON.stringify(limitedData)}`
                        }
                    } catch (error) {
                        console.log('Stok verisi alınamadı:', error)
                    }
                }

            // Mesaj geçmişini hazırla - daha kısa tut
            const ollamaMessages: OllamaMessage[] = [
                { role: 'system', content: enhancedPrompt }
            ]

            // Son 1 mesajı al ve içeriklerini kısalt (ultra agresif optimizasyon)
            const recentMessages = messages.slice(-1)
            recentMessages.forEach(msg => {
                const shortContent = msg.content.length > 50 
                    ? msg.content.substring(0, 50) + '...' 
                    : msg.content
                
                ollamaMessages.push({
                    role: msg.role as 'user' | 'assistant',
                    content: shortContent
                })
            })

            // Kullanıcının yeni mesajını ekle
            ollamaMessages.push({ role: 'user', content: userInput })

            // Enhanced prompt'u sınırla (maksimum 500 karakter - ultra agresif optimizasyon)
            if (enhancedPrompt.length > 500) {
                enhancedPrompt = enhancedPrompt.substring(0, 500) + '...\n[Veri kısaltıldı]'
            }

            // Prompt modal'ı tetikle
            setCurrentPrompt(systemPrompt)
            setApiData(fetchedApiData)
            setEnhancedPrompt(enhancedPrompt)
            setShowPromptModal(true)

            // Model adını debug et
            console.log('🔍 Gönderilen model adı:', modelName)
            console.log('🔍 Ollama mesajları:', ollamaMessages)
            
            // Ollama'ya gönder
            const response = await OllamaService.sendMessage(ollamaMessages, {
                model: modelName,
                temperature: 0.8,
                maxTokens: 1500
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
                
                // AI yanıtını da kaydet
                if (currentSessionId) {
                    const updatedMessages = [...messages, {
                        id: Date.now().toString(),
                        role: 'user' as const,
                        content: userInput,
                        timestamp: new Date()
                    }, {
                        id: tempMessageId,
                        role: 'assistant' as const,
                        content: content,
                        timestamp: new Date()
                    }]
                    saveSessionMessages(currentSessionId, updatedMessages)
                }
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
            const fullUrl = `https://api.plaxsy.com/api${endpoint}`
            
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


    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content)
        alert('📋 Mesaj kopyalandı!')
    }

    // Text-to-Speech fonksiyonu
    const speakMessage = (content: string, messageId: string) => {
        // Eğer zaten konuşuyorsa durdur
        if (isSpeaking && speechSynthesisRef.current) {
            window.speechSynthesis.cancel()
            setIsSpeaking(false)
            setSpeakingMessageId(null)
            speechSynthesisRef.current = null
            return
        }

        // Code block'ları ve özel karakterleri temizle
        const cleanContent = content
            .replace(/```[\s\S]*?```/g, '') // Code block'ları kaldır
            .replace(/`[^`]+`/g, '') // Inline code'ları kaldır
            .replace(/[#*_~]/g, '') // Markdown karakterlerini kaldır
            .replace(/\n{3,}/g, '\n\n') // Çoklu satır sonlarını azalt
            .trim()

        if (!cleanContent) {
            alert('Seslendirilecek içerik bulunamadı')
            return
        }

        // Web Speech API kontrolü
        if (!('speechSynthesis' in window)) {
            alert('Tarayıcınız text-to-speech özelliğini desteklemiyor')
            return
        }

        try {
            // Önceki konuşmayı durdur
            window.speechSynthesis.cancel()

            // Yeni utterance oluştur
            const utterance = new SpeechSynthesisUtterance(cleanContent)
            utterance.lang = 'tr-TR' // Türkçe
            utterance.rate = 1.0 // Konuşma hızı (0.1 - 10)
            utterance.pitch = 1.0 // Ses tonu (0 - 2)
            utterance.volume = 1.0 // Ses seviyesi (0 - 1)

            // Türkçe ses seç (varsa)
            const voices = window.speechSynthesis.getVoices()
            const turkishVoice = voices.find(voice => 
                voice.lang.startsWith('tr') || 
                voice.name.toLowerCase().includes('turkish') ||
                voice.name.toLowerCase().includes('türkçe')
            )
            if (turkishVoice) {
                utterance.voice = turkishVoice
            }

            // Event handler'lar
            utterance.onstart = () => {
                setIsSpeaking(true)
                setSpeakingMessageId(messageId)
                speechSynthesisRef.current = utterance
            }

            utterance.onend = () => {
                setIsSpeaking(false)
                setSpeakingMessageId(null)
                speechSynthesisRef.current = null
            }

            utterance.onerror = (error) => {
                console.error('❌ Speech synthesis hatası:', error)
                setIsSpeaking(false)
                setSpeakingMessageId(null)
                speechSynthesisRef.current = null
                alert('Seslendirme sırasında bir hata oluştu')
            }

            // Konuşmayı başlat
            window.speechSynthesis.speak(utterance)
        } catch (error) {
            console.error('❌ Speech synthesis başlatma hatası:', error)
            alert('Seslendirme başlatılamadı')
        }
    }

    // Speech Recognition (Voice Input) fonksiyonu
    const startVoiceInput = () => {
        // Web Speech Recognition API kontrolü
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        
        if (!SpeechRecognition) {
            alert('Tarayıcınız sesli girdi özelliğini desteklemiyor. Chrome veya Edge kullanmanız önerilir.')
            return
        }

        try {
            // Önceki recognition'ı durdur
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }

            // Yeni recognition oluştur
            const recognition = new SpeechRecognition()
            recognition.lang = 'tr-TR' // Türkçe
            recognition.continuous = false // Tek seferlik
            recognition.interimResults = true // Geçici sonuçları göster
            recognition.maxAlternatives = 1

            // Event handler'lar
            recognition.onstart = () => {
                setIsListening(true)
                setTranscript('')
                console.log('🎤 Sesli girdi başlatıldı')
            }

            recognition.onresult = (event: any) => {
                let interimTranscript = ''
                let finalTranscript = ''

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' '
                    } else {
                        interimTranscript += transcript
                    }
                }

                // Geçici ve final sonuçları birleştir
                const fullTranscript = finalTranscript + interimTranscript
                setTranscript(fullTranscript)
                
                // Input alanına yaz
                if (inputRef.current) {
                    inputRef.current.value = fullTranscript
                    setInput(fullTranscript)
                }
            }

            recognition.onerror = (event: any) => {
                console.error('❌ Speech recognition hatası:', event.error)
                setIsListening(false)
                
                let errorMessage = 'Sesli girdi hatası oluştu'
                if (event.error === 'no-speech') {
                    errorMessage = 'Konuşma algılanamadı. Lütfen tekrar deneyin.'
                } else if (event.error === 'audio-capture') {
                    errorMessage = 'Mikrofon erişimi sağlanamadı. Lütfen mikrofon iznini kontrol edin.'
                } else if (event.error === 'not-allowed') {
                    errorMessage = 'Mikrofon izni verilmedi. Lütfen tarayıcı ayarlarından izin verin.'
                } else if (event.error === 'network') {
                    errorMessage = 'Ağ hatası oluştu. İnternet bağlantınızı kontrol edin.'
                }
                
                alert(errorMessage)
            }

            recognition.onend = () => {
                setIsListening(false)
                console.log('🎤 Sesli girdi durduruldu')
                
                // Eğer input'ta metin varsa, otomatik gönder
                setTimeout(() => {
                    if (inputRef.current && inputRef.current.value.trim()) {
                        const finalText = inputRef.current.value.trim()
                        if (finalText && finalText.length > 0) {
                            // Kısa bir gecikme sonra gönder (kullanıcı düzenleyebilsin)
                            setTimeout(() => {
                                if (inputRef.current && inputRef.current.value.trim()) {
                                    handleSend()
                                }
                            }, 500)
                        }
                    }
                }, 100)
            }

            // Recognition'ı başlat
            recognition.start()
            recognitionRef.current = recognition
        } catch (error) {
            console.error('❌ Speech recognition başlatma hatası:', error)
            alert('Sesli girdi başlatılamadı')
            setIsListening(false)
        }
    }

    const stopVoiceInput = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            recognitionRef.current = null
        }
        setIsListening(false)
        setTranscript('')
    }

    // Component unmount olduğunda konuşmayı ve recognition'ı durdur
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    // Ses listesi yüklendiğinde (Chrome için)
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices()
            if (voices.length > 0) {
                console.log('✅ Sesler yüklendi:', voices.map(v => v.name))
            }
        }

        if (window.speechSynthesis) {
            loadVoices()
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [])

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

    // Kod bloklarını tespit edip tarayıcı önizlemesi üret
    const extractCodeBlock = (text: string): { lang: string; code: string } | null => {
        const match = text.match(/```(\w+)?\n([\s\S]*?)```/);
        if (match) {
            const lang = (match[1] || '').toLowerCase();
            const code = match[2] || '';
            return { lang, code };
        }
        // Saf HTML olasılığı
        if (/<\/?(html|head|body|div|span|script|style)/i.test(text)) {
            return { lang: 'html', code: text };
        }
        return null;
    };

    const buildPreviewHtml = (payload: { lang: string; code: string } | null): string | null => {
        if (!payload) return null;
        const { lang, code } = payload;
        if (lang === 'html' || lang === 'htm') return code;
        if (lang === 'css') {
            return `<!doctype html><html><head><meta charset="utf-8"/><style>${code}</style></head><body><div style="padding:16px;font-family:ui-sans-serif">CSS önizleme için örnek içerik</div></body></html>`;
        }
        if (lang === 'javascript' || lang === 'js' || lang === 'ts' || lang === 'typescript') {
            return `<!doctype html><html><head><meta charset="utf-8"/></head><body><div id="app" style="padding:16px;font-family:ui-sans-serif">JS önizleme alanı</div><script>${code}<\/script></body></html>`;
        }
        return null;
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col bg-[#1a1c21]">
            {/* Header - Gemini Stili */}
            <div className="bg-[#1a1c21] p-3 text-white border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-medium">AI Assistant</h2>
                                <span className="text-xs text-gray-400">10:40 AM</span>
                            </div>
                            <p className="text-xs text-gray-400">Yapay Zeka İş Asistanı</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 bg-[#2d2f36] rounded-full px-3 py-1.5">
                            <span className="text-gray-300 text-xs">Ollama</span>
                        </div>
                        <div className="flex">
                            <button
                                onClick={() => setShowSessions(!showSessions)}
                                className={`p-2 rounded-l border-r border-gray-700 transition-all ${showSessions ? 'bg-[#2d2f36]' : 'bg-[#2d2f36]/50'}`}
                                title="Oturumlar"
                            >
                                <Database className="w-4 h-4 text-gray-400" />
                            </button>
                            <button
                                onClick={() => setShowApiAnalysis(!showApiAnalysis)}
                                className={`p-2 border-r border-gray-700 transition-all ${showApiAnalysis ? 'bg-[#2d2f36]' : 'bg-[#2d2f36]/50'}`}
                                title="API Analizi"
                            >
                                <BarChart3 className="w-4 h-4 text-gray-400" />
                            </button>
                            <button
                                onClick={() => setShowAiSettings(!showAiSettings)}
                                className={`p-2 border-r border-gray-700 transition-all ${showAiSettings ? 'bg-[#2d2f36]' : 'bg-[#2d2f36]/50'}`}
                                title="AI Ayarları"
                            >
                                <Settings className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </div>
                    </div>
                </div>

        {/* AI Settings Inline Panel - Sadeleştirilmiş */}
        {showAiSettings && (
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                            Model {ollamaStatus === 'online' && ollamaModels.length > 0 && `(${ollamaModels.length} model yüklü)`}
                        </label>
                        {ollamaStatus === 'online' && ollamaModels.length > 0 ? (
                            <select 
                                value={aiModel} 
                                onChange={(e)=> setAiModel(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-slate-100"
                            >
                                {ollamaModels.map((model) => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                        ) : (
                            <input 
                                value={aiModel} 
                                onChange={(e)=> setAiModel(e.target.value)} 
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-400" 
                                placeholder="ollama model (örn: gemma3:4b)" 
                            />
                        )}
                        {ollamaStatus === 'checking' && (
                            <p className="text-xs text-gray-400 mt-1">Modeller yükleniyor...</p>
                        )}
                        {ollamaStatus === 'offline' && (
                            <p className="text-xs text-red-400 mt-1">Ollama servisi çevrimdışı</p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Durum</label>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                                ollamaStatus === 'online' ? 'bg-green-500' : 
                                ollamaStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
                                'bg-red-500'
                            }`}></div>
                            <span className="text-xs text-gray-600 dark:text-slate-300">
                                {ollamaStatus === 'online' ? 'Çevrimiçi' : 
                                 ollamaStatus === 'checking' ? 'Kontrol ediliyor...' : 
                                 'Çevrimdışı'}
                            </span>
                            <button
                                onClick={checkOllamaStatus}
                                className="ml-auto px-2 py-1 text-xs bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-500"
                            >
                                Yenile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

            {/* Session Management Interface - Sadeleştirilmiş */}
            {showSessions && (
                <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-80">
                        {/* Left Panel - Session List */}
                        <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-white dark:bg-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium flex items-center gap-1 text-gray-900 dark:text-slate-100">
                                    <Database className="w-3.5 h-3.5" />
                                    <span>Oturumlar</span>
                                </h3>
                                <button
                                    onClick={createNewSession}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1"
                                >
                                    <Settings className="w-3 h-3" />
                                    <span>Yeni</span>
                                </button>
                            </div>
                            
                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                {isLoadingSessions ? (
                                    <div className="text-center py-4 border border-gray-100 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                        <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
                                        <p className="text-gray-600 dark:text-slate-300 text-xs">Yükleniyor...</p>
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div className="text-center py-4 border border-gray-100 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                        <Database className="w-5 h-5 mx-auto mb-2 text-gray-400 dark:text-slate-500" />
                                        <p className="text-xs text-gray-600 dark:text-slate-300">Henüz oturum yok</p>
                                    </div>
                                ) : (
                                    sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`p-2 border rounded cursor-pointer ${
                                                currentSessionId === session.id
                                                    ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                                                    : 'border-gray-200 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-700 bg-white dark:bg-slate-700'
                                            }`}
                                            onClick={() => setCurrentSessionId(session.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm truncate text-gray-900 dark:text-slate-100">
                                                    {session.name}
                                                </h4>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteSession(session.id)
                                                    }}
                                                    className="p-1 text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                                                    title="Sil"
                                                >
                                                    <Settings className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-slate-400">
                                                {session.messageCount} mesaj • {session.createdAt.toLocaleDateString('tr-TR')}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right Panel - Session Details - Sadeleştirilmiş */}
                        <div className="lg:col-span-2 border border-gray-200 dark:border-slate-700 rounded p-3 bg-white dark:bg-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium flex items-center gap-1 text-gray-900 dark:text-slate-100">
                                    <Settings className="w-3.5 h-3.5" />
                                    <span>Oturum Bilgileri</span>
                                </h3>
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                    {currentSessionId ? `ID: ${currentSessionId?.slice(0, 8)}...` : 'Oturum seçilmedi'}
                                </div>
                            </div>
                            
                            {currentSessionId ? (
                                <div className="space-y-3">
                                    <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-gray-50 dark:bg-slate-700">
                                        <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-slate-100">Aktif Oturum</h4>
                                        <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                                            <div className="flex items-center justify-between">
                                                <span>Mesaj Sayısı:</span>
                                                <span className="font-medium">{messages.length}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Oluşturulma:</span>
                                                <span>{sessions.find(s => s.id === currentSessionId)?.createdAt.toLocaleString('tr-TR')}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Son Güncelleme:</span>
                                                <span>{sessions.find(s => s.id === currentSessionId)?.updatedAt.toLocaleString('tr-TR')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-gray-50 dark:bg-slate-700">
                                        <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-slate-100">Son Mesajlar</h4>
                                        <div className="space-y-2 max-h-36 overflow-y-auto">
                                            {messages.slice(-3).map((msg, index) => (
                                                <div key={index} className="text-xs border border-gray-200 dark:border-slate-600 rounded overflow-hidden bg-white dark:bg-slate-800">
                                                    <div className="px-2 py-1 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
                                                        <span className="text-gray-700 dark:text-slate-300">{msg.role === 'user' ? 'Kullanıcı' : 'AI'}</span>
                                                        <span className="text-gray-500 dark:text-slate-400">
                                                            {msg.timestamp instanceof Date 
                                                                ? msg.timestamp.toLocaleTimeString('tr-TR')
                                                                : new Date(msg.timestamp || Date.now()).toLocaleTimeString('tr-TR')
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="p-2 text-gray-700 dark:text-slate-300">
                                                        <div className="truncate">{msg.content.substring(0, 50)}...</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border border-gray-200 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                    <Database className="w-6 h-6 mx-auto mb-2 text-gray-400 dark:text-slate-500" />
                                    <p className="text-sm text-gray-600 dark:text-slate-300">Lütfen bir oturum seçin</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* API Analysis Interface - Sadeleştirilmiş */}
            {showApiAnalysis && (
                <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-80">
                        {/* Left Panel - API Controls */}
                        <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-white dark:bg-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium flex items-center gap-1 text-gray-900 dark:text-slate-100">
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    <span>API Testleri</span>
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={testAllApiEndpoints}
                                        disabled={isAnalyzing}
                                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                                        <span>Tümünü Test Et</span>
                                    </button>
                                    <button
                                        onClick={analyzeApiPerformance}
                                        disabled={isAnalyzing}
                                        className="px-2 py-1 bg-green-600 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <BarChart3 className="w-3 h-3" />
                                        <span>Performans</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-gray-50 dark:bg-slate-700">
                                    <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-slate-100">Endpoint'ler</h4>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <div className="text-gray-600 dark:text-slate-300">/admin/orders</div>
                                        <div className="text-gray-600 dark:text-slate-300">/admin/users</div>
                                        <div className="text-gray-600 dark:text-slate-300">/products</div>
                                        <div className="text-gray-600 dark:text-slate-300">/categories</div>
                                        <div className="text-gray-600 dark:text-slate-300">/analytics/monthly</div>
                                        <div className="text-gray-600 dark:text-slate-300">/admin/visitor-ips</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Results */}
                        <div className="border border-gray-200 dark:border-slate-700 rounded p-3 bg-white dark:bg-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium flex items-center gap-1 text-gray-900 dark:text-slate-100">
                                    <Activity className="w-3.5 h-3.5" />
                                    <span>Sonuçlar</span>
                                </h3>
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                    {apiResults.length} endpoint test edildi
                                </div>
                            </div>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {apiResults.length === 0 && !isAnalyzing && (
                                    <div className="text-center py-8 border border-gray-100 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                        <BarChart3 className="w-6 h-6 mx-auto mb-2 text-gray-400 dark:text-slate-500" />
                                        <p className="text-sm text-gray-600 dark:text-slate-300">Henüz test yapılmadı</p>
                                    </div>
                                )}
                                
                                {isAnalyzing && (
                                    <div className="text-center py-8 border border-gray-100 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-700">
                                        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-500" />
                                        <p className="text-sm text-gray-600 dark:text-slate-300">Test ediliyor...</p>
                                    </div>
                                )}
                                
                                {apiResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`p-2 border rounded ${result.status === 'success' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30' : result.status === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30' : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30'}`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-sm truncate text-gray-900 dark:text-slate-100">{result.endpoint}</div>
                                            <div className={`px-2 py-0.5 rounded text-xs ${result.status === 'success' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-400' : result.status === 'error' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-400'}`}>
                                                {result.status === 'success' ? 'Başarılı' : result.status === 'error' ? 'Hata' : 'Yükleniyor'}
                                            </div>
                                        </div>
                                        
                                        {result.responseTime && (
                                            <div className="text-xs text-gray-600 dark:text-slate-300 flex justify-between">
                                                <span>Yanıt Süresi:</span>
                                                <span>{result.responseTime}ms</span>
                                            </div>
                                        )}
                                        
                                        {result.data && typeof result.data === 'object' && result.data.averageResponseTime && (
                                            <div className="text-xs text-gray-600 dark:text-slate-300 flex justify-between">
                                                <span>Ort/Min/Max:</span>
                                                <span>{result.data.averageResponseTime}/{result.data.minResponseTime}/{result.data.maxResponseTime}ms</span>
                                            </div>
                                        )}
                                        
                                        {result.error && (
                                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                Hata: {result.error}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Messages Area - Gemini Stili */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-0">
            <div className="lg:col-span-3 bg-[#1a1c21] overflow-y-auto p-4 space-y-6">
                {messages.map((message, index) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex items-start gap-3 max-w-2xl ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-orange-200' : 'bg-blue-500'}`}>
                                {message.role === 'user' ? (
                                    <User className={`w-4 h-4 ${message.role === 'user' ? 'text-orange-500' : 'text-white'}`} />
                                ) : (
                                    <Bot className="w-4 h-4 text-white" />
                                )}
                            </div>

                            {/* Message Content with Sender Info */}
                            <div className="flex-1">
                                <div className="flex items-center mb-1">
                                    <span className="text-sm font-medium text-gray-300">
                                        {message.role === 'user' ? 'You' : 'AI Assistant'}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-2">
                                        {message.timestamp instanceof Date 
                                            ? message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                                            : new Date(message.timestamp || Date.now()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                                        }
                                    </span>
                                </div>
                                
                                <div className={`rounded-lg ${message.role === 'user' ? 'bg-[#2563eb] text-white' : 'bg-[#2d2f36] text-gray-200'}`}>
                                    <div className="whitespace-pre-wrap text-sm p-3">
                                        {message.content}
                                        {isStreaming && message.role === 'assistant' && message.content === streamingContent && (
                                            <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                                        )}
                                    </div>
                                    
                                    {/* Code Block Handling */}
                                    {(() => { 
                                        const block = extractCodeBlock(message.content); 
                                        if (!block || message.role === 'user') return null; 
                                        return (
                                            <div className="mt-2 border-t border-gray-700 bg-[#262830] rounded-b-lg overflow-hidden">
                                                <div className="flex items-center justify-between px-3 py-1 bg-[#1f2028]">
                                                    <span className="text-xs text-gray-400">{block.lang}</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => { setPreviewBlock(block); setShowPreviewPanel(true) }}
                                                            className="text-xs text-gray-400 hover:text-white transition-colors"
                                                            title="Expand"
                                                        >
                                                            Expand
                                                        </button>
                                                        <button
                                                            onClick={() => copyMessage(block.code)}
                                                            className="text-xs text-gray-400 hover:text-white transition-colors"
                                                            title="Copy code"
                                                        >
                                                            Copy code
                                                        </button>
                                                    </div>
                                                </div>
                                                <pre className="p-3 text-sm text-gray-300 overflow-x-auto">
                                                    <code>{block.code}</code>
                                                </pre>
                                            </div>
                                        )
                                    })()}
                                </div>

                                {/* Message Actions - Only for assistant messages without code blocks */}
                                {message.role === 'assistant' && !extractCodeBlock(message.content) && (
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        <button
                                            onClick={() => copyMessage(message.content)}
                                            className="hover:text-blue-400 transition-colors"
                                            title="Kopyala"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => speakMessage(message.content, message.id)}
                                            className={`hover:text-green-400 transition-colors ${speakingMessageId === message.id ? 'text-green-400' : ''}`}
                                            title={isSpeaking && speakingMessageId === message.id ? 'Durdur' : 'Seslendir'}
                                        >
                                            {isSpeaking && speakingMessageId === message.id ? (
                                                <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                                            ) : (
                                                <Volume2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Typing Indicator - Gemini Style */}
                {isTyping && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center mb-1">
                                <span className="text-sm font-medium text-gray-300">AI Assistant</span>
                            </div>
                            <div className="bg-[#2d2f36] p-3 rounded-lg">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Preview Panel - Gemini Style */}
            {showPreviewPanel && (
              <div className="lg:col-span-1 border-l border-gray-700 bg-[#1f2028] p-3 hidden lg:block">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-400" />
                    {previewBlock?.lang ? (
                      <span>{previewBlock?.lang} preview</span>
                    ) : (
                      <span>Preview</span>
                    )}
                  </div>
                  <button 
                    onClick={()=> setShowPreviewPanel(false)} 
                    className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700/50 transition-colors"
                  >
                    Close
                  </button>
                </div>
                <div className="border border-gray-700 rounded-lg overflow-hidden bg-[#262830]">
                  {(() => { const preview = buildPreviewHtml(previewBlock); if (!preview) return (
                    <div className="p-8 text-sm text-gray-400 text-center">
                      <Code className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                      <p>Select a code block to preview</p>
                    </div>
                  ); return (
                    <iframe title="browser-preview" className="w-full h-[28rem]" sandbox="allow-scripts allow-same-origin" srcDoc={preview || ''} />
                  )})()}
                </div>
              </div>
            )}
            </div>


            {/* Input Area - Gemini Style */}
            <div className="bg-[#1a1c21] border-t border-gray-700 p-3">
                <div className="flex items-center gap-3 mx-auto max-w-4xl">
                    <div className="flex-1 relative">
                        {/* Sesli girdi durumu göstergesi */}
                        {isListening && (
                            <div className="absolute top-2 left-2 flex items-center gap-2 text-red-500 text-xs z-10">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span>Dinleniyor...</span>
                            </div>
                        )}
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your message here..."
                            rows={1}
                            className="w-full px-4 py-3 bg-[#2d2f36] text-gray-200 border border-gray-700 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={{ minHeight: '46px', maxHeight: '120px' }}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                            {input.length > 0 && (
                                <div className="text-xs text-gray-400 mr-1">
                                    {input.length}
                                </div>
                            )}
                            {/* Mikrofon Butonu */}
                            <button
                                onClick={() => isListening ? stopVoiceInput() : startVoiceInput()}
                                className={`p-2 rounded-full transition-colors ${
                                    isListening 
                                        ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                                title={isListening ? 'Sesli girdiyi durdur' : 'Sesli girdi başlat'}
                            >
                                {isListening ? (
                                    <MicOff className="w-4 h-4" />
                                ) : (
                                    <Mic className="w-4 h-4" />
                                )}
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                            >
                                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="text-xs text-center text-gray-500 mt-2">
                    Ajax AI, Huglu Outdoor için geliştirilmiştir.
                </div>
            </div>
        </div>
    )
}
