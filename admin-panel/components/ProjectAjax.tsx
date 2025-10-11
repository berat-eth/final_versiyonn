'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Copy, User, Bot, Loader2, TrendingUp, FileText, Code, Lightbulb } from 'lucide-react'
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
    const [systemPrompt, setSystemPrompt] = useState('Sen yardımcı bir iş asistanısın. Kullanıcılara e-ticaret, satış analizi, müşteri yönetimi ve iş stratejileri konularında yardımcı oluyorsun.')

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const suggestions: Suggestion[] = [
        { icon: TrendingUp, text: 'Bu ayki satış trendlerini analiz et', category: 'Analiz' },
        { icon: Lightbulb, text: 'Müşteri segmentasyonu için öneriler sun', category: 'Strateji' },
        { icon: FileText, text: 'Ürün performans raporu oluştur', category: 'Rapor' },
        { icon: Code, text: 'SQL sorgusu yaz: En çok satan 10 ürün', category: 'Kod' },
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
                setTimeout(() => {
                    const aiMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: generateAIResponse(currentInput),
                        timestamp: new Date()
                    }
                    setMessages(prev => [...prev, aiMessage])
                    setIsTyping(false)
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

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.message.content,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, aiMessage])
            setIsTyping(false)
        } catch (error) {
            console.error('❌ Ollama yanıtı alınamadı:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ Ollama Hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
            setIsTyping(false)
        }
    }

    const generateAIResponse = (userInput: string): string => {
        const lowerInput = userInput.toLowerCase()

        if (lowerInput.includes('satış') || lowerInput.includes('trend')) {
            return `📊 **Satış Trend Analizi**\n\nSon 30 günlük verilerinizi analiz ettim:\n\n• Toplam Satış: ₺328,450 (+12.5%)\n• En Çok Satan Kategori: Elektronik (%45)\n• Büyüme Trendi: Pozitif yönde\n• Öneriler:\n  - iPhone 15 Pro stoklarını artırın\n  - Hafta sonu kampanyaları etkili\n  - Mobil satışlar artış gösteriyor\n\nDetaylı rapor için "rapor oluştur" yazabilirsiniz.`
        }

        if (lowerInput.includes('müşteri') || lowerInput.includes('segment')) {
            return `👥 **Müşteri Segmentasyonu**\n\nMüşterilerinizi 4 ana segmente ayırdım:\n\n1. **Premium Segment** (%23)\n   - Ortalama sepet: ₺5,200\n   - Sadakat: Yüksek\n\n2. **Düzenli Alıcılar** (%45)\n   - Ortalama sepet: ₺2,100\n   - Aylık alışveriş: 2-3 kez\n\n3. **Fırsat Avcıları** (%22)\n   - Kampanyalara duyarlı\n   - İndirim dönemlerinde aktif\n\n4. **Yeni Müşteriler** (%10)\n   - İlk alışveriş deneyimi\n   - Potansiyel yüksek\n\nHer segment için özel stratejiler önerebilirim.`
        }

        if (lowerInput.includes('rapor')) {
            return `📄 **Rapor Oluşturma**\n\nHangi türde rapor istersiniz?\n\n• Satış Performans Raporu\n• Müşteri Analiz Raporu\n• Ürün Performans Raporu\n• Finansal Özet Raporu\n• Stok Durum Raporu\n\nRapor türünü belirtin, sizin için detaylı bir analiz hazırlayayım.`
        }

        if (lowerInput.includes('sql') || lowerInput.includes('sorgu')) {
            return `💻 **SQL Sorgusu**\n\n\`\`\`sql\nSELECT \n  p.product_name,\n  COUNT(o.order_id) as total_orders,\n  SUM(o.quantity) as total_quantity,\n  SUM(o.total_amount) as revenue\nFROM products p\nJOIN orders o ON p.product_id = o.product_id\nWHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)\nGROUP BY p.product_id, p.product_name\nORDER BY revenue DESC\nLIMIT 10;\n\`\`\`\n\nBu sorgu son 30 günün en çok satan 10 ürününü getirir. Çalıştırmak ister misiniz?`
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
        setInput(suggestion.text)
        inputRef.current?.focus()
    }

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content)
        alert('📋 Mesaj kopyalandı!')
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 rounded-t-2xl p-4 text-white">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Project Ajax</h2>
                        <p className="text-sm text-slate-300">Yapay Zeka İş Asistanı - Gemma3:1b</p>
                    </div>
                </div>
            </div>

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
                                <div className={`inline-block p-3 rounded-lg ${message.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-100 text-slate-800'
                                    }`}>
                                    <div className="whitespace-pre-wrap text-sm">
                                        {message.content}
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
            <div className="bg-white border-t border-slate-200 rounded-b-2xl p-4">
                <div className="flex items-end space-x-3">
                    <div className="flex-1">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Mesajınızı yazın... (Enter ile gönder)"
                            rows={1}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white transition-all resize-none"
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
